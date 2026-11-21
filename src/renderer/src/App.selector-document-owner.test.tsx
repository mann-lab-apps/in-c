// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRest, TICKS_PER_QUARTER } from '../../score-core'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const fields = ['빠르기 기준 음가', '현재 보표 음자리표', '현재 파트 이조', '조표', '박자표'] as const
async function setup(label: typeof fields[number]) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const original = createPrintHeaderFixture('short'); original.score.title = '문서 A'
  original.score.tempo = { bpm:96, beatUnit:'quarter', dots:0 }
  if (label === '박자표') {
    const voice = original.score.parts[0].staves[0].measures[0].voices[0]
    voice.events[0].duration = { value:'half', dots:0 }
    voice.events.push(createRest({ id:'owner-rest', duration:{ value:'half', dots:0 }, position:{ tick:2 * TICKS_PER_QUARTER } }))
  }
  const next = structuredClone(original); next.score.title = '문서 B'; next.score.tempo!.bpm = 132
  // Deliberately reuse all IDs. A score ID is not a document-generation token.
  const file = { filePath:'/fixture/owner-b.chromatics', fileName:'owner-b.chromatics', contents:encodeNativeProject(next) }
  const bridge = vi.mocked(window.inC.project.open)
  bridge.mockResolvedValueOnce({ filePath:'/fixture/owner-a.chromatics', fileName:'owner-a.chromatics', contents:encodeNativeProject(original) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  bridge.mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(original.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(bridge).toHaveBeenCalledTimes(2))
  openStudioWorkspace('악보')
  const combo = screen.getByRole('combobox', { name:label })
  expect(combo).toBeEnabled(); act(() => combo.focus())
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true')
  expect(playbackMockState.lastScore).toEqual(original.score)
  return { original, next, file, finish, fail, combo }
}

it.each(fields)('discards the previous %s candidate after an accepted late document replacement with reused IDs', async label => {
  const { next, file, finish } = await setup(label)
  await act(async () => finish(file))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(next.score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  const current = screen.getByRole('combobox', { name:label })
  fireEvent.keyDown(current, { key:'Tab' })
  expect(playbackMockState.lastScore).toEqual(next.score)
  expect(current).toHaveAttribute('aria-expanded','false')
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(next.score))
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(next.score))
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true })
  expect(playbackMockState.lastScore).toEqual(next.score)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(next.score)
})

it.each(fields.flatMap(label => (['cancel','failure'] as const).map(result => ({ label, result }))))('retains the current $label candidate after a pending open $result', async ({ label, result }) => {
  const { original, finish, fail, combo } = await setup(label)
  await act(async () => result === 'cancel' ? finish(null) : fail(new Error('Owned read failure')))
  expect(playbackMockState.lastScore).toEqual(original.score)
  fireEvent.keyDown(combo, { key:'Tab' })
  expect(playbackMockState.lastScore).not.toEqual(original.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true })
  expect(playbackMockState.lastScore).toEqual(original.score)
})

it.each(fields)('accepts a fresh explicit %s edit in the new document with one exact undo/redo', async label => {
  const { next, finish, file } = await setup(label)
  await act(async () => finish(file))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(next.score))
  const current = screen.getByRole('combobox', { name:label })
  expect(current).toHaveAttribute('aria-expanded','false')
  fireEvent.click(current); fireEvent.keyDown(current, { key:'ArrowDown' }); fireEvent.keyDown(current, { key:'Tab' })
  const edited = structuredClone(playbackMockState.lastScore)
  expect(edited).not.toEqual(next.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true })
  expect(playbackMockState.lastScore).toEqual(next.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true })
  expect(playbackMockState.lastScore).toEqual(edited)
})
