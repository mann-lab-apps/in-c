import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { applyScoreCommand, buildTieCommand, createScoreRepeatPlaybackPlan } from '../score-core'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const pitches = ['C', 'D', 'E', 'F', 'G', 'A']

function scoreMarkup(start: Record<number, string>, end: Record<number, string>) {
  const measures = pitches.map((step, i) => {
    const bar = i + 1
    const attributes = i === 0
      ? '<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
      : ''
    return `<measure number="${bar}">${attributes}${start[bar] ?? ''}
      <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>
      ${end[bar] ?? ''}</measure>`
  }).join('')
  return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1">${measures}</part></score-partwise>`
}

const sounds = (flags: string) => `<sound ${flags}/>`
const played = (xml: string) =>
  createScoreRepeatPlaybackPlan(parseMusicXml(xml))?.entries.map(entry => entry.measureIndex + 1)

it('keeps D.C. al Coda semantics through Native, MusicXML and the flattened MIDI export', () => {
  const source = scoreMarkup({ 4: sounds('coda="codab"') }, { 2: sounds('tocoda="codab"'), 6: sounds('dacapo="yes"') })
  const imported = parseMusicXmlWithReport(source)
  expect(imported.report.warnings.filter(warning => warning.message.startsWith('Playback navigation'))).toEqual([])
  expect(createPlaybackTimeline(imported.score).totalBeats).toBe(44)
  const stored = decodeNativeProject(encodeNativeProject(createNativeProject(imported.score))).score
  const xml = serializeMusicXml(stored)
  const expected = [1, 2, 3, 4, 5, 6, 1, 2, 4, 5, 6]
  expect(played(xml)).toEqual(expected)
  const flat = expandScoreRepeatsForMusicXml(stored)
  const flatXml = serializeMusicXml(flat)
  expect(flat.parts[0].staves[0].measures.map(measure => {
    const first = measure.voices[0].events[0]
    return first.type === 'note' ? first.pitch.step : null
  })).toEqual(expected.map(number => pitches[number - 1]))
  expect(flatXml).not.toMatch(/\b(?:coda|dacapo|tocoda)=/)
  expect(serializeMidi(parseMusicXml(flatXml))).toEqual(serializeMidi(stored))
})

it.each([false, true])('preserves the through-jump repeat policy in MusicXML: %s', afterJump => {
  const xml = scoreMarkup({
    2: '<barline location="left"><repeat direction="forward"/></barline>' + sounds('segno="S"')
  }, {
    3: `<barline location="right"><repeat direction="backward" after-jump="${afterJump ? 'yes' : 'no'}"/></barline>`,
    4: sounds('fine="yes"'),
    6: sounds('dalsegno="S"')
  })
  const output = serializeMusicXml(parseMusicXml(xml))
  expect(output).toContain(`after-jump="${afterJump ? 'yes' : 'no'}"`)
  expect(played(output)).toEqual([1, 2, 3, 2, 3, 4, 5, 6, ...(afterJump ? [2, 3, 2, 3, 4] : [2, 3, 4])])
})

it('preserves time-only when a jump fires on the second visit', () => {
  const xml = scoreMarkup({ 2: sounds('segno="S"') + '<barline location="left"><repeat direction="forward"/></barline>' }, {
    3: sounds('dalsegno="S" time-only="2"') + '<barline location="right"><repeat direction="backward"/></barline>',
    4: sounds('fine="yes"')
  })
  const output = serializeMusicXml(parseMusicXml(xml))
  expect(output).toContain('time-only="2"')
  expect(played(output)).toEqual([1, 2, 3, 2, 3, 2, 3, 4])
})

