// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import type { Score } from '../../score-core'
import { createMidiWarningScore } from '../../testing/midi-warning-fixture'
import { serializeMidi } from './midi/serialize-midi'
import { openNotationSettings, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function openScore(source: Score) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/signature.chromatics', fileName: 'signature.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
}
async function saveUnchanged(source: Score) {
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
}

it.each([-7, 0, 4])('bare open→Tab preserves an unspecified key mode at fifths=%s and later measures', async fifths => {
  const source = createMidiWarningScore('percussion')
  for (const measure of source.parts[0].staves[0].measures) measure.keySignature = { fifths }
  await openScore(source)
  fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
  openStudioWorkspace('악보')
  const combo = screen.getByRole('combobox', { name: '조표' }), xml = serializeMusicXml(source), midi = serializeMidi(source)
  expect(combo).toHaveTextContent('장·단조 미지정 (현재)')
  fireEvent.click(combo)
  fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  await saveUnchanged(source)
})

it('Escape cancels an unspecified-mode candidate while an explicit mode edit remains undoable', async () => {
  const source = createMidiWarningScore('percussion')
  for (const measure of source.parts[0].staves[0].measures) measure.keySignature = { fifths: 4 }
  await openScore(source)
  fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
  openStudioWorkspace('악보')
  const combo = screen.getByRole('combobox', { name: '조표' })
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(combo)
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '마장조 (♯ 4개)' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures[1].keySignature).toEqual({ fifths: 4, mode: 'major' })
  expect(changed.parts[0].staves[0].measures[0]).toEqual(source.parts[0].staves[0].measures[0])
  expect(changed.parts[1]).toEqual(source.parts[1])
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
})

it('retains an intentional key choice via ArrowDown→Tab rather than ignoring all Tab commits', async () => {
  const source = createMidiWarningScore('percussion')
  for (const measure of source.parts[0].staves[0].measures) measure.keySignature = { fifths: 4 }
  await openScore(source)
  fireEvent.click(screen.getByRole('button', { name: '2마디 선택' })); openStudioWorkspace('악보')
  const combo = screen.getByRole('combobox', { name: '조표' })
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore!.parts[0].staves[0].measures[1].keySignature).toEqual({ fifths: 0, mode: 'major' })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
})

const clefCases = ['percussion', 'tab', 'octave'] as const
async function openClef(kind: typeof clefCases[number], scope: 'measure' | 'staff') {
  const source = createMidiWarningScore(kind === 'tab' ? 'tab' : 'percussion')
  if (kind === 'octave') source.parts[1].staves[0].measures[0].clef = { sign: 'G', line: 2, octaveChange: 1 }
  source.parts[1].staves[0].measures[1].clef = { sign: 'F', line: 4 }
  await openScore(source)
  fireEvent.click(screen.getByRole('button', { name: 'mixed-note-1 선택' }))
  if (scope === 'staff') openStudioWorkspace('악보')
  else {
    fireEvent.click(screen.getByRole('button', { name: `${source.parts[1].name} 보표 1 · 1마디 선택` }))
    openNotationSettings('clef')
  }
  return { source, combo: screen.getByRole('combobox', { name: scope === 'staff' ? '현재 보표 음자리표' : '선택 마디 음자리표' }) }
}

it.each(clefCases.flatMap(kind => (['measure', 'staff'] as const).map(scope => ({ kind, scope }))))('bare open→Tab preserves $kind at $scope scope without converting to treble', async ({ kind, scope }) => {
  const { source, combo } = await openClef(kind, scope), xml = serializeMusicXml(source), midi = serializeMidi(source)
  expect(combo).toBeEnabled()
  expect(combo).toHaveTextContent('(현재)')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(xml)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  await saveUnchanged(source)
})

it.each(['measure', 'staff'] as const)('Escape cancels $scope clef navigation and explicit conversion keeps its original scope and undo', async scope => {
  const { source, combo } = await openClef('tab', scope)
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Escape' })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(combo); fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '높은음자리표' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[1].staves[0].measures[0].clef).toEqual({ sign: 'G', line: 2 })
  expect(changed.parts[0]).toEqual(source.parts[0])
  if (scope === 'measure') expect(changed.parts[1].staves[0].measures[1]).toEqual(source.parts[1].staves[0].measures[1])
  else {
    expect(changed.parts[1].staves[0].measures[1].clef).toEqual({ sign: 'G', line: 2 })
    expect(changed.parts[1].staves[0].measures.map(measure => measure.voices)).toEqual(source.parts[1].staves[0].measures.map(measure => measure.voices))
  }
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
})

it.each(['measure', 'staff'] as const)('preserves intentional ArrowDown→Tab conversion at $scope clef scope', async scope => {
  const { source, combo } = await openClef('tab', scope)
  fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); fireEvent.keyDown(combo, { key: 'Tab' })
  expect(playbackMockState.lastScore!.parts[1].staves[0].measures[0].clef).toEqual({ sign: 'G', line: 2 })
  expect(playbackMockState.lastScore!.parts[1].staves[0].measures[1].clef).toEqual(scope === 'staff' ? { sign: 'G', line: 2 } : { sign: 'F', line: 4 })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
})
