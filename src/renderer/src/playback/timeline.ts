import {
  TICKS_PER_QUARTER,
  durationToTicks,
  measureDurationTicks,
  pitchToMidi,
  effectiveAlterAt,
  resolveNotePitch,
  sortVoiceEvents,
  transposeDiatonic,
  voiceEventDurationTicks,
  type Duration,
  type DynamicValue,
  type Note,
  type Score,
  type TempoMarking
} from '../../../score-core'

const DEFAULT_VELOCITY = 0.16
const DYNAMIC_VELOCITY = {
  ppp: 0.06,
  pp: 0.075,
  p: 0.09,
  mp: 0.12,
  mf: DEFAULT_VELOCITY,
  f: 0.22,
  ff: 0.235,
  fff: 0.24,
  sfz: 0.24
} as const satisfies Record<DynamicValue, number>
const HAIRPIN_DELTA = 0.08
const MIN_VELOCITY = 0.06
const MAX_VELOCITY = 0.24
const FERMATA_DURATION_MULTIPLIER = 1.5

export interface PlaybackEvent {
  eventId: string
  partId: string
  staffId: string
  voiceId: string
  measureId: string
  startBeat: number
  durationBeats: number
  frequency?: number
  frequencies?: number[]
  tremolo?: Note['tremolo']
  ornaments?: Note['ornaments']
  trillFrequency?: number
  velocityStart: number
  velocityEnd: number
}

export interface PlaybackTempoEvent {
  id: string
  measureId: string
  startBeat: number
  bpm: number
  quarterBpm: number
  text?: string
}

export interface PlaybackTimeline {
  events: PlaybackEvent[]
  tempoEvents: PlaybackTempoEvent[]
  totalBeats: number
}

type StaffMeasures = NonNullable<
  Score['parts'][number]['staves'][number]['measures']
>

interface RepeatPlaybackPlanEntry {
  measureIndex: number
  outputBeat: number
  pass: number
}

interface RepeatPlaybackPlan {
  entries: RepeatPlaybackPlanEntry[]
  totalBeats: number
}

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  const events: PlaybackEvent[] = []
  let totalBeats = 0
  const scoreRepeatPlaybackPlan = createScoreRepeatPlaybackPlan(score)

  for (const part of score.parts) {
    for (const staff of part.staves) {
      const staffTimeline = createStaffPlaybackEvents(
        score,
        part.id,
        staff.id,
        staff.measures,
        scoreRepeatPlaybackPlan
      )

      events.push(...staffTimeline.events)
      totalBeats = Math.max(totalBeats, staffTimeline.totalBeats)
    }
  }

  return {
    events: applyHairpinVelocity(
      score,
      events.sort((left, right) => left.startBeat - right.startBeat)
    ),
    tempoEvents: createPlaybackTempoEvents(score, scoreRepeatPlaybackPlan),
    totalBeats
  }
}

