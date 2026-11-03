// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { resolveSpanPointerOwner } from './span-pointer-owner'

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
  inverse: () => identity, multiply: () => identity }
let svg: SVGSVGElement
beforeEach(() => {
  document.body.innerHTML = '<svg></svg>'
  svg = document.querySelector('svg')!
  Object.assign(svg, { getCTM: () => identity })
})
function span(id: string, hit: (point: DOMPointInit) => boolean, kind = 'slur', root = svg) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  Object.assign(group.dataset, { spanId: id, spanKind: kind })
  group.setAttribute('role', 'button'); group.classList.add('notation-span-target')
  group.innerHTML = kind === 'hairpin' ? '<g class="notation-hairpin"><line/></g>' : '<path class="notation-slur"/>'
  const node = group.querySelector<SVGGeometryElement>('path,line')!
  node.setAttribute('style', 'fill:none;stroke:black;stroke-width:1.6;stroke-opacity:1')
  Object.assign(node, { getBBox: () => ({ x: 0, y: 0, width: 20, height: 10 }),
    getCTM: () => identity, getScreenCTM: () => identity, isPointInStroke: hit })
  root.append(group)
  return { group, node }
}
it('prefers a uniquely painted slur over the neighboring broad hit target', () => {
  span('painted', p => p.x === 5 && p.y === 6)
  const fallback = span('covering', () => false).group
  expect(resolveSpanPointerOwner(fallback, 5, 6)).toEqual({ kind: 'slur', id: 'painted' })
})
it('keeps DOM fallback on genuinely overlapping strokes and blank space', () => {
  span('a', p => p.x === 5); const fallback = span('b', p => p.x === 5).group
  expect(resolveSpanPointerOwner(fallback, 5, 6)).toBeUndefined()
  expect(resolveSpanPointerOwner(fallback, 10, 6)).toBeUndefined()
})
it('deduplicates cross-system pieces while preserving kind in span identity', () => {
  span('same', () => true); const fallback = span('same', () => true).group
  expect(resolveSpanPointerOwner(fallback, 5, 6)).toEqual({ kind: 'slur', id: 'same' })
  span('same', () => true, 'hairpin')
  expect(resolveSpanPointerOwner(fallback, 5, 6)).toBeUndefined()
})
it('uses each painted shape screen transform including scale and scrolling', () => {
  const painted = span('hairpin', p => p.x === 5 && p.y === 6, 'hairpin')
  Object.assign(painted.node, { getScreenCTM: () => ({ inverse: () => ({ a: .5, b: 0, c: 0, d: .5, e: -10, f: -20 }) }) })
  const fallback = span('covering', () => false).group
  expect(resolveSpanPointerOwner(fallback, 30, 52)).toEqual({ kind: 'hairpin', id: 'hairpin' })
})
it('ignores hidden or unpainted shapes, foreign SVGs and incomplete references', () => {
  span('hidden', () => true).group.style.display = 'none'
  span('transparent', () => true).node.style.stroke = 'transparent'
  span('zero', () => true).node.style.strokeWidth = '0'
  delete span('incomplete', () => true).group.dataset.spanId
  const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.append(foreign); Object.assign(foreign, { getCTM: () => identity })
  span('foreign', () => true, 'slur', foreign)
  const fallback = span('covering', () => false).group
  expect(resolveSpanPointerOwner(fallback, 5, 6)).toBeUndefined()
})
it('falls back for unsupported geometry APIs and invalid screen transforms', () => {
  const { group, node } = span('a', () => true)
  Object.assign(node, { isPointInStroke: undefined })
  expect(resolveSpanPointerOwner(group, 5, 6)).toBeUndefined()
  Object.assign(node, { isPointInStroke: () => true, getScreenCTM: () => null })
  expect(resolveSpanPointerOwner(group, 5, 6)).toBeUndefined()
  Object.assign(node, { getScreenCTM: () => ({ inverse: () => ({ ...identity, a: NaN }) }) })
  expect(resolveSpanPointerOwner(group, 5, 6)).toBeUndefined()
})
it('falls back safely for detached targets and non-finite pointer coordinates', () => {
  const { group } = span('a', () => true)
  expect(resolveSpanPointerOwner(group, NaN, 6)).toBeUndefined()
  group.remove()
  expect(resolveSpanPointerOwner(group, 5, 6)).toBeUndefined()
})
