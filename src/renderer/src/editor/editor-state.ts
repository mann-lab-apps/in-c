import type {
  Duration,
  DurationValue,
  Measure,
  PitchStep,
  Score,
  ScoreCommand,
  VoiceAddress,
  VoiceEvent
} from '../../../score-core'
import {
  MAX_AUGMENTATION_DOTS,
  applyScoreCommand,
  buildRhythmDeleteCommand,
  buildRhythmEditCommand,
  createNote,
  createRest,
  createDuration as createScoreDuration,
  createTimePosition,
  decomposeDurationTicks,
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents
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
  | {
      type: 'range'
      anchorEventId: string
      focusEventId: string
      eventIds: string[]
    }

export interface EventLocation {
  address: VoiceAddress
  event: VoiceEvent
  eventIndex: number
  measure: Measure
  measureNumber: number
}

export interface MeasureLocation {
  address: VoiceAddress
  measure: Measure
  measureNumber: number
  events: VoiceEvent[]
}

export const durationLabels: Record<DurationValue, string> = {
  whole: '온음표',
  half: '2분음표',
  quarter: '4분음표',
  eighth: '8분음표',
  '16th': '16분음표',
  '32nd': '32분음표',
  '64th': '64분음표'
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
              measure,
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
          measure,
          measureNumber: measure.number,
          events: sortVoiceEvents(voice.events)
        }
      }
    }
  }

  return undefined
}

export function createRangeSelection(
  score: Score,
  anchorEventId: string,
  focusEventId: string
): EditorSelection | undefined {
  const anchor = locateEvent(score, anchorEventId)
  const focus = locateEvent(score, focusEventId)

  if (!anchor || !focus || !sameVoiceAddress(anchor.address, focus.address)) {
    return undefined
  }

  const eventIds = getVoiceEventIds(score, anchor.address)
  const anchorIndex = eventIds.indexOf(anchorEventId)
  const focusIndex = eventIds.indexOf(focusEventId)

  if (anchorIndex === -1 || focusIndex === -1) {
    return undefined
  }

  const startIndex = Math.min(anchorIndex, focusIndex)
  const endIndex = Math.max(anchorIndex, focusIndex)
  const selectedEventIds = eventIds.slice(startIndex, endIndex + 1)

  return selectedEventIds.length === 1
    ? {
        type: 'event',
        eventId: focusEventId
      }
    : {
        type: 'range',
        anchorEventId,
        focusEventId,
        eventIds: selectedEventIds
      }
}

export function getSelectionFocusEventId(
  selection: EditorSelection
): string | undefined {
  if (selection.type === 'event') {
    return selection.eventId
  }

  if (selection.type === 'range') {
    return selection.focusEventId
  }

  return undefined
}

export function getSelectedEventIds(selection: EditorSelection): string[] {
  if (selection.type === 'event') {
    return [selection.eventId]
  }

  if (selection.type === 'range') {
    return selection.eventIds
  }

  return []
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

    return buildRhythmEditCommand(score, {
      target: location.address,
      eventId: location.event.id,
      createId,
      event: {
        type: 'note',
        id: location.event.id,
        position: location.event.position,
        pitch: {
          step,
          octave: location.event.type === 'note' ? location.event.pitch.octave : 4
        },
        duration: resolveReplacementDuration(
          location.measure,
          location.event,
          duration
        )
      }
    })
  }

  if (selection.type !== 'measure') {
    return undefined
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  const rest = location.events.find((event) => event.type === 'rest')

  if (!rest) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: rest.id,
    createId,
    event: {
      type: 'note',
      id: rest.id,
      position: rest.position,
      pitch: {
        step,
        octave: 4
      },
      duration: resolveReplacementDuration(location.measure, rest, duration)
    }
  })
}

