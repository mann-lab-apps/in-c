import {
  TICKS_PER_QUARTER,
  durationToTicks,
  measureDurationTicks,
  pitchToMidi,
  resolveNotePitch,
  sortVoiceEvents,
  voiceEventDurationTicks,
  type Duration,
  type Note,
  type Score
} from '../../../score-core'

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

export function createPlaybackTimeline(score: Score): PlaybackTimeline {
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const events: PlaybackEvent[] = []
  let scoreBeat = 0

  for (const measure of measures) {
    const voice = measure.voices[0]

    for (const event of sortVoiceEvents(voice?.events ?? [])) {
      const durationBeats =
        voiceEventDurationTicks(event, measure) / TICKS_PER_QUARTER

      events.push({
        eventId: event.id,
        measureId: measure.id,
        startBeat: scoreBeat + event.position.tick / TICKS_PER_QUARTER,
        durationBeats,
        frequency:
          event.type === 'note' && voice
            ? pitchToFrequency(resolveNotePitch(measure, voice, event))
            : undefined
      })
    }

    scoreBeat += measureDurationTicks(measure) / TICKS_PER_QUARTER
  }

  return {
    events,
    totalBeats: scoreBeat
  }
}

export function durationToBeats(duration: Duration): number {
  return durationToTicks(duration) / TICKS_PER_QUARTER
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
