import { readFileSync } from 'node:fs'
import { XMLParser } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { createDuration, createMeasure, createNote, createRest, createPart, createScore, createStaff,
  createTimePosition, createVoice, TICKS_PER_QUARTER } from '../score-core'
import { parseMusicXml } from './parse'
import { serializeMusicXml, serializeMusicXmlWithReport } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

const q = TICKS_PER_QUARTER

it('exports partial ending tie notation separately from its sounding stop', () => {
  const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-branch-ties.musicxml', 'utf8'))
  const xml = serializeMusicXml(score)
  const measures = new XMLParser({ ignoreAttributes: false }).parse(xml)['score-partwise'].part.measure
  expect(measures[2].note.tie).toEqual({ '@_type': 'stop' })
  expect(measures[2].note.notations.tied.map((tie: Record<string, string>) => tie['@_type'])).toEqual(['start', 'stop'])
  const reopened = parseMusicXml(xml)
  expect(reopened.parts[0]!.staves[0]!.measures[2]!.voices[0]!.events[0]).toMatchObject({ ties: { stop: true } })
  expect(createPlaybackTimeline(reopened).events.map(event => [event.startBeat, event.durationBeats])).toEqual([[0, 2], [2, 2]])
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(reopened))).score).toEqual(reopened)
})

it('reports consumer compatibility risk at the partial-tie destination', () => {
  const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-branch-ties.musicxml', 'utf8'))
  const { report } = serializeMusicXmlWithReport(score)
  expect(report.warnings).toEqual([expect.objectContaining({
    code: 'consumer-compatibility', measureId: score.parts[0]!.staves[0]!.measures[2]!.id,
    path: 'score.parts[0].staves[0].measures[2].voices[0].events[0].ties'
  })])
  const ordinary = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-slur-contract.musicxml', 'utf8'))
  expect(serializeMusicXmlWithReport(ordinary).report.warnings).toEqual([])
})

it('preserves both sounding directions across a repeat return with partial notation', () => {
  const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-branch-ties.musicxml', 'utf8'))
  const measures = score.parts[0]!.staves[0]!.measures
  measures.pop()
  delete measures[1]!.volta
  Object.assign(measures[0]!.voices[0]!.events[0]!, { ties: { stop: true } })
  Object.assign(measures[1]!.voices[0]!.events[0]!, { ties: { start: true } })
  const xml = serializeMusicXml(score)
  const nodes = new XMLParser({ ignoreAttributes: false }).parse(xml)['score-partwise'].part.measure
  expect(nodes.map((measure: { note: { notations: { tied: Record<string, string>[] } } }) => measure.note.notations.tied.map(tie => tie['@_type'])))
    .toEqual([['start', 'stop'], ['start', 'stop']])
  const reopened = parseMusicXml(xml)
  expect(createPlaybackTimeline(reopened).events.map(event => [event.startBeat, event.durationBeats])).toEqual([[0, 1], [1, 2], [3, 1]])
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(reopened))).score).toEqual(reopened)
})
function scoreWithSpans() {
  return createScore({
    parts: [createPart({ staves: [createStaff({ measures: [createMeasure({
      voices: [1, 2].map(v => createVoice({ id: `voice-${v}`, events: [0, 1, 2, 3].map(i => createNote({
        id: `v${v}-${i}`, pitch: { step: 'C', octave: v === 1 ? 5 : 4 },
        duration: createDuration('quarter'), position: createTimePosition(i * q)
      })) }))
    })] })] })],
    hairpins: [
      { id: 'upper', type: 'crescendo', startEventId: 'v1-0', endEventId: 'v1-2' },
      { id: 'lower', type: 'diminuendo', startEventId: 'v2-1', endEventId: 'v2-3' }
    ],
    octaveShifts: [{ id: 'octave', type: '8va', startEventId: 'v2-1', endEventId: 'v2-2' }]
  })
}

function address(score: ReturnType<typeof parseMusicXml>, id: string) {
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    for (const voice of measure.voices) {
      const event = voice.events.find(item => item.id === id)
      if (event) return [voice.id, event.position.tick]
    }
  }
  throw new Error(`Missing anchor ${id}`)
}

