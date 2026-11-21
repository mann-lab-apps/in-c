// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioManual } from './StudioManual'
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const cases = ['wheel-y', 'wheel-x', 'touch', 'pointer', 'page', 'zero-wheel', 'none', 'composing-page'] as const
it.each(cases)('keeps a newer manual %s viewport intent and still permits explicit chapter/back navigation', kind => {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  render(<StudioManual theme="light" onClose={vi.fn()} />)
  for (let i = 0; i < 4; i++) flush()
  const article = screen.getByRole('article', { name: '사용설명서 본문' }), chapter = screen.getByRole('button', { name: '재생과 믹서' })
  article.scrollTop = 120; chapter.focus(); fireEvent.click(chapter)
  expect(frames.size).toBeGreaterThan(0)
  const manual = !['zero-wheel', 'none', 'composing-page'].includes(kind)
  if (kind === 'wheel-y') fireEvent.wheel(article, { deltaY: 60, deltaX: 0 })
  if (kind === 'wheel-x') fireEvent.wheel(article, { deltaY: 0, deltaX: 60 })
  if (kind === 'touch') fireEvent.touchMove(article)
  if (kind === 'pointer') fireEvent.pointerDown(article)
  if (kind === 'page') { article.focus(); fireEvent.keyDown(article, { key: 'PageDown' }) }
  if (kind === 'zero-wheel') fireEvent.wheel(article, { deltaY: 0, deltaX: 0 })
  if (kind === 'composing-page') fireEvent.keyDown(chapter, { key: 'PageDown', isComposing: true, keyCode: 229 })
  // jsdom does not scroll on native gestures. This is the newer browser-owned
  // position; actual Electron validation is separate from this queued-frame oracle.
  if (manual) article.scrollTop = 321
  const active = document.activeElement
  flush()
  if (manual) {
    expect(article.scrollTop, 'A stale chapter callback must not replace the newer manual position').toBe(321)
    expect(document.activeElement).toBe(active)
  } else {
    expect(article.scrollTop).toBe(0); expect(article).toHaveFocus()
  }
  const previousScroll = article.scrollTop
  const next = screen.getByRole('button', { name: '악보 구성' }); next.focus(); fireEvent.click(next); flush()
  expect(article).toHaveFocus(); expect(article.scrollTop).toBe(0)
  const back = screen.getByRole('button', { name: '이전 항목' }); back.focus(); fireEvent.click(back); flush()
  expect(article).toHaveFocus(); expect(article.scrollTop).toBe(previousScroll)
})
