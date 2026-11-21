// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { metadataNoEditFixture, metadataNoEditFields } from '../../testing/metadata-no-edit-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const cases = metadataNoEditFields.flatMap(field => [
  { kind: 'CR', value: '앞\r뒤' }, { kind: 'CRLF', value: '앞\r\n뒤' },
  { kind: 'LF', value: '앞\n뒤' }, { kind: 'plain control', value: '앞뒤' }
].map(example => ({ field, ...example })))

it.each(cases)('keeps $field $kind Native text when inspecting without editing', async ({ field, value }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const data = metadataNoEditFixture(field, 'blur')
  if (field === 'partTitle') data.project.partLayouts[0]!.title = value
  else data.project.score[field] = value
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/text.chromatics', fileName: 'text.chromatics', contents: encodeNativeProject(data.project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/saved.chromatics', fileName: 'saved.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
  fireEvent.click(screen.getByRole('button', { name: field === 'partTitle' ? '파트보 제목 편집' : `${data.label} 편집` }))
  const input = screen.getByRole('textbox', { name: data.label })
  input.focus()
  // HTML text inputs display a sanitized single line. Inspection must not
  // mistake that browser representation for an actual edit to the Native text.
  expect(input).toHaveValue('앞뒤')
  const destination = screen.getByRole('button', { name: '악보로 이동' })
  act(() => destination.focus())
  expect(destination).toHaveFocus()
  expect(screen.queryByRole('textbox', { name: data.label })).not.toBeInTheDocument()
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(data.project)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
  fireEvent.click(menus.getByRole('button', { name: '편집' }))
  expect(menus.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
})
