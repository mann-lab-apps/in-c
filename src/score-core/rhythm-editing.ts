import { createFullMeasureRest, createNote, createRest } from './factories'
import {
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents,
  validateMeasureRhythm,
  voiceEventDurationTicks
} from './timing'
import type {
  Duration,
  DurationValue,
  Measure,
  Note,
  Score,
  ScoreCommand,
  Tick,
  Voice,
  VoiceAddress,
  VoiceEvent
} from './types'
import { validateVoiceTuplets } from './tuplets'

interface RhythmEditInput {
  target: VoiceAddress
  eventId: string
  event: VoiceEvent
  createId: () => string
}

interface VoiceLocation {
  measure: Measure
  voice: Voice
}

const durationValues: DurationValue[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th',
  '32nd',
  '64th'
]

const restDurationCandidates = durationValues
  .flatMap((value) =>
    [0, 1, 2, 3].map((dots) => ({
      duration: {
        value,
        dots
      } satisfies Duration,
      ticks: durationToTicks({
        value,
        dots
      })
    }))
  )
  .sort(
    (left, right) =>
      right.ticks - left.ticks ||
      left.duration.dots - right.duration.dots
  )

export function buildRhythmEditCommand(
  score: Score,
  input: RhythmEditInput
): ScoreCommand | undefined {
  const location = locateVoice(score, input.target)

  if (!location || !validateMeasureRhythm(location.measure).isExact) {
    return undefined
  }

  const events = sortVoiceEvents(location.voice.events)
  const eventIndex = events.findIndex((event) => event.id === input.eventId)

  if (eventIndex === -1) {
    return undefined
  }

  const currentEvent = events[eventIndex]
  const startTick = currentEvent.position.tick
  const currentEndTick =
    startTick + voiceEventDurationTicks(currentEvent, location.measure)
  const replacement = normalizeReplacement(
    input.event,
    currentEvent.id,
    startTick
  )
  const replacementEndTick =
    startTick + voiceEventDurationTicks(replacement, location.measure)
  const measureEndTick = measureDurationTicks(location.measure)

  if (replacementEndTick > measureEndTick) {
    return undefined
  }

  const before = events.slice(0, eventIndex)
  const after = events.slice(eventIndex + 1)
  let nextAfter = after
  let fillEvents: VoiceEvent[] = []

  if (replacementEndTick < currentEndTick) {
    if (currentEvent.type === 'rest' && replacement.type === 'rest') {
      const releasedTicks = currentEndTick - replacementEndTick
      nextAfter = shiftEvents(after, -releasedTicks)
      fillEvents = createRestsForSpan({
        measure: location.measure,
        startTick: measureEndTick - releasedTicks,
        endTick: measureEndTick,
        createId: input.createId
      })
    } else {
      fillEvents = createRestsForSpan({
        measure: location.measure,
        startTick: replacementEndTick,
        endTick: currentEndTick,
        createId: input.createId
      })
    }
  } else if (replacementEndTick > currentEndTick) {
    const consumed = consumeFollowingRests({
      events: after,
      measure: location.measure,
      startTick: currentEndTick,
      endTick: replacementEndTick,
      createId: input.createId
    })

    if (!consumed) {
      return undefined
    }

    fillEvents = consumed.remainder
    nextAfter = consumed.events
  }

  const nextEvents = sortVoiceEvents([
    ...before,
    replacement,
    ...fillEvents,
    ...nextAfter
  ])
  const nextMeasure = {
    ...location.measure,
    voices: location.measure.voices.map((voice) =>
      voice.id === location.voice.id
        ? {
            ...voice,
            events: nextEvents
          }
        : voice
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets(
      nextMeasure.voices.find((voice) => voice.id === location.voice.id)!
    ).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target: input.target,
    events: nextEvents,
    editedEventId: replacement.id
  }
}

function compactAdjacentRests(
  events: VoiceEvent[],
  measure: Measure,
  createId: () => string
): VoiceEvent[] {
  const compactedEvents: VoiceEvent[] = []
  const sortedEvents = sortVoiceEvents(events)

  for (let index = 0; index < sortedEvents.length; index += 1) {
    const event = sortedEvents[index]

    if (event.type !== 'rest' || event.duration.tuplet) {
      compactedEvents.push(event)
      continue
    }

    let endIndex = index
    let endTick = eventEndTick(event, measure)

    while (
      endIndex < sortedEvents.length - 1 &&
      sortedEvents[endIndex + 1].type === 'rest' &&
      !sortedEvents[endIndex + 1].duration.tuplet &&
      sortedEvents[endIndex + 1].position.tick === endTick
    ) {
      endIndex += 1
      endTick = eventEndTick(sortedEvents[endIndex], measure)
    }

    if (endIndex === index) {
      compactedEvents.push(event)
      continue
    }

    compactedEvents.push(
      ...createRestsForSpan({
        measure,
        startTick: event.position.tick,
        endTick,
        firstId: event.id,
        createId
      })
    )
    index = endIndex
  }

  return sortVoiceEvents(compactedEvents)
}

export function buildRhythmDeleteCommand(
  score: Score,
  target: VoiceAddress,
  eventId: string
): ScoreCommand | undefined {
  const location = locateVoice(score, target)
  const event = location?.voice.events.find(
    (candidate) => candidate.id === eventId
  )

  if (!location || !event || !validateMeasureRhythm(location.measure).isExact) {
    return undefined
  }

  if (event.type === 'note' && (event.ties?.start || event.ties?.stop)) {
    return undefined
  }

  const events = sortVoiceEvents(location.voice.events)
  const eventIndex = events.findIndex((candidate) => candidate.id === eventId)

  if (eventIndex === -1) {
    return undefined
  }

  if (event.duration.tuplet) {
    return undefined
  }

  const durationTicks = voiceEventDurationTicks(event, location.measure)
  const nextEvents =
    event.position.tick === 0
      ? deleteLeadingEvent({
          events,
          eventIndex,
          event,
          measure: location.measure,
          durationTicks
        })
      : deleteEventIntoPreviousEvent({
          events,
          eventIndex,
          event,
          measure: location.measure,
          durationTicks
        })

  if (!nextEvents) {
    return undefined
  }

  const nextMeasure = {
    ...location.measure,
    voices: location.measure.voices.map((voice) =>
      voice.id === location.voice.id
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
      ...location.voice,
      events: nextEvents
    }).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target,
    events: nextEvents
  }
}

