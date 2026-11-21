// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { createNote, createRest, decomposeDurationTicks, durationToTicks, measureDurationTicks, TICKS_PER_QUARTER } from '../../score-core'
import { createNewScore } from './editor/new-score'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function openMeter(beats: number, beatType = 8) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createNewScore({ title: '기존 박자표 보존', templateId: 'string-quartet', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats, beatType } })
  const measure = source.parts[0].staves[0].measures[1]
  let tick = TICKS_PER_QUARTER
  const rests = decomposeDurationTicks(measureDurationTicks(measure) - tick)!
  measure.voices[0].events = [createNote({ id: 'preserved-meter-note', pitch: { step: 'C', octave: 4 } }),
    ...rests.map((duration, index) => {
      const rest = createRest({ id: `meter-rest-${index}`, duration, position: { tick } })
      tick += durationToTicks(duration)
      return rest
    })]
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/meter.chromatics', fileName: 'meter.chromatics',
    contents: encodeNativeProject(createNativeProject(source)) })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
  openStudioWorkspace('악보')
  return { source, combo: screen.getByRole('combobox', { name: '박자표' }) }
}

it.each([7, 11])('opening and tabbing out of stored %s/8 preserves meter, rhythm, selection, native and copies', async beats => {
  const { source, combo } = await openMeter(beats)
  const xml = serializeMusicXml(source), midi = serializeMidi(source)
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-measure-id')
  expect(combo).toHaveTextContent(`${beats}/8 (현재)`)
  fireEvent.click(combo)
  fireEvent.keyDown(combo, { key: 'Tab', code: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-measure-id')).toBe(selection)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(source)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/reopened-meter.chromatics', fileName: 'reopened-meter.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  openStudioWorkspace('악보')
  expect(screen.getByRole('combobox', { name: '박자표' })).toHaveTextContent(`${beats}/8 (현재)`)
})

it.each([7, 11])('Escape after navigating stored %s/8 cancels the candidate without an undo step', async beats => {
  const { source, combo } = await openMeter(beats)
  fireEvent.click(combo)
  fireEvent.keyDown(combo, { key: 'ArrowDown' })
  fireEvent.keyDown(combo, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('keeps the current custom meter as the active available choice instead of priming a different preset', async () => {
  const { source, combo } = await openMeter(7)
  fireEvent.click(combo)
  const current = within(screen.getByRole('listbox')).getByRole('option', { name: '7/8 (현재)' })
  expect(within(screen.getByRole('listbox')).getAllByRole('option').map(option => option.getAttribute('data-value')))
    .toEqual(['current-custom', '2-4', '3-4', '4-4', '6-8'])
  expect(current).toHaveAttribute('aria-selected', 'true')
  expect(current).not.toHaveAttribute('aria-disabled', 'true')
  expect(current).toHaveAttribute('data-active', 'true')
  fireEvent.click(current)
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('keeps normal 4/4 open→Tab a no-op without changing authored presets', async () => {
  const { source, combo } = await openMeter(4, 4)
  fireEvent.click(combo)
  expect(within(screen.getByRole('listbox')).queryByRole('option', { name: /현재/ })).not.toBeInTheDocument()
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(4)
  fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('still applies an explicit meter to one selected measure with exact undo and redo', async () => {
  const { source, combo } = await openMeter(11)
  fireEvent.click(combo)
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '3/4' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures[1].timeSignature).toEqual({ beats: 3, beatType: 4 })
  expect(changed.parts[0].staves[0].measures[0]).toEqual(source.parts[0].staves[0].measures[0])
  expect(changed.parts[0].staves[0].measures[2]).toEqual(source.parts[0].staves[0].measures[2])
  expect(changed.parts.slice(1)).toEqual(source.parts.slice(1))
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(combo).toHaveTextContent('11/8 (현재)')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(playbackMockState.play).not.toHaveBeenCalled()
})

it('does not commit an IME Tab event before Escape restores the current meter', async () => {
  const { source, combo } = await openMeter(7)
  fireEvent.click(combo)
  fireEvent.keyDown(combo, { key: 'Tab', keyCode: 229, isComposing: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(combo, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('still commits an intentionally navigated meter with ArrowDown→Tab and one undo', async () => {
  const { source, combo } = await openMeter(7)
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore!.parts[0].staves[0].measures[1].timeSignature).toEqual({ beats: 2, beatType: 4 })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
})
