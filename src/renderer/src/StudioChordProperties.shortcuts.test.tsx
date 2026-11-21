// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, afterEach, expect, it, vi } from 'vitest'
import { StudioChordProperties } from './StudioChordProperties'
const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
afterAll(() => {
  if (show) Object.defineProperty(HTMLElement.prototype, 'showPopover', show)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  if (hide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hide)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})
afterEach(cleanup)
it('shows the currently implemented pitch shortcuts, not the superseded Alt octave mapping', () => {
  render(<StudioChordProperties theme="light" pitches={['C4']} pitchEnabled onMove={vi.fn()} onRespell={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} />)
  for (const [name, shortcut] of [['음높이 한 칸 올리기', 'Alt/Option+Shift+↑'], ['한 옥타브 올리기', 'Cmd/Ctrl+↑']]) {
    const wrap = screen.getByRole('button', { name }).closest('.dd-tooltip-wrap')!
    fireEvent.mouseEnter(wrap)
    expect(screen.getByRole('tooltip')).toHaveTextContent(shortcut)
    fireEvent.mouseLeave(wrap)
  }
})
