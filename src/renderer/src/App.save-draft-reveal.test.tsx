// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['save', 'new-wheel', 'composing', 'equal', 'later-focus'] as const)('studio.save-draft-reveal %s preserves manual inspection until an explicit pending-field save', async scenario => {
  window.history.replaceState({}, '', '/?fixture=release-test'); const source = createPartSpanResetFixture()
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/page.chromatics', fileName: 'page.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score)); openStudioWorkspace('내보내기')
  const field = screen.getByRole('spinbutton', { name: 'PDF 여백 mm' }) as HTMLInputElement, initial = field.value
  const frames = new Map<number, FrameRequestCallback>(); let frame = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++frame, cb); return frame })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  let top = 200
  field.scrollIntoView = vi.fn(); vi.spyOn(field, 'getBoundingClientRect').mockImplementation(() => new DOMRect(20, top, 200, 40))
  vi.spyOn(document.querySelector('.studio-status')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 700, 960, 100))
  try {
    act(() => field.focus()); flush(); frames.clear(); vi.mocked(field.scrollIntoView).mockClear(); scroll.mockClear()
    if (scenario === 'composing') fireEvent.compositionStart(field)
    fireEvent.change(field, { target: { value: scenario === 'equal' ? `${initial}.0` : '17' } })
    fireEvent.wheel(document.documentElement, { deltaY: 1000 }); top = -500
    await act(async () => fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }))
    if (scenario === 'new-wheel') fireEvent.wheel(document.documentElement, { deltaY: -500 })
    if (scenario === 'later-focus') act(() => screen.getByRole('button', { name: '악보로 이동' }).focus())
    flush()
    expect(field.scrollIntoView).toHaveBeenCalledTimes(scenario === 'save' ? 1 : 0)
    if (scenario !== 'equal') expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(source.score)
  } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
})
