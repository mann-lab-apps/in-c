// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi, describe } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('export controls above sticky status', () => {
  registerAppTestHooks()
  it.each(['page', 'resolution', 'manual-scroll'] as const)('reveals the owned export target: %s', async kind => {
    const frames = new Map<number, FrameRequestCallback>();let next = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++next, cb);return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const queued = [...frames.values()];frames.clear();queued.forEach(cb => cb(0)) })
    try {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App');render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '파일' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'PNG 출력 설정' }))
      fireEvent.click(screen.getByRole('combobox', { name: 'PNG 페이지' }))
      fireEvent.click(screen.getByRole('option', { name: '페이지 선택' }))
      const target = (kind === 'page' ? screen.getByRole('spinbutton', { name: 'PNG 페이지 번호' }) : screen.getByRole('combobox', { name: 'PNG 해상도' })) as HTMLInputElement | HTMLButtonElement
      const score = structuredClone(playbackMockState.lastScore!)
      const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 650, 240, 40))
      for (const label of target.labels ?? []) vi.spyOn(label, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 620, 240, 20))
      vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
      act(() => screen.getByRole('button', { name: '악보로 이동' }).focus());frames.clear();scroll.mockClear()
      act(() => target.focus())
      if (kind === 'manual-scroll') fireEvent.wheel(document.documentElement, { deltaY: -400 })
      flush()
      if (kind === 'manual-scroll') {
        expect(target.scrollIntoView).not.toHaveBeenCalled();expect(scroll).not.toHaveBeenCalled()
      } else {
        expect(target.scrollIntoView).toHaveBeenCalled()
        expect(scroll.mock.calls.some(([, y]) => typeof y === 'number' && y >= 90)).toBe(true)
      }
      expect(target).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.png.save).not.toHaveBeenCalled();expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { cleanup();raf.mockRestore();cancel.mockRestore();scroll.mockRestore() }
  })
})
