import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice
} from '../../../score-core'
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
    expect(durationToBeats(createDuration('quarter', 2))).toBe(1.75)
    expect(durationToBeats(createDuration('quarter', 3))).toBe(1.875)
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
    expect(timeline.events).toHaveLength(9)
    expect(timeline.events[0]).toMatchObject({
      eventId: 'note-c4',
      measureId: 'measure-1',
      startBeat: 0,
      durationBeats: 1
    })
    expect(timeline.events.find((event) => event.eventId === 'note-g4')).toMatchObject({
      eventId: 'note-g4',
      measureId: 'measure-2',
      startBeat: 4,
      durationBeats: 0.5
    })
    expect(timeline.events.find((event) => event.eventId === 'rest-half')).toMatchObject({
      eventId: 'rest-half',
      startBeat: 6,
      durationBeats: 2,
      frequency: undefined
    })
  })

  it('finds the event under the playhead including rests', () => {
    const timeline = createPlaybackTimeline(demoScore)

    expect(findPlaybackEvent(timeline, 1.5)?.eventId).toBe('note-d4')
    expect(findPlaybackEvent(timeline, 4.75)?.eventId).toBe('note-a4')
    expect(findPlaybackEvent(timeline, 6.5)?.eventId).toBe('rest-half')
    expect(findPlaybackEvent(timeline, 8)).toBeUndefined()
  })

  it('uses explicit event positions instead of array-duration accumulation', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'late-note',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: {
                            step: 'C',
                            octave: 4
                          }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    expect(createPlaybackTimeline(score).events[0]).toMatchObject({
      eventId: 'late-note',
      startBeat: 2,
      durationBeats: 1
    })
  })

  it('resolves key signatures and preceding accidentals for playback', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  keySignature: { fifths: 1 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'key-f-sharp',
                          position: createTimePosition(0),
                          pitch: { step: 'F', octave: 4 }
                        }),
                        createNote({
                          id: 'explicit-natural',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'F', octave: 4, alter: 0 }
                        }),
                        createNote({
                          id: 'inherited-natural',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'F', octave: 4 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const events = createPlaybackTimeline(score).events

    expect(events[0].frequency).toBeCloseTo(369.994, 3)
    expect(events[1].frequency).toBeCloseTo(349.228, 3)
    expect(events[2].frequency).toBeCloseTo(349.228, 3)
  })

  it('merges tied notes into one sustained playback event', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  timeSignature: { beats: 2, beatType: 4 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'tie-start',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          ties: { start: true }
                        }),
                        createNote({
                          id: 'tie-stop',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'C', octave: 4 },
                          ties: { stop: true }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const timeline = createPlaybackTimeline(score)

    expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0]).toMatchObject({
      eventId: 'tie-start',
      startBeat: 0,
      durationBeats: 2
    })
  })

  it('places triplet events on proportional playback beats', () => {
    const duration = {
      ...createDuration('eighth'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        ...Array.from({ length: 3 }, (_, index) =>
                          createNote({
                            id: `triplet-${index + 1}`,
                            position: createTimePosition(
                              (TICKS_PER_QUARTER / 3) * index
                            ),
                            pitch: { step: 'C', octave: 4 },
                            duration
                          })
                        ),
                        createRest({
                          id: 'remainder',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ],
                      tuplets: [
                        {
                          id: 'tuplet-1',
                          eventIds: ['triplet-1', 'triplet-2', 'triplet-3'],
                          actualNotes: 3,
                          normalNotes: 2
                        }
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const events = createPlaybackTimeline(score).events.slice(0, 3)

    expect(events.map((event) => event.startBeat)).toEqual([
      0,
      1 / 3,
      2 / 3
    ])
    events.forEach((event) => {
      expect(event.durationBeats).toBeCloseTo(1 / 3)
    })
  })
})
