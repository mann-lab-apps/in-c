import {
  createFullMeasureRest,
  createRest,
  createGlobalMeasureResolver,
  decomposeDurationTicks,
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents,
  validateMeasureRhythm,
  validateVoiceTuplets,
  voiceEventDurationTicks,
  type Measure,
  type Score,
  type ScoreCommand,
  type TimeSignature,
  type Voice,
  type VoiceEvent
} from '../../../score-core'
import {
  getSelectionFocusEventId,
  locateEvent,
  locateMeasure,
  type EditorSelection
} from './editor-state'

export function buildTimeSignatureCommand(
  score: Score,
  selection: EditorSelection,
  timeSignature: TimeSignature
): ScoreCommand | undefined {
  const location =
    selection.type === 'measure'
      ? locateMeasure(score, selection.measureId, selection.address)
      : locateFocusedEvent(score, selection)

  if (!location) {
    return undefined
  }

  const part = score.parts.find((candidate) => candidate.id === location.address.partId)
  const staff = part?.staves.find(
    (candidate) => candidate.id === location.address.staffId
  )
  const measureIndex = staff?.measures.findIndex(
    (measure) => measure.id === location.address.measureId
  )

  if (!staff || measureIndex === undefined || measureIndex < 0) {
    return undefined
  }

  const currentMeasure = staff.measures[measureIndex]
  const nextMeasure = applyTimeSignatureToMeasure(
    currentMeasure,
    timeSignature
  )

  if (!nextMeasure) {
    return undefined
  }
  // A shorter bar may discard plain rests, but not their authored notation
  // or the endpoints of a surviving span. Use the same preservation policy
  // as tuplet regrouping; never leave a score which cannot be saved natively.
  const after = new Map(nextMeasure.voices.flatMap(voice => voice.events.map(event => [event.id, event] as const)))
  const before = currentMeasure.voices.flatMap(voice => voice.events)
  const removedIds = new Set(before.filter(event => !after.has(event.id)).map(event => event.id))
  if ([...(score.hairpins ?? []), ...(score.slurs ?? []), ...(score.octaveShifts ?? [])]
    .some(span => removedIds.has(span.startEventId) || removedIds.has(span.endEventId))) return undefined
  if (before.some(event => {
    if (event.type !== 'rest' || (!event.fermata && !event.breathMark)) return false
    const next = after.get(event.id)
    return next?.type !== 'rest' ||
      (event.fermata && !next.fermata) ||
      (event.breathMark && event.breathMark !== next.breathMark)
  })) return undefined
  // Keep authored pedal anchors valid. Do not silently truncate a pedal phrase
  // when a smaller meter would put its release beyond the barline.
  if (score.pedalEvents?.some(pedal => pedal.measureId === currentMeasure.id &&
    pedal.tick > measureDurationTicks(nextMeasure))) return undefined

  const nextEndTick = measureDurationTicks(nextMeasure)
  if (nextEndTick < measureDurationTicks(currentMeasure)) {
    // Match the existing paste/pickup protection: do not leave authored
    // positions outside the shortened bar or spill them into its neighbor.
    // Tempo aliases belong to the primary staff; local text keeps its owner.
    const resolveGlobal = createGlobalMeasureResolver(score)
    if (score.tempoEvents?.some(mark => resolveGlobal(mark.measureId) === currentMeasure.id && mark.tick > nextEndTick) ||
      [...(score.harmonies ?? []), ...(score.expressionTexts ?? [])].some(mark =>
        mark.measureId === currentMeasure.id && mark.tick > nextEndTick)) return undefined
  }

  const measures = staff.measures.map((measure, index) =>
    index === measureIndex ? nextMeasure : measure
  )

  return {
    // This edit keeps the same bars. The structural staff replacement command
    // renumbers them (including on undo), which loses valid imported numbers
    // and can leave number-based global tempo references dangling.
    type: 'score-parts.replace',
    parts: score.parts.map((candidate) => candidate.id !== location.address.partId ? candidate : {
      ...candidate,
      staves: candidate.staves.map((candidateStaff) =>
        candidateStaff.id === staff.id ? { ...candidateStaff, measures } : candidateStaff)
    })
  }
}

function locateFocusedEvent(score: Score, selection: EditorSelection) {
  const eventId = getSelectionFocusEventId(selection)

  return eventId
    ? locateEvent(
        score,
        eventId,
        selection.type === 'measure' ? undefined : selection.address
      )
    : undefined
}

