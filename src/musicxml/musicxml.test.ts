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
const releaseQaFixture = readFileSync(
  resolve('src/musicxml/fixtures/release-qa.musicxml'),
  'utf8'
)
const compositionCatalog = JSON.parse(
  readFileSync(resolve('site/compositions-catalog.json'), 'utf8')
) as {
  compositions: Array<{
    slug: string
    status: string
    assets?: {
      musicxml?: string
    }
  }>
}

describe('MusicXML MVP', () => {
  it('parses every available public Composition MusicXML file', () => {
    const availableCompositions = compositionCatalog.compositions.filter(
      (composition) => composition.status === 'available'
    )

    expect(availableCompositions.length).toBeGreaterThan(0)

    for (const composition of availableCompositions) {
      const musicXmlPath = composition.assets?.musicxml

      expect(musicXmlPath, `${composition.slug} missing MusicXML path`).toBeTruthy()

      const score = parseMusicXml(
        readFileSync(
          resolve('site/public', musicXmlPath!.replace(/^\.\//, '')),
          'utf8'
        )
      )

      expect(score.title, composition.slug).toBeTruthy()

      for (const part of score.parts) {
        for (const staff of part.staves) {
          for (const measure of staff.measures) {
            expect(
              validateMeasureRhythm(measure).status,
              `${composition.slug} measure ${measure.number} rhythm`
            ).toBe('exact')
          }
        }
      }
    }
  })

  it('import-export.import-valid-single-voice parses a single-part treble-clef fixture into score-core', () => {
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

  it('parses the release QA fixture with visual-regression expressions', () => {
    const score = parseMusicXml(releaseQaFixture)

    expect(score).toMatchObject({
      title: 'Release QA Scenario',
      composer: 'in-C QA',
      tempo: {
        bpm: 92
      },
      rehearsalMarks: [
        {
          measureId: 'measure-1',
          text: 'A'
        }
      ],
      dynamics: [
        {
          measureId: 'measure-1',
          value: 'mf'
        },
        {
          measureId: 'measure-4',
          value: 'p'
        }
      ]
    })

    const measures = score.parts[0].staves[0].measures

    expect(measures).toHaveLength(4)
    expect(measures.every((measure) => validateMeasureRhythm(measure).isExact)).toBe(true)
    expect(measures[0].voices[0].events[0]).toMatchObject({
      type: 'note',
      articulations: ['staccato']
    })
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      fermata: true
    })
    expect(measures[2].voices[0].events[0]).toMatchObject({
      type: 'rest',
      fermata: true
    })
    expect(score.hairpins).toHaveLength(1)
    expect(score.hairpins?.[0]).toMatchObject({
      type: 'crescendo'
    })
    expect(score.hairpins?.[0].startEventId).toBeTruthy()
    expect(score.hairpins?.[0].endEventId).toBeTruthy()
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

  it('exports and re-imports a global tempo marking', () => {
    const score = createScore({
      title: 'Tempo Sketch',
      tempo: {
        bpm: 96,
        beatUnit: 'quarter',
        text: 'Allegro ♩ = 96'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<sound tempo="96"/>')
    expect(exported).toContain('<words>Allegro ♩ = 96</words>')
    expect(roundTrip.tempo).toEqual({
      bpm: 96,
      beatUnit: 'quarter',
      dots: 0,
      text: 'Allegro ♩ = 96'
    })
  })

  it('round-trips dotted tempo beat units', () => {
    const score = createScore({
      title: 'Dotted Tempo Sketch',
      tempo: {
        bpm: 72,
        beatUnit: 'quarter',
        dots: 1,
        text: 'Andante dotted quarter = 72'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<beat-unit>quarter</beat-unit>')
    expect(exported).toContain('<beat-unit-dot/>')
    expect(roundTrip.tempo).toEqual({
      bpm: 72,
      beatUnit: 'quarter',
      dots: 1,
      text: 'Andante dotted quarter = 72'
    })
  })

  it('exports and re-imports transparent tempo markings', () => {
    const score = createScore({
      title: 'Transparent Tempo Sketch',
      tempo: {
        bpm: 120,
        beatUnit: 'quarter',
        text: '♩ = 120',
        transparent: true
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('print-object="no"')
    expect(roundTrip.tempo).toEqual({
      bpm: 120,
      beatUnit: 'quarter',
      dots: 0,
      text: '♩ = 120',
      transparent: true
    })
  })

  it('exports and re-imports positioned tempo events', () => {
    const score = createScore({
      title: 'Tempo Map Sketch',
      tempo: {
        bpm: 96,
        beatUnit: 'quarter',
        text: 'Allegro'
      },
      tempoEvents: [
        {
          id: 'tempo-rit',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER * 2,
          bpm: 72,
          beatUnit: 'quarter',
          dots: 1,
          text: 'rit.'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain(`<offset>${TICKS_PER_QUARTER * 2}</offset>`)
    expect(roundTrip.tempoEvents).toEqual([
      {
        id: 'measure-1-tempo-2',
        measureId: 'measure-1',
        tick: TICKS_PER_QUARTER * 2,
        bpm: 72,
        beatUnit: 'quarter',
        dots: 1,
        text: 'rit.'
      }
    ])
  })

  it('layout.rehearsal-mark exports and re-imports rehearsal marks', () => {
    const score = createScore({
      title: 'Marked Sketch',
      rehearsalMarks: [
        {
          id: 'rehearsal-a',
          measureId: 'measure-1',
          text: 'A'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<rehearsal>A</rehearsal>')
    expect(roundTrip.rehearsalMarks).toEqual([
      {
        id: 'measure-1-rehearsal-1',
        measureId: 'measure-1',
        text: 'A'
      }
    ])
  })

  it('layout.staff-text exports and re-imports staff text words', () => {
    const score = createScore({
      title: 'Text Sketch',
      staffTexts: [
        {
          id: 'staff-text-1',
          measureId: 'measure-1',
          text: 'dolce'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<words>dolce</words>')
    expect(roundTrip.staffTexts).toEqual([
      {
        id: 'measure-1-staff-text-1',
        measureId: 'measure-1',
        text: 'dolce'
      }
    ])
  })

  it('layout.dynamics exports and re-imports dynamic markings in the same measure', () => {
    const score = createScore({
      title: 'Dynamic Sketch',
      dynamics: [
        {
          id: 'dynamic-mf',
          measureId: 'measure-1',
          value: 'mf'
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<mf/>')
    expect(roundTrip.dynamics).toEqual([
      {
        id: 'measure-1-dynamic-1',
        measureId: 'measure-1',
        value: 'mf'
      }
    ])
  })

  it('exports and re-imports hairpin wedges', () => {
    const score = createScore({
      title: 'Hairpin Sketch',
      hairpins: [
        {
          id: 'hairpin-cresc',
          startEventId: 'note-start',
          endEventId: 'note-end',
          type: 'crescendo'
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<wedge type="crescendo"/>')
    expect(exported).toContain('<wedge type="stop"/>')
    expect(roundTrip.hairpins).toEqual([
      {
        id: 'hairpin-1-1-2',
        startEventId: 'event-1',
        endEventId: 'event-2',
        type: 'crescendo'
      }
    ])
  })

  it('exports and re-imports note articulations', () => {
    const score = createScore({
      title: 'Articulation Sketch',
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
                          id: 'note-articulated',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          articulations: ['staccato', 'accent']
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const event = roundTrip.parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<staccato/>')
    expect(exported).toContain('<accent/>')
    expect(event).toMatchObject({
      type: 'note',
      articulations: ['staccato', 'accent']
    })
  })

  it('exports and re-imports fermatas on notes and rests', () => {
    const score = createScore({
      title: 'Fermata Sketch',
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
                          id: 'note-fermata',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          fermata: true
                        }),
                        createRest({
                          id: 'rest-fermata',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('quarter'),
                          fermata: true
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const events = roundTrip.parts[0].staves[0].measures[0].voices[0].events

    expect(exported.match(/<fermata\/>/g)).toHaveLength(2)
    expect(events[0]).toMatchObject({
      type: 'note',
      fermata: true
    })
    expect(events[1]).toMatchObject({
      type: 'rest',
      fermata: true
    })
  })

  it('exports and re-imports breath marks and caesuras', () => {
    const score = createScore({
      title: 'Breath Sketch',
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
                          id: 'note-breath',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          breathMark: 'breath'
                        }),
                        createRest({
                          id: 'rest-caesura',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('quarter'),
                          breathMark: 'caesura'
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const events = roundTrip.parts[0].staves[0].measures[0].voices[0].events

    expect(exported).toContain('<breath-mark/>')
    expect(exported).toContain('<caesura/>')
    expect(events[0]).toMatchObject({
      type: 'note',
      breathMark: 'breath'
    })
    expect(events[1]).toMatchObject({
      type: 'rest',
      breathMark: 'caesura'
    })
  })

  it('exports and re-imports single-note tremolo markings', () => {
    const score = createScore({
      title: 'Tremolo Sketch',
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
                          id: 'note-tremolo',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          tremolo: {
                            type: 'single',
                            marks: 3
                          }
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const event = roundTrip.parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<tremolo type="single">3</tremolo>')
    expect(event).toMatchObject({
      type: 'note',
      tremolo: {
        type: 'single',
        marks: 3
      }
    })
  })

  it('exports and re-imports octave shift spans', () => {
    const score = createScore({
      title: 'Octave Shift Sketch',
      octaveShifts: [
        {
          id: 'octave-8va',
          startEventId: 'note-start',
          endEventId: 'note-end',
          type: '8va'
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
                          pitch: { step: 'C', octave: 5 }
                        }),
                        createNote({
                          id: 'note-end',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 5 }
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<octave-shift type="up" size="8"/>')
    expect(exported).toContain('<octave-shift type="stop" size="8"/>')
    expect(roundTrip.octaveShifts).toEqual([
      {
        id: 'octave-shift-1-1-2',
        startEventId: 'event-1',
        endEventId: 'event-2',
        type: '8va'
      }
    ])
  })

  it('exports and re-imports repeat barlines', () => {
    const score = createScore({
      title: 'Repeat Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  repeat: {
                    start: true,
                    end: true,
                    times: 3
                  }
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)
    const repeat = roundTrip.parts[0].staves[0].measures[0].repeat

    expect(exported).toContain('<repeat direction="forward"/>')
    expect(exported).toContain('<repeat direction="backward" times="3"/>')
    expect(repeat).toEqual({
      start: true,
      end: true,
      times: 3
    })
  })

  it('exports and re-imports supported clef changes', () => {
    const score = createScore({
      title: 'Clef Sketch',
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  clef: {
                    sign: 'F',
                    line: 4
                  }
                })
              ]
            })
          ]
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<sign>F</sign>')
    expect(exported).toContain('<line>4</line>')
    expect(roundTrip.parts[0].staves[0].measures[0].clef).toEqual({
      sign: 'F',
      line: 4
    })
  })

  it('exports and re-imports slurs', () => {
    const score = createScore({
      title: 'Slur Sketch',
      slurs: [
        {
          id: 'slur-phrase',
          startEventId: 'note-slur-start',
          endEventId: 'note-slur-end',
          number: 2
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
                          id: 'note-slur-start',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'note-slur-end',
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<slur type="start" number="2"/>')
    expect(exported).toContain('<slur type="stop" number="2"/>')
    expect(roundTrip.slurs).toEqual([
      {
        id: 'slur-1',
        startEventId: 'event-1',
        endEventId: 'event-2',
        number: 2
      }
    ])
  })

  it('exports and re-imports overlapping slurs with distinct numbers', () => {
    const score = createScore({
      title: 'Nested Slur Sketch',
      slurs: [
        {
          id: 'outer-slur',
          startEventId: 'note-1',
          endEventId: 'note-3',
          number: 1
        },
        {
          id: 'inner-slur',
          startEventId: 'note-1',
          endEventId: 'note-2',
          number: 2
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
                          id: 'note-1',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'note-2',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createNote({
                          id: 'note-3',
                          position: createTimePosition(TICKS_PER_QUARTER * 2),
                          pitch: { step: 'E', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fill',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
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
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<slur type="start" number="1"/>')
    expect(exported).toContain('<slur type="start" number="2"/>')
    expect(exported).toContain('<slur type="stop" number="1"/>')
    expect(exported).toContain('<slur type="stop" number="2"/>')
    expect(roundTrip.slurs).toEqual([
      {
        id: 'slur-1',
        startEventId: 'event-1',
        endEventId: 'event-2',
        number: 2
      },
      {
        id: 'slur-2',
        startEventId: 'event-1',
        endEventId: 'event-3',
        number: 1
      }
    ])
  })

  it('parses every direction-type when a MusicXML direction contains multiple entries', () => {
    const xml = fixture.replace(
      '</attributes>',
      `</attributes>
      <direction>
        <direction-type>
          <rehearsal>A</rehearsal>
        </direction-type>
        <direction-type>
          <words>dolce</words>
        </direction-type>
        <direction-type>
          <dynamics>
            <mf/>
          </dynamics>
        </direction-type>
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>88</per-minute>
          </metronome>
        </direction-type>
      </direction>`
    )
    const score = parseMusicXml(xml)

    expect(score.tempo).toEqual({
      bpm: 88,
      beatUnit: 'quarter',
      dots: 0,
      text: '♩ = 88'
    })
    expect(score.rehearsalMarks).toEqual([
      {
        id: 'measure-1-rehearsal-1-1',
        measureId: 'measure-1',
        text: 'A'
      }
    ])
    expect(score.staffTexts).toEqual([
      {
        id: 'measure-1-staff-text-1-2',
        measureId: 'measure-1',
        text: 'dolce'
      }
    ])
    expect(score.dynamics).toEqual([
      {
        id: 'measure-1-dynamic-1-3',
        measureId: 'measure-1',
        value: 'mf'
      }
    ])
  })

  it('rejects MusicXML hairpins that never stop', () => {
    const xml = fixture.replace(
      '</attributes>',
      `</attributes>
      <direction>
        <direction-type>
          <wedge type="crescendo"/>
        </direction-type>
      </direction>`
    )

    expect(() => parseMusicXml(xml)).toThrow('hairpin의 종료 표식이 없습니다')
  })

  it('rejects MusicXML slurs that never stop', () => {
    const xml = fixture.replace(
      '<type>quarter</type>',
      `<type>quarter</type>
        <notations>
          <slur type="start" number="1"/>
        </notations>`
    )

    expect(() => parseMusicXml(xml)).toThrow('slur의 종료 표식이 없습니다')
  })

  it('rejects MusicXML integer fields with decimal or trailing text', () => {
    expect(() =>
      parseMusicXml(fixture.replace('<divisions>4</divisions>', '<divisions>4.5</divisions>'))
    ).toThrow('MusicXML 정수 값이 올바르지 않습니다: divisions')

    expect(() =>
      parseMusicXml(fixture.replace('<duration>4</duration>', '<duration>4abc</duration>'))
    ).toThrow('MusicXML 정수 값이 올바르지 않습니다: duration')
  })

  it('rejects note-level staff assignments outside the supported single staff', () => {
    const xml = fixture.replace(
      '<voice>1</voice>',
      `<voice>1</voice>
        <staff>2</staff>`
    )

    expect(() => parseMusicXml(xml)).toThrow('staff 1만 지원합니다')
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

  it('import-export.preserve-measure-attributes preserves measure attribute changes while normalizing note order to the score timeline', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>2</beats>
          <beat-type>4</beat-type>
        </time>
        <staves>1</staves>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <attributes>
        <key>
          <fifths>1</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>3</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>2</duration>
        <voice>1</voice>
        <type>half</type>
      </note>
    </measure>
  </part>
</score-partwise>`
    const score = parseMusicXml(xml)
    const [firstMeasure, secondMeasure] = score.parts[0].staves[0].measures
    const roundTrip = parseMusicXml(serializeMusicXml(score))

    expect(firstMeasure).toMatchObject({
      keySignature: { fifths: 0, mode: 'major' },
      timeSignature: { beats: 2, beatType: 4 }
    })
    expect(secondMeasure).toMatchObject({
      keySignature: { fifths: 1, mode: 'major' },
      timeSignature: { beats: 3, beatType: 4 }
    })
    expect(firstMeasure.voices[0].events).toMatchObject([
      { type: 'note', position: { tick: 0 } },
      { type: 'rest', position: { tick: TICKS_PER_QUARTER } }
    ])
    expect(secondMeasure.voices[0].events).toMatchObject([
      { type: 'note', position: { tick: 0 } },
      { type: 'rest', position: { tick: TICKS_PER_QUARTER } }
    ])
    expect(validateMeasureRhythm(firstMeasure).isExact).toBe(true)
    expect(validateMeasureRhythm(secondMeasure).isExact).toBe(true)
    expect(roundTrip.parts[0].staves[0].measures).toMatchObject([
      {
        keySignature: { fifths: 0, mode: 'major' },
        timeSignature: { beats: 2, beatType: 4 }
      },
      {
        keySignature: { fifths: 1, mode: 'major' },
        timeSignature: { beats: 3, beatType: 4 }
      }
    ])
  })

  it('import-export.reject-time-movement rejects MusicXML backup and forward instead of importing ambiguous time order', () => {
    const backupXml = fixture.replace(
      '</measure>',
      '<backup><duration>1</duration></backup></measure>'
    )
    const forwardXml = fixture.replace(
      '</measure>',
      '<forward><duration>1</duration></forward></measure>'
    )

    expect(() => parseMusicXml(backupXml)).toThrow(
      'backup/forward를 지원하지 않습니다'
    )
    expect(() => parseMusicXml(forwardXml)).toThrow(
      'backup/forward를 지원하지 않습니다'
    )
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

  it('preserves mixed triplet groups across MusicXML round trips', () => {
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
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'triplet-note-1',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: tripletDuration
                        }),
                        createRest({
                          id: 'triplet-rest',
                          position: createTimePosition(
                            TICKS_PER_QUARTER / 3
                          ),
                          duration: tripletDuration
                        }),
                        createNote({
                          id: 'triplet-note-2',
                          position: createTimePosition(
                            (TICKS_PER_QUARTER * 2) / 3
                          ),
                          pitch: { step: 'E', octave: 4 },
                          duration: tripletDuration
                        }),
                        createRest({
                          id: 'remainder',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('half', 1)
                        })
                      ],
                      tuplets: [
                        {
                          id: 'triplet-1',
                          eventIds: [
                            'triplet-note-1',
                            'triplet-rest',
                            'triplet-note-2'
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
        })
      ]
    })
    const exported = serializeMusicXml(score)
    const voice =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0]

    expect(exported.match(/<time-modification>/g)).toHaveLength(3)
    expect(exported).toContain('<tuplet type="start"/>')
    expect(exported).toContain('<tuplet type="stop"/>')
    expect(voice.events.slice(0, 3)).toMatchObject([
      {
        type: 'note',
        duration: {
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        type: 'rest',
        duration: {
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        type: 'note',
        duration: {
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      }
    ])
    expect(voice.tuplets).toEqual([
      {
        id: 'measure-1-tuplet-1',
        eventIds: ['event-1', 'event-2', 'event-3'],
        actualNotes: 3,
        normalNotes: 2
      }
    ])
  })

  it('exports and re-imports single-voice chord notes', () => {
    const score = createScore({
      title: 'Chord Sketch',
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
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported.match(/<chord\/>/g)).toHaveLength(2)
    expect(event).toMatchObject({
      type: 'note',
      pitches: [
        { step: 'C', octave: 4 },
        { step: 'E', octave: 4 },
        { step: 'G', octave: 4 }
      ]
    })
  })

  it('exports and re-imports harmony symbols', () => {
    const score = createScore({
      title: 'Harmony Sketch',
      harmonies: [
        {
          id: 'cmaj7',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER,
          text: 'Cmaj7/G',
          root: { step: 'C' },
          kind: 'major-seventh',
          bass: { step: 'G' }
        }
      ]
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<harmony>')
    expect(exported).toContain('<root-step>C</root-step>')
    expect(exported).toContain('<bass-step>G</bass-step>')
    expect(roundTrip.harmonies).toEqual([
      {
        id: 'measure-1-harmony-1',
        measureId: 'measure-1',
        tick: TICKS_PER_QUARTER,
        text: 'Cmaj7/G',
        root: { step: 'C' },
        kind: 'major-seventh',
        bass: { step: 'G' }
      }
    ])
  })

  it('exports and re-imports lyrics on notes', () => {
    const score = createScore({
      title: 'Lyric Sketch',
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
                          id: 'sung-note',
                          pitch: { step: 'C', octave: 4 },
                          lyrics: [
                            {
                              number: 1,
                              syllabic: 'begin',
                              text: '사랑'
                            },
                            {
                              number: 2,
                              syllabic: 'single',
                              text: 'love',
                              extend: true
                            }
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
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<lyric number="1">')
    expect(exported).toContain('<text>사랑</text>')
    expect(event).toMatchObject({
      type: 'note',
      lyrics: [
        { number: 1, syllabic: 'begin', text: '사랑' },
        { number: 2, syllabic: 'single', text: 'love', extend: true }
      ]
    })
  })

  it('exports and re-imports grace notes and ornaments', () => {
    const score = createScore({
      title: 'Ornament Sketch',
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
                          id: 'ornamented-note',
                          pitch: { step: 'D', octave: 4 },
                          graceNotes: [
                            {
                              pitch: { step: 'C', octave: 4 },
                              slash: true
                            }
                          ],
                          ornaments: ['trill', 'turn']
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
    const exported = serializeMusicXml(score)
    const event =
      parseMusicXml(exported).parts[0].staves[0].measures[0].voices[0].events[0]

    expect(exported).toContain('<grace slash="yes"/>')
    expect(exported).toContain('<trill/>')
    expect(exported).toContain('<turn/>')
    expect(event).toMatchObject({
      type: 'note',
      graceNotes: [
        {
          pitch: { step: 'C', octave: 4 },
          slash: true
        }
      ],
      ornaments: ['trill', 'turn']
    })
  })
})
