// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createTempoRoundtripFixture } from '../../testing/tempo-roundtrip-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['global', 'position', 'alias', 'part'] as const)('identifies the request-time %s tempo correction location without moving the selection', async mode => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { score } = createTempoRoundtripFixture(mode === 'global' ? 'global' : 'position', 1)
  for (const part of score.parts) for (const staff of part.staves) staff.measures[1].number = 7
  if (mode === 'alias' || mode === 'part') score.tempoEvents![0].measureId = 'measure-7'
  const project = createNativeProject(score)
  if (mode === 'part') project.view = { mode: 'part', partId: score.parts[1].id }
  const source = encodeNativeProject(project)
  expect(decodeNativeProject(source).score).toEqual(score)
  const expectedLabel = mode === 'global' ? '악보 기본 빠르기' : '7마디의 위치별 빠르기 (총보 공통)'
  if (process.env.DDIRORI_MIDI_TEMPO_LOCATION_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
    const dir = join(process.env.DDIRORI_MIDI_TEMPO_LOCATION_QA_DIR, mode)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), source, { flag: 'wx' })
    const corrected = structuredClone(project)
    if (mode === 'global') corrected.score.tempo!.bpm = 41
    else corrected.score.tempoEvents![0].bpm = 96
    writeFileSync(join(dir, 'expected-corrected.chromatics'), encodeNativeProject(corrected), { flag: 'wx' })
    // This fixture has only aligned ordinary notes and global tempo. A selected
    // part retains its own track and the same ordinal global tempo anchor.
    const midiScore = mode === 'part' ? { ...corrected.score, parts: [corrected.score.parts[1]] } : corrected.score
    writeFileSync(join(dir, 'expected-corrected.mid'), serializeMidi(midiScore), { flag: 'wx' })
    writeFileSync(join(dir, 'case.json'), JSON.stringify({ mode, project, corrected, expectedLabel }), { flag: 'wx' })
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'tempo-location.chromatics', filePath: '/fixture/tempo-location.chromatics', contents: source })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const dirty = document.querySelector('.studio-document__state')!.textContent
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  const report = await screen.findByRole('region', { name: 'MIDI 오류 상세' })
  expect(report.querySelector('.dd-banner .dd-text')).toHaveTextContent(expectedLabel)
  expect(within(report).getByText(/Invalid MIDI tempo/)).not.toBeVisible()
  fireEvent.click(within(report).getByRole('button', { name: '기술 정보' }))
  expect(within(report).getByText(/Invalid MIDI tempo/)).toBeVisible()
  expect(window.inC.midi.save).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(score)
  expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  if (mode !== 'part') {
    if (mode !== 'global') {
      const note = score.parts[0].staves[0].measures[1].voices[0].events.find(event => event.type === 'note')!
      fireEvent.click(screen.getByRole('button', { name: note.id + ' 선택' }))
    }
    openStudioWorkspace('악보')
    if (mode === 'global') fireEvent.change(screen.getByRole('slider', { name: /^빠르기/ }), { target: { value: '41' } })
    else {
      const input = screen.getByRole('spinbutton', { name: '위치별 빠르기 BPM' })
      expect(input).toHaveValue(1)
      fireEvent.change(input, { target: { value: '96' } }); fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.blur(input)
    }
    const corrected = structuredClone(playbackMockState.lastScore!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'corrected.mid' })
    openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
    await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
    expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(corrected)))
    expect(screen.queryByRole('region', { name: 'MIDI 오류 상세' })).not.toBeInTheDocument()
  }
})
