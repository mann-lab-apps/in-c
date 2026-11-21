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
const region = () => within(screen.getByRole('region', { name:'선택 음표 성부 이동' }))
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createNativeProject(createVoiceMoveFixture(true)); a.score.title = '성부 이동 A'
  const b = structuredClone(a); b.score.title = '성부 이동 B'
  const file = { filePath:'/fixture/voice-b.chromatics', fileName:'voice-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/voice-a.chromatics', fileName:'voice-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' })); await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  openStudioWorkspace('음표')
  const combo = region().getByRole('combobox', { name:'옮길 성부' })
  expect(combo).toHaveTextContent('2성부'); act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true'); expect(playbackMockState.lastScore).toEqual(a.score)
  return { a, b, file, finish, fail, combo }
}
it('discards the old destination candidate and only moves the new note after an explicit button action', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const before = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const combo = region().getByRole('combobox', { name:'옮길 성부' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(combo).toHaveTextContent('2성부'); expect(combo).toHaveAttribute('aria-expanded','false')
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',before)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score)); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  fireEvent.click(region().getByRole('button', { name:'선택 음표를 성부로 옮기기' }))
  const moved = structuredClone(playbackMockState.lastScore!)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain('voice-2')
  expect(moved.parts[0].staves[0].measures[0].voices.find(voice=>voice.id==='voice-2')?.events.some(event=>event.id==='leading')).toBe(true)
  expect(moved.parts[1]).toEqual(b.score.parts[1]); expect(moved.slurs).toEqual(b.score.slurs)
  expect(serializeMidi(moved)).toEqual(serializeMidi(b.score)); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(b.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(moved)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(moved)
})
it.each(['cancel','failure'] as const)('keeps the old candidate on read %s while requiring the explicit move button', async outcome => {
  const { a, finish, fail, combo } = await setup()
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned voice target read failure')))
  fireEvent.keyDown(combo, { key:'Tab' }); expect(combo).toHaveTextContent('3성부')
  expect(playbackMockState.lastScore).toEqual(a.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(region().getByRole('button', { name:'선택 음표를 성부로 옮기기' }))
  const moved = structuredClone(playbackMockState.lastScore!)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain('voice-3')
  expect(serializeMidi(moved)).toEqual(serializeMidi(a.score)); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(a.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(moved)
})
it('accepts a fresh destination in the new document without moving until explicitly requested', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const combo = region().getByRole('combobox', { name:'옮길 성부' }); expect(combo).toHaveAttribute('aria-expanded','false')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(combo).toHaveTextContent('3성부'); expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
