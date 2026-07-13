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

  it('exports and re-imports a global tempo marking', () => {
    const score = createScore({
      title: 'Tempo Sketch',
      tempo: {
        bpm: 96,
        text: '♩ = 96'
      }
    })
    const exported = serializeMusicXml(score)
    const roundTrip = parseMusicXml(exported)

    expect(exported).toContain('<sound tempo="96"/>')
    expect(roundTrip.tempo).toEqual({
      bpm: 96,
      text: '♩ = 96'
    })
  })

  it('exports and re-imports rehearsal marks', () => {
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

  it('exports and re-imports staff text words', () => {
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

  it('exports and re-imports dynamic markings', () => {
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

  it('preserves measure attribute changes while normalizing note order to the score timeline', () => {
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

  it('rejects MusicXML backup and forward instead of importing ambiguous time order', () => {
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
})
