// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createTempoRoundtripFixture } from '../../testing/tempo-roundtrip-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml } from '../../musicxml'
import { readTestMidiEvents } from '../../testing/midi-events'
import { beatDeltaToSeconds, createPlaybackTimeline, tempoMarkingToQuarterBpm } from './playback/timeline'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

function clock(score: ReturnType<typeof parseMusicXml>, partId = score.parts[0].id) {
  const timeline = createPlaybackTimeline(score), bpm = score.tempo ? tempoMarkingToQuarterBpm(score.tempo) : 120
  return timeline.events.filter(e => e.partId === partId && e.frequency !== undefined).map(e => beatDeltaToSeconds(timeline, 0, e.startBeat, bpm))
}
// Integrate the actual emitted SMF tempo bytes independently of the App clock.
function midiClock(contents: number[]) {
  const bytes = Uint8Array.from(contents), division = new DataView(bytes.buffer).getUint16(12), events = readTestMidiEvents(bytes)
  const tempos = events.filter(e => e.status === 255 && e.data[0] === 81)
  return events.filter(e => e.track === 1 && e.status >> 4 === 9 && e.data[1] > 0).map(note => {
    let tick = 0, seconds = 0, micros = 500000
    for (const tempo of tempos) { if (tempo.tick > note.tick) break; seconds += (tempo.tick - tick) / division * micros / 1000000; tick = tempo.tick; micros = tempo.data[1] * 65536 + tempo.data[2] * 256 + tempo.data[3] }
    return seconds + (note.tick - tick) / division * micros / 1000000
  })
}

it.each((['primary', 'alias', 'selected'] as const).flatMap(anchor => (['midi', 'structure', 'expanded'] as const).map(format => ({ anchor, format }))))
('keeps score-common tempo in $anchor / $format part copies without changing the original', async ({ anchor, format }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { score } = createTempoRoundtripFixture('position', 60), part = score.parts[1]
  score.tempoEvents![0].measureId = anchor === 'alias' ? 'measure-2' : score.parts[anchor === 'primary' ? 0 : 1].staves[0].measures[1].id
  const project = createNativeProject(score);project.view = { mode: 'part', partId: part.id }
  const original = encodeNativeProject(project), expected = clock(score, part.id)
  expect(expected).toEqual([0, 2, 6])
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/common-tempo.chromatics', fileName: 'common-tempo.chromatics', contents: original })
  const { App } = await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), preview = structuredClone(playbackMockState.lastPreviewScore)
  openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button', { name: format === 'midi' ? 'MIDI 내보내기' : format === 'structure' ? 'MusicXML 내보내기' : '반복 펼치기 MusicXML 내보내기' }))
  if (format === 'midi') {
    await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
    expect(midiClock(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)).toEqual(expected)
  } else {
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    const copy = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    expect(copy.parts).toHaveLength(1);expect(clock(copy)).toEqual(expected)
    expect(copy.tempoEvents?.map(({ bpm, beatUnit, dots, text }) => ({ bpm, beatUnit, dots, text }))).toEqual([{ bpm: 60, beatUnit: 'quarter', dots: 0, text: 'QA 빠르기' }])
  }
  expect(playbackMockState.lastScore).toEqual(score);expect(playbackMockState.lastPreviewScore).toEqual(preview)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음');expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(score);expect(saved.view).toEqual(project.view)
})
