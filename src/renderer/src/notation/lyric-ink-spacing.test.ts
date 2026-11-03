import { expect, it } from 'vitest'
import { resolveLyricInkSpacing } from './lyric-ink-spacing'

const stem = Object.freeze({ x: 125.5999984741211, y: 146.25, width: 1.5, height: 36.5, staffIndex: 0, systemIndex: 0 })
const lyric = Object.freeze({ x: 118.79588186740875, y: 177.54799938201904, width: 20.8779958486557, height: 11.362001419067383, staffIndex: 0, systemIndex: 0 })

it('clears the recorded actual down-stem/lyric collision and settles without changing measured inputs', () => {
  const empty = new Map<number, number>(), next = resolveLyricInkSpacing([stem], [lyric], empty)
  expect(next.get(0)).toBe(13.21)
  expect(lyric.y + next.get(0)! - stem.y - stem.height).toBeGreaterThanOrEqual(8)
  expect(resolveLyricInkSpacing([stem], [{ ...lyric, y: lyric.y + next.get(0)! }], next)).toBe(next)
  expect(empty.size).toBe(0); expect(lyric.y).toBe(177.54799938201904)
})

it('keeps other staves/systems and non-overlapping or empty ink out of the row clearance', () => {
  const empty = new Map<number, number>()
  for (const other of [{ ...lyric, staffIndex: 1 }, { ...lyric, systemIndex: 1 }, { ...lyric, x: 300 }, { ...lyric, width: 0 }, { ...lyric, y: NaN }]) {
    expect(resolveLyricInkSpacing([stem], [other], empty)).toBe(empty)
  }
})

it('keeps a shared staff baseline across systems using the largest deficit, without summing parallel collisions', () => {
  const next = resolveLyricInkSpacing([stem, { ...stem, systemIndex: 1, y: stem.y + 10 }], [lyric, { ...lyric, systemIndex: 1 }], new Map())
  expect(next.get(0)).toBe(23.21)
  expect(next.size).toBe(1)
})
