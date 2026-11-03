import {
  TICKS_PER_QUARTER,
  createRepeatPlaybackPlan,
  createScoreRepeatPlaybackPlan,
  createPerformedPedalPlan,
  type RepeatPlaybackPlan,
  durationToTicks,
  collectTiePairs,
  measureDurationTicks,
  pitchToMidi,
  effectiveAlterAt,
  resolveNotePitch,
  convertOctaveShiftPitches,
  scoreRepeatSource,
  sortVoiceEvents,
  transposeDiatonic,
  voiceEventDurationTicks,
  type Duration,
  type DynamicValue,
  type Note,
  type Score,
  type TempoMarking
} from '../../../score-core'
import { createGlobalMeasureResolver } from '../editor/global-measure-reference'

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
  // Source anchors merged into this sustained event; not part of the score schema.
  tiedEvents?: { eventId: string; measureId: string }[]
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
  pedalEvents?: { id: string; partId: string; startBeat: number; value: number }[]
  totalBeats: number
}

type StaffMeasures = NonNullable<
  Score['parts'][number]['staves'][number]['measures']
>

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  score = convertOctaveShiftPitches(score, 'performed')
  const events: PlaybackEvent[] = []
  let totalBeats = 0
  const scoreRepeatPlaybackPlan = createScoreRepeatPlaybackPlan(score)
  const tieTargets = new Map(collectTiePairs(score).map(pair => [pair.fromEventId, pair.toEventId]))

  for (const part of score.parts) {
    for (const staff of part.staves) {
      const staffTimeline = createStaffPlaybackEvents(
        score,
        part.id,
        staff.id,
        staff.measures,
        scoreRepeatPlaybackPlan,
        tieTargets
      )

      events.push(...staffTimeline.events)
      totalBeats = Math.max(totalBeats, staffTimeline.totalBeats)
    }
  }

  const holdMap = createFermataHoldMap(score, scoreRepeatPlaybackPlan)
  const performedBeat = (beat: number) => beat + [...holdMap].reduce(
    (offset, [endBeat, hold]) => endBeat <= beat + 1e-9 ? offset + hold : offset, 0)
  const pedalEvents = createPlaybackPedalEvents(score, scoreRepeatPlaybackPlan)
    .map(event => ({ ...event, startBeat: performedBeat(event.startBeat) }))

  return {
    events: applyHairpinVelocity(
      score,
      events.sort((left, right) => left.startBeat - right.startBeat),
      scoreRepeatPlaybackPlan
    ).map((event) => ({
      ...event,
      startBeat: performedBeat(event.startBeat),
      durationBeats: performedBeat(event.startBeat + event.durationBeats) - performedBeat(event.startBeat)
    })),
    tempoEvents: createPlaybackTempoEvents(score, scoreRepeatPlaybackPlan).map((event) => ({
      ...event, startBeat: performedBeat(event.startBeat)
    })),
    ...(pedalEvents.length ? { pedalEvents } : {}),
    totalBeats: performedBeat(totalBeats)
  }
}

function createPlaybackPedalEvents(score: Score, plan?: RepeatPlaybackPlan): NonNullable<PlaybackTimeline['pedalEvents']> {
  return createPerformedPedalPlan(score, plan).map(({ id, partId, startBeat, value }) => ({ id, partId, startBeat, value }))
}

// A hold is shared by all parts at its ending beat, including every repeat pass.
// Simultaneous fermatas contribute the longest hold once, not once per voice.
function createFermataHoldMap(score: Score, repeatPlan?: RepeatPlaybackPlan): Map<number, number> {
  const holds = new Map<number, number>()
  for (const part of score.parts) {
    for (const staff of part.staves) {
      const starts = createStaffMeasureStartBeatMap(staff.measures)
      const entries = repeatPlan?.entries ?? staff.measures.map((measure, measureIndex) => ({
        measureIndex, outputBeat: starts.get(measure.id) ?? 0
      }))
      for (const entry of entries) {
        const measure = staff.measures[entry.measureIndex]
        if (!measure) continue
        for (const voice of measure.voices) {
          for (const event of voice.events) {
            if (!event.fermata) continue
            const duration = voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER
            const endBeat = entry.outputBeat + event.position.tick / TICKS_PER_QUARTER + duration
            holds.set(endBeat, Math.max(holds.get(endBeat) ?? 0, duration * (FERMATA_DURATION_MULTIPLIER - 1)))
          }
        }
      }
    }
  }
  return holds
}

