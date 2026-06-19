import type { Duration, Note, Pitch, Score } from '../../../score-core'

export interface PlaybackEvent {
  eventId: string
  measureId: string
  startBeat: number
  durationBeats: number
  frequency?: number
}

export interface PlaybackTimeline {
  events: PlaybackEvent[]
  totalBeats: number
}

const baseDurationBeats: Record<Duration['value'], number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625
}

const pitchSemitones: Record<Pitch['step'], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
}

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const events: PlaybackEvent[] = []
  let scoreBeat = 0

  for (const measure of measures) {
    const voice = measure.voices[0]
    let measureBeat = 0

    for (const event of voice?.events ?? []) {
      const durationBeats = durationToBeats(event.duration)

      events.push({
        eventId: event.id,
        measureId: measure.id,
        startBeat: scoreBeat + measureBeat,
        durationBeats,
        frequency: event.type === 'note' ? pitchToFrequency(event.pitch) : undefined
      })
      measureBeat += durationBeats
    }

    scoreBeat += Math.max(
      measureBeat,
      measure.timeSignature.beats * (4 / measure.timeSignature.beatType)
    )
  }

  return {
    events,
    totalBeats: scoreBeat
  }
}

export function durationToBeats(duration: Duration): number {
  let multiplier = 1

  for (let dotIndex = 1; dotIndex <= duration.dots; dotIndex += 1) {
    multiplier += 1 / 2 ** dotIndex
  }

  if (duration.tuplet) {
    multiplier *= duration.tuplet.normalNotes / duration.tuplet.actualNotes
  }

  return baseDurationBeats[duration.value] * multiplier
}

export function pitchToFrequency(pitch: Note['pitch']): number {
  const midi =
    (pitch.octave + 1) * 12 +
    pitchSemitones[pitch.step] +
    (pitch.alter ?? 0)

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
