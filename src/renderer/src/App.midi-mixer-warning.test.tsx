// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiMixerFixture } from '../../testing/midi-mixer-fixture'
import { parseMusicXmlWithReport } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['header-zero', 'direction-pan-zero'] as const)('explains %s original mixer loss while preserving the imported score', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  const { xml, baselineXml } = createMidiMixerFixture(kind), expected = parseMusicXmlWithReport(baselineXml).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'mixer.musicxml', filePath: '/fixture/mixer.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getAllByRole('listitem')).toHaveLength(1)
  expect(report.getByText(/원본의 악기별 음량·공간 배치 값은 보존하지 못했습니다/)).toBeVisible()
  const path = kind === 'header-zero' ? 'part-list.score-part[1].midi-instrument[1].volume' : 'part[2].measure[2].direction[1].sound.midi-instrument[1].pan'
  expect(report.getByText(path)).not.toBeVisible()
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: ' ', code: 'Space' }); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented MIDI instrument mixer.*value="0"/)).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
})