it.each(['segno', 'coda'] as const)('retains the explicit %s graphic without drawing sound-only targets', kind => {
  const marker = `<direction placement="above"><direction-type><${kind} relative-y="20"/></direction-type>
    <sound ${kind}="S"/></direction>`
  const actions: Record<number, string> = { 6: sounds(kind === 'segno' ? 'dalsegno="S"' : 'dacapo="yes"') }
  actions[kind === 'segno' ? 4 : 1] = sounds(kind === 'segno' ? 'fine="yes"' : 'tocoda="S"')
  const { score, report } = parseMusicXmlWithReport(scoreMarkup({
    2: marker,
    3: sounds(`${kind}="unused"`)
  }, actions))
  expect(score.parts[0].staves[0].measures[1].navigation).toEqual([{ type: kind, label: 'S', symbol: true }])
  expect(score.parts[0].staves[0].measures[2].navigation).toEqual([{ type: kind, label: 'unused' }])
  expect(report.warnings.map(warning => warning.message)).toEqual([
    expect.stringContaining('Navigation appearance')
  ])
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const xml = serializeMusicXml(native)
  expect(xml.match(new RegExp(`<${kind}(?:/| )`, 'g'))).toHaveLength(1)
  expect(xml).toContain(`<sound ${kind}="unused"/>`)
  expect(parseMusicXml(xml).parts[0].staves[0].measures[1].navigation).toEqual([{ type: kind, label: 'S', symbol: true }])
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))
})

it('keeps the To Coda words and glyph together at the performed measure end', () => {
  const direction = '<direction placement="above"><direction-type><words>To</words><symbol>coda</symbol></direction-type>' +
    '<sound tocoda="codab"/></direction>'
  const dc = '<direction placement="above"><direction-type><words>D.C. al Coda</words></direction-type><sound dacapo="yes"/></direction>'
  const { score, report } = parseMusicXmlWithReport(scoreMarkup({ 4: sounds('coda="codab"') }, { 2: direction, 6: dc }))
  const measures = score.parts[0].staves[0].measures
  expect(measures[1].navigation).toEqual([{ type: 'tocoda', label: 'codab', display: { words: 'To', coda: true } }])
  expect(measures[5].navigation).toEqual([{ type: 'dacapo', display: { words: 'D.C. al Coda' } }])
  expect(score.staffTexts).toBeUndefined()
  expect(report.warnings.filter(warning => warning.path.includes('direction'))).toEqual([])
  const reopened = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const xml = serializeMusicXml(reopened)
  for (const [number, words] of [[2, 'To'], [6, 'D.C. al Coda']] as const) {
    const bar = xml.match(new RegExp(`<measure number="${number}">([\\s\\S]+?)</measure>`))?.[1] ?? ''
    expect(bar.indexOf('<note>')).toBeGreaterThanOrEqual(0)
    expect(bar.indexOf(`<words>${words}</words>`)).toBeGreaterThan(bar.indexOf('</note>'))
    if (number === 2) expect(bar).toContain('<symbol>coda</symbol>')
  }
  expect(parseMusicXml(xml).parts[0].staves[0].measures.map(measure => measure.navigation))
    .toEqual(measures.map(measure => measure.navigation))
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))
})

function simpleVoltaJump(stop: 'fine' | 'coda' = 'fine') {
  const starts: Record<number, string> = {
    2: sounds('segno="S"') + '<barline location="left"><repeat direction="forward"/></barline>',
    3: '<barline location="left"><ending number="1" type="start"/></barline>',
    4: '<barline location="left"><ending number="2" type="start"/></barline>'
  }
  const atSecondEnding = stop === 'fine' ? sounds('fine="yes"') : sounds('tocoda="C"')
  const ends: Record<number, string> = {
    3: '<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
    4: atSecondEnding + '<barline location="right"><ending number="2" type="discontinue"/></barline>'
  }
  if (stop === 'coda') starts[6] = sounds('coda="C"')
  ends[stop === 'fine' ? 6 : 5] = sounds('dalsegno="S"')
  return scoreMarkup(starts, ends)
}

