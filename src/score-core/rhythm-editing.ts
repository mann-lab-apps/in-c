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

  if (!validateMeasureRhythm(nextMeasure).isExact) {
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

  if (!location || !event || event.type === 'rest') {
    return undefined
  }

  const durationTicks = voiceEventDurationTicks(event, location.measure)
  const isFullMeasure =
    event.position.tick === 0 &&
    durationTicks === measureDurationTicks(location.measure)
  const rest = isFullMeasure
    ? createFullMeasureRest({
        id: event.id,
        position: event.position
      })
    : createRest({
        id: event.id,
        position: event.position,
        duration: event.duration
      })

  return buildRhythmEditCommand(score, {
    target,
    eventId,
    event: rest,
    createId: () => {
      throw new Error('Deleting an event does not create additional rests.')
    }
  })
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
