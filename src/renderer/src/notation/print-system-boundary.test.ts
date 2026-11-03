// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { assertPrintPageInk, PrintPageInkError } from './print-page-ink'

it.each([1, 2])('blocks an oversized measured system at scale %i while keeping unrelated selected pages printable', scale => {
 const root = document.createElement('div')
 root.innerHTML = '<div class="score-page"><div class="notation-preview"><svg><g class="vf-stave" data-measure-id="a"><path style="fill:black;stroke:none"/></g><g class="vf-stave" data-measure-id="b"><path style="fill:black;stroke:none"/></g><g class="vf-stave" data-measure-id="c"><path style="fill:black;stroke:none"/></g><rect opacity="0" width="900" height="900"/></svg></div></div>'
 document.body.append(root)
 const host = root.querySelector<HTMLElement>('.score-page')!, svg = root.querySelector('svg')!
 const paths = [...svg.querySelectorAll('path')], hit = svg.querySelector('rect')!
 host.getBoundingClientRect = () => ({ left: -30000, top: 0, width: 190, height: 900 } as DOMRect)
 svg.getBoundingClientRect = () => ({ left: -30000, top: 0, width: 190 * scale, height: 900 } as DOMRect)
 Object.defineProperty(svg, 'viewBox', { value: { baseVal: { x: 0, y: -20, width: 190, height: 900 } } })
 const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this }, multiply() { return this } } as unknown as DOMMatrix
 svg.getCTM = hit.getCTM = () => identity
 paths.forEach((path, index) => {
  path.getCTM = () => identity
  // Each staff is individually safe; the first two belong to the same
  // system and are too far apart to fit on one physical content page.
  path.getBBox = () => ({ x: 10 / scale, y: [20, 320, 620][index] / scale, width: 150 / scale, height: 40 / scale } as DOMRect)
 })
 hit.getBBox = () => { throw Error('Transparent hit bounds are not system ink') }
 svg.setAttribute('data-print-system-origins', '[[0,0],[1,600]]')
 svg.setAttribute('data-print-measure-systems', '[["a",0],["b",0],["c",1]]')
 const paper = { pageSize: 'a4' as const, orientation: 'portrait' as const, pageMarginMm: 10, staffSizePercent: 100, systemSpacingPercent: 100 }
 const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
 const before = root.innerHTML
 try {
  for (const page of ['all', 1, 2] as const) {
   let error: unknown
   try { assertPrintPageInk(root, paper, page) } catch (caught) { error = caught }
   expect(error).toBeInstanceOf(PrintPageInkError)
   expect((error as PrintPageInkError).issue).toMatchObject({ kind: 'system', systemIndex: 0 })
   expect((error as Error).message).toContain('1번째 악보단')
   expect((error as Error).message).toContain('파트보')
  }
  expect(() => assertPrintPageInk(root, paper, 3)).not.toThrow()
  expect(root.innerHTML).toBe(before)
  // Distinct short systems are valid over several pages; source ownership,
  // not the SVG's total reserved height, determines the rejection.
  svg.setAttribute('data-print-system-origins', '[[0,0],[1,300],[2,600]]')
  svg.setAttribute('data-print-measure-systems', '[["a",0],["b",1],["c",2]]')
  expect(() => assertPrintPageInk(root, paper)).not.toThrow()
  // Legacy snapshots without ownership metadata retain the existing per-ink
  // guard, rather than crashing or inventing a system identity.
  svg.removeAttribute('data-print-measure-systems')
  expect(() => assertPrintPageInk(root, paper)).not.toThrow()
 } finally { canvas.mockRestore(); root.remove() }
})
