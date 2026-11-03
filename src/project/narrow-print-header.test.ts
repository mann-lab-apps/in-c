import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createPrintHeaderFixture } from '../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it('preserves supported high-margin paper headers at small and normal staff sizes', () => {
  for (const staffSizePercent of [75, 100]) {
    const project = createPrintHeaderFixture('wrapped')
    project.score.layout = { pageSetup: { pageSize: 'a4', orientation: 'portrait', pageMarginMm: 30, staffSizePercent, systemSpacingPercent: 100 } }
    const xml = serializeMusicXml(project.score)
    expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
    const out = process.env.DDIRORI_NARROW_HEADER_QA_DIR
    if (out) {
      const dir = join(out, staffSizePercent === 75 ? 'small-staff' : 'normal-staff')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project))
      writeFileSync(join(dir, 'expected.musicxml'), xml)
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(project.score))
    }
  }
})
