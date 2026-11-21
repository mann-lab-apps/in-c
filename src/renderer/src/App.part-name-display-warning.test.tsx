// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartNameDisplayFixture } from '../../testing/part-name-display-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['nameStyled', 'abbreviationHiddenEmpty'] as const)('explains %s display loss without changing Native or consuming technical-detail Space', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createPartNameDisplayFixture(kind)
  const score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'part-display.musicxml', filePath: '/fixture/part-display.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/별도로 지정된 파트 이름·약칭의 표시 설정은 보존하지 못했습니다/)).toBeVisible()
  const path = `part-list.score-part[1].${kind === 'nameStyled' ? 'part-name-display' : 'part-abbreviation-display'}`
  expect(report.getByText(path)).not.toBeVisible(); expect(playbackMockState.lastScore).toEqual(score)
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: ' ', code: 'Space' }); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented part name display /)).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
