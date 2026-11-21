// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
async function setup(verse = 1) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const p = createPrintHeaderFixture('short'); p.score.title = 'Lyric syllabic target owner'
  const a = p.score.parts[0].staves[0].measures[0].voices[0].events[0], b = p.score.parts[0].staves[0].measures[1].voices[0].events[0]
  if (a.type !== 'note' || b.type !== 'note') throw Error('Expected existing fixture notes')
  a.lyrics = [{ number: 1, text: '가', syllabic: 'single' }, { number: 2, text: '첫째', syllabic: 'single' }]
  b.lyrics = [{ number: 1, text: '나', syllabic: 'single' }, { number: 2, text: '둘째', syllabic: 'single' }]
  const contents = encodeNativeProject(p), source = decodeNativeProject(contents).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/lyric-target.chromatics', fileName: 'lyric-target.chromatics', contents })
  const { App } = await import('./App'); const view = render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source)); select(a.id, verse)
  return { source, a: a.id, b: b.id, App, view }
}
const tools = () => screen.getByRole('region', { name: '가사 속성' })
const field = (label = '가사 음절') => within(tools()).getByRole('combobox', { name: label })
function select(id: string, verse: number) { fireEvent.click(screen.getByRole('button', { name: `${id} ${verse}절 가사 선택` })) }
function pending(label = '가사 음절') { const combo = field(label); fireEvent.click(combo); fireEvent.keyDown(combo, { key: 'ArrowDown' }); expect(combo).toHaveAttribute('aria-expanded', 'true'); return combo }
async function save(expected: Awaited<ReturnType<typeof setup>>['source']) {
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
}
it.each([{ from: 1, to: 1, sameNote: false }, { from: 2, to: 2, sameNote: false }, { from: 1, to: 2, sameNote: true }])('discards the previous syllabic candidate for verse $from to $to sameNote=$sameNote', async ({ from, to, sameNote }) => {
  const { source, a, b } = await setup(from), region = tools(), open = within(region).getByRole('button', { name: '가사 글자 입력' }), previous = pending(), target = sameNote ? a : b
  select(target, to); expect(field()).toHaveAttribute('aria-expanded', 'false'); expect(previous.isConnected).toBe(false)
  expect(tools()).toBe(region); expect(within(region).getByRole('button', { name: '가사 글자 입력' })).toBe(open)
  fireEvent.keyDown(previous, { key: 'Tab' }); fireEvent.keyDown(field(), { key: 'Tab' })
  expect(playbackMockState.lastScore).toEqual(source); expect(field('가사 절')).toHaveTextContent(`${to}절`)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', target)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); await save(source)
})
it.each([1, 2])('retains a same-note verse %s candidate and exact explicit command/undo while Escape cancels only the candidate', async verse => {
  const { source, App, view } = await setup(verse), previous = pending(), candidate = previous.getAttribute('aria-activedescendant')
  view.rerender(<App />); expect(field()).toBe(previous); expect(previous).toHaveAttribute('aria-expanded', 'true'); expect(previous).toHaveAttribute('aria-activedescendant', candidate!)
  fireEvent.keyDown(previous, { key: 'Escape' }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(pending(), { key: 'Tab' }); const expected = structuredClone(source), note = expected.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected lyric note'); note.lyrics![verse - 1].syllabic = 'begin'
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
it('keeps verse navigation independent from the selected note without modifying score lyrics', async () => {
  const { source, b } = await setup(), verse = pending('가사 절'), candidate = verse.getAttribute('aria-activedescendant')
  select(b, 1); expect(field('가사 절')).toBe(verse); expect(verse).toHaveAttribute('aria-expanded', 'true'); expect(verse).toHaveAttribute('aria-activedescendant', candidate!)
  fireEvent.keyDown(verse, { key: 'Tab' }); expect(verse).toHaveTextContent('2절'); expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); await save(source)
})
it('accepts a fresh candidate only on the newly selected second-verse lyric with exact undo/redo', async () => {
  const { source, b } = await setup(); select(b, 2); fireEvent.keyDown(pending(), { key: 'Tab' })
  const expected = structuredClone(source), note = expected.parts[0].staves[0].measures[1].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected new lyric note'); note.lyrics![1].syllabic = 'begin'
  expect(playbackMockState.lastScore).toEqual(expected); expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(expected); await save(expected)
})
