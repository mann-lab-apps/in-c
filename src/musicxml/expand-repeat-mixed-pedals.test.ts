import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, serializeMusicXml } from './index'
import { createMixedStaffPedalFixture } from '../testing/mixed-staff-pedal-fixture'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject } from '../project/schema'

it.each([true, false].flatMap(retakeLast => [false, true].flatMap(reverseStaves =>
  [false, true].map(firstLower => ({ retakeLast, reverseStaves, firstLower })))))('copies instrument CC64 while retaining each authored staff %j', ({ retakeLast, reverseStaves, firstLower }) => {
  const score = createMixedStaffPedalFixture(retakeLast, reverseStaves)
  if (firstLower) {
    const lower = score.parts[0].staves.find(staff => staff.id.endsWith('-lower'))!
    Object.assign(score.pedalEvents![0], { staffId: lower.id, measureId: lower.measures[0].id })
  }
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), ordinary = serializeMusicXml(score)
  const values = retakeLast ? [32, 127] : [127, 32]
  const literal = [[0,127],[1,values[0]],[1,values[1]],[2,0],[2,127],[3,values[0]],[3,values[1]],[4,0],[4,127],[5,values[0]],[5,values[1]],[6,0]]
  const fields = (value: typeof score) => createPlaybackTimeline(value).pedalEvents?.map(event => [event.startBeat, event.value])
  const commands = (value: typeof score) => createPianoCommands(createPlaybackTimeline(value), 0, 120, {}).map(({ type, pitch, time }) => ({ type, pitch, time }))
  const out = process.env.DDIRORI_MIXED_PEDAL_COPY_OUT
  const dir = out ? join(out, `${retakeLast ? 'retake' : 'lift'}-${reverseStaves ? 'reverse' : 'normal'}-${firstLower ? 'lower' : 'upper'}-first`) : undefined
  if (dir) {
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), native)
    writeFileSync(join(dir, 'source.musicxml'), ordinary); writeFileSync(join(dir, 'expected.mid'), serializeMidi(score))
  }
  const result = expandScoreRepeatsForMusicXml(score), xml = serializeMusicXml(result), reopened = parseMusicXml(xml)
  expect(fields(score)).toEqual(literal); expect(fields(result)).toEqual(literal); expect(fields(reopened)).toEqual(literal)
  expect(commands(result)).toEqual(commands(score)); expect(commands(reopened)).toEqual(commands(score))
  expect(commands(result).find(event => event.type === 'off' && event.pitch === 62)?.time).toBe(retakeLast ? 1.5 : 1)
  expect(serializeMidi(result)).toEqual(serializeMidi(score)); expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  const resets = result.pedalEvents!.filter(event => event.id.includes('-pedal-reset-'))
  expect(resets).toHaveLength(2)
  const firstStaff = score.pedalEvents![0].staffId, copiedStaff = result.parts[0].staves.find(staff => staff.id === firstStaff)!
  expect(resets.map(event => [event.staffId, event.measureId, event.tick, event.value])).toEqual([1, 2].map(index => [firstStaff, copiedStaff.measures[index].id, 0, 0]))
  for (const source of score.pedalEvents!) {
    const copies = result.pedalEvents!.filter(event => event.id.endsWith(`-pedal-${source.id}`))
    expect(copies).toHaveLength(source.id === 'tail-up' ? 1 : 3)
    expect(copies.every(event => event.staffId === source.staffId && event.tick === source.tick && event.value === source.value)).toBe(true)
  }
  expect(new Set(result.pedalEvents!.map(event => event.id)).size).toBe(12)
  expect(() => createNativeProject(result)).not.toThrow()
  expect(score).toEqual(before); expect(encodeNativeProject(createNativeProject(score))).toBe(native); expect(serializeMusicXml(score)).toBe(ordinary)
  if (dir) {
    writeFileSync(join(dir, 'expanded.musicxml'), xml)
    writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ literal, firstStaff, sourcePedals: score.pedalEvents, firstDReleaseSeconds: retakeLast ? 1.5 : 1 }, null, 2))
  }
})
