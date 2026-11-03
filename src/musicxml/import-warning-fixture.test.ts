import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { importWarningCases, createImportWarningFixture } from '../testing/import-warning-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe.each(importWarningCases)('valid import warning workflow %s', kind => {
  it('retains every diagnostic and the existing converted native/MIDI model', () => {
    const { xml, existingModel, warningCount } = createImportWarningFixture(kind)
    const before = xml, { score, report } = parseMusicXmlWithReport(xml)
    expect(report.warnings).toHaveLength(warningCount)
    expect(report.warnings.every(w => w.code === 'unsupported-notation' && w.path && w.measureNumber)).toBe(true)
    expect(serializeMidi(score)).toEqual(serializeMidi(existingModel))
    expect(createNativeProject(score).score).toEqual(score)
    expect(xml).toBe(before)
    const out = process.env.DDIRORI_IMPORT_WARNING_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.musicxml'), xml)
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(existingModel))
      writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXml(score))
      writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2))
    }
  })
})
