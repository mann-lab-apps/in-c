import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { TICKS_PER_QUARTER, applyScoreCommand, buildRhythmEditCommand, createDuration, createNote } from '../score-core'
import { buildSpanEndpointCommand } from '../renderer/src/editor/span-editing'
import { locateEvent } from '../renderer/src/editor/editor-state'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline, resolveEventVelocityAtBeat } from '../renderer/src/playback/timeline'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

const source = readFileSync(new URL('./fixtures/hairpin-file-order.musicxml', import.meta.url), 'utf8')
const stop = '      <direction><direction-type><wedge type="stop"/></direction-type><offset>-1</offset><voice>1</voice></direction>\n'
const normalOrder = source.replace(stop, '').replace('    </measure>', stop + '    </measure>')

function endpoints(score: ReturnType<typeof parseMusicXml>) {
  const voices = score.parts[0].staves[0].measures[0].voices
  const references = new Map(voices.flatMap(voice =>
    voice.events.map((event, index) => [event.id, [voice.id, index, event.type]] as const)
  ))
  return score.hairpins?.map(span => [
    span.type, references.get(span.startEventId), references.get(span.endEventId!)
  ])
}

function performance(score: ReturnType<typeof parseMusicXml>) {
  return createPlaybackTimeline(score).events.map(event =>
    [event.voiceId, event.startBeat, event.durationBeats, event.velocityStart, event.velocityEnd]
  )
}

it.each(['numbers', 'names', 'implicit stop voice', 'rest stop'] as const)(
  'pairs a stop read first with its later file entry, using %s', variant => {
    const change = (xml: string) => {
      if (variant === 'names') return xml.replaceAll('<voice>1</voice>', '<voice>Lead</voice>')
        .replaceAll('<voice>2</voice>', '<voice>Second</voice>')
      if (variant === 'implicit stop voice') return xml.replace(stop, stop.replace('<voice>1</voice>', ''))
      if (variant === 'rest stop') return xml.replace('<pitch><step>F</step><octave>5</octave></pitch>', '<rest/>')
      return xml
    }
    const imported = parseMusicXml(change(source))
    const canonical = parseMusicXml(change(normalOrder))
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(imported))).score
    expect(native).toEqual(imported)
    for (const score of [imported, parseMusicXml(serializeMusicXml(native))]) {
      expect(endpoints(score)).toEqual([[
        'crescendo', ['voice-2', 0, 'note'],
        [variant === 'implicit stop voice' ? 'voice-2' : 'voice-1', 3, variant === 'rest stop' ? 'rest' : 'note']
      ]])
      expect(performance(score)).toEqual(performance(canonical))
      expect(serializeMidi(score)).toEqual(serializeMidi(canonical))
    }
    const notes = performance(imported)
    for (const voiceId of ['voice-1', 'voice-2']) {
      const changesVelocity = notes.some(([voice, , , start, end]) => voice === voiceId && start !== end)
      expect(changesVelocity).toBe(variant !== 'implicit stop voice' || voiceId === 'voice-2')
    }
  }
)

it('allows reusing the same number after a reversed pair closes in the file', () => {
  const repeated = source.replace('    </measure>', [
    '      <direction><direction-type><wedge type="diminuendo"/></direction-type><offset>-3</offset><voice>2</voice></direction>',
    '      <direction><direction-type><wedge type="stop"/></direction-type><offset>-2</offset><voice>2</voice></direction>',
    '    </measure>'
  ].join('\n'))
  const score = parseMusicXml(repeated)
  expect(endpoints(score)).toEqual([
    ['crescendo', ['voice-2', 0, 'note'], ['voice-1', 3, 'note']],
    ['diminuendo', ['voice-2', 1, 'note'], ['voice-2', 2, 'note']]
  ])
  expect(endpoints(parseMusicXml(serializeMusicXml(score)))).toEqual(endpoints(score))
})

it.each([
  ['', ' number="+01"'],
  [' number="01"', ' number="1"'],
  [' number="+016"', ' number="16"']
])('pairs equivalent MusicXML number-level spellings (%s, %s)', (startNumber, stopNumber) => {
  const differentlyNumbered = source.replace('<wedge type="crescendo"/>', `<wedge type="crescendo"${startNumber}/>`)
    .replace('<wedge type="stop"/>', `<wedge type="stop"${stopNumber}/>`)
  const imported = parseMusicXml(differentlyNumbered)
  const canonical = parseMusicXml(source)
  expect(endpoints(imported)).toEqual(endpoints(canonical))
  expect(performance(imported)).toEqual(performance(canonical))
  expect(endpoints(parseMusicXml(serializeMusicXml(imported)))).toEqual(endpoints(canonical))
})

