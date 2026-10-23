// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModalBackdrop } from './ModalBackdrop'

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 40, 32)] as unknown as DOMRectList)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('product modal keyboard boundary', () => {
  it('wraps Tab both ways and ignores disabled and hidden controls', () => {
    render(<ModalBackdrop onDismiss={vi.fn()}><section role="dialog">
      <button disabled>Disabled</button><button hidden>Hidden</button>
      <input aria-label="First" /><button>Last</button>
    </section></ModalBackdrop>)
    const first = screen.getByLabelText('First'), last = screen.getByRole('button', { name: 'Last' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()
  })
  it('keeps child autofocus rather than jumping to the first control', () => {
    render(<ModalBackdrop onDismiss={vi.fn()}><button>Before</button><input autoFocus aria-label="Target" /></ModalBackdrop>)
    expect(screen.getByLabelText('Target')).toHaveFocus()
  })
  it('isolates score shortcuts and does not dismiss during IME composition', () => {
    const key = vi.fn(), dismiss = vi.fn()
    render(<div onKeyDown={key}><ModalBackdrop onDismiss={dismiss}><input aria-label="Draft" /></ModalBackdrop></div>)
    const input = screen.getByLabelText('Draft')
    fireEvent.keyDown(input, { key: 'n' })
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(key).not.toHaveBeenCalled()
    expect(dismiss).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(dismiss).toHaveBeenCalledOnce()
  })
  it('keeps a dialog without active controls focused', () => {
    render(<ModalBackdrop onDismiss={vi.fn()}><button disabled>Unavailable</button></ModalBackdrop>)
    const root = screen.getByRole('presentation')
    expect(root).toHaveFocus()
    fireEvent.keyDown(root, { key: 'Tab' })
    expect(root).toHaveFocus()
  })
  it('does not run nested commands while composing Korean text', () => {
    const command = vi.fn()
    render(<ModalBackdrop onDismiss={vi.fn()}><input aria-label="Search" onKeyDown={command} /></ModalBackdrop>)
    const input = screen.getByLabelText('Search')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(command).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(command).toHaveBeenCalledOnce()
  })
  it('restores a persistent opener when closed', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = render(<ModalBackdrop onDismiss={vi.fn()}><button>Inside</button></ModalBackdrop>)
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
  it('restores the menu trigger when the initiating item disappears', () => {
    const trigger = document.createElement('button'), menu = document.createElement('div'), item = document.createElement('button')
    menu.id = 'temporary-menu'
    menu.setAttribute('role', 'menu')
    trigger.setAttribute('aria-controls', menu.id)
    menu.append(item)
    document.body.append(trigger, menu)
    item.focus()
    const { unmount } = render(<ModalBackdrop onDismiss={vi.fn()}><button>Inside</button></ModalBackdrop>)
    menu.remove()
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
  it('restores an explicit opener after an async request temporarily disables it', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.disabled = true
    const { unmount } = render(<ModalBackdrop restoreFocusTo={opener} onDismiss={vi.fn()}><button>Inside</button></ModalBackdrop>)
    opener.disabled = false
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
