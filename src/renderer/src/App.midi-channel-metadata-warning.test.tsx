// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiChannelMetadataFixture } from '../../testing/midi-channel-metadata-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['header-percussion', 'direction', 'mixed'] as const)('explains %s channel loss without changing the imported score, local mixer or history', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  const fixture = createMidiChannelMetadataFixture(kind), expected = parseMusicXml(fixture.baselineXml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'channel.musicxml', filePath: '/fixture/channel.musicxml', contents: fixture.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/원본의 MIDI 채널 지정은 보존하지 못했습니다/)).toBeVisible()
  const path = kind === 'direction' ? 'part[2].measure[2].direction[1].sound.midi-instrument[1].midi-channel' : 'part-list.score-part[1].midi-instrument[1].midi-channel'
  expect(report.getByText(path)).not.toBeVisible()
  const channelRow = within(report.getByText(path).closest('li')!)
  fireEvent.click(channelRow.getByRole('button', { name: /^기술 정보$/ }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented MIDI instrument channel.*value=/)).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})

it('keeps an ordinary instrument definition warning-free', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const fixture = createMidiChannelMetadataFixture('definition-only')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'channel-control.musicxml', filePath: '/fixture/channel-control.musicxml', contents: fixture.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(fixture.xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
