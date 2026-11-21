import { expect, it } from 'vitest'
import { createTempoRoundtripFixture } from '../../../testing/tempo-roundtrip-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { MidiTempoRangeError, serializeMidi } from './serialize-midi'

it.each(['global', 'position', 'alias', 'repeat'] as const)('retains the existing %s tempo source identity on an unrepresentable MIDI error', mode => {
  const { score } = createTempoRoundtripFixture(mode === 'global' ? 'global' : 'position', 1)
  if (mode === 'alias') score.tempoEvents![0].measureId = 'measure-2'
  if (mode === 'repeat') for (const part of score.parts) for (const staff of part.staves) {
    staff.measures[0].repeat = { start: true }; staff.measures[2].repeat = { end: true, times: 2 }
  }
  const before = encodeNativeProject(createNativeProject(score))
  let caught: unknown
  try { serializeMidi(score) } catch (error) { caught = error }
  expect(caught).toBeInstanceOf(MidiTempoRangeError)
  expect((caught as MidiTempoRangeError).target).toEqual(mode === 'global'
    ? { scope: 'score' }
    : { scope: 'measure', measureId: score.tempoEvents![0].measureId })
  expect((caught as Error).message).toMatch(mode === 'global' ? /at score\.tempo:/ : /at tempo@beat\[4\]:/)
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})
