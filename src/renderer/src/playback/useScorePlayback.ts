import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Score } from '../../../score-core'
import { applyExpressionProfile, createScoreRequest } from './expression-profile'
import { applyVoicingProfile, createVoicingRequest, type AnyExpressionProfile } from './voicing-profile'
import { PianoSampler } from './piano-sampler'
import { PianoTransport } from './piano-transport'
import { collectPianoPitches } from './piano-cache-plan'
import {
  beatDeltaToSeconds,
  createPlaybackTimeline,
  elapsedSecondsToBeat,
  findPlaybackEvent,
  findPlaybackStartBeat,
  tempoMarkingToQuarterBpm,
  type PlaybackTimeline,
  type PlaybackEvent
} from './timeline'

export type PlaybackStatus = 'stopped' | 'playing' | 'paused'
export interface PlaybackPartMixer {
  muted: boolean
  solo: boolean
  volume: number
}

export type PlaybackPartMixerMap = Record<string, PlaybackPartMixer>

export interface PlaybackScheduledEvent {
  endVelocity: number
  event: PlaybackEvent
  frequencies: number[]
  partGain: number
  startVelocity: number
}

const MIN_TEMPO = 40
const MAX_TEMPO = 240
const DEFAULT_TEMPO = 120
const EMPTY_PART_MIXER: PlaybackPartMixerMap = {}
const TREMOLO_BEAT_INTERVAL = {
  1: 0.5,
  2: 0.25,
  3: 0.125
} as const
const TRILL_BEAT_INTERVAL = 0.125

