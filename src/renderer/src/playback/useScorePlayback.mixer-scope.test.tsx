// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER as T } from '../../../score-core'
import type { PlaybackTimeline } from './timeline'
import type { PianoCommand } from './piano-transport'
import { useScorePlayback, type PlaybackPartMixerMap } from './useScorePlayback'

const state = vi.hoisted(() => ({ contexts: [] as { currentTime: number }[], starts: [] as { mixer: PlaybackPartMixerMap; commands: PianoCommand[] }[] }))
vi.mock('./piano-sampler', () => ({ PianoSampler: class {
  hasPitches() { return true }
  preparePitches() { return Promise.resolve() }
  stopAll() {}
  dispose() {}
  setSustain() {}
} }))
vi.mock('./piano-transport', async importOriginal => {
 const actual = await importOriginal<typeof import('./piano-transport')>()
 return { ...actual, PianoTransport: class {
  start(timeline: PlaybackTimeline, beat: number, bpm: number, mixer: PlaybackPartMixerMap, _sustain: boolean, loop?: { endBeat: number }) {
    state.starts.push({ mixer: structuredClone(mixer), commands: loop ? actual.createLoopPianoCommands(timeline, beat, loop.endBeat, bpm, mixer) : actual.createPianoCommands(timeline, beat, bpm, mixer) })
    return state.contexts[0].currentTime
  }
  stop() {}
  finish() {}
} }
})
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  state.contexts.length = 0; state.starts.length = 0; frames = new Map(); let id = 0
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

const setting = (patch: Partial<PlaybackPartMixerMap[string]> = {}) => ({ muted: false, solo: false, volume: 1, ...patch })
function pitches() { return state.starts.at(-1)!.commands.filter(command => command.type === 'on').map(command => command.pitch) }

it.each([false, true])('ignores absent solo parts (muted=%s) in both transport and activity without changing stored preferences', async muted => {
  const ensemble = fixture(), single = { ...ensemble, parts: [ensemble.parts[0]] }
  const mixer = { lower: setting({ solo: true, muted }) }, before = structuredClone({ ensemble, mixer })
  const { result, rerender } = renderHook(({ score }) => useScorePlayback(score, mixer), { initialProps: { score: ensemble } })
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toHaveLength(muted ? 0 : 1)
  expect(result.current.isPartPlaying('upper')).toBe(false)
  act(() => result.current.stop()); rerender({ score: single })
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toEqual([60])
  expect(result.current.isPartPlaying('upper')).toBe(true)
  expect(state.starts.at(-1)!.mixer).not.toHaveProperty('lower')
  act(() => result.current.stop()); rerender({ score: ensemble })
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toHaveLength(muted ? 0 : 1)
  expect(result.current.isPartPlaying('upper')).toBe(false)
  expect(result.current.isPartPlaying('lower')).toBe(!muted)
  expect({ ensemble, mixer }).toEqual(before)
})

it.each([
  { name: 'mute', upper: setting({ muted: true }), audible: false },
  { name: 'zero volume', upper: setting({ volume: 0 }), audible: false },
  { name: 'solo', upper: setting({ solo: true }), audible: true },
  { name: 'default volume', upper: setting(), audible: true }
])('retains current part $name when an unrelated solo setting exists', async ({ upper, audible }) => {
  const ensemble = fixture(), score = { ...ensemble, parts: [ensemble.parts[0]] }
  const mixer = { upper, removed: setting({ solo: true }) }, before = structuredClone(mixer)
  const { result } = renderHook(() => useScorePlayback(score, mixer))
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toHaveLength(audible ? 1 : 0)
  expect(result.current.isPartPlaying('upper')).toBe(audible)
  expect(mixer).toEqual(before)
})

it('keeps a current rest-only solo part in the gain scope even when a projected timeline omits its events', async () => {
  const score = fixture()
  score.parts[1].staves[0].measures[0].voices[0].events = [createRest({ id: 'whole-rest', position: createTimePosition(0), duration: { value: 'whole', dots: 0 } })]
  const { createPlaybackTimeline } = await import('./timeline')
  const timeline = createPlaybackTimeline(score)
  const projection = { ...timeline, events: timeline.events.filter(event => event.partId === 'upper') }
  const mixer = { lower: setting({ solo: true }), removed: setting({ solo: true }) }
  const { result } = renderHook(() => useScorePlayback(score, mixer, undefined, projection))
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toEqual([])
  expect(state.starts.at(-1)!.mixer).toEqual({ lower: mixer.lower })
  expect(result.current.isPartPlaying('upper')).toBe(false)
})

it('uses the same current-score settings for practice loop commands', async () => {
  const ensemble = fixture(), score = { ...ensemble, parts: [ensemble.parts[0]] }
  const mixer = { lower: setting({ solo: true }) }, loop = { startBeat: 0, endBeat: 2, label: 'Current score practice' }
  const { result } = renderHook(() => useScorePlayback(score, mixer, undefined, undefined, false, loop))
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toEqual([60])
  expect(result.current.isPartPlaying('upper')).toBe(true)
})

it('keeps live mixer changes effective and stops on score replacement without an extra transport start', async () => {
  const ensemble = fixture(), score = { ...ensemble, parts: [ensemble.parts[0]] }
  const { result, rerender } = renderHook(({ score, mixer }) => useScorePlayback(score, mixer), {
    initialProps: { score, mixer: { lower: setting({ solo: true }), upper: setting() } }
  })
  await act(async () => result.current.play()); advance(.25)
  expect(pitches()).toEqual([60])
  const mutedMixer = { lower: setting({ solo: true }), upper: setting({ muted: true }) }
  await act(async () => rerender({ score, mixer: mutedMixer }))
  expect(pitches()).toEqual([])
  expect(state.starts).toHaveLength(2)
  await act(async () => rerender({ score: { ...score, parts: [...score.parts] }, mixer: mutedMixer }))
  expect(state.starts).toHaveLength(2)
  expect(result.current.status).toBe('stopped')
})
