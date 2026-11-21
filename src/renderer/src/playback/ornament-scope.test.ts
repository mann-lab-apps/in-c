import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, it } from 'vitest'
import type { Ornament } from '../../../score-core'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createMidiExpressionFixture } from '../../../testing/midi-expression-fixture'
import { serializeMidi, serializeMidiWithReport } from '../midi/serialize-midi'
import { createPlaybackTimeline } from './timeline'
import { createPianoCommands } from './piano-transport'

const kinds: Ornament[] = ['trill', 'mordent', 'inverted-mordent', 'turn']
const fixture = (kind: Ornament) => {
  const score = createMidiExpressionFixture('plain')
  score.title = '장식음 지원 범위 검증'
  const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Owned principal note')
  note.ornaments = [kind]
  return score
}
beforeAll(() => {
  const root = process.env.STUDIO_ORNAMENT_SCOPE_QA_DIR
  if (!root) return
  for (const kind of kinds) {
    const score = fixture(kind), dir = join(root, kind)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)), { flag: 'wx' })
    writeFileSync(join(dir, 'source.musicxml'), serializeMusicXml(score), { flag: 'wx' })
    writeFileSync(join(dir, 'source.mid'), serializeMidi(score), { flag: 'wx' })
  }
})
it.each(kinds)('distinguishes %s notation retention from current internal and MIDI performance', kind => {
  const score = fixture(kind), before = structuredClone(score), native = encodeNativeProject(createNativeProject(score))
  const plain = structuredClone(score), plainNote = plain.parts[0].staves[0].measures[0].voices[0].events[0]
  if (plainNote.type !== 'note') throw Error('Owned note')
  delete plainNote.ornaments
  const timeline = createPlaybackTimeline(score), event = timeline.events.find(e => e.eventId === 'leading')!
  const on = createPianoCommands({ ...timeline, events: [event] }, 0, 120, {}).filter(c => c.type === 'on')
  expect(on.map(c => c.pitch)).toEqual(kind === 'trill' ? [66, 67, 66, 67, 66, 67, 66, 67] : [66])
  expect(on.map(c => c.time)).toEqual(kind === 'trill' ? [0, .0625, .125, .1875, .25, .3125, .375, .4375] : [0])
  const report = serializeMidiWithReport(score)
  expect(report.bytes).toEqual(serializeMidi(plain))
  expect(report.warnings.map(w => w.code)).toEqual(kind === 'trill' ? ['unsupported-midi-expression'] : [])
  const xml = serializeMusicXml(score), reopened = parseMusicXml(xml), note = reopened.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(note.type === 'note' && note.ornaments).toEqual([kind])
  expect(serializeMidi(reopened)).toEqual(report.bytes)
  expect(score).toEqual(before); expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
