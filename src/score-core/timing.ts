import type {
  Duration,
  DurationValue,
  Measure,
  Tick,
  TimePosition,
  TimeSignature,
  Voice,
  VoiceEvent,
  VoiceEventId,
  VoiceId
} from './types'

export const TICKS_PER_QUARTER = 13_440
export const MAX_AUGMENTATION_DOTS = 3

const durationTicks: Record<DurationValue, Tick> = {
  whole: TICKS_PER_QUARTER * 4,
  half: TICKS_PER_QUARTER * 2,
  quarter: TICKS_PER_QUARTER,
  eighth: TICKS_PER_QUARTER / 2,
  '16th': TICKS_PER_QUARTER / 4,
  '32nd': TICKS_PER_QUARTER / 8,
  '64th': TICKS_PER_QUARTER / 16
}

export type MeasureRhythmStatus =
  | 'exact'
  | 'empty'
  | 'gap'
  | 'overlap'
  | 'overflow'
  | 'invalid'

export type MeasureRhythmIssue =
  | {
      type: 'gap'
      voiceId: VoiceId
      startTick: Tick
      endTick: Tick
    }
  | {
      type: 'overlap'
      voiceId: VoiceId
      eventId: VoiceEventId
      startTick: Tick
      endTick: Tick
    }
  | {
      type: 'overflow'
      voiceId: VoiceId
      eventId: VoiceEventId
      startTick: Tick
      endTick: Tick
    }
  | {
      type: 'invalid-position' | 'invalid-duration'
      voiceId: VoiceId
      eventId: VoiceEventId
      message: string
    }

export interface MeasureRhythmValidation {
  status: MeasureRhythmStatus
  expectedTicks: Tick
  isExact: boolean
  issues: MeasureRhythmIssue[]
}

export function createTimePosition(tick: Tick): TimePosition {
  assertTick(tick, 'Time position')
  return { tick }
}

export function durationToTicks(duration: Duration): Tick {
  if (
    !Number.isInteger(duration.dots) ||
    duration.dots < 0 ||
    duration.dots > MAX_AUGMENTATION_DOTS
  ) {
    throw new Error(
      `Duration dots must be an integer from 0 to ${MAX_AUGMENTATION_DOTS}: ${duration.dots}`
    )
  }

  const baseTicks = durationTicks[duration.value]
  const dotDenominator = 2 ** duration.dots
  const dotNumerator = 2 ** (duration.dots + 1) - 1
  let ticks = (baseTicks * dotNumerator) / dotDenominator

  if (duration.tuplet) {
    const { actualNotes, normalNotes } = duration.tuplet

    if (
      !Number.isInteger(actualNotes) ||
      !Number.isInteger(normalNotes) ||
      actualNotes <= 0 ||
      normalNotes <= 0
    ) {
      throw new Error('Tuplet note counts must be positive integers.')
    }

    ticks = (ticks * normalNotes) / actualNotes
  }

  assertTick(ticks, `Duration ${duration.value}`)
  return ticks
}

export function timeSignatureDurationTicks(timeSignature: TimeSignature): Tick {
  const { beats, beatType } = timeSignature

  if (
    !Number.isInteger(beats) ||
    !Number.isInteger(beatType) ||
    beats <= 0 ||
    beatType <= 0
  ) {
    throw new Error(`Invalid time signature: ${beats}/${beatType}`)
  }

  const ticks = beats * TICKS_PER_QUARTER * (4 / beatType)
  assertTick(ticks, `Time signature ${beats}/${beatType}`)
  return ticks
}

export function measureDurationTicks(measure: Measure): Tick {
  if (measure.timing.type === 'pickup') {
    assertTick(measure.timing.durationTicks, 'Pickup measure duration')

    if (measure.timing.durationTicks === 0) {
      throw new Error('Pickup measure duration must be greater than zero.')
    }

    return measure.timing.durationTicks
  }

  return timeSignatureDurationTicks(measure.timeSignature)
}

