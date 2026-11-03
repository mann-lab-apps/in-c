import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createStemExpressionHairpinFixture } from '../testing/stem-expression-hairpin-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it('isolates actual low-note/stem and expression ink without lyric or dynamic competition', () => {
  for (const cross of [false, true]) {
    const projects = [false, true].map(manual => createStemExpressionHairpinFixture(cross, manual))
    expect(serializeMidi(projects[0].score)).toEqual(serializeMidi(projects[1].score))
    for (const [index, project] of projects.entries()) {
      expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
      const xml = serializeMusicXml(project.score)
      expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
      const out = process.env.DDIRORI_STEM_HAIRPIN_QA_DIR
      if (out) {
        const dir = join(out, `${cross ? 'cross' : 'single'}-${index ? 'manual' : 'auto'}`); mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
        writeFileSync(join(dir, 'expected.musicxml'), xml)
        writeFileSync(join(dir, 'expected.mid'), serializeMidi(project.score))
      }
    }
  }
})
