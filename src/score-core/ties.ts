import { resolveNotePitch } from './pitch'
import { measureDurationTicks, sortVoiceEvents, voiceEventDurationTicks } from './timing'
import { createRepeatMeasureTraversal, scoreRepeatSource } from './repeats'
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
  isDiscontinuous?: true
}

interface TieConnection { from: EventLocation; to: EventLocation; isDiscontinuous: boolean }

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
  return activeTieConnections(score, flattenVoiceEvents(score)).map(pair => ({
    fromEventId: pair.from.event.id, toEventId: pair.to.event.id,
    ...(pair.isDiscontinuous ? { isDiscontinuous: true as const } : {})
  }))
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
  const connections = activeTieConnections(score, events)
  const starts = new Set(connections.map(pair => eventLocationKey(pair.from)))
  const stops = new Set(connections.map(pair => eventLocationKey(pair.to)))

  events.forEach(location => {
    const event = location.event

    if (event.type !== 'note') {
      return
    }

    if (event.ties?.start && !starts.has(eventLocationKey(location))) issues.push(createTieValidationIssue(location, 'start'))
    if (event.ties?.stop && !stops.has(eventLocationKey(location))) issues.push(createTieValidationIssue(location, 'stop'))
  })

  return issues
}

function activeTieConnections(score: Score, events: EventLocation[]): TieConnection[] {
  return tieCandidates(score, events).filter(pair => pair.from.event.type === 'note' && pair.from.event.ties?.start &&
    pair.to.event.type === 'note' && pair.to.event.ties?.stop)
}

function tieCandidates(score: Score, events: EventLocation[]): TieConnection[] {
  const canonical = scoreRepeatSource(score)
  const staves = new Map<Staff, Map<string, Map<number, EventLocation[]>>>()
  for (const location of events) {
    if (!staves.has(location.staff)) staves.set(location.staff, new Map())
    const voices = staves.get(location.staff)!
    if (!voices.has(location.voice.id)) voices.set(location.voice.id, new Map())
    const measures = voices.get(location.voice.id)!
    if (!measures.has(location.measureIndex)) measures.set(location.measureIndex, [])
    measures.get(location.measureIndex)!.push(location)
  }
  const connections = new Map<string, TieConnection>()
  for (const [staff, voices] of staves) {
    const visits = createRepeatMeasureTraversal(canonical?.measures ?? staff.measures)
    for (const measures of voices.values()) {
      let previous: { location: EventLocation; visit: number } | undefined
      visits.forEach((entry, visit) => {
        const locations = measures.get(entry.measureIndex) ?? []
        if (!locations.length) previous = undefined
        for (const to of locations) {
          if (previous) {
            const from = previous.location
            const fromEnd = from.event.position.tick + voiceEventDurationTicks(from.event, from.measure)
            const contiguous = previous.visit === visit ? fromEnd === to.event.position.tick
              : fromEnd === measureDurationTicks(from.measure) && to.event.position.tick === 0
            if (contiguous && isAdjacentEqualPitch(from, to)) {
              connections.set(JSON.stringify([eventLocationKey(from), eventLocationKey(to)]), {
                from, to, isDiscontinuous: previous.visit !== visit && to.measureIndex !== from.measureIndex + 1
              })
            }
          }
          previous = { location: to, visit }
        }
      })
    }
  }
  return [...connections.values()]
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
  const active = activeTieConnections(score, events)
  let changed: { from: EventLocation; to: EventLocation }[]
  if (enabled) {
    const candidates = tieCandidates(score, events)
    // A repeat return must not steal the ordinary forward tie at the body start.
    const pair = candidates.find(pair => pair.to.event.id === eventId && (
      pair.from.measureIndex < pair.to.measureIndex ||
      pair.from.measureIndex === pair.to.measureIndex && pair.from.event.position.tick < pair.to.event.position.tick
    )) ?? candidates.find(pair => pair.from.event.id === eventId) ??
      candidates.find(pair => pair.to.event.id === eventId)
    changed = pair ? [pair] : []
  } else {
    const outgoing = active.filter(pair => pair.from.event.id === eventId)
    changed = outgoing.length ? outgoing : active.filter(pair => pair.to.event.id === eventId)
    if (!changed.length) {
      const invalid = resolveTieRemovalEndpoints(events, eventId)
      changed = invalid ? [invalid] : []
    }
  }
  if (!changed.length) return undefined
  const remaining = active.filter(pair => !changed.includes(pair))
  const edits = new Map<string, { location: EventLocation; note: Note }>()
  for (const pair of changed) {
    for (const [location, flag] of [[pair.from, 'start'], [pair.to, 'stop']] as const) {
      if (location.event.type !== 'note') continue
      const key = eventLocationKey(location)
      const retained = remaining.some(other => eventLocationKey(flag === 'start' ? other.from : other.to) === key)
      if (!enabled && retained) continue
      edits.set(key, { location, note: withTieFlag(edits.get(key)?.note ?? location.event, flag, enabled) })
    }
  }
  const voices = new Map([...edits.values()].map(edit => [voiceAddressKey(edit.location.address), edit.location]))
  const commands: ScoreCommand[] = [...voices.values()].map(location => ({
    type: 'voice-events.replace', target: location.address,
    events: location.voice.events.map(event => edits.get(`${voiceAddressKey(location.address)}\u0000${event.id}`)?.note ?? event),
    editedEventId: location.event.id
  }))
  return commands.length === 1 ? commands[0] : { type: 'score.batch', commands }
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
