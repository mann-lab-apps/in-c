import { describe, expect, it } from 'vitest'

import { createMeasure } from '../../../score-core'
import { createSystemLayout } from './system-layout'

describe('system layout', () => {
  it('wraps measures instead of shrinking below the minimum width', () => {
    const layout = createSystemLayout(createMeasures(8), 900)

    expect(layout.measuresPerSystem).toBe(4)
    expect(layout.systemCount).toBe(2)
    expect(layout.placements[0]).toMatchObject({
      isSystemStart: true,
      systemIndex: 0,
      x: 16
    })
    expect(layout.placements[4]).toMatchObject({
      isSystemStart: true,
      systemIndex: 1,
      x: 16
    })
    expect(layout.placements[0].width).toBeGreaterThanOrEqual(180)
  })

  it('uses fewer measures per system at the minimum render width', () => {
    const layout = createSystemLayout(createMeasures(6), 560)

    expect(layout.measuresPerSystem).toBe(2)
    expect(layout.systemCount).toBe(3)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 1, 1, 2, 2
    ])
  })

  it('keeps the last system measure width aligned with previous systems', () => {
    const layout = createSystemLayout(createMeasures(5), 900)

    expect(layout.placements[4].width).toBe(layout.placements[0].width)
    expect(layout.placements[4].x).toBe(16)
  })

  it('increases the SVG height as systems are added', () => {
    expect(createSystemLayout(createMeasures(2), 900).height).toBe(190)
    expect(createSystemLayout(createMeasures(8), 900).height).toBeGreaterThan(
      190
    )
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
