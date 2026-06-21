import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createTimePosition,
  createVoice
} from '../../../score-core'
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

  it('stretches the last system to the full available width', () => {
    const layout = createSystemLayout(createMeasures(5), 900)
    const lastPlacement = layout.placements[4]

    expect(lastPlacement.x).toBe(16)
    expect(lastPlacement.x + lastPlacement.width).toBeCloseTo(884)
    expect(lastPlacement.width).toBeGreaterThan(layout.placements[0].width)
  })

  it('fills every system independently without table-like column alignment', () => {
    const layout = createSystemLayout(createMeasures(7), 900)

    for (let systemIndex = 0; systemIndex < layout.systemCount; systemIndex += 1) {
      const systemPlacements = layout.placements.filter(
        (placement) => placement.systemIndex === systemIndex
      )
      const lastPlacement = systemPlacements.at(-1)!

      expect(systemPlacements[0].x).toBe(16)
      expect(lastPlacement.x + lastPlacement.width).toBeCloseTo(884)
    }
  })

  it('allocates more width to rhythmically dense measures', () => {
    const sparse = createMeasure({
      id: 'sparse',
      number: 1
    })
    const dense = createMeasure({
      id: 'dense',
      number: 2,
      voices: [
        createVoice({
          events: Array.from({ length: 8 }, (_, index) =>
            createNote({
              id: `note-${index}`,
              position: createTimePosition(
                index * (TICKS_PER_QUARTER / 2)
              ),
              pitch: {
                step: 'C',
                octave: 4
              },
              duration: createDuration('eighth')
            })
          )
        })
      ]
    })
    const layout = createSystemLayout([sparse, dense], 900)

    expect(layout.placements[1].width).toBeGreaterThan(
      layout.placements[0].width
    )
    expect(
      layout.placements[1].x + layout.placements[1].width
    ).toBeCloseTo(884)
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
