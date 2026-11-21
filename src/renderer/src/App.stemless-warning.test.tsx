// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createStemlessFixture } from '../../testing/stemless-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['quarter', 'half'] as const)('explains lost %s stem hiding in Korean and retains raw diagnostics and supported native data', async value => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createStemlessFixture({ value }), supported = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/stem.musicxml', fileName: 'stem.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/^1번째 파트 · 1마디 · 원본의 줄기 숨김 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText('part[1].measure[1].note[1].stem')).not.toBeVisible()
  expect(playbackMockState.lastScore).toEqual(supported)
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText('part[1].measure[1].note[1].stem')).toBeVisible()
  expect(report.getByText(/Explicit stem hiding/)).toBeVisible()
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})
