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
  type Score,
  type TempoMarking
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
const FERMATA_DURATION_MULTIPLIER = 1.5

export interface PlaybackEvent {
  eventId: string
  partId: string
  staffId: string
  voiceId: string
  measureId: string
  startBeat: number
  durationBeats: number
  frequency?: number
  frequencies?: number[]
  tremolo?: Note['tremolo']
  velocityStart: number
  velocityEnd: number
}

export interface PlaybackTempoEvent {
  id: string
  measureId: string
  startBeat: number
  bpm: number
  quarterBpm: number
  text?: string
}

export interface PlaybackTimeline {
  events: PlaybackEvent[]
  tempoEvents: PlaybackTempoEvent[]
  totalBeats: number
}

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  const events: PlaybackEvent[] = []
  let totalBeats = 0

  for (const part of score.parts) {
    for (const staff of part.staves) {
      const staffTimeline = createStaffPlaybackEvents(
        score,
        part.id,
        staff.id,
        staff.measures
      )

      events.push(...staffTimeline.events)
      totalBeats = Math.max(totalBeats, staffTimeline.totalBeats)
    }
  }

  return {
    events: applyHairpinVelocity(
      score,
      events.sort((left, right) => left.startBeat - right.startBeat)
    ),
    tempoEvents: createPlaybackTempoEvents(score),
    totalBeats
  }
}