it('keeps unmatched, duplicate and non-forward wedges diagnosable', () => {
  expect(() => parseMusicXml(source.replace(stop, ''))).toThrow(/hairpin의 종료/)
  expect(() => parseMusicXml(source.replace(/.*type="crescendo".*\n/, ''))).toThrow(/hairpin stop에 대응/)
  expect(() => parseMusicXml(source.replace(stop, stop + stop))).toThrow(/hairpin number.*중복/)
  expect(() => parseMusicXml(source.replace('<wedge type="stop"/>', '<wedge type="stop" number="2"/>')))
    .toThrow(/hairpin stop에 대응/)
  expect(() => parseMusicXml(source.replace(stop, stop.replace('<offset>-1</offset>', '<offset>-4</offset>'))))
    .toThrow(/헤어핀 끝점.*뒤/)
})

it('numbers concurrent wedges across the staves of one MusicXML part', () => {
  const original = readFileSync(new URL('./fixtures/hairpin-two-staves.musicxml', import.meta.url), 'utf8')
  const score = parseMusicXml(original)
  const xml = serializeMusicXml(score)
  const numbers = [...xml.matchAll(/<wedge type="(\w+)"(?: number="(\d+)")?\/>/g)]
    .map(([, type, number]) => [type, Number(number ?? 1)])
  expect(numbers).toEqual([
    ['crescendo', 1], ['diminuendo', 2], ['stop', 1], ['stop', 2]
  ])
  expect(parseMusicXml(xml).hairpins).toEqual(score.hairpins)
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))
})

it('reuses closed wedge numbers and rejects an actual seventeenth open wedge', () => {
  const singleMeasure = parseMusicXml(source)
  const sameMeasureHairpin = singleMeasure.hairpins![0]
  const sequential = {
    ...singleMeasure,
    hairpins: Array.from({ length: 17 }, (_, index) => ({ ...sameMeasureHairpin, id: `wedge-${index}` }))
  }
  const xml = serializeMusicXml(sequential)
  expect([...xml.matchAll(/<wedge type="\w+"\/>/g)]).toHaveLength(34)
  expect(parseMusicXml(xml).hairpins).toHaveLength(17)

  const twoMeasures = parseMusicXml(readFileSync(new URL('./fixtures/hairpin-two-staves.musicxml', import.meta.url), 'utf8'))
  const crossing = twoMeasures.hairpins![0]
  const overlapping = {
    ...twoMeasures,
    hairpins: Array.from({ length: 17 }, (_, index) => ({ ...crossing, id: `wedge-${index}` }))
  }
  expect(() => serializeMusicXml(overlapping)).toThrow(/동시 헤어핀 번호 범위\(16\)/)
})

it('round-trips a wedge stopping at the measure end of a simultaneous note in another voice', () => {
  const input = readFileSync(new URL('./fixtures/hairpin-long-note-end.musicxml', import.meta.url), 'utf8')
  const score = parseMusicXml(input)
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  expect(endpoints(native)).toEqual([['crescendo', ['voice-2', 0, 'note'], ['voice-1', 0, 'note']]])
  const xml = serializeMusicXml(native)
  const endDirection = xml.match(/<wedge type="stop"\/>[\s\S]*?<\/direction>/)?.[0]
  const divisions = Number(xml.match(/<divisions>(\d+)<\/divisions>/)?.[1])
  expect(endDirection).toContain(`<offset>${4 * divisions}</offset>`)
  expect(endDirection).toContain('<voice>1</voice>')
  const reopened = parseMusicXml(xml)
  expect(endpoints(reopened)).toEqual(endpoints(native))
  expect(performance(reopened)).toEqual(performance(native))
  expect(serializeMidi(reopened)).toEqual(serializeMidi(native))
})

function noteEndVariants() {
  const supported = readFileSync(new URL('./fixtures/hairpin-long-note-end.musicxml', import.meta.url), 'utf8')
  const release = supported.replace(
    '<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>',
    '<note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>' +
    '<note><pitch><step>C</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>half</type><dot/></note>'
  )
  const onset = release.replace(
    '<wedge type="stop"/></direction-type><voice>1</voice>',
    '<wedge type="stop"/></direction-type><offset>-3</offset><voice>1</voice>'
  )
  return { supported, onset, release }
}

