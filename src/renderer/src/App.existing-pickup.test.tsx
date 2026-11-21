// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createDuration, createNote, createRest, createTimePosition, TICKS_PER_QUARTER as T } from '../../score-core'
import { createNewScore } from './editor/new-score'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
beforeEach(() => { Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })
async function setup(pickup: boolean | number = false, occupied = false) {
  const score = createNewScore({ title: '기존 첫 마디', templateId: 'piano-grand-staff', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }, ...(pickup ? { pickupDurationTicks: typeof pickup === 'number' ? pickup : T / 2 } : {}) })
  for (const staff of score.parts[0].staves) staff.measures.forEach((m, i) => { m.number = i + 11 })
  if (occupied) score.parts[0].staves[1].measures[0].voices[0].events = [
    createNote({ id: 'protected-note', pitch: { step: 'C', octave: 3 }, position: createTimePosition(0) }),
    createRest({ id: 'tail-rest', position: createTimePosition(T), duration: createDuration('half', 1) })]
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/first.chromatics', fileName: 'first.chromatics', contents: encodeNativeProject(project) })
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  return project
}
function open() {
  fireEvent.click(screen.getByRole('button', { name: '형식' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '첫 마디 길이…' }))
  return within(screen.getByRole('dialog', { name: '첫 마디 길이' }))
}
function shortcut(key: string, code: string, shiftKey = false) {
  fireEvent.keyDown(window, { key, code, ctrlKey: true, shiftKey })
}

it('converts every empty first staff once while retaining numbers, IDs, neighbors and undo/native', async () => {
  const project = await setup(); const d = open()
  expect(d.getByText(/모든 보표의 빈 첫 마디/)).toBeInTheDocument()
  expect(d.getByRole('button', { name: '적용' })).toBeDisabled()
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' }))
  fireEvent.click(d.getByRole('button', { name: '적용' }))
  const changed = playbackMockState.lastScore!
  expect(changed.parts[0].staves.map(s => s.measures[0].timing)).toEqual(Array(2).fill({ type: 'pickup', durationTicks: T / 2 }))
  expect(changed.parts[0].staves.map(s => s.measures.map(m => m.number))).toEqual([[11, 12, 13], [11, 12, 13]])
  changed.parts[0].staves.forEach((s, i) => {
    expect(s.measures[0].voices).toEqual(project.score.parts[0].staves[i].measures[0].voices)
    expect(s.measures.slice(1)).toEqual(project.score.parts[0].staves[i].measures.slice(1))
  })
  expect(decodeNativeProject(encodeNativeProject({ ...project, score: changed })).score).toEqual(changed)
  shortcut('z', 'KeyZ'); expect(playbackMockState.lastScore).toEqual(project.score)
  shortcut('z', 'KeyZ', true); expect(playbackMockState.lastScore).toEqual(changed)
})

