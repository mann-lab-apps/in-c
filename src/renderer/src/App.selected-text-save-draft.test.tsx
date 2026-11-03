// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { selectedTextSaveDraftFixture, textSaveCases } from '../../testing/selected-text-save-draft-fixture'
import { encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(textSaveCases)('studio.selected-text-save-native $family $action keeps the second object identity, history and save timing', async ({ family, action }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = selectedTextSaveDraftFixture(family, action)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/text.chromatics', fileName: 'text.chromatics', contents: encodeNativeProject(data.project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
  fireEvent.click(screen.getByRole('button', { name: `${data.eventId} 선택` }))
  fireEvent.click(screen.getByRole('combobox', { name: data.choiceLabel })); fireEvent.click(screen.getAllByRole('option')[1]!)
  const field = screen.getByRole('textbox', { name: data.label }); expect(field).toHaveValue(data.value); field.focus(); fireEvent.change(field, { target: { value: data.draft } })
  const modifier = action === 'remove' ? { metaKey: true, shiftKey: true } : { ctrlKey: true }
  await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier }))
  if (data.blocked) {
    expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(data.project.score); expect(field).toHaveFocus()
    expect(field).toHaveAccessibleDescription(expect.stringContaining('Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'))
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(window.inC.project.save).not.toHaveBeenCalled()
    const confirmed = screen.getByRole('textbox', { name: data.label }); confirmed.focus(); await act(async () => fireEvent.keyDown(confirmed, { key: 's', code: 'KeyS', ctrlKey: true }))
  }
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.expected)
  if (data.changed) {
    fireEvent.blur(screen.getByRole('textbox', { name: data.label })); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(data.project.score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(data.expected.score)
  }
  if (process.env.DDIRORI_TEXT_SAVE_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_TEXT_SAVE_QA_DIR, data.kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(data.project)); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(data.expected))
    writeFileSync(join(dir, 'expectations.json'), JSON.stringify({ kind: data.kind, label: data.label, choiceLabel: data.choiceLabel, eventId: data.eventId, draft: data.draft, blocked: data.blocked, confirm: data.confirm, changed: data.changed, value: data.value }, null, 2))
  }
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
}, 15_000)
