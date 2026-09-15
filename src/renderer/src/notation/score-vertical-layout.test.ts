import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml/parse'
import { resolveScoreVerticalLayout } from './score-vertical-layout'
import { createSystemLayout } from './system-layout'
import { resolvePrintLayoutPlan, estimatePrintedPageCount } from './print-layout'
import { createNewScore } from '../editor/new-score'

describe('stacked staff annotation clearance', () => {
  it('reserves manual hairpin depth and next-system fermata clearance', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/release-qa.musicxml', 'utf8'))
    const staff = score.parts[0]!.staves[0]!
    const events = staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events))
    score.hairpins = [{ id: 'manual-long', type: 'crescendo', startEventId: events[0]!.id, endEventId: events.at(-1)!.id,
      engraving: { offsetY: 2, height: 4 } }]
    const vertical = resolveScoreVerticalLayout(score, 1, 154, 72)
    const laneY = Math.max(...[...vertical.lanesByMeasureId.values()].map(lane => lane.hairpinYOffset ?? 0))
    expect(vertical.systemHeight - 60 - (laneY + 20 + 20)).toBeGreaterThanOrEqual(12)
  })
  it('reserves adjacent upper and lower annotations instead of a fixed staff gap', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml','utf8'))
    score.parts = [score.parts[1]!]
    const geometry = resolveScoreVerticalLayout(score, 1, 154, 72)
    const upper = geometry.lanesByMeasureId.get(score.parts[0]!.staves[0]!.measures[0]!.id)!
    const lower = geometry.lanesByMeasureId.get(score.parts[0]!.staves[1]!.measures[0]!.id)!
    expect(geometry.staffOffsets[1]! - lower.requiredAbove - upper.contentBottom).toBeGreaterThanOrEqual(12)
    expect(geometry.staffOffsets[1]).toBeGreaterThan(96)
    expect(geometry.systemHeight).toBeGreaterThanOrEqual(geometry.staffOffsets[1]! + 154)
  })

  it('includes interior measures of hairpins in lane allocation', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/release-qa.musicxml','utf8'))
    const staff = score.parts[0]!.staves[0]!
    score.hairpins = [{ id:'long', type:'crescendo', startEventId:staff.measures[0]!.voices[0]!.events[0]!.id, endEventId:staff.measures[3]!.voices[0]!.events[0]!.id }]
    const geometry = resolveScoreVerticalLayout(score, 1, 154, 72)
    for (const measure of staff.measures.slice(0,4)) expect(geometry.lanesByMeasureId.get(measure.id)?.hairpinYOffset).toBeDefined()
  })

  it('uses the same score vertical geometry in print estimation and renderer layout', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml','utf8'))
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const geometry = resolveScoreVerticalLayout(score, Math.max(0.82, plan.scale), plan.systemHeight, plan.systemTop)
    const layout = createSystemLayout(score.parts[0]!.staves[0]!.measures, plan.renderWidth, {
      compactSpacing: plan.compactSpacing, layout: score.layout, lyricScale:Math.max(0.82,plan.scale),
      pageHeight:plan.pageHeight, systemHeight:geometry.systemHeight, systemTop:geometry.systemTop
    })
    expect(plan.estimatedPageCount).toBe(estimatePrintedPageCount(layout.height,plan.pageHeight))
  })

  it('accounts for every quartet staff when estimating multiple PDF pages', () => {
    const score = createNewScore({ title:'Ensemble pagination',templateId:'string-quartet',measureCount:32,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4} })
    const plan = resolvePrintLayoutPlan(score,'auto')
    const vertical = resolveScoreVerticalLayout(score,Math.max(0.82,plan.scale),plan.systemHeight,plan.systemTop)
    const layout = createSystemLayout(score.parts[0]!.staves[0]!.measures,plan.renderWidth,{
      compactSpacing:plan.compactSpacing,pageHeight:plan.pageHeight,lyricScale:Math.max(0.82,plan.scale),
      systemHeight:vertical.systemHeight,systemTop:vertical.systemTop
    })
    expect(plan.estimatedPageCount).toBeGreaterThan(1)
    expect(plan.estimatedPageCount).toBe(estimatePrintedPageCount(layout.height,plan.pageHeight))
    expect(vertical.staffOffsets).toHaveLength(4)
  })
})
