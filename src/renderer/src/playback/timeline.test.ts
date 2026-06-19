import { describe, expect, it } from 'vitest'

import { createDuration } from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import {
  createPlaybackTimeline,
  durationToBeats,
  findPlaybackEvent,
  pitchToFrequency
} from './timeline'

describe('playback timeline', () => {
  it('converts durations, dots, and tuplets to quarter-note beats', () => {
    expect(durationToBeats(createDuration('whole'))).toBe(4)
    expect(durationToBeats(createDuration('eighth', 1))).toBe(0.75)
    expect(
      durationToBeats({
        value: 'quarter',
        dots: 0,
        tuplet: {
          actualNotes: 3,
          normalNotes: 2
        }
      })
    ).toBeCloseTo(2 / 3)
  })

  it('maps equal-tempered pitches to frequencies', () => {
    expect(pitchToFrequency({ step: 'A', octave: 4 })).toBeCloseTo(440)
    expect(pitchToFrequency({ step: 'C', octave: 4 })).toBeCloseTo(261.626, 3)
    expect(
      pitchToFrequency({ step: 'F', octave: 4, alter: 1 })
    ).toBeCloseTo(369.994, 3)
  })

  it('lays out score events on a measure-aware beat timeline', () => {
    const timeline = createPlaybackTimeline(demoScore)

    expect(timeline.totalBeats).toBe(8)
    expect(timeline.events).toHaveLength(6)
    expect(timeline.events[0]).toMatchObject({
      eventId: 'note-c4',
      measureId: 'measure-1',
      startBeat: 0,
      durationBeats: 1
    })
    expect(timeline.events[4]).toMatchObject({
      eventId: 'note-g4',
      measureId: 'measure-2',
      startBeat: 4,
      durationBeats: 2
    })
    expect(timeline.events[5]).toMatchObject({
      eventId: 'rest-half',
      startBeat: 6,
      durationBeats: 2,
      frequency: undefined
    })
  })

  it('finds the event under the playhead including rests', () => {
    const timeline = createPlaybackTimeline(demoScore)

    expect(findPlaybackEvent(timeline, 1.5)?.eventId).toBe('note-d4')
    expect(findPlaybackEvent(timeline, 6.5)?.eventId).toBe('rest-half')
    expect(findPlaybackEvent(timeline, 8)).toBeUndefined()
  })
})
