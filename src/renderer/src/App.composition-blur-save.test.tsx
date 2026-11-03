// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { partLabelSaveDraftFixture } from '../../testing/part-label-save-draft-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { chooseStaffTarget, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = partLabelSaveDraftFixture('name-change').project
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/part.chromatics', fileName: 'part.chromatics', contents: encodeNativeProject(source) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/confirmed.chromatics', fileName: 'confirmed.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score)); openStudioWorkspace('악보')
  return source
}
function leaveComposingDraft(draft = '조합 이름') {
  const name = screen.getByRole('textbox', { name: '현재 파트 이름' })
  name.focus(); fireEvent.compositionStart(name); fireEvent.change(name, { target: { value: draft } }); act(() => name.blur())
  screen.getByRole('textbox', { name: '현재 파트 약어' }).focus(); fireEvent.compositionEnd(name)
  return name
}
it.each(['ctrl', 'meta-save-as', 'file-button', 'xml-menu'] as const)('studio.composition-blur-save %s guides the pending owner before any IO and requires a fresh save', async channel => {
  const source = await setup(), name = leaveComposingDraft()
  expect(playbackMockState.lastScore).toEqual(source.score)
  if (channel === 'file-button') { openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })) }
  else if (channel === 'xml-menu') {
    const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menus.getByRole('button', { name: '파일' })); fireEvent.click(menus.getByRole('menuitem', { name: 'MusicXML로 저장' }))
  } else await act(async () => fireEvent.keyDown(document.activeElement!, { key: 's', code: 'KeyS', ...(channel === 'ctrl' ? { ctrlKey: true } : { metaKey: true, shiftKey: true }) }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  await waitFor(() => { expect(name).toHaveFocus(); expect(name).toBeVisible(); expect(name).toHaveAccessibleDescription(guidance) })
  expect(name).toHaveValue('조합 이름'); expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.keyDown(name, { key: 'Enter', code: 'Enter' }); fireEvent.blur(name)
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const expected = structuredClone(source); expected.score.parts[0]!.name = '조합 이름'
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  const menus = within(screen.getByRole('navigation', { name: '앱 메뉴' })); fireEvent.click(menus.getByRole('button', { name: '편집' })); expect(menus.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
})
it.each(['equal', 'normal-blur', 'different-part', 'different-document'] as const)('studio.composition-blur-save permits %s without carrying an older pending owner', async kind => {
  const source = await setup(), expected = structuredClone(source)
  if (kind === 'normal-blur') {
    const name = screen.getByRole('textbox', { name: '현재 파트 이름' }); name.focus(); fireEvent.change(name, { target: { value: '확정 이름' } }); act(() => name.blur()); expected.score.parts[0]!.name = '확정 이름'
  } else {
    const old = leaveComposingDraft(kind === 'equal' ? `  ${source.score.parts[0]!.name}  ` : '이전 초안')
    if (kind === 'different-part') {
      chooseStaffTarget('mixed-part:mixed-staff'); openStudioWorkspace('악보'); fireEvent.blur(old)
    } else if (kind === 'different-document') {
      expected.score.title = 'Replacement document'
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/replacement.chromatics', fileName: 'replacement.chromatics', contents: encodeNativeProject(expected) })
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected.score)); fireEvent.blur(old)
    }
  }
  await act(async () => fireEvent.keyDown(document.activeElement!, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
  expect(screen.queryByText(guidance)).not.toBeInTheDocument()
})
it('studio.composition-blur-save waits for composition without moving focus, then Escape cancels only the pending draft', async () => {
  const source = await setup(), name = screen.getByRole('textbox', { name: '현재 파트 이름' })
  name.focus(); fireEvent.compositionStart(name); fireEvent.change(name, { target: { value: '아직 조합' } }); act(() => name.blur())
  const abbreviation = screen.getByRole('textbox', { name: '현재 파트 약어' }); abbreviation.focus()
  await act(async () => fireEvent.keyDown(abbreviation, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(abbreviation).toHaveFocus(); expect(screen.queryByText(guidance)).not.toBeInTheDocument()
  fireEvent.compositionEnd(name); await act(async () => fireEvent.keyDown(abbreviation, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(name).toHaveFocus()); expect(name).toHaveAccessibleDescription(guidance)
  fireEvent.keyDown(name, { key: 'Escape' }); fireEvent.blur(name)
  expect(window.inC.project.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(source.score)
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce()); expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(source)
})
it('studio.composition-blur-save confirms two remaining drafts separately without an automatic save or extra history', async () => {
  const source = await setup(), name = leaveComposingDraft('첫 이름'), abbreviation = screen.getByRole('textbox', { name: '현재 파트 약어' })
  fireEvent.compositionStart(abbreviation); fireEvent.change(abbreviation, { target: { value: '약어' } }); act(() => abbreviation.blur()); fireEvent.compositionEnd(abbreviation)
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); await waitFor(() => expect(abbreviation).toHaveFocus()); expect(abbreviation).toHaveAccessibleDescription(guidance)
  fireEvent.keyDown(abbreviation, { key: 'Enter' }); fireEvent.blur(abbreviation)
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  expect(window.inC.project.save).not.toHaveBeenCalled(); await waitFor(() => expect(name).toHaveFocus()); expect(name).toHaveAccessibleDescription(guidance)
  fireEvent.keyDown(name, { key: 'Enter' }); fireEvent.blur(name)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const expected = structuredClone(source); expected.score.parts[0]!.name = '첫 이름'; expected.score.parts[0]!.abbreviation = '약어'
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expected.score.parts[0]!.name = source.score.parts[0]!.name; expect(playbackMockState.lastScore).toEqual(expected.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
})
