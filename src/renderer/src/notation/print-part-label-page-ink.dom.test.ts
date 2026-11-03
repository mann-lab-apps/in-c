// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { assertPrintPageInk, PrintPageInkError } from './print-page-ink'
import * as inkReaders from './staff-ink-spacing'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })
function fixture(shape = false) {
  const root = document.createElement('div')
  root.innerHTML = '<div class="score-page"><div class="notation-preview"><svg/></div></div>'
  document.body.append(root)
  const host = root.querySelector<HTMLElement>('.score-page')!, svg = root.querySelector('svg')!
  const width = 750, height = width * (297 - 16) / (210 - 16)
  host.getBoundingClientRect = svg.getBoundingClientRect = () => ({ top: 0, left: 0, width, height: height * 4 }) as DOMRect
  Object.defineProperty(svg, 'viewBox', { value: { baseVal: { x: 0, y: 0, width, height: height * 4 } } })
  svg.getCTM = () => ({}) as DOMMatrix
  svg.innerHTML = shape ? '<path class="notation-slur"/>' : '<text class="notation-staff-label" data-part-id="part" data-staff-id="staff" data-system-index="0"/>'
  if (!shape) svg.querySelector('text')!.textContent = '가'.repeat(80)
  let ink = { x: 12, y: 100, width: 960, height: 13 }
  // Ownership/copy oracle only. Actual Korean glyph width is proved in Electron.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  vi.spyOn(inkReaders, 'readSvgTextInk').mockImplementation(() => ink)
  vi.spyOn(inkReaders, 'readSvgShapeInk').mockImplementation(() => ink)
  const paper = { pageSize: 'a4' as const, orientation: 'portrait' as const, pageMarginMm: 8, staffSizePercent: 100, systemSpacingPercent: 100 }
  const error = () => {
    try { assertPrintPageInk(root, paper) } catch (error) { return error as PrintPageInkError }
    throw Error('Expected measured output rejection')
  }
  return { root, paper, height, error, setInk: (next: typeof ink) => { ink = next } }
}

it('identifies horizontal part-name ink and directs correction to real part settings', () => {
  const f = fixture(), before = f.root.innerHTML, error = f.error()
  expect(error).toBeInstanceOf(PrintPageInkError)
  expect(error.issue).toEqual({ kind: 'part-label', axis: 'horizontal', page: 1 })
  expect(error.message).toContain('파트 이름·약어')
  expect(error.message).toContain('형식 > 악보 설정')
  expect(error.message).not.toContain('표기의 가로 이동')
  expect(f.root.innerHTML).toBe(before)
})

it('uses the same text correction path for a part label split by a physical page boundary', () => {
  const f = fixture()
  f.setInk({ x: 12, y: f.height - 4, width: 100, height: 13 })
  const error = f.error()
  expect(error.issue).toEqual({ kind: 'part-label', afterPage: 1 })
  expect(error.message).toContain('형식 > 악보 설정')
})

it('retains a safe selected page when only another page has an oversized name', () => {
  const f = fixture(), before = f.root.innerHTML
  expect(() => assertPrintPageInk(f.root, f.paper, 2)).not.toThrow()
  expect(f.root.innerHTML).toBe(before)
})

it('retains the engraving correction path for an actual manual shape', () => {
  const f = fixture(true), error = f.error()
  expect(error.issue).toEqual({ kind: 'symbol', axis: 'horizontal', page: 1 })
  expect(error.message).toContain('표기의 가로 이동')
})
