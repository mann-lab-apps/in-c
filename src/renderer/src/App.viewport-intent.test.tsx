// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { listSpans } from './editor/span-editing'
import { chooseSpanReference, installCompactDockMedia, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('queued workspace viewport intent', () => {
  registerAppTestHooks()
  it.each(['focus', 'validation'] as const)('studio.viewport-intent lets newer manual navigation cancel queued %s reveal', async kind => {
    const media = installCompactDockMedia(), frames = new Map<number, FrameRequestCallback>()
    let id = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const foreground = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const queued = [...frames.values()]; frames.clear(); queued.forEach(cb => cb(0)) })
    try {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App'); render(<App />)
      const score = structuredClone(playbackMockState.lastScore!)
      let input: HTMLInputElement
      if (kind === 'validation') {
        const span = listSpans(score).find(s => s.kind === 'hairpin')!
        chooseSpanReference(`${span.kind}:${span.id}`)
        fireEvent.click(screen.getByRole('button', { name: '배치 · 형상' }))
        input = screen.getByLabelText('표기 세로 이동')
      } else input = screen.getByRole('searchbox', { name: '표기 기호 검색' })
      const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      input.scrollIntoView = vi.fn()
      vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 850, 230, 40))
      vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
      act(() => screen.getByRole('button', { name: '악보로 이동' }).focus()); frames.clear()
      act(() => input.focus())
      if (kind === 'validation') {
        fireEvent.change(input, { target: { value: '99' } }); frames.clear()
        act(() => input.blur())
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveValue(null)
      }
      expect(frames.size).toBeGreaterThan(0)
      fireEvent.wheel(document.documentElement, { deltaY: -500 })
      const active = document.activeElement
      flush()
      expect(input.scrollIntoView).not.toHaveBeenCalled()
      expect(scroll).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(active)
      expect(playbackMockState.lastScore).toEqual(score)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      // A new explicit focus request still reveals the same field/error.
      act(() => { screen.getByRole('button', { name: '악보로 이동' }).focus(); input.focus() }); flush()
      expect(input.scrollIntoView).toHaveBeenCalled()
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { cleanup(); media.restore(); raf.mockRestore(); cancel.mockRestore(); foreground.mockRestore(); scroll.mockRestore() }
  })
})
