// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createXmlBodySyntaxFixture, malformedXmlKinds } from '../../testing/xml-body-syntax-fixture'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(malformedXmlKinds)('keeps current dirty document/selection/history on %s, then accepts a valid retry', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createPracticeLoopFixture()), path = '/fixture/current.chromatics'
  const first = project.score.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'current.chromatics', filePath: path, contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' }))
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const dirty = structuredClone(playbackMockState.lastScore!)
  expect(dirty).not.toEqual(project.score)
  const recentCount = vi.mocked(window.inC.recentMusicXml.add).mock.calls.length
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: kind + '.musicxml', filePath: '/fixture/' + kind + '.musicxml', contents: createXmlBodySyntaxFixture(kind) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await screen.findByText(/^MusicXML을 가져오지 못했습니다\. 현재 악보는 유지됩니다/)
  expect(playbackMockState.lastScore).toEqual(dirty)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', first.id)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(recentCount)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(dirty)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const request = vi.mocked(window.inC.project.save).mock.calls[0]![0]
  expect(request.filePath).toBe(path); expect(decodeNativeProject(request.contents).score).toEqual(dirty)
  const xml = createXmlBodySyntaxFixture('valid')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'valid.musicxml', filePath: '/fixture/valid.musicxml', contents: xml })
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('preserves welcome/recent entries after a malformed recent source and permits valid retry', async () => {
  window.history.replaceState({}, '', '/')
  const entry = { fileName: 'recent.musicxml', filePath: '/fixture/recent.musicxml', openedAt: '2026-11-08T00:00:00Z' }
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([entry])
  vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce({ ...entry, contents: createXmlBodySyntaxFixture('second-root') })
  const { App } = await import('./App'); render(<App />)
  const before = structuredClone(playbackMockState.lastScore)
  fireEvent.click(await screen.findByRole('button', { name: /recent\.musicxml/ }))
  await screen.findByText(/^MusicXML을 가져오지 못했습니다\./)
  expect(document.querySelector('.studio-start')).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(before)
  expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  const xml = createXmlBodySyntaxFixture('valid')
  vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce({ ...entry, contents: xml })
  fireEvent.click(screen.getByRole('button', { name: /recent\.musicxml/ }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
})
