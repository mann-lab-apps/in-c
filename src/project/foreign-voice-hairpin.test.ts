import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createForeignVoiceHairpinFixture } from '../testing/foreign-voice-hairpin-fixture'
import { encodeNativeProject, decodeNativeProject } from './schema'
import { serializeMusicXml, parseMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each([false, true])('preserves competing low voice and manual neighbor (cross=%s)', cross => {
  for (const manual of [false, true]) {
    const project = createForeignVoiceHairpinFixture(cross, manual), before = structuredClone(project)
    const native = encodeNativeProject(project), xml = serializeMusicXml(project.score), midi = serializeMidi(project.score)
    expect(decodeNativeProject(native)).toEqual(before)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
    expect(project).toEqual(before)
    const out = process.env.DDIRORI_FOREIGN_HAIRPIN_QA_DIR
    if (out) { const dir = join(out, `${cross ? 'cross' : 'single'}-${manual ? 'manual' : 'auto'}`); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'expected.musicxml'), xml); writeFileSync(join(dir, 'expected.mid'), midi) }
  }
})
