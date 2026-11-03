// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioInputTarget } from './StudioInputTarget'

afterEach(cleanup)
// jsdom has no top-layer layout. Real geometry is tested separately in Electron.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true,
    value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})

describe('studio.input-target status and navigation', () => {
  it('shows a sole staff as readable status without a non-actionable selector', () => {
    const onStaff = vi.fn(), onVoice = vi.fn()
    const props = { staffOptions: [{ value: 'part:staff', label: '멜로디 · Melody' }],
      staff: 'part:staff', voice: 1, enabled: true, inputActive: false, onStaff, onVoice }
    const view = render(<StudioInputTarget {...props} />)
    expect(screen.queryByRole('combobox', { name: '입력 보표' })).toBeNull()
    expect(screen.getByRole('status', { name: '입력 보표' })).toHaveTextContent('멜로디 · Melody')
    const voices = within(screen.getByRole('group', { name: '입력 성부' }))
    const one = voices.getByRole('button', { name: '1성부' })
    one.focus(); fireEvent.keyDown(one, { key: 'ArrowRight' })
    expect(voices.getByRole('button', { name: '2성부' })).toHaveFocus()
    expect(onVoice).not.toHaveBeenCalled()
    fireEvent.click(voices.getByRole('button', { name: '2성부' }))
    expect(onVoice).toHaveBeenCalledExactlyOnceWith(2)
    view.rerender(<StudioInputTarget {...props} enabled={false} />)
    expect(screen.getByRole('status', { name: '입력 보표' })).toHaveTextContent('멜로디 · Melody')
    expect(voices.getByRole('button', { name: '2성부' })).toBeDisabled()
    expect(onStaff).not.toHaveBeenCalled()
  })

  it('keeps the real public selector and cancellation when multiple staves are available', () => {
    const onStaff = vi.fn(), onVoice = vi.fn()
    const props = { staffOptions: [{ value: 'one', label: '피아노 · 높은음자리 보표' },
      { value: 'two', label: '피아노 · 낮은음자리 보표' }], staff: 'one', voice: 1,
      enabled: true, inputActive: true, onStaff, onVoice }
    const view = render(<StudioInputTarget {...props} />)
    const staff = screen.getByRole('combobox', { name: '입력 보표' })
    expect(staff).toHaveClass('dd-select'); expect(staff).toBeEnabled()
    staff.focus(); fireEvent.keyDown(staff, { key: 'ArrowDown' })
    fireEvent.keyDown(staff, { key: 'End' }); fireEvent.keyDown(staff, { key: 'Escape' })
    expect(staff).toHaveFocus(); expect(onStaff).not.toHaveBeenCalled()
    fireEvent.click(staff)
    fireEvent.click(screen.getByRole('option', { name: '피아노 · 낮은음자리 보표' }))
    expect(onStaff).toHaveBeenCalledExactlyOnceWith('two')
    view.rerender(<StudioInputTarget {...props} enabled={false} />)
    expect(staff).toBeDisabled()
    expect(onVoice).not.toHaveBeenCalled()
  })
})
