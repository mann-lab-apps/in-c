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

it.each(['window-blur', 'hidden', 'hidden-visible', 'visible-only', 'field-blur'] as const)(
  'invalidates stale manual navigation after %s only when the owning window loses availability', kind => {
    const frames = new Map<number, FrameRequestCallback>(); let id = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(token => { frames.delete(token) })
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    render(<StudioManual theme="light" onClose={vi.fn()} />)
    for (let i = 0; i < 4; i++) flush()
    const article = screen.getByRole('article', { name: '사용설명서 본문' })
    const chapter = screen.getByRole('button', { name: '재생과 믹서' })
    article.scrollTop = 120; chapter.focus(); fireEvent.click(chapter)
    expect(frames.size).toBeGreaterThan(0)
    if (kind === 'window-blur') fireEvent(window, new Event('blur'))
    if (kind === 'hidden' || kind === 'hidden-visible') {
      visibility.mockReturnValue('hidden'); fireEvent(document, new Event('visibilitychange'))
    }
    if (kind === 'visible-only' || kind === 'hidden-visible') {
      visibility.mockReturnValue('visible'); fireEvent(document, new Event('visibilitychange'))
    }
    if (kind === 'field-blur') fireEvent.blur(chapter)
    // A controlled queued-frame oracle; native window transitions are verified separately.
    article.scrollTop = 321
    flush()
    if (['window-blur', 'hidden', 'hidden-visible'].includes(kind)) {
      expect(article.scrollTop, 'An unavailable owner cannot apply its older reveal').toBe(321)
      expect(chapter).toHaveFocus()
    } else {
      expect(article.scrollTop).toBe(0); expect(article).toHaveFocus()
    }
    visibility.mockReturnValue('visible')
    fireEvent(document, new Event('visibilitychange')); fireEvent(window, new Event('focus'))
    const previous = article.scrollTop
    const next = screen.getByRole('button', { name: '악보 구성' }); next.focus(); fireEvent.click(next); flush()
    expect(article.scrollTop).toBe(0); expect(article).toHaveFocus()
    const back = screen.getByRole('button', { name: '이전 항목' }); back.focus(); fireEvent.click(back); flush()
    expect(article.scrollTop).toBe(previous); expect(article).toHaveFocus()
  },
)
