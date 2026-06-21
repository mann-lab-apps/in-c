import {
  buildRhythmEditCommand,
  effectiveAlterAt,
  resolveNotePitch,
  transposeChromatic,
  transposeDiatonic,
  transposeOctave,
  type Pitch,
  type Score,
  type ScoreCommand
} from '../../../score-core'
import { locateEvent, type EditorSelection } from './editor-state'

export type PitchMovement = 'diatonic' | 'chromatic' | 'octave'

export function buildPitchMovementCommand(
  score: Score,
  selection: EditorSelection,
  movement: PitchMovement,
  direction: -1 | 1
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location || location.event.type !== 'note') {
    return undefined
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!voice) {
    return undefined
  }

  const currentPitch = resolveNotePitch(
    location.measure,
    voice,
    location.event
  )
  let pitch: Pitch | undefined

  switch (movement) {
    case 'diatonic': {
      const target = transposeDiatonic(currentPitch, direction)
      pitch = {
        ...target,
        alter: effectiveAlterAt({
          measure: location.measure,
          voice,
          step: target.step,
          octave: target.octave,
          tick: location.event.position.tick,
          excludeEventId: location.event.id
        })
      }
      break
    }
    case 'chromatic':
      pitch = transposeChromatic(currentPitch, direction)
      break
    case 'octave':
      pitch = transposeOctave(currentPitch, direction)
      break
  }

  if (!pitch) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: location.event.id,
    createId: createEventId,
    event: {
      ...location.event,
      pitch
    }
  })
}

export function buildAccidentalCommand(
  score: Score,
  selection: EditorSelection,
  alter: NonNullable<Pitch['alter']>
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location || location.event.type !== 'note') {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: location.event.id,
    createId: createEventId,
    event: {
      ...location.event,
      pitch: {
        ...location.event.pitch,
        alter
      }
    }
  })
}

function createEventId(): string {
  return `event-${crypto.randomUUID()}`
}
