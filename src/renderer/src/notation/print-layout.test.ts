import { describe, expect, it } from 'vitest'

import { TICKS_PER_QUARTER, createDuration, createMeasure, createNote, createScore, createTimePosition, createVoice } from '../../../score-core'
import { resolvePrintLayoutPlan } from './print-layout'

describe('print layout planning', () => {
  it.each(['auto', 2] as const)('includes lower-staff density when choosing a page plan (%s)', target => {
    const score = createScore({ parts: [0, 1].map(part => ({ id: `part-${part}`, name: `Part ${part}`,
      staves: [{ id: `staff-${part}`, measures: Array.from({ length: 12 }, (_, index) => createMeasure({
        id: `measure-${part}-${index}`, number: index + 1,
        voices: [createVoice({ events: Array.from({ length: part ? 16 : 1 }, (_, event) => createNote({
          id: `note-${part}-${index}-${event}`, pitch: { step: 'C', octave: 4 },
          position: createTimePosition(event * TICKS_PER_QUARTER / 4),
          duration: createDuration(part ? '16th' : 'whole')
        })) })]
      })) }]
    })) })
    const before = structuredClone(score)
    const denseFirst = { ...score, parts: [...score.parts].reverse() }
    expect(resolvePrintLayoutPlan(score, target)).toEqual(resolvePrintLayoutPlan(denseFirst, target))
    expect(score).toEqual(before)
  })

  it('keeps automatic PDF layout on the balanced candidate', () => {
    const score = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(8)
            }
          ]
        }
      ]
    })

    expect(resolvePrintLayoutPlan(score, 'auto')).toMatchObject({
      engravingStyle: 'default',
      id: 'balanced',
      overflowedTarget: false,
      pageMarginMm: 8,
      scale: 1
    })
  })

  it('layout.page-setup applies page size, orientation, margins, staff size, and system spacing', () => {
    const score = createScore({
      layout: {
        pageSetup: {
          pageSize: 'letter',
          orientation: 'landscape',
          pageMarginMm: 12,
          staffSizePercent: 90,
          systemSpacingPercent: 120
        }
      },
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(8)
            }
          ]
        }
      ]
    })
    const plan = resolvePrintLayoutPlan(score, 'auto')

    expect(plan).toMatchObject({
      engravingStyle: 'readable',
      id: 'balanced',
      pageCssSize: 'Letter landscape',
      pageMarginMm: 12,
      pageSetup: {
        pageSize: 'letter',
        orientation: 'landscape',
        pageMarginMm: 12,
        staffSizePercent: 90,
        systemSpacingPercent: 120
      },
      scale: 0.9
    })
    expect(plan.renderWidth).toBeGreaterThan(900)
    expect(plan.pageHeight).toBeLessThan(plan.renderWidth)
    expect(plan.systemHeight).toBeGreaterThan(148)
  })

  it('layout.style-preset-contract maps compact part setup to denser spacing knobs', () => {
    const defaultScore = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(16)
            }
          ]
        }
      ]
    })
    const compactPartScore = createScore({
      layout: {
        pageSetup: {
          pageSize: 'a4',
          orientation: 'portrait',
          pageMarginMm: 6,
          staffSizePercent: 90,
          systemSpacingPercent: 90
        }
      },
      parts: defaultScore.parts
    })
    const defaultPlan = resolvePrintLayoutPlan(defaultScore, 'auto')
    const compactPlan = resolvePrintLayoutPlan(compactPartScore, 'auto')

    expect(compactPlan).toMatchObject({
      engravingStyle: 'compact',
      pageMarginMm: 6,
      scale: 0.9
    })
    expect(compactPlan.renderWidth).toBeGreaterThan(defaultPlan.renderWidth)
    expect(compactPlan.systemHeight).toBeLessThan(defaultPlan.systemHeight)
  })

  it('forces a strict target page count by scaling beyond the tightest candidate', () => {
    const score = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(140)
            }
          ]
        }
      ]
    })
    const plan = resolvePrintLayoutPlan(score, 2)

    expect(plan).toMatchObject({
      id: 'forced',
      overflowedTarget: false,
      pageCount: 2,
      targetPages: 2
    })
    expect(plan.scale).toBeLessThan(1)
    expect(plan.renderWidth).toBeGreaterThan(820)
    expect(plan.pageHeight).toBeGreaterThan(1192)
    expect(plan.systemTop).toBeGreaterThanOrEqual(72)
  })

  it('marks targets as overflowed when the readability floor cannot satisfy them', () => {
    const score = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(360)
            }
          ]
        }
      ]
    })
    const plan = resolvePrintLayoutPlan(score, 1)

    expect(plan).toMatchObject({
      id: 'forced',
      overflowedTarget: true,
      targetPages: 1
    })
    expect(plan.pageCount).toBeGreaterThan(1)
    expect(plan.scale).toBe(0.72)
  })

  it('keeps near-page-boundary explicit targets within the requested maximum', () => {
    const score = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(64)
            }
          ]
        }
      ]
    })
    const plan = resolvePrintLayoutPlan(score, 2)

    expect(plan.pageCount).toBeLessThanOrEqual(2)
    expect(plan.targetPages).toBe(2)
    expect(plan.overflowedTarget).toBe(false)
  })
})

function createMeasures(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createMeasure({
      id: `measure-${index + 1}`,
      number: index + 1
    })
  )
}
