// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['MusicXML로 저장', 'MusicXML 내보내기', '반복 펼치기 MusicXML 내보내기'].flatMap(label => ['\r', '\r\n'].map(lineEnd => ({ label, lineEnd }))))('exports valid Native line endings through $label / $lineEnd without losing text', async ({ label, lineEnd }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['P1'])
  score.title = `제목${lineEnd}원문`
  score.composer = `작곡가${lineEnd}원문`
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'text.chromatics', filePath: '/fixture/text.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const bridge = label === 'MusicXML로 저장' ? window.inC.musicXml.save : window.inC.musicXml.exportCopy
  vi.mocked(bridge).mockResolvedValueOnce({ fileName: 'text.musicxml', filePath: '/fixture/text.musicxml' })
  openStudioWorkspace(label === 'MusicXML로 저장' ? '파일' : '내보내기')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: label })))
  await waitFor(() => expect(bridge).toHaveBeenCalledOnce())
  const copy = parseMusicXml(vi.mocked(bridge).mock.calls[0][0].contents)
  expect(copy.title).toBe(score.title)
  expect(copy.composer).toBe(score.composer)
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
