// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { partLabelSaveDraftFixture } from '../../testing/part-label-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const fields = [ ['title', '악보 제목'], ['composer', '작곡가'], ['partTitle', '파트보 제목 입력'] ] as const
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = partLabelSaveDraftFixture('name-change').project
  source.score.composer = 'Original composer'
  source.view = { mode: 'part', partId: source.score.parts[0]!.id }
  source.partLayouts = [{ partId: source.score.parts[0]!.id, title: 'Original part title', layout: {} }]
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/metadata.chromatics', fileName: 'metadata.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  return source
}
function edit(label: string) {
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
  fireEvent.click(screen.getByRole('button', { name: label === '파트보 제목 입력' ? '파트보 제목 편집' : `${label} 편집` }))
  const input = screen.getByRole('textbox', { name: label }); input.focus(); return input
}
async function save() {
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
}
it.each(fields)('studio.metadata-save-draft %s blocks shortcut before IO without changing the paper and confirms one command', async (field, label) => {
  const source = await setup(), input = edit(label)
  fireEvent.change(input, { target: { value: '새 정보' } })
  await act(async () => fireEvent.keyDown(input, { key: 's', code: 'KeyS', metaKey: true, shiftKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(source.score)
  expect(input).toHaveFocus(); expect(input).toHaveValue('새 정보'); expect(input).toHaveAccessibleDescription(guidance)
  expect(document.querySelector('.studio-status__result')).toHaveTextContent(guidance)
  expect(document.querySelector('.score-canvas')).not.toHaveTextContent(guidance)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.blur(input)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  const expected = structuredClone(source)
  if (field === 'partTitle') expected.partLayouts[0]!.title = '새 정보'
  else expected.score[field] = '새 정보'
  expect(await save()).toEqual(expected)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menus.getByRole('button', { name: '편집' })); expect(menus.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
})
it.each(fields)('studio.metadata-save-draft %s Escape cancels without a deferred save or history', async (_field, label) => {
  const source = await setup(), input = edit(label)
  fireEvent.change(input, { target: { value: '취소할 초안' } })
  await act(async () => fireEvent.keyDown(input, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Escape' }); fireEvent.blur(input)
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(await save()).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(fields)('studio.metadata-save-draft %s permits semantically unchanged whitespace without a commit', async (field, label) => {
  const source = await setup(), input = edit(label)
  const value = field === 'partTitle' ? source.partLayouts[0]!.title! : source.score[field]!
  fireEvent.change(input, { target: { value: `  ${value}  ` } })
  expect(await save()).toEqual(source)
  expect(input).toHaveValue(`  ${value}  `); expect(input).not.toHaveAccessibleDescription(guidance)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('studio.metadata-save-draft composing title cannot launch a save or steal focus, then fresh save gives guidance', async () => {
  const source = await setup(), input = edit('악보 제목')
  fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: '조합 제목' } })
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(input).toHaveFocus(); expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(guidance)
  fireEvent.compositionEnd(input)
  await act(async () => fireEvent.keyDown(input, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(input).toHaveAccessibleDescription(guidance)
  fireEvent.keyDown(input, { key: 'Escape' }); expect(await save()).toEqual(source)
})
it.each(fields)('studio.metadata-save-draft %s keeps its existing empty-value contract after explicit blur', async (field, label) => {
  const source = await setup(), input = edit(label)
  fireEvent.change(input, { target: { value: '' } })
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(input).toHaveAccessibleDescription(guidance)
  act(() => input.blur()); expect(window.inC.project.save).not.toHaveBeenCalled()
  const expected = structuredClone(source)
  if (field === 'title') expected.score.title = '제목 없는 악보'
  else if (field === 'composer') delete expected.score.composer
  else delete expected.partLayouts[0]!.title
  expect(await save()).toEqual(expected)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menus.getByRole('button', { name: '편집' })); expect(menus.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
})
it('studio.metadata-save-draft does not create an inherited part-title override just by opening and saving', async () => {
  const source = await setup(), inherited = structuredClone(source); delete inherited.partLayouts[0]!.title
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/inherited.chromatics', fileName: 'inherited.chromatics', contents: encodeNativeProject(inherited) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '파트보 제목 수정' })).toHaveTextContent(inherited.score.parts[0]!.name))
  const input = edit('파트보 제목 입력'); expect(input).toHaveValue(inherited.score.parts[0]!.name)
  expect(await save()).toEqual(inherited); expect(input).not.toHaveAccessibleDescription(guidance)
})
it('studio.metadata-save-draft an unmodified composition blocks document save without forcing confirmation', async () => {
  await setup(); const input = edit('악보 제목'); fireEvent.compositionStart(input)
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(input).toHaveFocus(); expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(guidance)
  fireEvent.compositionEnd(input); await save()
})
