// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['current', 'resized', 'wheel', 'other-focus', 'focus-then-body-resize', 'save-then-body-resize', 'background'] as const)('studio.page-validation-reveal %s reads errors without stale scrolling or model commands', async scenario => {
  const observers = new Set<{ callback: ResizeObserverCallback; targets: Set<Element> }>(), originalObserver = globalThis.ResizeObserver
  vi.stubGlobal('ResizeObserver', class {
    targets = new Set<Element>()
    constructor(readonly callback: ResizeObserverCallback) { observers.add(this) }
    observe(target: Element) { this.targets.add(target) }
    unobserve(target: Element) { this.targets.delete(target) }
    disconnect() { observers.delete(this) }
  })
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, offset = 0, errorHeight = 25
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++id, cb); return id })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const foreground = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation((x?: number | ScrollToOptions, y?: number) => { offset += typeof x === 'object' ? x.top ?? 0 : y ?? 0 })
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  try {
    window.history.replaceState({}, '', '/?fixture=release-test'); const source = createPartSpanResetFixture()
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/page.chromatics', fileName: 'page.chromatics', contents: encodeNativeProject(source) })
    const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score)); openStudioWorkspace('내보내기')
    const input = screen.getByRole('spinbutton', { name: 'PDF 여백 mm' }) as HTMLInputElement, original = input.value
    input.scrollIntoView = vi.fn(); vi.spyOn(input, 'getBoundingClientRect').mockImplementation(() => new DOMRect(25, 550 - offset, 231, 32))
    for (const label of input.labels ?? []) vi.spyOn(label, 'getBoundingClientRect').mockImplementation(() => new DOMRect(25, 525 - offset, 231, 18))
    const footer = document.querySelector('.studio-status')!; vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 960, 100))
    act(() => input.focus()); fireEvent.change(input, { target: { value: '31' } }); frames.clear(); scroll.mockClear(); fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue(Number(original)); expect(input).toHaveAttribute('aria-invalid', 'true')
    const error = document.getElementById(input.getAttribute('aria-describedby')!)!; vi.spyOn(error, 'getBoundingClientRect').mockImplementation(() => new DOMRect(25, 598 - offset, 231, errorHeight))
    if (scenario === 'wheel') fireEvent.wheel(document.documentElement, { deltaY: 500 })
    if (scenario === 'other-focus') act(() => screen.getByRole('button', { name: '악보로 이동' }).focus())
    if (scenario === 'background') foreground.mockReturnValue(false)
    const active = document.activeElement; flush()
    const initialReveal = ['current', 'resized', 'focus-then-body-resize', 'save-then-body-resize'].includes(scenario)
    if (initialReveal) { expect(scroll).toHaveBeenCalled(); expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(600) }
    else expect(scroll).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(active)
    if (scenario === 'resized' || scenario === 'focus-then-body-resize' || scenario === 'save-then-body-resize') {
      if (scenario === 'focus-then-body-resize') act(() => { const other = screen.getByRole('button', { name: '악보로 이동' }); other.focus(); other.blur() })
      if (scenario === 'save-then-body-resize') await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
      frames.clear(); scroll.mockClear(); errorHeight = 125
      act(() => { for (const o of observers) if (o.targets.has(footer)) o.callback([], o as unknown as ResizeObserver) }); flush()
      if (scenario === 'resized') { expect(scroll).toHaveBeenCalled(); expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(600) }
      else expect(scroll).not.toHaveBeenCalled()
    }
    expect(playbackMockState.lastScore).toEqual(source.score); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'); expect(window.inC.project.save).toHaveBeenCalledTimes(scenario === 'save-then-body-resize' ? 1 : 0)
  } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); foreground.mockRestore(); scroll.mockRestore(); vi.stubGlobal('ResizeObserver', originalObserver) }
})
