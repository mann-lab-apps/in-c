import { expect, it } from 'vitest'
import { resolveRestHeadShift, type RestInkBounds } from './voice-rest-clearance'
// Actual font/CTM observation B; these are ink extents, not event hit rectangles.
const rest = { x: 556.1392502279872, y: 551.8603501668216, width: 10.7599361067265, height: 29.9198218877444 }
const head = { x: 556.0992504633759, y: 566.7802613870606, width: 11.7999289621695, height: 9.9999404450036 }
const separated = (r: RestInkBounds, h: RestInkBounds, shift: number, gap: number) => r.y + shift >= h.y + h.height + gap || r.y + r.height + shift + gap <= h.y
it('clears the reproduced lower-voice quarter rest from the F# notehead with half-space padding', () => {
  const original = structuredClone([rest, head]), shift = resolveRestHeadShift(rest, [head], 1, 5)
  expect(shift).toBeGreaterThan(25); expect(shift).toBeLessThan(35)
  expect(separated(rest, head, shift, 5)).toBe(true); expect([rest, head]).toEqual(original)
})
it('moves an upper-voice rest outward above a colliding head', () => {
  const shift = resolveRestHeadShift(rest, [head], -1, 5)
  expect(shift).toBeLessThan(-15); expect(separated(rest, head, shift, 5)).toBe(true)
})
it('continues outward past another head without depending on array order', () => {
  const heads = [head, { ...head, y: 595 }]
  const shift = resolveRestHeadShift(rest, heads, 1, 5)
  expect(heads.every(h => separated(rest, h, shift, 5))).toBe(true)
  expect(resolveRestHeadShift(rest, [...heads].reverse(), 1, 5)).toBe(shift)
})
it.each([{ ...head, x: 700 }, { ...head, y: 700 }])('preserves a genuinely clear rest: %j', other => {
  expect(resolveRestHeadShift(rest, [other], 1, 5)).toBe(0)
})
it('does not invent ink bounds from empty or invalid measurements', () => {
  expect(resolveRestHeadShift(rest, [], 1, 5)).toBe(0)
  expect(resolveRestHeadShift({ ...rest, width: 0 }, [head], 1, 5)).toBe(0)
  expect(resolveRestHeadShift(rest, [{ ...head, y: NaN }], 1, 5)).toBe(0)
})