export function useScorePlayback(
  score: Score,
  partMixer: PlaybackPartMixerMap = EMPTY_PART_MIXER,
  expressionProfile?: AnyExpressionProfile,
  pianoTimeline?: PlaybackTimeline
) {
  const timeline = useMemo(() => {
    const basic = pianoTimeline ?? createPlaybackTimeline(score)
    if (!expressionProfile) return basic
    try {
      return expressionProfile.version === 2
        ? applyVoicingProfile(basic, createVoicingRequest(score), expressionProfile)
        : applyExpressionProfile(basic, createScoreRequest(score), expressionProfile)
    }
    catch { return basic }
  }, [score, expressionProfile, pianoTimeline])
  const [status, setStatus] = useState<PlaybackStatus>('stopped')
  // The authoring range applies to the marked beat, not its quarter-note rate.
  const scoreTempo = score.tempo
    ? tempoMarkingToQuarterBpm(score.tempo)
    : DEFAULT_TEMPO
  const [tempo, setTempoState] = useState(scoreTempo)
  const [positionBeat, setPositionBeat] = useState(0)
  const [activeEvent, setActiveEvent] = useState<PlaybackEvent | undefined>()
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const detachAudioObserverRef = useRef<(() => void) | undefined>(undefined)
  const pianoRef = useRef<PianoSampler | undefined>(undefined)
  const transportRef = useRef<PianoTransport | undefined>(undefined)
  const generationRef = useRef(0)
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [sustain, setSustainState] = useState(false)
  const sustainRef = useRef(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [previewing, setPreviewing] = useState(false)
  const sourcesRef = useRef<OscillatorNode[]>([])
  const frameRef = useRef<number | undefined>(undefined)
  const startContextTimeRef = useRef(0)
  const startBeatRef = useRef(0)
  const tempoRef = useRef(tempo)
  const timelineRef = useRef(timeline)
  const statusRef = useRef<PlaybackStatus>(status)
  const partMixerRef = useRef(partMixer)

  useEffect(() => {
    tempoRef.current = tempo
  }, [tempo])

  useEffect(() => {
    tempoRef.current = scoreTempo
    setTempoState(scoreTempo)
  }, [scoreTempo])

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  useEffect(() => {
    partMixerRef.current = partMixer
  }, [partMixer])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const stopSources = useCallback(() => {
    generationRef.current += 1
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = undefined
    transportRef.current?.stop()
    pianoRef.current?.stopAll()
    sourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch {
        // The source may already have completed.
      }
    })
    sourcesRef.current = []
  }, [])

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== undefined) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = undefined
    }
  }, [])

  const readCurrentBeat = useCallback(() => {
    const context = audioContextRef.current

    if (!context || statusRef.current !== 'playing') {
      return startBeatRef.current
    }

    const elapsedSeconds = context.currentTime - startContextTimeRef.current
    return Math.max(
      startBeatRef.current,
      elapsedSecondsToBeat(
        timelineRef.current,
        startBeatRef.current,
        elapsedSeconds,
        tempoRef.current
      )
    )
  }, [])

  const acquireAudioContext = useCallback((AudioContextClass: typeof AudioContext) => {
    if (audioContextRef.current?.state === 'closed') {
      detachAudioObserverRef.current?.()
      pianoRef.current?.dispose()
      audioContextRef.current = undefined
      pianoRef.current = undefined
      transportRef.current = undefined
    }
    if (audioContextRef.current) return audioContextRef.current
    const context = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 48000 })
    audioContextRef.current = context
    const onStateChange = () => {
      if (audioContextRef.current !== context) return
      const state = String(context.state)
      if (state === 'running') return
      const wasPlaying = statusRef.current === 'playing'
      const wasPaused = statusRef.current === 'paused'
      if (state !== 'closed' && (!wasPlaying && previewTimer.current === undefined)) return
      const beat = Math.min(readCurrentBeat(), timelineRef.current.totalBeats)
      stopSources()
      cancelFrame()
      startBeatRef.current = beat
      statusRef.current = wasPlaying || wasPaused ? 'paused' : 'stopped'
      setStatus(statusRef.current)
      setPositionBeat(beat)
      setActiveEvent(statusRef.current === 'paused'
        ? findPlaybackEvent(timelineRef.current, beat) : undefined)
      setPreviewing(false)
      setAudioState('error')
      setAudioProgress(0)
      setAudioError(state === 'closed'
        ? '오디오 장치 연결이 종료되었습니다.' : '오디오 장치가 중단되어 일시정지했습니다.')
      if (state === 'closed') {
        detachAudioObserverRef.current?.()
        detachAudioObserverRef.current = undefined
        pianoRef.current?.dispose()
        pianoRef.current = undefined
        transportRef.current = undefined
        audioContextRef.current = undefined
      }
    }
    context.addEventListener?.('statechange', onStateChange)
    detachAudioObserverRef.current = () => context.removeEventListener?.('statechange', onStateChange)
    return context
  }, [cancelFrame, readCurrentBeat, stopSources])

  const scheduleAudio = useCallback(
    (
      context: AudioContext,
      timeline: PlaybackTimeline,
      fromBeat: number,
      bpm: number
    ) => {
      const now = context.currentTime + 0.03

      sourcesRef.current = resolvePlaybackScheduledEvents(
        timeline,
        fromBeat,
        partMixerRef.current
      ).flatMap(({ endVelocity, event, frequencies, partGain, startVelocity }) => {
        const scheduleWindow = resolvePlaybackEventScheduleWindow(
          timeline,
          event,
          fromBeat,
          bpm,
          now
        )

        if (event.tremolo?.type === 'single') {
          return scheduleTremoloEvent(
            context,
            timeline,
            event,
            frequencies,
            fromBeat,
            bpm,
            now,
            partGain
          )
        }

        if (event.ornaments?.includes('trill') && event.trillFrequency) {
          return scheduleTrillEvent(
            context,
            timeline,
            event,
            event.frequency!,
            event.trillFrequency,
            fromBeat,
            bpm,
            now,
            partGain
          )
        }

        return frequencies.map((frequency) =>
          scheduleTone(
            context,
            frequency,
            scheduleWindow.startTime,
            scheduleWindow.sustainStart,
            scheduleWindow.releaseStart,
            scheduleWindow.endTime,
            startVelocity * partGain,
            endVelocity * partGain
          )
        )
      })
    },
    []
  )

  const startTicker = useCallback(() => {
    const tick = () => {
      const beat = readCurrentBeat()
      const currentTimeline = timelineRef.current

      if (beat >= currentTimeline.totalBeats) {
        transportRef.current?.finish()
        setPositionBeat(0)
        setActiveEvent(undefined)
        setStatus('stopped')
        startBeatRef.current = 0
        frameRef.current = undefined
        return
      }

      setPositionBeat(beat)
      setActiveEvent(findPlaybackEvent(currentTimeline, beat))
      frameRef.current = window.requestAnimationFrame(tick)
    }

    cancelFrame()
    frameRef.current = window.requestAnimationFrame(tick)
  }, [cancelFrame, readCurrentBeat, stopSources])

  const startFromBeat = useCallback(
    async (beat: number, bpm: number) => {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextClass || timelineRef.current.events.length === 0) {
        return
      }

      stopSources()
      const generation = generationRef.current
      let context: AudioContext, piano: PianoSampler
      setPreviewing(false)
      setAudioError('')
      try {
        context = acquireAudioContext(AudioContextClass)
        piano = pianoRef.current ?? new PianoSampler(context)
        pianoRef.current = piano
        const pitches = collectPianoPitches(timelineRef.current)
        if (!piano.hasPitches(pitches)) setAudioState('loading')
        await context.resume()
        await piano.preparePitches(pitches, fraction => {
          if (generation === generationRef.current) setAudioProgress(fraction)
        })
        if (context.state && context.state !== 'running') {
          throw new Error('오디오 장치를 다시 시작하지 못했습니다.')
        }
      } catch (error) {
        if (generation === generationRef.current) {
          stopSources()
          cancelFrame()
          setStatus('stopped')
          statusRef.current = 'stopped'
          setPositionBeat(startBeatRef.current)
          setActiveEvent(undefined)
          setAudioState('error')
          setAudioError(error instanceof Error ? error.message : '피아노 음원을 준비하지 못했습니다.')
        }
        return
      }
      if (generation !== generationRef.current) return
      setAudioState('ready')

      startBeatRef.current =
        beat >= timelineRef.current.totalBeats ? 0 : Math.max(0, beat)
      const transport = transportRef.current ?? new PianoTransport(piano)
      transportRef.current = transport
      try {
        startContextTimeRef.current = transport.start(
          timelineRef.current, startBeatRef.current, bpm, partMixerRef.current, sustainRef.current)
      } catch (error) {
        stopSources()
        cancelFrame()
        setStatus('stopped')
        statusRef.current = 'stopped'
        setPositionBeat(startBeatRef.current)
        setActiveEvent(undefined)
        setAudioState('error')
        setAudioError(error instanceof Error ? error.message : '피아노 재생을 준비하지 못했습니다.')
        return
      }
      setStatus('playing')
      statusRef.current = 'playing'
      setPositionBeat(startBeatRef.current)
      setActiveEvent(findPlaybackEvent(timelineRef.current, startBeatRef.current))
      startTicker()
    },
    [acquireAudioContext, cancelFrame, startTicker, stopSources]
  )

  const play = useCallback(() => {
    void startFromBeat(startBeatRef.current, tempoRef.current)
  }, [startFromBeat])

  const previewNote = useCallback(async (pitch = 60, velocity = 84) => {
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) {
      setAudioState('error')
      setAudioError('이 환경에서는 피아노 소리를 재생할 수 없습니다.')
      return
    }
    stopSources()
    const generation = generationRef.current
    setAudioError('')
    try {
      const context = acquireAudioContext(AudioContextClass)
      const piano = pianoRef.current ?? new PianoSampler(context)
      pianoRef.current = piano
      if (!piano.hasPitches([pitch])) setAudioState('loading')
      await context.resume()
      await piano.preparePitches([pitch], fraction => {
        if (generation === generationRef.current) setAudioProgress(fraction)
      })
      if (generation !== generationRef.current) return
      if (context.state && context.state !== 'running') {
        throw new Error('오디오 장치를 다시 시작하지 못했습니다.')
      }
      setAudioState('ready')
      setPreviewing(true)
      const at = context.currentTime + .03, id = `preview-${generation}`
      piano.noteOn(id, pitch, velocity, at)
      piano.noteOff(id, at + .45)
      previewTimer.current = setTimeout(() => {
        if (generation === generationRef.current) {
          previewTimer.current = undefined
          setPreviewing(false)
        }
      }, 750)
    } catch (error) {
      if (generation !== generationRef.current) return
      setAudioState('error')
      setAudioError(error instanceof Error ? error.message : '피아노 소리를 준비하지 못했습니다.')
    }
  }, [acquireAudioContext, stopSources])

  const playFromEvent = useCallback((eventId:string,address?:Partial<Pick<PlaybackEvent,'partId'|'staffId'|'measureId'|'voiceId'>>) => {
    const beat=findPlaybackStartBeat(timelineRef.current,eventId,address)
    void startFromBeat(beat??startBeatRef.current,tempoRef.current)
  },[startFromBeat])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') {
      return
    }

    const beat = Math.min(readCurrentBeat(), timelineRef.current.totalBeats)
    startBeatRef.current = beat
    stopSources()
    cancelFrame()
    setPositionBeat(beat)
    setActiveEvent(findPlaybackEvent(timelineRef.current, beat))
    setStatus('paused')
    statusRef.current = 'paused'
  }, [cancelFrame, readCurrentBeat, stopSources])

  const stop = useCallback(() => {
    stopSources()
    setPreviewing(false)
    cancelFrame()
    startBeatRef.current = 0
    setPositionBeat(0)
    setActiveEvent(undefined)
    setStatus('stopped')
    statusRef.current = 'stopped'
    setAudioState(pianoRef.current?.ready ? 'ready' : 'idle')
    setAudioError('')
    setAudioProgress(0)
  }, [cancelFrame, stopSources])

  const jumpToStart = useCallback(() => {
    const wasPlaying = statusRef.current === 'playing'

    if (!wasPlaying) {
      stop()
      return
    }

    stopSources()
    cancelFrame()
    startBeatRef.current = 0
    setPositionBeat(0)
    setActiveEvent(undefined)

    void startFromBeat(0, tempoRef.current)
  }, [cancelFrame, startFromBeat, stop, stopSources])

  const setTempo = useCallback(
    (nextTempo: number) => {
      const normalizedTempo = Math.min(
        MAX_TEMPO,
        Math.max(MIN_TEMPO, Math.round(nextTempo))
      )
      const currentBeat = readCurrentBeat()
      const wasPlaying = statusRef.current === 'playing'

      tempoRef.current = normalizedTempo
      setTempoState(normalizedTempo)

      if (wasPlaying) {
        stopSources()
        cancelFrame()
        startBeatRef.current = currentBeat
        void startFromBeat(currentBeat, normalizedTempo)
      }
    },
    [cancelFrame, readCurrentBeat, startFromBeat, stopSources]
  )

  useEffect(() => {
    if (statusRef.current !== 'playing') {
      return
    }

    const currentBeat = readCurrentBeat()

    stopSources()
    cancelFrame()
    startBeatRef.current = currentBeat
    void startFromBeat(currentBeat, tempoRef.current)
  }, [cancelFrame, partMixer, readCurrentBeat, startFromBeat, stopSources])

  useEffect(() => {
    stop()
  }, [score, expressionProfile, pianoTimeline, stop])

  useEffect(
    () => () => {
      stopSources()
      cancelFrame()
      detachAudioObserverRef.current?.()
      detachAudioObserverRef.current = undefined
      pianoRef.current?.dispose()
      void audioContextRef.current?.close()
    },
    [cancelFrame, stopSources]
  )

  // Cursor projection only: audio continues to use the complete ensemble timeline.
  const getActiveEventForPart = useCallback((partId: string) => activeEvent
    ? findPlaybackEvent(timeline, positionBeat, partId) : undefined,
  [activeEvent, timeline, positionBeat])

  // Mixer activity follows each part's note interval, not the single score cursor.
  const isPartPlaying = useCallback((partId: string) => status === 'playing'
    && isPlaybackPartActive(timeline, positionBeat, partId, partMixer),
  [status, timeline, positionBeat, partMixer])

  return {
    status,
    tempo,
    setTempo,
    positionBeat,
    totalBeats: timeline.totalBeats,
    activeEvent,
    activeEventId: activeEvent?.eventId,
    getActiveEventForPart,
    isPartPlaying,
    play,
    playFromEvent,
    pause,
    stop,
    jumpToStart,
    audioState, audioProgress, audioError, sustain, previewing, previewNote,
    setSustain: (down: boolean) => {
      sustainRef.current = down
      setSustainState(down)
      pianoRef.current?.setSustain(down)
    }
  }
}

