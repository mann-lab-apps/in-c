import type {
  Duration,
  DurationValue,
  Measure,
  PitchStep,
  Score,
  ScoreCommand,
  VoiceAddress,
  VoiceEvent
} from '../../../score-core'
import {
  buildRhythmDeleteCommand,
  buildRhythmEditCommand,
  sortVoiceEvents
} from '../../../score-core'

export type EditorMode = 'select' | 'note' | 'rest'

export type EditorSelection =
  | {
      type: 'event'
      eventId: string
    }
  | {
      type: 'measure'
      measureId: string
    }

export interface EventLocation {
  address: VoiceAddress
  event: VoiceEvent
  eventIndex: number
  measure: Measure
  measureNumber: number
}

export interface MeasureLocation {
  address: VoiceAddress
  measure: Measure
  measureNumber: number
  events: VoiceEvent[]
}

export const durationLabels: Record<DurationValue, string> = {
  whole: 'Whole',
  half: 'Half',
  quarter: 'Quarter',
  eighth: 'Eighth',
  '16th': '16th',
  '32nd': '32nd',
  '64th': '64th'
}

export function locateEvent(score: Score, eventId: string): EventLocation | undefined {
  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        for (const voice of measure.voices) {
          const eventIndex = voice.events.findIndex((event) => event.id === eventId)

          if (eventIndex !== -1) {
            return {
              address: {
                partId: part.id,
                staffId: staff.id,
                measureId: measure.id,
                voiceId: voice.id
              },
              event: voice.events[eventIndex],
              eventIndex,
              measure,
              measureNumber: measure.number
            }
          }
        }
      }
    }
  }

  return undefined
}

export function locateMeasure(
  score: Score,
  measureId: string
): MeasureLocation | undefined {
  for (const part of score.parts) {
    for (const staff of part.staves) {
      const measure = staff.measures.find((candidate) => candidate.id === measureId)
      const voice = measure?.voices[0]

      if (measure && voice) {
        return {
          address: {
            partId: part.id,
            staffId: staff.id,
            measureId: measure.id,
            voiceId: voice.id
          },
          measure,
          measureNumber: measure.number,
          events: sortVoiceEvents(voice.events)
        }
      }
    }
  }

  return undefined
}

export function buildNoteEntryCommand(
  score: Score,
  selection: EditorSelection,
  step: PitchStep,
  duration: Duration,
  createId: () => string
): ScoreCommand | undefined {
  if (selection.type === 'event') {
    const location = locateEvent(score, selection.eventId)

    if (!location) {
      return undefined
    }

    return buildRhythmEditCommand(score, {
      target: location.address,
      eventId: location.event.id,
      createId,
      event: {
        type: 'note',
        id: location.event.id,
        position: location.event.position,
        pitch: {
          step,
          octave: location.event.type === 'note' ? location.event.pitch.octave : 4
        },
        duration
      }
    })
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  const rest = location.events.find((event) => event.type === 'rest')

  if (!rest) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: rest.id,
    createId,
    event: {
      type: 'note',
      id: rest.id,
      position: rest.position,
      pitch: {
        step,
        octave: 4
      },
      duration
    }
  })
}

export function buildRestEntryCommand(
  score: Score,
  selection: EditorSelection,
  duration: Duration,
  createId: () => string
): ScoreCommand | undefined {
  if (selection.type === 'event') {
    const location = locateEvent(score, selection.eventId)

    if (!location) {
      return undefined
    }

    return buildRhythmEditCommand(score, {
      target: location.address,
      eventId: location.event.id,
      createId,
      event: {
        type: 'rest',
        id: location.event.id,
        position: location.event.position,
        duration
      }
    })
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  const rest = location.events.find((event) => event.type === 'rest')

  if (!rest) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: rest.id,
    createId,
    event: {
      type: 'rest',
      id: rest.id,
      position: rest.position,
      duration
    }
  })
}

export function buildDurationCommand(
  score: Score,
  selection: EditorSelection,
  duration: Duration,
  createId: () => string = createRhythmEventId
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: location.event.id,
    createId,
    event: {
      ...location.event,
      ...(location.event.type === 'rest'
        ? {
            fullMeasure: undefined
          }
        : {}),
      duration
    }
  })
}

export function buildDeleteCommand(
  score: Score,
  selection: EditorSelection
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  return buildRhythmDeleteCommand(
    score,
    location.address,
    location.event.id
  )
}

export function getAdjacentEventId(
  score: Score,
  eventId: string,
  direction: -1 | 1
): string | undefined {
  const eventIds = score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.flatMap((measure) =>
        measure.voices.flatMap((voice) =>
          sortVoiceEvents(voice.events).map((event) => event.id)
        )
      )
    )
  )
  const currentIndex = eventIds.indexOf(eventId)

  if (currentIndex === -1) {
    return undefined
  }

  return eventIds[currentIndex + direction]
}

export function createDuration(value: DurationValue): Duration {
  return {
    value,
    dots: 0
  }
}

function createRhythmEventId(): string {
  return `event-${crypto.randomUUID()}`
}
