import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand, resolveNotePitch, type Note, type Pitch, type Score } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createEnharmonicNeighborFixture as fixture } from '../../../testing/enharmonic-neighbor-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { buildPitchMovementCommand, type PitchMovement } from './pitch-editing'

/** An independent semantic oracle: snapshot every original sound explicitly,
 * then change only the selected pitches to their existing command contract. */
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

const cases = (['diatonic', 'chromatic', 'octave'] as PitchMovement[]).flatMap(movement => ([-1, 1] as const).flatMap(direction => (['sharp', 'chord', 'explicit'] as const).map(kind => ({ movement, direction, kind }))))
it.each(cases)('moves only the selected sounding pitches: $movement $direction $kind', ({ movement, direction, kind }) => {
  const { score } = fixture(kind)
  score.title = '음높이 이동 이웃음 보존'
  const voice = score.parts[0].staves[0].measures[0].voices[0]
  if (movement === 'octave') {
    const target = voice.events[2] as Note
    target.pitch = { step: 'C', octave: 4 + direction, ...(kind === 'explicit' ? { alter: 0 as const } : {}) }
    if (target.pitches) target.pitches = [target.pitch, { step: 'E', octave: 4 + direction }]
  }
  const before = structuredClone(score)
  const candidates: Pitch[] = movement === 'diatonic'
    ? direction === 1 ? [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]
      : [{ step: 'B', octave: 3, alter: 0 }, { step: 'D', octave: 4, alter: 0 }]
    : movement === 'chromatic' ? [{ step: 'C', octave: 4, alter: (1 + direction) as Pitch['alter'] }, { step: 'E', octave: 4, alter: (1 + direction) as Pitch['alter'] }]
      : [{ step: 'C', octave: 4 + direction, alter: 1 }, { step: 'E', octave: 4 + direction, alter: 1 }]
  const expected = explicitReference(before), expectedNote = expected.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  expectedNote.pitch = candidates[0]
  if (kind === 'chord') expectedNote.pitches = candidates
  const command = buildPitchMovementCommand(score, { type: 'event', eventId: 'qa-leading' }, movement, direction)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!), notes = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  const output = process.env.DDIRORI_PITCH_MOVEMENT_NEIGHBOR_QA_DIR
  if (output) {
    const dir = join(output, `${movement}-${direction}-${kind}`); mkdirSync(dir, { recursive: true })
    for (const [name, contents] of Object.entries({
      'source.chromatics': encodeNativeProject(createNativeProject(before)),
      'reference-explicit.chromatics': encodeNativeProject(createNativeProject(expected)),
      'expected.mid': serializeMidi(expected),
      'current-command.chromatics': encodeNativeProject(createNativeProject(result.score)),
      'oracle.json': JSON.stringify({ movement, direction, kind, selected: 'qa-leading', expectedSelected: kind === 'chord' ? candidates : [candidates[0]] }, null, 2)
    })) writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
  expect(notes[0].pitch).toEqual(candidates[0])
  if (kind === 'chord') expect(notes[0].pitches).toEqual(candidates)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(expected))
  expect(notes.map(({ pitch: _pitch, pitches: _pitches, ...metadata }) => metadata)).toEqual((voice.events as Note[]).map(({ pitch: _pitch, pitches: _pitches, ...metadata }) => metadata))
  if (kind === 'explicit') expect(notes.slice(1)).toEqual(voice.events.slice(1))
  expect(result.score.parts[0].staves[0].measures[0].voices[1]).toEqual(before.parts[0].staves[0].measures[0].voices[1])
  expect(result.score.parts[0].staves[0].measures[1]).toEqual(before.parts[0].staves[0].measures[1])
  expect(result.score.slurs).toEqual(before.slurs)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(expected))
  expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)).toEqual(serializeMidi(expected))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
  expect(score).toEqual(before)
})
