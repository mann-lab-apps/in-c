import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Score } from '../../../score-core'
import {
  beatDeltaToSeconds,
  createPlaybackTimeline,
  elapsedSecondsToBeat,
  findPlaybackEvent,
  tempoMarkingToQuarterBpm,
  type PlaybackTimeline,
  type PlaybackEvent
} from './timeline'

export type PlaybackStatus = 'stopped' | 'playing' | 'paused'

const MIN_TEMPO = 40
const MAX_TEMPO = 240
const DEFAULT_TEMPO = 120
const TREMOLO_BEAT_INTERVAL = {
  1: 0.5,
  2: 0.25,
  3: 0.125
} as const
const TRILL_BEAT_INTERVAL = 0.125

export function useScorePlayback(score: Score) {
  const timeline = useMemo(() => createPlaybackTimeline(score), [score])
  const [status, setStatus] = useState<PlaybackStatus>('stopped')
  const scoreTempo = normalizeTempo(
    score.tempo ? tempoMarkingToQuarterBpm(score.tempo) : DEFAULT_TEMPO
  )
  const [tempo, setTempoState] = useState(scoreTempo)
  const [positionBeat, setPositionBeat] = useState(0)
  const [activeEventId, setActiveEventId] = useState<string | undefined>()
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const sourcesRef = useRef<OscillatorNode[]>([])
  const frameRef = useRef<number | undefined>(undefined)
  const startContextTimeRef = useRef(0)
  const startBeatRef = useRef(0)
  const tempoRef = useRef(tempo)
  const timelineRef = useRef(timeline)
  const statusRef = useRef<PlaybackStatus>(status)

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
    statusRef.current = status
  }, [status])

  const stopSources = useCallback(() => {
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

  const scheduleAudio = useCallback(
    (
      context: AudioContext,
      timeline: PlaybackTimeline,
      fromBeat: number,
      bpm: number
    ) => {
      const now = context.currentTime + 0.03

      sourcesRef.current = timeline.events.flatMap((event: PlaybackEvent) => {
        if (
          event.frequency === undefined ||
          event.startBeat + event.durationBeats <= fromBeat
        ) {
          return []
        }

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
        const startVelocity = resolveEventVelocityAtBeat(event, eventStartBeat)
        const endVelocity = event.velocityEnd
        const sustainStart = Math.min(startTime + 0.015, endTime)
        const releaseStart = Math.max(sustainStart, endTime - 0.04)
        const frequencies = event.frequencies ?? [event.frequency]

        if (event.tremolo?.type === 'single') {
          return scheduleTremoloEvent(
            context,
            timeline,
            event,
            frequencies,
            fromBeat,
            bpm,
            now
          )
        }

        if (event.ornaments?.includes('trill') && event.trillFrequency) {
          return scheduleTrillEvent(
            context,
            timeline,
            event,
            event.frequency,
            event.trillFrequency,
            fromBeat,
            bpm,
            now
          )
        }

        return frequencies.map((frequency) =>
          scheduleTone(
            context,
            frequency,
            startTime,
            sustainStart,
            releaseStart,
            endTime,
            startVelocity / Math.sqrt(frequencies.length),
            endVelocity / Math.sqrt(frequencies.length)
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
        stopSources()
        setPositionBeat(0)
        setActiveEventId(undefined)
        setStatus('stopped')
        startBeatRef.current = 0
        frameRef.current = undefined
        return
      }

      setPositionBeat(beat)
      setActiveEventId(findPlaybackEvent(currentTimeline, beat)?.eventId)
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

      const context =
        audioContextRef.current ?? new AudioContextClass({ latencyHint: 'interactive' })
      audioContextRef.current = context
      await context.resume()
      stopSources()

      startBeatRef.current =
        beat >= timelineRef.current.totalBeats ? 0 : Math.max(0, beat)
      startContextTimeRef.current = context.currentTime + 0.03
      scheduleAudio(
        context,
        timelineRef.current,
        startBeatRef.current,
        bpm
      )
      setStatus('playing')
      statusRef.current = 'playing'
      setPositionBeat(startBeatRef.current)
      setActiveEventId(
        findPlaybackEvent(timelineRef.current, startBeatRef.current)?.eventId
      )
      startTicker()
    },
    [scheduleAudio, startTicker, stopSources]
  )

  const play = useCallback(() => {
    void startFromBeat(startBeatRef.current, tempoRef.current)
  }, [startFromBeat])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') {
      return
    }

    const beat = Math.min(readCurrentBeat(), timelineRef.current.totalBeats)
    startBeatRef.current = beat
    stopSources()
    cancelFrame()
    setPositionBeat(beat)
    setActiveEventId(findPlaybackEvent(timelineRef.current, beat)?.eventId)
    setStatus('paused')
    statusRef.current = 'paused'
  }, [cancelFrame, readCurrentBeat, stopSources])

  const stop = useCallback(() => {
    stopSources()
    cancelFrame()
    startBeatRef.current = 0
    setPositionBeat(0)
    setActiveEventId(undefined)
    setStatus('stopped')
    statusRef.current = 'stopped'
  }, [cancelFrame, stopSources])

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
    stop()
  }, [score, stop])

  useEffect(
    () => () => {
      stopSources()
      cancelFrame()
      void audioContextRef.current?.close()
    },
    [cancelFrame, stopSources]
  )

  return {
    status,
    tempo,
    setTempo,
    positionBeat,
    totalBeats: timeline.totalBeats,
    activeEventId,
    play,
    pause,
    stop
  }
}

function normalizeTempo(value: number): number {
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(value)))
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

function scheduleTremoloEvent(
  context: AudioContext,
  timeline: PlaybackTimeline,
  event: PlaybackEvent,
  frequencies: number[],
  fromBeat: number,
  bpm: number,
  now: number
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
      resolveEventVelocityAtBeat(event, pulseStartBeat) /
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
  now: number
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
    const velocity = resolveEventVelocityAtBeat(event, pulseStartBeat)
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
