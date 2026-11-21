// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['MusicXML로 저장', 'MusicXML 내보내기', '반복 펼치기 MusicXML 내보내기'])('blocks %s before bridge but keeps Native, then permits a corrected retry and undo', async label => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['P1'])
  score.title = '앞\u0000뒤'
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/text.chromatics', fileName: 'text.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/saved.chromatics', fileName: 'saved.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const bridge = label === 'MusicXML로 저장' ? window.inC.musicXml.save : window.inC.musicXml.exportCopy
  const attempt = async () => {
    openStudioWorkspace(label === 'MusicXML로 저장' ? '파일' : '내보내기')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: label })))
  }
  await attempt()
  expect(bridge).not.toHaveBeenCalled()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent(/악보 제목.*MusicXML로 표현할 수 없는 문자.*U\+0000/)
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(project)
  fireEvent.click(screen.getByRole('button', { name: '악보 정보' })); fireEvent.click(screen.getByRole('button', { name: '악보 제목 편집' }))
  const input = screen.getByRole('textbox', { name: '악보 제목' })
  fireEvent.change(input, { target: { value: '고친 제목' } }); fireEvent.keyDown(input, { key: 'Enter' })
  vi.mocked(bridge).mockResolvedValueOnce({ fileName: 'fixed.musicxml', filePath: '/fixture/fixed.musicxml' })
  await attempt()
  await waitFor(() => expect(bridge).toHaveBeenCalledOnce())
  expect(parseMusicXml(vi.mocked(bridge).mock.calls[0]![0].contents).title).toBe('고친 제목')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
})

it.each(['MusicXML 내보내기', '반복 펼치기 MusicXML 내보내기'])('validates only the actual selected-part output for %s', async label => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['P1', 'P2'])
  score.parts[1]!.name = '다른 파트\u0000이름'
  const project = createNativeProject(score); project.view = { mode: 'part', partId: 'P1' }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce({ filePath: '/fixture/part.musicxml', fileName: 'part.musicxml' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  openStudioWorkspace('내보내기'); await act(async () => fireEvent.click(screen.getByRole('button', { name: label })))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  expect(parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents).parts.map(p => p.id)).toEqual(['P1'])
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' })))
  expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent(/2번째 파트 이름.*U\+0000/)
  expect(playbackMockState.lastScore).toEqual(score)
})
