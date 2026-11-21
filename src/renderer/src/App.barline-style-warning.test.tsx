// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createBarlineStyleFixture } from '../../testing/barline-style-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each([['light-light', '이중 마디선'], ['dashed', '대시 마디선']])('explains lost %s outside technical details without altering supported data', async (style, label) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createBarlineStyleFixture({ style }), supported = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/barline.musicxml', fileName: 'barline.musicxml', contents: xml })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/barline.chromatics', fileName: 'barline.chromatics' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(new RegExp(`^1번째 파트 · 1마디 · 원본의 ${label} 모양은 가져오지 못했습니다`))).toBeVisible()
  expect(report.getByText('part[1].measure[1].barline[1].bar-style')).not.toBeVisible()
  expect(playbackMockState.lastScore).toEqual(supported)
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText('part[1].measure[1].barline[1].bar-style')).toBeVisible()
  expect(report.getByText(new RegExp(`Explicit barline style "${style}"`))).toBeVisible()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})