export function resolveReplacementDuration(
  measure: Measure,
  event: VoiceEvent,
  fallback: Duration
): Duration {
  if (event.type !== 'rest' || !event.fullMeasure) {
    return fallback
  }

  return decomposeDurationTicks(measureDurationTicks(measure))?.[0] ?? fallback
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

    return buildRhythmEditCommand(score, {
      target: location.address,
      eventId: location.event.id,
      createId,
      event: {
        type: 'rest',
        id: location.event.id,
        position: location.event.position,
        duration
      }
    })
  }

  if (selection.type !== 'measure') {
    return undefined
  }

  const location = locateMeasure(score, selection.measureId)

  if (!location) {
    return undefined
  }

  const rest = location.events.find((event) => event.type === 'rest')

  if (!rest) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: rest.id,
    createId,
    event: {
      type: 'rest',
      id: rest.id,
      position: rest.position,
      duration
    }
  })
}

export function buildDurationCommand(
  score: Score,
  selection: EditorSelection,
  duration: Duration,
  createId: () => string = createRhythmEventId
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  return buildRhythmEditCommand(score, {
    target: location.address,
    eventId: location.event.id,
    createId,
    event: {
      ...location.event,
      ...(location.event.type === 'rest'
        ? {
            fullMeasure: undefined
          }
        : {}),
      duration
    }
  })
}

export function buildDotCommand(
  score: Score,
  selection: EditorSelection,
  direction: -1 | 1,
  createId: () => string = createRhythmEventId
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  const dots = location.event.duration.dots + direction

  if (
    dots < 0 ||
    dots > MAX_AUGMENTATION_DOTS ||
    (direction === -1 &&
      location.event.type === 'note' &&
      location.event.ties?.start)
  ) {
    return undefined
  }

  return buildDurationCommand(
    score,
    selection,
    {
      ...location.event.duration,
      dots
    },
    createId
  )
}

export function buildTupletGroupCommand(
  score: Score,
  selection: EditorSelection,
  createId: () => string,
  actualNotes = 3,
  normalNotes = 2
): ScoreCommand | undefined {
  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)
  const voice = location?.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )

  if (!location || !voice) {
    return undefined
  }

  const events = sortVoiceEvents(voice.events)
  const startIndex = events.findIndex((event) => event.id === selection.eventId)
  const existingGroup = voice.tuplets?.find((group) =>
    group.eventIds.includes(selection.eventId)
  )

  if (existingGroup) {
    return buildUntupletGroupCommand(
      location,
      voice,
      events,
      existingGroup,
      createId
    )
  }

  return buildTupletFromAvailableSpan(
    location,
    voice,
    events,
    startIndex,
    createId,
    actualNotes,
    normalNotes
  )
}

