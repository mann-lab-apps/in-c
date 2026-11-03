import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStructuralPartLayoutFixture } from '../testing/structural-part-layout-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { applyPortablePartLayout } from './part-layout'
import { resolvePrintLayoutPlan } from '../renderer/src/notation/print-layout'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe('combined independent part structural layout fixture', () => {
  it('retains surviving upper/lower anchors, explicit clearing and all independent page settings', () => {
    const { project, deleted, target, retained } = createStructuralPartLayoutFixture()
    expect(project.score.parts.flatMap(p => p.staves.map(s => s.measures.length))).toEqual([3, 3, 3])
    expect(deleted.score.parts.flatMap(p => p.staves.map(s => s.measures.length))).toEqual([2, 2, 2])
    expect(deleted.score.parts.flatMap(p => p.staves.flatMap(s => s.measures.map(m => m.id)))).not.toContain(target.measureId)
    expect(decodeNativeProject(encodeNativeProject(deleted))).toEqual(deleted)
    expect(deleted.partLayouts.map(p => p.title)).toEqual(['Independent A', 'Independent B'])
    expect(deleted.partLayouts.map(p => p.layout.pageSetup)).toEqual(project.partLayouts.map(p => p.layout.pageSetup))
    expect(deleted.partLayouts[0].layout.pageBreakBeforeMeasureIds).toEqual([])
    expect(deleted.partLayouts[1].layout.pageBreakBeforeMeasureIds).toEqual([retained.lower])
    const views = deleted.score.parts.map(part => applyPortablePartLayout({ ...deleted.score, parts: [part] }, deleted.partLayouts.find(p => p.partId === part.id)))
    expect(views[0].layout?.pageBreakBeforeMeasureIds).toEqual([])
    expect(views[1].layout?.pageBreakBeforeMeasureIds).toEqual([retained.upper])
    expect(views.map(score => resolvePrintLayoutPlan(score, 'auto').pageCount)).toEqual([1, 2])
    const xml = serializeMusicXml(deleted.score)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(deleted.score))
    const out = process.env.DDIRORI_STRUCTURAL_PART_LAYOUT_QA_DIR
    if (out) {
      mkdirSync(out, { recursive: true })
      writeFileSync(join(out, 'source.chromatics'), encodeNativeProject(project))
      writeFileSync(join(out, 'deleted.chromatics'), encodeNativeProject(deleted))
      writeFileSync(join(out, 'deleted.musicxml'), xml)
      writeFileSync(join(out, 'source.musicxml'), serializeMusicXml(project.score))
      writeFileSync(join(out, 'contract.json'), JSON.stringify({ target, retained, pages: { score: 2, 'part-a': 1, 'part-b': 2 } }, null, 2))
    }
  })
})
