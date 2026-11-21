// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createHarmonyDegreeFixture } from '../../testing/harmony-degree-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()

it.each(['add', 'hidden'] as const)('explains %s chord-degree loss before technical detail without changing score or starting playback', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createHarmonyDegreeFixture(kind), score = parseMusicXml(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'chord-degree.musicxml', filePath: '/fixture/chord-degree.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getAllByText(/코드 심벌의 추가·변경·생략 구성음 정보는 보존하지 못했습니다/)).toHaveLength(1)
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('코드 구성음 정보 손실')
  const path = 'part[2].measure[2].harmony[1].degree[1]'
  expect(report.getByText(path)).not.toBeVisible(); expect(playbackMockState.lastScore).toEqual(score)
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: ' ', code: 'Space' }); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented chord degree /)).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