function createStaffPlaybackEvents(
  score: Score,
  partId: string,
  staffId: string,
  measures: NonNullable<Score['parts'][number]['staves'][number]['measures']>
): PlaybackTimeline {
  const events: PlaybackEvent[] = []
  let scoreBeat = 0
  let expressionBeatOffset = 0
  let previousStartsTie = false

  for (const measure of measures) {
    for (const voice of measure.voices) {
      for (const event of sortVoiceEvents(voice.events)) {
        const notatedDurationBeats =
          voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER
        const durationBeats =
          notatedDurationBeats *
          (event.fermata ? FERMATA_DURATION_MULTIPLIER : 1)
        const frequencies =
          event.type === 'note'
            ? eventFrequencies(measure, voice, event)
            : undefined
        const playbackEvent = {
          eventId: event.id,
          partId,
          staffId,
          voiceId: voice.id,
          measureId: measure.id,
          startBeat:
            scoreBeat +
            event.position.tick / TICKS_PER_QUARTER +
            expressionBeatOffset,
          durationBeats,
          frequency:
            frequencies && frequencies.length > 0 ? frequencies[0] : undefined,
          frequencies,
          tremolo: event.type === 'note' ? event.tremolo : undefined,
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
        expressionBeatOffset += durationBeats - notatedDurationBeats
      }
    }

    scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  const repeatedTimeline = applyRepeatPlayback(events, measures, scoreBeat)

  return {
    events: repeatedTimeline.events,
    tempoEvents: [],
    totalBeats: repeatedTimeline.totalBeats + expressionBeatOffset
  }
}

function applyRepeatPlayback(
  events: PlaybackEvent[],
  measures: NonNullable<Score['parts'][number]['staves'][number]['measures']>,
  totalBeats: number
): { events: PlaybackEvent[]; totalBeats: number } {
  let repeatStartMeasureId: string | undefined = measures[0]?.id
  const nextEvents = [...events]
  let extraBeats = 0

  for (const measure of measures) {
    if (measure.repeat?.start) {
      repeatStartMeasureId = measure.id
    }

    if (!measure.repeat?.end || !repeatStartMeasureId) {
      continue
    }

    const startBeat = measureStartBeat(measures, repeatStartMeasureId)
    const endBeat =
      measureStartBeat(measures, measure.id) +
      measureDurationTicks(measure) / TICKS_PER_QUARTER
    const repeatCount = Math.max(2, measure.repeat.times ?? 2)
    const sectionDuration = endBeat - startBeat
    const sectionEvents = events.filter((event) =>
      event.startBeat >= startBeat && event.startBeat < endBeat
    )

    for (let repeatIndex = 1; repeatIndex < repeatCount; repeatIndex += 1) {
      nextEvents.push(
        ...sectionEvents.map((event) => ({
          ...event,
          startBeat: event.startBeat + sectionDuration * repeatIndex
        }))
      )
    }

    extraBeats += sectionDuration * (repeatCount - 1)
    repeatStartMeasureId = undefined
  }

  return {
    events: nextEvents.sort((left, right) => left.startBeat - right.startBeat),
    totalBeats: totalBeats + extraBeats
  }
}

function measureStartBeat(
  measures: NonNullable<Score['parts'][number]['staves'][number]['measures']>,
  measureId: string
): number {
  let beat = 0

  for (const measure of measures) {
    if (measure.id === measureId) {
      return beat
    }

    beat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  return 0
}

function eventFrequencies(
  measure: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number],
  voice: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number]['voices'][number],
  event: Note
): number[] {
  const pitches = event.pitches?.length
    ? event.pitches
    : [resolveNotePitch(measure, voice, event)]

  return pitches.map((pitch) => pitchToFrequency(pitch))
}

function createPlaybackTempoEvents(score: Score): PlaybackTempoEvent[] {
  const measureStarts = createMeasureStartBeatMap(score)
  const tempoEvents: PlaybackTempoEvent[] = []

  for (const event of score.tempoEvents ?? []) {
    const measureStart = measureStarts.get(event.measureId)

    if (measureStart === undefined) {
      continue
    }

    tempoEvents.push({
      id: event.id,
      measureId: event.measureId,
      startBeat: measureStart + event.tick / TICKS_PER_QUARTER,
      bpm: event.bpm,
      quarterBpm: tempoMarkingToQuarterBpm(event),
      text: event.text
    })
  }

  return tempoEvents.sort((left, right) => left.startBeat - right.startBeat)
}

function createMeasureStartBeatMap(score: Score): Map<string, number> {
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const measureStarts = new Map<string, number>()
  let scoreBeat = 0

  for (const measure of measures) {
    measureStarts.set(measure.id, scoreBeat)
    scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  return measureStarts
}

export function durationToBeats(duration: Duration): number {
  return durationToTicks(duration) / TICKS_PER_QUARTER
}

export function tempoMarkingToQuarterBpm(tempo: TempoMarking): number {
  return tempo.bpm * tempoBeatUnitToQuarterBeats(tempo)
}

export function resolveQuarterBpmAtBeat(
  timeline: Pick<PlaybackTimeline, 'tempoEvents'>,
  beat: number,
  fallbackBpm: number
): number {
  let quarterBpm = fallbackBpm

  for (const event of timeline.tempoEvents) {
    if (event.startBeat > beat) {
      break
    }

    quarterBpm = event.quarterBpm
  }

  return quarterBpm
}

export function beatDeltaToSeconds(
  timeline: Pick<PlaybackTimeline, 'tempoEvents'>,
  fromBeat: number,
  toBeat: number,
  fallbackBpm: number
): number {
  if (toBeat <= fromBeat) {
    return 0
  }

  let seconds = 0
  let cursorBeat = fromBeat
  let quarterBpm = resolveQuarterBpmAtBeat(timeline, fromBeat, fallbackBpm)

  for (const event of timeline.tempoEvents) {
    if (event.startBeat <= fromBeat) {
      continue
    }

    if (event.startBeat >= toBeat) {
      break
    }

    seconds += ((event.startBeat - cursorBeat) * 60) / quarterBpm
    cursorBeat = event.startBeat
    quarterBpm = event.quarterBpm
  }

  return seconds + ((toBeat - cursorBeat) * 60) / quarterBpm
}

export function elapsedSecondsToBeat(
  timeline: Pick<PlaybackTimeline, 'tempoEvents' | 'totalBeats'>,
  fromBeat: number,
  elapsedSeconds: number,
  fallbackBpm: number
): number {
  if (elapsedSeconds <= 0) {
    return fromBeat
  }

  let remainingSeconds = elapsedSeconds
  let cursorBeat = fromBeat
  let quarterBpm = resolveQuarterBpmAtBeat(timeline, fromBeat, fallbackBpm)

  for (const event of timeline.tempoEvents) {
    if (event.startBeat <= fromBeat) {
      continue
    }

    const secondsUntilEvent =
      ((event.startBeat - cursorBeat) * 60) / quarterBpm

    if (remainingSeconds < secondsUntilEvent) {
      return cursorBeat + (remainingSeconds * quarterBpm) / 60
    }

    remainingSeconds -= secondsUntilEvent
    cursorBeat = event.startBeat
    quarterBpm = event.quarterBpm
  }

  return Math.min(
    timeline.totalBeats,
    cursorBeat + (remainingSeconds * quarterBpm) / 60
  )
}

export function tempoBeatUnitToQuarterBeats(tempo: TempoMarking): number {
  const base =
    tempo.beatUnit === 'whole'
      ? 4
      : tempo.beatUnit === 'half'
        ? 2
        : tempo.beatUnit === 'eighth'
          ? 0.5
          : tempo.beatUnit === '16th'
            ? 0.25
            : tempo.beatUnit === '32nd'
              ? 0.125
              : tempo.beatUnit === '64th'
                ? 0.0625
                : 1

  return base * dottedMultiplier(tempo.dots ?? 0)
}

function dottedMultiplier(dots: number): number {
  let multiplier = 1
  let addition = 0.5

  for (let index = 0; index < dots; index += 1) {
    multiplier += addition
    addition /= 2
  }

  return multiplier
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
