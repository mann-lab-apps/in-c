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
  type TempoMarking,
  type Voice
} from '../../../score-core'
import { createGlobalMeasureResolver } from '../editor/global-measure-reference'
import { resolveTremoloBeatInterval } from './tremolo-interval'
import { createSwingBeatMapper, type SwingVoiceScope } from './swing'

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
  graceSegment?: 'leading' | 'principal'
  frequency?: number
  frequencies?: number[]
  tremolo?: Note['tremolo']
  // Source subdivision only; not persisted in the score/native schema.
  tremoloIntervalBeats?: number
  ornaments?: Note['ornaments']
  trillFrequency?: number
  velocityStart: number
  velocityEnd: number
  velocityStartBeat?: number
  velocityEndBeat?: number
  sampleHairpinVelocity?: true
}

type LeadingGrace = { frequency: number; maxBeats: number }
type NotatedPlaybackEvent = PlaybackEvent & { leadingGrace?: LeadingGrace }

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
  const events: NotatedPlaybackEvent[] = []
  let totalBeats = 0
  const scoreRepeatPlaybackPlan = createScoreRepeatPlaybackPlan(score)
  const tieTargets = new Map(collectTiePairs(score).map(pair => [pair.fromEventId, pair.toEventId]))
  const tiedHairpinAnchors = new Map<string, PlaybackEvent[]>()
  for (const hairpin of score.hairpins ?? []) {
    tiedHairpinAnchors.set(hairpin.startEventId, [])
    if (hairpin.endEventId !== undefined) tiedHairpinAnchors.set(hairpin.endEventId, [])
  }

  for (const part of score.parts) {
    for (const staff of part.staves) {
      const staffTimeline = createStaffPlaybackEvents(
        score,
        part.id,
        staff.id,
        staff.measures,
        scoreRepeatPlaybackPlan,
        tieTargets,
        tiedHairpinAnchors
      )

      events.push(...staffTimeline.events)
      totalBeats = Math.max(totalBeats, staffTimeline.totalBeats)
    }
  }

  const performedClock = createPerformedClock(score, scoreRepeatPlaybackPlan)
  const performedBeat = performedClock()
  const pedalEvents = createPlaybackPedalEvents(score, scoreRepeatPlaybackPlan)
    .map(event => ({ ...event, startBeat: performedBeat(event.startBeat) }))

  return {
    events: applyHairpinVelocity(
      score,
      events.sort((left, right) => left.startBeat - right.startBeat),
      scoreRepeatPlaybackPlan,
      tiedHairpinAnchors
    ).flatMap(({ leadingGrace, ...event }) => {
      const beat = performedClock(event)
      const startBeat = beat(event.startBeat)
      const endBeat = beat(event.startBeat + event.durationBeats, 'end')
      const performed = { ...event, startBeat, durationBeats: endBeat - startBeat }
      if (event.velocityStartBeat !== undefined) performed.velocityStartBeat = beat(event.velocityStartBeat)
      if (event.velocityEndBeat !== undefined) performed.velocityEndBeat = beat(event.velocityEndBeat, 'end')
      if (!leadingGrace || endBeat <= startBeat) return [performed]

      const graceBeats = Math.min(leadingGrace.maxBeats, performed.durationBeats / 2)
      const principalStart = startBeat + graceBeats
      const splitVelocity = performed.velocityStartBeat === undefined && performed.velocityEndBeat === undefined
        ? event.velocityStart + (event.velocityEnd - event.velocityStart) * graceBeats / performed.durationBeats
        : resolveEventVelocityAtBeat(performed, principalStart)
      return [
        { ...performed, graceSegment: 'leading' as const, durationBeats: graceBeats,
          frequency: leadingGrace.frequency, frequencies: [leadingGrace.frequency], velocityEnd: splitVelocity,
          ...(performed.velocityEndBeat !== undefined ? { velocityEndBeat: Math.min(principalStart, performed.velocityEndBeat) } : {}) },
        { ...performed, graceSegment: 'principal' as const, startBeat: principalStart,
          durationBeats: endBeat - principalStart, velocityStart: splitVelocity }
      ]
    }).sort((left, right) => left.startBeat - right.startBeat),
    tempoEvents: createPlaybackTempoEvents(score, scoreRepeatPlaybackPlan).map((event) => ({
      ...event, startBeat: performedBeat(event.startBeat)
    })),
    ...(pedalEvents.length ? { pedalEvents } : {}),
    totalBeats: performedBeat(totalBeats, 'end')
  }
}

