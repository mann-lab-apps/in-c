import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PianoSampler } from './piano-sampler'

const payload = new Uint8Array([1, 2, 3, 4]).buffer
const digest = createHash('sha256').update(new Uint8Array(payload)).digest('hex')
const manifest = () => ({ version: 1, license: 'CC-BY-3.0', samples:
  Array.from({ length: 30 }, (_, i) => 21 + i * 3).flatMap(rootPitch => [16, 48, 88, 120].map(velocity => ({
    rootPitch, velocity, file: `C${rootPitch}v${velocity}.ogg`, sha256: digest
  }))) })
function setup() {
  const param = () => ({ value: 0 })
  const node = () => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() })
  const decodeAudioData = vi.fn(async () => ({ numberOfChannels: 2, duration: 10, length: 10 * 48000 }))
  const context = { createGain: node, createDynamicsCompressor: () => ({ ...node(),
    threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
  createWaveShaper: node, decodeAudioData }
  const data = manifest()
  let corrupt = false
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true,
    arrayBuffer: async () => url.endsWith('manifest.json') ? new TextEncoder().encode(JSON.stringify(data)).buffer
      : corrupt ? new Uint8Array([9]).buffer : payload.slice(0)
  })))
  const sampler = new PianoSampler(context as unknown as BaseAudioContext, 'https://local/piano/manifest.json')
  return { sampler, data, decodeAudioData, corrupt: (value: boolean) => { corrupt = value } }
}
afterEach(() => vi.unstubAllGlobals())