function createStaffPlaybackEvents(
  score: Score,
  partId: string,
  staffId: string,
  measures: StaffMeasures,
  scoreRepeatPlaybackPlan?: RepeatPlaybackPlan
): PlaybackTimeline {
  const events: PlaybackEvent[] = []
  let scoreBeat = 0
  let expressionBeatOffset = 0
  const pendingTieEventByVoiceId = new Map<string, PlaybackEvent>()

  for (const measure of measures) {
    for (const voice of measure.voices) {
      for (const event of sortVoiceEvents(voice.events)) {
        const notatedDurationBeats =
          voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER
        const durationBeats =
          notatedDurationBeats *
          (event.fermata ? FERMATA_DURATION_MULTIPLIER : 1)
        const frequencies =
          event.type === 'note'
            ? eventFrequencies(measure, voice, event)
            : undefined
        const playbackEvent = {
          eventId: event.id,
          partId,
          staffId,
          voiceId: voice.id,
          measureId: measure.id,
          startBeat:
            scoreBeat +
            event.position.tick / TICKS_PER_QUARTER +
            expressionBeatOffset,
          durationBeats,
          frequency:
            frequencies && frequencies.length > 0 ? frequencies[0] : undefined,
          frequencies,
          tremolo: event.type === 'note' ? event.tremolo : undefined,
          ornaments: event.type === 'note' ? event.ornaments : undefined,
          trillFrequency:
            event.type === 'note'
              ? eventTrillFrequency(measure, voice, event)
              : undefined,
          velocityStart: resolveMeasureVelocity(score, measure.id),
          velocityEnd: resolveMeasureVelocity(score, measure.id)
        }
        const pendingTieEvent = pendingTieEventByVoiceId.get(voice.id)
        const continuesPendingTie =
          event.type === 'note' &&
          event.ties?.stop &&
          pendingTieEvent &&
          pendingTieEvent.frequency === playbackEvent.frequency &&
          pendingTieEvent.startBeat + pendingTieEvent.durationBeats ===
            playbackEvent.startBeat

        if (continuesPendingTie) {
          pendingTieEvent.durationBeats += playbackEvent.durationBeats
          pendingTieEvent.velocityEnd = playbackEvent.velocityEnd
        } else {
          events.push(playbackEvent)
        }

        if (event.type === 'note' && event.ties?.start) {
          pendingTieEventByVoiceId.set(
            voice.id,
            continuesPendingTie ? pendingTieEvent : playbackEvent
          )
        } else {
          pendingTieEventByVoiceId.delete(voice.id)
        }

        expressionBeatOffset += durationBeats - notatedDurationBeats
      }
    }

    scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  const repeatedTimeline = applyRepeatPlayback(
    events,
    measures,
    scoreBeat,
    scoreRepeatPlaybackPlan
  )

  return {
    events: repeatedTimeline.events,
    tempoEvents: [],
    totalBeats: repeatedTimeline.totalBeats + expressionBeatOffset
  }
}

function applyRepeatPlayback(
  events: PlaybackEvent[],
  measures: StaffMeasures,
  totalBeats: number,
  repeatPlaybackPlan = createRepeatPlaybackPlan(measures)
): { events: PlaybackEvent[]; totalBeats: number } {
  const measureStartBeats = createStaffMeasureStartBeatMap(measures)
  const nextEvents = repeatPlaybackPlan.entries.flatMap((entry) => {
    const measure = measures[entry.measureIndex]

    if (!measure) {
      return []
    }

    const sourceBeat = measureStartBeats.get(measure.id) ?? 0
    const beatOffset = entry.outputBeat - sourceBeat

    return events
      .filter((event) => event.measureId === measure.id)
      .map((event) => ({
        ...event,
        startBeat: event.startBeat + beatOffset
      }))
  })

  return {
    events: nextEvents.sort((left, right) => left.startBeat - right.startBeat),
    totalBeats: repeatPlaybackPlan.totalBeats || totalBeats
  }
}

function createScoreRepeatPlaybackPlan(
  score: Score
): RepeatPlaybackPlan | undefined {
  const staves = score.parts.flatMap((part) => part.staves)
  const canonicalStaff = staves.find((staff) =>
    hasRepeatPlaybackMarks(staff.measures)
  )

  if (!canonicalStaff) {
    return undefined
  }

  const canonicalDurations = canonicalStaff.measures.map(measureDurationTicks)
  const canApplyScoreWidePlan = staves.every((staff) =>
    staff.measures.length === canonicalStaff.measures.length &&
    staff.measures.every(
      (measure, index) =>
        measureDurationTicks(measure) === canonicalDurations[index]
    )
  )

  return canApplyScoreWidePlan
    ? createRepeatPlaybackPlan(canonicalStaff.measures)
    : undefined
}

function hasRepeatPlaybackMarks(measures: StaffMeasures): boolean {
  return measures.some(
    (measure) => measure.repeat?.start || measure.repeat?.end || measure.volta
  )
}

function createRepeatPlaybackPlan(measures: StaffMeasures): RepeatPlaybackPlan {
  const voltaNumberByMeasureId = createMeasureVoltaNumberMap(measures)
  const entries: RepeatPlaybackPlanEntry[] = []
  let repeatStartIndex = 0
  let outputBeat = 0
  let repeatPass = 1

  const appendMeasure = (measureIndex: number, pass: number) => {
    const measure = measures[measureIndex]

    if (!measure) {
      return
    }

    if (
      shouldSkipVoltaMeasure(
        voltaNumberByMeasureId.get(measure.id),
        pass
      )
    ) {
      return
    }

    entries.push({
      measureIndex,
      outputBeat,
      pass
    })
    outputBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
    const measure = measures[measureIndex]

    if (measure.repeat?.start) {
      repeatStartIndex = measureIndex
      repeatPass = 1
    }

    appendMeasure(measureIndex, repeatPass)

    if (!measure.repeat?.end) {
      continue
    }

    const repeatCount = Math.max(2, measure.repeat.times ?? 2)

    for (let repeatIndex = 1; repeatIndex < repeatCount; repeatIndex += 1) {
      const repeatedPass = repeatIndex + 1

      for (
        let repeatedMeasureIndex = repeatStartIndex;
        repeatedMeasureIndex <= measureIndex;
        repeatedMeasureIndex += 1
      ) {
        appendMeasure(repeatedMeasureIndex, repeatedPass)
      }
    }

    repeatStartIndex = measureIndex + 1
    repeatPass = repeatCount
  }

  return {
    entries,
    totalBeats: outputBeat
  }
}

function shouldSkipVoltaMeasure(
  voltaNumber: 1 | 2 | undefined,
  repeatPass: number
): boolean {
  if (!voltaNumber) {
    return false
  }

  if (voltaNumber === 1) {
    return repeatPass !== 1
  }

  return repeatPass === 1
}

function createMeasureVoltaNumberMap(
  measures: StaffMeasures
): Map<string, 1 | 2> {
  const voltaNumbers = new Map<string, 1 | 2>()
  let activeVoltaNumber: 1 | 2 | undefined

  for (let index = 0; index < measures.length; index += 1) {
    const measure = measures[index]

    if (measure.volta?.start) {
      activeVoltaNumber = hasLaterVoltaEnd(measures, index, measure.volta.number)
        ? measure.volta.number
        : undefined
    }

    const voltaNumber = measure.volta?.number ?? activeVoltaNumber

    if (voltaNumber) {
      voltaNumbers.set(measure.id, voltaNumber)
    }

    if (measure.volta?.end) {
      activeVoltaNumber = undefined
    }
  }

  return voltaNumbers
}

function hasLaterVoltaEnd(
  measures: StaffMeasures,
  startIndex: number,
  number: 1 | 2
): boolean {
  for (let index = startIndex + 1; index < measures.length; index += 1) {
    if (measures[index].volta?.number === number && measures[index].volta?.end) {
      return true
    }
  }

  return false
}

function createStaffMeasureStartBeatMap(
  measures: StaffMeasures
): Map<string, number> {
  const startBeats = new Map<string, number>()
  let beat = 0

  for (const measure of measures) {
    startBeats.set(measure.id, beat)
    beat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  return startBeats
}

function eventFrequencies(
  measure: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number],
  voice: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number]['voices'][number],
  event: Note
): number[] {
  const pitches = event.pitches?.length
    ? event.pitches
    : [resolveNotePitch(measure, voice, event)]

  return pitches.map((pitch) => pitchToFrequency(pitch))
}

