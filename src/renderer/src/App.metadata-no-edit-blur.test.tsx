// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { metadataNoEditFixture, metadataNoEditFields, metadataNoEditActions } from '../../testing/metadata-no-edit-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(metadataNoEditFields.flatMap(field => metadataNoEditActions.map(action => ({ field, action }))))('studio.metadata-no-edit-blur $field $action protects inspection while retaining explicit confirmation', async ({ field, action }) => {
  window.history.replaceState({}, '', '/?fixture=release-test'); const data = metadataNoEditFixture(field, action)
  if (process.env.DDIRORI_METADATA_NO_EDIT_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = join(process.env.DDIRORI_METADATA_NO_EDIT_QA_DIR, `${field}-${action}`); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(data.project)); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(data.expected)); writeFileSync(join(dir, 'expected.json'), JSON.stringify({ field, action, label: data.label, value: data.value, changed: data.changed }, null, 2))
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/source.chromatics', fileName: 'source.chromatics', contents: encodeNativeProject(data.project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/saved.chromatics', fileName: 'saved.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' })); fireEvent.click(screen.getByRole('button', { name: field === 'partTitle' ? '파트보 제목 편집' : `${data.label} 편집` }))
  const input = screen.getByRole('textbox', { name: data.label }); input.focus(); expect(input).toHaveValue(data.value)
  if (action === 'typed-blur') { fireEvent.change(input, { target: { value: 'temporary' } }); fireEvent.change(input, { target: { value: data.value } }) }
  if (action === 'enter') fireEvent.keyDown(input, { key: 'Enter' })
  else { const other = screen.getByRole('button', { name: '악보로 이동' }); act(() => other.focus()); expect(other).toHaveFocus() }
  expect(screen.queryByRole('textbox', { name: data.label })).not.toBeInTheDocument()
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.expected)
  if (data.changed) {
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2)); expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(data.project)
  }
  const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menus.getByRole('button', { name: '편집' })); expect(menus.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()

})