it('retains the explicit onset after the start is moved into the ending voice', () => {
  const score = parseMusicXml(noteEndVariants().onset)
  const original = score.hairpins![0]
  const start = score.parts[0].staves[0].measures[0].voices[0].events[0]
  const command = buildSpanEndpointCommand(score, { kind: 'hairpin', id: original.id }, { startEventId: start.id })
  const edited = applyScoreCommand(score, command).score
  const exported = serializeMusicXml(edited)
  const reopened = parseMusicXmlWithReport(exported)
  expect(reopened.report.warnings).toEqual([])
  expect(reopened.score.hairpins?.[0]?.endAnchor).toBe('onset')
  expect(endpoints(reopened.score)).toEqual(endpoints(edited))
  expect(serializeMidi(reopened.score)).toEqual(serializeMidi(edited))

  const legacy = { ...edited, hairpins: [{ ...edited.hairpins![0], endAnchor: undefined }] }
  const legacyXml = serializeMusicXml(legacy)
  expect(legacyXml).not.toContain('ddirori-studio-hairpin-end-')
  const reopenedLegacy = parseMusicXml(legacyXml)
  expect(reopenedLegacy.hairpins?.[0]?.endAnchor).toBeUndefined()
  expect(serializeMidi(reopenedLegacy)).toEqual(serializeMidi(legacy))
  expect(serializeMidi(reopenedLegacy)).not.toEqual(serializeMidi(edited))

  const reservedId = 'ddirori-studio-hairpin-end-onset-1'
  edited.parts[0].id = reservedId
  edited.hairpins!.push({ ...edited.hairpins![0], id: 'additional-span' })
  const withReservedId = serializeMusicXml(edited)
  const stopIds = [...withReservedId.matchAll(/<wedge type="stop" id="([^"]+)"/g)].map(match => match[1])
  expect(stopIds).toEqual(['ddirori-studio-hairpin-end-onset-2', 'ddirori-studio-hairpin-end-onset-3'])
  expect(parseMusicXml(withReservedId).hairpins?.map(span => span.endAnchor)).toEqual(['onset', 'onset'])
})

it('round-trips an explicitly anchored release shortened to meet the following onset', () => {
  const score = parseMusicXml(noteEndVariants().release)
  const span = score.hairpins![0]
  const end = locateEvent(score, span.endEventId!)!
  expect(end.event.type).toBe('note')
  let edited = applyScoreCommand(score, buildRhythmEditCommand(score, {
    target: end.address, eventId: end.event.id,
    event: { ...end.event, duration: createDuration('half') },
    createId: () => 'rest-after-end'
  })!).score
  edited = applyScoreCommand(edited, buildRhythmEditCommand(edited, {
    target: end.address, eventId: 'rest-after-end',
    event: createNote({ id: 'rest-after-end', position: { tick: 3 * TICKS_PER_QUARTER }, pitch: { step: 'D', octave: 5 } }),
    createId: () => 'unused'
  })!).score
  const xml = serializeMusicXml(edited)
  const reopened = parseMusicXmlWithReport(xml)
  expect(reopened.report.warnings).toEqual([])
  expect(reopened.score.hairpins?.[0]?.endAnchor).toBe('release')
  expect(endpoints(reopened.score)).toEqual(endpoints(edited))
  expect(serializeMidi(reopened.score)).toEqual(serializeMidi(edited))

  const importedWithoutMarker = parseMusicXml(xml.replace(/ id="ddirori-studio-hairpin-end-release-\d+"/, ''))
  expect(endpoints(importedWithoutMarker)?.[0]?.[2]).toEqual(['voice-1', 2, 'note'])
  expect(importedWithoutMarker.hairpins?.[0]?.endAnchor).toBe('onset')
})

