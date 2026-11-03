export interface PianoSample {
  rootPitch: number
  velocity: number
  file: string
  sha256: string
}

export interface PianoManifest {
  version: number
  id: string
  attribution: string
  license: string
  licenseUrl: string
  changes: string
  samples: PianoSample[]
}

interface Voice {
  id: string
  sources: AudioBufferSourceNode[]
  gains: GainNode[]
  startedAt: number
  released: boolean
  deferred: boolean
  offAt?: number
  naturalEnds: number[]
}

const safetyCurve = Float32Array.from({ length: 65537 }, (_, i) => {
  const value = (i / 65536 * 2 - 1) * 4
  const magnitude = Math.abs(value)
  return magnitude <= .85 ? value : Math.sign(value) * (.85 + .14 * Math.tanh((magnitude - .85) / .14))
})

/** Four recorded velocity layers. No synthesized replacement on load failure. */
export class PianoSampler {
  readonly maxVoices = 128
  readonly engineVersion = 'sample-layers-v3-demand-cache'
  manifest?: PianoManifest
  decodedBytes = 0
  private buffers = new Map<string, AudioBuffer>()
  private voices = new Map<string, Voice>()
  private master: GainNode
  private compressor: DynamicsCompressorNode
  private limiterInput: GainNode
  private limiter: WaveShaperNode
  private loading?: Promise<void>
  private disposed = false
  private pedalDown = false

  constructor(readonly context: BaseAudioContext,
    private manifestUrl = new URL('piano/manifest.json', document.baseURI).href) {
    this.master = context.createGain()
    this.master.gain.value = 0.7
    this.compressor = context.createDynamicsCompressor()
    this.compressor.threshold.value = -10
    this.compressor.knee.value = 6
    this.compressor.ratio.value = 8
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.15
    this.master.connect(this.compressor)
    this.limiterInput = context.createGain()
    this.limiterInput.gain.value = .25
    this.limiter = context.createWaveShaper()
    this.limiter.curve = safetyCurve
    this.limiter.oversample = '2x'
    this.compressor.connect(this.limiterInput)
    this.limiterInput.connect(this.limiter)
    this.limiter.connect(context.destination)
  }

  get activeVoices() { return this.voices.size }
  get ready() { return Boolean(this.manifest) && !this.disposed }

  initialize(onProgress?: (fraction: number) => void): Promise<void> {
    return this.prepare(undefined, onProgress)
  }

  /** All four layers of each required root, so mixer/dynamics changes need no I/O. */
  preparePitches(pitches: readonly number[], onProgress?: (fraction: number) => void): Promise<void> {
    if (pitches.some(pitch => !Number.isFinite(pitch) || pitch < 21 || pitch > 108)) {
      return Promise.reject(new Error('피아노 음높이가 범위를 벗어났습니다.'))
    }
    return this.prepare([...new Set(pitches)], onProgress)
  }

  hasPitches(pitches: readonly number[]): boolean {
    if (pitches.some(pitch => !Number.isFinite(pitch) || pitch < 21 || pitch > 108)) return false
    return this.ready && this.requiredSamples(this.manifest!, pitches)
      .every(sample => this.buffers.has(sample.file))
  }

  private requiredSamples(manifest: PianoManifest, pitches?: readonly number[]): PianoSample[] {
    if (!pitches) return manifest.samples
    const roots = new Set(pitches.map(pitch =>
      selectPianoSamples(manifest.samples, pitch, 16)[0].sample.rootPitch))
    return manifest.samples.filter(sample => roots.has(sample.rootPitch))
  }

