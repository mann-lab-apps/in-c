// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import type { MeasureInkOwner } from './staff-ink-spacing'
const { inks } = vi.hoisted(() => ({ inks: new Map<Element, { x: number; y: number; width: number; height: number }>() }))
vi.mock('./staff-ink-spacing', () => ({ readSvgTextInk: (node: Element) => inks.get(node) }))
import { readOwnedMeasureTextInk } from './measure-text-ink'

let svg: SVGSVGElement
let owners: Map<string, MeasureInkOwner>
const context = {} as CanvasRenderingContext2D
const selector = '.notation-dynamic-mark,.notation-expression-text'
beforeEach(() => {
  document.body.innerHTML = '<svg></svg>'
  svg = document.querySelector('svg')!
  inks.clear()
  owners = new Map([
    ['first', { partId: 'p1', staffId: 's1', staffIndex: 0, systemIndex: 0 }],
    ['later', { partId: 'p1', staffId: 's1', staffIndex: 0, systemIndex: 1 }],
    ['lower', { partId: 'p2', staffId: 's2', staffIndex: 1, systemIndex: 0 }]
  ])
})
function mark(kind: string, measureId?: string, root = svg) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.classList.add(kind)
  if (measureId) text.dataset.measureId = measureId
  text.textContent = kind === 'notation-dynamic-mark' ? 'mf' : 'dolce'
  root.append(text)
  inks.set(text, { x: 50, y: 200, width: 20, height: 18 })
  return text
}
it('keeps measure, staff and system ownership for both kinds without rewriting text or owners', () => {
  const nodes = [mark('notation-dynamic-mark', 'lower'), mark('notation-expression-text', 'later')]
  const before = svg.outerHTML, ownerBefore = structuredClone([...owners])
  expect(readOwnedMeasureTextInk(svg, owners, context, selector)).toEqual({ unresolved: false,
    ink: nodes.map(node => ({ ...inks.get(node), ...owners.get(node.dataset.measureId!), measureId: node.dataset.measureId })) })
  expect(svg.outerHTML).toBe(before)
  expect([...owners]).toEqual(ownerBefore)
})
it('lets dynamic spacing read only its existing dynamic selector', () => {
  mark('notation-dynamic-mark', 'first')
  mark('notation-expression-text', 'unknown')
  expect(readOwnedMeasureTextInk(svg, owners, context, '.notation-dynamic-mark[data-measure-id]')).toMatchObject({ unresolved: false, ink: [{ measureId: 'first' }] })
})
it('keeps missing, duplicated or unknown measure ownership unresolved', () => {
  owners.set('duplicate', undefined as unknown as MeasureInkOwner)
  mark('notation-dynamic-mark')
  mark('notation-expression-text', 'unknown')
  mark('notation-dynamic-mark', 'duplicate')
  expect(readOwnedMeasureTextInk(svg, owners, context, selector)).toEqual({ ink: [], unresolved: true })
})
it('keeps missing glyph ink unresolved instead of allowing an unmeasured bow', () => {
  const text = mark('notation-expression-text', 'later')
  inks.delete(text)
  expect(readOwnedMeasureTextInk(svg, owners, context, selector)).toEqual({ ink: [], unresolved: true })
})
it('ignores other symbols and text owned by a nested SVG', () => {
  const nested = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.append(nested)
  mark('notation-dynamic-mark', 'unknown', nested)
  mark('notation-staff-text', 'unknown')
  expect(readOwnedMeasureTextInk(svg, owners, context, selector)).toEqual({ ink: [], unresolved: false })
})
