import {
  createFullMeasureRest,
  createRest,
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
import { locateEvent, locateMeasure, type EditorSelection } from './editor-state'

export function buildTimeSignatureCommand(
  score: Score,
  selection: EditorSelection,
  timeSignature: TimeSignature
): ScoreCommand | undefined {
  const location =
    selection.type === 'measure'
      ? locateMeasure(score, selection.measureId)
      : locateEvent(score, selection.eventId)

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

  const measures = staff.measures.map((measure, index) =>
    index === measureIndex ? nextMeasure : measure
  )

  return {
    type: 'staff-measures.replace',
    target: {
      partId: location.address.partId,
      staffId: location.address.staffId
    },
    measures
  }
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
        createFullMeasureRest({
          id: events[0].id
        })
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
