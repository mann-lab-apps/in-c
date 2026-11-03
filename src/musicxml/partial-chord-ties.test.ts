import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPartialChordTieFixture, type PartialChordTieCase } from '../testing/partial-chord-tie-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { collectTiePairs } from '../score-core'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

const cases: PartialChordTieCase[] = ['root-only', 'upper-only', 'whole', 'parallel-voice']
describe.each(cases)('member-specific MusicXML tie import %s', kind => {
  it('reports partial-member loss while preserving existing model conversion and supported controls', () => {
    const { xml, existingModel } = createPartialChordTieFixture(kind)
    const before = xml, legacy = parseMusicXml(xml), { score, report } = parseMusicXmlWithReport(xml)
    const partial = kind === 'root-only' || kind === 'upper-only'
    const warnings = report.warnings.filter(w => w.message.startsWith('Member-specific chord ties'))
    expect(warnings).toHaveLength(partial ? 2 : 0)
    if (partial) {
      expect(warnings.map(w => w.measureNumber)).toEqual([1, 2])
      expect(warnings.every(w => w.code === 'unsupported-notation' && /^part\[1\]\.measure\[\d+\]\.note\[2\]\.ties$/.test(w.path))).toBe(true)
    } else expect(report.warnings).toEqual([])
    expect(score).toEqual(legacy)
    expect(serializeMidi(score)).toEqual(serializeMidi(existingModel))
    expect(xml).toBe(before)
    // Report the actual model's output, never claim that it preserves partial ties.
    const output = serializeMusicXml(score), starts = (output.match(/<tie type="start"/g) || []).length
    expect(starts).toBe(kind === 'upper-only' ? 0 : 2)
    const out = process.env.DDIRORI_PARTIAL_TIE_IMPORT_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      const heads = score.parts.flatMap(p => p.staves.flatMap(s => s.measures.flatMap(m => m.voices.flatMap(v => v.events))))
        .reduce((n, e) => n + (e.type === 'note' ? e.pitches?.length || 1 : 0), 0)
      writeFileSync(join(dir, 'source.musicxml'), xml)
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(existingModel))
      writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXml(score))
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ eventId: score.parts[0].staves[0].measures[0].voices[0].events[0].id, systems: 1, tiePaths: collectTiePairs(score).length * 2, heads, warnings: partial ? 2 : 0, xmlStart: starts, xmlStop: starts }))
    }
  })
})
