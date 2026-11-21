import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER } from '../../../score-core'
import { createMidiPitchRangeFixture, type MidiPitchRangeKind } from '../../../testing/midi-pitch-range-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { readTestMidiEvents } from '../../../testing/midi-events'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'
const bad = ['upper', 'lower', 'chord', 'transpose-up', 'transpose-down', 'octave-up', 'octave-down'] as const
it.each(bad)('rejects actual emitted %s pitches instead of replacing them with a boundary note', async kind => {
  const score = createMidiPitchRangeFixture(kind), original = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(original).score).toEqual(score)
  const frequencies = createPlaybackTimeline(score).events.flatMap(event => event.frequencies ?? [])
  expect(frequencies.some(f => { const m = Math.round(69 + 12 * Math.log2(f / 440)); return m < 0 || m > 127 })).toBe(true)
  expect(() => serializeMidiWithReport(score)).toThrow(/Invalid MIDI pitch/)
  expect(() => serializeMidi(score)).toThrow(/Invalid MIDI pitch/)
  let failure: unknown
  try { serializeMidi(score) } catch (error) { failure = error }
  expect(failure).toHaveProperty('target', { partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, measureId: score.parts[0].staves[0].measures[0].id })
  expect(encodeNativeProject(createNativeProject(score))).toBe(original)
})
it.each([{ kind: 'edge-upper', pitch: 127 }, { kind: 'edge-lower', pitch: 0 }, { kind: 'normal', pitch: 60 }])('keeps supported $kind exact', async ({ kind, pitch }) => {
  const score = createMidiPitchRangeFixture(kind as MidiPitchRangeKind), report = serializeMidiWithReport(score)
  expect(report.warnings).toEqual([])
  expect(readTestMidiEvents(report.bytes).filter(e => e.status >> 4 === 9 && e.data[1] > 0).map(e => e.data[0])).toEqual([pitch])
  expect(serializeMidi(score)).toEqual(report.bytes)
  if (process.env.DDIRORI_MIDI_PITCH_RANGE_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
    mkdirSync(process.env.DDIRORI_MIDI_PITCH_RANGE_QA_DIR, { recursive: true })
    writeFileSync(join(process.env.DDIRORI_MIDI_PITCH_RANGE_QA_DIR, kind + '.mid'), report.bytes, { flag: 'wx' })
  }
})
it('retains the existing TAB omission before evaluating unperformed high notes', () => {
  const report = serializeMidiWithReport(createMidiPitchRangeFixture('skipped-tab'))
  expect(report.warnings.map(w => w.code)).toEqual(['unsupported-midi-clef'])
  expect(readTestMidiEvents(report.bytes).filter(e => e.status >> 4 === 9)).toEqual([])
})
it('retains the existing grace-note warning without rejecting an unperformed high grace pitch', () => {
  const report = serializeMidiWithReport(createMidiPitchRangeFixture('grace'))
  expect(report.warnings.map(w => w.code)).toEqual(['unsupported-midi-grace'])
  expect(readTestMidiEvents(report.bytes).filter(e => e.status >> 4 === 9 && e.data[1] > 0).map(e => e.data[0])).toEqual([60])
})

it.each(['repeat', 'tie'] as const)('validates the emitted pitch after existing %s timing without changing the source', kind => {
  const score = createMidiPitchRangeFixture('upper'), measure = score.parts[0].staves[0].measures[0]
  if (kind === 'repeat') measure.repeat = { start: true, end: true, times: 2 }
  else {
    const note = measure.voices[0].events[0]
    if (note.type !== 'note') throw new Error('Expected fixture note')
    note.duration = { value: 'half', dots: 0 }; note.ties = { start: true }
    measure.voices[0].events.push({ ...structuredClone(note), id: 'midi-range-tie-end', position: { tick: 2 * TICKS_PER_QUARTER }, ties: { stop: true } })
  }
  const native = encodeNativeProject(createNativeProject(score)), timeline = createPlaybackTimeline(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  expect(timeline.events).toHaveLength(kind === 'repeat' ? 2 : 1)
  expect(timeline.events[0].durationBeats).toBe(4)
  expect(() => serializeMidi(score)).toThrow(/Invalid MIDI pitch/)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
