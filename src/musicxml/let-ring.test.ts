import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLetRingFixture, letRingCases } from '../testing/let-ring-fixture'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe.each(letRingCases)('unsupported let-ring %s', kind => {
  it('reports visual loss while keeping the legacy conversion and normal tie control', () => {
    const { xml, existingModel, warnings: count } = createLetRingFixture(kind)
    const { score, report } = parseMusicXmlWithReport(xml), before = xml
    const warnings = report.warnings.filter(w => w.message === 'let-ring tie notation is not imported yet.')
    expect(warnings).toHaveLength(count)
    expect(warnings.every(w => w.code === 'unsupported-notation' && /^part\[1\]\.measure\[[12]\]\.note\[[12]\]\.notations\[1\]\.tied\[[12]\]$/.test(w.path))).toBe(true)
    if (!count) expect(report.warnings).toEqual([])
    expect(score).toEqual(parseMusicXml(xml))
    expect(serializeMidi(score)).toEqual(serializeMidi(existingModel))
    const output = serializeMusicXml(score)
    expect(output).not.toContain('let-ring')
    expect(serializeMidi(parseMusicXml(output))).toEqual(serializeMidi(existingModel))
    expect(createNativeProject(score).score).toEqual(score); expect(xml).toBe(before)
    const out = process.env.DDIRORI_LET_RING_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.musicxml'), xml)
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(existingModel))
      writeFileSync(join(dir, 'expected.musicxml'), output)
      writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2))
    }
  })
})
