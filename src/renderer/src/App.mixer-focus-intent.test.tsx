// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['checkbox', 'range'] as const)('preserves a newer manual viewport intent before the queued mixer %s focus reveal', async kind => {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  try {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { App } = await import('./App'); render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const toggle = screen.getByRole('button', { name: '믹서 표시' })
    fireEvent.click(toggle)
    // Finish the separate mixer-open destination before testing a new focus.
    for (let i = 0; i < 4; i++) flush()
    const field = (kind === 'checkbox'
      ? screen.getByRole('checkbox', { name: 'Melody 음소거' })
      : screen.getByRole('slider', { name: /^Melody 볼륨/ })) as HTMLInputElement
    const label = field.labels![0]
    vi.spyOn(field, 'getBoundingClientRect').mockImplementation(() => new DOMRect(30, 850, 100, 24))
    vi.spyOn(label, 'getBoundingClientRect').mockImplementation(() => new DOMRect(30, 840, 180, 48))
    vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 100))
    field.scrollIntoView = vi.fn()
    for (const intent of ['wheel', 'touch', 'zero-wheel', 'none'] as const) {
      act(() => toggle.focus()); flush(); frames.clear(); scroll.mockClear(); vi.mocked(field.scrollIntoView).mockClear()
      act(() => field.focus())
      expect(field).toHaveFocus()
      expect(frames.size).toBeGreaterThan(0)
      if (intent === 'wheel') fireEvent.wheel(document.documentElement, { deltaY: -300 })
      if (intent === 'touch') fireEvent.touchMove(document.documentElement)
      if (intent === 'zero-wheel') fireEvent.wheel(document.documentElement, { deltaY: 0, deltaX: 0 })
      flush()
      if (intent === 'wheel' || intent === 'touch') {
        expect(scroll, intent + ' owns the viewport before the queued callback').not.toHaveBeenCalled()
        expect(field.scrollIntoView).not.toHaveBeenCalled()
      } else {
        expect(scroll, intent + ' preserves normal focus reveal').toHaveBeenCalled()
      }
      expect(field).toHaveFocus()
      // A later explicit focus destination is allowed to reveal the same field.
      act(() => { toggle.focus(); field.focus() }); scroll.mockClear(); flush()
      expect(scroll).toHaveBeenCalled()
      expect(field).toHaveFocus()
    }
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(playbackMockState.play).not.toHaveBeenCalled()
    expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
})
