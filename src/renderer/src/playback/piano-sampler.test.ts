import { describe, expect, it, vi } from 'vitest'
import { PianoSampler, pianoSampleUrl, selectPianoSamples, type PianoSample } from './piano-sampler'
import { PianoTransport } from './piano-transport'
import type { PlaybackTimeline } from './timeline'

const samples: PianoSample[] = [16, 48, 88, 120].map(velocity => ({
  file: `C4v${velocity}.ogg`, rootPitch: 60, velocity, sha256: '0'.repeat(64)
}))

function prepared(sampleDurations: Record<number, number> = {}) {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
    cancelAndHoldAtTime: vi.fn() })
  const nodes: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>;
    onended?: () => void }[] = []
  const gains: { gain: ReturnType<typeof param> }[] = []
  const context = {
    currentTime: 0, destination: {},
    createGain: () => { const node = { gain: param(), connect: vi.fn(), disconnect: vi.fn() }
      gains.push(node); return node },
    createDynamicsCompressor: () => ({ threshold: param(), knee: param(), ratio: param(),
      attack: param(), release: param(), connect: vi.fn(), disconnect: vi.fn() }),
    createWaveShaper: () => ({ curve: undefined, oversample: 'none', connect: vi.fn(), disconnect: vi.fn() }),
    createBufferSource: () => {
      const node = { buffer: undefined, playbackRate: param(), connect: vi.fn(), disconnect: vi.fn(),
        start: vi.fn(), stop: vi.fn(), onended: undefined }
      nodes.push(node); return node
    }
  }
  const sampler = new PianoSampler(context as unknown as BaseAudioContext, 'https://local/piano/manifest.json')
  sampler.manifest = { version: 1, id: 'unit-fixture', samples, attribution: 'Test',
    license: 'CC-BY-3.0', licenseUrl: 'https://example.org', changes: 'test' }
  Object.assign(sampler, { buffers: new Map(samples.map(s => [s.file, { duration: sampleDurations[s.velocity] ?? 12 }])) })
  return { sampler, nodes, gains, context }
}