function createStaffPlaybackEvents(
  score: Score,
  partId: string,
  staffId: string,
  measures: StaffMeasures,
  scoreRepeatPlaybackPlan: RepeatPlaybackPlan | undefined,
  tieTargets: ReadonlyMap<string, string>
): PlaybackTimeline {
  const events: PlaybackEvent[] = []
  let scoreBeat = 0

  for (const measure of measures) {
    for (const voice of measure.voices) {
      for (const event of sortVoiceEvents(voice.events)) {
        const notatedDurationBeats =
          voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER
        const durationBeats = notatedDurationBeats
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
            event.position.tick / TICKS_PER_QUARTER,
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
        events.push(playbackEvent)

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
    events: mergePerformedTies(repeatedTimeline.events, tieTargets),
    tempoEvents: [],
    totalBeats: repeatedTimeline.totalBeats
  }
}

// Expand the performed traversal before sustaining ties. A repeat jump can
// interrupt a notated chain or revisit a continuation without its predecessor.
// Each pending chain must reach its original next event at the actual ending beat.
function mergePerformedTies(events: PlaybackEvent[], tieTargets: ReadonlyMap<string, string>): PlaybackEvent[] {
  const result: PlaybackEvent[] = []
  const pendingByVoice = new Map<string, { event: PlaybackEvent; nextEventId: string }>()
  for (const event of events) {
    const pending = pendingByVoice.get(event.voiceId)
    const continues = pending?.nextEventId === event.eventId &&
      (pending.event.frequency === event.frequency ||
        sameChordFrequencies(pending.event.frequencies, event.frequencies)) &&
      pending.event.startBeat + pending.event.durationBeats === event.startBeat
    const sustained = continues ? pending.event : event
    if (continues) {
      sustained.durationBeats += event.durationBeats
      sustained.velocityEnd = event.velocityEnd
      sustained.tiedEvents ??= []
      sustained.tiedEvents.push({ eventId: event.eventId, measureId: event.measureId })
    } else {
      result.push(event)
    }
    const nextEventId = tieTargets.get(event.eventId)
    if (nextEventId) pendingByVoice.set(event.voiceId, { event: sustained, nextEventId })
    else pendingByVoice.delete(event.voiceId)
  }
  return result
}

// Compare copies: preserving authored member order also preserves native data
// and the first event's MIDI ordering. Legacy unequal-primary semantics remain.
function sameChordFrequencies(left?: number[], right?: number[]): boolean {
  if (!left?.length || !right || left.length !== right.length) return false
  const sortedLeft = [...left].sort((a, b) => a - b)
  const sortedRight = [...right].sort((a, b) => a - b)
  return sortedLeft.every((frequency, index) => frequency === sortedRight[index])
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

function hasRepeatPlaybackMarks(measures: StaffMeasures): boolean {
  return measures.some(
    (measure) => measure.repeat?.start || measure.repeat?.end || measure.volta
  )
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
    ? event.pitches.map(pitch => resolveNotePitch(measure, voice, { ...event, pitch }))
    : [resolveNotePitch(measure, voice, event)]

  const offset = (measure.transposition?.chromatic ?? 0) +
    12 * (measure.transposition?.octaveChange ?? 0)
  return pitches.map((pitch) => pitchToFrequency(pitch) * 2 ** (offset / 12))
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

  const offset = (measure.transposition?.chromatic ?? 0) +
    12 * (measure.transposition?.octaveChange ?? 0)
  return pitchToFrequency({
    ...upperDiatonicPitch,
    alter: upperAlter
  }) * 2 ** (offset / 12)
}

function createPlaybackTempoEvents(
  score: Score,
  scoreRepeatPlaybackPlan?: RepeatPlaybackPlan
): PlaybackTempoEvent[] {
  const measureStarts = createMeasureStartBeatMap(score)
  const measureIndices = createMeasureIndexMap(score)
  const resolveMeasure = createGlobalMeasureResolver(score)
  const sourceEvents = (score.tempoEvents ?? []).flatMap(event => {
    const measureId = resolveMeasure(event.measureId)
    const measureStart = measureId === undefined ? undefined : measureStarts.get(measureId)
    const measureIndex = measureId === undefined ? undefined : measureIndices.get(measureId)
    if (measureStart === undefined || measureIndex === undefined) return []
    return [{ event, measureStart, measureIndex, playback: {
        id: event.id,
        measureId: event.measureId,
        startBeat: measureStart + event.tick / TICKS_PER_QUARTER,
        bpm: event.bpm,
        quarterBpm: tempoMarkingToQuarterBpm(event),
        text: event.text
      } }]
  }).sort((a, b) => a.playback.startBeat - b.playback.startBeat)
  if (!scoreRepeatPlaybackPlan) return sourceEvents.map(item => item.playback)

  const initialTempo: TempoMarking = score.tempo ?? { bpm: 120, beatUnit: 'quarter' }
  const initial = { bpm: initialTempo.bpm, quarterBpm: tempoMarkingToQuarterBpm(initialTempo), text: initialTempo.text }
  let activeQuarterBpm = initial.quarterBpm
  const tempoEvents: PlaybackTempoEvent[] = []
  const measures = scoreRepeatSource(score)?.measures ?? []
  scoreRepeatPlaybackPlan.entries.forEach((entry, index, entries) => {
    const measure = measures[entry.measureIndex]
    const events = sourceEvents.filter(item => item.measureIndex === entry.measureIndex)
    const jumped = index ? entry.measureIndex !== entries[index - 1].measureIndex + 1 : entry.measureIndex !== 0
    if (jumped && measure && !events.some(item => item.event.tick === 0)) {
      const sourceBeat = measureStarts.get(measure.id) ?? 0
      let restored = initial
      for (const item of sourceEvents) {
        if (item.playback.startBeat > sourceBeat) break
        restored = item.playback
      }
      if (activeQuarterBpm !== restored.quarterBpm) {
        // Performed state only: leave the original/native/XML markings intact.
        tempoEvents.push({ id: `playback-tempo-return-${index}`, measureId: measure.id,
          startBeat: entry.outputBeat, bpm: restored.bpm, quarterBpm: restored.quarterBpm, text: restored.text })
        activeQuarterBpm = restored.quarterBpm
      }
    }
    for (const { event, measureStart, playback } of events) {
      const isOriginalOccurrence =
        entry.pass === 1 && entry.outputBeat === measureStart
      tempoEvents.push({
        ...playback,
        id: isOriginalOccurrence
          ? event.id
          : `${event.id}-repeat-${entry.pass}-${entry.outputBeat}`,
        startBeat: entry.outputBeat + event.tick / TICKS_PER_QUARTER
      })
      activeQuarterBpm = playback.quarterBpm
    }
  })
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
  beat: number,
  partId?: string
): PlaybackEvent | undefined {
  return timeline.events.find(
    (event) =>
      (partId === undefined || event.partId === partId) &&
      beat >= event.startBeat &&
      beat < event.startBeat + event.durationBeats
  )
}

// First performed occurrence. A tied continuation starts with its sustained chain.
export function findPlaybackStartBeat(
  timeline: PlaybackTimeline,
  eventId: string,
  address: Partial<Pick<PlaybackEvent,'partId'|'staffId'|'measureId'|'voiceId'>> = {}
): number | undefined {
  return timeline.events.find(event =>
    (address.partId===undefined||event.partId===address.partId) &&
    (address.staffId===undefined||event.staffId===address.staffId) &&
    (address.voiceId===undefined||event.voiceId===address.voiceId) &&
    [{eventId:event.eventId,measureId:event.measureId},...(event.tiedEvents??[])].some(source=>
      source.eventId===eventId&&(address.measureId===undefined||source.measureId===address.measureId))
  )?.startBeat
}

function resolveMeasureVelocity(score: Score, measureId: string): number {
  const dynamic = score.dynamics?.find((mark) => mark.measureId === measureId)

  return dynamic ? DYNAMIC_VELOCITY[dynamic.value] : DEFAULT_VELOCITY
}

function applyHairpinVelocity(
  score: Score,
  events: PlaybackEvent[],
  scoreRepeatPlaybackPlan?: RepeatPlaybackPlan
): PlaybackEvent[] {
  const nextEvents = events.map((event) => ({ ...event }))

  for (const hairpin of score.hairpins ?? []) {
    const starts = nextEvents.filter((event) => event.eventId === hairpin.startEventId)
    const first = starts[0]
    if (!first) continue
    const staff = score.parts.find(part => part.id === first.partId)?.staves.find(staff => staff.id === first.staffId)
    if (!staff) continue
    // Use the same performed plan as event expansion, including repeats owned
    // by a secondary aligned staff. No source-event or project schema mutation.
    const plan = scoreRepeatPlaybackPlan ?? createRepeatPlaybackPlan(staff.measures)
    const repeatBoundaries = plan.entries.filter((entry, index) => index > 0 &&
      entry.measureIndex <= plan.entries[index - 1].measureIndex).map(entry => entry.outputBeat)
    for (const [index, startEvent] of starts.entries()) {
      // A skipped stop must not spill across a backward (or same-bar) repeat,
      // even when the start itself appears only in the first ending.
      const nextStartBeat = starts[index + 1]?.startBeat ?? Infinity
      const nextRepeatBeat = repeatBoundaries.find(beat => beat > startEvent.startBeat) ?? Infinity
      const endEvent = nextEvents.find((event) => event.eventId === hairpin.endEventId &&
        event.startBeat >= startEvent.startBeat && event.startBeat < Math.min(nextStartBeat, nextRepeatBeat))

      if (!endEvent) continue

      applyHairpinTraversal(nextEvents, startEvent, endEvent, hairpin.type)
    }
  }

  return nextEvents
}

function applyHairpinTraversal(
  events: PlaybackEvent[],
  startEvent: PlaybackEvent,
  endEvent: PlaybackEvent,
  type: NonNullable<Score['hairpins']>[number]['type']
): void {
  const spanStart = startEvent.startBeat
  const spanEnd = endEvent.startBeat + endEvent.durationBeats
  const spanDuration = spanEnd - spanStart

  if (spanDuration <= 0) return

  const baseVelocity = startEvent.velocityStart
  const targetVelocity = type === 'crescendo'
    ? clampVelocity(baseVelocity + HAIRPIN_DELTA)
    : clampVelocity(baseVelocity - HAIRPIN_DELTA)

  events.forEach((event) => {
    if (event.partId !== startEvent.partId || event.staffId !== startEvent.staffId ||
      (startEvent.voiceId === endEvent.voiceId && event.voiceId !== startEvent.voiceId)) return
    const eventEnd = event.startBeat + event.durationBeats

    if (eventEnd <= spanStart || event.startBeat >= spanEnd) return

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

function interpolateVelocity(start: number, end: number, ratio: number): number {
  return clampVelocity(start + (end - start) * Math.min(1, Math.max(0, ratio)))
}

function clampVelocity(value: number): number {
  return Math.min(MAX_VELOCITY, Math.max(MIN_VELOCITY, value))
}
