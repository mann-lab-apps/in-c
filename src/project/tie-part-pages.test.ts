import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createReorderedWholeChordTieScore } from '../testing/chord-tie-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from './schema'
import { applyPortablePartLayout } from './part-layout'
import { collectTiePairs } from '../score-core'
import { resolvePrintLayoutPlan } from '../renderer/src/notation/print-layout'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml } from '../musicxml'

describe.each(['score', 'part-a', 'part-b'] as const)('reordered ties in independent page view %s', view => {
  it('keeps authored part layouts and performed pitches through native/XML projection', () => {
    const score = createReorderedWholeChordTieScore(true, true)
    score.title = 'Reordered ties across independent pages'
    const peer = structuredClone(score.parts[0]); peer.id += '-peer'; peer.staves[0].id += '-peer'
    for (const m of peer.staves[0].measures) { m.id += '-peer'; for (const n of m.voices[0].events) n.id += '-peer' }
    score.parts.push(peer)
    score.layout = { systemBreakBeforeMeasureIds: [score.parts[0].staves[0].measures[1].id], pageBreakBeforeMeasureIds: [score.parts[0].staves[0].measures[1].id] }
    const project = createNativeProject(score)
    project.partLayouts = [
      { partId: score.parts[0].id, layout: { systemBreakBeforeMeasureIds: [], pageBreakBeforeMeasureIds: [] } },
      { partId: peer.id, layout: { systemBreakBeforeMeasureIds: [peer.staves[0].measures[1].id], pageBreakBeforeMeasureIds: [peer.staves[0].measures[1].id] } }
    ]
    const before = encodeNativeProject(project), part = view === 'part-b' ? peer : score.parts[0]
    const display = view === 'score' ? score : applyPortablePartLayout({ ...score, parts: [part] }, project.partLayouts.find(p => p.partId === part.id))
    const pages = view === 'part-a' ? 1 : 2, systems = pages
    expect(resolvePrintLayoutPlan(display, 'auto').pageCount).toBe(pages)
    expect(collectTiePairs(display)).toHaveLength(view === 'score' ? 2 : 1)
    expect(decodeNativeProject(before).partLayouts).toEqual(project.partLayouts)
    const xml = serializeMusicXml(display)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(display))
    expect(encodeNativeProject(project)).toBe(before)
    const dir = process.env.DDIRORI_TIE_PART_PAGE_QA_DIR
    if (dir) {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'source.chromatics'), before)
      writeFileSync(join(dir, view + '.musicxml'), xml)
      writeFileSync(join(dir, view + '.mid'), serializeMidi(display))
      writeFileSync(join(dir, view + '.json'), JSON.stringify({ view, partId: view === 'score' ? undefined : part.id, pages, systems, heads: view === 'score' ? 12 : 6, tiePaths: (view === 'score' ? 6 : 3) * systems, score: display }))
    }
  })
})
