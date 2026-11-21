// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsColorFixture } from '../../testing/words-color-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it('explains lost text color with optional keyboard-safe diagnostics and preserves native save/reopen', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWordsColorFixture('staff'), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'color.musicxml', filePath: '/fixture/color.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/글자의 지정 색은 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('글자의 지정 색 손실')
  const raw = report.getByText(/^Unrepresented words color /)
  expect(raw).not.toBeVisible()
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(raw).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(score)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'color.chromatics', filePath: '/fixture/color.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('color.chromatics을 열었습니다.'))
  expect(playbackMockState.lastScore).toEqual(score)
})
