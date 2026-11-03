// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioSelectedProperties } from './StudioSelectedProperties'

afterEach(cleanup)
// jsdom has no top layer; the actual chooser/geometry is covered in Electron.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'block' } })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }]
const base = { theme: 'light' as const, kind: 'event', identity: 'first-note', rows: [], enabled: true, inputActive: false, measureScope: '첫 마디', locationScope: '첫 위치', dynamics: [], onDynamic: () => {}, technical: '' }
it.each(['change', 'remove', 'cancel', 'equal'].flatMap(action => modifiers.map(modifier => ({ action, modifier }))))('studio.selected-text-save-draft $action with $modifier keeps scope/help, confirmation and the second ID', ({ action, modifier }) => {
  const commit = vi.fn(), save = vi.fn(), draft = action === 'remove' ? '' : action === 'equal' ? '  원본  ' : '새 표기'
  function Host() {
    const [objects, setObjects] = useState([{ id: 'first', text: '이웃' }, { id: 'second', text: '원본' }])
    return <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') save() }}>
      <StudioSelectedProperties {...base} fields={[{ label: '보표 글자', help: '마디 전체에 적용합니다.', objectId: 'second', objects, scope: 'measure', update: (text, id) => {
        commit(text, id); setObjects(items => text.trim() ? items.map(item => item.id === id ? { ...item, text: text.trim() } : item) : items.filter(item => item.id !== id))
      } }]}/>
    </div>
  }
  render(<Host />)
  const field = screen.getByRole('textbox', { name: '선택 요약 보표 글자' }); field.focus(); fireEvent.change(field, { target: { value: draft } })
  fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier }); expect(commit).not.toHaveBeenCalled(); expect(field).toHaveFocus()
  expect(field).toHaveAccessibleDescription(expect.stringContaining('마디 전체에 적용합니다.'))
  if (action !== 'equal') {
    expect(save).not.toHaveBeenCalled(); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
    fireEvent.keyDown(field, { key: action === 'cancel' ? 'Escape' : 'Enter' }); fireEvent.blur(field)
    expect(commit).toHaveBeenCalledTimes(action === 'cancel' ? 0 : 1)
    if (action !== 'cancel') expect(commit).toHaveBeenCalledWith(draft, 'second')
    const confirmed = screen.getByRole('textbox', { name: '선택 요약 보표 글자' }); expect(confirmed).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
    expect(save).not.toHaveBeenCalled(); confirmed.focus(); fireEvent.keyDown(confirmed, { key: 's', code: 'KeyS', ...modifier })
  }
  expect(save).toHaveBeenCalledOnce()
})
it('studio.selected-text-save-draft drops IME draft and guidance when choosing an equal-text neighbor ID', () => {
  const commit = vi.fn(), save = vi.fn()
  render(<div onKeyDown={save}><StudioSelectedProperties {...base} fields={[{ label: '보표 글자', scope: 'measure', objectId: 'second', objects: [{ id: 'first', text: '같음' }, { id: 'second', text: '같음' }], update: commit }]}/></div>)
  const field = screen.getByRole('textbox', { name: '선택 요약 보표 글자' }); field.focus(); fireEvent.change(field, { target: { value: '다른 초안' } })
  fireEvent.compositionStart(field); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); fireEvent.keyDown(field, { key: 'Enter', isComposing: true, keyCode: 229 }); fireEvent.blur(field)
  expect(commit).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
  fireEvent.compositionEnd(field); field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
  fireEvent.click(screen.getByRole('combobox', { name: '보표 글자 대상' })); fireEvent.click(screen.getAllByRole('option')[0]!)
  fireEvent.blur(field)
  const next = screen.getByRole('textbox', { name: '선택 요약 보표 글자' }); expect(next).toHaveValue('같음'); expect(next).not.toHaveAccessibleDescription(expect.stringContaining(guidance)); expect(commit).not.toHaveBeenCalled()
})
