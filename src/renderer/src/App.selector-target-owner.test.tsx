// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRest } from '../../score-core'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
const field = () => within(screen.getByRole('region', { name: '선택 음표의 장식' })).getByRole('combobox', { name: '트레몰로' })
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createPrintHeaderFixture('short'), score = project.score
  const notes = score.parts[0].staves[0].measures.map(bar => bar.voices[0].events[0])
  const a = notes[0].id, b = notes[1].id, rest = notes[2].id
  score.parts[0].staves[0].measures[2].voices[0].events[0] = createRest({ id: rest, duration: notes[2].duration })
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/target-owner.chromatics', fileName: 'target-owner.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: a + ' 선택' })); openStudioWorkspace('음표')
  const combo = field(); act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded', 'true'); expect(playbackMockState.lastScore).toEqual(score)
  return { project, score, a, b, rest }
}
it.each(['other-note', 'return-to-first', 'through-rest'] as const)('discards the pending note-A candidate for same-document selection %s', async scenario => {
  const { score, a, b, rest } = await setup()
  if (scenario === 'through-rest') {
    fireEvent.click(screen.getByRole('button', { name: rest + ' 선택' }))
    expect(screen.queryByRole('region', { name: '선택 음표의 장식' })).not.toBeInTheDocument()
  }
  fireEvent.click(screen.getByRole('button', { name: b + ' 선택' }))
  if (scenario === 'return-to-first') fireEvent.click(screen.getByRole('button', { name: a + ' 선택' }))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.keyDown(field(), { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(score)
  expect(field()).toHaveAttribute('aria-expanded', 'false')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(score))
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
it.each(['same-target', 'fresh-target', 'cancel-fresh'] as const)('preserves explicit edit/undo and cancellation for %s', async scenario => {
  const { score, b } = await setup()
  if (scenario !== 'same-target') {
    fireEvent.click(screen.getByRole('button', { name: b + ' 선택' }))
    const combo = field(); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' })
  }
  fireEvent.keyDown(field(), { key: scenario === 'cancel-fresh' ? 'Escape' : 'Tab' })
  const expected = structuredClone(score)
  if (scenario !== 'cancel-fresh') {
    const note = expected.parts[0].staves[0].measures[scenario === 'same-target' ? 0 : 1].voices[0].events[0]
    if (note.type !== 'note') throw Error('Expected note')
    note.tremolo = { type: 'single', marks: 1 }
  }
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent(scenario === 'cancel-fresh' ? '0회 수정' : '1회 수정')
  if (scenario !== 'cancel-fresh') {
    fireEvent.keyDown(field(), { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(field(), { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(playbackMockState.lastScore).toEqual(expected)
  }
})
