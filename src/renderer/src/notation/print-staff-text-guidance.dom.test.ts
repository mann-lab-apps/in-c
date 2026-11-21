// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { planPngPages } from '../image-export/pages'
import { assertPrintPageInk, PrintPageInkError } from './print-page-ink'

function fixture(className: string, axis: 'horizontal' | 'vertical') {
  const root = document.createElement('div')
  root.innerHTML = '<div class="score-page"><div class="notation-preview"><svg><text style="font:13px serif;fill:black;stroke:none">긴 보표 글자</text><rect opacity="0" width="9000" height="9000"/></svg></div></div>'
  document.body.append(root)
  const host = root.querySelector<HTMLElement>('.score-page')!, svg = root.querySelector('svg')!
  const text = root.querySelector('text')!, hit = root.querySelector('rect')!
  text.setAttribute('class', className)
  text.setAttribute('data-measure-id', 'owned-measure')
  if (className === 'notation-rehearsal-mark') {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('class', className)
    group.setAttribute('data-print-measure-id', 'owned-measure')
    text.removeAttribute('class')
    text.removeAttribute('data-measure-id')
    text.parentElement!.insertBefore(group, text)
    group.append(text)
  }
  const rect = { left: -30000, top: 0, width: 750, height: 2300 } as DOMRect
  host.getBoundingClientRect = svg.getBoundingClientRect = () => rect
  Object.defineProperty(svg, 'viewBox', { value: { baseVal: { x: 0, y: 0, width: 750, height: 2300 } } })
  const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this }, multiply() { return this } } as unknown as DOMMatrix
  svg.getCTM = text.getCTM = hit.getCTM = () => identity
  text.getBBox = hit.getBBox = () => { throw Error('Font em or transparent hit cannot replace real ink') }
  const paper = { pageSize: 'a4' as const, orientation: 'portrait' as const, pageMarginMm: 8, staffSizePercent: 100, systemSpacingPercent: 100 }
  const pageHeight = planPngPages(rect, paper, 150).contentPageHeight
  // Horizontal values come from the actual 750px print snapshot, not its hit box.
  text.getStartPositionOfChar = () => ({ x: 110.9172418, y: axis === 'vertical' ? pageHeight + 3 : 240 } as DOMPoint)
  const context = { font: '', measureText: () => ({ actualBoundingBoxLeft: 0, actualBoundingBoxRight: axis === 'horizontal' ? 1075.8725302 : 70, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }) } as unknown as CanvasRenderingContext2D
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  const before = root.innerHTML
  return { root, svg, text, context, paper, pageHeight, before, cleanup() { canvas.mockRestore(); root.remove() } }
}

const editableTexts = [
  { className: 'notation-staff-text', kind: 'staff-text', label: '보표 글자' },
  { className: 'notation-system-text', kind: 'system-text', label: '시스템 텍스트' },
  { className: 'notation-expression-text', kind: 'expression-text', label: '표현 텍스트' },
  { className: 'notation-rehearsal-mark', kind: 'rehearsal-mark', label: '연습표' }
]
it.each(editableTexts.flatMap(text => (['horizontal', 'vertical'] as const).map(axis => ({ ...text, axis }))))(
  'guides a $label $axis overflow to its actual editable field', ({ className, kind, label, axis }) => {
  const f = fixture(className, axis)
  try {
    let error: unknown
    try { assertPrintPageInk(f.root, f.paper) } catch (caught) { error = caught }
    expect(error).toBeInstanceOf(PrintPageInkError)
    expect((error as PrintPageInkError).issue).toEqual(axis === 'horizontal'
      ? { axis: 'horizontal', page: 1, kind }
      : { afterPage: 1, kind })
    expect((error as Error).message).toContain(label)
    expect((error as Error).message).toContain('속성에서 문구')
    expect((error as Error).message).not.toMatch(/이동을 줄이거나|자동 배치로 되돌/)
    expect(() => assertPrintPageInk(f.root, f.paper, 3)).not.toThrow()
    expect(f.root.innerHTML).toBe(f.before)
  } finally { f.cleanup() }
})

it.each(['horizontal', 'vertical'] as const)('keeps rehearsal %s border ink separate from safe text and transparent hits', axis => {
  const f = fixture('notation-rehearsal-mark', axis)
  f.context.measureText = () => ({ actualBoundingBoxLeft: 0, actualBoundingBoxRight: 70, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }) as TextMetrics
  f.text.getStartPositionOfChar = () => ({ x: 100, y: axis === 'vertical' ? f.pageHeight - 6 : 83 } as DOMPoint)
  const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  border.setAttribute('style', 'stroke:black;stroke-width:1.5;fill:none')
  border.getCTM = f.svg.getCTM
  border.getBBox = () => ({ x: 22, y: axis === 'vertical' ? f.pageHeight - 23 : 66, width: axis === 'vertical' ? 200 : 814, height: 24 } as DOMRect)
  f.text.parentElement!.prepend(border)
  const before = f.root.innerHTML
  try {
    let error: unknown
    try { assertPrintPageInk(f.root, f.paper) } catch (caught) { error = caught }
    expect(error).toBeInstanceOf(PrintPageInkError)
    expect((error as PrintPageInkError).issue).toEqual(axis === 'horizontal'
      ? { axis: 'horizontal', page: 1, kind: 'rehearsal-mark' }
      : { afterPage: 1, kind: 'rehearsal-mark' })
    expect((error as Error).message).toContain('연습표')
    expect((error as Error).message).toContain('속성에서 문구')
    expect(() => assertPrintPageInk(f.root, f.paper, 3)).not.toThrow()
    expect(f.root.innerHTML).toBe(before)
  } finally { f.cleanup() }
})

it.each([
  { className: 'notation-span-label', kind: 'symbol', action: '표기의 가로 이동을 줄이거나 자동 배치로 되돌린 뒤' },
  { className: 'notation-staff-label', kind: 'part-label', action: '형식 > 악보 설정에서 파트 이름·약어를 줄인 뒤' }
])('preserves the existing $kind guidance and measured boundary', ({ className, kind, action }) => {
  const f = fixture(className, 'horizontal')
  try {
    let error: unknown
    try { assertPrintPageInk(f.root, f.paper) } catch (caught) { error = caught }
    expect(error).toBeInstanceOf(PrintPageInkError)
    expect((error as PrintPageInkError).issue).toEqual({ axis: 'horizontal', page: 1, kind })
    expect((error as Error).message).toContain(action)
    expect(f.root.innerHTML).toBe(f.before)
  } finally { f.cleanup() }
})
