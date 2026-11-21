// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const entries = Array.from({ length: 5 }, (_, index) => ({ fileName: `owned-${index}.musicxml`, filePath: `/fixture/owned-${index}.musicxml`, openedAt: '2026-11-11T00:00:00Z' }))

type OpenResult = { fileName: string; filePath: string; contents: string } | null
it.each((['native', 'xml'] as const).flatMap(channel => (['error', 'cancel'] as const).map(outcome => ({ channel, outcome }))))(
  'keeps previous error separate from a newer pending $channel request ending in $outcome', async ({ channel, outcome }) => {
    window.history.replaceState({}, '', '/')
    let finishList!: (value: typeof entries) => void
    vi.mocked(window.inC.recentMusicXml.list).mockImplementationOnce(() => new Promise(resolve => { finishList = resolve }))
    vi.mocked(window.inC.musicXml.open).mockRejectedValueOnce(Error('Repeated read failure'))
    const frames = new Map<number, FrameRequestCallback>(); let serial = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++serial, cb); return serial })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    try {
      const { App } = await import('./App'); render(<App />)
      const original = structuredClone(playbackMockState.lastScore)
      const first = screen.getByRole('button', { name: 'MusicXML 가져오기' })
      act(() => first.focus())
      await act(async () => { fireEvent.click(first); first.blur() })
      await screen.findByText('Repeated read failure')
      const alert = screen.getByRole('alert'), previousText = alert.textContent
      const target = alert.parentElement!
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 900, 900, 100))
      expect(frames.size).toBeGreaterThan(0)
      flush(); expect(target.scrollIntoView).toHaveBeenCalledOnce()
      vi.mocked(target.scrollIntoView).mockClear(); scroll.mockClear()
      let finish!: (value: OpenResult) => void, fail!: (error: Error) => void
      const pending = () => new Promise<OpenResult>((resolve, reject) => { finish = resolve; fail = reject })
      if (channel === 'native') vi.mocked(window.inC.project.open).mockImplementationOnce(pending)
      else vi.mocked(window.inC.musicXml.open).mockImplementationOnce(pending)
      const newer = screen.getByRole('button', { name: channel === 'native' ? '프로젝트 열기' : 'MusicXML 가져오기' })
      act(() => newer.focus()); fireEvent.click(newer); act(() => newer.blur())
      expect(finish).toBeTypeOf('function')
      const focus = document.activeElement
      await act(async () => finishList(entries))
      expect(screen.getAllByRole('button', { name: /owned-\d\.musicxml/ })).toHaveLength(5)
      flush()
      expect(target.scrollIntoView).not.toHaveBeenCalled()
      expect(scroll).not.toHaveBeenCalled()
      expect(alert.textContent).toBe(previousText)
      expect(document.activeElement).toBe(focus)
      if (outcome === 'cancel') {
        await act(async () => finish(null)); flush()
        expect(target.scrollIntoView).not.toHaveBeenCalled()
        expect(alert.textContent).toBe(previousText)
      } else {
        await act(async () => fail(Error('Repeated read failure'))); flush()
        expect(target.scrollIntoView).toHaveBeenCalledOnce()
        expect(scroll).toHaveBeenCalled()
        if (channel === 'xml') expect(alert.textContent).toBe(previousText)
      }
      expect(document.activeElement).toBe(focus)
      expect(playbackMockState.lastScore).toEqual(original)
      expect(window.inC.project.save).not.toHaveBeenCalled()
      expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
  })
