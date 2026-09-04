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
  type Pitch,
  type Score
} from '../../../score-core'
import { createNewScore } from '../editor/new-score'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'

describe('MIDI export', () => {
  it('import-export.export-midi creates a type-1 MIDI file with tempo map and notes', () => {
    const score = createScore({
      title: 'MIDI Sketch',
      tempo: {
        bpm: 120,
        beatUnit: 'quarter'
      },
      tempoEvents: [
        {
          id: 'tempo-slow',
          measureId: 'measure-1',
          tick: TICKS_PER_QUARTER * 2,
          bpm: 60,
          beatUnit: 'quarter',
          text: 'meno mosso'
        }
      ],
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'measure-1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'chord-c-major',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          pitches: [
                            { step: 'C', octave: 4 },
                            { step: 'E', octave: 4 },
                            { step: 'G', octave: 4 }
                          ],
                          duration: createDuration('half')
                        }),
                        createRest({
                          id: 'rest-half',
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

    const bytes = Array.from(serializeMidi(score))

    expect(ascii(bytes, 0, 4)).toBe('MThd')
    expect(bytes.slice(8, 14)).toEqual([0x00, 0x01, 0x00, 0x02, 0x01, 0xe0])
    expect(countTrackChunks(bytes)).toBe(2)
    expect(containsSequence(bytes, [0xff, 0x51, 0x03, 0x07, 0xa1, 0x20])).toBe(true)
    expect(containsSequence(bytes, [0xff, 0x51, 0x03, 0x0f, 0x42, 0x40])).toBe(true)
    expect(containsSequence(bytes, [0x90, 60, 75])).toBe(true)
    expect(containsSequence(bytes, [0x90, 64, 75])).toBe(true)
    expect(containsSequence(bytes, [0x90, 67, 75])).toBe(true)
    expect(containsSequence(bytes, [0x80, 60, 0])).toBe(true)
    expect(containsSequence(bytes, [0xff, 0x2f, 0x00])).toBe(true)
  })

  it('import-export.export-midi separates ensemble parts into MIDI tracks, channels, and programs', () => {
    const score = createScore({
      title: 'MIDI Quartet',
      parts: [
        createPart({
          id: 'violin',
          name: 'Violin',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'violin-measure-1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'violin-e5',
                          position: createTimePosition(0),
                          pitch: { step: 'E', octave: 5 },
                          duration: createDuration('whole')
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
              measures: [
                createMeasure({
                  id: 'cello-measure-1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'cello-c3',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 3 },
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

    const bytes = Array.from(serializeMidi(score))

    expect(bytes.slice(8, 14)).toEqual([0x00, 0x01, 0x00, 0x03, 0x01, 0xe0])
    expect(countTrackChunks(bytes)).toBe(3)
    expect(containsSequence(bytes, [0xff, 0x03, 0x06, ...asciiBytes('Violin')])).toBe(true)
    expect(containsSequence(bytes, [0xff, 0x03, 0x05, ...asciiBytes('Cello')])).toBe(true)
    expect(containsSequence(bytes, [0xc0, 40])).toBe(true)
    expect(containsSequence(bytes, [0xc1, 42])).toBe(true)
    expect(containsSequence(bytes, [0x90, 76, 75])).toBe(true)
    expect(containsSequence(bytes, [0x91, 48, 75])).toBe(true)
  })

  it('import-export.export-midi skips percussion and tab staves with V1 policy warnings', () => {
    const score = createScore({
      title: 'MIDI Policy',
      parts: [
        createPart({
          id: 'piano',
          name: 'Piano',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'piano-measure-1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'piano-c4',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('whole')
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
          id: 'drums',
          name: 'Drum Set',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'drums-measure-1',
                  clef: { sign: 'percussion', line: 2 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'drum-c4',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('whole')
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
          id: 'guitar',
          name: 'Guitar Tab',
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'guitar-measure-1',
                  clef: { sign: 'tab', line: 5 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'tab-e4',
                          position: createTimePosition(0),
                          pitch: { step: 'E', octave: 4 },
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

    const report = serializeMidiWithReport(score)
    const bytes = Array.from(report.bytes)

    expect(report.warnings).toEqual([
      {
        code: 'unsupported-midi-clef',
        path: 'part[2].staff[1].measure[1].clef',
        message:
          'Percussion notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
      },
      {
        code: 'unsupported-midi-clef',
        path: 'part[3].staff[1].measure[1].clef',
        message:
          'Tab notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
      }
    ])
    expect(countTrackChunks(bytes)).toBe(4)
    expect(containsSequence(bytes, [0x90, 60, 75])).toBe(true)
    expect(containsSequence(bytes, [0x91, 60, 75])).toBe(false)
    expect(containsSequence(bytes, [0x92, 64, 75])).toBe(false)
  })

  it.each([
    {
      name: 'solo melody',
      score: seedFirstMeasureNotes(
        createNewScore({
          title: 'MIDI QA Solo',
          keySignature: { fifths: 0, mode: 'major' },
          timeSignature: { beats: 4, beatType: 4 },
          measureCount: 2,
          tempo: 120,
          templateId: 'solo-melody'
        }),
        {
          'part-1:staff-1': { step: 'C', octave: 4 }
        }
      ),
      trackCount: 2,
      trackNames: ['Chromatics Tempo', '멜로디'],
      programChanges: [[0xc0, 0]],
      noteOns: [[0x90, 60, 75]]
    },
    {
      name: 'piano grand staff',
      score: seedFirstMeasureNotes(
        createNewScore({
          title: 'MIDI QA Grand Staff',
          keySignature: { fifths: 0, mode: 'major' },
          timeSignature: { beats: 4, beatType: 4 },
          measureCount: 2,
          tempo: 120,
          templateId: 'piano-grand-staff'
        }),
        {
          'part-1:staff-1': { step: 'C', octave: 5 },
          'part-1:staff-2': { step: 'C', octave: 3 }
        }
      ),
      trackCount: 2,
      trackNames: ['Chromatics Tempo', 'Piano'],
      programChanges: [[0xc0, 0]],
      noteOns: [
        [0x90, 72, 75],
        [0x90, 48, 75]
      ]
    },
    {
      name: 'string quartet',
      score: seedFirstMeasureNotes(
        createNewScore({
          title: 'MIDI QA Quartet',
          keySignature: { fifths: 0, mode: 'major' },
          timeSignature: { beats: 4, beatType: 4 },
          measureCount: 2,
          tempo: 120,
          templateId: 'string-quartet'
        }),
        {
          'violin-1:staff-1': { step: 'E', octave: 5 },
          'violin-2:staff-1': { step: 'D', octave: 5 },
          'viola:staff-1': { step: 'C', octave: 4 },
          'cello:staff-1': { step: 'C', octave: 3 }
        }
      ),
      trackCount: 5,
      trackNames: [
        'Chromatics Tempo',
        'Violin I',
        'Violin II',
        'Viola',
        'Cello'
      ],
      programChanges: [
        [0xc0, 40],
        [0xc1, 40],
        [0xc2, 41],
        [0xc3, 42]
      ],
      noteOns: [
        [0x90, 76, 75],
        [0x91, 74, 75],
        [0x92, 60, 75],
        [0x93, 48, 75]
      ]
    }
  ])(
    'import-export.export-midi validates V1 QA fixture shape for $name',
    ({ score, trackCount, trackNames, programChanges, noteOns }) => {
      const report = serializeMidiWithReport(score)
      const bytes = Array.from(report.bytes)

      expect(ascii(bytes, 0, 4)).toBe('MThd')
      expect(readHeaderTrackCount(bytes)).toBe(trackCount)
      expect(countTrackChunks(bytes)).toBe(trackCount)
      expect(report.warnings).toEqual([])

      for (const trackName of trackNames) {
        expect(containsSequence(bytes, metaTextBytes(trackName))).toBe(true)
      }

      for (const programChange of programChanges) {
        expect(containsSequence(bytes, programChange)).toBe(true)
      }

      for (const noteOn of noteOns) {
        expect(containsSequence(bytes, noteOn)).toBe(true)
      }
    }
  )
})

function ascii(bytes: number[], start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

function asciiBytes(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0))
}

function utf8Bytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(value))
}

function metaTextBytes(value: string): number[] {
  const text = utf8Bytes(value)

  return [0xff, 0x03, text.length, ...text]
}

function containsSequence(bytes: number[], sequence: number[]): boolean {
  return bytes.some((_, index) =>
    sequence.every((value, offset) => bytes[index + offset] === value)
  )
}

function countTrackChunks(bytes: number[]): number {
  let count = 0

  for (let index = 0; index < bytes.length - 3; index += 1) {
    if (ascii(bytes, index, 4) === 'MTrk') {
      count += 1
    }
  }

  return count
}

function readHeaderTrackCount(bytes: number[]): number {
  return bytes[10] * 0x100 + bytes[11]
}

function seedFirstMeasureNotes(
  score: Score,
  pitchesByStaff: Record<string, Pitch>
): Score {
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      staves: part.staves.map((staff) => ({
        ...staff,
        measures: staff.measures.map((measure, measureIndex) => {
          const pitch = pitchesByStaff[`${part.id}:${staff.id}`]

          if (measureIndex !== 0 || !pitch) {
            return measure
          }

          return {
            ...measure,
            voices: [
              createVoice({
                events: [
                  createNote({
                    id: `${part.id}-${staff.id}-midi-qa-note`,
                    position: createTimePosition(0),
                    pitch,
                    duration: createDuration('whole')
                  })
                ]
              })
            ]
          }
        })
      }))
    }))
  }
}
