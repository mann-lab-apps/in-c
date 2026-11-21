// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsFontFixture } from '../../testing/words-font-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it('explains lost font family and size with optional technical details and preserves save/reopen', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWordsFontFixture('staff'), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'font.musicxml', filePath: '/fixture/font.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/글자의 지정 글꼴은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/글자의 지정 크기는 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('글꼴·크기 서식 손실')
  const raw = report.getByText(/^Unrepresented words font-family /)
  expect(raw).not.toBeVisible()
  const technical = report.getAllByRole('button', { name: '기술 정보' })[0]
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(raw).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(score)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'font.chromatics', filePath: '/fixture/font.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('font.chromatics을 열었습니다.'))
  expect(playbackMockState.lastScore).toEqual(score)
})
