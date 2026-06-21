import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  createVoice,
  validateMeasureRhythm
} from '../score-core'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'

const fixture = readFileSync(
  resolve('src/musicxml/fixtures/single-part-treble.musicxml'),
  'utf8'
)

describe('MusicXML MVP', () => {
  it('parses a single-part treble-clef fixture into score-core', () => {
    const score = parseMusicXml(fixture)

    expect(score).toMatchObject({
      title: 'MusicXML Sketch',
      composer: 'in-C',
      parts: [
        {
          id: 'P1',
          name: 'Piano',
          abbreviation: 'Pno.',
          staves: [
            {
              id: 'P1-staff-1',
              measures: [
                {
                  id: 'measure-1',
                  number: 1,
                  clef: {
                    sign: 'G',
                    line: 2
                  },
                  keySignature: {
                    fifths: 0,
                    mode: 'major'
                  },
                  timeSignature: {
                    beats: 4,
                    beatType: 4
                  },
                  voices: [
                    {
                      id: 'voice-1',
                      events: [
                        {
                          type: 'note',
                          position: {
                            tick: 0
                          },
                          pitch: {
                            step: 'C',
                            octave: 4
                          },
                          duration: {
                            value: 'quarter',
                            dots: 0
                          }
                        },
                        {
                          type: 'note',
                          position: {
                            tick: TICKS_PER_QUARTER
                          },
                          pitch: {
                            step: 'F',
                            octave: 4,
                            alter: 1
                          }
                        },
                        {
                          type: 'rest',
                          position: {
                            tick: TICKS_PER_QUARTER * 2
                          },
                          duration: {
                            value: 'half'
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  })

  it('exports and re-imports the supported subset', () => {
    const score = parseMusicXml(fixture)
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<score-partwise version="4.0">')
    expect(exported).toContain('<alter>1</alter>')
    expect(exported).toContain('<rest/>')
    expect(roundTrip).toEqual(score)
  })

  it('rejects multiple parts instead of silently dropping data', () => {
    const invalid = fixture.replace(
      '</score-partwise>',
      '<part id="P2"><measure number="1"/></part></score-partwise>'
    )

    expect(() => parseMusicXml(invalid)).toThrow(
      '단일 part MusicXML만 가져올 수 있습니다'
    )
  })

  it('rejects rhythmically incomplete measures during import and export', () => {
    const incompleteXml = fixture.replace(
      /<note>\s*<rest\/>[\s\S]*?<\/note>/,
      ''
    )

    expect(() => parseMusicXml(incompleteXml)).toThrow(
      '리듬 정합성이 올바르지 않습니다: gap'
    )

    const incompleteScore = createScore({
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
                          position: createTimePosition(TICKS_PER_QUARTER),
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

    expect(() => serializeMusicXml(incompleteScore)).toThrow(
      '리듬 정합성이 올바르지 않습니다: gap'
    )
  })

  it('preserves pickup measure duration across MusicXML round trips', () => {
    const pickupScore = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  timing: {
                    type: 'pickup',
                    durationTicks: TICKS_PER_QUARTER
                  },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'pickup-note',
                          position: createTimePosition(0),
                          pitch: {
                            step: 'G',
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

    const exported = serializeMusicXml(pickupScore)
    const roundTrip = parseMusicXml(exported)
    const measure = roundTrip.parts[0].staves[0].measures[0]

    expect(exported).toContain('implicit="yes"')
    expect(measure.timing).toEqual({
      type: 'pickup',
      durationTicks: TICKS_PER_QUARTER
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('exports only the accidentals that change written pitch context', () => {
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
                          pitch: { step: 'F', octave: 4, alter: 1 }
                        }),
                        createNote({
                          id: 'natural-f',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'F', octave: 4, alter: 0 }
                        }),
                        createNote({
                          id: 'continued-natural-f',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'F', octave: 4, alter: 0 }
                        }),
                        createNote({
                          id: 'restored-f-sharp',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
                          pitch: { step: 'F', octave: 4, alter: 1 }
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
    const exported = serializeMusicXml(score)
    const roundTripEvents =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<accidental>natural<\/accidental>/g)).toHaveLength(1)
    expect(exported.match(/<accidental>sharp<\/accidental>/g)).toHaveLength(1)
    expect(roundTripEvents.map((event) => event.type === 'note' && event.pitch))
      .toEqual([
        { step: 'F', octave: 4, alter: 1 },
        { step: 'F', octave: 4, alter: 0 },
        { step: 'F', octave: 4, alter: 0 },
        { step: 'F', octave: 4, alter: 1 }
      ])
  })

  it('preserves tie start and stop markers across MusicXML round trips', () => {
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
    const exported = serializeMusicXml(score)
    const events =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported).toContain('<tie type="start"/>')
    expect(exported).toContain('<tie type="stop"/>')
    expect(exported).toContain('<tied type="start"/>')
    expect(exported).toContain('<tied type="stop"/>')
    expect(events).toMatchObject([
      { type: 'note', ties: { start: true } },
      { type: 'note', ties: { stop: true } }
    ])
  })

  it('preserves multiple augmentation dots across MusicXML round trips', () => {
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
                          id: 'double-dotted-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('quarter', 2)
                        }),
                        createRest({
                          id: 'double-dotted-rest',
                          position: createTimePosition(
                            TICKS_PER_QUARTER * 1.75
                          ),
                          duration: createDuration('quarter', 2)
                        }),
                        createRest({
                          id: 'final-rest',
                          position: createTimePosition(
                            TICKS_PER_QUARTER * 3.5
                          ),
                          duration: createDuration('eighth')
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
    const exported = serializeMusicXml(score)
    const events =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<dot\/>/g)).toHaveLength(4)
    expect(events).toMatchObject([
      { type: 'note', duration: { value: 'quarter', dots: 2 } },
      { type: 'rest', duration: { value: 'quarter', dots: 2 } },
      { type: 'rest', duration: { value: 'eighth', dots: 0 } }
    ])
  })
})
