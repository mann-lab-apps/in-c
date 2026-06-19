import type {
  Duration,
  DurationValue,
  PitchStep,
  Score,
  ScoreCommand,
  VoiceAddress,
  VoiceEvent
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
  measureNumber: number
}

export interface MeasureLocation {
  address: VoiceAddress
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
          measureNumber: measure.number,
          events: voice.events
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

    return {
      type: 'voice-event.replace',
      target: location.address,
      eventId: location.event.id,
      event: {
        type: 'note',
        id: location.event.id,
        pitch: {
          step,
          octave: location.event.type === 'note' ? location.event.pitch.octave : 4
        },
        duration
      }
    }
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  const rest = location.events.find((event) => event.type === 'rest')

  if (rest) {
    return {
      type: 'voice-event.replace',
      target: location.address,
      eventId: rest.id,
      event: {
        type: 'note',
        id: rest.id,
        pitch: {
          step,
          octave: 4
        },
        duration
      }
    }
  }

  return {
    type: 'voice-event.insert',
    target: location.address,
    event: {
      type: 'note',
      id: createId(),
      pitch: {
        step,
        octave: 4
      },
      duration
    }
  }
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

    return {
      type: 'voice-event.replace',
      target: location.address,
      eventId: location.event.id,
      event: {
        type: 'rest',
        id: location.event.id,
        duration
      }
    }
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  return {
    type: 'voice-event.insert',
    target: location.address,
    event: {
      type: 'rest',
      id: createId(),
      duration
    }
  }
}

export function buildDurationCommand(
  score: Score,
  selection: EditorSelection,
  duration: Duration
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  return {
    type: 'voice-event.replace',
    target: location.address,
    eventId: location.event.id,
    event: {
      ...location.event,
      duration
    }
  }
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

  return {
    type: 'voice-event.remove',
    target: location.address,
    eventId: location.event.id
  }
}

export function getAdjacentEventId(
  score: Score,
  eventId: string,
  direction: -1 | 1
): string | undefined {
  const eventIds = score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.flatMap((measure) =>
        measure.voices.flatMap((voice) => voice.events.map((event) => event.id))
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
