import { expect, it } from 'vitest'
import { resolveSlurContinuationStartCurve } from './slur-fermata-spacing'

const curve = { x1: 33.84, x2: 101.57, controlX: 71.70,
  y1: 312.9, y2: 312.9, controlY: 302.9, side: 'above' as const, strokeWidth: 1.6 }
const clef = { x: 13, y: 276.98, width: 26.84, height: 70.36 }

it('starts a head-side continuation after measured clef ink while retaining its note endpoint', () => {
  const before = structuredClone({ curve, clef })
  const next = resolveSlurContinuationStartCurve(curve, [clef], true)
  expect(next.x1).toBeCloseTo(48.64)
  expect(next.controlX).toBeCloseTo((48.64 + curve.x2) / 2)
  expect([next.y1, next.y2, next.controlY, next.x2]).toEqual([curve.y1, curve.y2, curve.controlY, curve.x2])
  expect({ curve, clef }).toEqual(before)
})
it('uses the same horizontal clearance for a lower head-side continuation', () => {
  const lower = { ...curve, side: 'below' as const, controlY: 322.9 }
  const next = resolveSlurContinuationStartCurve(lower, [clef], true)
  expect(next.x1).toBeCloseTo(48.64)
  expect([next.y1, next.y2, next.controlY]).toEqual([lower.y1, lower.y2, lower.controlY])
})
it('keeps the existing floating-end policy when a short continuation cannot move horizontally', () => {
  const short = { ...curve, x2: 60, controlX: 48 }
  const next = resolveSlurContinuationStartCurve(short, [clef], true)
  expect(next.x1).toBe(curve.x1)
  expect(next.y1).toBeLessThan(clef.y)
  expect(next.y2).toBe(curve.y2)
})
it('preserves clear curves and existing stem-side floating behavior', () => {
  expect(resolveSlurContinuationStartCurve(curve, [], true)).toBe(curve)
  expect(resolveSlurContinuationStartCurve(curve, [clef]).x1).toBe(curve.x1)
})