function eventTrillFrequency(
  measure: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number],
  voice: NonNullable<Score['parts'][number]['staves'][number]['measures']>[number]['voices'][number],
  event: Note
): number | undefined {
  if (!event.ornaments?.includes('trill')) {
    return undefined
  }

  const upperDiatonicPitch = transposeDiatonic(
    resolveNotePitch(measure, voice, event),
    1
  )
  const upperAlter = effectiveAlterAt({
    measure,
    voice,
    step: upperDiatonicPitch.step,
    octave: upperDiatonicPitch.octave,
    tick: event.position.tick
  })

  return pitchToFrequency({
    ...upperDiatonicPitch,
    alter: upperAlter
  })
}

function createPlaybackTempoEvents(
  score: Score,
  scoreRepeatPlaybackPlan?: RepeatPlaybackPlan
): PlaybackTempoEvent[] {
  const measureStarts = createMeasureStartBeatMap(score)
  const measureIndices = createMeasureIndexMap(score)
  const tempoEvents: PlaybackTempoEvent[] = []

  for (const event of score.tempoEvents ?? []) {
    const measureStart = measureStarts.get(event.measureId)

    if (measureStart === undefined) {
      continue
    }

    if (!scoreRepeatPlaybackPlan) {
      tempoEvents.push({
        id: event.id,
        measureId: event.measureId,
        startBeat: measureStart + event.tick / TICKS_PER_QUARTER,
        bpm: event.bpm,
        quarterBpm: tempoMarkingToQuarterBpm(event),
        text: event.text
      })
      continue
    }

    const measureIndex = measureIndices.get(event.measureId)

    if (measureIndex === undefined) {
      continue
    }

    for (const entry of scoreRepeatPlaybackPlan.entries) {
      if (entry.measureIndex !== measureIndex) {
        continue
      }

      const isOriginalOccurrence =
        entry.pass === 1 && entry.outputBeat === measureStart

      tempoEvents.push({
        id: isOriginalOccurrence
          ? event.id
          : `${event.id}-repeat-${entry.pass}-${entry.outputBeat}`,
        measureId: event.measureId,
        startBeat: entry.outputBeat + event.tick / TICKS_PER_QUARTER,
        bpm: event.bpm,
        quarterBpm: tempoMarkingToQuarterBpm(event),
        text: event.text
      })
    }
  }

  return tempoEvents.sort((left, right) => left.startBeat - right.startBeat)
}

