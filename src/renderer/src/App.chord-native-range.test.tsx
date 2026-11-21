// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chordNativeRangeCases, chordNativeRangeFixture } from '../../testing/chord-native-range-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { expandNoteDetails, focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(chordNativeRangeCases)('keeps a persistable project through chord range editing: $kind', async spec => {
  const data = chordNativeRangeFixture(spec), before = structuredClone(data.project.score)
  expect(decodeNativeProject(encodeNativeProject(data.project)).score).toEqual(before)
  window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
  vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/fixture/chord-range.chromatics', fileName: 'chord-range.chromatics', contents: encodeNativeProject(data.project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(before))
  fireEvent.click(screen.getByRole('button', { name: 'qa-leading 선택' })); expandNoteDetails()
  const action = () => {
    if (spec.operation === 'shift-E') { focusTestBody(); fireEvent.keyDown(window, { key: 'E', code: 'KeyE', shiftKey: true }) }
    else fireEvent.click(within(screen.getByRole('region', { name: '선택 음표의 화음' })).getByRole('button', { name: spec.operation === 'add-third' ? '3도 추가' : '5도 추가' }))
  }
  action(); const observed = structuredClone(playbackMockState.lastScore!)
  let nativeError: string | undefined
  try { encodeNativeProject(createNativeProject(observed)) } catch (error) { nativeError = String(error) }
  const output = process.env.DDIRORI_CHORD_NATIVE_RANGE_QA_DIR
  if (output) {
    const dir = join(output, spec.kind); mkdirSync(dir, { recursive: true })
    for (const [name, contents] of Object.entries({
      'source.chromatics': encodeNativeProject(data.project),
      'expected.chromatics': encodeNativeProject(data.expected),
      'observed-after.json': JSON.stringify({ score: observed, nativeError, history: document.querySelector('.editor-status')?.textContent, status: document.querySelector('.studio-status__result')?.textContent }, null, 2),
      'oracle.json': JSON.stringify(spec, null, 2)
    })) writeFileSync(join(dir, name), contents, { flag: 'wx' })
  }
  expect(observed).toEqual(data.expected.score)
  expect(nativeError).toBeUndefined()
  expect(document.querySelector('.editor-status')).toHaveTextContent(spec.blocked ? '0회 수정' : '1회 수정')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'qa-leading')
  if (spec.blocked) expect(screen.getByText(/음높이 범위/)).toBeInTheDocument()
  else { action(); expect(playbackMockState.lastScore).toEqual(observed); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정'); expect(serializeMidi(observed)).toEqual(serializeMidi(data.expected.score)) }
  focusTestBody(); await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(data.expected.score)
  if (!spec.blocked) {
    focusTestBody(); fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(observed)
  }
  expect(data.project.score).toEqual(before)
}, 15_000)
