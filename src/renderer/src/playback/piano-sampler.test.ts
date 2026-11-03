import { describe, expect, it, vi } from 'vitest'
import { PianoSampler, pianoSampleUrl, selectPianoSamples, type PianoSample } from './piano-sampler'

const samples: PianoSample[] = [16, 48, 88, 120].map(velocity => ({
  file: `C4v${velocity}.ogg`, rootPitch: 60, velocity, sha256: '0'.repeat(64)
}))

function prepared() {
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
  Object.assign(sampler, { buffers: new Map(samples.map(s => [s.file, { duration: 12 }])) })
  return { sampler, nodes, gains, context }
}

describe('piano sampler lifecycle', () => {
  it('escapes sharp-note filenames in both web and packaged file URLs', () => {
    expect(pianoSampleUrl('D#4v11.ogg', 'file:///app/piano/manifest.json'))
      .toBe('file:///app/piano/D%234v11.ogg')
  })

  it('crossfades actual layers with weights summing to one', () => {
    const layers = selectPianoSamples(samples, 61, 64)
    expect(layers.map(l => l.sample.velocity)).toEqual([48, 88])
    expect(layers.reduce((sum, l) => sum + l.weight, 0)).toBeCloseTo(1)
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
