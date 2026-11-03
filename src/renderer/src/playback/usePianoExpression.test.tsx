// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
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
