import {
  createFullMeasureRest,
  createMeasure,
  createVoice,
  type Score,
  type ScoreCommand,
  type StaffAddress
} from '../../../score-core'
import type { EditorSelection } from './editor-state'
import type { NoteInputState } from './note-input-state'

export interface MeasureEditResult {
  command: ScoreCommand
  inputState?: NoteInputState
  selection: EditorSelection
}

export function buildInsertMeasureAfter(
  score: Score,
  measureId: string,
  createId: (kind: 'event' | 'measure') => string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  const location = locateMeasureForEdit(score, measureId)

  if (!location) {
    return undefined
  }

  const newMeasure = createMeasure({
    id: createId('measure'),
    number: location.measureIndex + 2,
    clef: { ...location.measure.clef },
    keySignature: { ...location.measure.keySignature },
    timeSignature: { ...location.measure.timeSignature },
    voices: location.measure.voices.map((voice) =>
      createVoice({
        id: voice.id,
        events: [
          createFullMeasureRest({
            id: createId('event')
          })
        ]
      })
    )
  })
  const firstVoice = newMeasure.voices[0]
  const firstEvent = firstVoice?.events[0]

  if (!firstVoice || !firstEvent) {
    return undefined
  }

  return {
    command: {
      type: 'staff-measure.insert',
      target: location.staffAddress,
      measure: newMeasure,
      index: location.measureIndex + 1
    },
    selection: {
      type: 'measure',
      measureId: newMeasure.id
    },
    inputState: inputState
      ? {
          ...inputState,
          target: {
            ...inputState.target,
            measureId: newMeasure.id,
            voiceId: firstVoice.id
          },
          tick: 0
        }
      : undefined
  }
}

export function buildRemoveMeasure(
  score: Score,
  measureId: string,
  inputState?: NoteInputState
): MeasureEditResult | undefined {
  const location = locateMeasureForEdit(score, measureId)

  if (!location || location.staff.measures.length <= 1) {
    return undefined
  }

  const fallbackMeasure =
    location.staff.measures[location.measureIndex + 1] ??
    location.staff.measures[location.measureIndex - 1]
  const fallbackVoice = fallbackMeasure?.voices[0]

  if (!fallbackMeasure || !fallbackVoice) {
    return undefined
  }

  return {
    command: {
      type: 'staff-measure.remove',
      target: location.staffAddress,
      measureId
    },
    selection: {
      type: 'measure',
      measureId: fallbackMeasure.id
    },
    inputState: inputState
      ? {
          ...inputState,
          target: {
            ...inputState.target,
            measureId: fallbackMeasure.id,
            voiceId: fallbackVoice.id
          },
          tick: 0
        }
      : undefined
  }
}

export function resolveActiveMeasureId(
  score: Score,
  selection: EditorSelection,
  inputState?: NoteInputState
): string | undefined {
  if (inputState) {
    return inputState.target.measureId
  }

  if (selection.type === 'measure') {
    return selection.measureId
  }

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        if (
          measure.voices.some((voice) =>
            voice.events.some((event) => event.id === selection.eventId)
          )
        ) {
          return measure.id
        }
      }
    }
  }

  return undefined
}

function locateMeasureForEdit(score: Score, measureId: string) {
  for (const part of score.parts) {
    for (const staff of part.staves) {
      const measureIndex = staff.measures.findIndex(
        (measure) => measure.id === measureId
      )

      if (measureIndex !== -1) {
        return {
          staff,
          staffAddress: {
            partId: part.id,
            staffId: staff.id
          } satisfies StaffAddress,
          measure: staff.measures[measureIndex],
          measureIndex
        }
      }
    }
  }

  return undefined
}
