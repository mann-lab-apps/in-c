// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { measureSystemInkSpacing, resolveSystemInkSpacing, type SystemInk } from './system-ink-spacing'

const ink = (systemIndex: number, x: number, y: number, width: number, height: number): SystemInk =>
  ({ systemIndex, x, y, width, height })

it('reserves the measured outgoing curve envelope before next-system chords without editing manual paths', () => {
  // Actual first failing Electron measurements, including the visible slur stroke.
  const spans = [ink(0, 126.52, 169, 465.48, 6), ink(0, 122.72, 169.2, 470.08, 16.6)]
  const chords = [ink(1, 76.869, 169.5, 82.422, 18), ink(1, 176.094, 169.5, 81.719, 18)]
  const before = structuredClone({ spans, chords }), initial = new Map<number, number>()
  const gaps = resolveSystemInkSpacing(spans, chords, initial)
  expect(gaps.get(0)).toBeCloseTo(24.3)
  expect(initial.size).toBe(0)
  expect({ spans, chords }).toEqual(before)
  const shifted = chords.map(chord => ({ ...chord, y: chord.y + gaps.get(0)! }))
  expect(resolveSystemInkSpacing(spans, shifted, gaps)).toBe(gaps)
})

it('leaves unrelated systems, same-system user geometry and nonintersecting horizontal ink unchanged', () => {
  const gaps = new Map([[3, 10]])
  const span = ink(0, 100, 200, 20, 10)
  for (const text of [ink(0, 100, 200, 20, 10), ink(2, 100, 200, 20, 10), ink(1, 130, 200, 20, 10), ink(1, 100, 230, 20, 10)])
    expect(resolveSystemInkSpacing([span], [text], gaps)).toBe(gaps)
})

it('accumulates only the current adjacent deficit, independent of element order, and rejects invalid metrics', () => {
  const spans = [ink(0, 0, 100, 100, 10), ink(1, 0, 200, 100, 20), ink(0, 0, 0, 0, 0), ink(0, 0, NaN, 10, 10)]
  const text = [ink(1, 0, 100, 100, 10), ink(2, 0, 210, 100, 10)]
  const initial = new Map([[0, 5]])
  const result = resolveSystemInkSpacing(spans, text, initial)
  expect([...result]).toEqual([[0, 23], [1, 18]])
  expect(resolveSystemInkSpacing([...spans].reverse(), [...text].reverse(), initial)).toEqual(result)
  expect([...initial]).toEqual([[0, 5]])
})

it('measures real path stroke and text, excludes selection surfaces and does not mutate SVG or source maps', () => {
  const host = document.createElement('div')
  host.innerHTML = '<svg><g class="vf-stavetie" data-system-index="0"><path style="stroke:black;stroke-width:2;stroke-opacity:1"/></g><path class="notation-span-hit"/><text class="notation-harmony-mark" data-measure-id="next" style="stroke:none">C</text></svg>'
  document.body.append(host)
  const svg = host.querySelector('svg')!, path = svg.querySelector('path')!, text = svg.querySelector('text')!
  path.getBBox = () => ({ x: 100, y: 200, width: 100, height: 10 } as DOMRect)
  text.getBBox = () => ({ x: 100, y: 210, width: 100, height: 18 } as DOMRect)
  const hit = svg.querySelector<SVGGraphicsElement>('.notation-span-hit')!
  hit.getBBox = () => { throw Error('A selection hit box must not be measured') }
  const html = svg.outerHTML, owners = new Map([['next', 1]])
  expect(measureSystemInkSpacing(svg, owners, new Map()).get(0)).toBe(9)
  expect(svg.outerHTML).toBe(html)
  expect([...owners]).toEqual([['next', 1]])
  expect(measureSystemInkSpacing(svg, new Map([['next', undefined]]), new Map()).size).toBe(0)
  host.remove()
})
