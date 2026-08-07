import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createNote,
  createTimePosition
} from '../../../score-core'
import { resolveMixedTupletOnsetShifts } from './tuplet-spacing'

const quarter = TICKS_PER_QUARTER

describe('mixed tuplet spacing', () => {
  it('moves an eighth-plus-quarter triplet quarter note to the second slot', () => {
    const events = [
      note('triplet-eighth', 0, 'eighth'),
      note('triplet-quarter', quarter / 3, 'quarter'),
      note('next-note', quarter, 'quarter')
    ]
    const shifts = resolveMixedTupletOnsetShifts(
      events,
      [
        {
          id: 'tuplet-1',
          eventIds: ['triplet-eighth', 'triplet-quarter'],
          actualNotes: 3,
          normalNotes: 2
        }
      ],
      new Map([
        ['triplet-eighth', 100],
        ['triplet-quarter', 240],
        ['next-note', 400]
      ])
    )

    expect(shifts.get('triplet-quarter')).toBeCloseTo(-40)
    expect(shifts.has('triplet-eighth')).toBe(false)
  })

  it('leaves regular equal-duration triplets alone', () => {
    const events = [
      note('triplet-1', 0, 'eighth'),
      note('triplet-2', quarter / 3, 'eighth'),
      note('triplet-3', (quarter * 2) / 3, 'eighth'),
      note('next-note', quarter, 'quarter')
    ]
    const shifts = resolveMixedTupletOnsetShifts(
      events,
      [
        {
          id: 'tuplet-1',
          eventIds: ['triplet-1', 'triplet-2', 'triplet-3'],
          actualNotes: 3,
          normalNotes: 2
        }
      ],
      new Map([
        ['triplet-1', 100],
        ['triplet-2', 200],
        ['triplet-3', 300],
        ['next-note', 400]
      ])
    )

    expect(shifts.size).toBe(0)
  })
})

function note(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0]
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: { step: 'C', octave: 4 },
    duration: {
      ...createDuration(value),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
  })
}
