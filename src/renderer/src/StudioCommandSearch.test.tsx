// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioCommandSearch } from './StudioCommandSearch'
beforeEach(()=>{Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.setAttribute('open','')}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.removeAttribute('open')}})})
afterEach(()=>cleanup())
it('finds grouped commands, skips disabled results and leaves native button activation single',async()=>{
  const onRun=vi.fn(),onClose=vi.fn()
  render(<StudioCommandSearch theme="light" onRun={onRun} onClose={onClose} menus={[{id:'file',label:'파일',commands:[
    {id:'save',label:'저장',disabled:true,onSelect:vi.fn()}, {id:'open',label:'열기',onSelect:vi.fn()},
    {id:'view',label:'보기',checked:true,onSelect:vi.fn()}
  ]}]}/>)
  const input=screen.getByRole('searchbox',{name:'명령 찾기'})
  await waitFor(()=>expect(input).toHaveFocus())
  fireEvent.keyDown(input,{key:'ArrowDown'});expect(screen.getByRole('button',{name:'파일 · 열기'})).toHaveFocus()
  fireEvent.keyDown(document.activeElement!,{key:'End'});expect(screen.getByRole('button',{name:'파일 · 보기'})).toHaveFocus()
  expect(document.activeElement).toHaveAttribute('aria-pressed','true')
  fireEvent.click(document.activeElement!);expect(onRun).toHaveBeenCalledExactlyOnceWith('file:view')
  fireEvent.change(input,{target:{value:'파일 저장'}})
  expect(screen.getByRole('button',{name:'파일 · 저장'})).toBeDisabled()
  fireEvent.keyDown(input,{key:'Enter'});expect(onRun).toHaveBeenCalledTimes(1)
  fireEvent.change(input,{target:{value:'없는 명령'}});expect(screen.getByText('일치하는 명령이 없습니다.')).toBeInTheDocument()
  fireEvent.keyDown(input,{key:'Enter'});expect(onRun).toHaveBeenCalledTimes(1)
})
it('suppresses Enter/Escape throughout a composition session, including missing native flags',()=>{
  const onRun=vi.fn(),onClose=vi.fn()
  render(<StudioCommandSearch theme="dark" onRun={onRun} onClose={onClose} menus={[{id:'edit',label:'편집',commands:[{id:'undo',label:'실행 취소',onSelect:vi.fn()}]}]}/>)
  const input=screen.getByRole('searchbox',{name:'명령 찾기'})
  fireEvent.compositionStart(input)
  for(const key of ['Enter','Escape'])fireEvent.keyDown(input,{key})
  expect(onRun).not.toHaveBeenCalled();expect(onClose).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Enter'})
  expect(onRun).toHaveBeenCalledExactlyOnceWith('edit:undo')
})


it.each(['initial', 'first-result'] as const)('keeps %s keyboard destination while initial focus is queued', target => {
  const frames = new Map<number, FrameRequestCallback>(); let next = 0
  const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  // Chromium showModal focuses the first close button before the parent's
  // initial-focus effect. Match that browser contract rather than timing sleeps.
  const modal = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function(this: HTMLDialogElement) {
    this.setAttribute('open', ''); this.querySelector<HTMLButtonElement>('button')?.focus()
  })
  try {
    const onRun = vi.fn(), onClose = vi.fn()
    render(<StudioCommandSearch theme="light" onRun={onRun} onClose={onClose} menus={[{id:'file',label:'파일',commands:[
      {id:'save',label:'저장',disabled:true,onSelect:vi.fn()}, {id:'open',label:'열기',onSelect:vi.fn()}
    ]}]} />)
    const input = screen.getByRole('searchbox', { name: '명령 찾기' })
    const close = screen.getByRole('button', { name: '닫기' })
    expect(close).toHaveFocus()
    if (target === 'first-result') fireEvent.keyDown(close, { key: 'ArrowDown' })
    const destination = target === 'initial' ? input : screen.getByRole('button', { name: '파일 · 열기' })
    if (target === 'first-result') expect(destination).toHaveFocus()
    act(() => { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(performance.now()) })
    expect(destination).toHaveFocus()
    expect(onRun).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled()
  } finally { request.mockRestore(); cancel.mockRestore(); modal.mockRestore() }
})
