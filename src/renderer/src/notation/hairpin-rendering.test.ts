import { describe, expect, it } from 'vitest'

import {
  resolveHairpinOpenings,
  resolveHairpinSegments
} from './hairpin-rendering'

describe('hairpin rendering', () => {
  it('layout.hairpin-system-segments creates a continuous segment for every crossed system', () => {
    const segments = resolveHairpinSegments(
      { x: 80, y: 40 },
      { x: 180, y: 240 },
      0,
      2,
      new Map([
        [0, { x1: 16, x2: 500, y: 40 }],
        [1, { x1: 16, x2: 500, y: 140 }],
        [2, { x1: 16, x2: 500, y: 240 }]
      ])
    )

    expect(segments).toEqual([
      { x1: 90, x2: 482, staffY: 40, isFirst: true, isLast: false },
      { x1: 38, x2: 482, staffY: 140, isFirst: false, isLast: false },
      { x1: 38, x2: 202, staffY: 240, isFirst: false, isLast: true }
    ])
  })

  it('layout.hairpin-system-segments keeps crescendo and diminuendo directions distinct', () => {
    expect(resolveHairpinOpenings('crescendo', true, true)).toEqual({
      left: 0,
      right: 10
    })
    expect(resolveHairpinOpenings('diminuendo', true, true)).toEqual({
      left: 10,
      right: 0
    })
  })
})
