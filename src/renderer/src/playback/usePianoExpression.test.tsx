// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import { createSwingPlaybackFixture } from '../../../testing/swing-playback-fixture'
import { usePianoExpression } from './usePianoExpression'

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() { MockWorker.instances.push(this) }
}
let count = 0
function score() {
  const value = createSingleVoiceMvpScore()
  value.id = `worker-fixture-${count++}`
  return value
}
beforeEach(() => {
  vi.useFakeTimers()
  MockWorker.instances = []
  vi.stubGlobal('Worker', MockWorker)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('local piano expression worker', () => {
  it.each([false, true])('recomputes swing with the same document ID and rejects the old cached/worker timing, natural=%s', natural => {
    const swung = createSwingPlaybackFixture('eighth', '3:2'); swung.id = `worker-swing-${count++}`
    const straight = { ...swung, swingPlayback: undefined }
    const { result, rerender } = renderHook(({ value }) => usePianoExpression(value, natural), { initialProps: { value: straight as typeof swung } })
    expect(result.current.timeline.events[1].startBeat).toBe(0.5)
    act(() => vi.advanceTimersByTime(150))
    const old = MockWorker.instances[0], oldReply = old?.onmessage
    const oldTimeline = old?.postMessage.mock.calls[0][0].timeline
    if (natural) act(() => oldReply!({ data: { timeline: oldTimeline } }))
    rerender({ value: swung })
    expect(result.current.timeline.events[1].startBeat).toBeCloseTo(0.6)
    act(() => vi.advanceTimersByTime(150))
    if (natural) {
      const next = MockWorker.instances[1], request = next.postMessage.mock.calls[0][0]
      expect(request.score.swingPlayback).toEqual(swung.swingPlayback)
      expect(request.timeline.events[1].startBeat).toBeCloseTo(0.6)
      act(() => oldReply!({ data: { timeline: oldTimeline } }))
      expect(result.current.timeline.events[1].startBeat).toBeCloseTo(0.6)
      act(() => next.onmessage!({ data: { timeline: request.timeline } }))
    } else expect(MockWorker.instances).toHaveLength(0)
    rerender({ value: straight })
    expect(result.current.timeline.events[1].startBeat).toBe(0.5)
    if (natural) { expect(result.current.preparing).toBe(false); expect(MockWorker.instances).toHaveLength(2) }
  })
  it('ignores late success and failure from the previous score', () => {
    const first = score(), second = score()
    const { result, rerender } = renderHook(({ value }) => usePianoExpression(value, true), {
      initialProps: { value: first }
    })
    act(() => vi.advanceTimersByTime(150))
    const old = MockWorker.instances[0], oldSuccess = old.onmessage!, oldFailure = old.onerror!
    rerender({ value: second })
    act(() => vi.advanceTimersByTime(150))
    expect(old.terminate).toHaveBeenCalled()
    act(() => { oldSuccess({ data: { error: 'old error' } }); oldFailure() })
    expect(result.current.error).toBe('')
    expect(result.current.preparing).toBe(true)
    const next = MockWorker.instances[1]
    const request = next.postMessage.mock.calls[0][0]
    act(() => next.onmessage!({ data: { timeline: request.timeline } }))
    expect(result.current.preparing).toBe(false)
  })

  it('uses the bounded cache without another worker for the same score/settings', () => {
    const value = score()
    const { result, rerender } = renderHook(({ enabled }) => usePianoExpression(value, enabled), {
      initialProps: { enabled: true }
    })
    act(() => vi.advanceTimersByTime(150))
    const worker = MockWorker.instances[0], request = worker.postMessage.mock.calls[0][0]
    act(() => worker.onmessage!({ data: { timeline: request.timeline } }))
    rerender({ enabled: false })
    rerender({ enabled: true })
    act(() => vi.advanceTimersByTime(200))
    expect(MockWorker.instances).toHaveLength(1)
    expect(result.current.preparing).toBe(false)
  })

  it('falls back explicitly when the local worker cannot be started', () => {
    vi.stubGlobal('Worker', class { constructor() { throw Error('unavailable') } })
    const value = score()
    const { result } = renderHook(() => usePianoExpression(value, true))
    act(() => vi.advanceTimersByTime(150))
    expect(result.current.error).toContain('악보대로 재생')
    expect(result.current.timeline.events.length).toBeGreaterThan(0)
  })
})
