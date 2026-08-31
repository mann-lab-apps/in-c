import {
  buildRhythmEditCommand,
  effectiveAlterAt,
  nearestPitch,
  resolveNotePitch,
  sortVoiceEvents,
  transposeChromatic,
  transposeDiatonic,
  transposeOctave,
  type Note,
  type Pitch,
  type PitchStep,
  type Score,
  type ScoreCommand
} from '../../../score-core'
import {
  locateEvent,
  resolveReplacementDuration,
  type EventLocation,
  type EditorSelection
} from './editor-state'

export type PitchMovement = 'diatonic' | 'chromatic' | 'octave'

export function buildPitchStepCommand(
  score: Score,
  selection: EditorSelection,
  step: PitchStep
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId, selection.address)

  if (!location) {
    return undefined
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!voice) {
    return undefined
  }

  const reference = findReferencePitch(score, location)
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
      duration: resolveReplacementDuration(
        location.measure,
        location.event,
        location.event.duration
      ),
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
  score: Score,
  location: EventLocation
): Pitch | undefined {
  const staff = score.parts
    .find((part) => part.id === location.address.partId)
    ?.staves.find((candidate) => candidate.id === location.address.staffId)
  const measureIndex = staff?.measures.findIndex(
    (candidate) => candidate.id === location.address.measureId
  ) ?? -1
  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!staff || measureIndex < 0 || !voice) {
    return undefined
  }

  const events = sortVoiceEvents(voice.events)
  const eventIndex = events.findIndex((event) => event.id === location.event.id)

  if (eventIndex === -1) {
    return undefined
  }

  const previousNote = events
    .slice(0, eventIndex)
    .reverse()
    .find((event): event is Note => event.type === 'note')

  if (previousNote) {
    return resolveNotePitch(location.measure, voice, previousNote)
  }

  for (let index = measureIndex - 1; index >= 0; index -= 1) {
    const candidateMeasure = staff.measures[index]
    const candidateVoice =
      candidateMeasure.voices.find(
        (candidate) => candidate.id === location.address.voiceId
      ) ?? candidateMeasure.voices[0]
    const note = sortVoiceEvents(candidateVoice?.events ?? [])
      .filter((event): event is Note => event.type === 'note')
      .at(-1)

    if (note && candidateVoice) {
      return resolveNotePitch(candidateMeasure, candidateVoice, note)
    }
  }

  const nextNote = events
    .slice(eventIndex + 1)
    .find((event): event is Note => event.type === 'note')

  if (nextNote) {
    return resolveNotePitch(location.measure, voice, nextNote)
  }

  for (let index = measureIndex + 1; index < staff.measures.length; index += 1) {
    const candidateMeasure = staff.measures[index]
    const candidateVoice =
      candidateMeasure.voices.find(
        (candidate) => candidate.id === location.address.voiceId
      ) ?? candidateMeasure.voices[0]
    const note = sortVoiceEvents(candidateVoice?.events ?? [])
      .find((event): event is Note => event.type === 'note')

    if (note && candidateVoice) {
      return resolveNotePitch(candidateMeasure, candidateVoice, note)
    }
  }

  return undefined
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

  const location = locateEvent(score, selection.eventId, selection.address)

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

  const location = locateEvent(score, selection.eventId, selection.address)

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
