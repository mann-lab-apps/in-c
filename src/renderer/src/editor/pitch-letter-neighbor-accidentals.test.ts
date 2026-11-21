import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand, resolveNotePitch, type Note, type Score } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createEnharmonicNeighborFixture as fixture } from '../../../testing/enharmonic-neighbor-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { buildPitchStepCommand } from './pitch-editing'

function explicitReference(score: Score): Score {
  const result = structuredClone(score)
  score.parts.forEach((part, pi) => part.staves.forEach((staff, si) => staff.measures.forEach((measure, mi) => measure.voices.forEach((voice, vi) => voice.events.forEach((event, ei) => {
    if (event.type !== 'note') return
    const members = (event.pitches?.length ? event.pitches : [event.pitch]).map(pitch => resolveNotePitch(measure, voice, { ...event, pitch }))
    const target = result.parts[pi].staves[si].measures[mi].voices[vi].events[ei] as Note
    target.pitch = members[0]
    if (event.pitches?.length) target.pitches = members
  })))))
  return result
}
const cases = [
  { kind: 'sharp', step: 'D', expectedPitch: { step: 'D', octave: 4, alter: 0 } },
  { kind: 'chord', step: 'D', expectedPitch: { step: 'D', octave: 4, alter: 0 } },
  { kind: 'sharp', step: 'C', expectedPitch: { step: 'C', octave: 4, alter: 0 } },
  { kind: 'flat', step: 'C', expectedPitch: { step: 'C', octave: 4, alter: 0 } },
  { kind: 'key', step: 'G', expectedPitch: { step: 'G', octave: 4, alter: 0 } },
  { kind: 'explicit', step: 'D', expectedPitch: { step: 'D', octave: 4, alter: 0 } }
] as const
it.each(cases)('changes only the selected sounding pitch with A-G: $kind $step', ({ kind, step, expectedPitch }) => {
  const { score } = fixture(kind)
  score.title = '음 이름 변경 이웃음 보존'
  const before = structuredClone(score), voice = before.parts[0].staves[0].measures[0].voices[0]
  const expected = explicitReference(before), selected = expected.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  selected.pitch = expectedPitch
  delete selected.pitches
  const command = buildPitchStepCommand(score, { type: 'event', eventId: 'qa-leading' }, step)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!), notes = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  const output = process.env.DDIRORI_LETTER_NEIGHBOR_QA_DIR
  if (output) {
    const dir = join(output, `${kind}-${step}`); mkdirSync(dir, { recursive: true })
    for (const [name, contents] of Object.entries({
      'source.chromatics': encodeNativeProject(createNativeProject(before)),
      'reference-explicit.chromatics': encodeNativeProject(createNativeProject(expected)),
      'expected.mid': serializeMidi(expected),
      'current-command.chromatics': encodeNativeProject(createNativeProject(result.score)),
      'oracle.json': JSON.stringify({ kind, step, selected: 'qa-leading', expectedPitch }, null, 2)
    })) writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
  expect(notes[0]).toEqual({ ...voice.events[0], pitch: expectedPitch, pitches: undefined })
  expect(serializeMidi(result.score)).toEqual(serializeMidi(expected))
  expect(notes.slice(1).map(({ pitch: _pitch, pitches: _pitches, ...rest }) => rest)).toEqual((voice.events.slice(1) as Note[]).map(({ pitch: _pitch, pitches: _pitches, ...rest }) => rest))
  if (kind === 'explicit' || kind === 'key') expect(notes.slice(1)).toEqual(voice.events.slice(1))
  expect(result.score.parts[0].staves[0].measures[0].voices[1]).toEqual(before.parts[0].staves[0].measures[0].voices[1])
  expect(result.score.parts[0].staves[0].measures[1]).toEqual(before.parts[0].staves[0].measures[1])
  expect(result.score.slurs).toEqual(before.slurs)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(expected))
  expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)).toEqual(serializeMidi(expected))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
  expect(score).toEqual(before)
})
