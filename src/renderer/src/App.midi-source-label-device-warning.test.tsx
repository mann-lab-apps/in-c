// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiSourceLabelDeviceFixture } from '../../testing/midi-source-label-device-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['name-whitespace', 'device-empty', 'device-direction', 'mixed'] as const)('explains %s source metadata loss while preserving score/mixer/history and Native save', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  const fixture = createMidiSourceLabelDeviceFixture(kind), expected = parseMusicXml(fixture.baselineXml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'source-routing.musicxml', filePath: '/fixture/source-routing.musicxml', contents: fixture.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  const name = kind.startsWith('name-') || kind === 'mixed'
  const path = kind === 'device-direction' ? 'part[2].measure[2].direction[1].sound.midi-device[1]'
    : name ? 'part-list.score-part[1].midi-instrument[1].midi-name' : 'part-list.score-part[1].midi-device[1]'
  expect(report.getByText(name ? /원본의 MIDI 악기 이름은 보존하지 못했습니다/ : /원본의 MIDI 장치 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(within(report.getByText(path).closest('li')!).getByRole('button', { name: /^기술 정보$/ }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(name ? /Unrepresented MIDI instrument name/ : /Unrepresented MIDI device/)).toBeVisible()
  if (kind === 'name-whitespace') expect(report.getByText(/Unrepresented MIDI instrument name/).textContent).toContain('value="  Studio Piano & Pads  "')
  if (kind === 'device-empty') expect(report.getByText(/Unrepresented MIDI device/).textContent).toContain('name="", port="1", instrument="P1-I1"')
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})

it('does not invent source label/device warnings for ordinary instrument definitions', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const f = createMidiSourceLabelDeviceFixture('definition-only')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'source-control.musicxml', filePath: '/fixture/source-control.musicxml', contents: f.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(f.xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
