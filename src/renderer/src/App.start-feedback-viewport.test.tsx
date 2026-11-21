// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createTimewiseFormatFixture } from '../../testing/timewise-format-fixture'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const entry = { fileName: 'recent.musicxml', filePath: '/fixture/recent.musicxml', openedAt: '2026-11-11T00:00:00Z' }
type OpenResult = { fileName: string; filePath: string; contents: string } | null

async function setup(channel: 'native' | 'xml' | 'recent') {
  window.history.replaceState({}, '', '/')
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
  let fail!: (error: Error) => void
  let finish!: (value: OpenResult) => void
  const pending = () => new Promise<OpenResult>((resolve, reject) => { fail = reject; finish = resolve })
  if (channel === 'native') vi.mocked(window.inC.project.open).mockImplementationOnce(pending)
  else if (channel === 'xml') vi.mocked(window.inC.musicXml.open).mockImplementationOnce(pending)
  else vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(() => pending().then(value => {
    if (!value) throw Error('Recent fixture read cannot return a dialog cancellation')
    return value
  }))
  const frames = new Map<number, FrameRequestCallback>(); let sequence = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++sequence, cb); return sequence })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const flush = () => act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
  const { App } = await import('./App'); render(<App />)
  const trigger = channel === 'recent' ? await screen.findByRole('button', { name: /recent\.musicxml/ })
    : screen.getByRole('button', { name: channel === 'native' ? '프로젝트 열기' : 'MusicXML 가져오기' })
  const original = structuredClone(playbackMockState.lastScore)
  act(() => trigger.focus()); fireEvent.click(trigger)
  // Chromium blurs busy disabled controls; jsdom needs this explicit adapter.
  if (trigger.hasAttribute('disabled')) act(() => trigger.blur())
  return { trigger, original, fail, finish, frames, flush, scroll, restore: () => {
    cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore()
  } }
}

async function error(context: Awaited<ReturnType<typeof setup>>) {
  await act(async () => context.fail(Error('Current owned start read failure')))
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('현재 악보는 유지됩니다.')
  const target = alert.parentElement!
  target.scrollIntoView = vi.fn()
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 900, 900, 100))
  context.scroll.mockClear()
  return target
}

it.each((['native', 'xml', 'recent'] as const).flatMap(channel =>
  (['normal', 'zero-wheel'] as const).map(intent => ({ channel, intent }))))(
  'reveals a current $channel start-screen failure after $intent without moving focus', async ({ channel, intent }) => {
    const context = await setup(channel)
    try {
      if (intent === 'zero-wheel') fireEvent.wheel(document.documentElement, { deltaY: 0, deltaX: 0 })
      const target = await error(context), focus = document.activeElement
      context.flush()
      expect(target.scrollIntoView).toHaveBeenCalledOnce()
      expect(context.scroll).toHaveBeenCalled()
      expect(document.activeElement).toBe(focus)
      expect(playbackMockState.lastScore).toEqual(context.original)
      expect(document.querySelector('.studio-start')).toBeVisible()
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { context.restore() }
  })

it.each(['wheel-pending', 'wheel-queued', 'touch', 'arrow', 'page', 'other-focus', 'focus-then-body',
  'reading', 'manual-dialog', 'wizard', 'newer-open-cancel', 'unmount'] as const)(
  'does not pull the start screen back after a newer %s intent', async intent => {
    const context = await setup('recent')
    try {
      if (intent === 'wheel-pending') fireEvent.wheel(document.documentElement, { deltaY: 400 })
      const target = await error(context)
      if (intent === 'wheel-queued') fireEvent.wheel(document.documentElement, { deltaY: 400 })
      if (intent === 'touch') fireEvent.touchMove(document.documentElement)
      if (intent === 'arrow' || intent === 'page') fireEvent.keyDown(context.trigger, {
        key: intent === 'arrow' ? 'ArrowDown' : 'PageDown', code: intent === 'arrow' ? 'ArrowDown' : 'PageDown'
      })
      if (intent === 'other-focus' || intent === 'focus-then-body') {
        const other = screen.getByRole('button', { name: '새 악보 만들기' })
        act(() => { other.focus(); if (intent === 'focus-then-body') other.blur() })
      }
      if (intent === 'reading') {
        const range = document.createRange(); range.selectNodeContents(screen.getByRole('alert'))
        window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
      }
      if (intent === 'manual-dialog') fireEvent.click(screen.getByRole('button', { name: '사용설명서' }))
      if (intent === 'wizard') {
        act(() => screen.getByRole('button', { name: '새 악보 만들기' }).focus())
        fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
        fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '취소' }))
      }
      if (intent === 'newer-open-cancel') {
        vi.mocked(window.inC.project.open).mockResolvedValueOnce(null)
        await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })))
      }
      if (intent === 'unmount') cleanup()
      const focus = document.activeElement
      context.flush()
      expect(target.scrollIntoView).not.toHaveBeenCalled()
      expect(context.scroll).not.toHaveBeenCalled()
      if (intent === 'wizard') expect(screen.getByRole('button', { name: '새 악보 만들기' })).toHaveFocus()
      else expect(document.activeElement).toBe(focus)
      expect(playbackMockState.lastScore).toEqual(context.original)
      expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally { window.getSelection()?.removeAllRanges(); context.restore() }
  })

it('does not reveal an old start error after a successful retry removes the start screen', async () => {
  const context = await setup('xml')
  try {
    const target = await error(context)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ ...entry, contents: createTimewiseFormatFixture().partwise })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' })))
    expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
    context.scroll.mockClear(); context.flush()
    expect(target.scrollIntoView).not.toHaveBeenCalled()
    expect(context.scroll).not.toHaveBeenCalled()
  } finally { context.restore() }
})

it('allows a later explicit retry to reveal its own error after earlier manual scrolling', async () => {
  const context = await setup('recent')
  try {
    fireEvent.wheel(document.documentElement, { deltaY: 400 })
    const first = await error(context)
    context.flush(); expect(first.scrollIntoView).not.toHaveBeenCalled()
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(Error('New explicit retry failure'))
    await act(async () => { context.trigger.focus(); fireEvent.click(context.trigger) })
    const target = screen.getByRole('alert').parentElement!
    target.scrollIntoView = vi.fn()
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 900, 900, 100))
    const focus = document.activeElement
    context.flush()
    expect(target.scrollIntoView).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(focus)
    expect(playbackMockState.lastScore).toEqual(context.original)
  } finally { context.restore() }
})

it.each(['idle', 'new-focus'] as const)('reveals an initial background read error only for the still-%s startup', async intent => {
  window.history.replaceState({}, '', '/')
  let fail!: (error: Error) => void
  vi.mocked(window.inC.autosave.read).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
  const frames = new Map<number, FrameRequestCallback>(); let sequence = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++sequence, cb); return sequence })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  try {
    const { App } = await import('./App'); render(<App />)
    const original = structuredClone(playbackMockState.lastScore)
    if (intent === 'new-focus') act(() => screen.getByRole('button', { name: '새 악보 만들기' }).focus())
    await act(async () => fail(Error('Current initial recovery read failure')))
    const target = screen.getByRole('alert').parentElement!
    target.scrollIntoView = vi.fn()
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 900, 900, 100))
    const focus = document.activeElement
    act(() => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(0)) })
    expect(target.scrollIntoView).toHaveBeenCalledTimes(intent === 'idle' ? 1 : 0)
    expect(document.activeElement).toBe(focus)
    expect(playbackMockState.lastScore).toEqual(original)
  } finally { cleanup(); raf.mockRestore(); cancel.mockRestore(); scroll.mockRestore() }
})
