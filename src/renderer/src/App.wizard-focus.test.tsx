// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('deferred new-score focus ownership', () => {
  registerAppTestHooks()

  it.each(['new-workspace', 'new-app', 'initial', 'reopened-menu'] as const)('honors %s focus after new-score creation', async target => {
    let next = 0
    const frames = new Map<number, FrameRequestCallback>()
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    try {
      const { App } = await import('./App')
      const first = render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
      fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
      if (target === 'new-app') {
        first.unmount()
        window.history.replaceState({}, '', '/?fixture=release-test')
        render(<App />)
      }
      const before = structuredClone(playbackMockState.lastScore)
      if (target !== 'initial') openStudioWorkspace('내보내기')
      const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '파일' })
      if (target === 'reopened-menu') { menu.focus(); fireEvent.click(menu) }
      const destination = target === 'initial' ? screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }) : target === 'reopened-menu' ? screen.getByRole('menuitem', { name: '새 악보 만들기' }) : screen.getByRole('combobox', { name: 'PDF 설정 프리셋' })
      // Flush real FIFO frame order, including stale callbacks and any resulting
      // follow-up work. No timing sleeps or implementation-string matching.
      for (let frame = 0; frame < 4 && frames.size; frame++) {
        const callbacks = [...frames.values()]; frames.clear()
        await act(async () => { for (const callback of callbacks) callback(performance.now()) })
      }
      expect(destination).toHaveFocus()
      if (target === 'reopened-menu') expect(menu).toHaveAttribute('aria-expanded', 'true')
      expect(playbackMockState.lastScore).toEqual(before)
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { request.mockRestore(); cancel.mockRestore() }
  })

  it.each(['initial', 'reopened-menu', 'later-control', 'new-wizard'] as const)('honors %s after wizard cancellation', async target => {
    let next = 0
    const frames = new Map<number, FrameRequestCallback>()
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    try {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      const flush = async () => {
        for (let frame = 0; frame < 4 && frames.size; frame++) {
          const callbacks = [...frames.values()]; frames.clear()
          await act(async () => { for (const callback of callbacks) callback(performance.now()) })
        }
      }
      await flush()
      const trigger = screen.getByRole('button', { name: '새 악보 만들기' })
      trigger.focus(); fireEvent.click(trigger)
      const before = structuredClone(playbackMockState.lastScore)
      const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
      const cancelButton = within(dialog).getByRole('button', { name: '취소' })
      cancelButton.focus(); fireEvent.click(cancelButton)
      let destination: HTMLElement = trigger
      if (target === 'reopened-menu') {
        const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '파일' })
        menu.focus(); fireEvent.click(menu)
        destination = screen.getByRole('menuitem', { name: '새 악보 만들기' })
      } else if (target === 'later-control') {
        destination = screen.getByRole('button', { name: '프로젝트 열기' }); destination.focus()
      } else if (target === 'new-wizard') {
        trigger.focus(); fireEvent.click(trigger)
        destination = within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('textbox', { name: '제목' })
        destination.focus()
      }
      await flush()
      expect(destination).toHaveFocus()
      if (target === 'reopened-menu') expect(screen.getByRole('menu', { name: '파일' })).toBeVisible()
      expect(playbackMockState.lastScore).toEqual(before)
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { request.mockRestore(); cancel.mockRestore() }
  })

})
