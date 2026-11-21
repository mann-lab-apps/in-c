// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { createMidiWarningScore } from '../../testing/midi-warning-fixture'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function openTransposition(kind: 'custom' | 'mixed' | 'normal') {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createMidiWarningScore('percussion')
  const measures = source.parts[0].staves[0].measures
  if (kind === 'custom') for (const measure of measures) measure.transposition = { diatonic: -1, chromatic: -1 }
  if (kind === 'mixed') {
    measures[0].transposition = { diatonic: -1, chromatic: -2 }
    measures[1].transposition = { diatonic: -5, chromatic: -9 }
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/transpose.chromatics', fileName: 'transpose.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: 'supported-note-1 선택' }))
  openStudioWorkspace('악보')
  return { source, combo: screen.getByRole('combobox', { name: '현재 파트 이조' }) }
}

it.each(['custom', 'mixed'] as const)('bare open→Tab preserves %s transposition and sounding MIDI/native', async kind => {
  const { source, combo } = await openTransposition(kind), midi = serializeMidi(source), xml = serializeMusicXml(source)
  expect(combo).toHaveTextContent('사용자 지정 / 혼합')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(source)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/transpose-reopened.chromatics', fileName: 'transpose-reopened.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  openStudioWorkspace('악보')
  expect(screen.getByRole('combobox', { name: '현재 파트 이조' })).toHaveTextContent('사용자 지정 / 혼합')
})

it('Escape preserves custom transposition while explicit preset assignment retains whole-part scope and undo', async () => {
  const { source, combo } = await openTransposition('mixed')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(combo); fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'B♭ (장2도 아래)' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures.every(measure => measure.transposition?.diatonic === -1 && measure.transposition.chromatic === -2)).toBe(true)
  expect(changed.parts[0].staves[0].measures.map(measure => measure.voices)).toEqual(source.parts[0].staves[0].measures.map(measure => measure.voices))
  expect(changed.parts[1]).toEqual(source.parts[1])
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
})

it('does not create custom transposition by choosing the unavailable sentinel from an ordinary part', async () => {
  const { source, combo } = await openTransposition('normal')
  fireEvent.click(combo)
  expect(within(screen.getByRole('listbox')).getByRole('option', { name: '사용자 지정 / 혼합' })).toHaveAttribute('aria-disabled', 'true')
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(7)
  fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('still accepts an intentionally navigated concert preset through ArrowDown→Tab with exact undo', async () => {
  const { source, combo } = await openTransposition('custom')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore!.parts[0].staves[0].measures.every(measure => measure.transposition?.chromatic === 0 && measure.transposition.diatonic === 0)).toBe(true)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
})