  private prepare(pitches?: readonly number[], onProgress?: (fraction: number) => void): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('이미 종료된 피아노입니다.'))
    // Different pitch requests may overlap. Serialize their commits; each caller
    // observes its own failure, and a later request can retry after that failure.
    const task = (this.loading ?? Promise.resolve()).catch(() => undefined)
      .then(() => this.load(pitches, onProgress))
    this.loading = task
    const settled = () => { if (this.loading === task) this.loading = undefined }
    void task.then(settled, settled)
    return task
  }

  private async load(pitches?: readonly number[], onProgress?: (fraction: number) => void) {
    if (this.disposed) throw new Error('피아노 로딩이 취소됐습니다.')
    const manifest: PianoManifest = this.manifest ?? JSON.parse(new TextDecoder()
      .decode(await readPianoAsset(this.manifestUrl)))
    if (manifest.version !== 1 || manifest.license !== 'CC-BY-3.0' || !Array.isArray(manifest.samples) ||
        manifest.samples.length !== 120 || manifest.samples.some(s =>
          !/^[A-G]#?\d+v\d+\.ogg$/.test(s.file) || !/^[a-f0-9]{64}$/.test(s.sha256) ||
          !Number.isInteger(s.rootPitch) || s.rootPitch < 21 || s.rootPitch > 108 ||
          ![16, 48, 88, 120].includes(s.velocity)) ||
        new Set(manifest.samples.map(s => s.file)).size !== manifest.samples.length ||
        Array.from({ length: 30 }, (_, i) => 21 + i * 3).some(root =>
          [16, 48, 88, 120].some(velocity => manifest.samples.filter(s => s.rootPitch === root && s.velocity === velocity).length !== 1))) {
      throw new Error('피아노 음원 정보가 올바르지 않습니다.')
    }
    const required = this.requiredSamples(manifest, pitches)
    const missing = required.filter(sample => !this.buffers.has(sample.file))
    const staged = new Map<string, AudioBuffer>()
    let cursor = 0, loaded = required.length - missing.length, stagedBytes = 0
    onProgress?.(required.length ? loaded / required.length : 1)
    const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
      while (cursor < missing.length) {
        const entry = missing[cursor++]
        const encoded = await readPianoAsset(pianoSampleUrl(entry.file, this.manifestUrl))
        const digest = await crypto.subtle.digest('SHA-256', encoded)
        const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
        if (hex !== entry.sha256) throw new Error(`피아노 음원이 손상됐습니다: ${entry.file}`)
        const buffer = await this.context.decodeAudioData(encoded)
        if (this.disposed) throw new Error('피아노 로딩이 취소됐습니다.')
        if (buffer.numberOfChannels !== 2 || !Number.isFinite(buffer.duration) ||
          buffer.duration <= 0 || buffer.duration > 12.1) throw new Error('피아노 sample 형식 또는 길이가 올바르지 않습니다.')
        const bytes = buffer.length * buffer.numberOfChannels * 4
        if (this.decodedBytes + stagedBytes + bytes > 512 * 1024 ** 2) throw new Error('피아노 음원 cache 메모리 한도를 초과했습니다.')
        staged.set(entry.file, buffer)
        stagedBytes += bytes
        onProgress?.(++loaded / required.length)
      }
    }))
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) throw failed.reason
    if (this.disposed) throw new Error('피아노 로딩이 취소됐습니다.')
    for (const [file, buffer] of staged) this.buffers.set(file, buffer)
    this.decodedBytes += stagedBytes
    this.manifest = manifest
  }

  fork(context: BaseAudioContext) {
    if (!this.ready) throw new Error('피아노를 먼저 준비해 주세요.')
    const clone = new PianoSampler(context, this.manifestUrl)
    clone.manifest = this.manifest
    clone.buffers = new Map(this.buffers)
    clone.decodedBytes = this.decodedBytes
    return clone
  }

  noteOn(id: string, pitch: number, velocity: number, at: number, offsetSeconds = 0) {
    if (!this.ready) throw new Error('피아노 음원을 먼저 준비해 주세요.')
    if (!Number.isFinite(pitch) || pitch < 21 || pitch > 108 ||
        !Number.isFinite(velocity) || velocity <= 0 || velocity > 127) {
      throw new Error('피아노 음높이 또는 세기가 범위를 벗어났습니다.')
    }
    const layers = selectPianoSamples(this.manifest!.samples, pitch, velocity)
    if (layers.some(({ sample }) => !this.buffers.has(sample.file))) {
      throw new Error('이 음역의 피아노 음원을 먼저 준비해 주세요.')
    }
    this.stopVoice(this.voices.get(id), this.context.currentTime, 0.01)
    if (this.voices.size >= this.maxVoices) {
      const ordered = [...this.voices.values()].sort((a, b) =>
        Number(b.released || b.deferred) - Number(a.released || a.deferred) || a.startedAt - b.startedAt)
      this.stopVoice(ordered[0], Math.max(at, this.context.currentTime), 0.015)
    }
    const voice: Voice = { id, sources: [], gains: [], startedAt: at,
      released: false, deferred: false, naturalEnds: [] }
    this.voices.set(id, voice)
    for (const { sample, weight } of layers) {
      const source = this.context.createBufferSource(), gain = this.context.createGain()
      source.buffer = this.buffers.get(sample.file)!
      source.playbackRate.value = 2 ** ((pitch - sample.rootPitch) / 12)
      const start = Math.max(at, this.context.currentTime)
      const amplitude = weight * (0.35 + 0.65 * velocity / 127)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(amplitude, start + 0.002)
      source.connect(gain)
      gain.connect(this.master)
      voice.sources.push(source)
      voice.gains.push(gain)
      source.onended = () => {
        source.disconnect()
        gain.disconnect()
        const index = voice.sources.indexOf(source)
        if (index >= 0) {
          voice.sources.splice(index, 1)
          voice.gains.splice(index, 1)
          voice.naturalEnds.splice(index, 1)
        }
        if (!voice.sources.length && this.voices.get(id) === voice) this.voices.delete(id)
      }
      // Resume inside a held note without replaying the recorded hammer attack.
      const offset = Math.max(0, offsetSeconds) * source.playbackRate.value
      if (offset < source.buffer.duration) {
        voice.naturalEnds.push(start + (source.buffer.duration - offset) / source.playbackRate.value)
        source.start(start, offset)
      }
      else {
        source.disconnect()
        gain.disconnect()
        voice.sources.pop()
        voice.gains.pop()
      }
    }
    if (!voice.sources.length) this.voices.delete(id)
  }

  noteOff(id: string, at: number) {
    const voice = this.voices.get(id)
    if (!voice || voice.released) return
    voice.offAt = at
    if (this.pedalDown) voice.deferred = true
    else this.releaseVoice(voice, at)
  }

  setSustain(down: boolean, at = this.context.currentTime) {
    this.pedalDown = down
    if (down) for (const voice of this.voices.values()) {
      // A note-off may already be scheduled within the transport lookahead.
      // Pedal pressed before that timestamp must cancel the future damper release.
      if (voice.released && voice.offAt !== undefined && voice.offAt >= at) {
        for (const gain of voice.gains) gain.gain.cancelAndHoldAtTime(voice.offAt)
        voice.sources.forEach((source, i) => source.stop(voice.naturalEnds[i]))
        voice.released = false
        voice.deferred = true
      }
    }
    if (!down) for (const voice of this.voices.values()) {
      if (voice.deferred) this.releaseVoice(voice, Math.max(at, voice.offAt ?? at))
    }
  }

  private releaseVoice(voice: Voice, at: number) {
    voice.released = true
    voice.deferred = false
    const time = Math.max(at, this.context.currentTime)
    for (const gain of voice.gains) {
      gain.gain.cancelAndHoldAtTime(time)
      gain.gain.linearRampToValueAtTime(0, time + 0.22)
    }
    for (const source of voice.sources) source.stop(time + 0.23)
  }

  private stopVoice(voice: Voice | undefined, at: number, fade: number) {
    if (!voice) return
    for (const gain of voice.gains) {
      gain.gain.cancelAndHoldAtTime(at)
      gain.gain.linearRampToValueAtTime(0, at + fade)
    }
    for (const source of voice.sources) { try { source.stop(at + fade + 0.001) } catch { /* ended */ } }
    if (this.voices.get(voice.id) === voice) this.voices.delete(voice.id)
  }

  stopAll() {
    for (const voice of this.voices.values()) this.stopVoice(voice, this.context.currentTime, 0.015)
    this.pedalDown = false
  }

  dispose() {
    this.disposed = true
    this.stopAll()
    this.buffers.clear()
    this.decodedBytes = 0
    this.master.disconnect()
    this.compressor.disconnect()
    this.limiterInput.disconnect()
    this.limiter.disconnect()
  }
}

