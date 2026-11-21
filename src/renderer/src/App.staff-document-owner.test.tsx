// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNewScore } from './editor/new-score'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openNotationSettings, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const target = () => within(screen.getByRole('region', { name:'보표·성부 탐색' }))
const selectedAddress = () => screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
async function setup(singleNext = false) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createNativeProject(createNewScore({ title:'보표 문서 A', templateId:'piano-grand-staff', measureCount:3, keySignature:{ fifths:0 }, timeSignature:{ beats:4, beatType:4 } }))
  const b = structuredClone(a); b.score.title = '보표 문서 B'
  if (singleNext) b.score.parts[0].staves.splice(1)
  const file = { filePath:'/fixture/staff-b.chromatics', fileName:'staff-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/staff-a.chromatics', fileName:'staff-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  const combo = target().getByRole('combobox', { name:'입력 보표' })
  expect(combo).toBeEnabled(); act(() => combo.focus())
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true')
  return { a, b, file, finish, fail, combo }
}
it('does not apply the old staff candidate to the new document selection or input target', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const before = selectedAddress(), combo = target().getByRole('combobox', { name:'입력 보표' })
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(selectedAddress()).toBe(before)
  expect(combo).toHaveTextContent('보표 1'); expect(combo).toHaveAttribute('aria-expanded','false')
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score))
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(b.score)
})
it.each(['cancel','failure'] as const)('keeps explicit old staff navigation after read %s without moving notes or adding history', async outcome => {
  const { a, finish, fail, combo } = await setup(), before = selectedAddress()
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned staff read failure')))
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(selectedAddress()).not.toBe(before); expect(combo).toHaveTextContent('보표 2')
  expect(playbackMockState.lastScore).toEqual(a.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('retains fresh staff navigation and the current voice in the new document', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const before = selectedAddress(), combo = target().getByRole('combobox', { name:'입력 보표' })
  expect(combo).toHaveAttribute('aria-expanded','false')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(selectedAddress()).not.toBe(before); expect(combo).toHaveTextContent('보표 2')
  expect(target().getByRole('button', { name:'1성부' })).toHaveAttribute('aria-pressed','true')
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps the existing one-staff static-output guard when the new document has only one staff', async () => {
  const { b, finish, file } = await setup(true)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  expect(target().queryByRole('combobox', { name:'입력 보표' })).not.toBeInTheDocument()
  expect(target().getByLabelText('입력 보표')).toHaveTextContent(b.score.parts[0].name)
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps the existing measure-clef enablement guard when document replacement selects an event', async () => {
  const { b, finish, file, combo } = await setup()
  fireEvent.keyDown(combo, { key:'Escape' })
  fireEvent.click(screen.getByRole('button', { name:'1마디 선택' }))
  openNotationSettings('clef')
  const clef = screen.getByRole('combobox', { name:'선택 마디 음자리표' })
  expect(clef).toBeEnabled(); fireEvent.click(clef); fireEvent.keyDown(clef, { key:'ArrowDown' })
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  expect(clef.isConnected).toBe(false)
  const currentClef = screen.getByRole('combobox', { name:'선택 마디 음자리표' })
  expect(currentClef).toBeDisabled(); expect(currentClef).toHaveAttribute('aria-expanded','false')
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
