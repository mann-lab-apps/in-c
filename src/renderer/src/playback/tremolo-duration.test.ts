import { beforeAll, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMusicXml } from '../../../musicxml'
import { createNote, createRest, TICKS_PER_QUARTER, validateMeasureRhythm, type Duration } from '../../../score-core'
import { createTremoloTimingFixture } from '../../../testing/tremolo-timing-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline } from './timeline'
import { createPianoCommands } from './piano-transport'
import { createTremoloPulseBeats } from './useScorePlayback'
import { expressPianoScore } from './piano-expression'

const cases: { label: string; duration: Duration; marks: 1 | 2 | 3; interval: number; count: number }[] = [
  { label: 'quarter1', duration: { value: 'quarter', dots: 0 }, marks: 1, interval: .5, count: 2 },
  { label: 'quarter2', duration: { value: 'quarter', dots: 0 }, marks: 2, interval: .25, count: 4 },
  { label: 'quarter3', duration: { value: 'quarter', dots: 0 }, marks: 3, interval: .125, count: 8 },
  { label: 'half', duration: { value: 'half', dots: 0 }, marks: 1, interval: .5, count: 4 },
  { label: 'whole', duration: { value: 'whole', dots: 0 }, marks: 1, interval: .5, count: 8 },
  { label: 'eighth1', duration: { value: 'eighth', dots: 0 }, marks: 1, interval: .25, count: 2 },
  { label: 'eighth2', duration: { value: 'eighth', dots: 0 }, marks: 2, interval: .125, count: 4 },
  { label: 'eighth3', duration: { value: 'eighth', dots: 0 }, marks: 3, interval: .0625, count: 8 },
  { label: 'dotted-eighth', duration: { value: 'eighth', dots: 1 }, marks: 1, interval: .25, count: 3 },
  { label: 'sixteenth', duration: { value: '16th', dots: 0 }, marks: 1, interval: .125, count: 2 },
  { label: 'dotted-sixteenth', duration: { value: '16th', dots: 1 }, marks: 1, interval: .125, count: 3 },
  { label: '32nd', duration: { value: '32nd', dots: 0 }, marks: 1, interval: .0625, count: 2 },
  { label: '64th', duration: { value: '64th', dots: 0 }, marks: 1, interval: .03125, count: 2 },
  { label: 'triplet-eighth', duration: { value: 'eighth', dots: 0, tuplet: { actualNotes: 3, normalNotes: 2 } }, marks: 1, interval: 1 / 6, count: 2 },
  { label: 'dotted-seven', duration: { value: 'eighth', dots: 1, tuplet: { actualNotes: 7, normalNotes: 4 } }, marks: 1, interval: 1 / 7, count: 3 },
  { label: 'triplet-half', duration: { value: 'half', dots: 0, tuplet: { actualNotes: 3, normalNotes: 2 } }, marks: 1, interval: 1 / 3, count: 4 }
]

beforeAll(() => {
  const root = process.env.STUDIO_TREMOLO_TIMING_QA_DIR
  if (!root) return
  for (const entry of cases) {
    const score = createTremoloTimingFixture(entry.duration, entry.marks), dir = join(root, entry.label)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir, 'source.musicxml'), serializeMusicXml(score))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(dir, 'expectations.json'), JSON.stringify(entry, null, 2))
  }
})

it.each(cases)('uses source flags and strokes for $label while retaining original timing and files', entry => {
  const score = createTremoloTimingFixture(entry.duration, entry.marks), original = structuredClone(score)
  const project = createNativeProject(score), native = encodeNativeProject(project)
  const xml = serializeMusicXml(score), midi = serializeMidi(score)
  expect(validateMeasureRhythm(score.parts[0].staves[0].measures[0]).isExact).toBe(true)
  const timeline = createPlaybackTimeline(score), eventIndex = timeline.events.findIndex(e => e.eventId === 'leading'), event = timeline.events[eventIndex]
  const attacks = createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith(eventIndex + ':'))
  expect(attacks).toHaveLength(entry.count)
  attacks.forEach((attack, index) => expect(attack.time).toBeCloseTo(index * entry.interval * .5, 10))
  expect(attacks.every(attack => attack.time < event.durationBeats * .5)).toBe(true)
  expect(event.tremoloIntervalBeats).toBeCloseTo(entry.interval, 12)
  const legacy = createTremoloPulseBeats(event.startBeat, event.startBeat + event.durationBeats, 0, entry.marks, event.tremoloIntervalBeats)
  expect(legacy).toHaveLength(entry.count)
  legacy.forEach((beat, index) => expect(beat).toBeCloseTo(index * entry.interval, 10))
  expect(score).toEqual(original)
  expect(encodeNativeProject(project)).toBe(native)
  expect(serializeMusicXml(score)).toBe(xml)
  expect(serializeMidi(score)).toEqual(midi)
})

