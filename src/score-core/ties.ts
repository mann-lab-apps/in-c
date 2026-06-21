import { resolveNotePitch } from './pitch'
import { sortVoiceEvents } from './timing'
import type {
  Measure,
  Note,
  Score,
  ScoreCommand,
  Voice,
  VoiceAddress,
  VoiceEvent
} from './types'

export interface TiePair {
  fromEventId: string
  toEventId: string
}

interface EventLocation {
  address: VoiceAddress
  event: VoiceEvent
  measure: Measure
  voice: Voice
}

export function collectTiePairs(score: Score): TiePair[] {
  const events = flattenVoiceEvents(score)
  const pairs: TiePair[] = []

  events.forEach((location, index) => {
    if (location.event.type !== 'note' || !location.event.ties?.start) {
      return
    }

    const next = events[index + 1]

    if (
      !next ||
      next.event.type !== 'note' ||
      !next.event.ties?.stop ||
      !isAdjacentEqualPitch(location, next)
    ) {
      return
    }

    pairs.push({
      fromEventId: location.event.id,
      toEventId: next.event.id
    })
  })

  return pairs
}

export function validateTieRelations(score: Score): string[] {
  const events = flattenVoiceEvents(score)
  const errors: string[] = []

  events.forEach((location, index) => {
    const event = location.event

    if (event.type !== 'note') {
      return
    }

    if (event.ties?.start) {
      const next = events[index + 1]

      if (
        !next ||
        next.event.type !== 'note' ||
        !next.event.ties?.stop ||
        !isAdjacentEqualPitch(location, next)
      ) {
        errors.push(`Invalid tie start: ${event.id}`)
      }
    }

    if (event.ties?.stop) {
      const previous = events[index - 1]

      if (
        !previous ||
        previous.event.type !== 'note' ||
        !previous.event.ties?.start ||
        !isAdjacentEqualPitch(previous, location)
      ) {
        errors.push(`Invalid tie stop: ${event.id}`)
      }
    }
  })

  return errors
}

export function buildTieCommand(
  score: Score,
  fromEventId: string,
  enabled: boolean
): ScoreCommand | undefined {
  const events = flattenVoiceEvents(score)
  const fromIndex = events.findIndex(
    (location) => location.event.id === fromEventId
  )
  const from = events[fromIndex]
  const to = enabled
    ? events[fromIndex + 1]
    : events.slice(fromIndex + 1).find(
        (location) =>
          location.event.type === 'note' &&
          location.event.ties?.stop &&
          from &&
          sameTieSequence(from.address, location.address)
      )

  if (
    !from ||
    from.event.type !== 'note' ||
    !to ||
    to.event.type !== 'note' ||
    (enabled
      ? !isAdjacentEqualPitch(from, to)
      : !from.event.ties?.start || !to.event.ties?.stop)
  ) {
    return undefined
  }

  const fromNote = from.event
  const toNote = to.event
  const nextFrom = withTieFlag(fromNote, 'start', enabled)
  const nextTo = withTieFlag(toNote, 'stop', enabled)

  if (sameVoiceAddress(from.address, to.address)) {
    return {
      type: 'voice-events.replace',
      target: from.address,
      events: sortVoiceEvents(
        from.voice.events.map((event) => {
          if (event.id === fromNote.id) {
            return nextFrom
          }

          return event.id === toNote.id ? nextTo : event
        })
      ),
      editedEventId: fromNote.id
    }
  }

  return {
    type: 'score.batch',
    commands: [
      replaceNoteCommand(from, nextFrom),
      replaceNoteCommand(to, nextTo)
    ]
  }
}

function isAdjacentEqualPitch(
  from: EventLocation,
  to: EventLocation
): boolean {
  if (
    from.event.type !== 'note' ||
    to.event.type !== 'note' ||
    !sameTieSequence(from.address, to.address)
  ) {
    return false
  }

  const fromPitch = resolveNotePitch(from.measure, from.voice, from.event)
  const toPitch = resolveNotePitch(to.measure, to.voice, to.event)

  return (
    fromPitch.step === toPitch.step &&
    fromPitch.octave === toPitch.octave &&
    fromPitch.alter === toPitch.alter
  )
}

function sameTieSequence(
  left: VoiceAddress,
  right: VoiceAddress
): boolean {
  return (
    left.partId === right.partId &&
    left.staffId === right.staffId &&
    left.voiceId === right.voiceId
  )
}

function replaceNoteCommand(
  location: EventLocation,
  note: Note
): ScoreCommand {
  return {
    type: 'voice-events.replace',
    target: location.address,
    events: location.voice.events.map((event) =>
      event.id === note.id ? note : event
    ),
    editedEventId: note.id
  }
}

function withTieFlag(
  note: Note,
  flag: 'start' | 'stop',
  enabled: boolean
): Note {
  const ties = {
    ...note.ties,
    [flag]: enabled || undefined
  }

  return {
    ...note,
    ties: ties.start || ties.stop ? ties : undefined
  }
}

function sameVoiceAddress(
  left: VoiceAddress,
  right: VoiceAddress
): boolean {
  return (
    left.partId === right.partId &&
    left.staffId === right.staffId &&
    left.measureId === right.measureId &&
    left.voiceId === right.voiceId
  )
}

function flattenVoiceEvents(score: Score): EventLocation[] {
  const locations: EventLocation[] = []

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (const measure of staff.measures) {
        for (const voice of measure.voices) {
          sortVoiceEvents(voice.events).forEach((event) => {
            locations.push({
              address: {
                partId: part.id,
                staffId: staff.id,
                measureId: measure.id,
                voiceId: voice.id
              },
              event,
              measure,
              voice
            })
          })
        }
      }
    }
  }

  return locations
}