function createMeasureIndexMap(score: Score): Map<string, number> {
  const measureIndices = new Map<string, number>()

  for (const part of score.parts) {
    for (const staff of part.staves) {
      for (let index = 0; index < staff.measures.length; index += 1) {
        if (!measureIndices.has(staff.measures[index].id)) {
          measureIndices.set(staff.measures[index].id, index)
        }
      }
    }
  }

  return measureIndices
}

function createMeasureStartBeatMap(score: Score): Map<string, number> {
  const measureStarts = new Map<string, number>()

  for (const part of score.parts) {
    for (const staff of part.staves) {
      let scoreBeat = 0

      for (const measure of staff.measures) {
        if (!measureStarts.has(measure.id)) {
          measureStarts.set(measure.id, scoreBeat)
        }

        scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
      }
    }
  }

  return measureStarts
}

export function durationToBeats(duration: Duration): number {
  return durationToTicks(duration) / TICKS_PER_QUARTER
}

export function tempoMarkingToQuarterBpm(tempo: TempoMarking): number {
  return tempo.bpm * tempoBeatUnitToQuarterBeats(tempo)
}

export function resolveQuarterBpmAtBeat(
  timeline: Pick<PlaybackTimeline, 'tempoEvents'>,
  beat: number,
  fallbackBpm: number
): number {
  let quarterBpm = fallbackBpm

  for (const event of timeline.tempoEvents) {
    if (event.startBeat > beat) {
      break
    }

    quarterBpm = event.quarterBpm
  }

  return quarterBpm
}

export function beatDeltaToSeconds(
  timeline: Pick<PlaybackTimeline, 'tempoEvents'>,
  fromBeat: number,
  toBeat: number,
  fallbackBpm: number
): number {
  if (toBeat <= fromBeat) {
    return 0
  }

  let seconds = 0
  let cursorBeat = fromBeat
  let quarterBpm = resolveQuarterBpmAtBeat(timeline, fromBeat, fallbackBpm)

  for (const event of timeline.tempoEvents) {
    if (event.startBeat <= fromBeat) {
      continue
    }

    if (event.startBeat >= toBeat) {
      break
    }

    seconds += ((event.startBeat - cursorBeat) * 60) / quarterBpm
    cursorBeat = event.startBeat
    quarterBpm = event.quarterBpm
  }

  return seconds + ((toBeat - cursorBeat) * 60) / quarterBpm
}

