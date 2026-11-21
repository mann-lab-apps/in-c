// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { chooseSpanReference, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const storageKey = 'studio.edit-shortcuts.v1', chord = { code: 'KeyD', command: true, shift: true, alt: false }
async function setup(overrides = {}, span = false) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  localStorage.setItem(storageKey, JSON.stringify({ version: 1, overrides }))
  const score = createPracticeLoopFixture()
  if (span) score.slurs = [{ id: 'delete-shortcut-slur', startEventId: 'upper-note-0', endEventId: 'upper-note-1', engraving: { offsetY: 0, height: 4 } }]
  const project = decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/delete.chromatics', fileName: 'delete.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); const view = render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: 'upper-note-0 선택' }))
  return { project, view }
}
const customKey = (target: Window | Element = window, extra = {}) => fireEvent.keyDown(target, { key: 'ㅇ', code: 'KeyD', ctrlKey: true, shiftKey: true, ...extra })
function settings() { fireEvent.click(screen.getByRole('button', { name: '편집' })); fireEvent.click(screen.getByRole('menuitem', { name: '단축키 설정…' })) }
function deleteOption() { fireEvent.click(screen.getByRole('combobox', { name: '단축키 명령' })); fireEvent.click(screen.getByRole('option', { name: '삭제' })) }

it('offers deletion remapping and keeps one edit/undo plus exact native output', async () => {
  const { project } = await setup(); settings(); deleteOption()
  customKey(screen.getByRole('textbox', { name: '새 단축키' }))
  fireEvent.click(screen.getByRole('button', { name: '단축키 적용' })); fireEvent.click(screen.getByRole('button', { name: '설정 창 닫기' }))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  for (const key of ['Delete', 'Backspace']) fireEvent.keyDown(window, { key })
  expect(playbackMockState.lastScore).toEqual(project.score)
  customKey(); const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('rest')
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'y', code: 'KeyY', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
})
it.each(['svg', 'button'] as const)('cannot bypass an unassigned deletion key from the selected span %s', async target => {
  const { project } = await setup({ delete: null }, true); chooseSpanReference('slur:delete-shortcut-slur')
  const node = target === 'button' ? screen.getByRole('button', { name: '선택 표기 삭제' }) : window
  if (node instanceof HTMLElement) node.focus()
  for (const key of ['Delete', 'Backspace']) fireEvent.keyDown(node, { key })
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('uses the configured span-button deletion and returns focus before removal', async () => {
  const { project } = await setup({ delete: chord }, true); chooseSpanReference('slur:delete-shortcut-slur')
  const button = screen.getByRole('button', { name: '선택 표기 삭제' }); button.focus()
  expect(button).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+D Control+Shift+D')
  fireEvent.keyDown(button, { key: 'Delete' }); expect(playbackMockState.lastScore).toEqual(project.score)
  customKey(button)
  expect(playbackMockState.lastScore!.slurs).toBeUndefined()
  expect(screen.getByRole('combobox', { name: '표기 객체 선택' })).toHaveFocus()
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
})
it('keeps text, closed Select and IME with their owner while configured score deletion remains available', async () => {
  const { project } = await setup({ delete: chord })
  const input = document.createElement('input'); document.body.append(input); input.focus(); customKey(input); input.remove()
  openStudioWorkspace('파일')
  const select = screen.getByRole('combobox', { name: '선택 필터' }); select.focus(); customKey(select)
  customKey(window, { isComposing: true }); customKey(window, { keyCode: 229 })
  expect(playbackMockState.lastScore).toEqual(project.score)
  customKey(); expect(playbackMockState.lastScore).not.toEqual(project.score)
})
it('keeps existing selected-measure removal and exact undo when its key is reassigned', async () => {
  const { project } = await setup({ delete: chord })
  fireEvent.click(screen.getByRole('button', { name: '1마디 선택' })); fireEvent.keyDown(window, { key: 'Delete' })
  expect(playbackMockState.lastScore).toEqual(project.score)
  customKey(); expect(playbackMockState.lastScore!.parts[0].staves[0].measures).toHaveLength(2)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
})

it('reloads deletion alongside an older undo mapping, then unassigns/restores it with current help', async () => {
  const undo = { ...chord, code: 'KeyB' }
  const first = await setup({ undo, delete: chord }); first.view.unmount()
  const saved = JSON.parse(localStorage.getItem(storageKey)!).overrides
  const { project } = await setup(saved)
  customKey(); const edited = structuredClone(playbackMockState.lastScore!)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.keyDown(window, { key: 'b', code: 'KeyB', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  settings(); deleteOption(); fireEvent.click(screen.getByRole('button', { name: '선택 명령 단축키 해제' })); fireEvent.click(screen.getByRole('button', { name: '설정 창 닫기' }))
  customKey(); fireEvent.keyDown(window, { key: 'Backspace' }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.click(screen.getByRole('button', { name: '도움말' })); fireEvent.click(screen.getByRole('menuitem', { name: '단축키 도움말' }))
  const row = [...document.querySelectorAll('.studio-shortcut-row')].find(row => row.querySelector('dt > span')?.textContent === '삭제')!
  expect(row.querySelector('dd')).toHaveTextContent('할당 없음')
  fireEvent.click(within(screen.getByRole('dialog', { name: '단축키 도움말' })).getByRole('button', { name: '확인' }))
  settings(); deleteOption(); fireEvent.click(screen.getByRole('button', { name: '선택 명령 기본값 복원' })); fireEvent.click(screen.getByRole('button', { name: '설정 창 닫기' }))
  expect(JSON.parse(localStorage.getItem(storageKey)!).overrides).toEqual({ undo })
  fireEvent.keyDown(window, { key: 'Backspace' }); expect(playbackMockState.lastScore).not.toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})

it('leaves an actual span geometry draft with its field and Escape before configured button deletion', async () => {
  const { project } = await setup({ delete: chord }, true); chooseSpanReference('slur:delete-shortcut-slur')
  fireEvent.click(screen.getByRole('button', { name: '배치 · 형상' }))
  const field = screen.getByRole('spinbutton', { name: '표기 높이' }); field.focus(); fireEvent.change(field, { target: { value: '2' } })
  customKey(field); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(field, { key: 'Escape' }); expect(field).toHaveValue(4)
  expect(playbackMockState.lastScore).toEqual(project.score)
  const button = screen.getByRole('button', { name: '선택 표기 삭제' }); button.focus(); customKey(button)
  expect(playbackMockState.lastScore!.slurs).toBeUndefined()
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
})
