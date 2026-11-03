// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

describe('file completion viewport ownership', () => {
  registerAppTestHooks()
  const cases = (['project', 'xml', 'copy'] as const).flatMap(channel =>
    (['normal', 'zero-wheel', 'wheel-success', 'wheel-cancel', 'wheel-failure', 'queued-wheel'] as const).map(scenario => ({ channel, scenario })))
  it.each(cases)('$channel $scenario respects newer manual inspection without losing the file result', async ({ channel, scenario }) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (result: { filePath: string; fileName: string } | null) => void
    let fail!: (error: Error) => void
    const operation = channel === 'project' ? vi.mocked(window.inC.project.save)
      : channel === 'xml' ? vi.mocked(window.inC.musicXml.save) : vi.mocked(window.inC.musicXml.exportCopy)
    operation.mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App'); render(<App />)
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' })
    const score = structuredClone(playbackMockState.lastScore!)
    const preview = screen.getByTestId('notation-preview'), selected = preview.getAttribute('data-selected-event-id')
    openStudioWorkspace(channel === 'copy' ? '내보내기' : '파일')
    const button = screen.getByRole('button', { name: channel === 'project' ? '프로젝트 저장' : channel === 'xml' ? 'MusicXML로 저장' : 'MusicXML 내보내기' })
    act(() => button.focus()); fireEvent.click(button)
    await waitFor(() => expect(operation).toHaveBeenCalledOnce())
    // Chromium blurs disabled controls; jsdom requires this explicit adapter.
    focusTestBody()
    const frames = new Map<number, FrameRequestCallback>(); let sequence = 0
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++sequence, cb); return sequence })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    button.scrollIntoView = vi.fn()
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 850, 180, 40))
    vi.spyOn(document.querySelector('main > .studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 150))
    try {
      if (scenario.startsWith('wheel-') || scenario === 'zero-wheel')
        fireEvent.wheel(document.documentElement, { deltaY: scenario === 'zero-wheel' ? 0 : 300 })
      await act(async () => {
        if (scenario === 'wheel-failure') fail(new Error('file focus viewport fixture'))
        else finish(scenario === 'wheel-cancel' ? null : { filePath: '/fixture/viewport.' + (channel === 'project' ? 'chromatics' : 'musicxml'), fileName: 'viewport.' + (channel === 'project' ? 'chromatics' : 'musicxml') })
      })
      await waitFor(() => expect(button).toBeEnabled())
      if (scenario === 'queued-wheel') {
        // Focus before this new wheel is still owned. Measure only reveals
        // queued beyond the subsequent manual navigation.
        vi.mocked(button.scrollIntoView).mockClear(); scroll.mockClear()
        fireEvent.wheel(document.documentElement, { deltaY: -300 })
      }
      act(() => { const queued = [...frames.values()]; frames.clear(); queued.forEach(cb => cb(0)) })
      if (scenario === 'normal' || scenario === 'zero-wheel') {
        expect(button).toHaveFocus(); expect(button.scrollIntoView).toHaveBeenCalled()
      } else {
        expect(button.scrollIntoView).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled()
        if (scenario !== 'queued-wheel') expect(document.body).toHaveFocus()
      }
      expect(playbackMockState.lastScore).toEqual(score)
      expect(preview).toHaveAttribute('data-selected-event-id', selected!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(channel !== 'copy' && !['wheel-cancel', 'wheel-failure'].includes(scenario) ? '변경 없음' : '저장하지 않은 변경')
      expect(operation).toHaveBeenCalledOnce()
    } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
  })
})