it('keeps invalid/IME drafts local and blocks save until applied or canceled', async () => {
  const project = await setup(); const d = open()
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' }))
  const count = d.getByRole('spinbutton', { name: '못갖춘마디 개수' }), form = d.getByRole('form', { name: '첫 마디 길이' })
  for (const value of ['', '0', '1.5', '999', '8']) {
    fireEvent.change(count, { target: { value } }); fireEvent.submit(form)
    expect(count).toHaveAttribute('aria-invalid', 'true'); expect(playbackMockState.lastScore).toEqual(project.score)
  }
  fireEvent.change(count, { target: { value: '2' } }); fireEvent.compositionStart(count); fireEvent.submit(form)
  fireEvent.keyDown(count, { key: 'Escape', code: 'Escape', isComposing: true })
  expect(screen.getByRole('dialog', { name: '첫 마디 길이' })).toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.compositionEnd(count)
  fireEvent.keyDown(count, { key: 's', code: 'KeyS', ctrlKey: true })
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(d.getByRole('alert')).toHaveTextContent('적용하거나 취소')
  shortcut('s', 'KeyS')
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(count).toHaveFocus()
  fireEvent.click(d.getByRole('button', { name: '취소' }))
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('refuses occupied first staves without changing notes', async () => {
  const project = await setup(false, true); const d = open()
  expect(d.getByRole('alert')).toHaveTextContent('온마디 쉼표')
  expect(d.getByRole('button', { name: '적용' })).toBeDisabled()
  fireEvent.click(d.getByRole('button', { name: '취소' })); expect(playbackMockState.lastScore).toEqual(project.score)
})

it('seeds the current pickup and restores regular timing with one undo', async () => {
  const project = await setup(true); const d = open()
  expect(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' })).toBeChecked()
  expect(d.getByRole('spinbutton', { name: '못갖춘마디 개수' })).toHaveValue(1)
  expect(d.getByRole('button', { name: '적용' })).toBeDisabled()
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' })); fireEvent.submit(d.getByRole('form', { name: '첫 마디 길이' }))
  expect(playbackMockState.lastScore!.parts[0].staves.map(s => s.measures[0].timing)).toEqual(Array(2).fill({ type: 'regular' }))
  shortcut('z', 'KeyZ'); expect(playbackMockState.lastScore).toEqual(project.score)
})

it('does not open a length editor while an uncommitted tuplet owns input', async () => {
  const project = await setup()
  fireEvent.click(screen.getByRole('button', { name: `${project.score.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택` }))
  fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
  fireEvent.click(screen.getByRole('button', { name: '셋잇단음표 적용 또는 입력 준비, 단축키 ⌘/Ctrl+3' }))
  fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
  fireEvent.click(screen.getByRole('button', { name: '형식' }))
  expect(screen.getByRole('menuitem', { name: '첫 마디 길이…' })).toBeDisabled()
  expect(screen.queryByRole('dialog', { name: '첫 마디 길이' })).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(project.score)
})

it('discards the old modal draft when a pending file open replaces the document', async () => {
  await setup()
  const replacement = createNativeProject(createNewScore({ title: '다른 문서', measureCount: 2, keySignature: { fifths: 0 }, timeSignature: { beats: 3, beatType: 4 } }))
  let finish!: (value: { filePath: string; fileName: string; contents: string }) => void
  vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  const d = open(), form = d.getByRole('form', { name: '첫 마디 길이' })
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' }))
  fireEvent.change(d.getByRole('spinbutton', { name: '못갖춘마디 개수' }), { target: { value: '2' } })
  await act(async () => finish({ filePath: '/fixture/replacement.chromatics', fileName: 'replacement.chromatics', contents: encodeNativeProject(replacement) }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(replacement.score))
  expect(screen.queryByRole('dialog', { name: '첫 마디 길이' })).not.toBeInTheDocument()
  expect(form.isConnected).toBe(false); fireEvent.submit(form)
  expect(playbackMockState.lastScore).toEqual(replacement.score)
})

it('preserves unusual imported pickup timing through invalid/no-edit cancellation', async () => {
  const project = await setup(1), d = open(), input = d.getByRole('spinbutton', { name: '못갖춘마디 개수' })
  expect(input).toHaveValue(null)
  fireEvent.submit(d.getByRole('form', { name: '첫 마디 길이' }))
  expect(input).toHaveAttribute('aria-invalid', 'true'); expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.click(d.getByRole('button', { name: '취소' })); expect(playbackMockState.lastScore).toEqual(project.score)
})

it('releases the draft save guard after apply and preserves the score/dirty/undo on write failure', async () => {
  const project = await setup(), d = open()
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로' })); fireEvent.submit(d.getByRole('form', { name: '첫 마디 길이' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error('pickup-write-failed'))
  shortcut('s', 'KeyS')
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('프로젝트 저장을 마무리하지 못했습니다.'))
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('pickup-write-failed')
  const technical = within(screen.getByRole('group', { name: '프로젝트 저장 기술 정보' }))
  fireEvent.click(technical.getByRole('button', { name: '기술 정보' }))
  expect(technical.getByText('pickup-write-failed')).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  shortcut('z', 'KeyZ'); expect(playbackMockState.lastScore).toEqual(project.score)
})
