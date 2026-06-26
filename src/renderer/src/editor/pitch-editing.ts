import {
  buildRhythmEditCommand,
  effectiveAlterAt,
  nearestPitch,
  resolveNotePitch,
  sortVoiceEvents,
  transposeChromatic,
  transposeDiatonic,
  transposeOctave,
  type Measure,
  type Note,
  type Pitch,
  type PitchStep,
  type Score,
  type ScoreCommand,
  type Voice
} from '../../../score-core'
import { locateEvent, type EditorSelection } from './editor-state'

export type PitchMovement = 'diatonic' | 'chromatic' | 'octave'

export function buildPitchStepCommand(
  score: Score,
  selection: EditorSelection,
  step: PitchStep
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!voice) {
    return undefined
  }

  const reference = findReferencePitch(
    location.measure,
    voice,
    location.event.id
  )
  const pitch = nearestPitch({
    step,
    alter: 0,
    reference:
      location.event.type === 'note'
        ? resolveNotePitch(location.measure, voice, location.event)
        : reference
  })

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: location.event.id,
    createId: createEventId,
    event: {
      type: 'note',
      id: location.event.id,
      position: location.event.position,
      duration: location.event.duration,
      ...(location.event.type === 'note' && location.event.ties
        ? {
            ties: location.event.ties
          }
        : {}),
      pitch: {
        ...pitch,
        alter: effectiveAlterAt({
          measure: location.measure,
          voice,
          step: pitch.step,
          octave: pitch.octave,
          tick: location.event.position.tick,
          excludeEventId: location.event.id
        })
      }
    }
  })
}

function findReferencePitch(
  measure: Measure,
  voice: Voice,
  eventId: string
): Pitch | undefined {
  const events = sortVoiceEvents(voice.events)
  const eventIndex = events.findIndex((event) => event.id === eventId)

  if (eventIndex === -1) {
    return undefined
  }

  const previousNote = events
    .slice(0, eventIndex)
    .reverse()
    .find((event): event is Note => event.type === 'note')
  const nextNote = events
    .slice(eventIndex + 1)
    .find((event): event is Note => event.type === 'note')
  const referenceNote = previousNote ?? nextNote

  return referenceNote
    ? resolveNotePitch(measure, voice, referenceNote)
    : undefined
}

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
