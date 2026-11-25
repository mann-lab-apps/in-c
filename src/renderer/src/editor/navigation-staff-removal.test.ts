import { expect, it } from 'vitest'
import { createMeasure, createPart, createScore, createStaff, type NavigationMark } from '../../../score-core'
import { remapRemovedStaffNavigation } from './navigation-staff-removal'

function fixture() {
  const staves = ['upper', 'lower'].map(id => createStaff({ id, measures: [1, 2].map(number =>
    createMeasure({ id: `${id}-${number}`, number })) }))
  return createScore({ parts: [createPart({ staves })] })
}

it('does not duplicate an identically engraved marker from a removed voice staff', () => {
  const score = fixture()
  const [upper, lower] = score.parts[0].staves
  const mark: NavigationMark = { type: 'segno', label: 'S', symbol: true }
  upper.measures[0].navigation = [mark]
  lower.measures[0].navigation = [{ ...mark }]
  const remaining = [{ ...score.parts[0], staves: [upper] }]
  expect(remapRemovedStaffNavigation(score, remaining)).toBe(remaining)
})

it('retains markers when the same part loses their original upper staff', () => {
  const score = fixture()
  const [upper, lower] = score.parts[0].staves
  upper.measures[0].navigation = [{ type: 'segno', label: 'S', symbol: true }]
  lower.measures[1].navigation = [{ type: 'dalsegno', label: 'S' }]
  const before = structuredClone(score)
  const remaining = [{ ...score.parts[0], staves: [lower] }]
  const moved = remapRemovedStaffNavigation(score, remaining)?.[0].staves[0]
  expect(moved?.measures.map(bar => bar.navigation)).toEqual([upper.measures[0].navigation, lower.measures[1].navigation])
  expect(moved?.measures.map(bar => bar.id)).toEqual(['lower-1', 'lower-2'])
  expect(score).toEqual(before)
})

it('refuses a relocation that cannot fit the surviving measure rather than dropping any markers', () => {
  const score = fixture()
  const [upper, lower] = score.parts[0].staves
  upper.measures[0].navigation = Array.from({ length: 100 }, (_, index) => ({ type: 'segno', label: `S-${index}` }))
  lower.measures[0].navigation = [{ type: 'coda', label: 'C' }]
  const before = structuredClone(score)
  expect(remapRemovedStaffNavigation(score, [{ ...score.parts[0], staves: [upper] }])).toBeUndefined()
  expect(score).toEqual(before)
})
