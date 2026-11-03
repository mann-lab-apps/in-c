// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioSelectedProperties } from './StudioSelectedProperties'

let frames: FrameRequestCallback[]
beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
})
afterEach(() => { cleanup(); flush(); vi.unstubAllGlobals() })
function flush() { act(() => { for (const frame of frames.splice(0)) frame(0) }) }
const base = { theme: 'light' as const, kind: 'event', identity: 'bar-one', rows: [], enabled: true,
  inputActive: false, measureScope: '마디 전체', locationScope: '첫 위치', dynamics: ['p', 'mf'] as const,
  dynamic: 'p' as const, onDynamic: () => {}, fields: [], technical: '' }
function view(identity: string, scope = 'document-one:score') {
  return <><StudioSelectedProperties {...base} identity={identity} dynamicListIdentity={`${scope}:${identity === 'bar-one-remounted' ? 'bar-one' : identity}`}
    historyFocusScope={scope} dynamicTarget={identity === 'bar-two' ? { id: 'restored', sequence: 1, focus: false, scope: '둘째 마디' } : undefined}/>
    <button>다른 도구</button><div data-testid="score">악보</div></>
}
function requestUndo() {
  const field = screen.getByRole('combobox', { name: '선택 마디 셈여림' })
  field.focus(); frames.length = 0
  fireEvent.keyDown(field, { key: 'z', code: 'KeyZ', ctrlKey: true })
}
it('restores the used field across a history-driven measure change in the same document/view', () => {
  const host = render(view('bar-one')); requestUndo(); host.rerender(view('bar-two'))
  expect(document.body).toHaveFocus(); flush()
  expect(screen.getByRole('combobox', { name: '선택 셈여림' })).toHaveFocus()
})
it.each(['document-two:score', 'document-one:part'])('does not pull focus across scope %s', scope => {
  const host = render(view('bar-one')); requestUndo(); host.rerender(view('bar-two', scope)); flush()
  expect(screen.getByRole('combobox', { name: '선택 셈여림' })).not.toHaveFocus()
})
it.each(['pointer','keyboard'])('does not restore an obsolete field after another %s interaction', interaction => {
  const host = render(view('bar-one')); requestUndo(); host.rerender(view('bar-one-remounted'))
  if(interaction==='pointer')fireEvent.pointerDown(screen.getByTestId('score'))
  else fireEvent.keyDown(document.body,{key:'ArrowRight',code:'ArrowRight'})
  flush()
  expect(screen.getByRole('combobox', { name: '선택 마디 셈여림' })).not.toHaveFocus()
})

it.each([
  { key:'z',ctrlKey:true },{ key:'Z',ctrlKey:true,shiftKey:true },
  { key:'z',metaKey:true },{ key:'Z',metaKey:true,shiftKey:true }
])('continues the same field history intent after a remount receives $key on BODY', shortcut => {
  const host=render(view('bar-one'));requestUndo();host.rerender(view('bar-two'))
  fireEvent.keyDown(document.body,{...shortcut,code:'KeyZ'});flush()
  expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveFocus()
})
it.each([
  { key:'z',code:'KeyZ',ctrlKey:true,isComposing:true },
  { key:'Process',code:'KeyZ',ctrlKey:true,keyCode:229 }
])('cancels pending field history during composition $key', shortcut=>{
  const host=render(view('bar-one'));requestUndo();host.rerender(view('bar-two'))
  fireEvent.keyDown(document.body,shortcut);flush()
  expect(screen.getByRole('combobox',{name:'선택 셈여림'})).not.toHaveFocus()
})
it.each(['pointer','keyboard'])('does not revive cancelled history after another %s interaction',interaction=>{
  const host=render(view('bar-one'));requestUndo();host.rerender(view('bar-two'))
  if(interaction==='pointer')fireEvent.pointerDown(screen.getByTestId('score'))
  else fireEvent.keyDown(document.body,{key:'ArrowRight',code:'ArrowRight'})
  fireEvent.keyDown(document.body,{key:'z',code:'KeyZ',ctrlKey:true});flush()
  expect(screen.getByRole('combobox',{name:'선택 셈여림'})).not.toHaveFocus()
})
it('does not take focus back after another control receives focus and is removed', () => {
  const host = render(view('bar-one')); requestUndo()
  const other = document.createElement('button'); other.textContent = '임시 도구'; document.body.append(other); other.focus()
  host.rerender(view('bar-one-remounted')); other.remove(); flush()
  expect(screen.getByRole('combobox', { name: '선택 마디 셈여림' })).not.toHaveFocus()
})
