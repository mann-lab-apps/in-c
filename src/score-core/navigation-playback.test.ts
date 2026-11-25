import { expect, it } from 'vitest'
import { createMeasure, createPart, createScore, createScoreRepeatPlaybackPlan, createStaff } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import type { Measure, NavigationMark } from './types'

function scoreWithNavigation(
  navigation: Record<number, NavigationMark>,
  repeats: Record<number, Measure['repeat']> = {},
  voltas: Record<number, Measure['volta']> = {}
) {
  const measures = Array.from({ length: 6 }, (_, index) => {
    const number = index + 1
    return createMeasure({
      id: `bar-${number}`, number,
      repeat: repeats[number],
      volta: voltas[number],
      navigation: navigation[number] ? [navigation[number]] : undefined
    })
  })
  return createScore({ parts: [createPart({ staves: [createStaff({ measures })] })] })
}

const measureOrder = (score: ReturnType<typeof scoreWithNavigation>) =>
  createScoreRepeatPlaybackPlan(score)?.entries.map(entry => entry.measureIndex + 1)

it('plays the MuseScore D.C. al Coda path and marks both jumped entrances', () => {
  const score = scoreWithNavigation({
    2: { type: 'tocoda', label: 'codab' },
    4: { type: 'coda', label: 'codab' },
    6: { type: 'dacapo' }
  })
  const saved = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const plan = createScoreRepeatPlaybackPlan(saved)
  expect(measureOrder(saved)).toEqual([1, 2, 3, 4, 5, 6, 1, 2, 4, 5, 6])
  expect(plan?.totalBeats).toBe(44)
  expect(plan?.entries.filter(entry => entry.navigationJump).map(entry => entry.outputBeat)).toEqual([24, 32])
  expect(saved.parts[0].staves[0].measures[1].navigation).toEqual([{ type: 'tocoda', label: 'codab' }])
})

it.each([false, true])('respects an explicit after-jump repeat setting of %s', afterJump => {
  const score = scoreWithNavigation({
    2: { type: 'segno', label: 'S' },
    4: { type: 'fine' },
    6: { type: 'dalsegno', label: 'S' }
  }, { 2: { start: true }, 3: { end: true, afterJump } })
  expect(measureOrder(score)).toEqual([
    1, 2, 3, 2, 3, 4, 5, 6,
    ...(afterJump ? [2, 3, 2, 3, 4] : [2, 3, 4])
  ])
})

it('takes a D.S. only on the requested visit to a repeated measure', () => {
  const score = scoreWithNavigation({
    2: { type: 'segno', label: 'S' },
    3: { type: 'dalsegno', label: 'S', passes: [2] },
    4: { type: 'fine' }
  }, { 2: { start: true }, 3: { end: true } })
  expect(measureOrder(score)).toEqual([1, 2, 3, 2, 3, 2, 3, 4])
})

it('falls back to the existing repeat plan when the jump has no target', () => {
  const score = scoreWithNavigation({
    6: { type: 'dalsegno', label: 'not-defined' }
  }, { 2: { start: true }, 3: { end: true } })
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(measureOrder(score)).toEqual([1, 2, 3, 2, 3, 4, 5, 6])
  expect(plan?.navigationIssue).toContain('세뇨')
  expect(plan?.entries.some(entry => entry.navigationJump)).toBe(false)
})

it('deduplicates identical marks in aligned staves and declines an unaligned graph', () => {
  const score = scoreWithNavigation({
    2: { type: 'fine' },
    6: { type: 'dacapo' }
  })
  const lower = structuredClone(score.parts[0].staves[0])
  lower.id = 'lower'
  lower.measures.forEach(measure => { measure.id += '-lower' })
  score.parts[0].staves.push(lower)
  expect(measureOrder(score)).toEqual([1, 2, 3, 4, 5, 6, 1, 2])
  lower.measures.pop()
  expect(createScoreRepeatPlaybackPlan(score)).toBeUndefined()
})

