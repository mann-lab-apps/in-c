// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMusicXml } from '../../musicxml'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const lyricTools = () => within(screen.getByRole('region', { name:'가사 속성' }))
async function setup(verse: 1 | 2 = 1, field = '가사 음절') {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const a = createPrintHeaderFixture('short'); a.score.title = '가사 문서 A'
  const note = a.score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected a real note')
  note.lyrics = [{ number:1, text:'가', syllabic:'single' }, { number:2, text:'둘', syllabic:'single' }]
  const b = structuredClone(a); b.score.title = '가사 문서 B'
  const nextNote = b.score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (nextNote.type !== 'note') throw Error('Expected next document note')
  nextNote.lyrics = [{ number:1, text:'나', syllabic:'single' }, { number:2, text:'두번째', syllabic:'single' }]
  const file = { filePath:'/fixture/lyric-b.chromatics', fileName:'lyric-b.chromatics', contents:encodeNativeProject(b) }
  const open = vi.mocked(window.inC.project.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/lyric-a.chromatics', fileName:'lyric-a.chromatics', contents:encodeNativeProject(a) })
  let finish!: (value: typeof file | null) => void, fail!: (error: Error) => void
  open.mockImplementationOnce(() => new Promise((resolve,reject) => { finish = resolve; fail = reject }))
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(a.score))
  if (verse === 2) {
    openStudioWorkspace('가사'); fireEvent.click(lyricTools().getByRole('combobox', { name:'가사 절' }))
    fireEvent.click(screen.getByRole('option', { name:'2절' }))
  }
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2))
  openStudioWorkspace('가사')
  const combo = lyricTools().getByRole('combobox', { name:field })
  act(() => combo.focus()); fireEvent.click(combo); fireEvent.keyDown(combo, { key:'ArrowDown' })
  expect(combo).toHaveAttribute('aria-expanded','true')
  expect(playbackMockState.lastScore).toEqual(a.score)
  return { a, b, file, finish, fail, combo }
}

it.each([1,2] as const)('discards the old syllabic candidate after a same-ID document replacement at verse%s', async verse => {
  const { b, finish, file } = await setup(verse)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  const current = lyricTools().getByRole('combobox', { name:'가사 음절' })
  fireEvent.keyDown(current, { key:'Tab' })
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(current).toHaveAttribute('aria-expanded','false')
  expect(lyricTools().getByRole('combobox', { name:'가사 절' })).toHaveTextContent(`${verse}절`)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(serializeMusicXml(playbackMockState.lastScore!)).toBe(serializeMusicXml(b.score))
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(b.score))
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(b.score)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(b.score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath:'/fixture/reopen.chromatics', fileName:'reopen.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 열기' }))
  await waitFor(() => expect(window.inC.project.open).toHaveBeenCalledTimes(3))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('reopen.chromatics'))
  expect(playbackMockState.lastScore).toEqual(b.score)
  openStudioWorkspace('가사')
  expect(lyricTools().getByRole('combobox', { name:'가사 절' })).toHaveTextContent(`${verse}절`)
  expect(lyricTools().getByRole('combobox', { name:'가사 음절' })).toHaveTextContent('한 음절')
})

it.each(['cancel','failure'] as const)('keeps the old lyric candidate through open %s with one undo/redo', async outcome => {
  const { a, finish, fail, combo } = await setup()
  await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Owned lyric read failure')))
  expect(playbackMockState.lastScore).toEqual(a.score)
  fireEvent.keyDown(combo, { key:'Tab' })
  const expected = structuredClone(a.score), note = expected.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected lyric note')
  note.lyrics![0].syllabic = 'begin'
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(a.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(expected)
})

it('discards an uncommitted verse candidate without changing new document lyrics or the selected verse', async () => {
  const { b, finish, file } = await setup(1, '가사 절')
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const combo = lyricTools().getByRole('combobox', { name:'가사 절' }); fireEvent.keyDown(combo, { key:'Tab' })
  expect(combo).toHaveTextContent('1절'); expect(combo).toHaveAttribute('aria-expanded','false')
  expect(playbackMockState.lastScore).toEqual(b.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each([1,2] as const)('keeps a fresh verse%s syllabic edit scoped to its new lyric with one undo/redo', async verse => {
  const { b, finish, file } = await setup(verse)
  await act(async () => finish(file)); await waitFor(() => expect(playbackMockState.lastScore).toEqual(b.score))
  const current = lyricTools().getByRole('combobox', { name:'가사 음절' })
  expect(current).toHaveAttribute('aria-expanded','false')
  fireEvent.click(current); fireEvent.keyDown(current, { key:'ArrowDown' }); fireEvent.keyDown(current, { key:'Tab' })
  const expected = structuredClone(b.score), note = expected.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected new document lyric note')
  note.lyrics![verse - 1].syllabic = 'begin'
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).toEqual(b.score)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(expected)
})
