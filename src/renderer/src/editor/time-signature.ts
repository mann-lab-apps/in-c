import {
  createFullMeasureRest,
  createRest,
  createGlobalMeasureResolver,
  decomposeDurationTicks,
  durationToTicks,
  measureDurationTicks,
  sortVoiceEvents,
  timeSignatureDurationTicks,
  validateMeasureRhythm,
  validateVoiceTuplets,
  voiceEventDurationTicks,
  type HairpinTimeEnd,
  type Measure,
  type Score,
  type ScoreCommand,
  type Staff,
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
  const target = findMeasureTarget(score, selection)
  if (!target) return undefined
  const { staff, measureIndex, partId } = target
  const nextMeasure = fitMeasureTimeSignature(score, createGlobalMeasureResolver(score), staff.measures[measureIndex], timeSignature)
  if (!nextMeasure) return undefined
  const measures = staff.measures.map((measure, index) =>
    index === measureIndex ? nextMeasure : measure
  )

  return {
    // This edit keeps the same bars. The structural staff replacement command
    // renumbers them (including on undo), which loses valid imported numbers
    // and can leave number-based global tempo references dangling.
    type: 'score-parts.replace',
    parts: score.parts.map((candidate) => candidate.id !== partId ? candidate : {
      ...candidate,
      staves: candidate.staves.map((candidateStaff) =>
        candidateStaff.id === staff.id ? { ...candidateStaff, measures } : candidateStaff)
    })
  }
}

type ScoreMeasureMeterResult =
  | { kind: 'change'; command: ScoreCommand }
  | { kind: 'unchanged' | 'unaligned' }
  | { kind: 'blocked'; partName: string; staffNumber: number; timeEnd?: HairpinTimeEnd }

export function buildScoreMeasureTimeSignatureCommand(
  score: Score, selection: EditorSelection, timeSignature: TimeSignature
): ScoreMeasureMeterResult {
  const target = findMeasureTarget(score, selection)
  if (!target) return { kind: 'unaligned' }
  const { measureIndex } = target
  const start = barStart(target.staff, measureIndex)
  const length = measureDurationTicks(target.staff.measures[measureIndex])
  const resolveGlobal = createGlobalMeasureResolver(score)
  const nextMeasures = new Map<Staff, Measure>()
  let nextLength: number | undefined
  for (const part of score.parts) {
    for (const [index, staff] of part.staves.entries()) {
      const bar = staff.measures[measureIndex]
      if (!bar || barStart(staff, measureIndex) !== start || measureDurationTicks(bar) !== length) {
        return { kind: 'unaligned' }
      }
      const timeEnd = timeEndBeyondNewMeter(score, bar, timeSignature)
      if (timeEnd) return { kind: 'blocked', partName: part.name, staffNumber: index + 1, timeEnd }
      const next = fitMeasureTimeSignature(score, resolveGlobal, bar, timeSignature)
      if (!next || (next !== bar && next.timing.type === 'pickup' &&
        next.timing.durationTicks >= timeSignatureDurationTicks(timeSignature))) {
        return { kind: 'blocked', partName: part.name, staffNumber: index + 1 }
      }
      const duration = measureDurationTicks(next)
      if (nextLength !== undefined && duration !== nextLength) return { kind: 'unaligned' }
      nextLength = duration
      if (next !== bar) nextMeasures.set(staff, next)
    }
  }
  if (!nextMeasures.size) return { kind: 'unchanged' }
  return {
    kind: 'change',
    command: { type: 'score-parts.replace', parts: score.parts.map(part => ({
      ...part,
      staves: part.staves.map(staff => {
        const next = nextMeasures.get(staff)
        return next ? { ...staff, measures: staff.measures.map((bar, index) => index === measureIndex ? next : bar) } : staff
      })
    })) }
  }
}

function barStart(staff: Staff, measureIndex: number): number {
  return staff.measures.slice(0, measureIndex).reduce((tick, bar) => tick + measureDurationTicks(bar), 0)
}

function findMeasureTarget(score: Score, selection: EditorSelection) {
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

  if (!staff || measureIndex === undefined || measureIndex < 0) return undefined
  return { staff, measureIndex, partId: location.address.partId }
}

export function timeEndBeyondNewMeter(score: Score, measure: Measure, timeSignature: TimeSignature) {
  const duration = measureDurationTicks({ ...measure, timeSignature })
  return score.hairpins?.find(span => span.endTime?.measureId === measure.id && span.endTime.tick > duration)?.endTime
}

function fitMeasureTimeSignature(
  score: Score, resolveGlobal: ReturnType<typeof createGlobalMeasureResolver>,
  currentMeasure: Measure, timeSignature: TimeSignature
): Measure | undefined {
  if (timeEndBeyondNewMeter(score, currentMeasure, timeSignature)) return undefined
  const releaseEnds = new Set(score.hairpins?.flatMap(span => span.endAnchor === 'release' && span.endEventId !== undefined ? [span.endEventId] : []))
  const nextMeasure = applyTimeSignatureToMeasure(currentMeasure, timeSignature, releaseEnds)
  if (!nextMeasure) return undefined
  // A shorter bar may discard plain rests, but not their authored notation
  // or the endpoints of a surviving span. Use the same preservation policy
  // as tuplet regrouping; never leave a score which cannot be saved natively.
  const after = new Map(nextMeasure.voices.flatMap(voice => voice.events.map(event => [event.id, event] as const)))
  const before = currentMeasure.voices.flatMap(voice => voice.events)
  const removedIds = new Set(before.filter(event => !after.has(event.id)).map(event => event.id))
  if ([...(score.hairpins ?? []), ...(score.slurs ?? []), ...(score.octaveShifts ?? [])]
    .some(span => removedIds.has(span.startEventId) || (span.endEventId !== undefined && removedIds.has(span.endEventId)))) return undefined
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
    if (score.tempoEvents?.some(mark => resolveGlobal(mark.measureId) === currentMeasure.id && mark.tick > nextEndTick) ||
      [...(score.harmonies ?? []), ...(score.expressionTexts ?? [])].some(mark =>
        mark.measureId === currentMeasure.id && mark.tick > nextEndTick)) return undefined
  }

  return nextMeasure
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
  timeSignature: TimeSignature,
  releaseEnds: ReadonlySet<string>
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
    fitVoiceToTimeSignature(measure, nextMeasure, voice, releaseEnds)
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
  voice: Voice,
  releaseEnds: ReadonlySet<string>
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

      const replacement = createRestsForSpan({
        measure: nextMeasure,
        startTick: eventStartTick,
        endTick: targetEndTick,
        firstId: event.id
      })
      // The original ID stays on the first rest. A release must reach the end
      // of the shortened span, so a split would end it early.
      if (releaseEnds.has(event.id) && replacement.length !== 1) return undefined
      clippedEvents.push(...replacement)
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
