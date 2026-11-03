// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createScore } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('input navigation above sticky status', () => {
  registerAppTestHooks()
  it.each(['staff', 'voice', 'staff-label-top', 'manual-wheel', 'newer-focus'] as const)('keeps ownership when revealing %s', async kind => {
    const source = createScore(), second = structuredClone(source.parts[0]!)
    second.id = 'second-part'; second.name = 'Second'
    second.staves[0]!.id = 'second-staff'
    second.staves[0]!.measures[0]!.id = 'second-measure'
    second.staves[0]!.measures[0]!.voices[0]!.events[0]!.id = 'second-rest'
    source.parts.push(second)
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/test/targets.chromatics', fileName: 'targets.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '파일' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
    const frames = new Map<number, FrameRequestCallback>(); let next = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++next, cb); return next })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const flush = () => act(() => { const queued = [...frames.values()]; frames.clear(); queued.forEach(cb => cb(0)) })
    try {
      const target = (kind === 'voice' ? within(screen.getByRole('group', { name: '입력 성부' })).getByRole('button', { name: '2성부' }) : screen.getByRole('combobox', { name: '입력 보표' })) as HTMLButtonElement
      const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      target.scrollIntoView = vi.fn()
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, kind === 'staff-label-top' ? 30 : 650, 240, 80))
      for (const label of target.labels ?? []) vi.spyOn(label, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, kind === 'staff-label-top' ? 0 : 620, 240, 20))
      vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
      const other = screen.getByRole('button', { name: '악보로 이동' })
      act(() => other.focus()); frames.clear(); scroll.mockClear()
      act(() => target.focus())
      if (kind === 'manual-wheel') fireEvent.wheel(document.documentElement, { deltaY: -400 })
      if (kind === 'newer-focus') act(() => other.focus())
      flush()
      if (kind === 'manual-wheel' || kind === 'newer-focus') {
        expect(target.scrollIntoView).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled()
      } else {
        expect(target.scrollIntoView).toHaveBeenCalled()
        expect(scroll.mock.calls.some(([, y]) => typeof y === 'number' && (kind === 'staff-label-top' ? y < 0 : y >= 130))).toBe(true)
      }
      expect(kind === 'newer-focus' ? other : target).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.project.save).not.toHaveBeenCalled()
      expect(playbackMockState.play).not.toHaveBeenCalled()
    } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
  })
})
