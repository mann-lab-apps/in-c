// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiWarningScore, midiWarningRestOracle } from '../../testing/midi-warning-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const notice = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
it.each([{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }].flatMap(modifier => [17, 31].map(draft => ({ modifier, draft }))))('studio.save-number-draft preserves model and history through $modifier draft $draft', async ({ modifier, draft }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  const first = project.score.parts[0]!.id
  project.view = { mode: 'part', partId: first }
  project.partLayouts = [{ partId: first, title: 'Part draft guard', layout: { pageSetup: { pageSize: 'a4', orientation: 'portrait', pageMarginMm: 8, staffSizePercent: 100, systemSpacingPercent: 100 } } }]
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/draft.chromatics', fileName: 'draft.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  const scoreReference = playbackMockState.lastScore
  openStudioWorkspace('내보내기'); const field = screen.getByRole('spinbutton', { name: 'PDF 여백 mm' })
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  field.focus(); fireEvent.change(field, { target: { value: String(draft) } })
  await act(async () => { for (let n = 0; n < 2; n++) fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier }) })
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  expect(field).toHaveValue(draft); expect(field).toHaveFocus(); expect(field).toHaveAccessibleDescription(notice)
  expect(playbackMockState.lastScore).toBe(scoreReference)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  fireEvent.keyDown(field, { key: draft === 17 ? 'Enter' : 'Escape', code: draft === 17 ? 'Enter' : 'Escape' }); fireEvent.blur(field)
  expect(screen.queryByText(notice)).not.toBeInTheDocument()
  field.focus(); await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
  const expected = structuredClone(project); expected.partLayouts[0]!.layout.pageSetup!.pageMarginMm = draft === 17 ? 17 : 8
  expect(saved).toEqual(expected); expect(playbackMockState.lastScore).toBe(scoreReference)
  fireEvent.blur(field)
  if (draft === 17) {
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(project)
  }
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
}, 15_000)
