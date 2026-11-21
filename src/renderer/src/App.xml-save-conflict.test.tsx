// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPracticeLoopFixture } from '../../testing/practice-loop-fixture'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const conflict = 'MusicXML file changed on disk. Reopen it or save to another file.'
const recovery = '파일 → 내보내기 설정 → MusicXML 내보내기'

async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const contents = serializeMusicXml(createPracticeLoopFixture()), original = parseMusicXml(contents)
  const filePath = '/fixture/current.musicxml'
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'current.musicxml', filePath, contents })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(original))
  const first = original.parts[0].staves[0].measures[0].voices[0].events[0]
  fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' }))
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const edited = structuredClone(playbackMockState.lastScore!)
  expect(edited).not.toEqual(original)
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  openStudioWorkspace('파일')
  return { original, edited, selected, filePath }
}

async function saveFailure(diagnostic: string) {
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
  const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
  await waitFor(() => expect(status).toHaveTextContent('MusicXML 저장을 마무리하지 못했습니다.'))
  expect(status).not.toHaveTextContent(diagnostic)
  const group = screen.getByRole('group', { name: 'MusicXML 저장 기술 정보' })
  const button = within(group).getByRole('button', { name: '기술 정보' })
  expect(button).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(button)
  expect(within(group).getByText(diagnostic)).toBeVisible()
  return status
}

it.each([conflict, `Error invoking remote method 'musicxml:save': Error: ${conflict}`])(
  'guides a pre-write XML conflict to a safe copy and preserves exact selection and undo: %s', async diagnostic => {
    const s = await setup(); vi.mocked(window.inC.musicXml.save).mockRejectedValueOnce(new Error(diagnostic))
    const status = await saveFailure(diagnostic)
    expect(status).toHaveTextContent('파일이 앱 밖에서 변경되어 덮어쓰지 않았습니다.')
    expect(status).toHaveTextContent(recovery); expect(status).toHaveTextContent('편집 내용은 유지됩니다.')
    expect(playbackMockState.lastScore).toEqual(s.edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', s.selected!)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    expect(status).toHaveTextContent('1회 수정')
    const request = vi.mocked(window.inC.musicXml.save).mock.calls[0][0]
    expect(request.filePath).toBe(s.filePath); expect(parseMusicXml(request.contents)).toEqual(s.edited)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(s.original)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(s.edited)
    openStudioWorkspace('내보내기')
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    expect(playbackMockState.lastScore).toEqual(s.edited)
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce({ filePath: '/fixture/recovery.musicxml', fileName: 'recovery.musicxml' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'MusicXML 내보내기' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(status).toHaveTextContent('recovery.musicxml로 MusicXML을 내보냈습니다.'))
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    expect(parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1][0].contents)).toEqual(s.edited)
  }
)

it.each(['recent', 'cleanup'] as const)('distinguishes post-write XML %s failure from an unwritten conflict', async stage => {
  const s = await setup()
  vi.mocked(window.inC.musicXml.save).mockResolvedValueOnce({ filePath: s.filePath, fileName: 'current.musicxml' })
  if (stage === 'recent') vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error(conflict))
  else vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(new Error(conflict))
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
  const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
  await waitFor(() => expect(status).toHaveTextContent(stage === 'recent' ? '최근 악보 목록을 갱신하지 못했습니다.' : '자동저장 복구본을 정리하지 못했습니다.'))
  expect(status).not.toHaveTextContent('덮어쓰지 않았습니다'); expect(status).not.toHaveTextContent(recovery)
  expect(playbackMockState.lastScore).toEqual(s.edited)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', s.selected!)
})

it.each([`Not an XML conflict: ${conflict}`, `Error invoking remote method 'recent:add': Error: ${conflict}`])(
  'keeps generic guidance for an unrelated XML diagnostic: %s', async diagnostic => {
    const s = await setup(); vi.mocked(window.inC.musicXml.save).mockRejectedValueOnce(new Error(diagnostic))
    const status = await saveFailure(diagnostic)
    expect(status).not.toHaveTextContent('덮어쓰지 않았습니다'); expect(status).not.toHaveTextContent(recovery)
    expect(status).toHaveTextContent('기술 정보를 확인한 뒤 다시 시도해 주세요.')
    expect(playbackMockState.lastScore).toEqual(s.edited)
  }
)
