import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER, type Score } from '../../../score-core'
import { createTempoRoundtripFixture } from '../../../testing/tempo-roundtrip-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi, MidiTempoRangeError, MidiPitchRangeError } from '../midi/serialize-midi'
import { preparePartTempoExport } from './part-tempo-export'

function setup() {
  const { score } = createTempoRoundtripFixture('position', 60), target = score.parts[1]
  const projected: Score = { ...score, parts: [target], tempoEvents: undefined }
  return { score, target, projected }
}
it('preserves order and all fields of same-time global instructions without mutating their owners', () => {
  const { score, target, projected } = setup(), first = score.tempoEvents![0]
  score.tempoEvents = [{ ...first, id: 'selected-first', measureId: target.staves[0].measures[1].id, bpm: 80, transparent: true }, { ...first, id: 'primary-second', bpm: 60 }]
  const before = encodeNativeProject(createNativeProject(score)), result = preparePartTempoExport(score, projected)
  expect(result.tempoEvents).toEqual(score.tempoEvents!.map(event => ({ ...event, measureId: target.staves[0].measures[1].id })))
  expect(createPlaybackTimeline(result).tempoEvents.map(e => [e.startBeat, e.quarterBpm])).toEqual(createPlaybackTimeline(score).tempoEvents.map(e => [e.startBeat, e.quarterBpm]))
  expect(encodeNativeProject(createNativeProject(score))).toBe(before);expect(projected.tempoEvents).toBeUndefined()
  expect({ ...result, tempoEvents: undefined }).toEqual(projected)
})
it('resolves concrete IDs before ordinal aliases when the strings collide', () => {
  const { score, target, projected } = setup();target.staves[0].measures[0].id = 'measure-2';score.tempoEvents![0].measureId = 'measure-2'
  const result = preparePartTempoExport(score, projected)
  expect(result.tempoEvents![0].measureId).toBe(target.staves[0].measures[0].id)
  expect(createPlaybackTimeline(result).tempoEvents[0].startBeat).toBe(0)
})
it('binds a primary alias by time rather than the target printed number', () => {
  const { score, target, projected } = setup();score.tempoEvents![0].measureId = 'measure-2'
  target.staves[0].measures.forEach((bar, index) => { bar.number = 10 + index })
  expect(preparePartTempoExport(score, projected).tempoEvents![0].measureId).toBe(target.staves[0].measures[1].id)
  expect(target.staves[0].measures[1].number).toBe(11)
})
it('accepts equivalent measure lengths with different meter labels', () => {
  const { score, target, projected } = setup();target.staves[0].measures.forEach(bar => { bar.timeSignature = { beats: 2, beatType: 2 } })
  expect(preparePartTempoExport(score, projected).tempoEvents![0].measureId).toBe(target.staves[0].measures[1].id)
})
it('retains pickup duration and supported numbering when anchoring the later tempo', () => {
  const { score, target, projected } = setup()
  for (const part of score.parts) {
    part.staves[0].measures.forEach((bar, index) => { bar.number = index + 1 })
    const first = part.staves[0].measures[0];first.timing = { type: 'pickup', durationTicks: TICKS_PER_QUARTER };first.voices[0].events[0].duration = { value: 'quarter', dots: 0 }
  }
  score.tempoEvents![0].measureId = 'measure-2'
  const before = encodeNativeProject(createNativeProject(score)), result = preparePartTempoExport(score, projected)
  expect(decodeNativeProject(before).score).toEqual(score)
  expect(result.tempoEvents![0].measureId).toBe(target.staves[0].measures[1].id)
  expect(createPlaybackTimeline(result).tempoEvents[0].startBeat).toBe(1)
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})
it('includes global tempo owned by an additional staff', () => {
  const { score, target, projected } = setup(), extra = structuredClone(score.parts[0].staves[0]);extra.id = 'extra-staff'
  extra.measures.forEach(bar => { bar.id = 'extra-' + bar.id;bar.voices.forEach(voice => voice.events.forEach(event => { event.id = 'extra-' + event.id })) })
  score.parts[0].staves.push(extra);score.tempoEvents![0].measureId = extra.measures[1].id
  expect(preparePartTempoExport(score, projected).tempoEvents![0].measureId).toBe(target.staves[0].measures[1].id)
})
it.each(['shorter-measure', 'missing-measure'] as const)('keeps the existing projection for an unsupported unequal grid: %s', kind => {
  const { score, target, projected } = setup()
  if (kind === 'missing-measure') target.staves[0].measures.pop()
  else { const bar = target.staves[0].measures[1];bar.timeSignature = { beats: 3, beatType: 4 };bar.voices[0].events[0].duration = { value: 'half', dots: 1 } }
  const before = encodeNativeProject(createNativeProject(score));expect(decodeNativeProject(before).score).toEqual(score)
  expect(preparePartTempoExport(score, projected)).toBe(projected);expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})
it('keeps no-tempo and unresolved internal contexts unchanged instead of inventing references', () => {
  const { score, projected } = setup();delete score.tempoEvents;expect(preparePartTempoExport(score, projected)).toBe(projected)
  score.tempoEvents = [{ id: 'unresolved', measureId: 'missing', tick: 0, bpm: 60, beatUnit: 'quarter' }]
  expect(preparePartTempoExport(score, projected)).toBe(projected)
})
it('retains MIDI tempo representability checks for newly included global instructions', () => {
  const { score, projected } = setup();score.tempoEvents![0].bpm = 3
  expect(() => serializeMidi(preparePartTempoExport(score, projected))).toThrow(MidiTempoRangeError)
})
it('does not widen selected-part pitch checks to notes that are not copied', () => {
  const { score, projected } = setup(), note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected fixture note')
  note.pitch = { step: 'B', octave: 9, alter: 0 }
  expect(() => serializeMidi(score)).toThrow(MidiPitchRangeError)
  expect(() => serializeMidi(preparePartTempoExport(score, projected))).not.toThrow()
})

it('retains the native boundary rejecting unsupported internal zero measure numbers', () => {
  const { score } = setup();score.parts[0].staves[0].measures[0].number = 0
  expect(() => createNativeProject(score)).toThrow()
})
