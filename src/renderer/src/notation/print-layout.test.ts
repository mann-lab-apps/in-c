import { describe, expect, it } from 'vitest'

import { createMeasure, createScore } from '../../../score-core'
import { resolvePrintLayoutPlan } from './print-layout'

describe('print layout planning', () => {
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
      id: 'balanced',
      overflowedTarget: false,
      pageMarginMm: 8,
      scale: 1
    })
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
