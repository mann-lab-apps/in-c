import { describe, expect, it } from 'vitest'

import {
  resolveHairpinOpenings,
  resolveHairpinStemClearance,
  resolveHairpinSegments
} from './hairpin-rendering'

describe('hairpin rendering', () => {
  it('keeps the entire wedge below lower-voice stems without lowering a clear annotation lane', () => {
    expect(resolveHairpinStemClearance(126, [125, 120])).toBe(143)
    expect(resolveHairpinStemClearance(180, [125, 120])).toBe(180)
    expect(resolveHairpinStemClearance(126, [])).toBe(126)
  })
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
      { systemIndex: 0, x1: 90, x2: 482, staffY: 40, isFirst: true, isLast: false },
      { systemIndex: 1, x1: 38, x2: 482, staffY: 140, isFirst: false, isLast: false },
      { systemIndex: 2, x1: 38, x2: 202, staffY: 240, isFirst: false, isLast: true }
    ])
  })

  it('uses the supplied measure-end position without extending it beyond the closing barline', () => {
    const bounds = new Map([[0, { x1: 16, x2: 500, y: 40 }]])
    expect(resolveHairpinSegments({ x: 80, y: 40 }, { x: 492, y: 40, exactEnd: true }, 0, 0, bounds))
      .toEqual([{ systemIndex: 0, x1: 90, x2: 492, staffY: 40, isFirst: true, isLast: true }])
  })

  it('reduces the start inset to draw a short wedge at its exact measure-end closing position', () => {
    const bounds = new Map([[0, { x1: 8, x2: 577, y: 40 }]])
    const close = { x: 569, y: 40, exactEnd: true }
    expect(resolveHairpinSegments({ x: 553.2, y: 40 }, close, 0, 0, bounds))
      .toEqual([{ systemIndex: 0, x1: 560, x2: 569, staffY: 40, isFirst: true, isLast: true }])
    expect(resolveHairpinSegments({ x: 565, y: 40 }, close, 0, 0, bounds)).toEqual([])
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

// Printed segments retain their actual address even when an empty system has no bounds.
it('identifies actual hairpin systems rather than the compacted segment array index', () => {
  const bounds = new Map([[0,{x1:16,x2:500,y:40}],[2,{x1:16,x2:500,y:240}]])
  const before = structuredClone([...bounds])
  const segments = resolveHairpinSegments({x:80,y:40},{x:180,y:240},0,2,bounds)
  expect(segments.map(segment => Reflect.get(segment,'systemIndex'))).toEqual([0,2])
  expect(segments.map(({x1,x2,staffY,isFirst,isLast}) => ({x1,x2,staffY,isFirst,isLast}))).toEqual([
    {x1:90,x2:482,staffY:40,isFirst:true,isLast:false},
    {x1:38,x2:202,staffY:240,isFirst:false,isLast:true}
  ])
  expect([...bounds]).toEqual(before)
})
