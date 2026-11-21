// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createUnpitchedFixture } from '../../testing/unpitched-fixture'
import { parseMusicXml } from '../../musicxml'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['main', 'grace'] as const)('explains unsupported %s unpitched notes while retaining the prior dirty document and exact undo/save', async kind => {
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
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: kind + '.musicxml', filePath: '/fixture/' + kind + '.musicxml', contents: createUnpitchedFixture({ owner: kind }) })
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const notice = await screen.findByText(/^이 MusicXML의 무음정 음표\(타악기 등\)는 현재 가져오기에서 지원하지 않습니다\./)
  expect(notice).toHaveTextContent('원본 MusicXML을 보관')
  const details = within(screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' }))
  const raw = details.getByText(/^현재 가져오기에서 지원하지 않는 무음정 음표입니다: unpitched$/)
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

it('can retry a rest-only percussion source with omitted clef line, then save and reopen native contents', async () => {
  window.history.replaceState({}, '', '/')
  const bad = createUnpitchedFixture(), rest = createUnpitchedFixture({ kind: 'rest', line: false }), expected = parseMusicXml(rest)
  vi.mocked(window.inC.musicXml.open)
    .mockResolvedValueOnce({ fileName: 'unsupported.musicxml', filePath: '/fixture/unsupported.musicxml', contents: bad })
    .mockResolvedValueOnce({ fileName: 'rest-control.musicxml', filePath: '/fixture/rest-control.musicxml', contents: rest })
  const { App } = await import('./App'); render(<App />)
  const original = structuredClone(playbackMockState.lastScore)
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await screen.findByText(/^이 MusicXML의 무음정 음표\(타악기 등\)는 현재 가져오기에서 지원하지 않습니다\./)
  expect(playbackMockState.lastScore).toEqual(original)
  expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  expect(document.querySelector('.start-screen')).not.toBeInTheDocument()
  expect(expected.parts[0].staves[0].measures[0].clef).toEqual({ sign: 'percussion', line: 2 })
  expect(expected.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('rest')
  expect(window.inC.recentMusicXml.add).toHaveBeenCalledOnce()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
  expect(decodeNativeProject(saved.contents).score).toEqual(expected)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'reopened-percussion.chromatics', filePath: '/fixture/reopened-percussion.chromatics', contents: saved.contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('reopened-percussion.chromatics을 열었습니다.'))
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
})
