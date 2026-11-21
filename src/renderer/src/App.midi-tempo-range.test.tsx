// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createTempoRoundtripFixture } from '../../testing/tempo-roundtrip-fixture'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['global', 'position'] as const)('blocks a wrapped $scope MIDI before its bridge and keeps dirty, selection and undo', async scope => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { score } = createTempoRoundtripFixture(scope, 1), project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'slow.chromatics', filePath: '/fixture/slow.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  const event = project.score.parts[0].staves[0].measures[0].voices[0].events.find(e => e.type === 'note')!
  fireEvent.click(screen.getByRole('button', { name: event.id + ' 선택' }))
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed).not.toEqual(project.score)
  const dirty = document.querySelector('.studio-document__state')!.textContent, selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'), xml = serializeMusicXml(changed)
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('현재 빠르기를 MIDI 파일에 정확히 기록할 수 없습니다.'))
  expect(window.inC.midi.save).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(document.querySelector('.studio-document__state')!.textContent).toBe(dirty)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
  expect(screen.getByRole('region', { name: 'MIDI 오류 상세' })).toHaveTextContent('빠르기와 기준 음가')
  const failure = screen.getByRole('region', { name: 'MIDI 오류 상세' }), raw = within(failure).getByText(/Invalid MIDI tempo/)
  expect(raw).not.toBeVisible()
  fireEvent.click(within(failure).getByText('기술 정보')); expect(raw).toBeVisible()
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  if (scope === 'position') {
    const owner = changed.parts[0].staves[0].measures[1].voices[0].events.find(e => e.type === 'note')!
    fireEvent.click(screen.getByRole('button', { name: owner.id + ' 선택' }))
  }
  openStudioWorkspace('악보')
  if (scope === 'global') fireEvent.change(screen.getByRole('slider', { name: /^빠르기/ }), { target: { value: '41' } })
  else {
    const input = screen.getByRole('spinbutton', { name: '위치별 빠르기 BPM' })
    expect(input).toHaveValue(1)
    fireEvent.change(input, { target: { value: '96' } }); fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.blur(input)
  }
  const corrected = structuredClone(playbackMockState.lastScore!), copyDirty = document.querySelector('.studio-document__state')!.textContent
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'corrected.mid' })
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('corrected.mid'))
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(corrected)))
  expect(screen.queryByRole('region', { name: 'MIDI 오류 상세' })).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(corrected)
  expect(document.querySelector('.studio-document__state')!.textContent).toBe(copyDirty)
  if (process.env.STUDIO_MIDI_TEMPO_RANGE_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
    const dir = process.env.STUDIO_MIDI_TEMPO_RANGE_QA_DIR; mkdirSync(dir, { recursive: true })
    for (const [name, value] of [['source', project.score], ['dirty', changed], ['corrected', corrected]] as const) {
      writeFileSync(join(dir, `${scope}-${name}.chromatics`), encodeNativeProject({ ...project, score: value }), { flag: 'wx' })
    }
    writeFileSync(join(dir, `${scope}-corrected.mid`), serializeMidi(corrected), { flag: 'wx' })
    writeFileSync(join(dir, `${scope}.json`), JSON.stringify({ scope, firstEventId: event.id, correctionBpm: scope === 'global' ? 41 : 96 }), { flag: 'wx' })
  }
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(corrected)
})
