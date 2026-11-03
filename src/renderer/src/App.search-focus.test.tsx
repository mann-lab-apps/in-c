// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('command search cancellation focus ownership', () => {
  registerAppTestHooks()
  it.each(['initial', 'later-control', 'reopened-menu'] as const)('honors %s after command search closes', async target => {
    let next = 0
    const frames = new Map<number, FrameRequestCallback>()
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const flush = async () => {
      for (let frame = 0; frame < 4 && frames.size; frame++) {
        const callbacks = [...frames.values()]; frames.clear()
        await act(async () => { for (const callback of callbacks) callback(performance.now()) })
      }
    }
    try {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일'); await flush()
      const nav = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
      const trigger = nav.getByRole('button', { name: '도구' })
      trigger.focus(); fireEvent.click(trigger); fireEvent.click(screen.getByRole('menuitem', { name: '명령 검색' }))
      await flush()
      const before = structuredClone(playbackMockState.lastScore)
      const input = screen.getByRole('searchbox', { name: '명령 찾기' })
      expect(input).toHaveFocus()
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: '명령 검색' })).not.toBeInTheDocument()
      let destination: HTMLElement = trigger
      if (target === 'later-control') {
        destination = screen.getByRole('button', { name: '프로젝트 열기' }); destination.focus()
      } else if (target === 'reopened-menu') {
        const menu = nav.getByRole('button', { name: '파일' }); menu.focus(); fireEvent.click(menu)
        destination = screen.getByRole('menuitem', { name: '새 악보 만들기' })
      }
      await flush()
      expect(destination).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(before)
      expect(playbackMockState.play).not.toHaveBeenCalled()
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { request.mockRestore(); cancel.mockRestore() }
  })
})
