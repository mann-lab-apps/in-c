// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()

async function setup(kind: 'range' | 'note' | 'rest' = 'range') {
  const score = createScore({ title: 'Lyric selection context', parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [
    createNote({ id: 'lyric-first', position: createTimePosition(0), pitch: { step: 'C', octave: 4 }, lyrics: [{ number: 1, text: '처음' }] }),
    createRest({ id: 'lyric-rest', position: createTimePosition(T) }),
    createNote({ id: 'lyric-last', position: createTimePosition(2 * T), pitch: { step: 'D', octave: 4 }, lyrics: [{ number: 1, text: '다음' }] }),
    createRest({ id: 'lyric-tail', position: createTimePosition(3 * T) })
  ] })] })] })] })] })
  const contents = encodeNativeProject(createNativeProject(score)), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/test/lyric-context.chromatics', fileName: 'lyric-context.chromatics', contents })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  fireEvent.click(screen.getByRole('button', { name: `${kind === 'rest' ? 'lyric-rest' : 'lyric-first'} 선택` }))
  if (kind === 'range') fireEvent.click(screen.getByRole('button', { name: 'lyric-last 선택' }), { shiftKey: true })
  openStudioWorkspace('가사')
  return source
}

it('does not open the range focus as one selected lyric input', async () => {
  const source = await setup()
  expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 범위')
  expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
  expect(screen.getByText('음표를 선택하면 가사 입력 항목이 표시됩니다.')).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('does not expose single-note lyric properties for a range', async () => {
  await setup()
  expect(screen.queryByRole('button', { name: '가사 글자 입력' })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: '가사 음절' })).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: '멜리스마' })).not.toBeInTheDocument()
})

it('restores a single lyric edit and exactly one undo after leaving the range', async () => {
  const source = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'lyric-last 선택' }))
  openStudioWorkspace('가사')
  const input = screen.getByLabelText('선택 음표 가사')
  fireEvent.change(input, { target: { value: '고침' } }); fireEvent.blur(input)
  const expected = structuredClone(source)
  const event = expected.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[2]!
  if (event.type !== 'note') throw Error('Expected second fixture note')
  event.lyrics = [{ number: 1, text: '고침', syllabic: 'single' }]
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.blur(screen.getByLabelText('선택 음표 가사'))
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { code: 'KeyZ', key: 'z', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('removes the single lyric editor when selection changes to a range', async () => {
  const source = await setup('note')
  expect(screen.getByLabelText('선택 음표 가사')).toHaveValue('처음')
  fireEvent.click(screen.getByRole('button', { name: 'lyric-last 선택' }), { shiftKey: true })
  openStudioWorkspace('가사')
  expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('keeps Enter navigation from a rest to the next lyric note', async () => {
  const source = await setup('rest')
  expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Enter' })
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'lyric-last')
  expect(screen.getByLabelText('선택 음표 가사')).toHaveValue('다음')
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
