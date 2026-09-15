import { describe, expect, it } from 'vitest'
import { resolveSpanViewport } from './span-viewport'

describe('portable span viewport', () => {
  it('does not change automatic layouts or already-contained manual marks', () => {
    expect(resolveSpanViewport(800, 240, [])).toEqual({ x: 0, y: 0, width: 800, height: 240 })
    expect(resolveSpanViewport(800, 240, [{ x: 50, y: 90, width: 100, height: 20 }])).toEqual({ x: 0, y: 0, width: 800, height: 240 })
  })
  it('reserves every edge including moved hairpins below the last staff', () => {
    expect(resolveSpanViewport(800, 240, [{ x: -20, y: -30, width: 60, height: 50 }, { x: 780, y: 243, width: 50, height: 30 }]))
      .toEqual({ x: -28, y: -38, width: 866, height: 319 })
  })
})
