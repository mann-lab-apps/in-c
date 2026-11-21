// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
beforeEach(() => Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
const widthsKey = 'chromatics.dock-widths.v1', visibilityKey = 'chromatics.dock-visibility.v1'
const profileKey = 'studio.dock-layout-profiles.v1'
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  localStorage.setItem(widthsKey, JSON.stringify({ palette: 207.5, properties: 360 }))
  const { App } = await import('./App'); render(<App />)
  return structuredClone(playbackMockState.lastScore!)
}
function open() {
  fireEvent.click(screen.getByRole('button', { name: '보기' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '도크 배치…' }))
  return within(screen.getByRole('dialog', { name: '도크 배치' }))
}
it('names a snapshot, restores the original keys and never changes score or undo', async () => {
  const source = await setup(), d = open()
  const name = d.getByRole('textbox', { name: '새 배치 이름' })
  fireEvent.change(name, { target: { value: '  나의 편집  ' } })
  fireEvent.click(d.getByRole('button', { name: '현재 배치 저장' }))
  const stored = JSON.parse(localStorage.getItem(profileKey)!)
  expect(stored.profiles[0]).toMatchObject({ name: '나의 편집', layout: { widths: { palette: 207.5, properties: 360 }, visibility: { palette: true, properties: true } } })
  expect(name).toHaveFocus()
  fireEvent.click(d.getByRole('button', { name: '배치 창 닫기' }))
  fireEvent.click(screen.getByRole('button', { name: '보기' })); fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '팔레트' }))
  expect(JSON.parse(localStorage.getItem(visibilityKey)!).palette).toBe(false)
  const again = open()
  expect(JSON.parse(localStorage.getItem(visibilityKey)!).palette).toBe(false)
  fireEvent.click(again.getByRole('button', { name: '선택 배치 복원' }))
  expect(JSON.parse(localStorage.getItem(visibilityKey)!)).toEqual({ palette: true, properties: true })
  expect(JSON.parse(localStorage.getItem(widthsKey)!)).toEqual({ palette: 207.5, properties: 360 })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('retains invalid names, blocks IME submission and deletes with live focus', async () => {
  const source = await setup(), d = open(), input = d.getByRole('textbox', { name: '새 배치 이름' })
  const form = d.getByRole('form', { name: '현재 도크 배치 저장' })
  fireEvent.submit(form); expect(d.getByRole('alert')).toHaveTextContent('이름')
  fireEvent.change(input, { target: { value: '한글 배치' } }); fireEvent.compositionStart(input); fireEvent.submit(form)
  fireEvent.keyDown(input, { key: 'Escape', isComposing: true }); expect(localStorage.getItem(profileKey)).toBeNull()
  fireEvent.compositionEnd(input); fireEvent.submit(form)
  fireEvent.change(input, { target: { value: '한글 배치' } }); fireEvent.submit(form)
  expect(d.getByRole('alert')).toHaveTextContent('같은 이름')
  expect(d.getByRole('status')).toBeEmptyDOMElement()
  expect(input).toHaveValue('한글 배치')
  fireEvent.click(d.getByRole('button', { name: '선택 배치 삭제' }))
  expect(input).toHaveFocus(); expect(JSON.parse(localStorage.getItem(profileKey)!).profiles).toEqual([])
  fireEvent.keyDown(input, { key: ' ', code: 'Space' }); fireEvent.keyDown(input, { key: 'Delete', code: 'Delete' })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: '도크 배치' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '보기' })).toHaveFocus()
})

it('keeps a pending document draft visible instead of opening another modal', async () => {
  await setup()
  const { openStudioWorkspace } = await import('./App.test-harness')
  openStudioWorkspace('악보')
  const tempo = screen.getByRole('spinbutton', { name: '위치별 빠르기 BPM' })
  tempo.focus(); fireEvent.change(tempo, { target: { value: '999' } })
  fireEvent.click(screen.getByRole('button', { name: '보기' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '도크 배치…' }))
  expect(screen.queryByRole('dialog', { name: '도크 배치' })).not.toBeInTheDocument()
  expect(tempo).toHaveValue(999); await waitFor(() => expect(tempo).toHaveFocus())
  expect(localStorage.getItem(profileKey)).toBeNull()
})
it('keeps session profiles after a failed write and a dialog close/reopen', async () => {
  const source = await setup(), d = open()
  const owner = Object.getPrototypeOf(localStorage) === Storage.prototype ? Storage.prototype : localStorage
  const spy = vi.spyOn(owner, 'setItem').mockImplementation(() => { throw Error('quota') })
  try {
    fireEvent.change(d.getByRole('textbox', { name: '새 배치 이름' }), { target: { value: '세션 배치' } })
    fireEvent.click(d.getByRole('button', { name: '현재 배치 저장' }))
    expect(d.getByRole('alert')).toHaveTextContent('현재 세션에서만')
    fireEvent.click(d.getByRole('button', { name: '배치 창 닫기' }))
    const again = open()
    expect(again.getByRole('combobox', { name: '저장한 도크 배치' })).toHaveTextContent('세션 배치')
    fireEvent.click(again.getByRole('button', { name: '선택 배치 복원' }))
    expect(playbackMockState.lastScore).toEqual(source)
  } finally { spy.mockRestore() }
})
it('does not consume note redo when a profile is saved, updated or restored', async () => {
  const source = await setup(), eventId = source.parts[0].staves[0].measures[0].voices[0].events[0].id
  const note = screen.getByRole('button', { name: `${eventId} 선택` })
  note.focus(); fireEvent.keyDown(note, { key: 'ArrowUp', code: 'ArrowUp' })
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed).not.toEqual(source)
  fireEvent.keyDown(note, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  const d = open()
  fireEvent.change(d.getByRole('textbox', { name: '새 배치 이름' }), { target: { value: '실행 취소 보존' } })
  fireEvent.click(d.getByRole('button', { name: '현재 배치 저장' }))
  fireEvent.click(d.getByRole('button', { name: '선택 배치 갱신' }))
  fireEvent.click(d.getByRole('button', { name: '선택 배치 복원' }))
  fireEvent.click(d.getByRole('button', { name: '배치 창 닫기' }))
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
})

it('preserves the next-input caret and mode while local dialog keys and restoration are used', async () => {
  const source = await setup(), id = source.parts[0].staves[0].measures[0].voices[0].events[0].id
  const note = screen.getByRole('button', { name: `${id} 선택` })
  fireEvent.click(note); note.focus(); fireEvent.keyDown(note, { key: 'n', code: 'KeyN' })
  const preview = screen.getByLabelText('악보 미리보기 테스트 더블')
  const caret = () => [preview.getAttribute('data-input-measure-id'), preview.getAttribute('data-input-tick'), preview.getAttribute('data-selected-event-id')]
  const before = caret(); expect(before[0]).toBeTruthy(); expect(before[1]).not.toBe('')
  const d = open(), input = d.getByRole('textbox', { name: '새 배치 이름' })
  fireEvent.change(input, { target: { value: '입력 커서 유지' } })
  for (const [key, code] of [['n', 'KeyN'], ['Delete', 'Delete'], [' ', 'Space']]) fireEvent.keyDown(input, { key, code })
  expect(caret()).toEqual(before); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(d.getByRole('button', { name: '현재 배치 저장' }))
  fireEvent.click(d.getByRole('button', { name: '선택 배치 복원' }))
  fireEvent.click(d.getByRole('button', { name: '배치 창 닫기' }))
  expect(caret()).toEqual(before); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  expect(preview.getAttribute('data-input-measure-id')).toBe('')
})
