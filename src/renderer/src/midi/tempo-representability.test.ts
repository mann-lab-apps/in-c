import { expect, it } from 'vitest'
import { createTempoRoundtripFixture } from '../../../testing/tempo-roundtrip-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { readTestMidiEvents } from '../../../testing/midi-events'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'

it.each([
  { scope: 'global' as const, bpm: 1, beat: 'quarter' as const },
  { scope: 'position' as const, bpm: 1, beat: 'quarter' as const },
  { scope: 'global' as const, bpm: 40, beat: '64th' as const },
  { scope: 'global' as const, bpm: 60_000_000 / 16_777_216, beat: 'quarter' as const }
])('rejects unrepresentable $scope BPM $bpm / $beat before emitting a wrapped file', ({ scope, bpm, beat }) => {
  const { score } = createTempoRoundtripFixture(scope, bpm, beat)
  const before = encodeNativeProject(createNativeProject(score))
  expect(() => serializeMidiWithReport(score)).toThrow(/Invalid MIDI tempo/)
  expect(() => serializeMidi(score)).toThrow(/Invalid MIDI tempo/)
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})
it.each([
  { bpm: 3.75, beat: 'quarter' as const, microseconds: 16_000_000 },
  { bpm: 40, beat: '16th' as const, microseconds: 6_000_000 },
  { bpm: 60_000_000 / 16_777_215, beat: 'quarter' as const, microseconds: 16_777_215 }
])('keeps representable BPM $bpm / $beat exact, including the maximum tempo event value', ({ bpm, beat, microseconds }) => {
  const { score } = createTempoRoundtripFixture('global', bpm, beat)
  const report = serializeMidiWithReport(score)
  const tempos = readTestMidiEvents(report.bytes).filter(e => e.status === 255 && e.data[0] === 81)
  expect(tempos).toHaveLength(1)
  expect(tempos[0].data).toEqual([81, microseconds >> 16, (microseconds >> 8) & 255, microseconds & 255])
  expect(report.warnings).toEqual([])
})
