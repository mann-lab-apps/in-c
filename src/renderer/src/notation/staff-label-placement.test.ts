import { expect, it } from 'vitest'
import { createScore } from '../../../score-core'
import { resolveMeasureAnnotationLanes } from './annotation-lanes'
import { createStaffAnnotationSpacing } from './staff-annotation-spacing'
import { localStaffLabelShifts, resolveStaffLabelShift } from './staff-label-placement'

function fixture() {
  const score = createScore(), first = score.parts[0].staves[0].measures[0]
  const later = { ...structuredClone(first), id: 'later', number: 2 }
  score.parts[0].staves[0].measures.push(later)
  const lower = structuredClone(score.parts[0]); lower.id = 'lower'; lower.name = 'Lower'
  lower.staves[0].id = 'lower-staff'
  lower.staves[0].measures.forEach((m, i) => { m.id = `lower-${i}` })
  score.parts.push(lower)
  score.staffTexts = [{ id: 'future', measureId: later.id, text: 'Later upper text' }]
  const lanes = new Map(score.parts.flatMap(p => p.staves.flatMap(s => s.measures.map(m => [m.id,
    resolveMeasureAnnotationLanes({ staffTextCount: m.id === later.id ? 3 : 0 })] as const))))
  // Synthetic lifecycle/placement oracle. Real glyph ink is checked in Electron.
  const measureInk = () => ({ y: -10, height: 12 })
  return { score, lanes, measureInk, global: createStaffAnnotationSpacing(score, lanes, measureInk) }
}

it('does not keep a later-system upper reservation in the first-system label candidate', () => {
  const f = fixture(), source = structuredClone(f.score), before = structuredClone(f.global)
  const shifts = localStaffLabelShifts(f.score, [0], f.lanes, f.measureInk, f.global)
  expect(shifts[0]).toBeGreaterThan(0)
  expect(shifts[1]).toBe(0)
  expect(f.score).toEqual(source); expect(f.global).toEqual(before)
})

it('retains the active upper annotation stack and unknown or empty measurement fallback', () => {
  const f = fixture()
  expect(localStaffLabelShifts(f.score, [1], f.lanes, f.measureInk, f.global)).toEqual([0, 0])
  expect(localStaffLabelShifts(f.score, [], f.lanes, f.measureInk, f.global)).toEqual([0, 0])
  expect(localStaffLabelShifts(f.score, [0], f.lanes, () => undefined, f.global)).toEqual([0, 0])
})

const current = { x: 12, y: 75, width: 33, height: 10 }
it('accepts a downward local candidate with six units of actual ink clearance', () => {
  expect(resolveStaffLabelShift(current, 78, [{ x: 12, y: 170, width: 50, height: 50 }])).toBe(78)
})
it.each([
  { x: 12, y: 160, width: 33, height: 10 },
  { x: 40, y: 166, width: 50, height: 2 },
  { x: 12, y: 150, width: 80, height: 20 }
])('keeps the conservative original baseline beside competing glyph/text/manual ink %o', obstacle => {
  expect(resolveStaffLabelShift(current, 78, [obstacle])).toBe(0)
})
it('does not move upward or guess missing, nonfinite or invalid ink', () => {
  for (const desired of [-10, 0, .01, Number.NaN, Number.POSITIVE_INFINITY]) expect(resolveStaffLabelShift(current, desired, [])).toBe(0)
  expect(resolveStaffLabelShift({ ...current, width: 0 }, 78, [])).toBe(0)
  expect(resolveStaffLabelShift(current, 78, [{ ...current, y: Number.NaN }])).toBe(0)
})
