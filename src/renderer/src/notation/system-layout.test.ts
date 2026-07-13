import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createTimePosition,
  createVoice
} from '../../../score-core'
import { createSystemLayout, pitchStaffLine } from './system-layout'

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

  it('starts a new system before measures with manual system breaks', () => {
    const layout = createSystemLayout(createMeasures(6), 900, {
      layout: {
        systemBreakBeforeMeasureIds: ['measure-3', 'measure-6']
      }
    })

    expect(layout.systemCount).toBe(3)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 1, 1, 1, 2
    ])
    expect(layout.placements[2]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-3' }),
      x: 16
    })
    expect(layout.placements[5]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-6' }),
      x: 16
    })
  })

  it('ignores manual system breaks before the first measure', () => {
    const layout = createSystemLayout(createMeasures(4), 900, {
      layout: {
        systemBreakBeforeMeasureIds: ['measure-1']
      }
    })

    expect(layout.systemCount).toBe(1)
    expect(layout.placements[0]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-1' })
    })
  })

  it('starts a new system before measures with manual page breaks', () => {
    const layout = createSystemLayout(createMeasures(6), 900, {
      layout: {
        pageBreakBeforeMeasureIds: ['measure-4']
      }
    })

    expect(layout.systemCount).toBe(2)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 0, 1, 1, 1
    ])
    expect(layout.placements[3]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-4' }),
      x: 16
    })
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
    expect(createSystemLayout(createMeasures(2), 900).height).toBe(202)
    expect(createSystemLayout(createMeasures(8), 900).height).toBeGreaterThan(
      202
    )
  })

  it('adds vertical space for notes far above and below the staff', () => {
    const measures = createMeasures(8)
    measures[0].voices[0].events = [
      createNote({
        id: 'high-note',
        position: createTimePosition(0),
        pitch: { step: 'G', octave: 7 }
      })
    ]
    measures[4].voices[0].events = [
      createNote({
        id: 'low-note',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 1 }
      })
    ]

    const normalLayout = createSystemLayout(createMeasures(8), 900)
    const expandedLayout = createSystemLayout(measures, 900)

    expect(expandedLayout.placements[0].y).toBeGreaterThan(
      normalLayout.placements[0].y
    )
    expect(expandedLayout.placements[4].y).toBeGreaterThan(
      normalLayout.placements[4].y
    )
    expect(expandedLayout.height).toBeGreaterThan(normalLayout.height)
  })

  it('keeps baseline spacing until the reserved margin is reached, then grows linearly', () => {
    const baseline = createSystemLayout(
      [measureWithPitch('B', 4)],
      900
    )
    const nearTop = createSystemLayout(
      [measureWithPitch('C', 5)],
      900
    )
    const octaveHigher = createSystemLayout(
      [measureWithPitch('C', 6)],
      900
    )

    expect(baseline.placements[0].y).toBe(48)
    expect(nearTop.placements[0].y).toBeGreaterThan(
      baseline.placements[0].y
    )
    expect(
      octaveHigher.placements[0].y - nearTop.placements[0].y
    ).toBeCloseTo(35)
  })

  it('uses only the highest and lowest notes in each system for vertical margins', () => {
    const highOnly = createSystemLayout(
      [measureWithPitches([
        ['C', 4],
        ['G', 7]
      ])],
      900
    )
    const highWithIntermediateNotes = createSystemLayout(
      [measureWithPitches([
        ['C', 4],
        ['C', 5],
        ['C', 6],
        ['G', 7]
      ])],
      900
    )
    const bothExtremes = createSystemLayout(
      [measureWithPitches([
        ['C', 1],
        ['C', 4],
        ['G', 7]
      ])],
      900
    )

    expect(highWithIntermediateNotes.placements[0].y).toBe(
      highOnly.placements[0].y
    )
    expect(highWithIntermediateNotes.height).toBe(highOnly.height)
    expect(bothExtremes.placements[0].y).toBe(highOnly.placements[0].y)
    expect(bothExtremes.height).toBeGreaterThan(highOnly.height)
  })

  it('maps pitches to VexFlow-compatible staff lines for supported clefs', () => {
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'G', line: 2 }
      )
    ).toBe(0)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'F', line: 4 }
      )
    ).toBe(6)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'C', line: 4 }
      )
    ).toBe(4)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'C', line: 1 }
      )
    ).toBe(1)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'F', line: 3 }
      )
    ).toBe(5)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'G', line: 1 }
      )
    ).toBe(-1)
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

function measureWithPitch(
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
  octave: number
) {
  return createMeasure({
    voices: [
      createVoice({
        events: [
          createNote({
            id: `${step}-${octave}`,
            position: createTimePosition(0),
            pitch: { step, octave }
          })
        ]
      })
    ]
  })
}

function measureWithPitches(
  pitches: Array<[
    'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
    number
  ]>
) {
  return createMeasure({
    voices: [
      createVoice({
        events: pitches.map(([step, octave], index) =>
          createNote({
            id: `${step}-${octave}-${index}`,
            position: createTimePosition(index * TICKS_PER_QUARTER),
            pitch: { step, octave }
          })
        )
      })
    ]
  })
}
