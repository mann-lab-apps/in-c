// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import type { MeasureInkOwner } from './staff-ink-spacing'
const { inks } = vi.hoisted(() => ({ inks: new Map<Element, { x: number; y: number; width: number; height: number }>() }))
vi.mock('./staff-ink-spacing', () => ({ readSvgTextInk: (node: Element) => inks.get(node), readSvgShapeInk: () => undefined }))
import { readOwnedLyricInk } from './lyric-ink-spacing'

let svg: SVGSVGElement
let owners: Map<string, MeasureInkOwner>
const context = {} as CanvasRenderingContext2D
beforeEach(() => {
  document.body.innerHTML = '<svg></svg>'
  svg = document.querySelector('svg')!
  owners = new Map(); inks.clear()
})
function note(id: string, staff: number, root = svg) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  element.classList.add('notation-event')
  Object.assign(element.dataset, { eventId: id, partId: `p${staff}`, staffId: `s${staff}`, measureId: `m${staff}` })
  owners.set(`m${staff}`, { partId: `p${staff}`, staffId: `s${staff}`, staffIndex: staff, systemIndex: 0 })
  root.append(element); return element
}
function lyric(id: string, number = 1) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  element.classList.add('notation-lyric'); Object.assign(element.dataset, { eventId: id, lyricNumber: String(number) })
  element.textContent = number === 1 ? '아' : '바'; svg.append(element)
  inks.set(element, { x: 20, y: 120 + number * 16, width: 13, height: 12 })
  return element
}
it('keeps two verses on their unique event owner without modifying owner or glyph data', () => {
  note('lower', 1); const first = lyric('lower'), second = lyric('lower', 2)
  const before = structuredClone([...owners]), result = readOwnedLyricInk(svg, owners, context)
  expect(result).toEqual({ unresolved: false, ink: [first, second].map(node => ({ ...inks.get(node), ...owners.get('m1') })) })
  expect([...owners]).toEqual(before)
})
it('does not assign a duplicated event ID to either staff', () => {
  note('same', 0); note('same', 1); lyric('same')
  expect(readOwnedLyricInk(svg, owners, context)).toEqual({ ink: [], unresolved: true })
})
it('marks missing or mismatched event ownership unresolved even when glyph ink is available', () => {
  const event = note('wrong', 0); event.dataset.partId = 'foreign'
  lyric('wrong'); lyric('orphan')
  expect(readOwnedLyricInk(svg, owners, context)).toEqual({ ink: [], unresolved: true })
})
it('keeps missing glyph metrics unresolved instead of guessing that foreign ink is clear', () => {
  note('known', 0); const text = lyric('known'); inks.delete(text)
  expect(readOwnedLyricInk(svg, owners, context)).toEqual({ ink: [], unresolved: true })
})
it('ignores a duplicate ID in another SVG and reports no protection when there are no lyrics', () => {
  note('unique', 0)
  expect(readOwnedLyricInk(svg, owners, context)).toEqual({ ink: [], unresolved: false })
  const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.append(foreign)
  note('unique', 1, foreign); lyric('unique')
  expect(readOwnedLyricInk(svg, owners, context).unresolved).toBe(false)
})