it('uses the explicit repeat policy on another staff only while other explicit settings agree', () => {
  const score = scoreWithNavigation({
    2: { type: 'segno', label: 'S' },
    4: { type: 'fine' },
    6: { type: 'dalsegno', label: 'S' }
  }, { 2: { start: true }, 3: { end: true } })
  const upper = score.parts[0].staves[0]
  const lower = structuredClone(upper)
  lower.id = 'lower'
  lower.measures.forEach(measure => {
    measure.id += '-lower'
    delete measure.navigation
  })
  score.parts[0].staves.push(lower)
  lower.measures[2].repeat = { end: true, afterJump: true }
  expect(measureOrder(score)).toEqual([1, 2, 3, 2, 3, 4, 5, 6, 2, 3, 2, 3, 4])
  upper.measures[2].repeat = { end: true, afterJump: false }
  const conflicting = createScoreRepeatPlaybackPlan(score)
  expect(conflicting?.navigationIssue).toContain('보표별')
  expect(conflicting?.entries.map(entry => entry.measureIndex + 1)).toEqual([1, 2, 3, 2, 3, 4, 5, 6])
})

const voltaNavigation: Record<number, NavigationMark> = {
  2: { type: 'segno', label: 'S' },
  4: { type: 'fine' },
  6: { type: 'dalsegno', label: 'S' }
}
const twoEndings: Record<number, Measure['volta']> = {
  3: { number: 1, start: true, end: true },
  4: { number: 2, start: true, end: true }
}
const initialVoltaOrder = [1, 2, 3, 2, 4, 5, 6]

it('takes the final ending on D.S. with the default after-jump repeat policy', () => {
  const score = scoreWithNavigation(voltaNavigation, {
    2: { start: true }, 3: { end: true }
  }, twoEndings)
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(plan?.navigationIssue).toBeUndefined()
  expect(measureOrder(score)).toEqual([...initialVoltaOrder, 2, 4])
  expect(plan?.totalBeats).toBe(36)
  expect(plan?.entries.filter(entry => entry.navigationJump)).toEqual([
    { measureIndex: 1, pass: 2, outputBeat: 28, navigationJump: true }
  ])
})

it.each([false, true])('reports an explicit after-jump flag on the volta repeat (%s)', afterJump => {
  const score = scoreWithNavigation(voltaNavigation, {
    2: { start: true }, 3: { end: true, afterJump }
  }, twoEndings)
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(plan?.navigationIssue).toContain('볼타')
  expect(measureOrder(score)).toEqual(initialVoltaOrder)
})

it('keeps the ordinary repeat plan when Fine is in the ending skipped on return', () => {
  const score = scoreWithNavigation({
    ...voltaNavigation,
    3: { type: 'fine' },
    4: { type: 'coda', label: 'unused' }
  }, { 2: { start: true }, 3: { end: true } }, twoEndings)
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(plan?.navigationIssue).toContain('Fine')
  expect(measureOrder(score)).toEqual(initialVoltaOrder)
  expect(plan?.entries.some(entry => entry.navigationJump)).toBe(false)
})

it('retains the ambiguity warning when the final ending is specified for a different repeat count', () => {
  const score = scoreWithNavigation(voltaNavigation, {
    2: { start: true }, 3: { end: true, times: 3 }
  }, twoEndings)
  const plan = createScoreRepeatPlaybackPlan(score)
  expect(plan?.navigationIssue).toContain('볼타')
  expect(plan?.entries.some(entry => entry.navigationJump)).toBe(false)
})

it('uses the last traversal when either ending spans more than one measure', () => {
  const score = scoreWithNavigation({
    1: { type: 'segno', label: 'S' },
    5: { type: 'fine' },
    6: { type: 'dalsegno', label: 'S' }
  }, {
    1: { start: true },
    3: { end: true }
  }, {
    2: { number: 1, start: true },
    3: { number: 1, end: true },
    4: { number: 2, start: true },
    5: { number: 2, end: true }
  })
  expect(measureOrder(score)).toEqual([1, 2, 3, 1, 4, 5, 6, 1, 4, 5])
})

it('returns through only the final ending of a simple repeat with three passes', () => {
  const score = scoreWithNavigation(voltaNavigation, {
    2: { start: true }, 3: { end: true, times: 3 }
  }, {
    3: { passes: [1, 2], start: true, end: true },
    4: { passes: [3], start: true, end: true }
  })
  const reopened = decodeNativeProject(encodeNativeProject(createNativeProject(score))).score
  const plan = createScoreRepeatPlaybackPlan(reopened)
  expect(plan?.navigationIssue).toBeUndefined()
  expect(measureOrder(reopened)).toEqual([1, 2, 3, 2, 3, 2, 4, 5, 6, 2, 4])
  expect(plan?.totalBeats).toBe(44)
  expect(plan?.entries.filter(entry => entry.navigationJump)).toEqual([
    { measureIndex: 1, pass: 3, outputBeat: 36, navigationJump: true }
  ])
})