describe('piano sampler lifecycle', () => {
  it('cancels even a voice retired by polyphony before its future loop attack',()=>{
    const {sampler,nodes}=prepared()
    for(let i=0;i<130;i++){sampler.noteOn('lap-'+i,60,48,.5);sampler.limitNoteAt('lap-'+i,.6)}
    sampler.stopAll()
    for(const node of nodes)expect(node.stop.mock.calls.at(-1)?.[0]).toBeLessThan(.02)
  })
  it('keeps a loop boundary voice cancellable and prevents pedal release from extending it',()=>{
    const {sampler,nodes,context}=prepared()
    sampler.setSustain(true);sampler.noteOn('lap0',60,48,.1);sampler.limitNoteAt('lap0',1)
    sampler.noteOff('lap0',.5);sampler.setSustain(false,.7)
    expect(nodes[0].stop.mock.calls.every(call=>call[0]<=1)).toBe(true)
    sampler.setSustain(true,.6);expect(nodes[0].stop.mock.calls.at(-1)?.[0]).toBeLessThanOrEqual(1)
    expect(sampler.activeVoices).toBe(1);context.currentTime=.2;sampler.stopAll()
    expect(nodes[0].stop.mock.calls.at(-1)?.[0]).toBeLessThan(.3);expect(sampler.activeVoices).toBe(0)
  })

  it('does not extend the old loop source when the live settings fade reaches the boundary', () => {
    const { sampler, nodes, context } = prepared()
    sampler.noteOn('last-lap-note', 60, 48, .5)
    sampler.limitNoteAt('last-lap-note', 1)
    context.currentTime = .999
    sampler.stopAll(.002)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(1)
  })

  it('escapes sharp-note filenames in both web and packaged file URLs', () => {
    expect(pianoSampleUrl('D#4v11.ogg', 'file:///app/piano/manifest.json'))
      .toBe('file:///app/piano/D%234v11.ogg')
  })

  it('crossfades actual layers with weights summing to one', () => {
    const layers = selectPianoSamples(samples, 61, 64)
    expect(layers.map(l => l.sample.velocity)).toEqual([48, 88])
    expect(layers.reduce((sum, l) => sum + l.weight, 0)).toBeCloseTo(1)
  })

  it('anchors an ordinary sample through its future release and restores the hold when pedalled', () => {
    const { sampler, gains, nodes } = prepared()
    sampler.noteOn('held', 60, 48, .1)
    const gain = gains.at(-1)!.gain
    const level = .35 + .65 * 48 / 127
    expect(gain.linearRampToValueAtTime).toHaveBeenNthCalledWith(1, level, .1 + .002)
    expect(gain.linearRampToValueAtTime).toHaveBeenNthCalledWith(2, level, 12.1)

    sampler.noteOff('held', .5)
    expect(gain.cancelAndHoldAtTime).toHaveBeenLastCalledWith(.5)
    expect(gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, .72)
    sampler.setSustain(true, .4)
    expect(gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(level, 12.1)
    sampler.setSustain(false, 1)
    expect(gain.cancelAndHoldAtTime).toHaveBeenLastCalledWith(1)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(1.23)
  })

  it('keeps just the marked part held when manual pedal lifts inside an authored retake', () => {
    const { sampler, nodes, gains, context } = prepared()
    const transport = new PianoTransport(sampler)
    const notes = ['pedalled', 'dry'].map((partId, index) => ({
      eventId: partId, partId, staffId: partId, measureId: 'm', voiceId: 'v', startBeat: index / 4,
      durationBeats: 1, frequency: 261.6255653, velocityStart: 48 / 127 * .24, velocityEnd: 48 / 127 * .24
    }))
    const timeline: PlaybackTimeline = {
      events: notes, totalBeats: 4, tempoEvents: [],
      pedalEvents: [[0, 127], [2, 0], [2, 127], [3.5, 0]].map(([startBeat, value], index) => ({
        id: String(index), partId: 'pedalled', startBeat, value
      }))
    }
    vi.useFakeTimers()
    try {
      const origin = transport.start(timeline, 0, 120, {}, true)
      context.currentTime = origin + .5
      vi.advanceTimersByTime(20)
      context.currentTime = origin + 1.17
      sampler.setSustain(false)
      expect(nodes).toHaveLength(2)
      expect(nodes[0].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(origin + 1.75 + .23, 8)
      expect(nodes[1].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(origin + 1.17 + .23, 8)

      // Re-press before the replacement release and then lift after the mark.
      context.currentTime = origin + 1.3
      sampler.setSustain(true)
      expect(gains.at(-2)!.gain.cancelAndHoldAtTime).toHaveBeenLastCalledWith(origin + 1.75)
      expect(nodes[0].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(origin + 12, 8)
      expect(nodes[1].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(origin + 1.17 + .23, 8)
      context.currentTime = origin + 1.9
      sampler.setSustain(false)
      expect(nodes[0].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(origin + 1.9 + .23, 8)
    } finally {
      transport.stop()
      vi.useRealTimers()
    }
  })

  it('keeps the sounding layer and future attacks through a tempo change without reviving ended samples', () => {
    const { sampler, nodes, context } = prepared({ 48: .4 })
    const transport = new PianoTransport(sampler)
    const timeline: PlaybackTimeline = {
      events: [
        { startBeat: 0, durationBeats: 4, velocity: 48 },
        { startBeat: .25, durationBeats: 1, velocity: 88 },
        { startBeat: 2.5, durationBeats: 1, velocity: 88 }
      ].map(({ startBeat, durationBeats, velocity }, index) => ({
        eventId: String(index), partId: 'p', staffId: 's', measureId: 'm', voiceId: 'v',
        startBeat, durationBeats, frequency: 261.6255653, velocityStart: velocity / 127 * .24,
        velocityEnd: velocity / 127 * .24
      })),
      tempoEvents: [], totalBeats: 4
    }
    vi.useFakeTimers()
    try {
      const origin = transport.start(timeline, 0, 120, {}, true)
      context.currentTime = origin + .7
      vi.advanceTimersByTime(20)
      const at = context.currentTime
      expect(nodes).toHaveLength(3)
      expect([...sampler.captureSoundingVoices(at).keys()]).toEqual(['1:0:0'])

      transport.reschedule(timeline, 1.4, 240, {}, true, undefined, at)
      expect(nodes).toHaveLength(5)
      expect(nodes[2].stop).toHaveBeenLastCalledWith(at)
      expect(nodes[3].start.mock.calls[0][0]).toBe(at)
      expect(nodes[3].start.mock.calls[0][1]).toBeCloseTo(.575)
      expect(nodes[4].start.mock.calls[0][0]).toBeCloseTo(at + (2.5 - 1.4) / 4)
      expect(nodes[4].start.mock.calls[0][1]).toBe(0)
      sampler.setSustain(false)
      expect(nodes[3].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(at + .23)
    } finally {
      transport.stop()
      vi.useRealTimers()
    }
  })

  it('captures only sounding deferred voices and skips an ended layer when restoring the offset', () => {
    const { sampler, nodes, context } = prepared({ 48: .4 })
    sampler.setSustain(true)
    sampler.noteOn('layered', 60, 68, .2, .1)
    sampler.noteOff('layered', .4)
    sampler.noteOn('ended', 60, 48, .1)
    sampler.noteOff('ended', .3)
    sampler.noteOn('future attack', 60, 88, .9)
    sampler.noteOff('future attack', 1)
    sampler.noteOn('held key', 60, 88, .2)
    sampler.noteOff('held key', 1.1)

    context.currentTime = .8
    // The shorter layer can already be over even if its onended event has not run.
    const paused = sampler.captureManualSustain(context.currentTime)
    expect([...paused.keys()]).toEqual(['layered'])
    expect(paused.get('layered')?.offsetSeconds).toBeCloseTo(.7, 8)
    sampler.stopAll()
    sampler.noteOn('restored', 60, 68, 1, paused.get('layered')?.offsetSeconds)
    const recreated = nodes.slice(5).filter(node => node.start.mock.calls.length)
    expect(recreated).toHaveLength(1)
    expect(recreated[0].start.mock.calls[0][1]).toBeCloseTo(.7, 8)
  })

  it('resumes a manual tail beside an authored pedal voice at the original offset and releases it on pedal-up', () => {
    const { sampler, context, nodes, gains } = prepared()
    const transport = new PianoTransport(sampler)
    const timeline: PlaybackTimeline = {
      events: ['written', 'manual'].map((partId, index) => ({
        eventId: partId, partId, staffId: partId, measureId: 'm', voiceId: 'v', startBeat: index / 4,
        durationBeats: 1, frequency: 261.6255653, velocityStart: 48 / 127 * .24, velocityEnd: 48 / 127 * .24
      })),
      totalBeats: 4, tempoEvents: [],
      pedalEvents: [{ id: 'down', partId: 'written', startBeat: 0, value: 127 },
        { id: 'up', partId: 'written', startBeat: 2, value: 0 }]
    }
    vi.useFakeTimers()
    try {
      const origin = transport.start(timeline, 0, 120, {}, true)
      context.currentTime = origin + .78
      vi.advanceTimersByTime(20)
      const held = transport.captureManualSustain()
      expect([...held.keys()]).toEqual(['1:0:0'])
      expect(held.get('1:0:0')?.offsetSeconds).toBeCloseTo(.655, 8)

      // Tempo can change while paused, but the captured sample's position is physical time.
      const mixer = { manual: { muted: false, solo: false, volume: .5 } }
      const resume = transport.start(timeline, 1.56, 60, mixer, true, undefined, held)
      const restored = nodes.slice(2)
      expect(restored).toHaveLength(2)
      expect(restored[0].start.mock.calls[0][1]).toBeCloseTo(1.56, 8)
      expect(restored[1].start.mock.calls[0][1]).toBeCloseTo(.655, 8)
      expect(gains.at(-1)!.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(.35 + .65 * 24 / 127, 8)
      context.currentTime = resume + .05
      sampler.setSustain(false)
      expect(restored[0].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(resume + .44 + .23, 8)
      expect(restored[1].stop.mock.calls.at(-1)?.[0]).toBeCloseTo(resume + .05 + .23, 8)
    } finally {
      transport.stop()
      vi.useRealTimers()
    }
  })

  it('cancels a future attack even when it falls within the playback stop fade', () => {
    const { sampler, nodes, context } = prepared()
    sampler.noteOn('future', 60, 48, .504)
    context.currentTime = .5
    sampler.stopAll()
    expect(nodes[0].stop).toHaveBeenLastCalledWith(.5)
  })

  it('keeps repeated same-pitch note instances independent', () => {
    const { sampler, nodes } = prepared()
    sampler.noteOn('a', 60, 48, .1)
    sampler.noteOn('b', 60, 48, .2)
    sampler.noteOff('a', .5)
    expect(nodes[0].stop).toHaveBeenCalledWith(.73)
    expect(nodes[1].stop).not.toHaveBeenCalled()
    expect(sampler.activeVoices).toBe(2)
    nodes[0].onended?.()
    expect(sampler.activeVoices).toBe(1)
  })

  it('automates only the scheduled sample voice and cancels its curve on stop', () => {
    const { sampler, nodes, gains, context } = prepared()
    sampler.noteOn('hairpin', 60, 48, .1, 0, [{ after: 0, velocity: 48 }, { after: .4, velocity: 80 }])
    sampler.noteOn('neighbor', 60, 48, .2)
    const [hairpin, neighbor] = gains.slice(-2).map(node => node.gain)
    expect(nodes.map(node => node.start.mock.calls)).toEqual([[[.1, 0]], [[.2, 0]]])
    expect(hairpin.linearRampToValueAtTime).toHaveBeenNthCalledWith(2, .35 + .65 * 80 / 127, .5)
    expect(hairpin.linearRampToValueAtTime).toHaveBeenLastCalledWith(.35 + .65 * 80 / 127, 12.1)
    expect(neighbor.linearRampToValueAtTime.mock.calls.map(([level]) => level))
      .toEqual([.35 + .65 * 48 / 127, .35 + .65 * 48 / 127])
    context.currentTime = .25
    sampler.stopAll()
    expect(hairpin.cancelAndHoldAtTime).toHaveBeenLastCalledWith(.25)
    expect(hairpin.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, .265)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(.266)
  })

  it('keeps the reached gain under pedal until the original pedal release', () => {
    const { sampler, nodes, gains } = prepared()
    sampler.noteOn('held', 60, 48, .1, 0, [{ after: 0, velocity: 48 }, { after: .25, velocity: 80 }])
    sampler.noteOff('held', .5)
    sampler.setSustain(true, .4)
    const gain = gains.at(-1)!.gain
    expect(gain.linearRampToValueAtTime).toHaveBeenNthCalledWith(2, .35 + .65 * 80 / 127, .35)
    expect(gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.35 + .65 * 80 / 127, 12.1)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(12.1)
    sampler.setSustain(false, 1)
    expect(gain.cancelAndHoldAtTime).toHaveBeenLastCalledWith(1)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(1.23)
  })

  it('holds key releases under pedal and releases at pedal-up', () => {
    const { sampler, nodes } = prepared()
    sampler.setSustain(true)
    sampler.noteOn('a', 60, 48, .1)
    sampler.noteOff('a', .5)
    expect(nodes[0].stop).not.toHaveBeenCalled()
    sampler.setSustain(false, 1)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(1.23)
  })

  it('pedal-down cancels a future note-off scheduled by lookahead', () => {
    const { sampler, nodes } = prepared()
    sampler.noteOn('a', 60, 48, .1)
    sampler.noteOff('a', .5)
    sampler.setSustain(true, .4)
    expect(nodes[0].stop).toHaveBeenLastCalledWith(12.1)
    sampler.setSustain(false, .45)
    // The key is still held until .5; pedal-up must not release it early.
    expect(nodes[0].stop).toHaveBeenLastCalledWith(.73)
  })

  it('steals bounded voices and stopAll clears every pending instance', () => {
    const { sampler, nodes } = prepared()
    for (let i = 0; i < 130; i++) sampler.noteOn(String(i), 60, 48, .1)
    expect(sampler.activeVoices).toBe(128)
    expect(nodes[0].stop).toHaveBeenCalled()
    sampler.stopAll()
    expect(sampler.activeVoices).toBe(0)
    expect(nodes.every(n => n.stop.mock.calls.length > 0)).toBe(true)
  })

  it('resumes a held note from sample offset rather than restarting its attack', () => {
    const { sampler, nodes } = prepared()
    sampler.noteOn('a', 60, 48, .1, 2)
    expect(nodes[0].start).toHaveBeenCalledWith(.1, 2)
    expect(() => sampler.noteOn('bad', 200, 48, 0)).toThrow()
  })
})
