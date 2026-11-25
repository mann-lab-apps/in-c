import { beatDeltaToSeconds, elapsedSecondsToBeat, resolveEventVelocityAtBeat, type PlaybackEvent, type PlaybackTimeline } from './timeline'
import { PIANO_ATTACK_SECONDS, PianoSampler, type PianoVoicePosition, type PianoVelocityPoint } from './piano-sampler'
import { resolveTremoloBeatInterval } from './tremolo-interval'
import type {PracticeLoopRange} from './practice-loop'
import {createPracticeLoopClock,PracticeLoopQueue,type PracticeLoopClock} from './practice-loop-clock'

export interface PianoMixer { [partId: string]: { muted: boolean; solo: boolean; volume: number } }
export interface PianoCommand {
  time: number
  type: 'on' | 'off'
  id: string
  pitch: number
  velocity: number
  offset: number
  velocityCurve?: readonly PianoVelocityPoint[]
  pedalPartId?: string
  keyReleased?: true
}

function pianoVelocity(value: number, gain: number): number {
  return Math.max(1, Math.min(127, value / .24 * gain * 127))
}

function partVolume(mixer: PianoMixer, partId: string): number {
  const settings = mixer[partId]
  if (settings?.muted || (!settings?.solo && Object.values(mixer).some(part => part.solo))) return 0
  return Math.max(0, Math.min(1.5, settings?.volume ?? 1))
}

function planVelocityCurve(timeline: PlaybackTimeline, event: PlaybackEvent, beat: number,
  keyOff: number, bpm: number, gain: number, attackVelocity: number): readonly PianoVelocityPoint[] | undefined {
  if (!event.sampleHairpinVelocity || event.velocityStart === event.velocityEnd) return undefined
  const from = event.velocityStartBeat ?? event.startBeat
  const to = event.velocityEndBeat ?? event.startBeat + event.durationBeats
  const first = Math.max(beat, from)
  const last = Math.min(keyOff, to)
  const beats = [beat]
  if (last > first) {
    if (first > beat) beats.push(first)
    for (const tempo of timeline.tempoEvents) {
      if (tempo.startBeat > first && tempo.startBeat < last) beats.push(tempo.startBeat)
    }
    // A mixer can reach a velocity cap before the end of a notated ramp.
    // Keep that crossing, like a tempo change, as a curve point.
    const delta = event.velocityEnd - event.velocityStart
    for (const velocity of [1, 127]) {
      const crossing = from + (to - from) * ((velocity / 127 * .24 / gain) - event.velocityStart) / delta
      if (crossing > first && crossing < last) beats.push(crossing)
    }
    beats.push(last)
  }
  const points = [...new Set(beats)].sort((a, b) => a - b).map(position => ({
    after: beatDeltaToSeconds(timeline, beat, position, bpm),
    velocity: pianoVelocity(resolveEventVelocityAtBeat(event, Math.min(position, keyOff)), gain)
  }))
  return points.some(point => point.velocity !== attackVelocity) ? points : undefined
}

