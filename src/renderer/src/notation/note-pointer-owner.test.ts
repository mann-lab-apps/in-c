// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
const { inks } = vi.hoisted(() => ({ inks: new Map<Element, { x: number; y: number; width: number; height: number }>() }))
vi.mock('./staff-ink-spacing', () => ({ readSvgTextInk: (node: Element) => inks.get(node) }))
import { resolveNotePointerOwner } from './note-pointer-owner'

let svg: SVGSVGElement
beforeEach(() => {
  document.body.innerHTML = '<svg></svg>'
  inks.clear()
  svg = document.querySelector('svg')!
  Object.assign(svg, { getScreenCTM: () => ({ inverse: () => ({ a: .5, b: 0, c: 0, d: .5, e: -10, f: -20 }) }) })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
})
function note(id: string, y: number, root = svg) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  node.classList.add('notation-event'); node.setAttribute('role', 'button')
  Object.assign(node.dataset, { eventId: id, partId: 'p', staffId: 's', measureId: 'm', voiceId: id })
  node.innerHTML = '<g class="vf-notehead"><text>note</text></g>'
  Object.assign(node, { getBoundingClientRect: () => ({ left: 20, right: 100, top: 20, bottom: 150 }) })
  root.append(node); inks.set(node.querySelector('text')!, { x: 20, y, width: 12, height: 10 })
  return node
}
it('selects the unique actual head through another voice rectangle at current zoom and scroll', () => {
  const head = note('head', 20), covering = note('covering', 5)
  const result = resolveNotePointerOwner(covering, 72, 90)
  expect(result?.element).toBe(head)
  expect(result?.eventId).toBe('head')
  expect(result?.address).toEqual({ partId: 'p', staffId: 's', measureId: 'm', voiceId: 'head' })
})
it('preserves the original owner on stems/background and real unisons', () => {
  note('first', 20); const covering = note('covering', 20)
  expect(resolveNotePointerOwner(covering, 72, 90)).toBeUndefined()
  expect(resolveNotePointerOwner(covering, 72, 140)).toBeUndefined()
})
it('ignores preview, foreign SVG and incomplete-address heads', () => {
  const preview = note('preview', 20); preview.classList.add('is-preview')
  const incomplete = note('incomplete', 20); delete incomplete.dataset.voiceId
  const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.append(foreign)
  note('foreign', 20, foreign)
  const covering = note('covering', 5)
  expect(resolveNotePointerOwner(covering, 72, 90)).toBeUndefined()
})
it('treats multiple heads of one chord as one owner and keeps identity when IDs repeat in another lane', () => {
  const head = note('same', 20), covering = note('same', 5)
  covering.dataset.voiceId = 'other'
  const duplicate = head.querySelector('text')!.cloneNode(true) as Element
  head.querySelector('.vf-notehead')!.append(duplicate)
  inks.set(duplicate, { x: 20, y: 20, width: 12, height: 10 })
  expect(resolveNotePointerOwner(covering, 72, 90)?.element).toBe(head)
})
it('falls back safely without real SVG metrics or for detached nodes', () => {
  const covering = note('covering', 5)
  Object.assign(svg, { getScreenCTM: () => null })
  expect(resolveNotePointerOwner(covering, 72, 90)).toBeUndefined()
  covering.remove()
  expect(resolveNotePointerOwner(covering, 72, 90)).toBeUndefined()
})

it('selects a uniquely painted main flag through another voice rectangle', () => {
  const owningNote = note('flag-owner', 5), covering = note('covering', -10)
  const flag = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  flag.classList.add('vf-flag'); flag.innerHTML = '<text>\ue240</text>'
  owningNote.append(flag)
  inks.set(flag.querySelector('text')!, { x: 20, y: 20, width: 12, height: 10 })
  expect(resolveNotePointerOwner(covering, 72, 90)?.element).toBe(owningNote)
})
