import { resolveNotePitch } from './pitch'
import { sortVoiceEvents } from './timing'
import type {
  Measure,
  Note,
  Part,
  Score,
  ScoreCommand,
  Staff,
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
  part: Part
  partIndex: number
  staff: Staff
  staffIndex: number
  voice: Voice
  voiceIndex: number
}

export interface TieValidationIssue {
  kind: 'start' | 'stop'
  eventId: string
  address: VoiceAddress
  partName: string
  partNumber: number
  staffNumber: number
  measureNumber: number
  measureIndex: number
  voiceNumber: number
  tick: number
  pitchLabel: string
  reason: string
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
  return validateTieRelationIssues(score).map((issue) =>
    issue.kind === 'start'
      ? `Invalid tie start: ${issue.eventId}`
      : `Invalid tie stop: ${issue.eventId}`
  )
}

export function validateTieRelationIssues(score: Score): TieValidationIssue[] {
  const events = flattenVoiceEvents(score)
  const issues: TieValidationIssue[] = []

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
        issues.push(createTieValidationIssue(location, 'start'))
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
        issues.push(createTieValidationIssue(location, 'stop'))
      }
    }
  })

  return issues
}

export function formatTieValidationIssues(
  issues: readonly TieValidationIssue[]
): string[] {
  return issues.map((issue) => {
    const direction = issue.kind === 'start' ? '타이 시작' : '타이 끝'
    return [
      `마디 ${issue.measureNumber}`,
      `${issue.partName || `파트 ${issue.partNumber}`}`,
      `보표 ${issue.staffNumber}`,
      `성부 ${issue.voiceNumber}`,
      `${issue.pitchLabel}`,
      `${direction}`,
      issue.reason,
      `event ${issue.eventId}`
    ].join(' · ')
  })
}

export function buildInvalidTieRepairCommand(
  score: Score
): { command: ScoreCommand; issues: TieValidationIssue[] } | undefined {
  const issues = validateTieRelationIssues(score)

  if (issues.length === 0) {
    return undefined
  }

  const events = flattenVoiceEvents(score)
  const edits = new Map<
    string,
    { location: EventLocation; clearStart: boolean; clearStop: boolean }
  >()

  for (const issue of issues) {
    const location = events.find(
      (candidate) =>
        candidate.event.id === issue.eventId &&
        sameVoiceAddress(candidate.address, issue.address)
    )

    if (!location || location.event.type !== 'note') {
      continue
    }

    const key = eventLocationKey(location)
    const edit = edits.get(key) ?? {
      location,
      clearStart: false,
      clearStop: false
    }
    if (issue.kind === 'start') edit.clearStart = true
    else edit.clearStop = true
    edits.set(key, edit)
  }

  const voiceEdits = new Map<
    string,
    {
      location: EventLocation
      eventEdits: Map<string, { clearStart: boolean; clearStop: boolean }>
    }
  >()

  for (const edit of edits.values()) {
    const key = voiceAddressKey(edit.location.address)
    const voiceEdit =
      voiceEdits.get(key) ??
      {
        location: edit.location,
        eventEdits: new Map<string, { clearStart: boolean; clearStop: boolean }>()
      }
    voiceEdit.eventEdits.set(edit.location.event.id, {
      clearStart: edit.clearStart,
      clearStop: edit.clearStop
    })
    voiceEdits.set(key, voiceEdit)
  }

  const commands = [...voiceEdits.values()].map(({ location, eventEdits }) => ({
    type: 'voice-events.replace' as const,
    target: location.address,
    events: sortVoiceEvents(
      location.voice.events.map((event) => {
        const edit = eventEdits.get(event.id)

        if (!edit || event.type !== 'note') {
          return event
        }

        const ties = {
          ...event.ties,
          ...(edit.clearStart ? { start: undefined } : {}),
          ...(edit.clearStop ? { stop: undefined } : {})
        }

        return {
          ...event,
          ties: ties.start || ties.stop ? ties : undefined
        }
      })
    )
  }))

  if (commands.length === 0) {
    return undefined
  }

  return {
    command:
      commands.length === 1
        ? commands[0]
        : {
            type: 'score.batch',
            commands
          },
    issues
  }
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

  const previous = events[selectedIndex - 1]
  const next = events[selectedIndex + 1]

  if (previous && isAdjacentEqualPitch(previous, selected)) {
    return {
      from: previous,
      to: selected
    }
  }

  return next && isAdjacentEqualPitch(selected, next)
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

function voiceAddressKey(address: VoiceAddress): string {
  return [
    address.partId,
    address.staffId,
    address.measureId,
    address.voiceId
  ].join('\u0000')
}

function eventLocationKey(location: EventLocation): string {
  return `${voiceAddressKey(location.address)}\u0000${location.event.id}`
}

function createTieValidationIssue(
  location: EventLocation,
  kind: TieValidationIssue['kind']
): TieValidationIssue {
  const pitch =
    location.event.type === 'note'
      ? resolveNotePitch(location.measure, location.voice, location.event)
      : undefined
  const direction = kind === 'start' ? '다음' : '이전'
  const end = kind === 'start' ? '타이 끝' : '타이 시작'

  return {
    kind,
    eventId: location.event.id,
    address: location.address,
    partName: location.part.name,
    partNumber: location.partIndex + 1,
    staffNumber: location.staffIndex + 1,
    measureNumber: location.measure.number,
    measureIndex: location.measureIndex,
    voiceNumber: location.voiceIndex + 1,
    tick: location.event.position.tick,
    pitchLabel: pitch ? formatPitchLabel(pitch) : '알 수 없는 음',
    reason: `${direction} 같은 음의 ${end}이 없습니다`
  }
}

function formatPitchLabel(pitch: ReturnType<typeof resolveNotePitch>): string {
  const accidental =
    pitch.alter === -2
      ? 'bb'
      : pitch.alter === -1
        ? 'b'
        : pitch.alter === 1
          ? '#'
          : pitch.alter === 2
            ? '##'
            : ''

  return `${pitch.step}${accidental}${pitch.octave}`
}

function flattenVoiceEvents(score: Score): EventLocation[] {
  const locations: EventLocation[] = []

  score.parts.forEach((part, partIndex) => {
    part.staves.forEach((staff, staffIndex) => {
      staff.measures.forEach((measure, measureIndex) => {
        measure.voices.forEach((voice, voiceIndex) => {
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
              part,
              partIndex,
              staff,
              staffIndex,
              voice,
              voiceIndex
            })
          })
        })
      })
    })
  })

  return locations
}
