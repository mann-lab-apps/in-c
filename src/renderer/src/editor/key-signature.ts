import {
  effectiveAlterAt,
  resolveNotePitch,
  sortVoiceEvents,
  type KeySignature,
  type Measure,
  type Note,
  type Score,
  type ScoreCommand,
  type Voice,
  type VoiceEvent
} from '../../../score-core'
import {
  getSelectionFocusEventId,
  locateMeasure,
  type EditorSelection
} from './editor-state'

export function buildKeySignatureCommand(
  score: Score,
  selection: EditorSelection,
  keySignature: KeySignature
): ScoreCommand | undefined {
  const measureId =
    selection.type === 'measure'
      ? selection.measureId
      : findSelectedEventMeasureId(score, getSelectionFocusEventId(selection))
  const location = measureId ? locateMeasure(score, measureId) : undefined

  if (!location) {
    return undefined
  }

  const part = score.parts.find((candidate) => candidate.id === location.address.partId)
  const staff = part?.staves.find(
    (candidate) => candidate.id === location.address.staffId
  )
  const startIndex = staff?.measures.findIndex(
    (measure) => measure.id === location.address.measureId
  )

  if (!staff || startIndex === undefined || startIndex < 0) {
    return undefined
  }

  const measures = staff.measures.map((measure, index) =>
    index < startIndex
      ? measure
      : applyKeySignatureToMeasure(measure, keySignature)
  )
  const changed = measures.some(
    (measure, index) => measure !== staff.measures[index]
  )

  return changed
    ? {
        type: 'staff-measures.replace',
        target: {
          partId: location.address.partId,
          staffId: location.address.staffId
        },
        measures
      }
    : undefined
}

function findSelectedEventMeasureId(
  score: Score,
  eventId: string | undefined
): string | undefined {
  if (!eventId) {
    return undefined
  }

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        if (
          measure.voices.some((voice) =>
            voice.events.some((event) => event.id === eventId)
          )
        ) {
          return measure.id
        }
      }
    }
  }

  return undefined
}

function applyKeySignatureToMeasure(
  measure: Measure,
  keySignature: KeySignature
): Measure {
  if (
    measure.keySignature.fifths === keySignature.fifths &&
    measure.keySignature.mode === keySignature.mode
  ) {
    return measure
  }

  const nextMeasure = {
    ...measure,
    keySignature: { ...keySignature }
  }

  return {
    ...nextMeasure,
    voices: measure.voices.map((voice) =>
      preserveVoicePitches(measure, nextMeasure, voice)
    )
  }
}

function preserveVoicePitches(
  previousMeasure: Measure,
  nextMeasure: Measure,
  voice: Voice
): Voice {
  const previousEvents = sortVoiceEvents(voice.events)
  const nextEvents: VoiceEvent[] = []

  previousEvents.forEach((event) => {
    if (event.type !== 'note') {
      nextEvents.push(event)
      return
    }

    const resolvedPitch = resolveNotePitch(previousMeasure, voice, event)
    const nextImplicitAlter = effectiveAlterAt({
      measure: nextMeasure,
      voice: {
        ...voice,
        events: nextEvents
      },
      step: event.pitch.step,
      octave: event.pitch.octave,
      tick: event.position.tick
    })
    const nextNote: Note = {
      ...event,
      pitch: {
        ...event.pitch,
        alter:
          resolvedPitch.alter === nextImplicitAlter
            ? undefined
            : resolvedPitch.alter
      }
    }

    nextEvents.push(nextNote)
  })

  return {
    ...voice,
    events: nextEvents
  }
}
