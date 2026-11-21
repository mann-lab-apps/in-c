// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioManual } from './StudioManual'
import { manualChapters, searchManual, resolveManualLink } from './studio-manual'
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('bundles real content and resolves only known local chapters', () => {
  expect(manualChapters.every(chapter => chapter.content.length > 100)).toBe(true)
  expect(searchManual('옥타브 음높이').some(result => result.anchor === 'pitch')).toBe(true)
  expect(searchManual('존재하지않는기능XYZ')).toEqual([])
  expect(resolveManualLink('javascript:alert(1)', 'start')).toBeUndefined()
  expect(resolveManualLink('../../package.json', 'start')).toBeUndefined()
  expect(resolveManualLink('03-notes.md#pitch', 'start')).toEqual({ chapterId: 'notes', anchor: 'pitch' })
})
it('supports empty search, results, in-document links and previous-item navigation', async () => {
  render(<StudioManual theme="dark" onClose={vi.fn()} />)
  const input = screen.getByRole('searchbox', { name: '사용설명서 검색' })
  fireEvent.change(input, { target: { value: '없는기능XYZ' } })
  expect(screen.getByRole('status')).toHaveTextContent('일치하는 설명이 없습니다.')
  fireEvent.change(input, { target: { value: '꾸밈음 붙이기' } })
  fireEvent.click(screen.getByRole('button', { name: /꾸밈음 붙이기와 기존 음표 변환/ }))
  expect(screen.getByRole('heading', { name: '꾸밈음 붙이기와 기존 음표 변환' })).toBeInTheDocument()
  expect(input).toHaveValue('')
  const article = screen.getByRole('article', { name: '사용설명서 본문' })
  await waitFor(() => expect(article).toHaveFocus())
  fireEvent.click(within(article).getAllByRole('link', { name: '지원 범위' })[0])
  expect(screen.getByRole('heading', { name: '직접 지원·제한·보존만 가능한 데이터' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '이전 항목' }))
  expect(screen.getByRole('heading', { name: '꾸밈음 붙이기와 기존 음표 변환' })).toBeInTheDocument()
})
it('keeps composing Escape/Enter local; plain Escape closes once and returns focus', async () => {
  const close = vi.fn()
  const parent = vi.fn()
  const origin = document.createElement('button'); document.body.append(origin); origin.focus()
  const { unmount } = render(<div onKeyDown={parent}><StudioManual theme="light" onClose={close} /></div>)
  const input = screen.getByRole('searchbox', { name: '사용설명서 검색' })
  fireEvent.compositionStart(input)
  for (const key of ['Escape', 'Enter', ' ']) fireEvent.keyDown(input, { key })
  expect(close).not.toHaveBeenCalled(); expect(parent).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input); fireEvent.keyDown(input, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  unmount(); expect(origin).toHaveFocus(); origin.remove()
})
it('a queued chapter reveal does not take focus from a newer search interaction', () => {
  const callbacks = new Map<number, FrameRequestCallback>(); let id = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callbacks.set(++id, callback); return id })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(token => { callbacks.delete(token) })
  render(<StudioManual theme="light" onClose={vi.fn()} />)
  const input = screen.getByRole('searchbox', { name: '사용설명서 검색' })
  const chapter = screen.getByRole('button', { name: '재생과 믹서' }); chapter.focus(); fireEvent.click(chapter)
  input.focus()
  act(() => { for (const callback of callbacks.values()) callback(performance.now()); callbacks.clear() })
  expect(input).toHaveFocus()
})

it('makes MuseScore support gaps available offline with an explicit current-support boundary', () => {
  render(<StudioManual theme="light" onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'MuseScore와의 차이' }))
  const article = screen.getByRole('article', { name: '사용설명서 본문' })
  expect(article).toHaveTextContent('현재 지원과 앞으로의 작업을 구분합니다')
  expect(article).toHaveTextContent('사용자 지정 박자표')
  expect(article).toHaveTextContent('부분 화음 타이')
  expect(article).toHaveTextContent('출시 일정이나 지원 약속이 아닙니다')
  fireEvent.change(screen.getByRole('searchbox', { name: '사용설명서 검색' }), { target: { value: '메트로놈' } })
  expect(screen.getByRole('button', { name: /MuseScore와의 차이.*재생과 파일 교환/ })).toBeInTheDocument()
})
