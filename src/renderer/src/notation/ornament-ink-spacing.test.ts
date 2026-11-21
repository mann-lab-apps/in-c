import { expect, it } from 'vitest'
import { resolveOrnamentInkOffset } from './ornament-ink-spacing'
import { resolveFermataInkOffset } from './fermata-ink-spacing'

// Actual generated native, opened by the public menu, in screen and PDF SVG.
const ornament = { x: 321.8835908211767, y: 213.76801204681394, width: 20.38399874791503, height: 10.976000785827637 }
const fermata = { x: 325.60526561737055, y: 275.2, width: 12.681012153625488, height: 8.765625 }
it('associates the reproduced lower-staff ornament with actual staff lines, not Stave origin', () => {
  const before = structuredClone(ornament), offset = resolveOrnamentInkOffset(ornament, [331.7000122070312, 301.7], 297.2, 257.2)
  expect(offset).toBeCloseTo(66.4559871673584)
  expect(ornament.y + ornament.height + offset).toBeCloseTo(291.2)
  expect(ornament).toEqual(before)
})
it('keeps both stacked marks associated with the lower staff without moving note ink', () => {
  const offset = resolveOrnamentInkOffset(ornament, [331.7, 301.7], 297.2, 257.2)
  const shifted = { ...ornament, y: ornament.y + offset }
  const fermataShift = Math.min(0, shifted.y - 6 - (fermata.y + fermata.height))
  expect(fermata.y + fermata.height + fermataShift).toBeCloseTo(shifted.y - 6)
  expect(fermata.y + fermataShift).toBeGreaterThan(250)
  // Existing standalone fermata policy remains independently reusable.
  expect(resolveFermataInkOffset(fermata, [], 297.2)).toBeGreaterThan(0)
})
it('clears high chord members and stems in either direction while allowing downward normalization', () => {
  const mark = { x: 100, y: 10, width: 20, height: 10 }
  expect(resolveOrnamentInkOffset(mark, [120, 130], 100, 60)).toBe(74)
  expect(resolveOrnamentInkOffset(mark, [80, 55, 120], 100, 60)).toBe(29)
  expect(resolveOrnamentInkOffset({ ...mark, y: 80 }, [55, 120], 100, 60)).toBe(-41)
})
it('retains the old conservative policy when the actual staff boundary is unavailable', () => {
  const mark = { x: 100, y: 10, width: 20, height: 10 }
  expect(resolveOrnamentInkOffset(mark, [120], undefined, 60)).toBe(0)
  expect(resolveOrnamentInkOffset({ ...mark, y: 80 }, [120], undefined, 60)).toBe(-42)
})
it('declines malformed paint rather than moving or fabricating it', () => {
  for (const change of [{ width: 0 }, { height: -1 }, { y: NaN }])
    expect(resolveOrnamentInkOffset({ ...ornament, ...change }, [301.7], 297.2, 257.2)).toBe(0)
})
