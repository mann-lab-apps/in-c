// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['footer', 'surface', 'manual', 'newer-focus'] as const)('keeps view-field reflow ownership: %s', async kind => {
  const originalObserver = globalThis.ResizeObserver
  const observers = new Set<{ callback: ResizeObserverCallback; targets: Set<Element> }>()
  vi.stubGlobal('ResizeObserver', class {
    targets = new Set<Element>()
    constructor(readonly callback: ResizeObserverCallback) { observers.add(this) }
    observe(target: Element) { this.targets.add(target) }
    unobserve(target: Element) { this.targets.delete(target) }
    disconnect() { observers.delete(this); this.targets.clear() }
  })
  const frames = new Map<number, FrameRequestCallback>(); let next = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++next, cb); return next })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  try {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '보기' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '총보·파트보 보기' }))
    const target = screen.getByRole('combobox', { name: '악보 보기' }) as HTMLButtonElement
    let top = 300
    target.scrollIntoView = vi.fn()
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top, 240, 60))
    for (const label of target.labels ?? []) vi.spyOn(label, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top - 30, 240, 20))
    const footer = document.querySelector('main > .studio-status')!
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
    act(() => target.focus()); flush(); flush(); frames.clear()
    vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
    const source = structuredClone(playbackMockState.lastScore!)
    const preview = screen.getByTestId('notation-preview'), selected = preview.getAttribute('data-selected-event-id')
    if (kind === 'manual') fireEvent.wheel(document.documentElement, { deltaY: -400 })
    const other = screen.getByRole('button', { name: '악보로 이동' })
    if (kind === 'newer-focus') act(() => other.focus())
    top = 850
    const surface = kind === 'surface' ? target.closest('.studio-score-view')! : footer
    act(() => { for (const observer of observers) if (observer.targets.has(surface)) observer.callback([], observer as unknown as ResizeObserver) })
    flush()
    if (kind === 'manual' || kind === 'newer-focus') {
      expect(target.scrollIntoView).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled()
    } else {
      expect(target.scrollIntoView).toHaveBeenCalledOnce()
      expect(scroll.mock.calls.some(([, y]) => typeof y === 'number' && y >= 300)).toBe(true)
    }
    expect(kind === 'newer-focus' ? other : target).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(preview.getAttribute('data-selected-event-id')).toBe(selected)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  } finally {
    cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore(); vi.stubGlobal('ResizeObserver', originalObserver)
  }
})