function buildTupletFromAvailableSpan(
  location: EventLocation,
  voice: NonNullable<Measure['voices'][number]>,
  events: VoiceEvent[],
  startIndex: number,
  createId: () => string,
  actualNotes: number,
  normalNotes: number
): ScoreCommand | undefined {
  const baseDuration = location.event.duration

  if (
    startIndex === -1 ||
    baseDuration.tuplet ||
    baseDuration.dots > 0 ||
    (location.event.type === 'note' &&
      (location.event.ties?.start || location.event.ties?.stop))
  ) {
    return undefined
  }

  const tupletDuration: Duration = {
    ...baseDuration,
    tuplet: {
      actualNotes,
      normalNotes
    }
  }
  const tupletTicks = durationToTicks(tupletDuration)
  const startTick = location.event.position.tick
  const groupEndTick = startTick + tupletTicks * actualNotes

  if (groupEndTick > measureDurationTicks(location.measure)) {
    return undefined
  }

  const before = events.filter((event) => eventEndTick(event) <= startTick)
  const overlapping = events.filter(
    (event) =>
      event.position.tick < groupEndTick &&
      eventEndTick(event) > startTick
  )
  const after = events.filter((event) => event.position.tick >= groupEndTick)

  if (overlapping[0]?.id !== location.event.id) {
    return undefined
  }

  let coveredUntil = startTick
  const memberEvents: VoiceEvent[] = []
  const consumedIds = new Set<string>()
  const trailingRests: VoiceEvent[] = []

  for (const event of overlapping) {
    if (event.position.tick > coveredUntil) {
      return undefined
    }

    if (
      event.duration.tuplet ||
      (event.type === 'note' && (event.ties?.start || event.ties?.stop))
    ) {
      return undefined
    }

    const endTick = eventEndTick(event)

    if (
      event.type === 'note' ||
      (event.type === 'rest' &&
        event.duration.value === baseDuration.value &&
        event.duration.dots === baseDuration.dots &&
        memberEvents.length === 0)
    ) {
      if (
        event.duration.value !== baseDuration.value ||
        event.duration.dots !== baseDuration.dots ||
        memberEvents.length >= actualNotes
      ) {
        return undefined
      }

      memberEvents.push(event)
    }

    consumedIds.add(event.id)
    coveredUntil = Math.max(coveredUntil, endTick)

    if (event.type === 'rest' && endTick > groupEndTick) {
      trailingRests.push(
        ...createRestsForSpan(groupEndTick, endTick, createId, event.id)
      )
    }
  }

  if (coveredUntil < groupEndTick) {
    return undefined
  }

  const converted = Array.from({ length: actualNotes }, (_, index) => {
    const event = memberEvents[index]
    const position = createTimePosition(startTick + tupletTicks * index)

    return event?.type === 'note'
      ? createNote({
          id: event.id,
          position,
          duration: tupletDuration,
          pitch: event.pitch
        })
      : createRest({
          id: event?.id ?? createId(),
          position,
          duration: tupletDuration
        })
  })

  return {
    type: 'voice-content.replace',
    target: location.address,
    events: sortVoiceEvents([
      ...before,
      ...converted,
      ...trailingRests,
      ...after.filter((event) => !consumedIds.has(event.id))
    ]),
    tuplets: [
      ...(voice.tuplets ?? []),
      {
        id: `tuplet-${crypto.randomUUID()}`,
        eventIds: converted.map((event) => event.id),
        actualNotes,
        normalNotes
      }
    ],
    editedEventId: location.event.id
  }
}

export function buildDeleteCommand(
  score: Score,
  selection: EditorSelection
): ScoreCommand | undefined {
  if (selection.type === 'range') {
    return buildRangeDeleteCommand(score, selection)
  }

  if (selection.type !== 'event') {
    return undefined
  }

  const location = locateEvent(score, selection.eventId)

  if (!location) {
    return undefined
  }

  return buildRhythmDeleteCommand(
    score,
    location.address,
    location.event.id
  )
}

function buildRangeDeleteCommand(
  score: Score,
  selection: Extract<EditorSelection, { type: 'range' }>
): ScoreCommand | undefined {
  const locations = selection.eventIds.map((eventId) =>
    locateEvent(score, eventId)
  )

  if (locations.some((location) => !location)) {
    return undefined
  }

  const first = locations[0]

  if (
    !first ||
    !locations.every(
      (location) =>
        location &&
        sameVoiceAddress(first.address, location.address) &&
        first.address.measureId === location.address.measureId
    )
  ) {
    return undefined
  }

  let nextScore = score
  const commands: ScoreCommand[] = []

  for (const eventId of [...selection.eventIds].reverse()) {
    const location = locateEvent(nextScore, eventId)

    if (!location || !sameVoiceAddress(first.address, location.address)) {
      return undefined
    }

    const command = buildRhythmDeleteCommand(
      nextScore,
      location.address,
      location.event.id
    )

    if (!command) {
      return undefined
    }

    try {
      nextScore = applyScoreCommand(nextScore, command).score
    } catch {
      return undefined
    }

    commands.push(command)
  }

  if (commands.length === 0) {
    return undefined
  }

  return commands.length === 1
    ? commands[0]
    : {
        type: 'score.batch',
        commands
      }
}