it.each([['onset', 1], ['release', 4]] as const)(
  'keeps the %s stop of the same ending note through native and MusicXML round trips', (role, beat) => {
    const { score, report } = parseMusicXmlWithReport(noteEndVariants()[role])
    expect(report.warnings).toEqual([])
    expect(score.hairpins?.[0]).toMatchObject({ startEventId: 'event-3', endEventId: 'event-2', endAnchor: role })
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
    expect(native).toEqual(score)
    const xml = serializeMusicXml(native)
    const stop = xml.match(/<wedge type="stop"\/>[\s\S]*?<\/direction>/)?.[0]
    expect(stop).toContain(`<offset>${beat * TICKS_PER_QUARTER}</offset>`)
    expect(stop).toContain('<voice>1</voice>')
    const reopened = parseMusicXmlWithReport(xml)
    expect(reopened.report.warnings).toEqual([])
    expect(reopened.score.hairpins?.[0]?.endAnchor).toBe(role)
    expect(endpoints(reopened.score)).toEqual(endpoints(native))
    expect(serializeMidi(reopened.score)).toEqual(serializeMidi(native))

    const timeline = createPlaybackTimeline(native)
    const noteAttacks = timeline.events.filter(event => event.voiceId === 'voice-2')
      .map(event => event.velocityStart)
    expect(noteAttacks).toEqual(role === 'onset' ? [.16, .16, .16, .16] : [.16, .18, .2, .22])
    expect(timeline.events.find(event => event.voiceId === 'voice-1' && event.frequency)?.durationBeats).toBe(3)
  }
)

it.each(['onset', 'release'] as const)(
  'bounds the %s envelope while preserving a tied note and both repeat traversals', role => {
    const xml = noteEndVariants()[role]
      .replace('</attributes>', '</attributes><barline location="left"><repeat direction="forward"/></barline>')
      .replace('<duration>3</duration><voice>1</voice><type>half</type><dot/>',
        '<duration>3</duration><tie type="start"/><voice>1</voice><type>half</type><dot/><notations><tied type="start"/></notations>')
      .replace('</measure></part>', `</measure><measure number="2">
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>whole</type><notations><tied type="stop"/></notations></note>
        <backup><duration>4</duration></backup>
        <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type></note>
        <barline location="right"><repeat direction="backward"/></barline>
        </measure></part>`)
    const score = parseMusicXml(xml)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.totalBeats).toBe(16)
    const sustained = timeline.events.filter(event => event.voiceId === 'voice-1' && event.frequency !== undefined)
    expect(sustained.map(event => [event.startBeat, event.durationBeats, event.velocityEndBeat])).toEqual([
      [1, 7, role === 'release' ? 4 : undefined], [9, 7, role === 'release' ? 12 : undefined]
    ])
    const after = timeline.events.filter(event => event.voiceId === 'voice-2' && [4, 12].includes(event.startBeat))
    expect(after.map(event => event.velocityStart)).toEqual([.16, .16])
    const copy = parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(score)))
    expect(copy.hairpins?.map(hairpin => hairpin.endAnchor)).toEqual([role, role])
    expect(serializeMidi(copy)).toEqual(serializeMidi(score))
    expect(performance(copy)).toEqual(performance(score))
  }
)

it('reaches a release whose note began before the hairpin on each traversal', () => {
  const xml = noteEndVariants().release
    .replace('<wedge type="crescendo"/></direction-type><voice>2</voice>',
      '<wedge type="crescendo"/></direction-type><offset>2</offset><voice>2</voice>')
    .replace('</attributes>', '</attributes><barline location="left"><repeat direction="forward"/></barline>')
    .replace('</measure>', '<barline location="right"><repeat direction="backward"/></barline></measure>')
  const score = parseMusicXml(xml)
  expect(score.hairpins?.[0]?.endAnchor).toBe('release')
  const { events } = createPlaybackTimeline(score)
  for (const start of [0, 4]) {
    const attacks = events.filter(event => event.voiceId === 'voice-2' && event.startBeat >= start && event.startBeat < start + 4)
    expect(attacks.map(event => event.velocityStart)).toEqual([.16, .16, .16, .20])
    const held = events.find(event => event.frequency !== undefined && event.voiceId === 'voice-1' && event.startBeat === start + 1)!
    expect(held.durationBeats).toBe(3)
    expect(resolveEventVelocityAtBeat(held, start + 1.5)).toBe(.16)
    expect(resolveEventVelocityAtBeat(held, start + 3)).toBe(.20)
    expect(resolveEventVelocityAtBeat(held, start + 4)).toBe(.24)
  }
})

it('reports a rest-release stop still imported at the rest onset', () => {
  const release = noteEndVariants().release.replace('<pitch><step>C</step><octave>5</octave></pitch>', '<rest/>')
  const { score, report } = parseMusicXmlWithReport(release)
  expect(score.hairpins?.[0]).not.toHaveProperty('endAnchor')
  expect(report.warnings).toEqual([{
    code: 'unsupported-direction',
    partNumber: 1,
    measureNumber: 1,
    path: 'part[1].measure[1].direction[2].direction-type[1].wedge',
    message: expect.stringContaining('{"staff":1,"voice":"voice-1","sourceTick":53760,"retainedTick":13440}')
  }])
  expect(parseMusicXmlWithReport(serializeMusicXml(score)).report.warnings).toEqual([])
})

