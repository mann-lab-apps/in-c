import { expect, it } from 'vitest'
import { planPngPages } from './pages'

const paper = { pageSize: 'a4' as const, orientation: 'portrait' as const, pageMarginMm: 10 }
it('uses physical paper and margins independently of the editor viewport', () => {
  const p = planPngPages({ width: 750, height: 2200 }, paper, 300)
  expect(p.pixelWidth).toBe(2480)
  expect(p.pixelHeight).toBe(3508)
  expect(p.contentPageHeight).toBeCloseTo(750 * 277 / 190, 10)
  expect(p.margin).toBeCloseTo(750 * 10 / 190, 10)
  expect(p.pageCount).toBe(3)
  expect(p.paperWidth).toBeCloseTo(750 * 210 / 190, 10)
})
it('keeps exact page boundaries and never silently drops overflow', () => {
  const height = 750 * 277 / 190
  expect(planPngPages({ width: 750, height: height * 2 }, paper, 150).pageCount).toBe(2)
  expect(planPngPages({ width: 750, height: height * 2 + .1 }, paper, 150).pageCount).toBe(3)
})
it('supports landscape Letter and checks capacity before allocating a canvas', () => {
  const p = planPngPages({ width: 900, height: 500 }, { pageSize: 'letter', orientation: 'landscape', pageMarginMm: 8 }, 150)
  expect([p.pixelWidth, p.pixelHeight]).toEqual([1650, 1275])
  expect(() => planPngPages({ width: 0, height: 12 }, paper, 300)).toThrow()
  expect(() => planPngPages({ width: 750, height: Infinity }, paper, 300)).toThrow()
  expect(() => planPngPages({ width: 750, height: 12 }, paper, 600 as 300)).toThrow()
})
it('rejects unbounded page geometry before constructing a page list', () => {
  expect(() => planPngPages({ width: Number.MIN_VALUE, height: 1 }, paper, 150)).toThrow()
  expect(() => planPngPages({ width: 1, height: Number.MAX_VALUE }, paper, 150)).toThrow()
})
