import { describe, expect, it } from 'vitest'
import { createMeasure } from './factories'
import { createRepeatMeasureTraversal } from './repeats'
import type { Measure } from './types'

const measures = (marks: Array<Pick<Measure, 'repeat' | 'volta'>>) => marks.map((mark, index) =>
  createMeasure({ id: `repeat-${index}`, ...mark }))
const indices = (score: Measure[]) => createRepeatMeasureTraversal(score).map(visit => visit.measureIndex)

describe('repeat traversal', () => {
  it.each([2, 3])('expands nested repeats independently on %s outer passes', times => {
    const score = measures([{ repeat: { start: true } }, { repeat: { start: true } },
      { repeat: { end: true } }, { repeat: { end: true, times } }])
    const before = structuredClone(score)
    expect(indices(score)).toEqual(Array.from({ length: times }, () => [0, 1, 2, 1, 2, 3]).flat())
    expect(score).toEqual(before)
  })

  it('resets inner alternate endings on each outer pass', () => {
    const score = measures([{ repeat: { start: true } }, { repeat: { start: true } },
      { repeat: { end: true }, volta: { number: 1, start: true, end: true } },
      { volta: { number: 2, start: true, end: true } }, { repeat: { end: true } }])
    expect(indices(score)).toEqual([0, 1, 2, 1, 3, 4, 0, 1, 2, 1, 3, 4])
  })

  it('supports a single-measure repeat inside an outer repeat', () => {
    expect(indices(measures([{ repeat: { start: true } }, { repeat: { start: true, end: true } },
      { repeat: { end: true } }]))).toEqual([0, 1, 1, 2, 0, 1, 1, 2])
  })

  it('uses the outer first-ending pass while expanding an inner repeat', () => {
    const score = measures([{ repeat: { start: true } },
      { repeat: { start: true }, volta: { number: 1, start: true } },
      { repeat: { end: true } }, { repeat: { end: true }, volta: { number: 1, end: true } },
      { volta: { number: 2, start: true, end: true } }])
    expect(indices(score)).toEqual([0, 1, 2, 1, 2, 3, 0, 4])
  })

  it('replays every inner pass inside an outer second ending', () => {
    const score = measures([{ repeat: { start: true } },
      { repeat: { end: true }, volta: { number: 1, start: true, end: true } },
      { repeat: { start: true }, volta: { number: 2, start: true } },
      { repeat: { end: true }, volta: { number: 2, end: true } }])
    expect(indices(score)).toEqual([0, 1, 0, 2, 3, 2, 3])
  })

  it('retains the completed pass across an inserted measure before the second ending', () => {
    const score = measures([{ repeat: { start: true } },
      { repeat: { end: true }, volta: { number: 1, start: true, end: true } }, {},
      { volta: { number: 2, start: true, end: true } }])
    expect(indices(score)).toEqual([0, 1, 0, 2, 3])
  })

  it('preserves sequential implicit repeat sections', () => {
    expect(indices(measures([{}, { repeat: { end: true } }, {}, { repeat: { end: true } }])))
      .toEqual([0, 1, 0, 1, 2, 3, 2, 3])
  })

  it('bounds exponential repeat expansion without silently truncating playback', () => {
    const score = measures([{ repeat: { start: true } }, { repeat: { start: true } },
      { repeat: { start: true, end: true, times: 100 } }, { repeat: { end: true, times: 100 } },
      { repeat: { end: true, times: 100 } }])
    expect(() => createRepeatMeasureTraversal(score)).toThrow('Repeat expansion limit')
  })

  it('bounds traversal work even when most repeated measures are skipped endings', () => {
    const score = measures([{ repeat: { start: true } }, { repeat: { start: true } },
      { repeat: { start: true, end: true, times: 100 } }, { repeat: { end: true, times: 100 } },
      { repeat: { end: true, times: 100 } }].map(mark => ({ ...mark,
        volta: { number: 1, start: true, end: true } })))
    expect(() => createRepeatMeasureTraversal(score)).toThrow('Repeat expansion limit')
  })
})
