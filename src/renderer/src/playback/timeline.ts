import {
  TICKS_PER_QUARTER,
  durationToTicks,
  measureDurationTicks,
  pitchToMidi,
  resolveNotePitch,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Duration,
  type Note,
  type Score
} from '../../../score-core'

const DEFAULT_VELOCITY = 0.16
const DYNAMIC_VELOCITY = {
  p: 0.09,
  mp: 0.12,
  mf: DEFAULT_VELOCITY,
  f: 0.22
} as const
const HAIRPIN_DELTA = 0.08
const MIN_VELOCITY = 0.06
const MAX_VELOCITY = 0.24

export interface PlaybackEvent {
  eventId: string
  measureId: string
  startBeat: number
  durationBeats: number
  frequency?: number
  velocityStart: number
  velocityEnd: number
}

export interface PlaybackTimeline {
  events: PlaybackEvent[]
  totalBeats: number
}

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const events: PlaybackEvent[] = []
  let scoreBeat = 0
  let previousStartsTie = false

  for (const measure of measures) {
    const voice = measure.voices[0]

    for (const event of sortVoiceEvents(voice?.events ?? [])) {
      const durationBeats =
        voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER

      const playbackEvent = {
        eventId: event.id,
        measureId: measure.id,
        startBeat: scoreBeat + event.position.tick / TICKS_PER_QUARTER,
        durationBeats,
        frequency:
          event.type === 'note' && voice
            ? pitchToFrequency(resolveNotePitch(measure, voice, event))
            : undefined,
        velocityStart: resolveMeasureVelocity(score, measure.id),
        velocityEnd: resolveMeasureVelocity(score, measure.id)
      }
      const previous = events.at(-1)

      if (
        event.type === 'note' &&
        event.ties?.stop &&
        previousStartsTie &&
        previous &&
        previous?.frequency === playbackEvent.frequency &&
        previous.startBeat + previous.durationBeats === playbackEvent.startBeat
      ) {
        previous.durationBeats += playbackEvent.durationBeats
        previous.velocityEnd = playbackEvent.velocityEnd
      } else {
        events.push(playbackEvent)
      }

      previousStartsTie = event.type === 'note' && Boolean(event.ties?.start)
    }

    scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  return {
    events: applyHairpinVelocity(score, events),
    totalBeats: scoreBeat
  }
}

export function durationToBeats(duration: Duration): number {
  return durationToTicks(duration) / TICKS_PER_QUARTER
}

export function pitchToFrequency(pitch: Note['pitch']): number {
  const midi = pitchToMidi(pitch)

  return 440 * 2 ** ((midi - 69) / 12)
}

export function findPlaybackEvent(
  timeline: PlaybackTimeline,
  beat: number
): PlaybackEvent | undefined {
  return timeline.events.find(
    (event) =>
      beat >= event.startBeat &&
      beat < event.startBeat + event.durationBeats
  )
}

function resolveMeasureVelocity(score: Score, measureId: string): number {
  const dynamic = score.dynamics?.find((mark) => mark.measureId === measureId)

  return dynamic ? DYNAMIC_VELOCITY[dynamic.value] : DEFAULT_VELOCITY
}

function applyHairpinVelocity(
  score: Score,
  events: PlaybackEvent[]
): PlaybackEvent[] {
  const nextEvents = events.map((event) => ({ ...event }))

  for (const hairpin of score.hairpins ?? []) {
    const startEvent = nextEvents.find((event) => event.eventId === hairpin.startEventId)
    const endEvent = nextEvents.find((event) => event.eventId === hairpin.endEventId)

    if (!startEvent || !endEvent) {
      continue
    }

    const spanStart = startEvent.startBeat
    const spanEnd = endEvent.startBeat + endEvent.durationBeats
    const spanDuration = spanEnd - spanStart

    if (spanDuration <= 0) {
      continue
    }

    const baseVelocity = startEvent.velocityStart
    const targetVelocity =
      hairpin.type === 'crescendo'
        ? clampVelocity(baseVelocity + HAIRPIN_DELTA)
        : clampVelocity(baseVelocity - HAIRPIN_DELTA)

    nextEvents.forEach((event) => {
      const eventEnd = event.startBeat + event.durationBeats

      if (eventEnd <= spanStart || event.startBeat >= spanEnd) {
        return
      }

      event.velocityStart = interpolateVelocity(
        baseVelocity,
        targetVelocity,
        (Math.max(event.startBeat, spanStart) - spanStart) / spanDuration
      )
      event.velocityEnd = interpolateVelocity(
        baseVelocity,
        targetVelocity,
        (Math.min(eventEnd, spanEnd) - spanStart) / spanDuration
      )
    })
  }

  return nextEvents
}

function interpolateVelocity(start: number, end: number, ratio: number): number {
  return clampVelocity(start + (end - start) * Math.min(1, Math.max(0, ratio)))
}

function clampVelocity(value: number): number {
  return Math.min(MAX_VELOCITY, Math.max(MIN_VELOCITY, value))
}
