// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createInteriorHairpinFixture } from '../../testing/interior-hairpin-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openSpanFinder, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const picker = () => screen.getByRole('combobox', { name:'표기 객체 선택' })
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createInteriorHairpinFixture(false,true); a.score.title = '범위 표기 A'
  const b = structuredClone(a); b.score.title = '범위 표기 B'
  const file = { filePath:'/fixture/span-b.chromatics', fileName:'span-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/span-a.chromatics', fileName:'span-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' })); await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  openSpanFinder(); const combo = picker()
  expect(combo).toHaveTextContent('선택 없음'); act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true'); expect(playbackMockState.lastScore).toEqual(a.score)
  return { a, b, file, finish, fail, combo }
}
it('does not select a same-ID span in the new document from the previous document candidate', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const address = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), combo = picker()
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(combo).toHaveTextContent('선택 없음'); expect(combo).toHaveAttribute('aria-expanded','false')
  expect(screen.queryByLabelText('선택 표기 ID')).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name:'표기 시작점' })).not.toBeInTheDocument()
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',address)
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score)); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(b.score)
})
it.each(['cancel','failure'] as const)('keeps the old explicit span selection after read %s without adding history', async outcome => {
  const { a, finish, fail, combo } = await setup()
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned span picker read failure')))
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent('interior-hairpin')
  expect(screen.getByRole('combobox', { name:'표기 시작점' })).toBeEnabled()
  expect(playbackMockState.lastScore).toEqual(a.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('allows a fresh span choice in the new document while keeping score and manual geometry unchanged', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const combo = picker(); expect(combo).toHaveAttribute('aria-expanded','false')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent('interior-hairpin')
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('keeps the existing detailed placement guard when the new document has no active span', async () => {
  const { b, finish, file, combo } = await setup()
  fireEvent.keyDown(combo, { key:'Enter' }); fireEvent.click(screen.getByRole('button', { name:'배치 · 형상' }))
  const placement = screen.getByRole('combobox', { name:'표기 배치' })
  fireEvent.click(placement); fireEvent.keyDown(placement, { key:'End' })
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  expect(screen.queryByRole('combobox', { name:'표기 배치' })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name:'표기 시작점' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('선택 표기 ID')).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
