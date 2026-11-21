import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand, resolveNotePitch, type Note, type Score } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createEnharmonicNeighborFixture as fixture } from '../../../testing/enharmonic-neighbor-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { buildAccidentalCommand } from './pitch-editing'

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
const cases = (['sharp', 'chord', 'explicit'] as const).flatMap(kind => ([-1, 0, 1] as const).map(alter => ({kind, alter})))
it.each(cases)('changes only selected accidental pitches: $kind $alter', ({ kind, alter }) => {
  const { score } = fixture(kind)
  score.title = '선택 임시표 이웃음 보존'
  const before = structuredClone(score), voice = before.parts[0].staves[0].measures[0].voices[0]
  const expected = explicitReference(before), selected = expected.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  const expectedPitches = (selected.pitches?.length ? selected.pitches : [selected.pitch]).map(pitch => ({ ...pitch, alter }))
  selected.pitch = expectedPitches[0]
  if (kind === 'chord') selected.pitches = expectedPitches
  const command = buildAccidentalCommand(score, { type: 'event', eventId: 'qa-leading' }, alter)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!), notes = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  const output = process.env.DDIRORI_ACCIDENTAL_NEIGHBOR_QA_DIR
  if (output) {
    const dir = join(output, `${kind}-${alter}`); mkdirSync(dir, { recursive: true })
    for (const [name, contents] of Object.entries({
      'source.chromatics': encodeNativeProject(createNativeProject(before)),
      'reference-explicit.chromatics': encodeNativeProject(createNativeProject(expected)),
      'expected.mid': serializeMidi(expected),
      'current-command.chromatics': encodeNativeProject(createNativeProject(result.score)),
      'oracle.json': JSON.stringify({ kind, alter, selected: 'qa-leading', expectedPitches }, null, 2)
    })) writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
  expect(notes[0]).toEqual({ ...voice.events[0], pitch: expectedPitches[0], ...(kind === 'chord' ? { pitches: expectedPitches } : {}) })
  expect(serializeMidi(result.score)).toEqual(serializeMidi(expected))
  expect(notes.slice(1).map(({ pitch: _pitch, pitches: _pitches, ...rest }) => rest)).toEqual((voice.events.slice(1) as Note[]).map(({ pitch: _pitch, pitches: _pitches, ...rest }) => rest))
  if (kind === 'explicit') expect(notes.slice(1)).toEqual(voice.events.slice(1))
  expect(result.score.parts[0].staves[0].measures[0].voices[1]).toEqual(before.parts[0].staves[0].measures[0].voices[1])
  expect(result.score.parts[0].staves[0].measures[1]).toEqual(before.parts[0].staves[0].measures[1])
  expect(result.score.slurs).toEqual(before.slurs)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(expected))
  expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)).toEqual(serializeMidi(expected))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
  expect(score).toEqual(before)
})
