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
  beatDeltaToSeconds,
  createPlaybackTimeline,
  durationToBeats,
  elapsedSecondsToBeat,
  findPlaybackEvent,
  pitchToFrequency,
  resolveQuarterBpmAtBeat,
  tempoMarkingToQuarterBpm
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

  it('converts tempo beat units to quarter-note playback BPM', () => {
    expect(
      tempoMarkingToQuarterBpm({
        bpm: 120,
        beatUnit: 'eighth'
      })
    ).toBe(60)
    expect(
      tempoMarkingToQuarterBpm({
        bpm: 72,
        beatUnit: 'quarter',
        dots: 1
      })
    ).toBe(108)
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

  it('maps positioned tempo events onto the playback timeline', () => {
    const score = createScore({
      tempoEvents: [
        {
          id: 'tempo-change',
          measureId: 'measure-2',
          tick: TICKS_PER_QUARTER * 2,
          bpm: 72,
          beatUnit: 'quarter',
          dots: 1,
          text: 'rit.'
        }
      ],
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'measure-1',
                  number: 1
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2
                })
              ]
            })
          ]
        })
      ]
    })
    const timeline = createPlaybackTimeline(score)

    expect(timeline.tempoEvents).toEqual([
      {
        id: 'tempo-change',
        measureId: 'measure-2',
        startBeat: 6,
        bpm: 72,
        quarterBpm: 108,
        text: 'rit.'
      }
    ])
  })

  it('uses tempo events when converting playback beats and seconds', () => {
    const timeline = {
      totalBeats: 8,
      tempoEvents: [
        {
          id: 'slower',
          measureId: 'measure-1',
          startBeat: 2,
          bpm: 60,
          quarterBpm: 60,
          text: 'Meno mosso'
        }
      ]
    }

    expect(resolveQuarterBpmAtBeat(timeline, 1.5, 120)).toBe(120)
    expect(resolveQuarterBpmAtBeat(timeline, 2, 120)).toBe(60)
    expect(beatDeltaToSeconds(timeline, 0, 4, 120)).toBeCloseTo(3)
    expect(elapsedSecondsToBeat(timeline, 0, 1.5, 120)).toBeCloseTo(2.5)
  })

  it('keeps chord tones in one simultaneous playback event', () => {
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
                          id: 'c-major',
                          pitch: { step: 'C', octave: 4 },
                          pitches: [
                            { step: 'C', octave: 4 },
                            { step: 'E', octave: 4 },
                            { step: 'G', octave: 4 }
                          ]
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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
    const [event] = createPlaybackTimeline(score).events

    expect(event.eventId).toBe('c-major')
    expect(event.frequencies).toHaveLength(3)
    expect(event.frequencies?.[0]).toBeCloseTo(261.626, 3)
    expect(event.frequencies?.[1]).toBeCloseTo(329.628, 3)
    expect(event.frequencies?.[2]).toBeCloseTo(391.995, 3)
  })

  it('expands simple repeat barlines into playback order', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'measure-1',
                  number: 1,
                  repeat: {
                    start: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'repeat-note',
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createRest({
                          id: 'repeat-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2,
                  repeat: {
                    end: true,
                    times: 3
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'repeat-end-note',
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createRest({
                          id: 'repeat-end-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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

    expect(timeline.totalBeats).toBe(24)
    expect(
      timeline.events
        .filter((event) => event.frequency !== undefined)
        .map((event) => event.startBeat)
    ).toEqual([0, 4, 8, 12, 16, 20])
  })

  it('merges simultaneous playback events from multiple parts', () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'violin',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'violin-note',
                          pitch: { step: 'C', octave: 5 }
                        }),
                        createRest({
                          id: 'violin-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        }),
        createPart({
          id: 'cello',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-note',
                          pitch: { step: 'C', octave: 3 }
                        }),
                        createRest({
                          id: 'cello-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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

    expect(timeline.events.map((event) => event.eventId)).toEqual([
      'violin-note',
      'cello-note',
      'violin-rest',
      'cello-rest'
    ])
    expect(timeline.events[0]).toMatchObject({
      partId: 'violin',
      staffId: 'staff-1',
      voiceId: 'voice-1'
    })
    expect(timeline.events[1]).toMatchObject({
      partId: 'cello',
      staffId: 'staff-1',
      voiceId: 'voice-1'
    })
    expect(timeline.events.slice(0, 2).map((event) => event.startBeat)).toEqual([
      0,
      0
    ])
    expect(timeline.totalBeats).toBe(4)
  })

  it('keeps simultaneous voices addressable on one staff', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              id: 'staff-top',
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createNote({
                          id: 'upper-c',
                          pitch: { step: 'C', octave: 5 }
                        }),
                        createRest({
                          id: 'upper-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    }),
                    createVoice({
                      id: 'voice-2',
                      events: [
                        createNote({
                          id: 'lower-c',
                          pitch: { step: 'C', octave: 3 }
                        }),
                        createRest({
                          id: 'lower-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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

    expect(timeline.events.slice(0, 2).map((event) => event.voiceId)).toEqual([
      'voice-1',
      'voice-2'
    ])
    expect(timeline.events.slice(0, 2).map((event) => event.startBeat)).toEqual([
      0,
      0
    ])
  })

  it('tremolo.playback-data carries single-note tremolo marks into playback events', () => {
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
                          id: 'tremolo-note',
                          pitch: { step: 'C', octave: 4 },
                          tremolo: {
                            type: 'single',
                            marks: 3
                          }
                        }),
                        createRest({
                          id: 'tremolo-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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

    expect(createPlaybackTimeline(score).events[0].tremolo).toEqual({
      type: 'single',
      marks: 3
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

  it('playback.tie-and-triplet-duration merges tied notes into one sustained playback event', () => {
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

  it('playback.tie-and-triplet-duration places triplet events on proportional playback beats', () => {
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

  it('maps dynamic markings to playback velocity', () => {
    const score = createScore({
      dynamics: [
        {
          id: 'dynamic-p',
          measureId: 'measure-1',
          value: 'p'
        }
      ],
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
                          id: 'soft-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
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
    const event = createPlaybackTimeline(score).events[0]

    expect(event.velocityStart).toBeCloseTo(0.09)
    expect(event.velocityEnd).toBeCloseTo(0.09)
  })

  it.each([
    { type: 'crescendo' as const, endVelocity: 0.24 },
    { type: 'diminuendo' as const, endVelocity: 0.08 }
  ])(
    'playback.hairpin-velocity ramps playback velocity across $type hairpins',
    ({ type, endVelocity }) => {
      const score = createScore({
        hairpins: [
          {
            id: 'hairpin-1',
            startEventId: 'note-start',
            endEventId: 'note-end',
            type
          }
        ],
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
                            id: 'note-start',
                            position: createTimePosition(0),
                            pitch: { step: 'C', octave: 4 }
                          }),
                          createNote({
                            id: 'note-end',
                            position: createTimePosition(TICKS_PER_QUARTER),
                            pitch: { step: 'D', octave: 4 }
                          }),
                          createRest({
                            id: 'rest-fill',
                            position: createTimePosition(TICKS_PER_QUARTER * 2),
                            duration: createDuration('half')
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
      const [start, end, rest] = createPlaybackTimeline(score).events

      expect(start.velocityStart).toBeCloseTo(0.16)
      expect(Math.sign(start.velocityEnd - start.velocityStart)).toBe(
        type === 'crescendo' ? 1 : -1
      )
      expect(end.velocityEnd).toBeCloseTo(endVelocity)
      expect(rest.velocityStart).toBeCloseTo(0.16)
    }
  )

  it('playback.fermata-delay extends playback time after fermatas', () => {
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
                          id: 'held-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          fermata: true
                        }),
                        createNote({
                          id: 'after-fermata',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 4 }
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

    expect(timeline.events[0]).toMatchObject({
      eventId: 'held-note',
      startBeat: 0,
      durationBeats: 1.5
    })
    expect(timeline.events[1]).toMatchObject({
      eventId: 'after-fermata',
      startBeat: 1.5,
      durationBeats: 1
    })
    expect(timeline.totalBeats).toBe(2.5)
  })
})