/** Build data only. Keep enough audio-clock lookahead for expensive notation paints. */
export function createPianoCommands(timeline: PlaybackTimeline, fromBeat: number,
  bpm: number, mixer: PianoMixer, continuation?: ReadonlyMap<string, PianoVoicePosition>,
  previousMixer?: PianoMixer): PianoCommand[] {
  const result: PianoCommand[] = []
  const pedalledParts = new Set(timeline.pedalEvents?.filter(event => event.value >= 64).map(event => event.partId))
  for (const [index, event] of timeline.events.entries()) {
    const frequencies = event.frequencies ?? (event.frequency ? [event.frequency] : [])
    if (!frequencies.length) continue
    const gain = partVolume(mixer, event.partId) / Math.sqrt(frequencies.length)
    if (!gain) continue
    const wasAudible = previousMixer && partVolume(previousMixer, event.partId) > 0
    const interval = event.tremolo?.type === 'single'
      ? event.tremoloIntervalBeats ?? resolveTremoloBeatInterval(event.tremolo.marks)
      : event.ornaments?.includes('trill') && event.trillFrequency ? 0.125 : undefined
    const end = event.startBeat + event.durationBeats
    const count = interval ? Math.ceil(event.durationBeats / interval) : 1
    for (let pulse = 0; pulse < count; pulse++) {
      const onset = event.startBeat + (interval ? interval * pulse : 0)
      // Warped rational durations can round ceil(N) up to N+1. A boundary
      // attack has no sounding interval and could otherwise outlive its off.
      if (interval && onset >= end - 1e-9) break
      const keyOff = interval ? Math.min(onset + interval * 0.88, end) : end
      const endBeat = pedalReleaseBeat(timeline, event.partId, keyOff)
      const ended = endBeat <= fromBeat
      if (ended && !continuation?.size) continue
      const beat = Math.max(fromBeat, onset)
      const velocity = resolveEventVelocityAtBeat(event, onset)
      const time = beatDeltaToSeconds(timeline, fromBeat, beat, bpm)
      const off = beatDeltaToSeconds(timeline, fromBeat, endBeat, bpm)
      const notes = interval && event.trillFrequency
        ? [(pulse % 2 ? event.trillFrequency : frequencies[0])]
        : frequencies
      const value = pianoVelocity(velocity, gain)
      const velocityCurve = planVelocityCurve(timeline, event, beat, keyOff, bpm, gain, value)
      notes.forEach((frequency, pitchIndex) => {
        const id = `${index}:${pulse}:${pitchIndex}`
        const saved = continuation?.get(id)
        // A formerly audible note may have ended or lost its sample. Newly
        // audible parts still enter at the score position like a normal start.
        if (!saved && (ended || (wasAudible && onset < fromBeat - 1e-9))) return
        const pitch = Math.round(69 + 12 * Math.log2(frequency / 440))
        if (pitch < 21 - 1e-6 || pitch > 108 + 1e-6) {
          throw new Error('피아노 음역(A0–C8)을 벗어난 음표가 있습니다.')
        }
        const offset = saved?.offsetSeconds ?? (onset < fromBeat ? beatDeltaToSeconds(timeline, onset, fromBeat, bpm) : 0)
        // Preserve recorded layers while following any newly selected mixer volume.
        const sampleVelocity = saved?.velocity ?? value
        const curve = velocityCurve ?? (sampleVelocity !== value ? [{ after: 0, velocity: value }] : undefined)
        const pedalOwner = pedalledParts.has(event.partId) ? { pedalPartId: event.partId } : {}
        result.push({ type: 'on', time, id, pitch, velocity: sampleVelocity, offset,
          ...(curve ? { velocityCurve: curve } : {}),
          ...(ended ? { keyReleased: true, ...pedalOwner } : {}) })
        // Restored manual holds have already released the key. Apply their
        // note-off after creating the voice, without changing same-tick ordering.
        if (!ended) result.push({ type: 'off', time: off, id, pitch, velocity: value, offset: 0, ...pedalOwner })
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

export function createLoopPianoCommands(timeline: PlaybackTimeline, fromBeat: number, endBeat: number,
  bpm: number, mixer: PianoMixer, continuation?: ReadonlyMap<string, PianoVoicePosition>,
  previousMixer?: PianoMixer): PianoCommand[] {
  const partIds=[...new Set(timeline.events.map(event=>event.partId))]
  const bounded:PlaybackTimeline={...timeline,totalBeats:endBeat,
    events:timeline.events.filter(event=>event.startBeat<endBeat-1e-9).map(event=>({
      ...event,
      ...(event.sampleHairpinVelocity && event.velocityEndBeat === undefined
        ? { velocityEndBeat: event.startBeat + event.durationBeats } : {}),
      durationBeats:Math.min(event.startBeat+event.durationBeats,endBeat)-event.startBeat
    })),
    pedalEvents:[...(timeline.pedalEvents??[]).filter(event=>event.startBeat<endBeat),...partIds.map(partId=>({id:'practice-loop-end-'+partId,partId,startBeat:endBeat,value:0}))]
  }
  return createPianoCommands(bounded, fromBeat, bpm, mixer, continuation, previousMixer)
}

export class PianoTransport {
  private timer?: ReturnType<typeof setInterval>
  private cursor = 0
  private commands: PianoCommand[] = []
  private origin = 0
  private loopQueue?:PracticeLoopQueue<PianoCommand>
  private loopClock?: PracticeLoopClock
  private mixer?: PianoMixer
  private scorePedalRelease?: (partId: string, time: number, cycle?: number) => number

  constructor(readonly sampler: PianoSampler,private readonly onError?:(error:unknown)=>void) {}

  start(timeline: PlaybackTimeline, fromBeat: number, bpm: number, mixer: PianoMixer, sustain = false,
    loop?: PracticeLoopRange, pausedSustain?: ReadonlyMap<string, PianoVoicePosition>) {
    return this.schedule(timeline, fromBeat, bpm, mixer, sustain, loop, sustain ? pausedSustain : undefined)
  }

  reschedule(timeline: PlaybackTimeline, fromBeat: number, bpm: number, mixer: PianoMixer,
    sustain: boolean, loop: PracticeLoopRange | undefined, at: number) {
    const voices = this.currentCycleVoices(this.sampler.captureSoundingVoices(at), at)
    return this.schedule(timeline, fromBeat, bpm, mixer, sustain, loop, voices, at, this.mixer)
  }

  private schedule(timeline: PlaybackTimeline, fromBeat: number, bpm: number, mixer: PianoMixer,
    sustain: boolean, loop?: PracticeLoopRange, voices?: ReadonlyMap<string, PianoVoicePosition>,
    at?: number, previousMixer?: PianoMixer) {
    const clock = loop ? createPracticeLoopClock(timeline, loop, fromBeat, bpm) : undefined
    const commands = clock ? [] : createPianoCommands(timeline, fromBeat, bpm, mixer, voices, previousMixer)
    this.stop(at === undefined ? undefined : PIANO_ATTACK_SECONDS)
    this.loopClock = clock
    this.mixer = mixer
    if (clock) {
      this.loopQueue = new PracticeLoopQueue(clock, (from, end, cycle) =>
        createLoopPianoCommands(timeline, from, end, bpm, mixer,
          cycle === 0 ? voices : undefined, cycle === 0 ? previousMixer : undefined))
    } else this.commands = commands
    const origin = this.origin = at ?? this.sampler.context.currentTime + 0.03
    if (timeline.pedalEvents?.length) {
      this.scorePedalRelease = (partId, time, cycle) => {
        const segment = cycle === undefined ? undefined : clock?.segment(cycle)
        const segmentOrigin = origin + (segment?.startSeconds ?? 0)
        const start = segment?.fromBeat ?? fromBeat
        const end = segment?.endBeat ?? timeline.totalBeats
        const beat = elapsedSecondsToBeat(timeline, start, time - segmentOrigin, bpm)
        const release = Math.min(end, pedalReleaseBeat(timeline, partId, beat))
        return Math.max(time, segmentOrigin + beatDeltaToSeconds(timeline, start, release, bpm))
      }
    }
    this.cursor = 0
    this.sampler.setSustain(sustain)
    this.pump(at)
    this.timer = setInterval(() => {
      try{this.pump()}catch(error){this.stop();if(this.onError)this.onError(error);else throw error}
    }, 20)
    return this.origin
  }

  captureManualSustain(): ReadonlyMap<string, PianoVoicePosition> {
    const now = this.sampler.context.currentTime
    return this.currentCycleVoices(this.sampler.captureManualSustain(now), now)
  }

  private currentCycleVoices(notes: ReadonlyMap<string, PianoVoicePosition>, now: number) {
    if (!this.loopClock) return notes
    const prefix = `loop:${this.loopClock.cycleAtElapsed(now - this.origin)}:`
    return new Map([...notes].filter(([id]) => id.startsWith(prefix)).map(([id, voice]) =>
      [id.slice(prefix.length), voice]))
  }

  private pump(now = this.sampler.context.currentTime) {
    if(this.loopQueue){
      for(const {command,at,cycle,end} of this.loopQueue.takeDue(now-this.origin)){
        const id=`loop:${cycle}:${command.id}`
        if(command.type==='on'){
          this.startNote(command, id, this.origin + at, cycle)
          this.sampler.limitNoteAt(id,this.origin+end)
        } else this.releaseNote(command, id, this.origin + at, cycle)
      }
      return
    }
    // Packaged 1000-note audit observed >400ms notation paints. 750ms protects
    // onset scheduling while stopAll can still cancel every future source.
    const horizon = now + 0.75
    while (this.cursor < this.commands.length && this.origin + this.commands[this.cursor].time <= horizon) {
      const command = this.commands[this.cursor++]
      const at = this.origin + command.time
      if (command.type === 'on') {
        this.startNote(command, command.id, at)
      } else this.releaseNote(command, command.id, at)
    }
    if (this.cursor === this.commands.length && this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  private releaseNote(command: PianoCommand, id: string, at: number, cycle?: number) {
    const resolve = this.scorePedalRelease
    const partId = command.pedalPartId
    if (partId && resolve) this.sampler.noteOff(id, at, time => resolve(partId, time, cycle))
    else this.sampler.noteOff(id, at)
  }

  private startNote(command: PianoCommand, id: string, at: number, cycle?: number) {
    this.sampler.noteOn(id, command.pitch, command.velocity, at, command.offset,
      ...(command.velocityCurve ? [command.velocityCurve] : []))
    if (command.keyReleased) this.releaseNote(command, id, at, cycle)
  }

  stop(fade?: number) {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    this.commands = []
    this.loopQueue=undefined
    this.loopClock = undefined
    this.mixer = undefined
    this.scorePedalRelease = undefined
    this.cursor = 0
    this.sampler.stopAll(fade)
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
