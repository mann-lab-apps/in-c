// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiWarningScore } from '../../testing/midi-warning-fixture'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { serializeMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('explains unsupported valid TAB import and retains the prior dirty document, native path and undo', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createPracticeLoopFixture()), first = project.score.parts[0].staves[0].measures[0].voices[0].events[0]
  const filePath = '/fixture/prior-tab-attempt.chromatics'
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'prior-tab-attempt.chromatics', filePath, contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' })); fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const dirty = structuredClone(playbackMockState.lastScore!), recentCount = vi.mocked(window.inC.recentMusicXml.add).mock.calls.length
  const contents = serializeMusicXml(createMidiWarningScore('tab')); expect(contents).toContain('<sign>TAB</sign>')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'valid-tab.musicxml', filePath: '/fixture/valid-tab.musicxml', contents })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const notice = await screen.findByText(/^이 MusicXML의 TAB 보표는 현재 가져오기에서 지원하지 않습니다\./)
  expect(notice).toHaveTextContent('현재 악보는 유지됩니다. 원본 MusicXML을 보관')
  const diagnostic = within(screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' }))
  const raw = diagnostic.getByText(/^지원하지 않는 clef sign입니다: TAB$/)
  expect(raw).not.toBeVisible()
  const technical = diagnostic.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled(); fireEvent.click(technical); expect(raw).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(dirty)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', first.id)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(recentCount)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(dirty)
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
  expect(saved.filePath).toBe(filePath); expect(decodeNativeProject(saved.contents).score).toEqual(dirty)
})
