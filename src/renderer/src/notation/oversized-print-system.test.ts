import { expect, it } from 'vitest'
import { createMeasure } from '../../../score-core'
import { createSystemLayout } from './system-layout'

const measures = () => [1, 2, 3].map(number => createMeasure({ id: `m${number}`, number }))
const layout = { systemBreakBeforeMeasureIds: ['m2', 'm3'] }

it('does not defer an oversized system to another page that cannot contain it either', () => {
  const score = measures(), before = structuredClone(score)
  const result = createSystemLayout(score, 750, { layout, systemTop: 40, systemHeight: 900, pageHeight: 600 })
  expect(result.placements.map(p => p.y)).toEqual([40, 940, 1840])
  expect(result.height).toBe(2740)
  expect(score).toEqual(before)
})

it('preserves the existing manual-break spacing policy without adding an empty reserved page', () => {
  const score = measures(), authored = { ...layout, pageBreakBeforeMeasureIds: ['m2'] }, before = structuredClone(authored)
  const result = createSystemLayout(score, 750, { layout: authored, systemTop: 40, systemHeight: 900, pageHeight: 600 })
  expect(result.placements.map(p => p.y)).toEqual([40, 940, 1840])
  expect(authored).toEqual(before)
})

it('does not add an extra blank page when preceding clearance ends at a page boundary', () => {
  const score = measures(), authored = { ...layout, pageBreakBeforeMeasureIds: ['m2'] }
  const exact = createSystemLayout(score, 750, { layout: authored, systemTop: 40, systemHeight: 180, pageHeight: 600, additionalSystemSpacing: new Map([[0, 380]]) })
  expect(exact.placements[1].y).toBe(640)
  const crossed = createSystemLayout(score, 750, { layout: authored, systemTop: 40, systemHeight: 180, pageHeight: 600, additionalSystemSpacing: new Map([[0, 800]]) })
  expect(crossed.placements[1].y).toBe(1020)
})

it('retains normal pagination and the measured first-header offset', () => {
  const score = measures()
  const normal = createSystemLayout(score, 750, { layout, systemTop: 40, systemHeight: 180, pageHeight: 300 })
  expect(normal.placements.map(p => p.y)).toEqual([40, 340, 640])
  const tall = createSystemLayout(score, 750, { layout, systemTop: 40, systemHeight: 900, pageHeight: 600, firstSystemOffset: 120 })
  expect(tall.placements[0].y).toBe(160)
  expect(tall.placements.map(p => [p.x, p.width, p.systemIndex])).toEqual(normal.placements.map(p => [p.x, p.width, p.systemIndex]))
})
