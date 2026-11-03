import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTieRepresentationFixture, tieRepresentationCases } from '../testing/tie-representation-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { collectTiePairs } from '../score-core'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

describe.each(tieRepresentationCases)('sound/notation tie import %s', kind => {
  it('reports member loss in either channel without changing the existing conversion', () => {
    const { xml, existingModel, warnings: count } = createTieRepresentationFixture(kind)
    const before = xml, { score, report } = parseMusicXmlWithReport(xml)
    const warnings = report.warnings.filter(w => w.message.startsWith('Member-specific chord ties'))
    expect(warnings).toHaveLength(count)
    expect(warnings.map(w => w.measureNumber)).toEqual(kind === 'middle-stop' ? [2] : count ? [1, 2] : [])
    expect(score).toEqual(parseMusicXml(xml))
    expect(serializeMidi(score)).toEqual(serializeMidi(existingModel))
    expect(xml).toBe(before)
    expect(createNativeProject(score).score).toEqual(score)
    const output = serializeMusicXml(score)
    expect(serializeMidi(parseMusicXml(output))).toEqual(serializeMidi(existingModel))
    const out = process.env.DDIRORI_TIE_REPRESENTATION_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      const heads = score.parts[0].staves[0].measures.length * 2
      const pairs = collectTiePairs(score).length
      writeFileSync(join(dir, 'source.musicxml'), xml)
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(existingModel))
      writeFileSync(join(dir, 'expected.musicxml'), output)
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ eventId: score.parts[0].staves[0].measures[0].voices[0].events[0].id, systems: 1, tiePaths: pairs * 2, heads, warnings: count, xmlStart: pairs * 2, xmlStop: pairs * 2 }))
    }
  })
})