function resolveEventVelocityAtBeat(event: PlaybackEvent, beat: number): number {
  if (event.durationBeats <= 0) {
    return event.velocityStart
  }

  const ratio = Math.min(
    1,
    Math.max(0, (beat - event.startBeat) / event.durationBeats)
  )

  return event.velocityStart + (event.velocityEnd - event.velocityStart) * ratio
}

export function resolvePlaybackEventScheduleWindow(
  timeline: PlaybackTimeline,
  event: PlaybackEvent,
  fromBeat: number,
  bpm: number,
  now: number
): {
  startTime: number
  sustainStart: number
  releaseStart: number
  endTime: number
} {
  const eventStartBeat = Math.max(event.startBeat, fromBeat)
  const startTime =
    now + beatDeltaToSeconds(timeline, fromBeat, eventStartBeat, bpm)
  const endTime =
    now +
    beatDeltaToSeconds(
      timeline,
      fromBeat,
      event.startBeat + event.durationBeats,
      bpm
    )
  const sustainStart = Math.min(startTime + 0.015, endTime)
  const releaseStart = Math.max(sustainStart, endTime - 0.04)

  return {
    startTime,
    sustainStart,
    releaseStart,
    endTime
  }
}

function scheduleTremoloEvent(
  context: AudioContext,
  timeline: PlaybackTimeline,
  event: PlaybackEvent,
  frequencies: number[],
  fromBeat: number,
  bpm: number,
  now: number,
  partGain: number
): OscillatorNode[] {
  const eventEndBeat = event.startBeat + event.durationBeats
  const pulseBeats = createTremoloPulseBeats(
    event.startBeat,
    eventEndBeat,
    fromBeat,
    event.tremolo?.marks ?? 1
  )

  return pulseBeats.flatMap((pulseStartBeat) => {
    const intervalBeats = TREMOLO_BEAT_INTERVAL[event.tremolo?.marks ?? 1]
    const pulseEndBeat = Math.min(
      pulseStartBeat + intervalBeats * 0.82,
      eventEndBeat
    )

    if (pulseStartBeat >= eventEndBeat || pulseEndBeat <= pulseStartBeat) {
      return []
    }

    const pulseStartTime =
      now + beatDeltaToSeconds(timeline, fromBeat, pulseStartBeat, bpm)
    const pulseEndTime =
      now + beatDeltaToSeconds(timeline, fromBeat, pulseEndBeat, bpm)
    const pulseSustainStart = Math.min(
      pulseStartTime + 0.008,
      pulseEndTime
    )
    const pulseReleaseStart = Math.max(
      pulseSustainStart,
      pulseEndTime - 0.012
    )
    const velocity =
      (resolveEventVelocityAtBeat(event, pulseStartBeat) * partGain) /
      Math.sqrt(frequencies.length)

    return frequencies.map((frequency) =>
      scheduleTone(
        context,
        frequency,
        pulseStartTime,
        pulseSustainStart,
        pulseReleaseStart,
        pulseEndTime,
        velocity,
        velocity
      )
    )
  })
}

