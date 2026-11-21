// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMidiUnpitchedMetadataFixture } from '../../testing/midi-unpitched-metadata-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['header', 'secondary', 'direction', 'mixed'] as const)('explains %s source percussion assignment loss without changing score, mixer, history or save', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  const f = createMidiUnpitchedMetadataFixture(kind), expected = parseMusicXml(f.baselineXml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'source-percussion.musicxml', filePath: '/fixture/source-percussion.musicxml', contents: f.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  const path = kind === 'direction' ? 'part[2].measure[2].direction[1].sound.midi-instrument[1].midi-unpitched'
    : `part-list.score-part[${kind === 'secondary' ? 2 : 1}].midi-instrument[1].midi-unpitched`
  expect(report.getByText(/원본의 MIDI 타악기 음 번호 지정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(within(report.getByText(path).closest('li')!).getByRole('button', { name: /^기술 정보$/ }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented MIDI instrument unpitched/)).toHaveTextContent(`value="${f.value}"`)
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})

it('does not invent percussion routing loss for an ordinary instrument definition', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const f = createMidiUnpitchedMetadataFixture('definition-only')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'source-control.musicxml', filePath: '/fixture/source-control.musicxml', contents: f.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(f.xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