// Shared performed-time mapping for notes, tempo, pedal and practice clicks.
type PerformedBeatMapper = (beat: number, edge?: 'end') => number

export function createPerformedBeatMapper(score: Score, repeatPlan?: RepeatPlaybackPlan, scope?: SwingVoiceScope): PerformedBeatMapper {
  return createPerformedClock(score, repeatPlan)(scope)
}

function createPerformedClock(score: Score, repeatPlan?: RepeatPlaybackPlan): (scope?: SwingVoiceScope) => PerformedBeatMapper {
  const key = (scope?: SwingVoiceScope) => scope ? JSON.stringify([scope.partId, scope.staffId, scope.voiceId]) : ''
  const swings = new Map<string, PerformedBeatMapper>(), clocks = new Map<string, PerformedBeatMapper>()
  const swingFor = (scope?: SwingVoiceScope) => {
    const id = key(scope)
    let swing = swings.get(id)
    if (!swing) { swing = createSwingBeatMapper(score, repeatPlan, scope); swings.set(id, swing) }
    return swing
  }
  const holdMap = createFermataHoldMap(score, repeatPlan, swingFor)
  return scope => {
    const id = key(scope)
    let clock = clocks.get(id)
    if (!clock) {
      const swing = swingFor(scope)
      clock = (beat, edge) => swing(beat, edge) + [...holdMap].reduce(
        (offset, [endBeat, hold]) => endBeat <= beat + 1e-9 ? offset + hold : offset, 0)
      clocks.set(id, clock)
    }
    return clock
  }
}

function createPlaybackPedalEvents(score: Score, plan?: RepeatPlaybackPlan): NonNullable<PlaybackTimeline['pedalEvents']> {
  return createPerformedPedalPlan(score, plan).map(({ id, partId, startBeat, value }) => ({ id, partId, startBeat, value }))
}

// A hold is shared by all parts at its ending beat, including every repeat pass.
// Simultaneous fermatas contribute the longest hold once, not once per voice.
function createFermataHoldMap(score: Score, repeatPlan: RepeatPlaybackPlan | undefined, swingFor: (scope: SwingVoiceScope) => PerformedBeatMapper): Map<number, number> {
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
            const swingBeat = swingFor({ partId: part.id, staffId: staff.id, voiceId: voice.id })
            const duration = voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER
            const endBeat = entry.outputBeat + event.position.tick / TICKS_PER_QUARTER + duration
            const startBeat = endBeat - duration
            const performedDuration = score.swingPlayback ? swingBeat(endBeat, 'end') - swingBeat(startBeat) : duration
            holds.set(endBeat, Math.max(holds.get(endBeat) ?? 0, performedDuration * (FERMATA_DURATION_MULTIPLIER - 1)))
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
  tieTargets: ReadonlyMap<string, string>,
  tiedHairpinAnchors: ReadonlyMap<string, PlaybackEvent[]>
): { events: NotatedPlaybackEvent[]; totalBeats: number } {
  const events: NotatedPlaybackEvent[] = []
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
        const leadingGrace = score.gracePlayback && event.type === 'note'
          ? resolveLeadingGrace(measure, voice, event, durationBeats)
          : undefined
        const playbackEvent = {
          ...(leadingGrace ? { leadingGrace } : {}),
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
          ...(event.type === 'note' && event.tremolo ? {
            tremoloIntervalBeats: resolveTremoloBeatInterval(event.tremolo.marks, event.duration)
          } : {}),
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
    events: mergePerformedTies(repeatedTimeline.events, tieTargets, tiedHairpinAnchors),
    totalBeats: repeatedTimeline.totalBeats
  }
}