export function createTremoloPulseBeats(
  startBeat: number,
  endBeat: number,
  fromBeat: number,
  marks: 1 | 2 | 3
): number[] {
  const firstBeat = Math.max(startBeat, fromBeat)
  const intervalBeats = TREMOLO_BEAT_INTERVAL[marks]
  const pulseCount = Math.max(
    1,
    Math.ceil((endBeat - firstBeat) / intervalBeats)
  )

  return Array.from({ length: pulseCount }, (_, index) => firstBeat + index * intervalBeats)
    .filter((beat) => beat < endBeat)
}

function scheduleTrillEvent(
  context: AudioContext,
  timeline: PlaybackTimeline,
  event: PlaybackEvent,
  baseFrequency: number,
  trillFrequency: number,
  fromBeat: number,
  bpm: number,
  now: number,
  partGain: number
): OscillatorNode[] {
  const eventEndBeat = event.startBeat + event.durationBeats
  const pulseBeats = createTrillPulseBeats(event.startBeat, eventEndBeat, fromBeat)

  return pulseBeats.flatMap((pulseStartBeat) => {
    const pulseEndBeat = Math.min(
      pulseStartBeat + TRILL_BEAT_INTERVAL * 0.88,
      eventEndBeat
    )

    if (pulseStartBeat >= eventEndBeat || pulseEndBeat <= pulseStartBeat) {
      return []
    }

    const pulseStartTime =
      now + beatDeltaToSeconds(timeline, fromBeat, pulseStartBeat, bpm)
    const pulseEndTime =
      now + beatDeltaToSeconds(timeline, fromBeat, pulseEndBeat, bpm)
    const pulseSustainStart = Math.min(pulseStartTime + 0.006, pulseEndTime)
    const pulseReleaseStart = Math.max(
      pulseSustainStart,
      pulseEndTime - 0.01
    )
    const velocity = resolveEventVelocityAtBeat(event, pulseStartBeat) * partGain
    const pulseIndex = Math.floor(
      (pulseStartBeat - event.startBeat) / TRILL_BEAT_INTERVAL
    )
    const frequency = pulseIndex % 2 === 0 ? baseFrequency : trillFrequency

    return [
      scheduleTone(
        context,
        frequency,
        pulseStartTime,
        pulseSustainStart,
        pulseReleaseStart,
        pulseEndTime,
        velocity,
        velocity
      )
    ]
  })
}

