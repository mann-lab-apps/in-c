// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createHarmonyVisibilityFixture } from '../../testing/harmony-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['hidden', 'mixed'] as const)('explains %s hidden harmony visibility loss and keeps dirty copy/native/undo contracts', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createHarmonyVisibilityFixture(kind), score = parseMusicXml(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'visibility.musicxml', filePath: '/fixture/visibility.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/숨김으로 지정된 코드 심벌의 표시 설정은 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('코드 숨김 설정 손실')
  const path = 'part[2].measure[2].harmony[1]'; expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' })); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented harmony visibility/)).toHaveTextContent('print-object="no"')
  fireEvent.keyDown(report.getByRole('button', { name: '기술 정보' }), { key: 'ArrowDown', code: 'ArrowDown' })
  expect(playbackMockState.lastScore).toEqual(score); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByTestId('notation-preview'), { key: 'ArrowUp', code: 'ArrowUp' })
  const edited = structuredClone(playbackMockState.lastScore), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  if (!edited) throw new Error('Edited score missing')
  expect(edited).not.toEqual(score); expect(selected).toBeTruthy()
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
  const copy = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
  expect(parseMusicXml(copy).harmonies).toEqual(edited.harmonies)
  expect(copy).not.toContain('print-object="no"')
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')).toBe(selected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
})
