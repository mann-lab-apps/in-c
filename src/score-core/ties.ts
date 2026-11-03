import { resolveNotePitch } from './pitch'
import { measureDurationTicks, sortVoiceEvents, voiceEventDurationTicks } from './timing'
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
  measureIndex: number
  voice: Voice
}

export function collectTiePairs(score: Score): TiePair[] {
  const events = flattenVoiceEvents(score)
  const pairs: TiePair[] = []

  events.forEach((location, index) => {
    if (location.event.type !== 'note' || !location.event.ties?.start) {
      return
    }

    const next = findTieNeighbour(events, index, 1)

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
      const next = findTieNeighbour(events, index, 1)

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
      const previous = findTieNeighbour(events, index, -1)

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
  eventId: string,
  enabled: boolean
): ScoreCommand | undefined {
  const events = flattenVoiceEvents(score)
  const endpoints = enabled
    ? resolveTieCreationEndpoints(events, eventId)
    : resolveTieRemovalEndpoints(events, eventId)

  if (!endpoints) {
    return undefined
  }

  const { from, to } = endpoints

  if (
    from.event.type !== 'note' ||
    to.event.type !== 'note' ||
    (enabled
      ? !isAdjacentEqualPitch(from, to) || !sameWholeChordPitches(from, to)
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

function resolveTieCreationEndpoints(
  events: EventLocation[],
  eventId: string
): { from: EventLocation; to: EventLocation } | undefined {
  const selectedIndex = events.findIndex(
    (location) => location.event.id === eventId
  )
  const selected = events[selectedIndex]

  if (!selected) {
    return undefined
  }

  const previous = findTieNeighbour(events, selectedIndex, -1)
  const next = findTieNeighbour(events, selectedIndex, 1)

  if (previous && isAdjacentEqualPitch(previous, selected) && sameWholeChordPitches(previous, selected)) {
    return {
      from: previous,
      to: selected
    }
  }

  return next && isAdjacentEqualPitch(selected, next) && sameWholeChordPitches(selected, next)
    ? {
        from: selected,
        to: next
      }
    : undefined
}

function resolveTieRemovalEndpoints(
  events: EventLocation[],
  eventId: string
): { from: EventLocation; to: EventLocation } | undefined {
  const selectedIndex = events.findIndex(
    (location) => location.event.id === eventId
  )
  const selected = events[selectedIndex]

  if (!selected || selected.event.type !== 'note') {
    return undefined
  }

  if (selected.event.ties?.start) {
    const to = events.slice(selectedIndex + 1).find(
      (location) =>
        location.event.type === 'note' &&
        location.event.ties?.stop &&
        sameTieSequence(selected.address, location.address)
    )

    return to ? { from: selected, to } : undefined
  }

  if (selected.event.ties?.stop) {
    const from = events
      .slice(0, selectedIndex)
      .reverse()
      .find(
        (location) =>
          location.event.type === 'note' &&
          location.event.ties?.start &&
          sameTieSequence(location.address, selected.address)
      )

    return from ? { from, to: selected } : undefined
  }

  return undefined
}

// Other voices can occur between consecutive events in the flattened score.
// Search the same lane, while treating a missing/empty intervening measure as
// a boundary rather than allowing a tie to jump over silent time.
function findTieNeighbour(events: EventLocation[], index: number, direction: -1 | 1): EventLocation | undefined {
  const selected = events[index]
  if (!selected) return undefined
  for (let next = index + direction; next >= 0 && next < events.length; next += direction) {
    const candidate = events[next]
    if (candidate.address.partId !== selected.address.partId || candidate.address.staffId !== selected.address.staffId) return undefined
    if (candidate.address.voiceId !== selected.address.voiceId) continue
    return Math.abs(candidate.measureIndex - selected.measureIndex) <= 1 ? candidate : undefined
  }
  return undefined
}

function isAdjacentEqualPitch(
  from: EventLocation,
  to: EventLocation
): boolean {
  if (
    from.event.type !== 'note' ||
    to.event.type !== 'note' ||
    !sameTieSequence(from.address, to.address) ||
    !isTemporallyAdjacent(from, to)
  ) {
    return false
  }

  const fromPitch = resolveNotePitch(from.measure, from.voice, from.event)
  const toPitch = resolveNotePitch(to.measure, to.voice, to.event)

  // A whole chord keeps its identity when its stored member order changes.
  // Preserve the legacy primary-only branch for unequal shapes here; changing
  // acceptance of old partial-looking ties needs a separate compatibility policy.

  return sameWholeChordPitches(from, to) || (
    fromPitch.step === toPitch.step &&
    fromPitch.octave === toPitch.octave &&
    fromPitch.alter === toPitch.alter
  )
}

function sameWholeChordPitches(from: EventLocation, to: EventLocation): boolean {
  if (from.event.type !== 'note' || to.event.type !== 'note') return false
  const keys = (note: Note, location: EventLocation): string[] =>
    (note.pitches?.length ? note.pitches : [note.pitch]).map(pitch => {
      const resolved = resolveNotePitch(location.measure, location.voice, { ...note, pitch })
      return `${resolved.step}/${resolved.octave}/${resolved.alter}`
    }).sort()
  const left = keys(from.event, from), right = keys(to.event, to)
  return left.length === right.length && left.every((key, index) => key === right[index])
}

export interface UnsupportedChordTieWarning extends TiePair {
  code: 'unsupported-chord-tie'
  path: string
  message: string
  address: VoiceAddress
  measureId: string
  measureNumber: number
}

// Diagnostics preserve old files. Only creation is restricted; validation and
// removal retain the historical event-level representation until user repair.
export function collectUnsupportedChordTieWarnings(score: Score): UnsupportedChordTieWarning[] {
  const locations = new Map(flattenVoiceEvents(score).map(location => [location.event.id, location]))
  return collectTiePairs(score).flatMap(pair => {
    const from = locations.get(pair.fromEventId), to = locations.get(pair.toEventId)
    if (!from || !to || sameWholeChordPitches(from, to)) return []
    return [{
      ...pair, code: 'unsupported-chord-tie' as const,
      path: `part[${from.address.partId}].staff[${from.address.staffId}].measure[${from.measureIndex + 1}].event[${pair.fromEventId}].ties`,
      message: 'Unequal chord ties are not supported: playback may sustain the first chord and MusicXML may contain unmatched member ties. Original project data is preserved.',
      address: { ...from.address }, measureId: from.measure.id, measureNumber: from.measure.number
    }]
  })
}

function isTemporallyAdjacent(from: EventLocation, to: EventLocation): boolean {
  const endTick = from.event.position.tick + voiceEventDurationTicks(from.event, from.measure)
  if (from.measureIndex === to.measureIndex) {
    return endTick === to.event.position.tick
  }
  return to.measureIndex === from.measureIndex + 1 &&
    endTick === measureDurationTicks(from.measure) &&
    to.event.position.tick === 0
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
      for (const [measureIndex, measure] of staff.measures.entries()) {
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
              measureIndex,
              voice
            })
          })
        }
      }
    }
  }

  return locations
}
