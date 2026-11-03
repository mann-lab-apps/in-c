import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { Button, Tooltip } from './index'

const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
const fromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
afterEach(() => {
  cleanup(); vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (fromPoint) Object.defineProperty(document, 'elementFromPoint', fromPoint)
  else delete (document as Partial<Document>).elementFromPoint
})
afterAll(() => {
  if (show) Object.defineProperty(HTMLElement.prototype, 'showPopover', show)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  if (hide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hide)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})

function setup(position: 'fixed' | 'sticky', mode: 'focus' | 'pointer' = 'focus') {
  render(<><Tooltip text="Existing command guidance"><Button onClick={() => {}}>Command</Button></Tooltip>
    <div data-testid="overlay" style={{ position }}><span data-testid="cover">Status</span></div></>)
  const button = screen.getByRole('button'), host = button.closest<HTMLElement>('.dd-tooltip-wrap')!
  const overlay = screen.getByTestId('overlay'), cover = screen.getByTestId('cover')
  const bounds = vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 48, 32))
  vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 300, 400, 200))
  let occluded = false
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn((_x: number, y: number) => occluded && y >= 300 && y <= 500 ? cover : button) })
  if (mode === 'focus') fireEvent.focus(button)
  else fireEvent.mouseEnter(host)
  expect(screen.getByRole('tooltip').textContent).toBe('Existing command guidance')
  return { button, host, overlay, bounds, cover: () => { occluded = true } }
}

it.each([
  ['fixed', 'focus'], ['sticky', 'focus'], ['fixed', 'pointer'], ['sticky', 'pointer']
] as const)('dismisses a %s-covered %s tooltip while its owner remains inside the viewport', (position, mode) => {
  const { bounds, cover } = setup(position, mode)
  bounds.mockReturnValue(new DOMRect(40, 360, 48, 32)); cover(); fireEvent.scroll(window)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('keeps guidance for the visible portion of a partly covered owner', () => {
  const { bounds, cover } = setup('sticky')
  bounds.mockReturnValue(new DOMRect(40, 280, 48, 32)); cover(); fireEvent.scroll(window)
  expect(screen.getByRole('tooltip')).toBeTruthy()
})

it('does not infer occlusion from overlapping rectangles without a covering hit', () => {
  const { bounds } = setup('fixed')
  bounds.mockReturnValue(new DOMRect(40, 360, 48, 32)); fireEvent.scroll(window)
  expect(screen.getByRole('tooltip')).toBeTruthy()
})

it('keeps a tooltip inside its own fixed surface', () => {
  render(<div data-testid="surface" style={{ position: 'fixed' }}><Tooltip text="Owned surface guidance"><Button onClick={() => {}}>Command</Button></Tooltip></div>)
  const button = screen.getByRole('button'), host = button.closest<HTMLElement>('.dd-tooltip-wrap')!, surface = screen.getByTestId('surface')
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 360, 48, 32))
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 300, 400, 200))
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => button) })
  fireEvent.focus(button); fireEvent.scroll(window)
  expect(screen.getByRole('tooltip')).toBeTruthy()
})

function layoutResizeSource() {
  const observers: FakeResizeObserver[] = []
  class FakeResizeObserver {
    targets = new Set<Element>()
    constructor(readonly callback: ResizeObserverCallback) { observers.push(this) }
    observe(target: Element) { this.targets.add(target) }
    unobserve(target: Element) { this.targets.delete(target) }
    disconnect() { this.targets.clear() }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  return (target: Element) => act(() => {
    for (const observer of observers) if (observer.targets.has(target)) {
      observer.callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], observer as unknown as ResizeObserver)
    }
  })
}

it.each(['fixed', 'sticky'] as const)('dismisses new %s coverage after a document layout resize without scrolling', position => {
  const resize = layoutResizeSource(), { bounds, cover } = setup(position)
  bounds.mockReturnValue(new DOMRect(40, 360, 48, 32)); cover()
  resize(document.body)
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('keeps a visible owner guidance after unrelated document layout resizing', () => {
  const resize = layoutResizeSource()
  setup('sticky'); resize(document.body)
  expect(screen.getByRole('tooltip')).toBeTruthy()
})