export async function readPianoAsset(url: string): Promise<ArrayBuffer> {
  if (new URL(url).protocol === 'file:') {
    // Chromium fetch does not support file URLs; XHR also works inside app.asar.
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('GET', url)
      request.responseType = 'arraybuffer'
      request.timeout = 15000
      request.onload = () => {
        if ((request.status === 0 || request.status === 200) && request.response?.byteLength) {
          resolve(request.response)
        } else reject(new Error('피아노 음원 파일을 읽지 못했습니다.'))
      }
      request.onerror = () => reject(new Error('피아노 음원을 찾을 수 없습니다. 앱 설치를 확인해 주세요.'))
      request.ontimeout = () => reject(new Error('피아노 음원 읽기 시간이 초과됐습니다.'))
      request.send()
    })
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('피아노 음원을 찾을 수 없습니다. 앱 설치를 확인해 주세요.')
  return response.arrayBuffer()
}

export function pianoSampleUrl(file: string, manifest: string) {
  return new URL(encodeURIComponent(file), manifest).href
}

export function selectPianoSamples(samples: PianoSample[], pitch: number, velocity: number) {
  const root = samples.reduce((best, s) => Math.abs(s.rootPitch - pitch) < Math.abs(best - pitch)
    ? s.rootPitch : best, samples[0].rootPitch)
  const layers = samples.filter(s => s.rootPitch === root).sort((a, b) => a.velocity - b.velocity)
  const upper = layers.findIndex(s => s.velocity >= velocity)
  if (upper <= 0) return [{ sample: upper === 0 ? layers[0] : layers.at(-1)!, weight: 1 }]
  const a = layers[upper - 1], b = layers[upper]
  const mix = (velocity - a.velocity) / (b.velocity - a.velocity)
  return [{ sample: a, weight: 1 - mix }, { sample: b, weight: mix }].filter(l => l.weight > 0)
}
