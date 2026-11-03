// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWholeChordTieScore } from '../../../testing/chord-tie-fixture'
import { useScorePlayback } from './useScorePlayback'

const owned = vi.hoisted(() => ({ contexts: [] as any[], pianos: [] as any[],
  transports: [] as any[], loads: [] as (() => Promise<void>)[] }))
vi.mock('./piano-sampler', () => ({ PianoSampler: class {
  ready = false
  stopAll = vi.fn()
  dispose = vi.fn()
  noteOn = vi.fn()
  noteOff = vi.fn()
  setSustain = vi.fn()
  constructor() { owned.pianos.push(this) }
  hasPitches() { return this.ready }
  async preparePitches() { await owned.loads.shift()?.(); this.ready = true }
} }))
vi.mock('./piano-transport', () => ({ PianoTransport: class {
  stop = vi.fn()
  finish = vi.fn()
  start = vi.fn(() => owned.contexts.at(-1).currentTime)
  constructor() { owned.transports.push(this) }
} }))

let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  owned.contexts.length = owned.pianos.length = owned.transports.length = owned.loads.length = 0
  frames = new Map()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++id, fn); return id })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('AudioContext', class extends EventTarget {
    state = 'suspended'
    currentTime = 0
    removeEventListener = vi.fn(super.removeEventListener.bind(this))
    resume = vi.fn(async () => { this.changeState('running') })
    close = vi.fn(async () => { this.changeState('closed') })
    changeState(next: string) { this.state = next; this.dispatchEvent(new Event('statechange')) }
    constructor() { super(); owned.contexts.push(this) }
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
// Use one stable score identity across hook renders.
function stableSetup() {
  const score = createWholeChordTieScore(false)
  return renderHook(() => useScorePlayback(score))
}
async function play(result: ReturnType<typeof stableSetup>['result']) {
  await act(async () => { result.current.play() })
}

it.each(['suspended', 'interrupted'])('device %s pauses at the current beat and never auto-resumes', async state => {
  const { result } = stableSetup()
  await play(result)
  const context = owned.contexts[0], transport = owned.transports[0]
  act(() => { context.currentTime = .5; context.changeState(state) })
  expect(result.current.status).toBe('paused')
  expect(result.current.positionBeat).toBe(1)
  expect(transport.stop).toHaveBeenCalled()
  expect(frames.size).toBe(0)
  act(() => context.changeState('running'))
  expect(result.current.status).toBe('paused')
  expect(transport.start).toHaveBeenCalledTimes(1)
  await play(result)
  expect(result.current.status).toBe('playing')
  expect(transport.start.mock.calls.at(-1)[1]).toBe(1)
  expect(owned.contexts).toHaveLength(1)
  expect(result.current.audioError).toBe('')
})

it('device close releases the old sampler and retries with a new context at the retained beat', async () => {
  const { result } = stableSetup()
  await play(result)
  const context = owned.contexts[0], piano = owned.pianos[0]
  act(() => { context.currentTime = .5; context.changeState('closed') })
  expect(result.current.status).toBe('paused')
  expect(result.current.audioState).toBe('error')
  expect(piano.dispose).toHaveBeenCalledTimes(1)
  await play(result)
  expect(owned.contexts).toHaveLength(2)
  expect(owned.pianos).toHaveLength(2)
  expect(owned.transports[1].start.mock.calls[0][1]).toBe(1)
  expect(result.current.status).toBe('playing')
  // A queued old context notification must not stop the newer owner.
  act(() => context.dispatchEvent(new Event('statechange')))
  expect(result.current.status).toBe('playing')
  expect(result.current.audioError).toBe('')
})

it('device close during loading invalidates an old failure after a new successful retry', async () => {
  const { result } = stableSetup()
  let reject!: (reason: Error) => void
  owned.loads.push(() => new Promise<void>((_, no) => { reject = no }))
  await play(result)
  act(() => owned.contexts[0].changeState('closed'))
  expect(result.current.audioState).toBe('error')
  await play(result)
  await act(async () => { reject(new Error('old decoder failure')) })
  expect(result.current.status).toBe('playing')
  expect(result.current.audioError).toBe('')
  expect(owned.transports).toHaveLength(1)
})

it('device close during loading ignores old success after a newer successful retry', async () => {
  const { result } = stableSetup()
  let release!: () => void
  owned.loads.push(() => new Promise<void>(yes => { release = yes }))
  await play(result)
  act(() => owned.contexts[0].changeState('closed'))
  await play(result)
  await act(async () => { release() })
  expect(result.current.status).toBe('playing')
  expect(result.current.audioState).toBe('ready')
  expect(owned.transports).toHaveLength(1)
  expect(owned.transports[0].start).toHaveBeenCalledTimes(1)
})

it('device that remains suspended after resume cannot start a silent transport', async () => {
  const { result } = stableSetup()
  await play(result)
  act(() => owned.contexts[0].changeState('suspended'))
  owned.contexts[0].resume.mockImplementation(async () => {})
  await play(result)
  expect(result.current.status).toBe('stopped')
  expect(result.current.audioState).toBe('error')
  expect(owned.transports[0].start).toHaveBeenCalledTimes(1)
  expect(frames.size).toBe(0)
})

it('device interruption cancels a preview without leaving its completion timer active', async () => {
  const { result } = stableSetup()
  await act(async () => { await result.current.previewNote() })
  expect(result.current.previewing).toBe(true)
  const calls = owned.pianos[0].stopAll.mock.calls.length
  act(() => owned.contexts[0].changeState('interrupted'))
  expect(result.current.previewing).toBe(false)
  expect(owned.pianos[0].stopAll.mock.calls.length).toBe(calls + 1)
  expect(result.current.status).toBe('stopped')
})

it('device close during unmount detaches its observer before closing the context', async () => {
  const { result, unmount } = stableSetup()
  await play(result)
  const context = owned.contexts[0]
  unmount()
  expect(context.removeEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
  expect(context.close).toHaveBeenCalledTimes(1)
  expect(owned.pianos[0].dispose).toHaveBeenCalledTimes(1)
  expect(frames.size).toBe(0)
})