it('preserves D.S. al Fine across a simple volta pair from MusicXML through performance copies', () => {
  const { score, report } = parseMusicXmlWithReport(simpleVoltaJump())
  expect(report.warnings.filter(warning => warning.message.startsWith('Playback navigation'))).toEqual([])
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const original = structuredClone(native)
  const expected = [1, 2, 3, 2, 4, 5, 6, 2, 4]
  expect(createPlaybackTimeline(native).totalBeats).toBe(36)
  expect(played(serializeMusicXml(native))).toEqual(expected)
  const expanded = expandScoreRepeatsForMusicXml(native)
  expect(expanded.parts[0].staves[0].measures.map(measure => {
    const note = measure.voices[0].events[0]
    return note.type === 'note' ? note.pitch.step : null
  })).toEqual(expected.map(number => pitches[number - 1]))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(expanded)))).toEqual(serializeMidi(native))
  expect(native).toEqual(original)
})

it('sustains the tie to the first ending only on the visit that plays it', () => {
  const score = parseMusicXml(simpleVoltaJump())
  const staff = score.parts[0].staves[0]
  const start = staff.measures[1].voices[0].events[0]
  const ending = staff.measures[2].voices[0].events[0]
  if (start.type !== 'note' || ending.type !== 'note') throw new Error('Expected two note endpoints')
  ending.pitch = { ...start.pitch }
  const command = buildTieCommand(score, start.id, true)
  expect(command).toBeDefined()
  const { score: tied } = applyScoreCommand(score, command!)
  const before = structuredClone(tied)
  const visits = createPlaybackTimeline(tied).events.filter(event => event.eventId === start.id)
  expect(visits.map(event => [event.startBeat, event.durationBeats, event.tiedEvents?.[0].eventId]))
    .toEqual([[4, 8, ending.id], [12, 4, undefined], [28, 4, undefined]])
  const unfolded = parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(tied)))
  expect(serializeMidi(unfolded)).toEqual(serializeMidi(tied))
  expect(tied).toEqual(before)
})

it('finishes the second ending before jumping to a Coda after the D.S. source', () => {
  const score = parseMusicXml(simpleVoltaJump('coda'))
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(plan?.navigationIssue).toBeUndefined()
  expect(plan?.entries.map(entry => entry.measureIndex + 1)).toEqual([1, 2, 3, 2, 4, 5, 2, 4, 6])
  expect(plan?.entries.filter(entry => entry.navigationJump).map(entry => entry.outputBeat)).toEqual([24, 32])
  const copy = serializeMusicXml(score)
  expect(copy).toContain('tocoda="C"')
  expect(played(copy)).toEqual([1, 2, 3, 2, 4, 5, 2, 4, 6])
  expect(serializeMidi(expandScoreRepeatsForMusicXml(score))).toEqual(serializeMidi(score))
})

it.each([
  { stop: 'fine', barsInOrder: [1, 2, 3, 2, 3, 2, 4, 5, 6, 2, 4], jumpBeats: [36] },
  { stop: 'coda', barsInOrder: [1, 2, 3, 2, 3, 2, 4, 5, 2, 4, 6], jumpBeats: [32, 40] }
] as const)('keeps the three-pass volta path to $stop when unfolding the MusicXML copy', ({ stop, barsInOrder, jumpBeats }) => {
  const parsed = parseMusicXml(simpleVoltaJump(stop))
  const bars = parsed.parts[0].staves[0].measures
  bars[2].repeat = { end: true, times: 3 }
  bars[2].volta = { passes: [1, 2], start: true, end: true }
  bars[3].volta = { passes: [3], start: true, end: true }
  const original = structuredClone(parsed)
  const plan = createScoreRepeatPlaybackPlan(parsed)
  expect(plan?.navigationIssue).toBeUndefined()
  expect(plan?.entries.map(entry => entry.measureIndex + 1)).toEqual(barsInOrder)
  expect(plan?.entries.filter(entry => entry.navigationJump).map(entry => entry.outputBeat)).toEqual(jumpBeats)
  const expanded = expandScoreRepeatsForMusicXml(parsed)
  expect(expanded.parts[0].staves[0].measures.map(bar => {
    const note = bar.voices[0].events[0]
    return note.type === 'note' ? note.pitch.step : undefined
  })).toEqual(barsInOrder.map(number => pitches[number - 1]))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(expanded)))).toEqual(serializeMidi(parsed))
  expect(parsed).toEqual(original)
})