function deleteLeadingEvent(input: {
  events: VoiceEvent[]
  eventIndex: number
  event: VoiceEvent
  measure: Measure
  durationTicks: number
}): VoiceEvent[] {
  const measureEndTick = measureDurationTicks(input.measure)
  const createId = inputIdFromEvent(input.event.id)
  const shiftedAfter = shiftEvents(
    input.events.slice(input.eventIndex + 1),
    -input.durationTicks
  )
  const trailingRests = createRestsForSpan({
    measure: input.measure,
    startTick: measureEndTick - input.durationTicks,
    endTick: measureEndTick,
    firstId: input.event.id,
    createId
  })

  return compactAdjacentRests(
    sortVoiceEvents([...shiftedAfter, ...trailingRests]),
    input.measure,
    createId
  )
}

function deleteEventIntoPreviousEvent(input: {
  events: VoiceEvent[]
  eventIndex: number
  event: VoiceEvent
  measure: Measure
  durationTicks: number
}): VoiceEvent[] | undefined {
  const previousEvent = input.events[input.eventIndex - 1]

  if (previousEvent.type === 'note') {
    if (previousEvent.duration.tuplet || previousEvent.ties) {
      return undefined
    }

    const tiedEvents = createTiedAbsorptionEvents({
      previousEvent,
      absorbedEvent: input.event,
      measure: input.measure,
      createId: inputIdFromEvent(input.event.id)
    })

    return tiedEvents
      ? sortVoiceEvents([
          ...input.events.slice(0, input.eventIndex - 1),
          ...tiedEvents,
          ...input.events.slice(input.eventIndex + 1)
        ])
      : undefined
  }

  const createId = inputIdFromEvent(previousEvent.id)
  const mergedRests = createRestsForSpan({
    measure: input.measure,
    startTick: previousEvent.position.tick,
    endTick: eventEndTick(input.event, input.measure),
    firstId: previousEvent.id,
    createId
  })

  if (mergedRests.length === 0) {
    return undefined
  }

  return compactAdjacentRests(
    sortVoiceEvents([
      ...input.events.slice(0, input.eventIndex - 1),
      ...mergedRests,
      ...input.events.slice(input.eventIndex + 1)
    ]),
    input.measure,
    createId
  )
}

function createTiedAbsorptionEvents(input: {
  previousEvent: Note
  absorbedEvent: VoiceEvent
  measure: Measure
  createId: () => string
}): Note[] | undefined {
  const durations = decomposeDurationTicks(
    voiceEventDurationTicks(input.absorbedEvent, input.measure)
  )

  if (!durations || durations.length === 0) {
    return undefined
  }

  const notes: Note[] = [
    {
      ...input.previousEvent,
      ties: { start: true }
    }
  ]
  let tick = input.absorbedEvent.position.tick

  durations.forEach((duration, index) => {
    const hasNext = index < durations.length - 1

    notes.push(
      createNote({
        id: index === 0 ? input.absorbedEvent.id : input.createId(),
        position: { tick },
        pitch: input.previousEvent.pitch,
        duration,
        ties: {
          stop: true,
          start: hasNext || undefined
        }
      })
    )
    tick += durationToTicks(duration)
  })

  return notes
}

