// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createTimewiseFormatFixture } from '../../testing/timewise-format-fixture'
import { parseMusicXml } from '../../musicxml'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'

registerAppTestHooks()
const fixture = createTimewiseFormatFixture()
const noticePattern = /^이 MusicXML의 마디 우선\(score-timewise\) 구조는 현재 가져오기에서 지원하지 않습니다\./

it('explains the unsupported root without losing the dirty score, selection, undo or native save path', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createPracticeLoopFixture())
  const first = project.score.parts[0].staves[0].measures[0].voices[0].events[0]
  const filePath = '/fixture/prior-timewise.chromatics'
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'prior-timewise.chromatics', filePath, contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' }))
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const dirty = structuredClone(playbackMockState.lastScore!)
  expect(dirty).not.toEqual(project.score)
  const recent = vi.mocked(window.inC.recentMusicXml.add).mock.calls.length
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'valid-timewise.musicxml', filePath: '/fixture/valid-timewise.musicxml', contents: fixture.timewise })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const notice = await screen.findByText(noticePattern)
  expect(notice).toHaveTextContent('파트 우선(score-partwise) 구조로 저장한 사본')
  expect(notice).toHaveTextContent('현재 악보는 유지됩니다. 원본 MusicXML을 보관')
  const details = within(screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' }))
  const raw = details.getByText('현재 가져오기에서 지원하지 않는 MusicXML 형식입니다: score-timewise')
  expect(raw).not.toBeVisible()
  fireEvent.click(details.getByRole('button', { name: '기술 정보' })); expect(raw).toBeVisible()
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

it('can retry with a valid partwise copy from the start screen and save/reopen the real score', async () => {
  window.history.replaceState({}, '', '/')
  vi.mocked(window.inC.musicXml.open)
    .mockResolvedValueOnce({ fileName: 'timewise.musicxml', filePath: '/fixture/timewise.musicxml', contents: fixture.timewise })
    .mockResolvedValueOnce({ fileName: 'partwise.musicxml', filePath: '/fixture/partwise.musicxml', contents: fixture.partwise })
  const { App } = await import('./App'); render(<App />)
  const initial = structuredClone(playbackMockState.lastScore)
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await screen.findByText(noticePattern)
  expect(playbackMockState.lastScore).toEqual(initial)
  expect(document.querySelector('.start-screen')).toBeInTheDocument()
  expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const expected = parseMusicXml(fixture.partwise)
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  expect(document.querySelector('.start-screen')).not.toBeInTheDocument()
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledOnce()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
  expect(decodeNativeProject(saved.contents).score).toEqual(expected)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'reopened-timewise-control.chromatics', filePath: '/fixture/reopened-timewise-control.chromatics', contents: saved.contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('reopened-timewise-control.chromatics을 열었습니다.'))
  expect(playbackMockState.lastScore).toEqual(expected)
})
