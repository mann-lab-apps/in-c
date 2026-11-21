// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStaffLineFixture } from '../../testing/staff-line-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['one', 'second-staff'] as const)('explains %s non-five-line source loss while retaining existing music and diagnostics', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createStaffLineFixture(kind), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'staff-lines.musicxml', filePath: '/fixture/staff-lines.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/원본의 보표 줄 수는 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/현재는 5선 보표로 표시됩니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 개별 보표 설정 손실을 확인')
  const path = 'part[2].measure[10].attributes[1].staff-details[1].staff-lines'
  expect(report.getByText(path)).not.toBeVisible(); expect(playbackMockState.lastScore).toEqual(score)
  const technical = report.getByRole('button', { name: '기술 정보' })
  for (const [key, code] of [[' ', 'Space'], ['Enter', 'Enter']]) fireEvent.keyDown(technical, { key, code })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(report.getByText(path)).toBeVisible(); expect(report.getByText(/Unrepresented staff line count /)).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
