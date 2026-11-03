// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function setup(tied = false, range = true) {
  const events = Array.from({ length: 4 }, (_, index) => createNote({ id: `tie-scope-${index}`, position: createTimePosition(index * T), pitch: { step: index === 0 ? 'D' : 'C', octave: 4 } }))
  if (tied) { events[1]!.ties = { start: true }; events[2]!.ties = { stop: true } }
  const score = createScore({ title: 'Tie range context', parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events })] })] })] })] })
  const contents = encodeNativeProject(createNativeProject(score)), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/test/tie-scope.chromatics', fileName: 'tie-scope.chromatics', contents })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: `${range ? 'tie-scope-0' : 'tie-scope-1'} 선택` }))
  if (range) fireEvent.click(screen.getByRole('button', { name: 'tie-scope-1 선택' }), { shiftKey: true })
  return source
}

it.each([false, true])('does not present a range focus tie as an editable single tie: tied=%s', async tied => {
  const source = await setup(tied)
  const button = screen.getByRole('button', { name: /타이 (추가|해제), 단축키 T/ })
  expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 범위')
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(playbackMockState.lastScore).toEqual(source)
})

it.each(['button', 'shortcut'] as const)('does not connect a range focus to its unselected neighbour through %s', async trigger => {
  const source = await setup()
  if (trigger === 'button') fireEvent.click(screen.getByRole('button', { name: '타이 추가, 단축키 T' }))
  else fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 범위')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('keeps one selected note tie command and exact undo available', async () => {
  const source = await setup(false, false)
  const button = screen.getByRole('button', { name: '타이 추가, 단축키 T' })
  expect(button).toBeEnabled(); fireEvent.click(button)
  const expected = structuredClone(source), events = expected.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events
  if (events[1]!.type !== 'note' || events[2]!.type !== 'note') throw Error('Expected fixture notes')
  events[1]!.ties = { start: true }; events[2]!.ties = { stop: true }
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