// Expand the performed traversal before sustaining ties. A repeat jump can
// interrupt a notated chain or revisit a continuation without its predecessor.
// Each pending chain must reach its original next event at the actual ending beat.
function mergePerformedTies(events: NotatedPlaybackEvent[], tieTargets: ReadonlyMap<string, string>,
  tiedHairpinAnchors: ReadonlyMap<string, PlaybackEvent[]>): NotatedPlaybackEvent[] {
  const result: NotatedPlaybackEvent[] = []
  const pendingByVoice = new Map<string, { event: PlaybackEvent; nextEventId: string }>()
  for (const event of events) {
    const pending = pendingByVoice.get(event.voiceId)
    const continues = pending?.nextEventId === event.eventId &&
      (pending.event.frequency === event.frequency ||
        sameChordFrequencies(pending.event.frequencies, event.frequencies)) &&
      pending.event.startBeat + pending.event.durationBeats === event.startBeat
    const sustained = continues ? pending.event : event
    if (continues) {
      tiedHairpinAnchors.get(event.eventId)?.push(event)
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
  events: NotatedPlaybackEvent[],
  measures: StaffMeasures,
  totalBeats: number,
  repeatPlaybackPlan = createRepeatPlaybackPlan(measures)
): { events: NotatedPlaybackEvent[]; totalBeats: number } {
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

function resolveLeadingGrace(
  measure: StaffMeasures[number], voice: Voice, event: Note, durationBeats: number
): LeadingGrace | undefined {
  const grace = event.graceNotes?.[0]
  if (!grace || event.graceNotes?.length !== 1 || grace.after || grace.chord ||
    (event.pitches?.length ?? 0) > 1 || event.ties?.start || event.ties?.stop ||
    event.duration.tuplet || event.fermata || event.tremolo || event.ornaments?.length) return undefined

  const pitch = resolveNotePitch(measure, voice, { ...event, pitch: grace.pitch })
  const offset = (measure.transposition?.chromatic ?? 0) + 12 * (measure.transposition?.octaveChange ?? 0)
  return {
    frequency: pitchToFrequency(pitch) * 2 ** (offset / 12),
    maxBeats: Math.min(grace.slash ? 1 / 16 : 1 / 2, durationBeats / 2)
  }
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
  events: NotatedPlaybackEvent[],
  scoreRepeatPlaybackPlan: RepeatPlaybackPlan | undefined,
  tiedHairpinAnchors: ReadonlyMap<string, PlaybackEvent[]>
): NotatedPlaybackEvent[] {
  const nextEvents = events.map((event) => ({ ...event }))
  const anchorOccurrences = (eventId: string) => {
    const sounding = nextEvents.filter(event => event.eventId === eventId)
    const tied = tiedHairpinAnchors.get(eventId)
    // A collapsed continuation still owns its performed beat and voice.
    return tied?.length ? [...sounding, ...tied].sort((a, b) => a.startBeat - b.startBeat) : sounding
  }

  for (const hairpin of score.hairpins ?? []) {
    const starts = anchorOccurrences(hairpin.startEventId)
    const first = starts[0]
    if (!first) continue
    const staff = score.parts.find(part => part.id === first.partId)?.staves.find(staff => staff.id === first.staffId)
    if (!staff) continue
    // Use the same performed plan as event expansion, including repeats owned
    // by a secondary aligned staff.
    const plan = scoreRepeatPlaybackPlan ?? createRepeatPlaybackPlan(staff.measures)
    const repeatBoundaries = plan.entries.filter((entry, index) => index > 0 &&
      (entry.navigationJump || entry.measureIndex <= plan.entries[index - 1].measureIndex)).map(entry => entry.outputBeat)
    const release = hairpin.endAnchor === 'release'
    const exactEnd = hairpin.endAnchor !== undefined || hairpin.endTime !== undefined
    const ends = hairpin.endTime ? (() => {
      const { measureId, tick, voiceId } = hairpin.endTime
      const measureIndex = staff.measures.findIndex(measure => measure.id === measureId)
      return plan.entries.filter(entry => entry.measureIndex === measureIndex)
        .map(entry => ({ startBeat: entry.outputBeat, voiceId, beat: entry.outputBeat + tick / TICKS_PER_QUARTER }))
    })() : anchorOccurrences(hairpin.endEventId).flatMap(event => {
      const { startBeat, voiceId } = event
      if (!release) {
        const duration = hairpin.endAnchor === 'onset' ? 0 : event.durationBeats
        return [{ startBeat, voiceId, beat: startBeat + duration }]
      }
      const measure = staff.measures.find(candidate => candidate.id === event.measureId)
      const source = measure?.voices.find(voice => voice.id === voiceId)?.events.find(note => note.id === hairpin.endEventId)
      return measure && source ? [{
        startBeat, voiceId, beat: startBeat + voiceEventDurationTicks(source, measure) / TICKS_PER_QUARTER
      }] : []
    })
    for (const [index, startEvent] of starts.entries()) {
      // A skipped stop must not spill across a backward (or same-bar) repeat,
      // even when the start itself appears only in the first ending.
      const nextStartBeat = starts[index + 1]?.startBeat ?? Infinity
      const nextRepeatBeat = repeatBoundaries.find(beat => beat > startEvent.startBeat) ?? Infinity
      const limit = Math.min(nextStartBeat, nextRepeatBeat)
      const afterMeasureStart = release || hairpin.endTime !== undefined
      const floor = afterMeasureStart ? (repeatBoundaries.filter(beat => beat <= startEvent.startBeat).at(-1) ?? 0) : startEvent.startBeat
      // A release or time anchor can start in the same measure before
      // the hairpin itself. Its end must still belong to this traversal.
      const end = ends.find(({ startBeat, beat }) => startBeat >= floor &&
        startBeat < limit && (!afterMeasureStart || beat > startEvent.startBeat))
      if (!end) continue
      const spanEnd = exactEnd ? Math.min(end.beat, limit) : end.beat
      applyHairpinTraversal(nextEvents, startEvent, end.voiceId, hairpin.type, spanEnd, exactEnd, hairpin.endTime !== undefined)
    }
  }

  return nextEvents
}

function applyHairpinTraversal(
  events: PlaybackEvent[],
  startEvent: PlaybackEvent,
  endVoiceId: string,
  type: NonNullable<Score['hairpins']>[number]['type'],
  spanEnd: number,
  exactEnd: boolean,
  sampleHairpinVelocity: boolean
): void {
  const spanStart = startEvent.startBeat
  const spanDuration = spanEnd - spanStart

  if (spanDuration <= 0) return

  const baseVelocity = startEvent.velocityStart
  const targetVelocity = type === 'crescendo'
    ? clampVelocity(baseVelocity + HAIRPIN_DELTA)
    : clampVelocity(baseVelocity - HAIRPIN_DELTA)

  events.forEach((event) => {
    if (event.partId !== startEvent.partId || event.staffId !== startEvent.staffId ||
      (startEvent.voiceId === endVoiceId && event.voiceId !== startEvent.voiceId)) return
    const eventEnd = event.startBeat + event.durationBeats

    if (eventEnd <= spanStart || event.startBeat >= spanEnd) return

    if (event.startBeat >= spanStart) {
      event.velocityStart = interpolateVelocity(baseVelocity, targetVelocity, (event.startBeat - spanStart) / spanDuration)
    }
    if (exactEnd && event.startBeat < spanStart) event.velocityStartBeat = spanStart
    else delete event.velocityStartBeat
    event.velocityEnd = interpolateVelocity(
      baseVelocity,
      targetVelocity,
      (Math.min(eventEnd, spanEnd) - spanStart) / spanDuration
    )
    if (exactEnd && spanEnd < eventEnd) event.velocityEndBeat = spanEnd
    else delete event.velocityEndBeat
    if (sampleHairpinVelocity) event.sampleHairpinVelocity = true
    else delete event.sampleHairpinVelocity
  })
}

export function resolveEventVelocityAtBeat(event: PlaybackEvent, beat: number): number {
  const from = event.velocityStartBeat ?? event.startBeat
  const duration = event.velocityStartBeat === undefined && event.velocityEndBeat === undefined
    ? event.durationBeats : (event.velocityEndBeat ?? event.startBeat + event.durationBeats) - from
  if (duration <= 0) return event.velocityStart
  const progress = Math.min(1, Math.max(0, (beat - from) / duration))
  return event.velocityStart + (event.velocityEnd - event.velocityStart) * progress
}

function interpolateVelocity(start: number, end: number, ratio: number): number {
  return clampVelocity(start + (end - start) * Math.min(1, Math.max(0, ratio)))
}

function clampVelocity(value: number): number {
  return Math.min(MAX_VELOCITY, Math.max(MIN_VELOCITY, value))
}
