import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../musicxml/parse'
import { applyPortablePartLayout, remapRemovedStaffLayoutAnchors } from './part-layout'
import { resolvePrintLayoutPlan } from '../renderer/src/notation/print-layout'
import { createNativeProject, decodeNativeProject, encodeNativeProject, validateNativeProject } from './schema'

const source = () => createNativeProject(parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')))

describe('portable part layout rendering', () => {
  it('rebinds removed staff breaks to the same surviving measure without moving deleted-measure breaks', () => {
    const full = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    const piano = full.parts[1]!
    const upper = piano.staves[0]!
    const lower = piano.staves[1]!
    const layout = { pageBreakBeforeMeasureIds: [lower.measures[1]!.id], systemBreakBeforeMeasureIds: [lower.measures[0]!.id] }
    const surviving = { ...piano, staves: [upper] }
    expect(remapRemovedStaffLayoutAnchors(layout, [piano], [surviving])).toEqual({
      pageBreakBeforeMeasureIds: [upper.measures[1]!.id], systemBreakBeforeMeasureIds: [upper.measures[0]!.id]
    })
    const shortened = { ...piano, staves: piano.staves.map(staff => ({ ...staff, measures: staff.measures.slice(1) })) }
    expect(remapRemovedStaffLayoutAnchors(layout, [piano], [shortened])).toEqual({ pageBreakBeforeMeasureIds: [lower.measures[1]!.id], systemBreakBeforeMeasureIds: [] })
    expect(layout.pageBreakBeforeMeasureIds).toEqual([lower.measures[1]!.id])
  })

  it('maps lower-staff breaks onto part systems and applies page setup without changing the full score', () => {
    const full = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    const before = JSON.stringify(full)
    const part = full.parts[1]!
    const projected = { ...full, parts: [part] }
    const override = { partId: part.id, title: 'Piano part', layout: {
      pageBreakBeforeMeasureIds: [part.staves[1]!.measures[1]!.id],
      pageSetup: { pageSize: 'letter' as const, orientation: 'landscape' as const }
    } }
    const display = applyPortablePartLayout(projected, override)
    expect(display.layout?.pageBreakBeforeMeasureIds).toEqual([part.staves[0]!.measures[1]!.id])
    expect(resolvePrintLayoutPlan(display, 'auto').pageCount).toBe(2)
    expect(resolvePrintLayoutPlan(display, 1)).toMatchObject({ pageCount: 2, overflowedTarget: true })
    const cleared = applyPortablePartLayout(display, { ...override, layout: { pageBreakBeforeMeasureIds: [] } })
    expect(resolvePrintLayoutPlan(cleared, 'auto').pageCount).toBe(1)
    expect(JSON.stringify(full)).toBe(before)
    expect(applyPortablePartLayout(full, override)).toBe(full)
    expect(applyPortablePartLayout(projected, { ...override, partId: 'other' })).toBe(projected)
  })
})

describe('independent part span geometry', () => {
  it('projects per-part geometry without changing the full score, including explicit automatic reset', () => {
    const project = source()
    const slur = project.score.slurs![0]!
    slur.engraving = { offsetY: -2, height: 3 }
    const part = project.score.parts[1]!
    const override = { partId: part.id, layout: {}, spanEngravings: [
      { kind: 'slur' as const, spanId: slur.id, engraving: { offsetY: 2, height: 4 } }
    ] }
    const projected = { ...project.score, parts: [part] }
    expect(applyPortablePartLayout(projected, override).slurs![0]!.engraving).toEqual({ offsetY: 2, height: 4 })
    expect(slur.engraving).toEqual({ offsetY: -2, height: 3 })
    expect(applyPortablePartLayout(projected, { ...override, spanEngravings: [{ ...override.spanEngravings[0]!, engraving: null }] }).slurs![0]!.engraving).toBeUndefined()
    expect(applyPortablePartLayout(projected, { partId: part.id, layout: {} }).slurs![0]!.engraving).toEqual(slur.engraving)
    expect(applyPortablePartLayout(project.score, override)).toBe(project.score)
  })

  it('preserves validated part geometry and rejects foreign, missing, duplicate and legacy overrides', () => {
    const project = source()
    project.partLayouts = [{ partId: 'P2', layout: {}, spanEngravings: [
      { kind: 'slur', spanId: project.score.slurs![0]!.id, engraving: null },
      { kind: 'hairpin', spanId: project.score.hairpins![0]!.id, engraving: { height: 4 } }
    ] }]
    expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
    expect(() => validateNativeProject({ ...project, version: 2 })).toThrow(/version 2/)
    expect(() => validateNativeProject({ ...project, partLayouts: [{ ...project.partLayouts[0], partId: 'P1' }] })).toThrow(/span/)
    project.partLayouts[0]!.spanEngravings!.push(project.partLayouts[0]!.spanEngravings![0]!)
    expect(() => validateNativeProject(project)).toThrow(/Duplicate/)
    project.partLayouts[0]!.spanEngravings = [{ kind: 'slur', spanId: 'missing', engraving: {} }]
    expect(() => validateNativeProject(project)).toThrow(/span/)
  })
})
