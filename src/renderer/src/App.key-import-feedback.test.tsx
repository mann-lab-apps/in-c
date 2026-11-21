// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createKeyImportFixture } from '../../testing/key-import-fixture'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['dorian', 'none', 'nontraditional'] as const)('explains unsupported %s key while retaining the prior dirty document and exact undo/save', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createPracticeLoopFixture()), first = project.score.parts[0].staves[0].measures[0].voices[0].events[0]
  const filePath = '/fixture/previous.chromatics'
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'previous.chromatics', filePath, contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' })); fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const dirty = structuredClone(playbackMockState.lastScore!); expect(dirty).not.toEqual(project.score)
  const recent = vi.mocked(window.inC.recentMusicXml.add).mock.calls.length
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: kind + '.musicxml', filePath: '/fixture/' + kind + '.musicxml', contents: createKeyImportFixture(kind) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const notice = await screen.findByText(/^이 MusicXML의 조표 방식은 현재 가져오기에서 지원하지 않습니다\./)
  expect(notice).toHaveTextContent('원본 파일을 보관')
  const details = within(screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' }))
  const raw = details.getByText(kind === 'nontraditional' ? /^현재 가져오기에서 지원하지 않는 비전통 조표입니다:/ : new RegExp(`^지원하지 않는 key mode입니다: ${kind}$`))
  expect(raw).not.toBeVisible()
  const technical = details.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(raw).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(dirty)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', first.id)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(recent)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(dirty)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
  expect(saved.filePath).toBe(filePath); expect(decodeNativeProject(saved.contents).score).toEqual(dirty)
})
