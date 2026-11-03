// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { measurePrintPageLayout, resolveMeasuredPrintLayout } from './measured-print-pages'

it('preserves an oversized manual system while fitting the following known system on a complete page', () => {
 const host = document.createElement('div')
 host.innerHTML = '<svg><g data-measure-id="large"><path style="fill:black;stroke:none"/></g><g data-measure-id="normal"><path style="fill:black;stroke:none"/></g></svg>'
 document.body.append(host)
 const svg = host.querySelector('svg')!, paths = [...svg.querySelectorAll('path')]
 const rect = { top: 0, width: 750, height: 3000 } as DOMRect
 host.getBoundingClientRect = svg.getBoundingClientRect = () => rect
 Object.defineProperty(svg, 'viewBox', { value: { baseVal: { x: 0, y: 0, width: 750, height: 3000 } } })
 const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this }, multiply() { return this } } as unknown as DOMMatrix
 svg.getCTM = () => identity
 const bands = [
  { systemIndex: 0, origin: 180, top: 125, bottom: 1406.0700439453124 },
  { systemIndex: 1, origin: 1300.18, top: 1326.2601737976074, bottom: 2273.7901039123535 }
 ]
 paths.forEach((p, i) => { p.getCTM = () => identity;p.getBBox = () => ({ x: 50, y: bands[i].top, width: 650, height: bands[i].bottom - bands[i].top } as DOMRect) })
 const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
 Object.defineProperty(document, 'fonts', { configurable: true, value: {} })
 const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
 const paper = { pageSize: 'a4' as const, orientation: 'portrait' as const, pageMarginMm: 8, staffSizePercent: 100, systemSpacingPercent: 100 }
 const pageHeight = 750 * (297-16) / (210-16)
 try {
  const before = host.innerHTML, original = structuredClone(bands)
  // Keep the original strict planner's conservative all-or-nothing contract.
  expect(resolveMeasuredPrintLayout(bands, { origin: 0, height: pageHeight, headerBottom: 0 })).toBeUndefined()
  const result = measurePrintPageLayout(svg, host, null, new Map(bands.map(b => [b.systemIndex, b.origin])), new Map([['large', 0], ['normal', 1]]), new Set([1]), paper)
  expect(result.unknown).toBe(0)
  expect(result.layout).toBeDefined()
  expect(result.layout!.origins.get(0)).toBe(180)
  const shift = result.layout!.origins.get(1)! - bands[1].origin
  expect(shift).toBeGreaterThan(0)
  expect(bands[1].top + shift).toBeCloseTo(pageHeight*2+8)
  expect(bands[1].bottom + shift).toBeLessThan(pageHeight*3-8)
  expect(result.layout!.height).toBeGreaterThan(bands[1].bottom + shift)
  expect(host.innerHTML).toBe(before);expect(bands).toEqual(original)
  // The real renderer repaints with these origins. A subsequent measurement
  // must retain the same plan instead of resetting to the split placement.
  paths[1].getBBox = () => ({ x: 50, y: bands[1].top+shift, width: 650, height: bands[1].bottom-bands[1].top } as DOMRect)
  expect(measurePrintPageLayout(svg, host, null, result.layout!.origins, new Map([['large', 0], ['normal', 1]]), new Set([1]), paper, result.layout).layout).toBe(result.layout)
  // Missing ownership must still disable repair rather than move unknown paint.
  paths[1].parentElement!.removeAttribute('data-measure-id')
  expect(measurePrintPageLayout(svg, host, null, new Map(bands.map(b => [b.systemIndex, b.origin])), new Map([['large', 0], ['normal', 1]]), new Set([1]), paper).layout).toBeUndefined()
 } finally {
  canvas.mockRestore();host.remove()
  if (fonts) Object.defineProperty(document, 'fonts', fonts)
  else Reflect.deleteProperty(document, 'fonts')
 }
})
