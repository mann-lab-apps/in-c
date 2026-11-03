// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { installCompactDockMedia, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('workspace focus reveal and explicit scrolling', () => {
  registerAppTestHooks()
  it.each(['wheel', 'touch', 'page-key', 'scrollbar', 'overlay-scrollbar', 'content-pointer', 'zero-wheel', 'composing-page', 'editable-page', 'none'] as const)('studio.workspace-scroll-intent keeps %s ownership through a dock resize', async intent => {
    const media = installCompactDockMedia()
    const originalObserver = globalThis.ResizeObserver
    const clientWidth = Object.getOwnPropertyDescriptor(document.documentElement, 'clientWidth')
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 940 })
    const observers = new Set<{ callback: ResizeObserverCallback; targets: Set<Element> }>()
    vi.stubGlobal('ResizeObserver', class {
      targets = new Set<Element>()
      constructor(readonly callback: ResizeObserverCallback) { observers.add(this) }
      observe(target: Element) { this.targets.add(target) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { observers.delete(this); this.targets.clear() }
    })
    const frames = new Map<number, FrameRequestCallback>()
    let frame = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++frame, cb); return frame })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    try {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App')
      render(<App />)
      const source = structuredClone(playbackMockState.lastScore)
      const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      const dock = screen.getByRole('complementary', { name: '고정 팔레트' })
      const target = (intent === 'page-key' || intent === 'composing-page'
        ? screen.getByRole('button', { name: '셈여림' })
        : screen.getByRole('searchbox', { name: '표기 기호 검색' })) as HTMLElement
      let top = 300
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top, 220, 40))
      vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 700, 960, 100))
      act(() => target.focus()); flush(); frames.clear(); vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
      // A newer manual navigation owns the viewport, even while native focus
      // stays on the old field. A resize observer is not a new focus request.
      if (intent === 'wheel') fireEvent.wheel(document.documentElement, { deltaY: -500 })
      if (intent === 'touch') fireEvent.touchMove(document.documentElement)
      if (intent === 'scrollbar') fireEvent.pointerDown(document.documentElement, { clientX: 945 })
      if (intent === 'overlay-scrollbar') {
        vi.spyOn(document.documentElement,'clientHeight','get').mockReturnValue(768)
        vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(1200)
        vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-100,940,1200))
        fireEvent.pointerDown(document.documentElement,{clientX:937,clientY:400,button:0})
      }
      if (intent === 'content-pointer') fireEvent.pointerDown(document.body, { clientX: 400 })
      if (intent === 'page-key' || intent === 'editable-page') fireEvent.keyDown(target, { key: 'PageUp', code: 'PageUp' })
      if (intent === 'composing-page') fireEvent.keyDown(target, { key: 'PageUp', code: 'PageUp', isComposing: true })
      if (intent === 'zero-wheel') fireEvent.wheel(document.documentElement, { deltaY: 0, deltaX: 0 })
      top = 850
      const resize = () => act(() => { for (const observer of observers) if (observer.targets.has(dock)) observer.callback([], observer as unknown as ResizeObserver) })
      resize(); flush()
      expect(target.scrollIntoView).toHaveBeenCalledTimes(['wheel', 'touch', 'page-key', 'scrollbar', 'overlay-scrollbar'].includes(intent) ? 0 : 1)
      expect(target).toHaveFocus()
      // Explicitly returning focus restores the existing keyboard reveal path.
      act(() => { screen.getByRole('button', { name: '악보로 이동' }).focus(); target.focus() })
      flush(); vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
      resize(); flush()
      expect(target.scrollIntoView).toHaveBeenCalledOnce()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { if (clientWidth) Object.defineProperty(document.documentElement, 'clientWidth', clientWidth); else delete (document.documentElement as unknown as Record<string, unknown>).clientWidth; cleanup(); media.restore(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore(); vi.stubGlobal('ResizeObserver', originalObserver) }
  })
})
