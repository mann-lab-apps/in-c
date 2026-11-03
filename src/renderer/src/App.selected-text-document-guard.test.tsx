// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { selectedTextSaveDraftFixture, textSaveFamilies, type TextSaveFamily } from '../../testing/selected-text-save-draft-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
async function setup(family: TextSaveFamily) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = selectedTextSaveDraftFixture(family, 'change')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/text.chromatics', fileName: 'text.chromatics', contents: encodeNativeProject(data.project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
  fireEvent.click(screen.getByRole('button', { name: `${data.eventId} 선택` })); fireEvent.click(screen.getByRole('combobox', { name: data.choiceLabel })); fireEvent.click(screen.getAllByRole('option')[1]!)
  const field = screen.getByRole('textbox', { name: data.label })
  return { data, field }
}
function leaveDraft(field: HTMLElement, value: string, end = true) {
  field.focus(); fireEvent.compositionStart(field); fireEvent.change(field, { target: { value } }); act(() => field.blur())
  const outside = screen.getByRole('button', { name: '악보로 이동' }); outside.focus()
  if (end) fireEvent.compositionEnd(field)
  return outside
}
it.each(textSaveFamilies)('studio.selected-text-document-guard keeps pending %s outside its own keyboard target', async family => {
  const { data, field } = await setup(family), outside = leaveDraft(field, data.draft)
  if (family === 'systemTexts') { openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })) }
  else await act(async () => fireEvent.keyDown(outside, { key: 's', code: 'KeyS', metaKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(data.project.score)
  await waitFor(() => { expect(field).toHaveFocus(); expect(field).toBeVisible(); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance)) })
  expect(field).toHaveValue(data.draft)
  fireEvent.keyDown(field, { key: 'Enter' }); fireEvent.blur(field)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.expected)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(data.project.score)
})
it.each(['equal', 'different-id'] as const)('studio.selected-text-document-guard permits %s and never applies the previous second-object draft', async kind => {
  const { data, field } = await setup('systemTexts'), outside = leaveDraft(field, kind === 'equal' ? `  ${data.value}  ` : '이전 초안')
  if (kind === 'different-id') {
    fireEvent.click(screen.getByRole('combobox', { name: data.choiceLabel })); fireEvent.click(screen.getAllByRole('option')[0]!); fireEvent.blur(field)
  }
  await act(async () => fireEvent.keyDown(outside, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.project)
  expect(screen.queryByText(text => text.includes(guidance))).not.toBeInTheDocument()
})
it('studio.selected-text-document-guard does not end composition by forcing focus and requires a fresh request after Escape', async () => {
  const { data, field } = await setup('systemTexts'), outside = leaveDraft(field, data.draft, false)
  await act(async () => fireEvent.keyDown(outside, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(outside).toHaveFocus(); expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
  fireEvent.compositionEnd(field); await act(async () => fireEvent.keyDown(outside, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(field).toHaveFocus()); fireEvent.keyDown(field, { key: 'Escape' }); fireEvent.blur(field)
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(data.project.score)
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.project)
})