export function createTrillPulseBeats(
  startBeat: number,
  endBeat: number,
  fromBeat: number
): number[] {
  const firstBeat = Math.max(startBeat, fromBeat)
  const pulseCount = Math.max(
    1,
    Math.ceil((endBeat - firstBeat) / TRILL_BEAT_INTERVAL)
  )

  return Array.from(
    { length: pulseCount },
    (_, index) => firstBeat + index * TRILL_BEAT_INTERVAL
  ).filter((beat) => beat < endBeat)
}

export function resolvePartMixerGain(
  partId: string,
  partMixer: PlaybackPartMixerMap
): number {
  const partSettings = partMixer[partId]

  if (partSettings?.muted) {
    return 0
  }

  if (
    Object.entries(partMixer).some(
      ([mixerPartId, settings]) => mixerPartId !== partId && settings.solo
    ) &&
    !partSettings?.solo
  ) {
    return 0
  }

  return clampVolume(partSettings?.volume ?? 1)
}

export function isPlaybackPartActive(
  timeline: PlaybackTimeline,
  beat: number,
  partId: string,
  partMixer: PlaybackPartMixerMap
): boolean {
  if (resolvePartMixerGain(partId, partMixer) <= 0) return false
  return timeline.events.some(event => event.partId === partId
    && beat >= event.startBeat && beat < event.startBeat + event.durationBeats
    && (event.frequencies?.length ?? (event.frequency ? 1 : 0)) > 0)
}

