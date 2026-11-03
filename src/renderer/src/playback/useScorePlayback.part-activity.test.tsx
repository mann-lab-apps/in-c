// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../../score-core'
import { useScorePlayback, type PlaybackPartMixerMap } from './useScorePlayback'

const state = vi.hoisted(() => ({ contexts: [] as { currentTime: number }[] }))
vi.mock('./piano-sampler', () => ({ PianoSampler: class {
  hasPitches() { return true }
  preparePitches() { return Promise.resolve() }
  stopAll() {}
  dispose() {}
  setSustain() {}
} }))
vi.mock('./piano-transport', () => ({ PianoTransport: class {
  start() { return state.contexts[0].currentTime }
  stop() {}
  finish() {}
} }))
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  state.contexts.length = 0; frames = new Map(); let id = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('AudioContext', class {
    currentTime = 0
    state = 'running'
    constructor() { state.contexts.push(this) }
    resume() { return Promise.resolve() }
    close() { return Promise.resolve() }
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const notes = (id: string) => createMeasure({ id: id + '-measure', voices: [createVoice({ events: [
  createNote({ id: id + '-note', position: createTimePosition(0), duration: { value: 'half', dots: 0 }, pitch: { step: 'C', octave: 4, alter: 0 } }),
  createRest({ id: id + '-rest', position: createTimePosition(2 * T), duration: { value: 'half', dots: 0 } })
] })] })
function fixture() {
  return createScore({ parts: [
    createPart({ id: 'upper', staves: [
      createStaff({ id: 'upper-rest-staff', measures: [createMeasure({ id: 'cursor-measure', voices: [createVoice({ events: [createRest({ id: 'cursor-rest', position: createTimePosition(0), duration: { value: 'whole', dots: 0 } })] })] })] }),
      createStaff({ id: 'upper-note-staff', measures: [notes('upper')] })
    ] }),
    createPart({ id: 'lower', staves: [createStaff({ id: 'lower-staff', measures: [notes('lower')] })] })
  ] })
}
function advance(seconds: number) {
  act(() => { state.contexts[0].currentTime = seconds; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(seconds * 1000)) })
}
it('reports simultaneous sounding parts without changing the single cursor or counting a rest before another staff', async () => {
  const score = fixture(), before = structuredClone(score)
  const { result } = renderHook(() => useScorePlayback(score))
  expect(result.current.isPartPlaying('upper')).toBe(false)
  await act(async () => result.current.play()); advance(.25)
  expect(result.current.activeEventId).toBe('cursor-rest')
  expect(result.current.getActiveEventForPart('upper')?.eventId).toBe('cursor-rest')
  expect(result.current.isPartPlaying('upper')).toBe(true)
  expect(result.current.isPartPlaying('lower')).toBe(true)
  expect(result.current.isPartPlaying('missing')).toBe(false)
  act(() => result.current.pause())
  expect(result.current.isPartPlaying('upper')).toBe(false)
  expect(result.current.isPartPlaying('lower')).toBe(false)
  await act(async () => result.current.play()); advance(1)
  expect(result.current.positionBeat).toBeCloseTo(2)
  expect(result.current.isPartPlaying('upper')).toBe(false)
  expect(result.current.isPartPlaying('lower')).toBe(false)
  advance(1.25)
  expect(result.current.positionBeat).toBeCloseTo(2.5)
  expect(result.current.isPartPlaying('upper')).toBe(false)
  expect(result.current.isPartPlaying('lower')).toBe(false)
  act(() => result.current.stop())
  expect(result.current.isPartPlaying('upper')).toBe(false)
  expect(score).toEqual(before)
})
it.each([
  { name: 'mute', lower: { muted: true, solo: false, volume: 1 }, upperActive: true, lowerActive: false },
  { name: 'zero volume', lower: { muted: false, solo: false, volume: 0 }, upperActive: true, lowerActive: false },
  { name: 'solo', lower: { muted: false, solo: true, volume: 1 }, upperActive: false, lowerActive: true },
  { name: 'muted solo', lower: { muted: true, solo: true, volume: 1 }, upperActive: false, lowerActive: false }
])('keeps $name activity consistent with the existing mixer gain', async ({ lower, upperActive, lowerActive }) => {
  const score = fixture(), mixer: PlaybackPartMixerMap = { lower }
  const before = structuredClone({ score, mixer })
  const { result } = renderHook(() => useScorePlayback(score, mixer))
  await act(async () => result.current.play()); advance(.25)
  expect(result.current.isPartPlaying('upper')).toBe(upperActive)
  expect(result.current.isPartPlaying('lower')).toBe(lowerActive)
  expect({ score, mixer }).toEqual(before)
})