it.each([1, 8])('preserves an independent hairpin ending in the original staff and measure with divisions=%i', divisions => {
  const xml = `<score-partwise version="4.0"><part-list><score-part id="P-lower"><part-name>Piano</part-name></score-part></part-list>
  <part id="P-lower"><measure number="42">
    <attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
    <direction><direction-type><wedge type="crescendo"/></direction-type><voice>7</voice><staff>2</staff></direction>
    <direction><direction-type><wedge type="stop"/></direction-type><offset>${1.5 * divisions}</offset><voice>7</voice><staff>2</staff></direction>
    <note><rest measure="yes"/><duration>${4 * divisions}</duration><voice>1</voice><staff>1</staff></note>
    <backup><duration>${4 * divisions}</duration></backup>
    ${Array.from('CDEF', step => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${divisions}</duration><voice>7</voice><type>quarter</type><staff>2</staff></note>`).join('')}
  </measure></part></score-partwise>`
  const score = parseMusicXml(xml)
  const measure = score.parts[0].staves[1].measures[0]
  expect(score.hairpins).toEqual([expect.objectContaining({
    endTime: { measureId: measure.id, voiceId: measure.voices[0].id, tick: 20160 }
  })])
  const project = createNativeProject(score)
  expect(project.version).toBe(3)
  expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
  const copy = parseMusicXml(serializeMusicXml(score))
  expect(copy.hairpins?.[0].endTime).toEqual(score.hairpins?.[0].endTime)
  const noTime = { ...score, hairpins: undefined }
  expect(createNativeProject(noTime).version).toBe(2)
  expect(() => decodeNativeProject(JSON.stringify({ ...project, version: 2 }))).toThrow(/version 2/)
  for (const badEnd of [
    { measureId: score.parts[0].staves[0].measures[0].id },
    { voiceId: 'missing-voice' },
    { tick: 0 },
    { tick: 4 * TICKS_PER_QUARTER + 1 }
  ]) {
    const invalid = structuredClone(project)
    const hairpin = invalid.score.hairpins![0]
    if (!hairpin.endTime) throw new Error('Expected independent ending')
    Object.assign(hairpin.endTime, badEnd)
    expect(() => encodeNativeProject(invalid)).toThrow(/Invalid project hairpin time endpoint/)
  }
  const span = score.hairpins![0]
  const before = createPlaybackTimeline(noTime)
  const after = createPlaybackTimeline(score)
  const heldId = measure.voices[0].events[1].id
  const held = after.events.find(event => event.eventId === heldId)!
  expect([held.startBeat, held.durationBeats, held.velocityEndBeat]).toEqual([1, 1, 1.5])
  expect(resolveEventVelocityAtBeat(held, 1.5)).toBeGreaterThan(held.velocityStart)
  expect(resolveEventVelocityAtBeat(held, 1.75)).toBe(resolveEventVelocityAtBeat(held, 1.5))
  expect(after.events.filter(event => event.startBeat >= 2 || event.measureId !== measure.id))
    .toEqual(before.events.filter(event => event.startBeat >= 2 || event.measureId !== measure.id))
  const collision = { ...score, hairpins: [{
    ...span, endEventId: undefined, endAnchor: undefined,
    endTime: { measureId: measure.id, voiceId: measure.voices[0].id, tick: 2 * TICKS_PER_QUARTER }
  }] }
  expect(parseMusicXml(serializeMusicXml(collision)).hairpins?.[0].endTime?.tick).toBe(2 * TICKS_PER_QUARTER)
  const outOfBar = xml.replace(`<offset>${1.5 * divisions}</offset>`, `<offset>${5 * divisions}</offset>`)
  expect(() => parseMusicXml(outOfBar)).toThrow(/파트 1 \(P-lower\).*보표 2.*성부 7.*1번째 마디.*번호 42.*67200 tick.*5박/)
  expect(parseMusicXml(xml.replace(`<offset>${1.5 * divisions}</offset>`, `<offset>${2 * divisions}</offset>`)).hairpins).toHaveLength(1)
})