it('keeps the notated subdivision when a fermata extends the performed duration', () => {
  const score = createTremoloTimingFixture({ value: 'eighth', dots: 0 })
  score.parts[0].staves[0].measures[0].voices[0].events[0].fermata = true
  const timeline = createPlaybackTimeline(score), event = timeline.events.find(e => e.eventId === 'leading')!
  expect(event.durationBeats).toBeCloseTo(.75)
  expect(event.tremoloIntervalBeats).toBe(.25)
  expect(createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith('0:'))).toHaveLength(3)
})

it('carries subdivision through sustained tie merging without changing the source notes', () => {
  const score = createTremoloTimingFixture({ value: 'eighth', dots: 0 })
  const voice = score.parts[0].staves[0].measures[0].voices[0], leading = voice.events[0]
  if (leading.type !== 'note') throw new Error('owned note')
  leading.ties = { start: true }
  voice.events = [leading, createNote({ id: 'tie-tail', position: { tick: TICKS_PER_QUARTER / 2 },
    duration: { value: 'eighth', dots: 0 }, pitch: leading.pitch, ties: { stop: true } }),
    createRest({ id: 'tie-padding', position: { tick: TICKS_PER_QUARTER }, duration: { value: 'half', dots: 1 } })]
  const project = createNativeProject(score), native = encodeNativeProject(project)
  const timeline = createPlaybackTimeline(score), event = timeline.events.find(e => e.eventId === 'leading')!
  expect(event.durationBeats).toBe(1); expect(event.tremoloIntervalBeats).toBe(.25)
  expect(createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith('0:'))).toHaveLength(4)
  expect(encodeNativeProject(project)).toBe(native)
})

it('preserves the source subdivision in each repeated occurrence', () => {
  const score = createTremoloTimingFixture({ value: 'eighth', dots: 0 })
  for (const part of score.parts) for (const staff of part.staves) staff.measures[0].repeat = { start: true, end: true, times: 2 }
  const timeline = createPlaybackTimeline(score), events = timeline.events.filter(e => e.eventId === 'leading')
  expect(events.map(e => e.startBeat)).toEqual([0, 4])
  for (const event of events) {
    expect(event.tremoloIntervalBeats).toBe(.25)
    const index = timeline.events.indexOf(event)
    expect(createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith(index + ':'))).toHaveLength(2)
  }
})

it('keeps subdivision when the existing staccato profile shortens the sounding envelope', () => {
  const score = createTremoloTimingFixture({ value: 'eighth', dots: 0 })
  const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw new Error('owned note')
  note.articulations = ['staccato']
  const timeline = expressPianoScore(score, createPlaybackTimeline(score), false), event = timeline.events.find(e => e.eventId === 'leading')!
  expect(event.durationBeats).toBe(.25); expect(event.tremoloIntervalBeats).toBe(.25)
  expect(createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith('0:'))).toHaveLength(1)
})

it('does not attack again at the exact end after a fermata warps a dotted tuplet', () => {
  const score = createTremoloTimingFixture({ value: 'eighth', dots: 1, tuplet: { actualNotes: 7, normalNotes: 4 } })
  const measure = score.parts[0].staves[0].measures[0], voice = measure.voices[0]
  voice.events = voice.events.filter(e => !e.id.startsWith('tremolo-tail'))
    .map(e => ({ ...e, position: { tick: e.position.tick + TICKS_PER_QUARTER } }))
  voice.events.unshift(createRest({ id: 'prefix', duration: { value: 'quarter', dots: 0 } }))
  score.parts[1].staves[0].measures[0].voices[0].events[0].fermata = true
  expect(validateMeasureRhythm(measure).isExact).toBe(true)
  const project = createNativeProject(score), native = encodeNativeProject(project)
  const timeline = createPlaybackTimeline(score), event = timeline.events.find(e => e.eventId === 'leading')!, index = timeline.events.indexOf(event)
  const attacks = createPianoCommands(timeline, 0, 120, {}).filter(c => c.type === 'on' && c.id.startsWith(index + ':'))
  expect(event.startBeat).toBe(1.5)
  expect(attacks).toHaveLength(3)
  expect(attacks.every(c => c.time < (event.startBeat + event.durationBeats) * .5)).toBe(true)
  expect(createTremoloPulseBeats(event.startBeat, event.startBeat + event.durationBeats, 0, 1, event.tremoloIntervalBeats)).toHaveLength(3)
  expect(encodeNativeProject(project)).toBe(native)
})
