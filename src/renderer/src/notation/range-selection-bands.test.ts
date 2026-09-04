import { describe, expect, it } from 'vitest'

import { resolveRangeSelectionBands } from './range-selection-bands'

describe('range selection bands', () => {
  it('layout.range-selection-bands wraps selected events on the same staff system', () => {
    const [band] = resolveRangeSelectionBands([
      {
        eventId: 'm1-c4',
        noteHeadBeginX: 100,
        noteHeadBottomY: 130,
        noteHeadEndX: 112,
        noteHeadTopY: 112,
        staffIndex: 0,
        systemIndex: 0,
        x: 106,
        y: 80
      },
      {
        eventId: 'm1-e4',
        noteHeadBeginX: 150,
        noteHeadBottomY: 122,
        noteHeadEndX: 162,
        noteHeadTopY: 104,
        staffIndex: 0,
        systemIndex: 0,
        x: 156,
        y: 80
      }
    ])

    expect(band).toEqual({
      height: 64,
      staffIndex: 0,
      systemIndex: 0,
      width: 90,
      x: 86,
      y: 90
    })
  })

  it('layout.range-selection-bands separates selected spans by system and staff', () => {
    const bands = resolveRangeSelectionBands([
      {
        eventId: 'upper-1',
        staffIndex: 0,
        systemIndex: 0,
        x: 100,
        y: 80
      },
      {
        eventId: 'upper-2',
        staffIndex: 0,
        systemIndex: 0,
        x: 140,
        y: 80
      },
      {
        eventId: 'lower-1',
        staffIndex: 1,
        systemIndex: 0,
        x: 100,
        y: 176
      },
      {
        eventId: 'next-system-1',
        staffIndex: 0,
        systemIndex: 1,
        x: 100,
        y: 280
      }
    ])

    expect(
      bands.map((band) => [band.systemIndex, band.staffIndex])
    ).toEqual([
      [0, 0],
      [0, 1],
      [1, 0]
    ])
  })
})
