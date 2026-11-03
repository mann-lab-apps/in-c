import { beatDeltaToSeconds, type PlaybackTimeline } from './timeline'
import { PianoSampler } from './piano-sampler'

export interface PianoMixer { [partId: string]: { muted: boolean; solo: boolean; volume: number } }
export interface PianoCommand {
  time: number
  type: 'on' | 'off'
  id: string
  pitch: number
  velocity: number
  offset: number
}

/** Build data only. Keep enough audio-clock lookahead for expensive notation paints. */
export function createPianoCommands(timeline: PlaybackTimeline, fromBeat: number,
  bpm: number, mixer: PianoMixer): PianoCommand[] {
  const result: PianoCommand[] = []
  for (const [index, event] of timeline.events.entries()) {
    const settings = mixer[event.partId]
    if (settings?.muted || Object.entries(mixer).some(([id, s]) => id !== event.partId && s.solo)
        && !settings?.solo) continue
    const frequencies = event.frequencies ?? (event.frequency ? [event.frequency] : [])
    if (!frequencies.length) continue
    const gain = Math.max(0, Math.min(1.5, settings?.volume ?? 1)) / Math.sqrt(frequencies.length)
    if (!gain) continue
    const interval = event.tremolo?.type === 'single'
      ? ({ 1: 0.5, 2: 0.25, 3: 0.125 } as const)[event.tremolo.marks]
      : event.ornaments?.includes('trill') && event.trillFrequency ? 0.125 : undefined
    const end = event.startBeat + event.durationBeats
    const count = interval ? Math.ceil(event.durationBeats / interval) : 1
    for (let pulse = 0; pulse < count; pulse++) {
      const onset = event.startBeat + (interval ? interval * pulse : 0)
      const keyOff = interval ? Math.min(onset + interval * 0.88, end) : end
      const endBeat = pedalReleaseBeat(timeline, event.partId, keyOff)
      if (endBeat <= fromBeat) continue
      const beat = Math.max(fromBeat, onset)
      const ratio = (onset - event.startBeat) / event.durationBeats
      const velocity = event.velocityStart + (event.velocityEnd - event.velocityStart) * ratio
      const time = beatDeltaToSeconds(timeline, fromBeat, beat, bpm)
      const off = beatDeltaToSeconds(timeline, fromBeat, endBeat, bpm)
      const notes = interval && event.trillFrequency
        ? [(pulse % 2 ? event.trillFrequency : frequencies[0])]
        : frequencies
      notes.forEach((frequency, pitchIndex) => {
        const id = `${index}:${pulse}:${pitchIndex}`
        const pitch = Math.round(69 + 12 * Math.log2(frequency / 440))
        if (pitch < 21 - 1e-6 || pitch > 108 + 1e-6) {
          throw new Error('피아노 음역(A0–C8)을 벗어난 음표가 있습니다.')
        }
        const offset = onset < fromBeat
          ? beatDeltaToSeconds(timeline, onset, fromBeat, bpm) : 0
        const value = Math.max(1, Math.min(127, velocity / 0.24 * gain * 127))
        result.push({ type: 'on', time, id, pitch, velocity: value, offset },
          { type: 'off', time: off, id, pitch, velocity: value, offset: 0 })
      })
    }
  }
  return result.sort((a, b) => a.time - b.time || (a.type === b.type ? 0 : a.type === 'off' ? -1 : 1))
}

/** Preserve key-off in the score/MIDI; only sampler ringing follows CC64.
 * A lift+retake at the same tick releases old notes before new sustain. */
export function pedalReleaseBeat(timeline: PlaybackTimeline, partId: string, keyOff: number): number {
  let down = false
  const pedals = (timeline.pedalEvents ?? []).filter(event => event.partId === partId)
  for (const pedal of pedals) {
    if (pedal.startBeat > keyOff + 1e-8) break
    if (Math.abs(pedal.startBeat - keyOff) < 1e-8 && pedal.value < 64) return keyOff
    down = pedal.value >= 64
  }
  if (!down) return keyOff
  return Math.max(keyOff, pedals.find(event => event.startBeat > keyOff + 1e-8 && event.value < 64)?.startBeat ?? timeline.totalBeats)
}

export class PianoTransport {
  private timer?: ReturnType<typeof setInterval>
  private cursor = 0
  private commands: PianoCommand[] = []
  private origin = 0

  constructor(readonly sampler: PianoSampler) {}

  start(timeline: PlaybackTimeline, fromBeat: number, bpm: number, mixer: PianoMixer, sustain = false) {
    this.stop()
    this.commands = createPianoCommands(timeline, fromBeat, bpm, mixer)
    this.origin = this.sampler.context.currentTime + 0.03
    this.cursor = 0
    this.sampler.setSustain(sustain)
    this.pump()
    this.timer = setInterval(() => this.pump(), 20)
    return this.origin
  }

  private pump() {
    // Packaged 1000-note audit observed >400ms notation paints. 750ms protects
    // onset scheduling while stopAll can still cancel every future source.
    const horizon = this.sampler.context.currentTime + 0.75
    while (this.cursor < this.commands.length && this.origin + this.commands[this.cursor].time <= horizon) {
      const command = this.commands[this.cursor++]
      const at = this.origin + command.time
      if (command.type === 'on') {
        this.sampler.noteOn(command.id, command.pitch, command.velocity, at, command.offset)
      } else this.sampler.noteOff(command.id, at)
    }
    if (this.cursor === this.commands.length && this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    this.commands = []
    this.cursor = 0
    this.sampler.stopAll()
  }

  finish() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    for (const command of this.commands.slice(this.cursor)) {
      if (command.type === 'off') this.sampler.noteOff(command.id, this.sampler.context.currentTime)
    }
    this.commands = []
    this.cursor = 0
    this.sampler.setSustain(false)
  }
}
