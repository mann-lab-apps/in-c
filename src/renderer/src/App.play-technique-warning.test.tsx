// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPlayTechniqueFixture } from '../../testing/play-technique-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['note-mute', 'direct', 'direction', 'mixed'] as const)('explains %s source techniques without changing notes or local mixer mute', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  const fixture = createPlayTechniqueFixture(kind), expected = parseMusicXml(fixture.baselineXml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'source-technique.musicxml', filePath: '/fixture/source-technique.musicxml', contents: fixture.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/원본의 재생 연주법 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/현재 믹서의 음소거와는 다른 설정입니다/)).toBeVisible()
  const prefix = kind === 'direct' ? 'part[1].measure[1].sound[1]' : kind === 'direction'
    ? 'part[2].measure[1].direction[1].sound' : 'part[1].measure[1].note[1]'
  const path = report.getByText(prefix + '.play[1]')
  expect(path).not.toBeVisible()
  fireEvent.click(within(path.closest('li')!).getByRole('button', { name: /^기술 정보$/ }))
  expect(path).toBeVisible()
  expect(report.getByText(/Unrepresented playback technique/)).toHaveTextContent(`owner="${kind === 'note-mute' || kind === 'mixed' ? 'note' : 'sound'}"`)
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})

it.each(['empty', 'control'] as const)('does not invent a loss notice for %s playback instructions', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const fixture = createPlayTechniqueFixture(kind)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'control.musicxml', filePath: '/fixture/control.musicxml', contents: fixture.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(fixture.xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
