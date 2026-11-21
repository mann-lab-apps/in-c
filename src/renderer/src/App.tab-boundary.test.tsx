// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiWarningScore } from '../../testing/midi-warning-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['MusicXML로 저장', 'MusicXML 내보내기', '반복 펼치기 MusicXML 내보내기'])(
  'keeps native TAB intact and blocks %s before any XML bridge write', async action => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const encoded = encodeNativeProject(createNativeProject(createMidiWarningScore('tab')))
    const score = decodeNativeProject(encoded).score
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'tab.chromatics', filePath: '/fixture/tab.chromatics', contents: encoded })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    const title = screen.getByLabelText('악보 제목')
    fireEvent.change(title, { target: { value: 'TAB boundary edited' } }); fireEvent.keyDown(title, { key: 'Enter' })
    const edited = structuredClone(playbackMockState.lastScore!)
    const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    openStudioWorkspace(action === 'MusicXML로 저장' ? '파일' : '내보내기')
    fireEvent.click(screen.getByRole('button', { name: action }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('TAB 보표가 포함되어 있어 현재 MusicXML로 저장하거나 내보낼 수 없습니다.'))
    expect(document.querySelector('.studio-status__result')).toHaveTextContent('프로젝트 파일로 보관해 주세요.')
    const diagnostic = within(screen.getByRole('group', { name: action === 'MusicXML로 저장' ? 'MusicXML 저장 기술 정보' : 'MusicXML 내보내기 기술 정보' }))
    const raw = diagnostic.getByText(/^지원하지 않는 clef sign입니다: TAB$/)
    expect(raw).not.toBeVisible()
    const technical = diagnostic.getByRole('button', { name: '기술 정보' })
    fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
    expect(playbackMockState.play).not.toHaveBeenCalled()
    fireEvent.click(technical); expect(raw).toBeVisible()
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  }
)

it('still exports a supported selected part when a different part has a TAB measure', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const encoded = encodeNativeProject(createNativeProject(createMidiWarningScore('tab'))), score = decodeNativeProject(encoded).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'tab-control.chromatics', filePath: '/fixture/tab-control.chromatics', contents: encoded })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  chooseScoreView('악보 보기', 'part'); chooseScoreView('파트보 선택', 'supported-part')
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
  expect(contents).not.toMatch(/<sign>(?:tab|TAB)<\/sign>/)
  expect(contents).toContain('<sign>G</sign>')
  expect(playbackMockState.lastScore).toEqual(score)
})