export function getAdjacentEventId(
  score: Score,
  eventId: string,
  direction: -1 | 1
): string | undefined {
  const eventIds = getScoreEventIds(score)
  const currentIndex = eventIds.indexOf(eventId)

  if (currentIndex === -1) {
    return undefined
  }

  return eventIds[currentIndex + direction]
}

function getScoreEventIds(score: Score): string[] {
  return score.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.measures.flatMap((measure) =>
        measure.voices.flatMap((voice) =>
          sortVoiceEvents(voice.events).map((event) => event.id)
        )
      )
    )
  )
}

function getVoiceEventIds(score: Score, address: VoiceAddress): string[] {
  return score.parts.flatMap((part) =>
    part.id !== address.partId
      ? []
      : part.staves.flatMap((staff) =>
          staff.id !== address.staffId
            ? []
            : staff.measures.flatMap((measure) => {
                const voice = measure.voices.find(
                  (candidate) => candidate.id === address.voiceId
                )

                return voice
                  ? sortVoiceEvents(voice.events).map((event) => event.id)
                  : []
              })
        )
  )
}

function sameVoiceAddress(left: VoiceAddress, right: VoiceAddress): boolean {
  return (
    left.partId === right.partId &&
    left.staffId === right.staffId &&
    left.voiceId === right.voiceId
  )
}

export function createDuration(value: DurationValue, dots = 0): Duration {
  return createScoreDuration(value, dots)
}

function createRestsForSpan(
  startTick: number,
  endTick: number,
  createId: () => string,
  firstId?: string
): VoiceEvent[] {
  const durations = decomposeDurationTicks(endTick - startTick)

  if (!durations) {
    return []
  }

  let tick = startTick

  return durations.map((duration) => {
    const rest = createRest({
      id: firstId && tick === startTick ? firstId : createId(),
      position: createTimePosition(tick),
      duration
    })

    tick += durationToTicks(duration)
    return rest
  })
}

function eventEndTick(event: VoiceEvent): number {
  return event.position.tick + durationToTicks(event.duration)
}

function buildUntupletGroupCommand(
  location: EventLocation,
  voice: NonNullable<Measure['voices'][number]>,
  events: VoiceEvent[],
  group: NonNullable<Measure['voices'][number]['tuplets']>[number],
  createId: () => string
): ScoreCommand | undefined {
  const members = group.eventIds
    .map((eventId) => events.find((event) => event.id === eventId))
    .filter((event): event is VoiceEvent => Boolean(event))

  if (members.length !== group.actualNotes) {
    return undefined
  }

  const firstMember = members[0]
  const tupletDuration = firstMember.duration

  if (!tupletDuration.tuplet || tupletDuration.dots > 0) {
    return undefined
  }

  const baseDuration: Duration = {
    ...tupletDuration,
    tuplet: undefined
  }
  const tupletTicks = durationToTicks(tupletDuration)
  const regularTicks = durationToTicks(baseDuration)
  const startTick = firstMember.position.tick
  const currentEndTick = startTick + tupletTicks * group.actualNotes
  const expandedEndTick = startTick + regularTicks * group.actualNotes

  if (
    members.some(
      (event, index) =>
        event.position.tick !== startTick + tupletTicks * index ||
        event.duration.value !== tupletDuration.value ||
        event.duration.dots !== tupletDuration.dots ||
        event.duration.tuplet?.actualNotes !== group.actualNotes ||
        event.duration.tuplet.normalNotes !== group.normalNotes ||
        (event.type === 'note' && (event.ties?.start || event.ties?.stop))
    )
  ) {
    return undefined
  }

  const memberIds = new Set(group.eventIds)
  const firstIndex = events.findIndex((event) => event.id === firstMember.id)

  if (expandedEndTick <= measureDurationTicks(location.measure)) {
    const afterMembers = events.filter(
      (event) => !memberIds.has(event.id) && event.position.tick >= currentEndTick
    )
    const consumed = consumeRestSpan(
      afterMembers,
      currentEndTick,
      expandedEndTick,
      createId
    )

    if (consumed) {
      const converted = members.map((event, index) =>
        event.type === 'rest'
          ? createRest({
              id: event.id,
              position: createTimePosition(startTick + regularTicks * index),
              duration: baseDuration
            })
          : createNote({
              id: event.id,
              position: createTimePosition(startTick + regularTicks * index),
              duration: baseDuration,
              pitch: event.pitch
            })
      )

      return {
        type: 'voice-content.replace',
        target: location.address,
        events: sortVoiceEvents([
          ...events.filter(
            (event) =>
              event.position.tick < startTick &&
              !memberIds.has(event.id)
          ),
          ...converted,
          ...consumed.trailingRests,
          ...consumed.remainingEvents
        ]),
        tuplets: (voice.tuplets ?? []).filter((candidate) => candidate.id !== group.id),
        editedEventId: events[firstIndex]?.id ?? firstMember.id
      }
    }
  }

  return buildCompactUntupletGroupCommand(
    location,
    voice,
    events,
    group,
    members,
    baseDuration,
    regularTicks,
    startTick,
    currentEndTick
  )
}

