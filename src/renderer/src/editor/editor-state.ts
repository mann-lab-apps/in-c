import type {
  Duration,
  DurationValue,
  Measure,
  Note,
  PitchStep,
  Rest,
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
  sortVoiceEvents,
  validateMeasureRhythm,
  validateVoiceTuplets
} from '../../../score-core'

export type EditorMode = 'select' | 'note' | 'rest'

export type EditorSelection =
  | {
      type: 'event'
      eventId: string
      address?: VoiceAddress
    }
  | {
      type: 'measure'
      measureId: string
      address?: VoiceAddress
    }
  | {
      type: 'range'
      anchorEventId: string
      focusEventId: string
      eventIds: string[]
      address?: VoiceAddress
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

export interface RangeClipboardEvent {
  relativeTick: number
  event: VoiceEvent
}

export interface RangeClipboard {
  durationTicks: number
  eventCount: number
  events: RangeClipboardEvent[]
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

export function locateEvent(
  score: Score,
  eventId: string,
  address?: VoiceAddress
): EventLocation | undefined {
  if (address) {
    return locateEventAtAddress(score, eventId, address)
  }

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
  measureId: string,
  address?: VoiceAddress
): MeasureLocation | undefined {
  if (address) {
    return locateMeasureAtAddress(score, measureId, address)
  }

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

function locateEventAtAddress(
  score: Score,
  eventId: string,
  address: VoiceAddress
): EventLocation | undefined {
  const location = locateMeasureAtAddress(score, address.measureId, address)
  const eventIndex = location?.events.findIndex((event) => event.id === eventId)

  if (location && eventIndex !== undefined && eventIndex !== -1) {
    return {
      address: location.address,
      event: location.events[eventIndex],
      eventIndex,
      measure: location.measure,
      measureNumber: location.measureNumber
    }
  }

  const part = score.parts.find((candidate) => candidate.id === address.partId)
  const staff = part?.staves.find((candidate) => candidate.id === address.staffId)

  if (!part || !staff) {
    return undefined
  }

  for (const measure of staff.measures) {
    const voice = measure.voices.find(
      (candidate) => candidate.id === address.voiceId
    )
    const events = sortVoiceEvents(voice?.events ?? [])
    const nextEventIndex = events.findIndex((event) => event.id === eventId)

    if (voice && nextEventIndex !== -1) {
      return {
        address: {
          partId: part.id,
          staffId: staff.id,
          measureId: measure.id,
          voiceId: voice.id
        },
        event: events[nextEventIndex],
        eventIndex: nextEventIndex,
        measure,
        measureNumber: measure.number
      }
    }
  }

  return undefined
}

function locateMeasureAtAddress(
  score: Score,
  measureId: string,
  address: VoiceAddress
): MeasureLocation | undefined {
  const part = score.parts.find((candidate) => candidate.id === address.partId)
  const staff = part?.staves.find((candidate) => candidate.id === address.staffId)
  const measure = staff?.measures.find((candidate) => candidate.id === measureId)
  const voice =
    measure?.voices.find((candidate) => candidate.id === address.voiceId) ??
    measure?.voices[0]

  if (!measure || !voice) {
    return undefined
  }

  return {
    address: {
      partId: part!.id,
      staffId: staff!.id,
      measureId: measure.id,
      voiceId: voice.id
    },
    measure,
    measureNumber: measure.number,
    events: sortVoiceEvents(voice.events)
  }
}

export function createEventSelection(
  score: Score,
  eventId: string
): EditorSelection {
  const location = locateEvent(score, eventId)

  return location
    ? {
        type: 'event',
        eventId,
        address: location.address
      }
    : {
        type: 'event',
        eventId
      }
}

export function createMeasureSelection(
  score: Score,
  measureId: string,
  address?: VoiceAddress
): EditorSelection {
  const location = locateMeasure(score, measureId, address)

  return location
    ? {
        type: 'measure',
        measureId,
        address: location.address
      }
    : {
        type: 'measure',
        measureId
      }
}

export function createRangeSelection(
  score: Score,
  anchorEventId: string,
  focusEventId: string,
  address?: VoiceAddress
): EditorSelection | undefined {
  const anchor = locateEvent(score, anchorEventId, address)
  const focus = locateEvent(score, focusEventId, address ?? anchor?.address)

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
        eventId: focusEventId,
        address: focus.address
      }
    : {
        type: 'range',
        anchorEventId,
        focusEventId,
        eventIds: selectedEventIds,
        address: anchor.address
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

export function buildRangeClipboard(
  score: Score,
  selection: EditorSelection
): RangeClipboard | undefined {
  const range = locateSelectionRange(score, selection)

  if (!range || !isSimpleRange(range.events)) {
    return undefined
  }

  const startTick = range.events[0].position.tick
  const endTick = eventEndTick(range.events[range.events.length - 1])

  return {
    durationTicks: endTick - startTick,
    eventCount: range.events.length,
    events: range.events.map((event) => ({
      relativeTick: event.position.tick - startTick,
      event
    }))
  }
}

export function buildRangePasteCommand(
  score: Score,
  selection: EditorSelection,
  clipboard: RangeClipboard,
  createId: () => string
): ScoreCommand | undefined {
  const range = locateSelectionRange(score, selection)

  if (
    !range ||
    !isSimpleRange(range.events, { allowFullMeasureRest: true }) ||
    range.voice.tuplets?.length
  ) {
    return undefined
  }

  const startTick = range.events[0].position.tick
  const endTick = eventEndTick(range.events[range.events.length - 1])

  if (endTick - startTick !== clipboard.durationTicks) {
    return undefined
  }

  const selectedIds = new Set(range.events.map((event) => event.id))
  const pastedEvents = clipboard.events.map(({ event, relativeTick }) =>
    cloneClipboardEvent(event, startTick + relativeTick, createId)
  )
  const nextEvents = sortVoiceEvents([
    ...range.voice.events.filter((event) => !selectedIds.has(event.id)),
    ...pastedEvents
  ])
  const nextMeasure = {
    ...range.measure,
    voices: range.measure.voices.map((voice) =>
      voice.id === range.address.voiceId
        ? {
            ...voice,
            events: nextEvents
          }
        : voice
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets({
      ...range.voice,
      events: nextEvents
    }).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target: range.address,
    events: nextEvents,
    editedEventId: pastedEvents[0]?.id
  }
}

export function buildRangeRestCommand(
  score: Score,
  selection: EditorSelection
): ScoreCommand | undefined {
  if (selection.type !== 'range') {
    return undefined
  }

  const range = locateSameMeasureRange(score, selection)

  if (!range || !isSimpleRange(range.events) || range.voice.tuplets?.length) {
    return undefined
  }

  const selectedIds = new Set(range.events.map((event) => event.id))
  const changedEventIds = new Set(
    range.events
      .filter((event) => event.type === 'note')
      .map((event) => event.id)
  )

  if (changedEventIds.size === 0) {
    return undefined
  }

  const nextEvents = sortVoiceEvents(
    range.voice.events.map((event) => {
      if (!selectedIds.has(event.id) || event.type === 'rest') {
        return event
      }

      return {
        type: 'rest',
        id: event.id,
        position: event.position,
        duration: event.duration
      } satisfies Rest
    })
  )
  const nextMeasure = {
    ...range.measure,
    voices: range.measure.voices.map((voice) =>
      voice.id === range.address.voiceId
        ? {
            ...voice,
            events: nextEvents
          }
        : voice
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets({
      ...range.voice,
      events: nextEvents
    }).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target: range.address,
    events: nextEvents,
    editedEventId: range.events[0].id
  }
}

export function buildNoteEntryCommand(
  score: Score,
  selection: EditorSelection,
  step: PitchStep,
  duration: Duration,
  createId: () => string
): ScoreCommand | undefined {
  if (selection.type === 'event') {
    const location = locateEvent(score, selection.eventId, selection.address)

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

  const location = locateMeasure(score, selection.measureId, selection.address)

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
    const location = locateEvent(score, selection.eventId, selection.address)

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

  const location = locateMeasure(score, selection.measureId, selection.address)

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

  const location = locateEvent(score, selection.eventId, selection.address)

  if (!location) {
    return undefined
  }

  if (location.event.duration.tuplet && !duration.tuplet) {
    const command = buildTupletMemberDurationCommand(
      location,
      duration,
      createId
    )

    if (command) {
      return command
    }
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

function buildTupletMemberDurationCommand(
  location: EventLocation,
  duration: Duration,
  createId: () => string
): ScoreCommand | undefined {
  const ratio = location.event.duration.tuplet

  if (!ratio || duration.dots > 0) {
    return undefined
  }

  const voice = location.measure.voices.find(
    (candidate) => candidate.id === location.address.voiceId
  )
  const group = voice?.tuplets?.find((candidate) =>
    candidate.eventIds.includes(location.event.id)
  )

  if (!voice || !group) {
    return undefined
  }

  const events = sortVoiceEvents(voice.events)
  const members = group.eventIds
    .map((eventId) => events.find((event) => event.id === eventId))
    .filter((event): event is VoiceEvent => Boolean(event))
  const selectedIndex = members.findIndex(
    (member) => member.id === location.event.id
  )

  if (selectedIndex === -1 || members.length !== group.eventIds.length) {
    return undefined
  }

  const nextDuration: Duration = {
    ...duration,
    tuplet: ratio
  }
  const currentBaseTicks = durationToTicks({
    ...location.event.duration,
    tuplet: undefined
  })
  const nextBaseTicks = durationToTicks(duration)

  if (nextBaseTicks < currentBaseTicks) {
    return buildShrunkenTupletMemberDurationCommand(
      location,
      voice,
      group,
      events,
      members,
      selectedIndex,
      duration,
      createId
    )
  }

  let baseTicksToConsume = nextBaseTicks - currentBaseTicks

  if (baseTicksToConsume <= 0) {
    return undefined
  }

  const consumedEventIds = new Set<string>()

  for (let index = selectedIndex + 1; index < members.length; index += 1) {
    const member = members[index]
    const memberBaseTicks = durationToTicks({
      ...member.duration,
      tuplet: undefined
    })

    if (member.type !== 'rest' || memberBaseTicks > baseTicksToConsume) {
      return undefined
    }

    consumedEventIds.add(member.id)
    baseTicksToConsume -= memberBaseTicks

    if (baseTicksToConsume === 0) {
      if (index !== members.length - 1) {
        return undefined
      }

      break
    }
  }

  if (baseTicksToConsume !== 0 || consumedEventIds.size === 0) {
    return undefined
  }

  const memberIdSet = new Set(group.eventIds)
  const nextMembers = members.filter(
    (member) => !consumedEventIds.has(member.id)
  )
  let tick = members[0].position.tick
  const rewrittenMembers = nextMembers.map((member) => {
    const rewrittenDuration =
      member.id === location.event.id ? nextDuration : member.duration
    const rewritten = {
      ...member,
      ...(member.type === 'rest' ? { fullMeasure: undefined } : {}),
      position: createTimePosition(tick),
      duration: rewrittenDuration
    } satisfies VoiceEvent

    tick += durationToTicks(rewrittenDuration)
    return rewritten
  })
  const nextTuplets = (voice.tuplets ?? []).map((candidate) =>
    candidate.id === group.id
      ? {
          ...candidate,
          eventIds: rewrittenMembers.map((member) => member.id)
        }
      : candidate
  )
  const nextEvents = [
    ...events.filter((event) => !memberIdSet.has(event.id)),
    ...rewrittenMembers
  ]
  const nextVoice = {
    ...voice,
    events: sortVoiceEvents(nextEvents),
    tuplets: nextTuplets
  }
  const nextMeasure = {
    ...location.measure,
    voices: location.measure.voices.map((candidate) =>
      candidate.id === voice.id ? nextVoice : candidate
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets(nextVoice).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-content.replace',
    target: location.address,
    events: nextVoice.events,
    tuplets: nextVoice.tuplets,
    editedEventId: location.event.id
  }
}

function buildShrunkenTupletMemberDurationCommand(
  location: EventLocation,
  voice: NonNullable<Measure['voices'][number]>,
  group: NonNullable<Measure['voices'][number]['tuplets']>[number],
  events: VoiceEvent[],
  members: VoiceEvent[],
  selectedIndex: number,
  duration: Duration,
  createId: () => string
): ScoreCommand | undefined {
  const ratio = location.event.duration.tuplet

  if (!ratio) {
    return undefined
  }

  const memberBaseTicks = members.map((member) =>
    durationToTicks({
      ...member.duration,
      tuplet: undefined
    })
  )
  const slotBaseTicks = Math.min(...memberBaseTicks)
  const nextBaseTicks = durationToTicks(duration)

  if (nextBaseTicks !== slotBaseTicks) {
    return undefined
  }

  const selectedMember = members[selectedIndex]
  const currentBaseTicks = memberBaseTicks[selectedIndex]
  const releasedBaseTicks = currentBaseTicks - nextBaseTicks
  const restDurations = decomposeDurationTicks(releasedBaseTicks)

  if (!selectedMember || !restDurations?.length) {
    return undefined
  }

  const nextDuration: Duration = {
    ...duration,
    tuplet: ratio
  }
  const insertedRests: VoiceEvent[] = []
  let tick = selectedMember.position.tick + durationToTicks(nextDuration)

  restDurations.forEach((restDuration) => {
    const tupletRestDuration: Duration = {
      ...restDuration,
      tuplet: ratio
    }

    insertedRests.push(
      createRest({
        id: createId(),
        position: createTimePosition(tick),
        duration: tupletRestDuration
      })
    )
    tick += durationToTicks(tupletRestDuration)
  })

  const memberIdSet = new Set(group.eventIds)
  const rewrittenMembers = members.flatMap((member) => {
    if (member.id !== selectedMember.id) {
      return [member]
    }

    const rewritten = {
      ...member,
      ...(member.type === 'rest' ? { fullMeasure: undefined } : {}),
      duration: nextDuration
    } satisfies VoiceEvent

    return [rewritten, ...insertedRests]
  })
  const nextTuplets = (voice.tuplets ?? []).map((candidate) =>
    candidate.id === group.id
      ? {
          ...candidate,
          eventIds: rewrittenMembers.map((member) => member.id)
        }
      : candidate
  )
  const nextVoice = {
    ...voice,
    events: sortVoiceEvents([
      ...events.filter((event) => !memberIdSet.has(event.id)),
      ...rewrittenMembers
    ]),
    tuplets: nextTuplets
  }
  const nextMeasure = {
    ...location.measure,
    voices: location.measure.voices.map((candidate) =>
      candidate.id === voice.id ? nextVoice : candidate
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets(nextVoice).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-content.replace',
    target: location.address,
    events: nextVoice.events,
    tuplets: nextVoice.tuplets,
    editedEventId: location.event.id
  }
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

  const location = locateEvent(score, selection.eventId, selection.address)

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

  const location = locateEvent(score, selection.eventId, selection.address)
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

  const location = locateEvent(score, selection.eventId, selection.address)

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
  const range = locateSameMeasureRange(score, selection)

  if (!range || !isSimpleRange(range.events) || range.voice.tuplets?.length) {
    return undefined
  }

  const events = sortVoiceEvents(range.voice.events)
  const firstEvent = range.events[0]
  const lastEvent = range.events[range.events.length - 1]
  const firstIndex = events.findIndex((event) => event.id === firstEvent.id)
  const lastIndex = events.findIndex((event) => event.id === lastEvent.id)

  if (firstIndex === -1 || lastIndex === -1) {
    return undefined
  }

  const removeIds = new Set(range.events.map((event) => event.id))
  let endTick = eventEndTick(lastEvent)

  for (const event of events.slice(lastIndex + 1)) {
    if (
      event.type !== 'rest' ||
      event.duration.tuplet ||
      event.position.tick !== endTick
    ) {
      break
    }

    removeIds.add(event.id)
    endTick = eventEndTick(event)
  }

  let generatedRestIndex = 0
  const restEvents = createRestsForSpan(
    firstEvent.position.tick,
    endTick,
    () => `${firstEvent.id}-delete-rest-${++generatedRestIndex}`,
    firstEvent.id
  )

  if (restEvents.length === 0) {
    return undefined
  }

  const nextEvents = sortVoiceEvents([
    ...events.filter((event) => !removeIds.has(event.id)),
    ...restEvents
  ])
  const nextMeasure = {
    ...range.measure,
    voices: range.measure.voices.map((voice) =>
      voice.id === range.address.voiceId
        ? {
            ...voice,
            events: nextEvents
          }
        : voice
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets({
      ...range.voice,
      events: nextEvents
    }).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target: range.address,
    events: nextEvents,
    editedEventId: restEvents[0].id
  }
}

export function getAdjacentEventId(
  score: Score,
  eventId: string,
  direction: -1 | 1,
  address?: VoiceAddress
): string | undefined {
  const eventIds = address
    ? getVoiceEventIds(score, address)
    : getScoreEventIds(score)
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

function locateSameMeasureRange(
  score: Score,
  selection: Extract<EditorSelection, { type: 'range' }>
):
  | {
      address: VoiceAddress
      measure: Measure
      voice: Measure['voices'][number]
      events: VoiceEvent[]
  }
  | undefined {
  const locations = selection.eventIds.map((eventId) =>
    locateEvent(score, eventId, selection.address)
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

  const voice = first.measure.voices.find(
    (candidate) => candidate.id === first.address.voiceId
  )

  if (!voice) {
    return undefined
  }

  const selectedIds = new Set(selection.eventIds)
  const events = sortVoiceEvents(voice.events).filter((event) =>
    selectedIds.has(event.id)
  )

  if (events.length !== selection.eventIds.length) {
    return undefined
  }

  return {
    address: first.address,
    measure: first.measure,
    voice,
    events
  }
}

function locateSelectionRange(
  score: Score,
  selection: EditorSelection
):
  | {
      address: VoiceAddress
      measure: Measure
      voice: Measure['voices'][number]
      events: VoiceEvent[]
    }
  | undefined {
  if (selection.type === 'range') {
    return locateSameMeasureRange(score, selection)
  }

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

  return {
    address: location.address,
    measure: location.measure,
    voice,
    events: [location.event]
  }
}

function isSimpleRange(
  events: VoiceEvent[],
  options: { allowFullMeasureRest?: boolean } = {}
): boolean {
  return events.every((event) => {
    if (event.duration.tuplet) {
      return false
    }

    if (event.type === 'rest') {
      return options.allowFullMeasureRest || !event.fullMeasure
    }

    return !event.ties?.start && !event.ties?.stop
  })
}

function cloneClipboardEvent(
  event: VoiceEvent,
  tick: number,
  createId: () => string
): VoiceEvent {
  if (event.type === 'rest') {
    return {
      type: 'rest',
      id: createId(),
      position: createTimePosition(tick),
      duration: {
        ...event.duration
      }
    } satisfies Rest
  }

  return {
    type: 'note',
    id: createId(),
    position: createTimePosition(tick),
    pitch: {
      ...event.pitch
    },
    duration: {
      ...event.duration
    }
  } satisfies Note
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

  if (members.length !== group.eventIds.length || members.length === 0) {
    return undefined
  }

  const firstMember = members[0]
  const firstTupletDuration = firstMember.duration

  if (!firstTupletDuration.tuplet || firstTupletDuration.dots > 0) {
    return undefined
  }

  const baseDurations = members.map((member) => ({
    ...member.duration,
    tuplet: undefined
  }))
  const memberTicks = members.map((member) => durationToTicks(member.duration))
  const regularTicks = baseDurations.map((duration) =>
    durationToTicks(duration)
  )
  const startTick = firstMember.position.tick
  const currentEndTick =
    startTick + memberTicks.reduce((sum, ticks) => sum + ticks, 0)
  const expandedEndTick =
    startTick + regularTicks.reduce((sum, ticks) => sum + ticks, 0)
  let expectedTick = startTick

  if (
    members.some(
      (event, index) => {
        const isInvalid =
          event.position.tick !== expectedTick ||
          event.duration.dots > 0 ||
          event.duration.tuplet?.actualNotes !== group.actualNotes ||
          event.duration.tuplet.normalNotes !== group.normalNotes ||
          (event.type === 'note' && (event.ties?.start || event.ties?.stop))

        expectedTick += memberTicks[index]
        return isInvalid
      }
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
      const converted = createUntupledMembers(
        members,
        baseDurations,
        startTick
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
    regularTicks,
    baseDurations,
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
  regularTicks: number[],
  baseDurations: Duration[],
  startTick: number,
  endTick: number
): ScoreCommand | undefined {
  const memberIds = new Set(group.eventIds)
  const converted: VoiceEvent[] = []
  let tick = startTick

  for (let index = 0; index < members.length; index += 1) {
    const event = members[index]
    const baseDuration = baseDurations[index]
    const baseTicks = regularTicks[index]

    if (tick + baseTicks > endTick) {
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
    tick += baseTicks
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

function createUntupledMembers(
  members: VoiceEvent[],
  baseDurations: Duration[],
  startTick: number
): VoiceEvent[] {
  let tick = startTick

  return members.map((event, index) => {
    const duration = baseDurations[index]
    const converted =
      event.type === 'rest'
        ? createRest({
            id: event.id,
            position: createTimePosition(tick),
            duration
          })
        : createNote({
            id: event.id,
            position: createTimePosition(tick),
            duration,
            pitch: event.pitch
          })

    tick += durationToTicks(duration)
    return converted
  })
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
