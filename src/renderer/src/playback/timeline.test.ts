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

  it('playback.global-tempo converts tempo beat units to quarter-note playback BPM', () => {
    expect(
      tempoMarkingToQuarterBpm({
        bpm: 96,
        beatUnit: 'quarter'
      })
    ).toBe(96)
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

  it('playback.tempo-map maps positioned tempo events onto the playback timeline', () => {
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

  it('playback.tempo-map maps positioned tempo events attached outside the first staff timeline', () => {
    const score = createScore({
      tempoEvents: [
        {
          id: 'part-2-tempo-change',
          measureId: 'part-2-measure-2',
          tick: TICKS_PER_QUARTER,
          bpm: 84,
          beatUnit: 'quarter'
        }
      ],
      parts: [
        createPart({
          id: 'part-1',
          staves: [
            createStaff({
              measures: [
                createMeasure({ id: 'part-1-measure-1', number: 1 }),
                createMeasure({ id: 'part-1-measure-2', number: 2 })
              ]
            })
          ]
        }),
        createPart({
          id: 'part-2',
          staves: [
            createStaff({
              id: 'part-2-staff-1',
              measures: [
                createMeasure({ id: 'part-2-measure-1', number: 1 }),
                createMeasure({ id: 'part-2-measure-2', number: 2 })
              ]
            })
          ]
        })
      ]
    })
    const timeline = createPlaybackTimeline(score)

    expect(timeline.tempoEvents).toEqual([
      {
        id: 'part-2-tempo-change',
        measureId: 'part-2-measure-2',
        startBeat: 5,
        bpm: 84,
        quarterBpm: 84,
        text: undefined
      }
    ])
  })

  it('playback.tempo-map uses tempo events when converting playback beats and seconds', () => {
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

  it('applies repeat expansion score-wide across multiple parts', () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'violin',
          name: 'Violin',
          staves: [
            createStaff({
              id: 'violin-staff',
              measures: [
                createMeasure({
                  id: 'violin-measure-1',
                  number: 1,
                  repeat: {
                    start: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'violin-repeat-start',
                          pitch: { step: 'C', octave: 5 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'violin-measure-2',
                  number: 2,
                  repeat: {
                    end: true,
                    times: 3
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'violin-repeat-end',
                          pitch: { step: 'D', octave: 5 }
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
          name: 'Cello',
          staves: [
            createStaff({
              id: 'cello-staff',
              measures: [
                createMeasure({
                  id: 'cello-measure-1',
                  number: 1,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-repeat-start',
                          pitch: { step: 'C', octave: 3 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'cello-measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-repeat-end',
                          pitch: { step: 'D', octave: 3 }
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
        .filter((event) => event.partId === 'cello')
        .map((event) => `${event.eventId}:${event.startBeat}`)
    ).toEqual([
      'cello-repeat-start:0',
      'cello-repeat-end:4',
      'cello-repeat-start:8',
      'cello-repeat-end:12',
      'cello-repeat-start:16',
      'cello-repeat-end:20'
    ])
  })

  it('applies canonical volta playback across grand staff measures', () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'piano',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'right-hand',
              measures: [
                createMeasure({
                  id: 'right-measure-1',
                  number: 1,
                  repeat: {
                    start: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'right-start',
                          pitch: { step: 'C', octave: 5 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'right-measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'right-body',
                          pitch: { step: 'D', octave: 5 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'right-measure-3',
                  number: 3,
                  repeat: {
                    end: true
                  },
                  volta: {
                    number: 1,
                    start: true,
                    end: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'right-first-ending',
                          pitch: { step: 'E', octave: 5 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'right-measure-4',
                  number: 4,
                  volta: {
                    number: 2,
                    start: true,
                    end: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'right-second-ending',
                          pitch: { step: 'F', octave: 5 }
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            createStaff({
              id: 'left-hand',
              measures: [
                createMeasure({
                  id: 'left-measure-1',
                  number: 1,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'left-start',
                          pitch: { step: 'C', octave: 3 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'left-measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'left-body',
                          pitch: { step: 'D', octave: 3 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'left-measure-3',
                  number: 3,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'left-first-ending',
                          pitch: { step: 'E', octave: 3 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'left-measure-4',
                  number: 4,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'left-second-ending',
                          pitch: { step: 'F', octave: 3 }
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
        .filter((event) => event.staffId === 'left-hand')
        .map((event) => `${event.eventId}:${event.startBeat}`)
    ).toEqual([
      'left-start:0',
      'left-body:4',
      'left-first-ending:8',
      'left-start:12',
      'left-body:16',
      'left-second-ending:20'
    ])
  })

  it('duplicates tempo events inside score-wide repeated measures', () => {
    const score = createScore({
      tempoEvents: [
        {
          id: 'repeat-tempo',
          measureId: 'violin-measure-2',
          tick: TICKS_PER_QUARTER,
          bpm: 92,
          beatUnit: 'quarter'
        }
      ],
      parts: [
        createPart({
          id: 'violin',
          staves: [
            createStaff({
              id: 'violin-staff',
              measures: [
                createMeasure({
                  id: 'violin-measure-1',
                  repeat: {
                    start: true
                  }
                }),
                createMeasure({
                  id: 'violin-measure-2',
                  repeat: {
                    end: true,
                    times: 3
                  }
                })
              ]
            })
          ]
        }),
        createPart({
          id: 'cello',
          staves: [
            createStaff({
              id: 'cello-staff',
              measures: [
                createMeasure({ id: 'cello-measure-1' }),
                createMeasure({ id: 'cello-measure-2' })
              ]
            })
          ]
        })
      ]
    })
    const timeline = createPlaybackTimeline(score)

    expect(timeline.tempoEvents.map((event) => event.startBeat)).toEqual([
      5,
      13,
      21
    ])
    expect(timeline.tempoEvents.map((event) => event.quarterBpm)).toEqual([
      92,
      92,
      92
    ])
  })

  it('places measures after a repeat after the expanded playback section', () => {
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
                          id: 'repeat-start-note',
                          pitch: { step: 'C', octave: 4 }
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
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-3',
                  number: 3,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'after-repeat-note',
                          pitch: { step: 'E', octave: 4 }
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

    expect(timeline.totalBeats).toBe(28)
    expect(
      timeline.events
        .filter((event) => event.frequency !== undefined)
        .map((event) => `${event.eventId}:${event.startBeat}`)
    ).toEqual([
      'repeat-start-note:0',
      'repeat-end-note:4',
      'repeat-start-note:8',
      'repeat-end-note:12',
      'repeat-start-note:16',
      'repeat-end-note:20',
      'after-repeat-note:24'
    ])
  })

  it('skips alternate volta endings on matching repeat passes', () => {
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
                          id: 'repeat-start-note',
                          pitch: { step: 'C', octave: 4 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'repeat-body-note',
                          pitch: { step: 'D', octave: 4 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-3',
                  number: 3,
                  repeat: {
                    end: true
                  },
                  volta: {
                    number: 1,
                    start: true,
                    end: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'first-ending-note',
                          pitch: { step: 'E', octave: 4 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-4',
                  number: 4,
                  volta: {
                    number: 2,
                    start: true,
                    end: true
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'second-ending-note',
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
    const timeline = createPlaybackTimeline(score)

    expect(
      timeline.events
        .filter((event) => event.frequency !== undefined)
        .map((event) => `${event.eventId}:${event.startBeat}`)
    ).toEqual([
      'repeat-start-note:0',
      'repeat-body-note:4',
      'first-ending-note:8',
      'repeat-start-note:12',
      'repeat-body-note:16',
      'second-ending-note:20'
    ])
    expect(timeline.totalBeats).toBe(24)
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

  it('playback.cursor-selection-sync keeps simultaneous voices addressable on one staff', () => {
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

  it('playback.cursor-selection-sync preserves grand-staff staff and same-staff voice addresses together', () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'piano',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'right-hand',
              measures: [
                createMeasure({
                  id: 'right-measure-1',
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createNote({
                          id: 'right-upper',
                          pitch: { step: 'E', octave: 5 }
                        })
                      ]
                    }),
                    createVoice({
                      id: 'voice-2',
                      events: [
                        createNote({
                          id: 'right-lower-voice',
                          pitch: { step: 'C', octave: 4 }
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            createStaff({
              id: 'left-hand',
              measures: [
                createMeasure({
                  id: 'left-measure-1',
                  clef: { sign: 'F', line: 4 },
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createNote({
                          id: 'left-bass',
                          pitch: { step: 'C', octave: 3 }
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

    expect(
      timeline.events.map(
        (event) =>
          `${event.eventId}:${event.partId}:${event.staffId}:${event.measureId}:${event.voiceId}:${event.startBeat}`
      )
    ).toEqual([
      'right-upper:piano:right-hand:right-measure-1:voice-1:0',
      'right-lower-voice:piano:right-hand:right-measure-1:voice-2:0',
      'left-bass:piano:left-hand:left-measure-1:voice-1:0'
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

  it('carries trill ornaments and key-aware upper neighbor frequencies into playback events', () => {
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
                          id: 'trill-note',
                          pitch: { step: 'E', octave: 4 },
                          ornaments: ['trill']
                        }),
                        createRest({
                          id: 'trill-fill',
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

    expect(event).toMatchObject({
      eventId: 'trill-note',
      ornaments: ['trill']
    })
    expect(event.frequency).toBeCloseTo(329.628, 3)
    expect(event.trillFrequency).toBeCloseTo(369.994, 3)
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

  it('playback.tie-and-triplet-duration keeps cross-measure ties addressable per voice on one staff', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'measure-1',
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createRest({
                          id: 'upper-rest',
                          position: createTimePosition(0),
                          duration: createDuration('half', 1)
                        }),
                        createNote({
                          id: 'upper-tie-start',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
                          pitch: { step: 'C', octave: 5 },
                          ties: { start: true }
                        })
                      ]
                    }),
                    createVoice({
                      id: 'voice-2',
                      events: [
                        createNote({
                          id: 'lower-sustained-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 3 },
                          duration: createDuration('whole')
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createNote({
                          id: 'upper-tie-stop',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 5 },
                          ties: { stop: true }
                        }),
                        createRest({
                          id: 'upper-fill',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ]
                    }),
                    createVoice({
                      id: 'voice-2',
                      events: [
                        createRest({
                          id: 'lower-fill',
                          position: createTimePosition(0),
                          duration: createDuration('whole')
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
    const upperTie = timeline.events.find(
      (event) => event.eventId === 'upper-tie-start'
    )

    expect(upperTie).toMatchObject({
      voiceId: 'voice-1',
      measureId: 'measure-1',
      startBeat: 3,
      durationBeats: 2
    })
    expect(
      timeline.events.some((event) => event.eventId === 'upper-tie-stop')
    ).toBe(false)
    expect(
      timeline.events.find((event) => event.eventId === 'lower-sustained-note')
    ).toMatchObject({
      voiceId: 'voice-2',
      startBeat: 0,
      durationBeats: 4
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

  it('playback.tie-and-triplet-duration keeps ensemble tuplets on the shared beat grid', () => {
    const tripletDuration = {
      ...createDuration('eighth'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const score = createScore({
      parts: [
        createPart({
          id: 'violin',
          name: 'Violin',
          staves: [
            createStaff({
              id: 'violin-staff',
              measures: [
                createMeasure({
                  id: 'violin-measure-1',
                  voices: [
                    createVoice({
                      events: [
                        ...Array.from({ length: 3 }, (_, index) =>
                          createNote({
                            id: `violin-triplet-${index + 1}`,
                            position: createTimePosition(
                              (TICKS_PER_QUARTER / 3) * index
                            ),
                            pitch: { step: 'E', octave: 5 },
                            duration: tripletDuration
                          })
                        )
                      ],
                      tuplets: [
                        {
                          id: 'violin-triplet',
                          eventIds: [
                            'violin-triplet-1',
                            'violin-triplet-2',
                            'violin-triplet-3'
                          ],
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
        }),
        createPart({
          id: 'cello',
          name: 'Cello',
          staves: [
            createStaff({
              id: 'cello-staff',
              measures: [
                createMeasure({
                  id: 'cello-measure-1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-downbeat',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 3 },
                          duration: createDuration('quarter')
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

    expect(
      timeline.events
        .filter((event) => event.partId === 'violin')
        .map((event) => event.startBeat)
    ).toEqual([0, 1 / 3, 2 / 3])
    expect(
      timeline.events.find((event) => event.eventId === 'cello-downbeat')
    ).toMatchObject({
      partId: 'cello',
      startBeat: 0,
      durationBeats: 1
    })
  })

  it('maps dynamic markings to playback velocity', () => {
    const score = createScore({
      dynamics: [
        {
          id: 'dynamic-ff',
          measureId: 'measure-1',
          value: 'ff'
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

    expect(event.velocityStart).toBeCloseTo(0.235)
    expect(event.velocityEnd).toBeCloseTo(0.235)
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
