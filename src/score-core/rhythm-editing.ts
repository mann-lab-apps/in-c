import { createFullMeasureRest, createNote, createRest } from './factories'
import { resolveNotePitch } from './pitch'
import {
  TICKS_PER_QUARTER,
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents,
  validateMeasureRhythm,
  voiceEventDurationTicks
} from './timing'
import { validateTieRelations } from './ties'
import type {
  Duration,
  DurationValue,
  Measure,
  Score,
  ScoreCommand,
  Staff,
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
    const growthTicks = replacementEndTick - currentEndTick
    const consumed = consumeFollowingRests({
      events: after,
      measure: location.measure,
      startTick: currentEndTick,
      endTick: replacementEndTick,
      createId: input.createId
    })

    if (consumed) {
      fillEvents = consumed.remainder
      nextAfter = consumed.events
    } else {
      const shiftedAfter = shiftEvents(after, growthTicks)
      const consumedTrailing = consumeMeasureEndRests({
        events: shiftedAfter,
        measure: location.measure,
        startTick: measureEndTick,
        endTick: measureEndTick + growthTicks,
        createId: input.createId
      })

      if (!consumedTrailing) {
        return undefined
      }

      nextAfter = consumedTrailing.events
    }
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

  const events = sortVoiceEvents(location.voice.events)
  const eventIndex = events.findIndex((candidate) => candidate.id === eventId)

  if (eventIndex === -1) {
    return undefined
  }

  if (event.duration.tuplet) {
    return undefined
  }

  const nextEvents = replaceDeletedEventWithFollowingRestSpan({
    events,
    eventIndex,
    event,
    measure: location.measure
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

  return buildTieNormalizedReplaceCommand(score, target, nextEvents)
}

function replaceDeletedEventWithFollowingRestSpan(input: {
  events: VoiceEvent[]
  eventIndex: number
  event: VoiceEvent
  measure: Measure
}): VoiceEvent[] | undefined {
  const createId = inputIdFromEvent(input.event.id)
  const deletedStartTick = input.event.position.tick
  let deletedEndTick = eventEndTick(input.event, input.measure)
  let consumedFollowingRestCount = 0
  const after = input.events.slice(input.eventIndex + 1)

  for (const event of after) {
    if (
      event.type !== 'rest' ||
      event.duration.tuplet ||
      event.position.tick !== deletedEndTick
    ) {
      break
    }

    deletedEndTick = eventEndTick(event, input.measure)
    consumedFollowingRestCount += 1
  }

  const replacementRests = createRestsForSpan({
    measure: input.measure,
    startTick: deletedStartTick,
    endTick: deletedEndTick,
    firstId: input.event.id,
    createId
  })

  if (replacementRests.length === 0) {
    return undefined
  }

  return compactAdjacentRests(
    sortVoiceEvents([
      ...input.events.slice(0, input.eventIndex),
      ...replacementRests,
      ...after.slice(consumedFollowingRestCount)
    ]),
    input.measure,
    createId
  )
}

function buildTieNormalizedReplaceCommand(
  score: Score,
  target: VoiceAddress,
  targetEvents: VoiceEvent[]
): ScoreCommand | undefined {
  const nextScore = replaceVoiceEventsInScore(score, target, targetEvents)
  const normalizedVoice = normalizeTieRelationsForVoice(nextScore, target)

  if (!normalizedVoice) {
    return undefined
  }

  const commands: ScoreCommand[] = []

  for (const measure of normalizedVoice.measures) {
    const voice = measure.voices.find(
      (candidate) => candidate.id === target.voiceId
    )

    if (!voice) {
      return undefined
    }

    if (
      !validateMeasureRhythm(measure).isExact ||
      validateVoiceTuplets(voice).length > 0
    ) {
      return undefined
    }

    const previousEvents = getVoiceEvents(score, {
      ...target,
      measureId: measure.id
    })

    if (!previousEvents || sameEvents(previousEvents, voice.events)) {
      continue
    }

    commands.push({
      type: 'voice-events.replace',
      target: {
        ...target,
        measureId: measure.id
      },
      events: voice.events
    })
  }

  if (commands.length === 0) {
    return undefined
  }

  const normalizedScore = replaceMeasuresInScore(
    score,
    target,
    normalizedVoice.measures
  )

  if (validateTieRelations(normalizedScore).length > 0) {
    return undefined
  }

  // Rhythm edits can remove rest anchors or replace a note anchor with a rest.
  // Keep cleanup in the same transaction so undo also restores the markings.
  const previousEvents = locateStaff(score, target)?.measures.flatMap(measure =>
    measure.voices.find(voice => voice.id === target.voiceId)?.events ?? []
  ) ?? []
  const nextEvents = normalizedVoice.measures.flatMap(measure =>
    measure.voices.find(voice => voice.id === target.voiceId)?.events ?? [])
  commands.push(...buildSpanCleanupCommands(score, previousEvents, nextEvents))

  return commands.length === 1
    ? commands[0]
    : { type: 'score.batch', commands }
}

export function buildSpanCleanupCommands(score: Score, previousEvents: VoiceEvent[], replacementEvents: VoiceEvent[]): ScoreCommand[] {
  const commands: ScoreCommand[] = []
  const nextEvents = new Map(replacementEvents.map(event => [event.id, event]))
  const removedIds = new Set(previousEvents.filter(event => !nextEvents.has(event.id)).map(event => event.id))
  const invalidNoteIds = new Set(previousEvents.filter(event => nextEvents.get(event.id)?.type !== 'note').map(event => event.id))
  const keepsEndpoints = (ids: Set<string>) => (span: { startEventId: string; endEventId: string }) =>
    !ids.has(span.startEventId) && !ids.has(span.endEventId)
  const slurs = score.slurs?.filter(keepsEndpoints(invalidNoteIds))
  const hairpins = score.hairpins?.filter(keepsEndpoints(removedIds))
  const octaveShifts = score.octaveShifts?.filter(keepsEndpoints(invalidNoteIds))
  if (slurs?.length !== score.slurs?.length) commands.push({ type: 'score-slurs.update', slurs })
  if (hairpins?.length !== score.hairpins?.length) commands.push({ type: 'score-hairpins.update', hairpins })
  if (octaveShifts?.length !== score.octaveShifts?.length) commands.push({ type: 'score-octave-shifts.update', octaveShifts })

  return commands
}

function normalizeTieRelationsForVoice(
  score: Score,
  target: VoiceAddress
): { measures: Measure[] } | undefined {
  const staff = locateStaff(score, target)

  if (!staff) {
    return undefined
  }

  const locations = staff.measures.flatMap((measure) => {
    const voice = measure.voices.find(
      (candidate) => candidate.id === target.voiceId
    )

    return voice
      ? sortVoiceEvents(voice.events).map((event) => ({
          measure,
          voice,
          event
        }))
      : []
  })
  const nextEventsById = new Map<string, VoiceEvent>()

  locations.forEach((location, index) => {
    if (location.event.type !== 'note') {
      nextEventsById.set(location.event.id, location.event)
      return
    }

    const previous = locations[index - 1]
    const next = locations[index + 1]
    const ties = {
      stop:
        location.event.ties?.stop &&
        previous?.event.type === 'note' &&
        previous.event.ties?.start &&
        areAdjacentEqualPitch(previous, location)
          ? true
          : undefined,
      start:
        location.event.ties?.start &&
        next?.event.type === 'note' &&
        next.event.ties?.stop &&
        areAdjacentEqualPitch(location, next)
          ? true
          : undefined
    }

    nextEventsById.set(location.event.id, {
      ...location.event,
      ties: ties.start || ties.stop ? ties : undefined
    })
  })

  return {
    measures: staff.measures.map((measure) => ({
      ...measure,
      voices: measure.voices.map((voice) =>
        voice.id === target.voiceId
          ? {
              ...voice,
              events: sortVoiceEvents(
                voice.events.map(
                  (event) => nextEventsById.get(event.id) ?? event
                )
              )
            }
          : voice
      )
    }))
  }
}

function areAdjacentEqualPitch(
  left: { measure: Measure; voice: Voice; event: VoiceEvent },
  right: { measure: Measure; voice: Voice; event: VoiceEvent }
): boolean {
  if (left.event.type !== 'note' || right.event.type !== 'note') {
    return false
  }

  const leftPitch = resolveNotePitch(left.measure, left.voice, left.event)
  const rightPitch = resolveNotePitch(right.measure, right.voice, right.event)

  return (
    leftPitch.step === rightPitch.step &&
    leftPitch.octave === rightPitch.octave &&
    leftPitch.alter === rightPitch.alter
  )
}

function replaceVoiceEventsInScore(
  score: Score,
  target: VoiceAddress,
  events: VoiceEvent[]
): Score {
  return {
    ...score,
    parts: score.parts.map((part) =>
      part.id === target.partId
        ? {
            ...part,
            staves: part.staves.map((staff) =>
              staff.id === target.staffId
                ? {
                    ...staff,
                    measures: staff.measures.map((measure) =>
                      measure.id === target.measureId
                        ? replaceVoiceEventsInMeasure(
                            measure,
                            target.voiceId,
                            events
                          )
                        : measure
                    )
                  }
                : staff
            )
          }
        : part
    )
  }
}

function replaceMeasuresInScore(
  score: Score,
  target: VoiceAddress,
  measures: Measure[]
): Score {
  const measureById = new Map(measures.map((measure) => [measure.id, measure]))

  return {
    ...score,
    parts: score.parts.map((part) =>
      part.id === target.partId
        ? {
            ...part,
            staves: part.staves.map((staff) =>
              staff.id === target.staffId
                ? {
                    ...staff,
                    measures: staff.measures.map(
                      (measure) => measureById.get(measure.id) ?? measure
                    )
                  }
                : staff
            )
          }
        : part
    )
  }
}

function replaceVoiceEventsInMeasure(
  measure: Measure,
  voiceId: string,
  events: VoiceEvent[]
): Measure {
  return {
    ...measure,
    voices: measure.voices.map((voice) =>
      voice.id === voiceId
        ? {
            ...voice,
            events
          }
        : voice
    )
  }
}

function getVoiceEvents(
  score: Score,
  target: VoiceAddress
): VoiceEvent[] | undefined {
  const location = locateVoice(score, target)

  return location ? sortVoiceEvents(location.voice.events) : undefined
}

function locateStaff(score: Score, target: VoiceAddress): Staff | undefined {
  const part = score.parts.find((candidate) => candidate.id === target.partId)

  return part?.staves.find((candidate) => candidate.id === target.staffId)
}

function sameEvents(left: VoiceEvent[], right: VoiceEvent[]): boolean {
  return (
    JSON.stringify(sortVoiceEvents(left)) ===
    JSON.stringify(sortVoiceEvents(right))
  )
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

function consumeMeasureEndRests(input: {
  events: VoiceEvent[]
  measure: Measure
  startTick: Tick
  endTick: Tick
  createId: () => string
}): { events: VoiceEvent[] } | undefined {
  let coveredFrom = input.endTick
  let consumedStartIndex = input.events.length
  let preservedRestPrefix: VoiceEvent[] = []

  for (
    let index = input.events.length - 1;
    index >= 0 && coveredFrom > input.startTick;
    index -= 1
  ) {
    const event = input.events[index]
    const endTick = eventEndTick(event, input.measure)

    if (
      event.type !== 'rest' ||
      event.duration.tuplet ||
      endTick !== coveredFrom
    ) {
      return undefined
    }

    consumedStartIndex = index

    if (event.position.tick < input.startTick) {
      preservedRestPrefix = createRestsForSpan({
        measure: input.measure,
        startTick: event.position.tick,
        endTick: input.startTick,
        firstId: event.id,
        createId: input.createId
      })

      if (preservedRestPrefix.length === 0) {
        return undefined
      }

      coveredFrom = input.startTick
      break
    }

    coveredFrom = event.position.tick
  }

  if (coveredFrom > input.startTick) {
    return undefined
  }

  return {
    events: [
      ...input.events.slice(0, consumedStartIndex),
      ...preservedRestPrefix
    ]
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

  const durations = decomposeRestSpanInMeasure(
    input.measure,
    input.startTick,
    input.endTick
  )

  if (!durations) {
    return []
  }

  let tick = input.startTick
  const usedIds = new Set<string>()

  return durations.map((duration, index) => {
    const baseId =
      index === 0 && input.firstId ? input.firstId : input.createId()
    const rest = createRest({
      id: createUniqueRestId(baseId, usedIds),
      position: {
        tick
      },
      duration
    })

    tick += durationToTicks(duration)
    return rest
  })
}

function createUniqueRestId(baseId: string, usedIds: Set<string>): string {
  let id = baseId
  let suffix = 2

  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  usedIds.add(id)
  return id
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

function decomposeRestSpanInMeasure(
  measure: Measure,
  startTick: Tick,
  endTick: Tick
): Duration[] | undefined {
  if (endTick <= startTick) {
    return []
  }

  const boundaries = createRestGroupingBoundaries(measure)

  if (boundaries.beats.length < 2) {
    return decomposeDurationTicks(endTick - startTick)
  }

  const durations: Duration[] = []
  let tick = startTick

  while (tick < endTick) {
    const group = findCurrentGroup(boundaries.groups, tick)
    const segmentEnd =
      group && tick === group.start && group.end <= endTick
        ? group.end
        : findNextBoundary(boundaries.beats, tick, endTick)

    if (segmentEnd <= tick) {
      return undefined
    }

    const segmentDurations = decomposeDurationTicks(segmentEnd - tick)

    if (!segmentDurations) {
      return undefined
    }

    durations.push(...segmentDurations)
    tick = segmentEnd
  }

  return durations
}

function createRestGroupingBoundaries(measure: Measure): {
  beats: Tick[]
  groups: Array<{ start: Tick; end: Tick }>
} {
  const measureTicks = measureDurationTicks(measure)
  const beatTicks = TICKS_PER_QUARTER * (4 / measure.timeSignature.beatType)

  if (
    !Number.isInteger(beatTicks) ||
    beatTicks <= 0 ||
    measure.timeSignature.beats <= 0
  ) {
    return {
      beats: [0, measureTicks],
      groups: [{ start: 0, end: measureTicks }]
    }
  }

  const beats = Array.from(
    { length: Math.floor(measureTicks / beatTicks) + 1 },
    (_, index) => index * beatTicks
  ).filter((tick) => tick <= measureTicks)

  if (beats.at(-1) !== measureTicks) {
    beats.push(measureTicks)
  }

  if (
    measure.timeSignature.beatType === 4 &&
    measure.timeSignature.beats === 4 &&
    measureTicks === beatTicks * 4
  ) {
    return {
      beats,
      groups: [
        { start: 0, end: beatTicks * 2 },
        { start: beatTicks * 2, end: measureTicks }
      ]
    }
  }

  if (
    measure.timeSignature.beatType === 8 &&
    measure.timeSignature.beats % 3 === 0
  ) {
    const groupTicks = beatTicks * 3
    const groups: Array<{ start: Tick; end: Tick }> = []

    for (let tick = 0; tick < measureTicks; tick += groupTicks) {
      groups.push({
        start: tick,
        end: Math.min(tick + groupTicks, measureTicks)
      })
    }

    return { beats, groups }
  }

  return {
    beats,
    groups: beats.slice(0, -1).map((start, index) => ({
      start,
      end: beats[index + 1]!
    }))
  }
}

function findCurrentGroup(
  groups: Array<{ start: Tick; end: Tick }>,
  tick: Tick
): { start: Tick; end: Tick } | undefined {
  return groups.find((group) => tick >= group.start && tick < group.end)
}

function findNextBoundary(
  boundaries: Tick[],
  tick: Tick,
  endTick: Tick
): Tick {
  return Math.min(
    endTick,
    boundaries.find((boundary) => boundary > tick) ?? endTick
  )
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
