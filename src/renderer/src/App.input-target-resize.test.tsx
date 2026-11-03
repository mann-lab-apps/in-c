// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createScore } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('focused input navigation during reflow', () => {
  registerAppTestHooks()
  it.each(['staff-window', 'voice-window', 'staff-surface', 'manual-window', 'newer-focus'] as const)('retains viewport ownership for %s', async kind => {
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
      const source = createScore(), second = structuredClone(source.parts[0]!)
      second.id = 'second-part'; second.name = 'Second'; second.staves[0]!.id = 'second-staff'
      second.staves[0]!.measures[0]!.id = 'second-measure'
      second.staves[0]!.measures[0]!.voices[0]!.events[0]!.id = 'second-rest'
      source.parts.push(second)
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/test/reflow.chromatics', fileName: 'reflow.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App'); render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '파일' }))
      fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
      const target = (kind === 'voice-window' ? within(screen.getByRole('group', { name: '입력 성부' })).getByRole('button', { name: '2성부' }) : screen.getByRole('combobox', { name: '입력 보표' })) as HTMLButtonElement
      const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      let top = 300
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top, 240, 80))
      for (const label of target.labels ?? []) vi.spyOn(label, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top - 30, 240, 20))
      vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
      act(() => target.focus()); flush(); frames.clear(); vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
      if (kind === 'manual-window') fireEvent.wheel(document.documentElement, { deltaY: -400 })
      const other = screen.getByRole('button', { name: '악보로 이동' })
      if (kind === 'newer-focus') act(() => other.focus())
      top = 850
      if (kind === 'staff-surface') act(() => {
        const surface = target.closest('.studio-input-target')!
        for (const observer of observers) if (observer.targets.has(surface)) observer.callback([], observer as unknown as ResizeObserver)
      })
      else act(() => window.dispatchEvent(new Event('resize')))
      flush()
      if (kind === 'manual-window' || kind === 'newer-focus') {
        expect(target.scrollIntoView).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled()
      } else {
        expect(target.scrollIntoView).toHaveBeenCalledOnce()
        expect(scroll.mock.calls.some(([, y]) => typeof y === 'number' && y >= 330)).toBe(true)
      }
      expect(kind === 'newer-focus' ? other : target).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore(); vi.stubGlobal('ResizeObserver', originalObserver) }
  })
})