export function voiceEventDurationTicks(
  event: VoiceEvent,
  measure: Measure
): Tick {
  return event.type === 'rest' && event.fullMeasure
    ? measureDurationTicks(measure)
    : durationToTicks(event.duration)
}

export function sortVoiceEvents(events: VoiceEvent[]): VoiceEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        left.event.position.tick - right.event.position.tick ||
        left.index - right.index
    )
    .map(({ event }) => event)
}

export function validateMeasureRhythm(measure: Measure): MeasureRhythmValidation {
  let expectedTicks: Tick

  try {
    expectedTicks = measureDurationTicks(measure)
  } catch (error) {
    return {
      status: 'invalid',
      expectedTicks: 0,
      isExact: false,
      issues: measure.voices.flatMap((voice) =>
        voice.events.map((event) => ({
          type: 'invalid-duration' as const,
          voiceId: voice.id,
          eventId: event.id,
          message: getErrorMessage(error)
        }))
      )
    }
  }

  if (measure.voices.every((voice) => voice.events.length === 0)) {
    return {
      status: 'empty',
      expectedTicks,
      isExact: false,
      issues: []
    }
  }

  const issues = measure.voices.flatMap((voice) =>
    validateVoiceRhythm(voice, measure, expectedTicks)
  )
  const status = getMeasureRhythmStatus(issues)

  return {
    status,
    expectedTicks,
    isExact: status === 'exact',
    issues
  }
}

function validateVoiceRhythm(
  voice: Voice,
  measure: Measure,
  expectedTicks: Tick
): MeasureRhythmIssue[] {
  if (voice.events.length === 0) {
    return [
      {
        type: 'gap',
        voiceId: voice.id,
        startTick: 0,
        endTick: expectedTicks
      }
    ]
  }

  const issues: MeasureRhythmIssue[] = []
  let cursor = 0

  for (const event of sortVoiceEvents(voice.events)) {
    const startTick = event.position.tick

    if (!Number.isInteger(startTick) || startTick < 0) {
      issues.push({
        type: 'invalid-position',
        voiceId: voice.id,
        eventId: event.id,
        message: `Event position must be a non-negative integer: ${startTick}`
      })
      continue
    }

    let eventDuration: Tick

    try {
      eventDuration = voiceEventDurationTicks(event, measure)
    } catch (error) {
      issues.push({
        type: 'invalid-duration',
        voiceId: voice.id,
        eventId: event.id,
        message: getErrorMessage(error)
      })
      continue
    }

    const endTick = startTick + eventDuration

    if (startTick > cursor && cursor < expectedTicks) {
      issues.push({
        type: 'gap',
        voiceId: voice.id,
        startTick: cursor,
        endTick: Math.min(startTick, expectedTicks)
      })
    } else if (startTick < cursor) {
      issues.push({
        type: 'overlap',
        voiceId: voice.id,
        eventId: event.id,
        startTick,
        endTick: Math.min(cursor, endTick)
      })
    }

    if (endTick > expectedTicks) {
      issues.push({
        type: 'overflow',
        voiceId: voice.id,
        eventId: event.id,
        startTick: Math.max(startTick, expectedTicks),
        endTick
      })
    }

    cursor = Math.max(cursor, endTick)
  }

  if (cursor < expectedTicks) {
    issues.push({
      type: 'gap',
      voiceId: voice.id,
      startTick: cursor,
      endTick: expectedTicks
    })
  }

  return issues
}

function getMeasureRhythmStatus(
  issues: MeasureRhythmIssue[]
): MeasureRhythmStatus {
  if (issues.some((issue) => issue.type.startsWith('invalid-'))) {
    return 'invalid'
  }

  if (issues.some((issue) => issue.type === 'overflow')) {
    return 'overflow'
  }

  if (issues.some((issue) => issue.type === 'overlap')) {
    return 'overlap'
  }

  if (issues.some((issue) => issue.type === 'gap')) {
    return 'gap'
  }

  return 'exact'
}

function assertTick(tick: number, label: string): void {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new Error(`${label} must resolve to a non-negative integer tick: ${tick}`)
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