export function resolvePlaybackScheduledEvents(
  timeline: PlaybackTimeline,
  fromBeat: number,
  partMixer: PlaybackPartMixerMap
): PlaybackScheduledEvent[] {
  return timeline.events.flatMap((event) => {
    const partGain = resolvePartMixerGain(event.partId, partMixer)

    if (
      partGain <= 0 ||
      event.frequency === undefined ||
      event.startBeat + event.durationBeats <= fromBeat
    ) {
      return []
    }

    const eventStartBeat = Math.max(event.startBeat, fromBeat)
    const frequencies = event.frequencies ?? [event.frequency]
    const frequencyCountScale = Math.sqrt(frequencies.length)

    return [
      {
        endVelocity: event.velocityEnd / frequencyCountScale,
        event,
        frequencies,
        partGain,
        startVelocity:
          resolveEventVelocityAtBeat(event, eventStartBeat) / frequencyCountScale
      }
    ]
  })
}

function clampVolume(volume: number): number {
  return Math.min(1.5, Math.max(0, volume))
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  startTime: number,
  sustainStart: number,
  releaseStart: number,
  endTime: number,
  startVelocity: number,
  endVelocity: number
): OscillatorNode {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(startVelocity, sustainStart)
  gain.gain.linearRampToValueAtTime(endVelocity, releaseStart)
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(endTime + 0.01)
  return oscillator
}
