// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createMidiPitchRangeFixture } from '../../testing/midi-pitch-range-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { readTestMidiEvents } from '../../testing/midi-events'
import { chooseScoreView, focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
import { App } from './App'
registerAppTestHooks()
async function setup(kind: 'upper' | 'lower' | 'edge-upper') {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createMidiPitchRangeFixture(kind), project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'range.chromatics', filePath: '/fixture/range.chromatics', contents: encodeNativeProject(project) })
  render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  return { score, project }
}
const save = () => { openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' })) }
it.each(['upper', 'lower'] as const)('blocks an unrepresentable %s MIDI before its bridge and retains dirty/selection/undo/Native then retries exactly', async kind => {
  const { score } = await setup(kind)
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' })); fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: '원문 음높이 유지' } }); fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
  const changed = structuredClone(playbackMockState.lastScore!), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), dirty = document.querySelector('.studio-document__state')!.textContent
  save()
  await waitFor(() => expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toHaveTextContent('음높이'))
  expect(window.inC.midi.save).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(changed)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  const failure = within(screen.getByRole('region', { name: 'MIDI 오류 상세' })), raw = failure.getByText(/Invalid MIDI pitch/)
  expect(raw).not.toBeVisible(); fireEvent.click(failure.getByRole('button', { name: '기술 정보' })); expect(raw).toBeVisible()
  focusTestBody(); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.click(screen.getByRole('button', { name: 'midi-range-note 선택' })); focusTestBody()
  fireEvent.keyDown(window, kind === 'upper' ? { key: 'g', code: 'KeyG' } : { key: 'ArrowUp', code: 'ArrowUp' })
  const corrected = structuredClone(playbackMockState.lastScore!); expect(corrected).not.toEqual(changed)
  expect(readTestMidiEvents(serializeMidi(corrected)).filter(event => event.status >> 4 === 9 && event.data[1] > 0).map(event => event.data[0])).toEqual([kind === 'upper' ? 127 : 0])
  expect(corrected.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({ type: 'note', pitch: kind === 'upper' ? { step: 'G', octave: 9, alter: 0 } : { step: 'C', octave: -1, alter: 0 } })
  const correctedDirty = document.querySelector('.studio-document__state')!.textContent
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'exact.mid' }); save()
  await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('exact.mid'))
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(corrected)))
  expect(screen.queryByRole('region', { name: 'MIDI 오류 상세' })).not.toBeInTheDocument(); expect(document.querySelector('.studio-document__state')!.textContent).toBe(correctedDirty)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(corrected)
})
it.each(['success', 'failure'] as const)('keeps the newer pitch preflight failure after an older pending MIDI %s', async outcome => {
  const { score } = await setup('edge-upper')
  let finish!: (value: { fileName: string }) => void, fail!: (error: Error) => void
  vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
  save(); await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', { name: 'midi-range-note 선택' })); focusTestBody(); fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const changed = structuredClone(playbackMockState.lastScore!); expect(changed).not.toEqual(score); save()
  await waitFor(() => expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toHaveTextContent(/Invalid MIDI pitch/))
  await act(async () => outcome === 'success' ? finish({ fileName: 'older.mid' }) : fail(new Error('Older disk failure')))
  expect(window.inC.midi.save).toHaveBeenCalledOnce(); expect(playbackMockState.lastScore).toEqual(changed)
  expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toHaveTextContent(/Invalid MIDI pitch/)
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('older.mid'); expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('Older disk failure')
})

it('checks the requested full-score or selected-part MIDI without rejecting a safe part because of an unexported high note', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['range-bad', 'range-safe']), note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw new Error('Expected fixture note')
  note.pitch = { step: 'B', octave: 9, alter: 0 }
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'scope.chromatics', filePath: '/fixture/scope.chromatics', contents: encodeNativeProject(project) })
  render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score)); save()
  await waitFor(() => expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toBeInTheDocument()); expect(window.inC.midi.save).not.toHaveBeenCalled()
  chooseScoreView('악보 보기', 'part'); chooseScoreView('파트보 선택', 'range-safe')
  const dirty = document.querySelector('.studio-document__state')!.textContent
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'safe-part.mid' }); save()
  await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce()); await waitFor(() => expect(screen.queryByRole('region', { name: 'MIDI 오류 상세' })).not.toBeInTheDocument())
  const safeBytes = new Uint8Array(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)
  expect(readTestMidiEvents(safeBytes).filter(event => event.status >> 4 === 9 && event.data[1] > 0).map(event => event.data[0])).toEqual([60])
  expect(playbackMockState.lastScore).toEqual(score); expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
  chooseScoreView('파트보 선택', 'range-bad'); save()
  await waitFor(() => expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toHaveTextContent(/Invalid MIDI pitch/)); expect(window.inC.midi.save).toHaveBeenCalledOnce()
  expect(playbackMockState.lastScore).toEqual(score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })); await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(score); expect(saved.view).toEqual({ mode: 'part', partId: 'range-bad' })
  if (process.env.DDIRORI_MIDI_PITCH_SCOPE_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path'), dir = process.env.DDIRORI_MIDI_PITCH_SCOPE_QA_DIR
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(project), { flag: 'wx' }); writeFileSync(join(dir, 'safe-part.mid'), safeBytes, { flag: 'wx' }); writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(saved), { flag: 'wx' })
  }
})
