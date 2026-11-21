// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const entries = Array.from({ length: 5 }, (_, index) => ({ fileName: `recent-${index}.musicxml`, filePath: `/fixture/recent-${index}.musicxml`, openedAt: '2026-11-11T00:00:00Z' }))

it.each(['current', 'wheel', 'reading-cleared', 'reading-cleared-retry'] as const)(
  'keeps late valid recent-list layout with the correct %s viewport owner', async scenario => {
    window.history.replaceState({}, '', '/')
    let finishList!: (value: typeof entries) => void
    vi.mocked(window.inC.recentMusicXml.list).mockImplementationOnce(() => new Promise(resolve => { finishList = resolve }))
    vi.mocked(window.inC.musicXml.open).mockRejectedValueOnce(Error('Current late-list import failure'))
    const frames = new Map<number, FrameRequestCallback>(); let serial = 0, offset = 0, top = 500
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++serial, cb); return serial })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation((x?: number | ScrollToOptions, y?: number) => { offset += typeof x === 'object' ? x.top ?? 0 : y ?? 0 })
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    try {
      const { App } = await import('./App'); render(<App />)
      const original = structuredClone(playbackMockState.lastScore)
      const trigger = screen.getByRole('button', { name: 'MusicXML 가져오기' })
      act(() => trigger.focus()); fireEvent.click(trigger); act(() => trigger.blur())
      await screen.findByText('Current late-list import failure')
      const target = screen.getByRole('alert').parentElement!
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top - offset, 900, 100))
      expect(target.getBoundingClientRect().bottom).toBeLessThan(innerHeight)
      const reading = scenario.startsWith('reading')
      if (!reading) flush()
      if (scenario === 'wheel') fireEvent.wheel(document.documentElement, { deltaY: 240 })
      if (reading) {
        const range = document.createRange(); range.selectNodeContents(screen.getByRole('alert'))
        window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
        fireEvent(document, new Event('selectionchange'))
        window.getSelection()!.removeAllRanges()
        fireEvent(document, new Event('selectionchange'))
      }
      vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
      top = 900
      const focus = document.activeElement
      await act(async () => finishList(entries))
      expect(screen.getAllByRole('button', { name: /recent-\d\.musicxml/ })).toHaveLength(5)
      flush()
      if (scenario === 'current') {
        expect(target.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight)
        expect(target.scrollIntoView).toHaveBeenCalledOnce()
      } else {
        expect(target.scrollIntoView).not.toHaveBeenCalled()
        expect(scroll).not.toHaveBeenCalled()
        expect(offset).toBe(0)
      }
      expect(document.activeElement).toBe(focus)
      if (scenario === 'reading-cleared-retry') {
        vi.mocked(window.inC.musicXml.open).mockRejectedValueOnce(Error('Current explicit retry after reading'))
        await act(async () => { trigger.focus(); fireEvent.click(trigger) })
        const retryFocus = document.activeElement
        flush()
        expect(target.scrollIntoView).toHaveBeenCalledOnce()
        expect(target.getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight)
        expect(document.activeElement).toBe(retryFocus)
      }
      expect(playbackMockState.lastScore).toEqual(original)
      expect(window.inC.project.save).not.toHaveBeenCalled()
      expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    } finally { window.getSelection()?.removeAllRanges(); cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
  })