function applyTimeSignatureToMeasure(
  measure: Measure,
  timeSignature: TimeSignature
): Measure | undefined {
  if (
    measure.timeSignature.beats === timeSignature.beats &&
    measure.timeSignature.beatType === timeSignature.beatType
  ) {
    return measure
  }

  const nextMeasure = {
    ...measure,
    timeSignature: { ...timeSignature }
  }
  const voices = measure.voices.map((voice) =>
    fitVoiceToTimeSignature(measure, nextMeasure, voice)
  )

  if (voices.some((voice) => !voice)) {
    return undefined
  }

  const normalizedMeasure = {
    ...nextMeasure,
    voices: voices as Voice[]
  }

  if (
    !validateMeasureRhythm(normalizedMeasure).isExact ||
    normalizedMeasure.voices.some(
      (voice) => validateVoiceTuplets(voice).length > 0
    )
  ) {
    return undefined
  }

  return normalizedMeasure
}

function fitVoiceToTimeSignature(
  previousMeasure: Measure,
  nextMeasure: Measure,
  voice: Voice
): Voice | undefined {
  const targetEndTick = measureDurationTicks(nextMeasure)
  const events = sortVoiceEvents(voice.events)

  if (
    events.length === 1 &&
    events[0].type === 'rest' &&
    events[0].fullMeasure
  ) {
    return {
      ...voice,
      events: [
        { ...createFullMeasureRest({ id: events[0].id }),
          fermata: events[0].fermata, breathMark: events[0].breathMark }
      ]
    }
  }

  const clippedEvents: VoiceEvent[] = []

  for (const event of events) {
    const eventStartTick = event.position.tick
    const eventEndTick =
      eventStartTick + voiceEventDurationTicks(event, previousMeasure)

    if (eventStartTick >= targetEndTick) {
      if (event.type === 'rest' && !event.duration.tuplet) {
        continue
      }

      return undefined
    }

    if (eventEndTick > targetEndTick) {
      if (event.type !== 'rest' || event.duration.tuplet) {
        return undefined
      }

      clippedEvents.push(
        ...createRestsForSpan({
          measure: nextMeasure,
          startTick: eventStartTick,
          endTick: targetEndTick,
          firstId: event.id
        })
      )
      continue
    }

    clippedEvents.push(event)
  }

  const fittedEvents = fillVoiceGaps(
    sortVoiceEvents(clippedEvents),
    nextMeasure
  )

  return fittedEvents
    ? {
        ...voice,
        events: fittedEvents
      }
    : undefined
}

function fillVoiceGaps(
  events: VoiceEvent[],
  measure: Measure
): VoiceEvent[] | undefined {
  const targetEndTick = measureDurationTicks(measure)
  const nextEvents: VoiceEvent[] = []
  let tick = 0

  for (const event of events) {
    if (event.position.tick > tick) {
      nextEvents.push(
        ...createRestsForSpan({
          measure,
          startTick: tick,
          endTick: event.position.tick
        })
      )
    }

    if (event.position.tick < tick) {
      return undefined
    }

    nextEvents.push(event)
    tick = event.position.tick + voiceEventDurationTicks(event, measure)
  }

  if (tick > targetEndTick) {
    return undefined
  }

  if (tick < targetEndTick) {
    nextEvents.push(
      ...createRestsForSpan({
        measure,
        startTick: tick,
        endTick: targetEndTick
      })
    )
  }

  return sortVoiceEvents(nextEvents)
}

function createRestsForSpan(input: {
  measure: Measure
  startTick: number
  endTick: number
  firstId?: string
}): VoiceEvent[] {
  const spanTicks = input.endTick - input.startTick

  if (spanTicks <= 0) {
    return []
  }

  if (
    input.startTick === 0 &&
    spanTicks === measureDurationTicks(input.measure)
  ) {
    return [
      createFullMeasureRest({
        id: input.firstId ?? createRestId(input.startTick)
      })
    ]
  }

  const durations = decomposeDurationTicks(spanTicks)

  if (!durations) {
    return []
  }

  let tick = input.startTick

  return durations.map((duration, index) => {
    const rest = createRest({
      id:
        index === 0 && input.firstId
          ? input.firstId
          : createRestId(tick),
      position: {
        tick
      },
      duration
    })

    tick += durationToTicks(duration)
    return rest
  })
}

function createRestId(tick: number): string {
  return `time-signature-rest-${tick}-${crypto.randomUUID()}`
}
