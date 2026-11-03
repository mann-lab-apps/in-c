import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, serializeMusicXml } from './index'
import { createMixedStaffPedalFixture as fixture } from '../testing/mixed-staff-pedal-fixture'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject } from '../project/schema'


it.each([true, false].flatMap(retakeLast => [false, true].map(reverseStaves => ({ retakeLast, reverseStaves }))))(
  'retains same-tick cross-staff pedal order and performed ringing %j', ({ retakeLast, reverseStaves }) => {
  const score = fixture(retakeLast, reverseStaves), before = structuredClone(score), native = encodeNativeProject(createNativeProject(score))
  const xml = serializeMusicXml(score), reopened = parseMusicXml(xml)
  const pedals = (value: typeof score) => createPlaybackTimeline(value).pedalEvents?.map(e => [e.startBeat, e.value])
  const commands = (value: typeof score) => createPianoCommands(createPlaybackTimeline(value), 0, 120, {}).map(({ type, pitch, time }) => ({ type, pitch, time }))
  const sourceCommands = commands(score)
  expect(sourceCommands.find(e => e.type === 'off' && e.pitch === 62)?.time).toBe(retakeLast ? 1.5 : 1)
  const out = process.env.DDIRORI_PEDAL_STAFF_ORDER_OUT
  if (out) {
    const dir = join(out, `${retakeLast ? 'retake-last' : 'lift-last'}${reverseStaves ? '-reversed-staves' : ''}`); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ pedals: pedals(score), commands: sourceCommands }, null, 2))
  }
  expect(pedals(reopened)).toEqual(pedals(score))
  expect(commands(reopened)).toEqual(sourceCommands)
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before); expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