describe('piano preset load failures and recovery', () => {
  it('prepares only the requested root, all its layers, and reuses neighboring pitches', async () => {
    const { sampler, decodeAudioData } = setup()
    await sampler.preparePitches([60, 60, 61])
    expect(decodeAudioData).toHaveBeenCalledTimes(4)
    expect(sampler.hasPitches([60, 61])).toBe(true)
    expect(sampler.hasPitches([63])).toBe(false)
    expect(sampler.decodedBytes).toBe(4 * 10 * 48000 * 2 * 4)
    await sampler.preparePitches([61])
    expect(decodeAudioData).toHaveBeenCalledTimes(4)
    await sampler.preparePitches([63])
    expect(decodeAudioData).toHaveBeenCalledTimes(8)
    await sampler.initialize()
    expect(decodeAudioData).toHaveBeenCalledTimes(120)
    sampler.dispose()
    expect(sampler.decodedBytes).toBe(0)
  })

  it('keeps a verified root when extending the cache fails and retries the missing root', async () => {
    const { sampler, corrupt, decodeAudioData } = setup()
    await sampler.preparePitches([60])
    const bytes = sampler.decodedBytes
    corrupt(true)
    await expect(sampler.preparePitches([63])).rejects.toThrow('손상')
    expect(sampler.hasPitches([60])).toBe(true)
    expect(sampler.hasPitches([63])).toBe(false)
    expect(sampler.decodedBytes).toBe(bytes)
    expect(() => sampler.noteOn('missing', 63, 88, 0)).toThrow('먼저 준비')
    corrupt(false)
    await sampler.preparePitches([63])
    expect(decodeAudioData).toHaveBeenCalledTimes(8)
    expect(sampler.hasPitches([60, 63])).toBe(true)
  })

  it('does not commit partially decoded layers on extension failure', async () => {
    const { sampler, decodeAudioData } = setup()
    await sampler.preparePitches([60])
    const bytes = sampler.decodedBytes
    decodeAudioData.mockRejectedValueOnce(new Error('decoder extension failed'))
    await expect(sampler.preparePitches([63])).rejects.toThrow('extension failed')
    expect(sampler.decodedBytes).toBe(bytes)
    expect(sampler.hasPitches([63])).toBe(false)
    await sampler.preparePitches([63])
    expect(sampler.hasPitches([60, 63])).toBe(true)
    expect(sampler.decodedBytes).toBe(bytes * 2)
  })

  it('serializes overlapping requests so they cannot skip or decode the same root twice', async () => {
    const { sampler, decodeAudioData } = setup()
    await Promise.all([sampler.preparePitches([60]), sampler.preparePitches([60, 63]),
      sampler.preparePitches([63, 66])])
    expect(decodeAudioData).toHaveBeenCalledTimes(12)
    expect(sampler.hasPitches([60, 63, 66])).toBe(true)
  })

  it('a failed older request does not prevent a newer queued root from succeeding', async () => {
    const { sampler, decodeAudioData } = setup()
    decodeAudioData.mockRejectedValueOnce(new Error('older failure'))
    const results = await Promise.allSettled([sampler.preparePitches([60]), sampler.preparePitches([63])])
    expect(results.map(result => result.status)).toEqual(['rejected', 'fulfilled'])
    expect(sampler.hasPitches([60])).toBe(false)
    expect(sampler.hasPitches([63])).toBe(true)
    expect(decodeAudioData).toHaveBeenCalledTimes(8)
  })

  it('disposal cancels a queued request before it can read another root', async () => {
    const { sampler, decodeAudioData } = setup()
    const pending: ((value: { numberOfChannels: number; duration: number; length: number }) => void)[] = []
    decodeAudioData.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const results = Promise.allSettled([sampler.preparePitches([60]), sampler.preparePitches([63])])
    await vi.waitFor(() => expect(pending).toHaveLength(4))
    sampler.dispose()
    pending.forEach(resolve => resolve({ numberOfChannels: 2, duration: 10, length: 10 * 48000 }))
    expect((await results).map(result => result.status)).toEqual(['rejected', 'rejected'])
    expect(decodeAudioData).toHaveBeenCalledTimes(4)
    expect(sampler.decodedBytes).toBe(0)
    expect(sampler.ready).toBe(false)
  })

  it('rejects invalid requested pitches before reading assets', async () => {
    const { sampler } = setup()
    await expect(sampler.preparePitches([NaN])).rejects.toThrow('범위')
    expect(sampler.hasPitches([200])).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('checks sample hashes and releases a failed cache before a successful retry', async () => {
    const { sampler, corrupt, decodeAudioData } = setup()
    corrupt(true)
    await expect(sampler.initialize()).rejects.toThrow('손상')
    expect(sampler.ready).toBe(false)
    expect(sampler.decodedBytes).toBe(0)
    expect(decodeAudioData).not.toHaveBeenCalled()
    corrupt(false)
    await sampler.initialize()
    expect(sampler.ready).toBe(true)
    expect(decodeAudioData).toHaveBeenCalledTimes(120)
    expect(sampler.decodedBytes).toBe(120 * 10 * 48000 * 2 * 4)
  })

  it('rejects a missing root/layer even when all filenames are different', async () => {
    const { sampler, data, decodeAudioData } = setup()
    data.samples[0].rootPitch = 24
    await expect(sampler.initialize()).rejects.toThrow('정보')
    expect(decodeAudioData).not.toHaveBeenCalled()
  })

  it('bounds decoded memory and discards every partial buffer on failure', async () => {
    const { sampler, decodeAudioData } = setup()
    decodeAudioData.mockResolvedValue({ numberOfChannels: 2, duration: 12, length: 12 * 192000 })
    await expect(sampler.initialize()).rejects.toThrow('메모리')
    expect(sampler.ready).toBe(false)
    expect(sampler.decodedBytes).toBe(0)
  })

  it('cannot repopulate cache after disposal during decoding', async () => {
    const { sampler, decodeAudioData } = setup()
    const pending: ((value: { numberOfChannels: number; duration: number; length: number }) => void)[] = []
    decodeAudioData.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const loading = sampler.initialize()
    const rejection = expect(loading).rejects.toThrow('취소')
    await vi.waitFor(() => expect(pending).toHaveLength(4))
    sampler.dispose()
    pending.forEach(resolve => resolve({ numberOfChannels: 2, duration: 12, length: 12 * 48000 }))
    await rejection
    expect(sampler.ready).toBe(false)
    expect(sampler.decodedBytes).toBe(0)
  })
})
