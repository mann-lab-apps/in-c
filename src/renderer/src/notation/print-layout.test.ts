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
      pageMarginMm: 8
    })
  })

  it('uses the tightest readable candidate when the target page count is strict', () => {
    const score = createScore({
      parts: [
        {
          id: 'part-1',
          name: 'Part',
          staves: [
            {
              id: 'staff-1',
              measures: createMeasures(80)
            }
          ]
        }
      ]
    })

    expect(resolvePrintLayoutPlan(score, 1)).toMatchObject({
      id: 'tight',
      pageMarginMm: 5,
      renderWidth: 820
    })
  })

  it('treats near-page-boundary layouts conservatively for explicit targets', () => {
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

    expect(resolvePrintLayoutPlan(score, 2).id).not.toBe('balanced')
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
