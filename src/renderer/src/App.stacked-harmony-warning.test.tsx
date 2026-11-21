// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStackedHarmonyFixture } from '../../testing/stacked-harmony-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['vertical', 'triple'] as const)('explains %s stacked harmony loss and keeps dirty copy/native/undo contracts', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createStackedHarmonyFixture(kind), score = parseMusicXml(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'stacked.musicxml', filePath: '/fixture/stacked.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/한 코드 심벌 안에 쌓은 여러 화음의 구조는 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('겹친 화음 정보 손실')
  const path = 'part[2].measure[2].harmony[1]'; expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' })); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented stacked harmony/)).toHaveTextContent(`chords="${kind === 'triple' ? 3 : 2}"`)
  fireEvent.keyDown(report.getByRole('button', { name: '기술 정보' }), { key: 'ArrowDown', code: 'ArrowDown' })
  expect(playbackMockState.lastScore).toEqual(score); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByTestId('notation-preview'), { key: 'ArrowUp', code: 'ArrowUp' })
  const edited = structuredClone(playbackMockState.lastScore), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  expect(edited).not.toEqual(score); expect(selected).toBeTruthy()
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  const copy = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
  expect(parseMusicXml(copy).harmonies).toBeUndefined()
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')).toBe(selected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
})
