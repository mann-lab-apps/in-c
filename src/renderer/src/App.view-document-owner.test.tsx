// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createVoiceMoveFixture } from '../../testing/voice-move-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
type Field = '악보 보기' | '파트보 선택'
async function setup(field: Field) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createNativeProject(createVoiceMoveFixture(true)); a.score.title = '보기 문서 A'
  if (field === '파트보 선택') a.view = { mode:'part', partId:a.score.parts[0].id }
  const b = structuredClone(a); b.score.title = '보기 문서 B'
  const file = { filePath:'/fixture/view-b.chromatics', fileName:'view-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/view-a.chromatics', fileName:'view-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' })); await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  const nav = within(screen.getByRole('navigation', { name:'앱 메뉴' }))
  fireEvent.click(nav.getByRole('button', { name:'보기' })); fireEvent.click(nav.getByRole('menuitem', { name:'총보·파트보 보기' }))
  const combo = screen.getByRole('combobox', { name:field }); expect(combo).toBeEnabled()
  act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true'); expect(playbackMockState.lastScore).toEqual(a.score)
  return { a, b, file, finish, fail, combo }
}
async function save() {
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
}
it.each(['악보 보기','파트보 선택'] as const)('does not apply the previous %s candidate to the new document view or selection', async field => {
  const { b, finish, file } = await setup(field)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const address = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), combo = screen.getByRole('combobox', { name:field })
  fireEvent.keyDown(combo, { key:'Tab' }); expect(combo).toHaveAttribute('aria-expanded','false')
  expect(screen.getByRole('combobox', { name:'악보 보기' })).toHaveTextContent(b.view.mode === 'score' ? '총보' : '파트보')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',address)
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score)); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  const saved = await save(); expect(saved.view).toEqual(b.view); expect(saved.score).toEqual(b.score)
})
it.each([
  ['악보 보기','cancel'], ['악보 보기','failure'], ['파트보 선택','cancel'], ['파트보 선택','failure']
] as const)('keeps the old %s candidate after read %s as a view-only action', async (field,outcome) => {
  const { a, finish, fail, combo } = await setup(field)
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned score view read failure')))
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(playbackMockState.lastScore).toEqual(a.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  const saved = await save(); expect(saved.score).toEqual(a.score)
  expect(saved.view).toEqual({ mode:'part', partId:a.score.parts[field === '악보 보기' ? 0 : 1].id })
})
it.each(['악보 보기','파트보 선택'] as const)('accepts a fresh %s choice in the new document without editing notes or adding history', async field => {
  const { b, finish, file } = await setup(field)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const combo = screen.getByRole('combobox', { name:field }); expect(combo).toHaveAttribute('aria-expanded','false')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  const saved = await save(); expect(saved.score).toEqual(b.score)
  expect(saved.view).toEqual({ mode:'part', partId:b.score.parts[field === '악보 보기' ? 0 : 1].id })
})
