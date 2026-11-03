// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWholeChordTieScore } from '../../../testing/chord-tie-fixture'
import { createImplicitTempoUnitFixture } from '../../../testing/implicit-tempo-unit-fixture'
import { useScorePlayback, type PlaybackPartMixerMap } from './useScorePlayback'

const state = vi.hoisted(() => ({ samplers: [] as any[], transports: [] as any[], contexts: [] as any[], resumes: [] as (() => Promise<void>)[] }))
vi.mock('./piano-sampler', () => ({ PianoSampler: class {
  ready = false
  pending?: Promise<void>
  release?: () => void
  stopAll = vi.fn()
  dispose = vi.fn()
  noteOn = vi.fn()
  noteOff = vi.fn()
  setSustain = vi.fn()
  constructor() { state.samplers.push(this) }
  hasPitches() { return this.ready }
  preparePitches() {
    if (this.ready) return Promise.resolve()
    return this.pending ??= new Promise<void>(resolve => { this.release = () => { this.ready = true; resolve() } })
  }
} }))
vi.mock('./piano-transport', () => ({ PianoTransport: class {
  start = vi.fn(() => 0)
  stop = vi.fn()
  finish = vi.fn()
  constructor() { state.transports.push(this) }
} }))

let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  state.samplers.length = state.transports.length = state.contexts.length = state.resumes.length = 0
  frames = new Map()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('AudioContext', class {
    currentTime = 0
    close = vi.fn(() => Promise.resolve())
    resume = vi.fn(() => state.resumes.shift()?.() ?? Promise.resolve())
    constructor() { state.contexts.push(this) }
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function setup() {
  const score = createWholeChordTieScore(false)
  const mixer: PlaybackPartMixerMap = {}
  return { score, ...renderHook(({ value, mix }) => useScorePlayback(value, mix), { initialProps: { value: score, mix: mixer } }) }
}
async function ready(result: { current: ReturnType<typeof useScorePlayback> }) {
  await act(async () => { result.current.play() })
  await act(async () => { state.samplers[0].release() })
}

it('piano.lifecycle cancels loading with rewind and permits a cached retry without late playback', async () => {
  const { result } = setup()
  await act(async () => { result.current.play() })
  expect(result.current.audioState).toBe('loading')
  act(() => result.current.jumpToStart())
  expect(result.current.audioState).toBe('idle')
  await act(async () => { state.samplers[0].release() })
  expect(state.transports).toHaveLength(0)
  expect(result.current.status).toBe('stopped')
  await act(async () => { result.current.play() })
  expect(result.current.status).toBe('playing')
  expect(state.transports[0].start).toHaveBeenCalledTimes(1)
})

it('piano.lifecycle stop invalidates pending load; pause/resume and sustain reuse the ready sampler', async () => {
  const { result } = setup()
  await act(async () => { result.current.play() })
  act(() => result.current.stop())
  await act(async () => { state.samplers[0].release() })
  expect(state.transports).toHaveLength(0)
  await act(async () => { result.current.play() })
  act(() => { state.contexts[0].currentTime = 0.5; result.current.pause() })
  expect(result.current.status).toBe('paused')
  expect(result.current.positionBeat).toBe(1)
  expect(frames.size).toBe(0)
  act(() => result.current.setSustain(true))
  await act(async () => { result.current.play() })
  expect(state.transports[0].start.mock.calls.at(-1)?.[1]).toBe(1)
  expect(state.transports[0].start.mock.calls.at(-1)?.[4]).toBe(true)
  act(() => { result.current.setSustain(false); result.current.stop() })
  expect(state.samplers[0].setSustain).toHaveBeenLastCalledWith(false)
  expect(frames.size).toBe(0)
  expect(result.current.activeEvent).toBeUndefined()
})

it('piano.lifecycle failed mixer restart stops the cursor and permits retry at the retained position', async () => {
  const { result, rerender, score } = setup()
  await ready(result)
  state.contexts[0].currentTime = 0.5
  state.resumes.push(() => Promise.reject(new Error('owned restart failure')))
  await act(async () => { rerender({ value: score, mix: { 'tie-part': { muted: false, solo: false, volume: .5 } } }) })
  expect(result.current.audioError).toBe('owned restart failure')
  expect(result.current.status).toBe('stopped')
  expect(frames.size).toBe(0)
  await act(async () => { result.current.play() })
  expect(result.current.status).toBe('playing')
  expect(result.current.audioError).toBe('')
})

it('piano.lifecycle document replacement clears a previous document audio failure', async () => {
  const { result, rerender } = setup()
  state.resumes.push(() => Promise.reject(new Error('old document device failure')))
  await act(async () => { result.current.play() })
  expect(result.current.audioState).toBe('error')
  await act(async () => { rerender({ value: createWholeChordTieScore(true), mix: {} }) })
  expect(result.current.audioError).toBe('')
  expect(result.current.audioState).toBe('idle')
  expect(result.current.status).toBe('stopped')
})

it('piano.lifecycle an old resume rejection cannot replace a newer successful owner', async () => {
  const { result } = setup()
  let reject!: (error: Error) => void
  state.resumes.push(() => new Promise<void>((_, no) => { reject = no }))
  await act(async () => { result.current.play() })
  act(() => result.current.stop())
  await ready(result)
  await act(async () => { reject(new Error('stale failure')) })
  expect(result.current.status).toBe('playing')
  expect(result.current.audioState).toBe('ready')
  expect(result.current.audioError).toBe('')
})

it('piano.lifecycle unmount disposes audio and ignores pending completion', async () => {
  const { result, unmount } = setup()
  await act(async () => { result.current.play() })
  const sampler = state.samplers[0], context = state.contexts[0]
  unmount()
  await act(async () => { sampler.release() })
  expect(sampler.dispose).toHaveBeenCalledTimes(1)
  expect(context.close).toHaveBeenCalledTimes(1)
  expect(state.transports).toHaveLength(0)
  expect(frames.size).toBe(0)
})

it.each([
  { name: 'dotted quarter', tempo: { bpm: 97, beatUnit: 'quarter', dots: 1 }, quarterBpm: 145.5 },
  { name: 'half above the authoring limit', tempo: { bpm: 200, beatUnit: 'half' }, quarterBpm: 400 },
  { name: 'eighth below the authoring limit', tempo: { bpm: 40, beatUnit: 'eighth' }, quarterBpm: 20 },
  { name: 'dotted half', tempo: { bpm: 88, beatUnit: 'half', dots: 1 }, quarterBpm: 264 },
  { name: 'explicit quarter control', tempo: { bpm: 97, beatUnit: 'quarter' }, quarterBpm: 97 },
  { name: 'implicit quarter control', tempo: { bpm: 96 }, quarterBpm: 96 }
] as const)('piano.derived-tempo preserves $name for transport and cursor', async ({ tempo, quarterBpm }) => {
  const score = createWholeChordTieScore(false)
  score.tempo = tempo
  const before = structuredClone(score)
  const { result } = renderHook(() => useScorePlayback(score))
  expect(result.current.tempo).toBe(quarterBpm)
  await ready(result)
  expect(state.transports[0].start.mock.calls[0][2]).toBe(quarterBpm)
  act(() => { state.contexts[0].currentTime = 0.5; result.current.pause() })
  expect(result.current.positionBeat).toBeCloseTo(quarterBpm / 120, 10)
  expect(score).toEqual(before)
})

it('piano.derived-tempo keeps manual transport normalization separate from score conversion', () => {
  const { result } = setup()
  act(() => result.current.setTempo(310.7))
  expect(result.current.tempo).toBe(240)
  act(() => result.current.setTempo(39.1))
  expect(result.current.tempo).toBe(40)
  act(() => result.current.setTempo(97.4))
  expect(result.current.tempo).toBe(97)
})

it.each([
  { tempo: { bpm: 97, beatUnit: 'quarter', dots: 1 }, quarterBpm: 145.5 },
  { tempo: { bpm: 200, beatUnit: 'half' }, quarterBpm: 400 },
  { tempo: { bpm: 120, beatUnit: 'quarter' }, quarterBpm: 120 }
] as const)('piano.selected-derived-tempo resumes the performed beat at $quarterBpm without rewinding selection', async ({ tempo, quarterBpm }) => {
  const score = createImplicitTempoUnitFixture('global-implicit')
  score.tempo = tempo
  const before = structuredClone(score)
  const part = score.parts[0], staff = part.staves[0], measure = staff.measures[1], voice = measure.voices[0]
  const event = voice.events[0]
  const { result } = renderHook(() => useScorePlayback(score))
  await act(async () => result.current.playFromEvent(event.id, { partId: part.id, staffId: staff.id, measureId: measure.id, voiceId: voice.id }))
  await act(async () => state.samplers[0].release())
  const transport = state.transports[0]
  expect(transport.start.mock.calls[0].slice(1, 3)).toEqual([4, quarterBpm])
  expect(result.current.positionBeat).toBe(4)
  expect(result.current.activeEventId).toBe(event.id)

  act(() => { state.contexts[0].currentTime = 0.15; result.current.pause() })
  const retainedBeat = 4 + quarterBpm * 0.15 / 60
  expect(result.current.positionBeat).toBeCloseTo(retainedBeat, 10)
  expect(result.current.status).toBe('paused')
  transport.start.mockReturnValue(0.15)
  await act(async () => result.current.play())
  expect(transport.start).toHaveBeenCalledTimes(2)
  expect(transport.start.mock.calls[1][1]).toBeCloseTo(retainedBeat, 10)
  expect(transport.start.mock.calls[1][2]).toBe(quarterBpm)
  act(() => { state.contexts[0].currentTime = 0.20; result.current.pause() })
  expect(result.current.positionBeat).toBeCloseTo(4 + quarterBpm * 0.20 / 60, 10)
  expect(score).toEqual(before)
})
