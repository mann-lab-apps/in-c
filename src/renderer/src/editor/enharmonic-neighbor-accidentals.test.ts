import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand, type Note } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createEnharmonicNeighborFixture as fixture, type EnharmonicNeighborKind } from '../../../testing/enharmonic-neighbor-fixture'
import { serializeMidi } from '../midi/serialize-midi'
import { buildEnharmonicRespellCommand } from './pitch-editing'

it.each(['sharp', 'flat', 'natural', 'key', 'chord', 'explicit'] as EnharmonicNeighborKind[])('respells only the selected event while retaining every sounding neighbor: %s', kind => {
  const { score, expectedLeading, expectedPins } = fixture(kind), before = structuredClone(score)
  const address = { partId: 'qa-part', staffId: 'qa-staff', measureId: 'qa-measure-1', voiceId: 'voice-1' }
  const command = buildEnharmonicRespellCommand(score, { type: 'event', eventId: 'qa-leading', address })
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!), notes = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  const output = process.env.DDIRORI_ENHARMONIC_NEIGHBOR_QA_DIR
  if (output) {
    const dir = join(output, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(before)), { flag: 'wx' })
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(before), { flag: 'wx' })
    writeFileSync(join(dir, 'before.musicxml'), serializeMusicXml(before), { flag: 'wx' })
    writeFileSync(join(dir, 'current-command.chromatics'), encodeNativeProject(createNativeProject(result.score)), { flag: 'wx' })
    writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ kind, expectedLeading, expectedPins, selected: 'qa-leading' }, null, 2), { flag: 'wx' })
  }
  expect(notes[0].pitch).toEqual(expectedLeading)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
  for (const [id, alter] of Object.entries(expectedPins)) expect(notes.find(n => n.id === id)!.pitch.alter).toBe(alter)
  expect(notes.map(n => n.id)).toEqual((before.parts[0].staves[0].measures[0].voices[0].events as Note[]).map(n => n.id))
  expect(result.score.parts[0].staves[0].measures[0].voices[1]).toEqual(before.parts[0].staves[0].measures[0].voices[1])
  expect(result.score.parts[0].staves[0].measures[1]).toEqual(before.parts[0].staves[0].measures[1])
  expect(result.score.slurs).toEqual(before.slurs)
  expect(notes[0].lyrics).toEqual((before.parts[0].staves[0].measures[0].voices[0].events[0] as Note).lyrics)
  expect(notes[1].articulations).toEqual((before.parts[0].staves[0].measures[0].voices[0].events[1] as Note).articulations)
  if (kind === 'explicit') expect(notes.slice(1)).toEqual(before.parts[0].staves[0].measures[0].voices[0].events.slice(1))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(before))
  expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)).toEqual(serializeMidi(before))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
  expect(score).toEqual(before)
})

it('keeps later automatic notes automatic once their original sound has been restored', () => {
  const { score } = fixture('sharp'), notes = score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  notes[2].pitch = { step: 'C', octave: 4 }
  notes[3].pitch = { step: 'D', octave: 4 }
  const before = structuredClone(score), result = applyScoreCommand(score, buildEnharmonicRespellCommand(score, { type: 'event', eventId: 'qa-leading' })!)
  const after = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  expect(after[1].pitch.alter).toBe(1)
  expect(after[2]).toEqual(notes[2])
  expect(after[2].pitch.alter).toBeUndefined()
  expect(after[3].pitch.alter).toBe(0)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
})

it('preserves an unrelated legacy primary pitch while retaining its authoritative chord members', () => {
  const { score } = fixture('chord'), notes = score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  notes[1].pitch = { step: 'G', octave: 7, alter: 1 }
  const before = structuredClone(score)
  expect(() => createNativeProject(before)).not.toThrow()
  const result = applyScoreCommand(score, buildEnharmonicRespellCommand(score, { type: 'event', eventId: 'qa-leading' })!)
  const after = result.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
  expect(after[1].pitch).toEqual(notes[1].pitch)
  expect(after[1].pitches).toEqual([{ step: 'C', octave: 4, alter: 1 }, { step: 'E', octave: 4, alter: 1 }])
  expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
  expect(serializeMidi(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)).toEqual(serializeMidi(before))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
})