function buildCompactUntupletGroupCommand(
  location: EventLocation,
  voice: NonNullable<Measure['voices'][number]>,
  events: VoiceEvent[],
  group: NonNullable<Measure['voices'][number]['tuplets']>[number],
  members: VoiceEvent[],
  baseDuration: Duration,
  regularTicks: number,
  startTick: number,
  endTick: number
): ScoreCommand | undefined {
  const memberIds = new Set(group.eventIds)
  const converted: VoiceEvent[] = []
  let tick = startTick

  for (const event of members) {
    if (tick + regularTicks > endTick) {
      if (event.type === 'note') {
        return undefined
      }

      continue
    }

    converted.push(
      event.type === 'rest'
        ? createRest({
            id: event.id,
            position: createTimePosition(tick),
            duration: baseDuration
          })
        : createNote({
            id: event.id,
            position: createTimePosition(tick),
            duration: baseDuration,
            pitch: event.pitch
          })
    )
    tick += regularTicks
  }

  return {
    type: 'voice-content.replace',
    target: location.address,
    events: sortVoiceEvents([
      ...events.filter(
        (event) =>
          event.position.tick < startTick &&
          !memberIds.has(event.id)
      ),
      ...converted,
      ...events.filter(
        (event) =>
          event.position.tick >= endTick &&
          !memberIds.has(event.id)
      )
    ]),
    tuplets: (voice.tuplets ?? []).filter((candidate) => candidate.id !== group.id),
    editedEventId: members[0]?.id
  }
}

function consumeRestSpan(
  events: VoiceEvent[],
  startTick: number,
  endTick: number,
  createId: () => string
): { remainingEvents: VoiceEvent[]; trailingRests: VoiceEvent[] } | undefined {
  let coveredUntil = startTick
  let consumedCount = 0
  let trailingRest: VoiceEvent | undefined
  let trailingEndTick = startTick

  for (const event of events) {
    if (coveredUntil >= endTick) {
      break
    }

    if (event.type !== 'rest' || event.position.tick !== coveredUntil) {
      return undefined
    }

    trailingRest = event
    trailingEndTick = event.position.tick + durationToTicks(event.duration)
    coveredUntil = trailingEndTick
    consumedCount += 1
  }

  if (coveredUntil < endTick) {
    return undefined
  }

  return {
    remainingEvents: events.slice(consumedCount),
    trailingRests:
      trailingRest && trailingEndTick > endTick
        ? createRestsForSpan(endTick, trailingEndTick, createId, trailingRest.id)
        : []
  }
}

function createRhythmEventId(): string {
  return `event-${crypto.randomUUID()}`
}
