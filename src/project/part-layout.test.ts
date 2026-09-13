import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from '../musicxml/parse'
import { applyPortablePartLayout, remapRemovedStaffLayoutAnchors } from './part-layout'
import { resolvePrintLayoutPlan } from '../renderer/src/notation/print-layout'

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
