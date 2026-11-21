// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createDuration, createNote, createRest, createTimePosition, TICKS_PER_QUARTER as T, validateMeasureRhythm } from '../../score-core'
import { createNewScore } from './editor/new-score'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
beforeEach(() => { Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })

async function setup(count: 3 | 5) {
  const score = createNewScore({ title: '잇단음표 문맥', templateId: 'duet', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const voice = score.parts[0].staves[0].measures[0].voices[0]
  const ratio = { actualNotes: count, normalNotes: count === 3 ? 2 : 4 }
  const events = Array.from({ length: count }, (_, i) => createNote({ id: `member-${i}`,
    position: createTimePosition(i * T / count), pitch: { step: 'C', octave: 4 },
    duration: { ...createDuration(count === 3 ? 'eighth' : '16th'), tuplet: ratio } }))
  voice.events = [...events, createRest({ id: 'tail', position: createTimePosition(T), duration: createDuration('half', 1) })]
  voice.tuplets = [{ id: 'selected-group', ...ratio, eventIds: events.map(e => e.id) }]
  const project = createNativeProject(score)
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/context.chromatics', fileName: 'context.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: 'member-0 선택' }))
  return project
}

it.each([3, 5] as const)('names the selected %s group removal and preserves one undo/native/neighbors', async count => {
  const project = await setup(count), name = count === 3 ? '셋잇단음표' : '다섯잇단음표'
  const button = screen.getByRole('button', { name: `${name} 해제, 단축키 ⌘/Ctrl+3` })
  expect(button).toBeEnabled(); fireEvent.click(button)
  const changed = playbackMockState.lastScore!, bar = changed.parts[0].staves[0].measures[0]
  expect(bar.voices[0].tuplets ?? []).toEqual([])
  expect(validateMeasureRhythm(bar).isExact).toBe(true)
  expect(changed.parts[0].staves[0].measures[1]).toEqual(project.score.parts[0].staves[0].measures[1])
  expect(changed.parts[1]).toEqual(project.score.parts[1])
  expect(document.querySelector('.editor-status')).toHaveTextContent(`선택한 ${name}를 해제했습니다.`)
  expect(decodeNativeProject(encodeNativeProject({ ...project, score: changed })).score).toEqual(changed)
  fireEvent.keyDown(window, { code: 'KeyZ', key: 'z', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(screen.getByRole('button', { name: `${name} 해제, 단축키 ⌘/Ctrl+3` })).toBeEnabled()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each([3, 5] as const)('distinguishes next input from selected %s removal and pending cancellation', async count => {
  const project = await setup(count)
  fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
  const prepare = screen.getByRole('button', { name: '셋잇단음표 적용 또는 입력 준비, 단축키 ⌘/Ctrl+3' })
  expect(prepare.querySelector('[data-music-glyph="tuplet"]')).not.toBeNull()
  fireEvent.click(prepare)
  const cancel = screen.getByRole('button', { name: '셋잇단음표 입력 취소, 단축키 ⌘/Ctrl+3 또는 Esc' })
  expect(cancel).toBeEnabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.click(cancel)
  expect(screen.getByRole('button', { name: '셋잇단음표 적용 또는 입력 준비, 단축키 ⌘/Ctrl+3' })).toBeEnabled()
  fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
  expect(screen.getByRole('button', { name: `${count === 3 ? '셋잇단음표' : '다섯잇단음표'} 해제, 단축키 ⌘/Ctrl+3` })).toBeEnabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
