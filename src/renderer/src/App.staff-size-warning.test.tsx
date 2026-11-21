// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStaffSizeFixture } from '../../testing/staff-size-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['space70', 'combined'] as const)('explains %s size loss with a concise status and complete report', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createStaffSizeFixture(kind), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'staff-size.musicxml', filePath: '/fixture/staff-size.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  const message = report.getByText(/원본의 개별 보표 크기 또는 기보 배율 지정은 보존하지 못했습니다/)
  expect(message).toBeVisible(); expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 개별 보표 설정 손실을 확인')
  const item = within(message.closest('li')!), path = 'part[2].measure[10].attributes[1].staff-details[1].staff-size'
  expect(item.getByText(path)).not.toBeVisible(); expect(playbackMockState.lastScore).toEqual(score)
  const technical = item.getByRole('button', { name: '기술 정보' })
  for (const [key, code] of [[' ', 'Space'], ['Enter', 'Enter']]) fireEvent.keyDown(technical, { key, code })
  expect(playbackMockState.play).not.toHaveBeenCalled(); fireEvent.click(technical)
  expect(item.getByText(path)).toBeVisible(); expect(item.getByText(/Unrepresented individual staff size /)).toBeVisible()
  if (kind === 'combined') expect(report.getByText(/원본의 보표 줄 수는 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
