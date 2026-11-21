// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { readPaletteEventInk } from './palette-event-ink'

afterEach(() => document.body.replaceChildren())
function fixture() {
  const host = document.createElement('div')
  host.innerHTML = '<svg><g class="notation-event vf-stavenote" data-event-id="main"><g class="vf-notehead"><text style="font:40px Bravura;fill:black;stroke:none">head</text></g><g class="vf-stem"><path style="fill:none;stroke:black;stroke-width:2px"/></g><rect opacity="0" width="9999" height="9999"/></g></svg>'
  document.body.append(host)
  const svg = host.querySelector('svg')!, event = host.querySelector<SVGElement>('.notation-event')!, head = host.querySelector('text')!, stem = host.querySelector('path')!
  const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this }, multiply(m: DOMMatrix) { return m } } as unknown as DOMMatrix
  svg.getCTM = () => identity; svg.getScreenCTM = () => identity
  head.getCTM = () => identity; head.getStartPositionOfChar = () => ({ x: 100, y: 200 } as DOMPoint)
  head.getBBox = () => { throw Error('Never use text em bounds') }
  stem.getCTM = () => identity; stem.getBBox = () => new DOMRect(111, 160, 0, 40)
  host.querySelector('rect')!.getBBox = () => { throw Error('Never measure transparent hit area') }
  event.getBoundingClientRect = () => new DOMRect(0, 0, 9999, 9999)
  const measureText = vi.fn(() => ({ actualBoundingBoxLeft: 0, actualBoundingBoxRight: 12, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 5 }))
  const context = { measureText } as unknown as CanvasRenderingContext2D
  return { host, svg, event, head, stem, identity, context, measureText }
}
const bounds = (r: DOMRect | undefined) => r && [r.x, r.y, r.width, r.height]
it('frames the principal ink without font em or transparent hit geometry and leaves the SVG unchanged', () => {
  const f = fixture(), before = f.host.innerHTML
  expect(bounds(readPaletteEventInk(f.event, f.context))).toEqual([100, 159, 12, 46])
  expect(f.host.innerHTML).toBe(before)
})
it('includes chord heads, flags and down stems, excluding nested grace heads/stems and the anonymous grace slash', () => {
  const f = fixture(), chord = f.head.cloneNode(true) as SVGTextContentElement
  chord.getCTM = () => f.identity; chord.getStartPositionOfChar = () => ({ x: 100, y: 220 } as DOMPoint); f.head.parentElement!.append(chord)
  f.stem.getBBox = () => new DOMRect(100, 200, 0, 60)
  const flag = document.createElementNS('http://www.w3.org/2000/svg', 'g'), text = f.head.cloneNode(true) as SVGTextContentElement
  flag.classList.add('vf-flag'); text.getCTM = () => f.identity; text.getStartPositionOfChar = () => ({ x: 100, y: 265 } as DOMPoint); flag.append(text); f.event.append(flag)
  const grace = f.event.cloneNode(true) as SVGElement; grace.classList.remove('notation-event'); f.event.append(grace)
  for (const n of grace.querySelectorAll<SVGGraphicsElement>('text,path')) n.getBBox = () => { throw Error('Never measure attached grace') }
  const slash = document.createElementNS('http://www.w3.org/2000/svg', 'path'); slash.getBBox = () => { throw Error('Grace slash is not principal body') }; f.event.append(slash)
  expect(bounds(readPaletteEventInk(f.event, f.context))).toEqual([99, 190, 13, 80])
  expect(f.measureText).toHaveBeenCalledTimes(3)
})
it('frames a real rest glyph without requiring a stem', () => {
  const f = fixture(); f.stem.parentElement!.remove(); f.head.textContent = '\ue4e5'
  expect(bounds(readPaletteEventInk(f.event, f.context))).toEqual([100, 190, 12, 15])
})
it('maps all four ink corners through fixed zoom, translation and rotation', () => {
  const f = fixture(); f.svg.getScreenCTM = () => ({ a: 0, b: 2, c: -2, d: 0, e: 500, f: 10 } as DOMMatrix)
  expect(bounds(readPaletteEventInk(f.event, f.context))).toEqual([90, 210, 92, 24])
})
it.each(['no-context', 'no-matrix', 'nonfinite-matrix', 'hidden', 'preview', 'disconnected', 'not-event', 'no-ink'] as const)('omits an unmeasurable frame instead of inventing bounds: %s', reason => {
  const f = fixture()
  if (reason === 'no-matrix') f.svg.getScreenCTM = () => null
  if (reason === 'nonfinite-matrix') f.svg.getScreenCTM = () => ({ a: NaN } as DOMMatrix)
  if (reason === 'hidden') f.event.style.opacity = '0'
  if (reason === 'preview') f.event.classList.add('is-preview')
  if (reason === 'disconnected') f.host.remove()
  if (reason === 'not-event') f.event.classList.remove('notation-event')
  if (reason === 'no-ink') { f.head.style.fill = 'none'; f.stem.style.stroke = 'none' }
  expect(readPaletteEventInk(f.event, reason === 'no-context' ? null : f.context)).toBeUndefined()
})
