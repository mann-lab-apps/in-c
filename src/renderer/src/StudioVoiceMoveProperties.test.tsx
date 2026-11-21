// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioVoiceMoveProperties } from './StudioVoiceMoveProperties'
const originals = ['showPopover', 'hidePopover'].map(name => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const)
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'none' } })
})
afterEach(() => {
  cleanup()
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLElement.prototype, name)
  }
})
const plans = [1, 2, 3, 4].map(n => ({ value: `voice-${n}`, label: `${n}성부` }))
it('discards an uncommitted target candidate when the selected owner changes', () => {
  const move = vi.fn(), props = { identity: 'document-a:note-a', sourceVoice: 'voice-1', plans, onMove: move }
  const view = render(<StudioVoiceMoveProperties {...props} />)
  const old = screen.getByRole('combobox', { name: '옮길 성부' })
  fireEvent.click(old); fireEvent.keyDown(old, { key: 'ArrowDown' })
  expect(old).toHaveTextContent('2성부'); expect(move).not.toHaveBeenCalled()
  view.rerender(<StudioVoiceMoveProperties {...props} identity="document-b:note-b" />)
  const current = screen.getByRole('combobox', { name: '옮길 성부' })
  fireEvent.keyDown(current, { key: 'Tab' })
  expect(current).toHaveTextContent('2성부'); expect(current).toHaveAttribute('aria-expanded', 'false')
  expect(move).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' }))
  expect(move).toHaveBeenCalledExactlyOnceWith('voice-2')
})
it('retains an uncommitted candidate for the same owner and requires the separate explicit move', () => {
  const move = vi.fn(), props = { identity: 'document-a:note-a', sourceVoice: 'voice-1', plans, onMove: move }
  const view = render(<StudioVoiceMoveProperties {...props} />)
  const select = screen.getByRole('combobox', { name: '옮길 성부' })
  fireEvent.click(select); fireEvent.keyDown(select, { key: 'ArrowDown' })
  view.rerender(<StudioVoiceMoveProperties {...props} plans={[...plans]} />)
  fireEvent.keyDown(select, { key: 'Tab' })
  expect(select).toHaveTextContent('3성부'); expect(move).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' }))
  expect(move).toHaveBeenCalledExactlyOnceWith('voice-3')
})
it('discards an old target choice when a new selected object/document owns the controls', () => {
  const move = vi.fn(), props = { identity: 'document-a:note-a', sourceVoice: 'voice-1', plans, onMove: move }
  const view = render(<StudioVoiceMoveProperties {...props} />)
  fireEvent.click(screen.getByRole('combobox', { name: '옮길 성부' })); fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '4성부' }))
  expect(move).not.toHaveBeenCalled(); expect(screen.getByRole('combobox')).toHaveTextContent('4성부')
  view.rerender(<StudioVoiceMoveProperties {...props} identity="document-b:note-b" />)
  expect(screen.getByRole('combobox')).toHaveTextContent('2성부')
  fireEvent.click(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' })); expect(move).toHaveBeenCalledExactlyOnceWith('voice-2')
})
it('blocks composed confirmation/global keys while retaining ordinary history modifiers', () => {
  const move = vi.fn(), global = vi.fn(); window.addEventListener('keydown', global)
  try {
    render(<StudioVoiceMoveProperties identity="one" sourceVoice="voice-1" plans={plans} onMove={move} />)
    const select = screen.getByRole('combobox'), apply = screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' })
    fireEvent.compositionStart(select); fireEvent.keyDown(select, { key: 'Enter', isComposing: true, keyCode: 229 }); fireEvent.click(apply)
    expect(move).not.toHaveBeenCalled(); expect(global).not.toHaveBeenCalled()
    fireEvent.compositionEnd(select); fireEvent.keyDown(apply, { key: ' ', code: 'Space' }); expect(global).not.toHaveBeenCalled()
    fireEvent.keyDown(apply, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(global).toHaveBeenCalledOnce()
    fireEvent.click(apply); expect(move).toHaveBeenCalledExactlyOnceWith('voice-2')
  } finally { window.removeEventListener('keydown', global) }
})