describe('direction span timing and voice', () => {
  it('keeps outer volta ownership across nested-repeat XML and native round trips', () => {
    const source = parseMusicXml(readFileSync('src/musicxml/fixtures/nested-volta-ownership.musicxml', 'utf8'))
    for (const score of [source, parseMusicXml(serializeMusicXml(source)), decodeNativeProject(encodeNativeProject(createNativeProject(source))).score]) {
      const before = JSON.stringify(score)
      const measures = score.parts[0]!.staves[0]!.measures
      const timeline = createPlaybackTimeline(score)
      expect(timeline.events.map(event => measures.findIndex(measure => measure.id === event.measureId)))
        .toEqual([0, 1, 2, 1, 2, 3, 0, 4])
      expect(timeline.totalBeats).toBe(8)
      expect(timeline.events.map(event => event.durationBeats)).toEqual(Array(8).fill(1))
      expect(measures.map(measure => measure.volta?.number)).toEqual([undefined, 1, undefined, 1, 2])
      expect(score.slurs).toHaveLength(1)
      expect(timeline).toEqual(createPlaybackTimeline({ ...score, slurs: [] }))
      expect(JSON.stringify(score)).toBe(before)
    }
  })

  it('replays inner repeats on each outer pass while keeping slurs separate from tied playback', () => {
    const source = parseMusicXml(readFileSync('src/musicxml/fixtures/nested-repeat-slur-contract.musicxml', 'utf8'))
    expect(serializeMusicXmlWithReport(source).report.warnings).toEqual([
      expect.objectContaining({ code: 'consumer-compatibility',
        measureId: source.parts[0]!.staves[0]!.measures[1]!.id,
        path: 'score.parts[0].staves[0].measures[1].repeat' })
    ])
    for (const score of [source, parseMusicXml(serializeMusicXml(source)), decodeNativeProject(encodeNativeProject(createNativeProject(source))).score]) {
      const before = JSON.stringify(score)
      const timeline = createPlaybackTimeline(score)
      const measures = score.parts[0]!.staves[0]!.measures
      expect(timeline.events.map(event => measures.findIndex(measure => measure.id === event.measureId)))
        .toEqual([0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3])
      expect(timeline.totalBeats).toBe(12)
      expect(timeline.events.map(event => event.startBeat)).toEqual(Array.from({ length: 12 }, (_, index) => index))
      expect(timeline.events.map(event => event.durationBeats)).toEqual(Array(12).fill(1))
      expect(timeline).toEqual(createPlaybackTimeline({ ...score, slurs: [] }))
      expect(score.slurs).toHaveLength(1)
      expect(JSON.stringify(score)).toBe(before)
    }
  })

  it('keeps repeat-volta slur endpoints separate from tied playback through XML and native round trips', () => {
    const source = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-slur-contract.musicxml', 'utf8'))
    const xml = serializeMusicXml(source)
    const roundTrip = parseMusicXml(xml)
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(source))).score
    for (const score of [source, roundTrip, native]) {
      const snapshot = JSON.stringify(score)
      const measures = score.parts[0]!.staves[0]!.measures
      const [start, continuation] = measures[0]!.voices[0]!.events
      const first = measures[1]!.voices[0]!.events[0]!, second = measures[2]!.voices[0]!.events[0]!
      expect(measures[0]!.repeat?.start).toBe(true)
      expect(measures[1]!.repeat?.end).toBe(true)
      expect(measures.slice(1).map(measure => measure.volta)).toEqual([
        { number: 1, start: true, end: true }, { number: 2, start: true, end: true }
      ])
      expect(score.slurs).toHaveLength(1)
      expect(score.slurs![0]).toMatchObject({ startEventId: start!.id, endEventId: second.id })
      const timeline = createPlaybackTimeline(score)
      expect(timeline).toEqual(createPlaybackTimeline({ ...score, slurs: [] }))
      expect(timeline.totalBeats).toBe(16)
      expect(timeline.events.map(event => [event.eventId, event.startBeat, event.durationBeats])).toEqual([
        [start!.id, 0, 4], [first.id, 4, 4], [start!.id, 8, 4], [second.id, 12, 4]
      ])
      expect(timeline.events[0]!.sourceEventStarts).toEqual([
        { eventId: start!.id, startBeat: 0 }, { eventId: continuation!.id, startBeat: 2 }
      ])
      expect(timeline.events[2]!.sourceEventStarts).toEqual([
        { eventId: start!.id, startBeat: 8 }, { eventId: continuation!.id, startBeat: 10 }
      ])
      expect(JSON.stringify(score)).toBe(snapshot)
    }
    expect(native).toEqual(source)
  })

  it.each(['note', 'rest'])('reapplies each voice hairpin with %s anchors on every repeated traversal', anchorType => {
    const score = scoreWithSpans()
    score.octaveShifts = []
    if (anchorType === 'rest') {
      const anchorIds = new Set(score.hairpins!.flatMap(span => [span.startEventId, span.endEventId]))
      for (const voice of score.parts[0]!.staves[0]!.measures[0]!.voices) {
        voice.events = voice.events.map(event => anchorIds.has(event.id)
          ? createRest({ id: event.id, duration: event.duration, position: event.position }) : event)
      }
    }
    score.parts[0]!.staves[0]!.measures[0]!.repeat = { start: true, end: true, times: 3 }
    for (const candidate of [score, parseMusicXml(serializeMusicXml(score))]) {
      const timeline = createPlaybackTimeline(candidate)
      expect(timeline.totalBeats).toBe(12)
      for (const voiceId of ['voice-1', 'voice-2']) {
        const velocities = [0, 4, 8].map(start => timeline.events
          .filter(event => event.voiceId === voiceId && event.startBeat >= start && event.startBeat < start + 4)
          .map(event => [event.velocityStart, event.velocityEnd]))
        expect(velocities[1]).toEqual(velocities[0])
        expect(velocities[2]).toEqual(velocities[0])
        expect(velocities[0]!.some(([start, end]) => start !== end)).toBe(true)
      }
    }
  })

  it('round-trips hairpins on rest anchors without moving them to another voice', () => {
    const score = scoreWithSpans()
    score.octaveShifts = []
    score.hairpins = [{ id: 'rest-span', type: 'crescendo', startEventId: 'v2-0', endEventId: 'v2-3' }]
    const voice = score.parts[0]!.staves[0]!.measures[0]!.voices[1]!
    voice.events = voice.events.map((event, index) => index === 0 || index === 3 ? createRest({ id: event.id, duration: event.duration, position: event.position }) : event)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    const reopened = parseMusicXml(serializeMusicXml(score))
    const span = reopened.hairpins![0]!
    expect(address(reopened, span.startEventId)).toEqual(['voice-2', 0])
    expect(address(reopened, span.endEventId)).toEqual(['voice-2', 3 * q])
    const events = reopened.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    expect(events.find(event => event.id === span.startEventId)?.type).toBe('rest')
    expect(events.find(event => event.id === span.endEventId)?.type).toBe('rest')
    const baseline = createPlaybackTimeline({ ...score, hairpins: [] })
    const performed = createPlaybackTimeline(score)
    expect(performed.events.filter(event => event.voiceId === 'voice-1')).toEqual(baseline.events.filter(event => event.voiceId === 'voice-1'))
    expect(performed.events.find(event => event.eventId === 'v2-2')!.velocityEnd).toBeGreaterThan(baseline.events.find(event => event.eventId === 'v2-2')!.velocityEnd)
    expect(() => createNativeProject({ ...score, slurs: [{ id: 'invalid-rest-slur', startEventId: 'v2-0', endEventId: 'v2-3' }] })).toThrow('span endpoints')
  })

  it('round-trips overlapping voice spans on interior notes without swapping anchors', () => {
    const reopened = parseMusicXml(serializeMusicXml(scoreWithSpans()))
    expect(reopened.hairpins?.map(span => [span.type, address(reopened, span.startEventId), address(reopened, span.endEventId)])).toEqual([
      ['crescendo', ['voice-1', 0], ['voice-1', 2 * q]],
      ['diminuendo', ['voice-2', q], ['voice-2', 3 * q]]
    ])
    expect(address(reopened, reopened.octaveShifts![0]!.startEventId)).toEqual(['voice-2', q])
    expect(address(reopened, reopened.octaveShifts![0]!.endEventId)).toEqual(['voice-2', 2 * q])
  })

  it('reads direction position after backup/forward and scales negative offsets using divisions', () => {
    const note = (voice: number) => `<note><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration><voice>${voice}</voice><type>quarter</type></note>`
    const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1">
      <attributes><divisions>3</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      ${note(1).repeat(4)}<backup><duration>12</duration></backup>
      ${note(2)}<direction><direction-type><wedge type="crescendo"/></direction-type><voice>2</voice></direction>
      ${note(2).repeat(3)}<backup><duration>6</duration></backup><forward><duration>3</duration></forward>
      <direction><direction-type><wedge type="stop"/></direction-type><offset>-3</offset><voice>2</voice></direction>
    </measure></part></score-partwise>`
    const score = parseMusicXml(xml)
    expect(address(score, score.hairpins![0]!.startEventId)).toEqual(['voice-2', q])
    expect(address(score, score.hairpins![0]!.endEventId)).toEqual(['voice-2', 2 * q])
  })

  it('keeps lower-staff voice direction anchors separate from upper-staff notes', () => {
    const score = scoreWithSpans()
    const lower = score.parts[0]!.staves[0]!
    score.parts[0]!.staves.unshift(createStaff({ id: 'upper-staff', measures: [createMeasure({
      id: 'upper-measure', voices: [createVoice({ events: [createNote({
        id: 'upper-note', pitch: { step: 'G', octave: 5 }, duration: createDuration('whole')
      })] })]
    })] }))
    const reopened = parseMusicXml(serializeMusicXml(score))
    const lowerIds = new Set(reopened.parts[0]!.staves[1]!.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.map(event => event.id))))
    expect(lower).toBe(score.parts[0]!.staves[1])
    for (const span of [...reopened.hairpins!, ...reopened.octaveShifts!]) {
      expect(lowerIds.has(span.startEventId)).toBe(true)
      expect(lowerIds.has(span.endEventId)).toBe(true)
    }
  })

  it('rejects missing or cross-staff anchors instead of silently dropping a span', () => {
    const score = scoreWithSpans()
    score.hairpins![0]!.endEventId = 'missing'
    expect(() => serializeMusicXml(score)).toThrow('span endpoint')
  })

  it('does not silently round an offset between supported note anchors', () => {
    const score = scoreWithSpans()
    const xml = serializeMusicXml(score).replace(`<offset>${q}</offset>`, `<offset>${q / 2}</offset>`)
    expect(() => parseMusicXml(xml)).toThrow('연결할 note가 없습니다')
  })
})
