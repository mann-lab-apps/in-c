import React, { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Button, Popover, Select, Tooltip } from './index'

const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const hide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
afterAll(() => {
  if (show) Object.defineProperty(HTMLElement.prototype, 'showPopover', show)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  if (hide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', hide)
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})

describe('Tooltip lifetime and ownership', () => {
  it.each(['listbox', 'menu'] as const)('yields background guidance and the first Escape to a new %s', async kind => {
    const change = vi.fn()
    function Controls() {
      const [open, setOpen] = useState(false)
      return <>
        <Tooltip text="임시표 안내"><Button onClick={() => {}}>플랫</Button></Tooltip>
        {kind === 'listbox'
          ? <Select label="악보 보기" value="score" options={[{ value: 'score', label: '총보' }, { value: 'part', label: '파트보' }]} onChange={change}/>
          : <Popover label="보기" open={open} onOpenChange={setOpen} menu><button role="menuitem">총보·파트보 보기</button></Popover>}
      </>
    }
    render(<Controls />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: '플랫' }).closest('.dd-tooltip-wrap')!)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    const trigger = kind === 'listbox' ? screen.getByRole('combobox') : screen.getByRole('button', { name: '보기' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // A newly opened surface owns Escape even before observer delivery.
    fireEvent.keyDown(kind === 'listbox' ? trigger : screen.getByRole('menuitem'), { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
    expect(change).not.toHaveBeenCalled()
  })

  it('keeps guidance inside the foreground menu as its own Escape layer', () => {
    function Menu() {
      const [open, setOpen] = useState(true)
      return <Popover label="보기" open={open} onOpenChange={setOpen} menu>
        <Tooltip text="파트 보기 안내"><Button role="menuitem" onClick={() => {}}>파트 보기</Button></Tooltip>
      </Popover>
    }
    render(<Menu />)
    const item = screen.getByRole('menuitem')
    fireEvent.focus(item)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(item, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('button', { name: '보기' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(item, { key: 'Escape' })
    expect(screen.getByRole('button', { name: '보기' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('yields background guidance and Escape to a newly opened modal', async () => {
    const close = vi.fn()
    const content = (modal: boolean) => <>
      <Tooltip text="백업 안내"><Button onClick={() => {}}>백업</Button></Tooltip>
      {modal && <dialog open aria-label="백업 선택" onKeyDown={close}>복구 목록</dialog>}
    </>
    const view = render(content(false))
    act(() => screen.getByRole('button').focus())
    expect(screen.getByRole('tooltip')).toBeTruthy()
    view.rerender(content(true))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
  })

  it('dismisses background guidance on modal opening without a key and keeps in-modal guidance', async () => {
    const close = vi.fn()
    const view = render(<Tooltip text="배경 안내"><Button onClick={() => {}}>배경</Button></Tooltip>)
    fireEvent.mouseEnter(screen.getByRole('button').closest('.dd-tooltip-wrap')!)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    const modal = document.createElement('dialog')
    modal.setAttribute('open', '')
    document.body.append(modal)
    try { await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull()) }
    finally { modal.remove(); view.unmount() }
    render(<dialog open onKeyDown={close}><Tooltip text="복구 안내"><Button onClick={() => {}}>복구</Button></Tooltip></dialog>)
    const button = screen.getByRole('button')
    act(() => button.focus())
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(close).not.toHaveBeenCalled()
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
  })

  it('replaces previous guidance when its readable text overlaps the next trigger', () => {
    render(<><Tooltip text="ff 안내"><Button onClick={() => {}}>ff</Button></Tooltip>
      <Tooltip text="p 안내"><Button onClick={() => {}}>p</Button></Tooltip></>)
    const ff = screen.getByRole('button', { name: 'ff' }), p = screen.getByRole('button', { name: 'p' })
    const host = ff.closest<HTMLElement>('.dd-tooltip-wrap')!
    fireEvent.mouseEnter(host)
    const first = screen.getByRole('tooltip')
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 150, 32, 32))
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 110, 160, 40))
    fireEvent.mouseLeave(host, { clientX: 50, clientY: 120 })
    fireEvent.mouseMove(window, { clientX: 50, clientY: 120 })
    // C30 permits reading the text while the pointer is in its geometry.
    expect(screen.getByRole('tooltip')).toBe(first)
    fireEvent.mouseEnter(p.closest('.dd-tooltip-wrap')!)
    expect(screen.getAllByRole('tooltip').map(n => n.textContent)).toEqual(['p 안내'])
    expect(ff.getAttribute('aria-describedby')).toBeNull()
    expect(p.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  })

  it('dismisses guidance on window focus loss without moving control focus', () => {
    render(<Tooltip text="재생 안내"><Button onClick={() => {}}>재생</Button></Tooltip>)
    const button = screen.getByRole('button')
    act(() => button.focus())
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.blur(window)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(button)
    expect(button.getAttribute('aria-describedby')).toBeNull()
  })

  it('removes the manual popover when its still-mounted trigger is collapsed', async () => {
    const content = (hidden: boolean) => <div hidden={hidden}>
      <Tooltip text="팔레트 안내"><Button onClick={() => {}}>표기</Button></Tooltip>
    </div>
    const view = render(content(false))
    fireEvent.focus(screen.getByRole('button'))
    const id = screen.getByRole('tooltip').id
    view.rerender(content(true))
    // Role visibility alone would hide the stale node in jsdom, unlike the
    // native manual top-layer popover. Verify its actual lifecycle removal.
    await waitFor(() => expect(document.getElementById(id)).toBeNull())
  })

  it('dismisses after scrolling the trigger out of view', () => {
    render(<Tooltip text="정지 안내"><Button onClick={() => {}}>정지</Button></Tooltip>)
    const button = screen.getByRole('button'), host = button.closest<HTMLElement>('.dd-tooltip-wrap')!
    const rect = vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 120, 32, 32))
    fireEvent.focus(button)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    rect.mockReturnValue(new DOMRect(40, -80, 32, 32))
    fireEvent.scroll(window)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('keeps a newer owner when an older trigger unmounts and Escape consumes only its own layer', () => {
    const globalEscape = vi.fn()
    const content = (old: boolean) => <div onKeyDown={globalEscape}>
      {old && <Tooltip text="이전 안내"><Button onClick={() => {}}>이전</Button></Tooltip>}
      <Tooltip text="현재 안내"><Button onClick={() => {}}>현재</Button></Tooltip>
    </div>
    const view = render(content(true))
    fireEvent.mouseEnter(screen.getByRole('button', { name: '이전' }).closest('.dd-tooltip-wrap')!)
    const current = screen.getByRole('button', { name: '현재' })
    act(() => current.focus())
    view.rerender(content(false))
    expect(screen.getByRole('tooltip').textContent).toBe('현재 안내')
    fireEvent.keyDown(current, { key: 'Escape' })
    expect(globalEscape).not.toHaveBeenCalled()
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(current)
    fireEvent.keyDown(current, { key: 'Escape' })
    expect(globalEscape).toHaveBeenCalledOnce()
  })

  it('does not consume the IME composition Escape as a tooltip dismissal', () => {
    render(<Tooltip text="입력 안내"><Button onClick={() => {}}>입력</Button></Tooltip>)
    const button = screen.getByRole('button')
    fireEvent.focus(button)
    const tip = screen.getByRole('tooltip')
    fireEvent.keyDown(button, { key: 'Escape', isComposing: true })
    expect(screen.getByRole('tooltip')).toBe(tip)
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes when an internal scroll clips the trigger while it remains inside the window', () => {
    // jsdom does not expand overflow shorthand into computed overflowY.
    // Native QA uses the real dock stylesheet and its browser-computed clip.
    render(<div data-testid="scroll" style={{ overflowY: 'auto', height: 100 }}>
      <Tooltip text="셈여림 안내"><Button onClick={() => {}}>p</Button></Tooltip>
    </div>)
    const container=screen.getByTestId('scroll'),button=screen.getByRole('button')
    const host=button.closest<HTMLElement>('.dd-tooltip-wrap')!
    vi.spyOn(container,'getBoundingClientRect').mockReturnValue(new DOMRect(20,100,200,100))
    const bounds=vi.spyOn(host,'getBoundingClientRect').mockReturnValue(new DOMRect(40,120,32,32))
    fireEvent.focus(button)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    bounds.mockReturnValue(new DOMRect(40,50,32,32))
    fireEvent.scroll(container)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('dismisses pointer guidance with Escape even when keyboard focus is elsewhere', () => {
    const command=vi.fn()
    render(<div onKeyDown={command}><Button onClick={()=>{}}>악보</Button>
      <Tooltip text="음표 안내"><Button onClick={()=>{}}>음표</Button></Tooltip></div>)
    const score=screen.getByRole('button',{name:'악보'})
    act(()=>score.focus())
    fireEvent.mouseEnter(screen.getByRole('button',{name:'음표'}).closest('.dd-tooltip-wrap')!)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(score,{key:'Escape'})
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(score)
    expect(command).not.toHaveBeenCalled()
  })
})
