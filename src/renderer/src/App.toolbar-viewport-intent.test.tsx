// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'
registerAppTestHooks()

it.each(['wheel-y', 'wheel-x', 'touch', 'page', 'zero-wheel', 'composing-page', 'normal'] as const)(
  'keeps a newer %s viewport intent above a queued measure-workspace focus, then allows an explicit new request', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const frames = new Map<number, FrameRequestCallback>(); let id = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(token => { frames.delete(token) })
    const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    try {
      const { App } = await import('./App'); render(<App />)
      for (let i = 0; i < 4; i++) flush()
      const source = structuredClone(playbackMockState.lastScore)
      const open = () => {
        fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 200, clientY: 180 })
        const item = within(screen.getByRole('menu', { name: '마디 작업' })).getByRole('menuitem', { name: '마디 속성…' })
        act(() => item.focus()); fireEvent.click(item)
      }
      open(); expect(frames.size).toBeGreaterThan(0)
      const keyField = screen.getByRole('combobox', { name: '조표' })
      const canvas = screen.getByLabelText('악보 캔버스')
      if (kind === 'wheel-y') fireEvent.wheel(canvas, { deltaY: 120, deltaX: 0 })
      if (kind === 'wheel-x') fireEvent.wheel(canvas, { deltaY: 0, deltaX: 120 })
      if (kind === 'touch') fireEvent.touchMove(canvas)
      if (kind === 'page') fireEvent.keyDown(document.body, { key: 'PageDown', code: 'PageDown' })
      if (kind === 'zero-wheel') fireEvent.wheel(canvas, { deltaY: 0, deltaX: 0 })
      if (kind === 'composing-page') fireEvent.keyDown(document.body, { key: 'PageDown', code: 'PageDown', isComposing: true, keyCode: 229 })
      const beforeFrame = document.activeElement
      flush()
      if (['wheel-y', 'wheel-x', 'touch', 'page'].includes(kind)) {
        expect(keyField, 'An older command focus cannot replace the newer manual viewport owner').not.toHaveFocus()
        expect(document.activeElement).toBe(beforeFrame)
      } else expect(keyField).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id', 'measure-2')
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.project.save).not.toHaveBeenCalled()
      // Cancelling an older request does not disable the next explicit command.
      open(); flush(); expect(screen.getByRole('combobox', { name: '조표' })).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source)
    } finally { raf.mockRestore(); cancel.mockRestore() }
  },
)