function inputIdFromEvent(eventId: string): () => string {
  let index = 0

  return () => `${eventId}-trailing-rest-${++index}`
}

function eventEndTick(event: VoiceEvent, measure: Measure): Tick {
  return event.position.tick + voiceEventDurationTicks(event, measure)
}

function shiftEvents(events: VoiceEvent[], deltaTicks: number): VoiceEvent[] {
  return events.map((event) => ({
    ...event,
    position: {
      ...event.position,
      tick: event.position.tick + deltaTicks
    }
  }))
}

function consumeFollowingRests(input: {
  events: VoiceEvent[]
  measure: Measure
  startTick: Tick
  endTick: Tick
  createId: () => string
}): { events: VoiceEvent[]; remainder: VoiceEvent[] } | undefined {
  let coveredUntil = input.startTick
  let consumedCount = 0
  let trailingRest: VoiceEvent | undefined
  let trailingEndTick = coveredUntil

  for (const event of input.events) {
    if (coveredUntil >= input.endTick) {
      break
    }

    if (event.type !== 'rest' || event.position.tick !== coveredUntil) {
      return undefined
    }

    trailingRest = event
    trailingEndTick =
      event.position.tick + voiceEventDurationTicks(event, input.measure)
    coveredUntil = trailingEndTick
    consumedCount += 1
  }

  if (coveredUntil < input.endTick) {
    return undefined
  }

  const remainder =
    trailingRest && trailingEndTick > input.endTick
      ? createRestsForSpan({
          measure: input.measure,
          startTick: input.endTick,
          endTick: trailingEndTick,
          createId: input.createId,
          firstId: trailingRest.id
        })
      : []

  return {
    events: input.events.slice(consumedCount),
    remainder
  }
}

function createRestsForSpan(input: {
  measure: Measure
  startTick: Tick
  endTick: Tick
  createId: () => string
  firstId?: string
}): VoiceEvent[] {
  const durationTicks = input.endTick - input.startTick

  if (durationTicks <= 0) {
    return []
  }

  if (
    input.startTick === 0 &&
    durationTicks === measureDurationTicks(input.measure)
  ) {
    return [
      createFullMeasureRest({
        id: input.firstId ?? input.createId()
      })
    ]
  }

  const durations = decomposeDurationTicks(durationTicks)

  if (!durations) {
    return []
  }

  let tick = input.startTick

  return durations.map((duration, index) => {
    const rest = createRest({
      id: index === 0 && input.firstId ? input.firstId : input.createId(),
      position: {
        tick
      },
      duration
    })

    tick += durationToTicks(duration)
    return rest
  })
}

export function decomposeDurationTicks(
  totalTicks: Tick
): Duration[] | undefined {
  const cache = new Map<Tick, Duration[] | undefined>()

  function visit(remainingTicks: Tick): Duration[] | undefined {
    if (remainingTicks === 0) {
      return []
    }

    if (cache.has(remainingTicks)) {
      return cache.get(remainingTicks)
    }

    for (const candidate of restDurationCandidates) {
      if (candidate.ticks > remainingTicks) {
        continue
      }

      const remainder = visit(remainingTicks - candidate.ticks)

      if (remainder) {
        const result = [candidate.duration, ...remainder]
        cache.set(remainingTicks, result)
        return result
      }
    }

    cache.set(remainingTicks, undefined)
    return undefined
  }

  return visit(totalTicks)
}

function normalizeReplacement(
  event: VoiceEvent,
  id: string,
  tick: Tick
): VoiceEvent {
  if (event.type === 'rest') {
    return {
      ...event,
      id,
      position: {
        tick
      },
      fullMeasure: event.fullMeasure
    }
  }

  return {
    ...event,
    id,
    position: {
      tick
    }
  }
}

function locateVoice(
  score: Score,
  target: VoiceAddress
): VoiceLocation | undefined {
  const part = score.parts.find((candidate) => candidate.id === target.partId)
  const staff = part?.staves.find(
    (candidate) => candidate.id === target.staffId
  )
  const measure = staff?.measures.find(
    (candidate) => candidate.id === target.measureId
  )
  const voice = measure?.voices.find(
    (candidate) => candidate.id === target.voiceId
  )

  return measure && voice
    ? {
        measure,
        voice
      }
    : undefined
}
