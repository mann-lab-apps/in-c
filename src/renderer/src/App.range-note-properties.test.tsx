// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const cards = ['선택 음표의 화음', '선택 음표의 장식', '선택한 표기의 연주 기호']
async function setup(kind: 'note' | 'rest' | 'single-note' | 'single-rest' = 'note') {
  const score = createScore({ title: 'Range note property scope', parts: [createPart({ staves: [createStaff({ measures: [createMeasure({
    keySignature: { fifths: 4, mode: 'major' }, voices: [createVoice({ events: [
      createNote({ id: 'scope-sharp', position: createTimePosition(0), pitch: { step: 'C', octave: 4, alter: 1 } }),
      createNote({ id: 'scope-natural', position: createTimePosition(T), pitch: { step: 'C', octave: 4, alter: 0 } }),
      createRest({ id: 'scope-rest', position: createTimePosition(2 * T), duration: { value: 'half', dots: 0 } })
    ] })]
  })] })] })] })
  const contents = encodeNativeProject(createNativeProject(score)), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/test/range-note-properties.chromatics', fileName: 'range-note-properties.chromatics', contents })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  const id = kind.includes('rest') ? 'scope-rest' : 'scope-natural'
  if (!kind.startsWith('single')) fireEvent.click(screen.getByRole('button', { name: 'scope-sharp 선택' }))
  fireEvent.click(screen.getByRole('button', { name: `${id} 선택` }), { shiftKey: !kind.startsWith('single') })
  if (!kind.startsWith('single')) expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 범위')
  const dock = document.getElementById('studio-properties')!
  return { source, dock, accidental: within(screen.getByRole('group', { name: '임시표' })) }
}

it.each(['note', 'rest'] as const)('does not present the %s range focus as an accidental edit target', async kind => {
  const { source, accidental } = await setup(kind)
  for (const label of ['플랫', '제자리표', '샤프']) {
    const button = accidental.getByRole('button', { name: label })
    expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-pressed', 'false')
  }
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['note', 'rest'] as const)('does not show one-event inspector cards for the %s range focus', async kind => {
  const { dock } = await setup(kind)
  for (const name of cards) expect(dock.querySelector(`[aria-label="${name}"]`)).toBeNull()
})

it('cannot change only the focused rest through a range inspector', async () => {
  const { source, dock } = await setup('rest')
  const accidentalTarget = dock.querySelector<HTMLButtonElement>('[aria-label="선택한 표기의 연주 기호"] button[aria-label="페르마타"]')
  if (accidentalTarget) fireEvent.click(accidentalTarget)
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('restores selected-event tools when a single note replaces the range', async () => {
  const { source, dock, accidental } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'scope-natural 선택' }))
  expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('선택한 표기')
  expect(accidental.getByRole('button', { name: '제자리표' })).toBeEnabled()
  for (const name of cards) expect(dock.querySelector(`[aria-label="${name}"]`)).not.toBeNull()
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('keeps a single rest fermata command available without editing notes', async () => {
  const { source, dock, accidental } = await setup('single-rest')
  expect(accidental.getByRole('button', { name: '제자리표' })).toBeDisabled()
  const marks = dock.querySelector('[aria-label="선택한 표기의 연주 기호"]')!
  const fermata = marks.querySelector<HTMLButtonElement>('button[aria-label="페르마타"]')!
  expect(fermata).toBeEnabled(); fireEvent.click(fermata)
  const actual = playbackMockState.lastScore!, expected = structuredClone(source)
  expected.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[2]!.fermata = true
  expect(actual).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})

it('keeps explicit natural distinct from auto when starting next input at a range focus', async () => {
  const { source, accidental } = await setup()
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active', 'true')
  expect(screen.getByLabelText('도구 적용 대상')).toHaveTextContent('다음 입력')
  expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent('임시표 자동')
  const natural = accidental.getByRole('button', { name: '제자리표' })
  expect(natural).toBeEnabled(); fireEvent.click(natural)
  expect(natural).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent('제자리표')
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
