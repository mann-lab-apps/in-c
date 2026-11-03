import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createInteriorHairpinFixture } from '../testing/interior-hairpin-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it('creates isolated automatic/manual middle-annotation hairpins without changing musical data', () => {
  for (const cross of [false, true]) {
    const projects = [false, true].map(manual => createInteriorHairpinFixture(cross, manual))
    expect(serializeMidi(projects[0].score)).toEqual(serializeMidi(projects[1].score))
    for (const [index, project] of projects.entries()) {
      expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
      const xml = serializeMusicXml(project.score)
      expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
      const out = process.env.DDIRORI_INTERIOR_HAIRPIN_QA_DIR
      if (out) {
        const dir = join(out, `${cross ? 'cross' : 'single'}-${index ? 'manual' : 'auto'}`); mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
        writeFileSync(join(dir, 'expected.musicxml'), xml)
        writeFileSync(join(dir, 'expected.mid'), serializeMidi(project.score))
      }
    }
  }
})
