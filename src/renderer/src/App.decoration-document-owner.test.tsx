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
const tools = () => within(screen.getByRole('region', { name:'선택 음표의 장식' }))
async function setup(nextRest = false) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createPrintHeaderFixture('short'); a.score.title = '장식 문서 A'
  const b = structuredClone(a); b.score.title = '장식 문서 B'
  if (nextRest) {
    const voice = b.score.parts[0].staves[0].measures[0].voices[0], note = voice.events[0]
    voice.events[0] = createRest({ id:note.id, duration:note.duration })
  }
  const file = { filePath:'/fixture/decoration-b.chromatics', fileName:'decoration-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/decoration-a.chromatics', fileName:'decoration-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  openStudioWorkspace('음표')
  const combo = tools().getByRole('combobox', { name:'트레몰로' })
  act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true'); expect(playbackMockState.lastScore).toEqual(a.score)
  return { a, b, file, finish, fail, combo }
}
it('does not apply an old tremolo candidate to a new same-ID document', async () => {
  const { b, file, finish } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const combo = tools().getByRole('combobox', { name:'트레몰로' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(combo).toHaveAttribute('aria-expanded','false'); expect(combo).toHaveTextContent('없음')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score))
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(b.score)
})
it.each(['cancel','failure'] as const)('keeps the old explicit tremolo edit after read %s with one undo/redo', async outcome => {
  const { a, finish, fail, combo } = await setup()
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned decoration read failure')))
  fireEvent.keyDown(combo, { key:'Tab' })
  const expected = structuredClone(a.score), note = expected.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected a note')
  note.tremolo = { type:'single', marks:1 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(a.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(expected)
})
it('keeps a fresh explicit tremolo edit in the new document with one undo/redo', async () => {
  const { b, finish, file } = await setup()
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const combo = tools().getByRole('combobox', { name:'트레몰로' }); expect(combo).toHaveAttribute('aria-expanded','false')
  fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' }); fireEvent.keyDown(combo, { key:'Tab' })
  const expected = structuredClone(b.score), note = expected.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected the new document note')
  note.tremolo = { type:'single', marks:1 }
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(b.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(expected)
})
it('keeps decorations absent when the newly selected event is a rest', async () => {
  const { b, finish, file } = await setup(true)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  expect(screen.queryByRole('region', { name:'선택 음표의 장식' })).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(b.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
