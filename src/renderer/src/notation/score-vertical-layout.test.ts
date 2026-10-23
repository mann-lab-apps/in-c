import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../../../musicxml/parse'
import { resolveScoreVerticalLayout } from './score-vertical-layout'
import { createSystemLayout } from './system-layout'
import { resolvePrintLayoutPlan, estimatePrintedPageCount } from './print-layout'
import { createNewScore } from '../editor/new-score'
import { createDuration, createNote, createTimePosition } from '../../../score-core'

describe('stacked staff annotation clearance', () => {
  it('preserves the base header margin without counting rehearsal lane space twice', () => {
    const score = createNewScore({ title: 'Rehearsal header', templateId: 'piano-grand-staff', measureCount: 1,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    const measures = score.parts[0]!.staves[0]!.measures
    score.rehearsalMarks = [{ id: 'framed-header', measureId: measures[0]!.id, text: 'A' }]
    const original = structuredClone(score)
    const metrics = resolveScoreVerticalLayout(score, 1, 154, 72)
    expect(metrics.topInkPadding).toBe(72)
    const layout = createSystemLayout(measures, 960, {
      ...metrics, systemInkBounds: new Map([[0, { top: -62.75, bottom: 80 }]])
    })
    expect(layout.placements[0]!.y).toBe(Math.max(metrics.systemTop, 62.75 + 72))
    expect(layout.placements[0]!.y - 62.75).toBeGreaterThanOrEqual(72)
    expect(score).toEqual(original)
  })

  it('includes measured lower rows in staff and system spacing without changing the score', () => {
    const score = createNewScore({ title: 'Lower rows', templateId: 'piano-grand-staff', measureCount: 1,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    const measures = score.parts[0]!.staves.map(staff => staff.measures[0]!)
    score.expressionTexts = measures.map(measure => ({ id: `text-${measure.id}`, measureId: measure.id, tick: 0, text: 'dolce' }))
    const before = structuredClone(score)
    const base = resolveScoreVerticalLayout(score, 1, 154, 72)
    const shifted = resolveScoreVerticalLayout(score, 1, 154, 72, new Map(), new Map(measures.map(measure => [measure.id, 40])))
    expect(shifted.staffOffsets[1]).toBe(base.staffOffsets[1]! + 40)
    expect(shifted.systemHeight).toBe(base.systemHeight + 80)
    expect(shifted.systemTop).toBe(base.systemTop)
    expect(score).toEqual(before)
  })

  it('accumulates measured inner ink gaps across all staves without changing outer system estimates', () => {
    const score = createNewScore({ title: 'Measured staff ink', templateId: 'string-quartet', measureCount: 1,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    const snapshot = JSON.stringify(score)
    const ink = new Map([[0, { top: -500, bottom: 200 }], [1, { top: -90, bottom: 150 }],
      [2, { top: -70, bottom: 180 }], [3, { top: -60, bottom: 500 }]])
    const base = resolveScoreVerticalLayout(score, 1, 154, 72)
    const measured = resolveScoreVerticalLayout(score, 1, 154, 72, ink)
    for (let index = 1; index < 4; index++) {
      expect(measured.staffOffsets[index]! + ink.get(index)!.top - measured.staffOffsets[index - 1]! - ink.get(index - 1)!.bottom)
        .toBeGreaterThanOrEqual(12)
    }
    expect(measured.systemTop).toBe(base.systemTop)
    expect(measured.systemHeight - measured.staffOffsets[3]!).toBe(base.systemHeight - base.staffOffsets[3]!)
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([false, true])('reserves ornament ink above a lower staff with fermata=%s', (fermata) => {
    const score = createNewScore({ title: 'Ornament spacing', templateId: 'piano-grand-staff', measureCount: 1,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    score.parts[0].staves[1].measures[0].voices[0].events = [createNote({
      id: 'lower-ornament', position: createTimePosition(0), duration: createDuration('whole'),
      pitch: { step: 'C', octave: 3 }, ornaments: ['trill', 'mordent', 'turn'], fermata
    })]
    const layout = resolveScoreVerticalLayout(score, 1, 154, 72)
    const ornamentEnvelope = fermata ? 80 : 56
    expect(layout.staffOffsets[1] - ornamentEnvelope - 80).toBeGreaterThanOrEqual(12)
  })

  it('reserves global generic annotations on the visible primary staff of rich scores and parts', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    score.rehearsalMarks = [{ id: 'global-rehearsal', measureId: 'measure-1', text: 'Global' }]
    score.systemTexts = [{ id: 'global-system', measureId: 'measure-1', text: 'Tutti' }]
    score.tempoEvents = [{ id: 'global-tempo', measureId: 'measure-1', tick: 0, bpm: 112 }]
    const before = structuredClone(score)
    for (const visible of [score, { ...score, parts: [score.parts[1]] }]) {
      const geometry = resolveScoreVerticalLayout(visible, 1, 154, 72)
      const top = geometry.lanesByMeasureId.get(visible.parts[0].staves[0].measures[0].id)!
      expect(top.rehearsalMarkYOffsets).toHaveLength(1)
      expect(top.systemTextYOffsets).toHaveLength(1)
      expect(top.tempoYOffsets).toHaveLength(1)
      const lower = geometry.lanesByMeasureId.get(score.parts[1].staves[1].measures[0].id)!
      expect(lower.rehearsalMarkYOffsets).toHaveLength(0)
    }
    expect(score).toEqual(before)
  })

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