export function elapsedSecondsToBeat(
  timeline: Pick<PlaybackTimeline, 'tempoEvents' | 'totalBeats'>,
  fromBeat: number,
  elapsedSeconds: number,
  fallbackBpm: number
): number {
  if (elapsedSeconds <= 0) {
    return fromBeat
  }

  let remainingSeconds = elapsedSeconds
  let cursorBeat = fromBeat
  let quarterBpm = resolveQuarterBpmAtBeat(timeline, fromBeat, fallbackBpm)

  for (const event of timeline.tempoEvents) {
    if (event.startBeat <= fromBeat) {
      continue
    }

    const secondsUntilEvent =
      ((event.startBeat - cursorBeat) * 60) / quarterBpm

    if (remainingSeconds < secondsUntilEvent) {
      return cursorBeat + (remainingSeconds * quarterBpm) / 60
    }

    remainingSeconds -= secondsUntilEvent
    cursorBeat = event.startBeat
    quarterBpm = event.quarterBpm
  }

  return Math.min(
    timeline.totalBeats,
    cursorBeat + (remainingSeconds * quarterBpm) / 60
  )
}

export function tempoBeatUnitToQuarterBeats(tempo: TempoMarking): number {
  const base =
    tempo.beatUnit === 'whole'
      ? 4
      : tempo.beatUnit === 'half'
        ? 2
        : tempo.beatUnit === 'eighth'
          ? 0.5
          : tempo.beatUnit === '16th'
            ? 0.25
            : tempo.beatUnit === '32nd'
              ? 0.125
              : tempo.beatUnit === '64th'
                ? 0.0625
                : 1

  return base * dottedMultiplier(tempo.dots ?? 0)
}

function dottedMultiplier(dots: number): number {
  let multiplier = 1
  let addition = 0.5

  for (let index = 0; index < dots; index += 1) {
    multiplier += addition
    addition /= 2
  }

  return multiplier
}

export function pitchToFrequency(pitch: Note['pitch']): number {
  const midi = pitchToMidi(pitch)

  return 440 * 2 ** ((midi - 69) / 12)
}

export function findPlaybackEvent(
  timeline: PlaybackTimeline,
  beat: number
): PlaybackEvent | undefined {
  return timeline.events.find(
    (event) =>
      beat >= event.startBeat &&
      beat < event.startBeat + event.durationBeats
  )
}

function resolveMeasureVelocity(score: Score, measureId: string): number {
  const dynamic = score.dynamics?.find((mark) => mark.measureId === measureId)

  return dynamic ? DYNAMIC_VELOCITY[dynamic.value] : DEFAULT_VELOCITY
}

function applyHairpinVelocity(
  score: Score,
  events: PlaybackEvent[]
): PlaybackEvent[] {
  const nextEvents = events.map((event) => ({ ...event }))

  for (const hairpin of score.hairpins ?? []) {
    const startEvent = nextEvents.find((event) => event.eventId === hairpin.startEventId)
    const endEvent = nextEvents.find((event) => event.eventId === hairpin.endEventId)

    if (!startEvent || !endEvent) {
      continue
    }

    const spanStart = startEvent.startBeat
    const spanEnd = endEvent.startBeat + endEvent.durationBeats
    const spanDuration = spanEnd - spanStart

    if (spanDuration <= 0) {
      continue
    }

    const baseVelocity = startEvent.velocityStart
    const targetVelocity =
      hairpin.type === 'crescendo'
        ? clampVelocity(baseVelocity + HAIRPIN_DELTA)
        : clampVelocity(baseVelocity - HAIRPIN_DELTA)

    nextEvents.forEach((event) => {
      const eventEnd = event.startBeat + event.durationBeats

      if (eventEnd <= spanStart || event.startBeat >= spanEnd) {
        return
      }

      event.velocityStart = interpolateVelocity(
        baseVelocity,
        targetVelocity,
        (Math.max(event.startBeat, spanStart) - spanStart) / spanDuration
      )
      event.velocityEnd = interpolateVelocity(
        baseVelocity,
        targetVelocity,
        (Math.min(eventEnd, spanEnd) - spanStart) / spanDuration
      )
    })
  }

  return nextEvents
}

function interpolateVelocity(start: number, end: number, ratio: number): number {
  return clampVelocity(start + (end - start) * Math.min(1, Math.max(0, ratio)))
}

function clampVelocity(value: number): number {
  return Math.min(MAX_VELOCITY, Math.max(MIN_VELOCITY, value))
}
