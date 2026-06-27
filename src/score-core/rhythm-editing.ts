import { createFullMeasureRest, createRest } from './factories'
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
    fillEvents = createRestsForSpan({
      measure: location.measure,
      startTick: replacementEndTick,
      endTick: currentEndTick,
      createId: input.createId
    })
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

  if (event.type === 'note' && event.duration.tuplet) {
    const replacement = createEquivalentRest(event, location.measure)
    const nextEvents = sortVoiceEvents(
      events.map((candidate) =>
        candidate.id === event.id ? replacement : candidate
      )
    )
    const nextVoice = {
      ...location.voice,
      events: nextEvents
    }
    const nextMeasure = {
      ...location.measure,
      voices: location.measure.voices.map((voice) =>
        voice.id === location.voice.id ? nextVoice : voice
      )
    }

    if (
      !validateMeasureRhythm(nextMeasure).isExact ||
      validateVoiceTuplets(nextVoice).length > 0
    ) {
      return undefined
    }

    return {
      type: 'voice-events.replace',
      target,
      events: nextEvents,
      editedEventId: event.id
    }
  }

  const nextEvents = events.map((candidate) =>
    candidate.id === event.id && candidate.type === 'note'
      ? createEquivalentRest(candidate, location.measure)
      : candidate
  )
  const restRun = findRestRun(nextEvents, location.measure, event.id)

  if (!restRun || (event.type === 'rest' && restRun.startIndex === restRun.endIndex)) {
    return undefined
  }

  const runStartTick = nextEvents[restRun.startIndex].position.tick
  const runEndTick = eventEndTick(
    nextEvents[restRun.endIndex],
    location.measure
  )
  const createMergedRestId = createRestRunIdGenerator({
    eventId: event.id,
    events,
    restRunEvents: nextEvents.slice(restRun.startIndex, restRun.endIndex + 1)
  })
  const mergedRests = createRestsForSpan({
    measure: location.measure,
    startTick: runStartTick,
    endTick: runEndTick,
    firstId: event.id,
    createId: createMergedRestId
  })

  if (mergedRests.length === 0) {
    return undefined
  }

  const mergedEvents = sortVoiceEvents([
    ...nextEvents.slice(0, restRun.startIndex),
    ...mergedRests,
    ...nextEvents.slice(restRun.endIndex + 1)
  ])
  const nextMeasure = {
    ...location.measure,
    voices: location.measure.voices.map((voice) =>
      voice.id === location.voice.id
        ? {
            ...voice,
            events: mergedEvents
          }
        : voice
    )
  }

  if (
    !validateMeasureRhythm(nextMeasure).isExact ||
    validateVoiceTuplets({
      ...location.voice,
      events: mergedEvents
    }).length > 0
  ) {
    return undefined
  }

  return {
    type: 'voice-events.replace',
    target,
    events: mergedEvents,
    editedEventId: event.id
  }
}

function createRestRunIdGenerator(input: {
  eventId: string
  events: VoiceEvent[]
  restRunEvents: VoiceEvent[]
}): () => string {
  const usedIds = new Set(input.events.map((event) => event.id))
  const reusableIds = input.restRunEvents
    .map((event) => event.id)
    .filter((id) => id !== input.eventId)

  return () => {
    const reusableId = reusableIds.shift()

    if (reusableId) {
      return reusableId
    }

    for (let index = 1; ; index += 1) {
      const id = `${input.eventId}-merged-rest-${index}`

      if (!usedIds.has(id)) {
        usedIds.add(id)
        return id
      }
    }
  }
}

function createEquivalentRest(event: VoiceEvent, measure: Measure): VoiceEvent {
  const durationTicks = voiceEventDurationTicks(event, measure)
  const isFullMeasure =
    event.position.tick === 0 && durationTicks === measureDurationTicks(measure)

  return isFullMeasure
    ? createFullMeasureRest({
        id: event.id,
        position: event.position
      })
    : createRest({
        id: event.id,
        position: event.position,
        duration: event.duration
      })
}

function findRestRun(
  events: VoiceEvent[],
  measure: Measure,
  eventId: string
): { startIndex: number; endIndex: number } | undefined {
  const eventIndex = events.findIndex((event) => event.id === eventId)

  if (eventIndex === -1 || events[eventIndex].type !== 'rest') {
    return undefined
  }

  let startIndex = eventIndex
  let endIndex = eventIndex

  while (
    startIndex > 0 &&
    events[startIndex - 1].type === 'rest' &&
    eventEndTick(events[startIndex - 1], measure) ===
      events[startIndex].position.tick
  ) {
    startIndex -= 1
  }

  while (
    endIndex < events.length - 1 &&
    events[endIndex + 1].type === 'rest' &&
    eventEndTick(events[endIndex], measure) ===
      events[endIndex + 1].position.tick
  ) {
    endIndex += 1
  }

  return {
    startIndex,
    endIndex
  }
}

function eventEndTick(event: VoiceEvent, measure: Measure): Tick {
  return event.position.tick + voiceEventDurationTicks(event, measure)
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
