import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  type VoiceEvent,
  validateMeasureRhythm
} from '../../../score-core'
import {
  beginTupletInput,
  buildSequentialInput,
  cancelTupletInput,
  createNoteInputState,
  createTupletInputPreviewScore
} from './note-input-state'

const quarter = TICKS_PER_QUARTER
const target = {
  partId: 'part-1',
  staffId: 'staff-1',
  measureId: 'measure-1',
  voiceId: 'voice-1'
}

describe('note input state', () => {
  it.each(['whole', 'half', 'quarter', 'eighth', '16th'] as const)(
    'accepts %s duration for sequential input',
    (value) => {
      const score = createScore()
      const state = createNoteInputState({
        target,
        tick: 0,
        duration: createDuration(value),
        mode: 'note'
      })

      expect(
        buildSequentialInput(score, state, 'C', idSequence())
      ).toBeDefined()
    }
  )

  it('advances by the selected duration after note and rest input', () => {
    const score = createScore()
    const noteState = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const noteInput = buildSequentialInput(
      score,
      noteState,
      'C',
      idSequence()
    )
    const noteResult = applyScoreCommand(score, noteInput!.command)

    expect(noteInput!.nextState.tick).toBe(quarter)
    expect(readEvents(noteResult.score)[0]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C'
      }
    })

    const restState = {
      ...noteInput!.nextState,
      duration: createDuration('eighth'),
      mode: 'rest' as const
    }
    const restInput = buildSequentialInput(
      noteResult.score,
      restState,
      undefined,
      idSequence()
    )

    expect(restInput!.nextState.tick).toBe(quarter + quarter / 2)
  })

  it('advances note and rest input by double-dotted durations', () => {
    const score = createScore()
    const duration = createDuration('eighth', 2)
    const noteState = createNoteInputState({
      target,
      tick: 0,
      duration,
      mode: 'note'
    })
    const noteInput = buildSequentialInput(
      score,
      noteState,
      'C',
      idSequence()
    )
    const noteResult = applyScoreCommand(score, noteInput!.command)

    expect(noteInput!.nextState.tick).toBe(quarter * 0.875)
    expect(readEvents(noteResult.score)[0]).toMatchObject({
      type: 'note',
      duration: { value: 'eighth', dots: 2 }
    })

    const restState = {
      ...noteInput!.nextState,
      mode: 'rest' as const
    }
    const restInput = buildSequentialInput(
      noteResult.score,
      restState,
      undefined,
      idSequence()
    )

    expect(restInput!.nextState.tick).toBe(quarter * 1.75)
  })

  it('moves to the next existing measure at a barline', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'G', idSequence())

    expect(input!.nextState).toMatchObject({
      target: {
        measureId: 'measure-2'
      },
      tick: 0
    })
    expect(input!.command.type).toBe('voice-events.replace')
  })

  it('creates a new inherited measure at the end of the score', () => {
    const score = createScore()
    const state = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('whole'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(input!.command.type).toBe('score.batch')
    expect(measures).toHaveLength(2)
    expect(measures[1]).toMatchObject({
      id: 'measure-2',
      number: 2,
      clef: measures[0].clef,
      keySignature: measures[0].keySignature,
      timeSignature: measures[0].timeSignature
    })
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(input!.nextState).toMatchObject({
      target: {
        measureId: 'measure-2'
      },
      tick: 0
    })

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(score)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(
      result.score
    )
  })

  it('splits note input across a measure boundary and ties the segments', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('half'),
      mode: 'note'
    })

    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(input!.command.type).toBe('score.batch')
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      duration: { value: 'quarter' },
      ties: { start: true }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      position: { tick: 0 },
      duration: { value: 'quarter' },
      ties: { stop: true }
    })
    expect(input!.nextState).toMatchObject({
      target: { measureId: 'measure-2' },
      tick: quarter
    })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('keeps rests from crossing a measure boundary', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('half'),
      mode: 'rest'
    })

    expect(
      buildSequentialInput(score, state, undefined, idSequence())
    ).toBeUndefined()
  })

  it('creates an inherited measure for a tied overflow segment', () => {
    const score = scoreWithEvents(quarterRests(0))
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('whole'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(measures).toHaveLength(2)
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      duration: { value: 'quarter' },
      ties: { start: true }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      duration: { value: 'half', dots: 1 },
      ties: { stop: true }
    })
    expect(input!.nextState).toMatchObject({
      target: { measureId: 'measure-2' },
      tick: quarter * 3
    })
    expect(validateMeasureRhythm(measures[0]).isExact).toBe(true)
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
  })

  it('chooses the nearest octave from the preceding note', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-b4',
        position: createTimePosition(0),
        pitch: { step: 'B', octave: 4 }
      }),
      ...quarterRests(1)
    ])
    const state = createNoteInputState({
      target,
      tick: quarter,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)

    expect(readEvents(result.score)[1]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C',
        octave: 5,
        alter: 0
      }
    })
  })

  it('uses key signatures and same-measure accidental context', () => {
    const score = scoreWithEvents(quarterRests(0), 1)
    const firstState = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('quarter'),
      mode: 'note',
      accidental: 0
    })
    const firstInput = buildSequentialInput(score, firstState, 'F', idSequence())
    const firstResult = applyScoreCommand(score, firstInput!.command)
    const secondInput = buildSequentialInput(
      firstResult.score,
      firstInput!.nextState,
      'F',
      idSequence()
    )
    const secondResult = applyScoreCommand(firstResult.score, secondInput!.command)

    expect(firstInput!.nextState.accidental).toBeUndefined()
    expect(readEvents(secondResult.score).slice(0, 2)).toMatchObject([
      { type: 'note', pitch: { step: 'F', alter: 0 } },
      { type: 'note', pitch: { step: 'F', alter: 0 } }
    ])
  })

  it('resets accidental context at the next measure', () => {
    const score = twoMeasureScore(1)
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('quarter'),
      mode: 'note',
      accidental: 0
    })
    const firstInput = buildSequentialInput(score, state, 'F', idSequence())
    const firstResult = applyScoreCommand(score, firstInput!.command)
    const secondInput = buildSequentialInput(
      firstResult.score,
      firstInput!.nextState,
      'F',
      idSequence()
    )
    const secondResult = applyScoreCommand(firstResult.score, secondInput!.command)
    const measures = secondResult.score.parts[0].staves[0].measures

    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      pitch: { step: 'F', alter: 0 }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      pitch: { step: 'F', alter: 1 }
    })
  })

  it('buffers and commits a mixed eighth-note triplet as one command', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const second = buildSequentialInput(
      score,
      { ...first.nextState, mode: 'rest' },
      undefined,
      idSequence()
    )!
    const third = buildSequentialInput(
      score,
      { ...second.nextState, mode: 'note' },
      'E',
      idSequence()
    )!
    const result = applyScoreCommand(score, third.command)
    const voice = result.score.parts[0].staves[0].measures[0].voices[0]

    expect(first.pending).toBe(true)
    expect(second.pending).toBe(true)
    expect(third.pending).toBeUndefined()
    expect(third.command.type).toBe('voice-content.replace')
    expect(voice.events.slice(0, 3)).toMatchObject([
      {
        type: 'note',
        position: { tick: 0 },
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        type: 'rest',
        position: { tick: quarter / 3 }
      },
      {
        type: 'note',
        position: { tick: (quarter * 2) / 3 }
      }
    ])
    expect(voice.tuplets).toEqual([
      {
        id: 'tuplet-1',
        eventIds: voice.events.slice(0, 3).map((event) => event.id),
        actualNotes: 3,
        normalNotes: 2
      }
    ])
    expect(third.nextState).toMatchObject({
      tick: quarter,
      tupletInput: undefined,
      duration: {
        value: 'eighth',
        dots: 0
      }
    })
    expect(third.nextState.duration.tuplet).toBeUndefined()
    expect(
      validateMeasureRhythm(
        result.score.parts[0].staves[0].measures[0]
      ).isExact
    ).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('cancels a buffered tuplet without changing the score', () => {
    const state = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!
    const pending = buildSequentialInput(
      createScore(),
      state,
      'C',
      idSequence()
    )!
    const cancelled = cancelTupletInput(pending.nextState)

    expect(cancelled.tupletInput).toBeUndefined()
    expect(cancelled.duration.tuplet).toBeUndefined()
    expect(cancelled.tick).toBe(0)
  })

  it('previews staged tuplet members before the group is committed', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-preview'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const second = buildSequentialInput(
      score,
      { ...first.nextState, mode: 'note' },
      'E',
      idSequence()
    )!
    const preview = createTupletInputPreviewScore(score, second.nextState)
    const previewVoice = preview.parts[0].staves[0].measures[0].voices[0]
    const originalVoice = score.parts[0].staves[0].measures[0].voices[0]

    expect(second.pending).toBe(true)
    expect(originalVoice.tuplets).toBeUndefined()
    expect(originalVoice.events).toHaveLength(1)
    expect(previewVoice.events.slice(0, 3)).toMatchObject([
      {
        id: 'preview-tuplet-preview-1',
        type: 'note',
        position: { tick: 0 },
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        id: 'preview-tuplet-preview-2',
        type: 'note',
        position: { tick: quarter / 3 }
      },
      {
        id: 'preview-tuplet-preview-3',
        type: 'rest',
        position: { tick: (quarter * 2) / 3 }
      }
    ])
    expect(previewVoice.tuplets).toEqual([
      {
        id: 'preview-tuplet-preview',
        eventIds: [
          'preview-tuplet-preview-1',
          'preview-tuplet-preview-2',
          'preview-tuplet-preview-3'
        ],
        actualNotes: 3,
        normalNotes: 2
      }
    ])
    expect(
      validateMeasureRhythm(
        preview.parts[0].staves[0].measures[0]
      ).isExact
    ).toBe(true)
  })

  it('requires rest space before committing tuplet input', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-1',
        position: createTimePosition(0),
        duration: createDuration('quarter'),
        pitch: { step: 'C', octave: 4 }
      }),
      createRest({
        id: 'rest-1',
        position: createTimePosition(quarter),
        duration: createDuration('half')
      }),
      createRest({
        id: 'rest-2',
        position: createTimePosition(quarter * 3),
        duration: createDuration('quarter')
      })
    ])
    const noteState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'blocked'
    )!
    const restState = beginTupletInput(
      createNoteInputState({
        target,
        tick: quarter,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!

    expect(buildSequentialInput(score, noteState, 'C', idSequence()))
      .toBeUndefined()
    expect(buildSequentialInput(score, restState, 'C', idSequence()))
      .toBeDefined()
  })

  it('keeps the tuplet model open to other ratios', () => {
    const score = createScore()
    const quintupletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('16th'),
        mode: 'note'
      }),
      'tuplet-5',
      5,
      4
    )!
    const ids = idSequence()
    const first = buildSequentialInput(score, quintupletState, 'C', ids)!
    const second = buildSequentialInput(score, first.nextState, 'D', ids)!
    const third = buildSequentialInput(score, second.nextState, 'E', ids)!
    const fourth = buildSequentialInput(score, third.nextState, 'F', ids)!
    const fifth = buildSequentialInput(score, fourth.nextState, 'G', ids)!
    const result = applyScoreCommand(score, fifth.command)
    const voice = result.score.parts[0].staves[0].measures[0].voices[0]

    expect(first.pending).toBe(true)
    expect(fourth.pending).toBe(true)
    expect(fifth.pending).toBeUndefined()
    expect(voice.events.slice(0, 5)).toMatchObject(
      Array.from({ length: 5 }, () => ({
        duration: {
          value: '16th',
          tuplet: { actualNotes: 5, normalNotes: 4 }
        }
      }))
    )
    expect(voice.tuplets?.[0]).toMatchObject({
      actualNotes: 5,
      normalNotes: 4
    })
    expect(fifth.nextState).toMatchObject({
      tick: quarter,
      tupletInput: undefined
    })
  })

  it('rejects nested, dotted, and measure-crossing tuplet input', () => {
    const base = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('eighth'),
      mode: 'note'
    })
    const active = beginTupletInput(base, 'tuplet-1')!

    expect(beginTupletInput(active, 'nested')).toBeUndefined()
    expect(
      beginTupletInput(
        {
          ...base,
          duration: createDuration('eighth', 1)
        },
        'dotted'
      )
    ).toBeUndefined()

    const boundaryState = beginTupletInput(
      {
        ...base,
        tick: quarter * 3.5
      },
      'boundary'
    )!

    expect(
      buildSequentialInput(
        scoreWithEighthRests(),
        boundaryState,
        'C',
        idSequence()
      )
    ).toBeUndefined()
  })
})

function twoMeasureScore(fifths = 0) {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: Array.from({ length: 4 }, (_, index) =>
                      createRest({
                        id: `rest-${index + 1}`,
                        position: createTimePosition(quarter * index),
                        duration: createDuration('quarter')
                      })
                    )
                  })
                ]
              }),
              createMeasure({
                id: 'measure-2',
                number: 2,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: quarterRests(0)
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function scoreWithEvents(
  events: VoiceEvent[],
  fifths = 0
) {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function quarterRests(startIndex: number) {
  return Array.from({ length: 4 - startIndex }, (_, index) =>
    createRest({
      id: `rest-${startIndex + index + 1}`,
      position: createTimePosition(quarter * (startIndex + index)),
      duration: createDuration('quarter')
    })
  )
}

function scoreWithEighthRests() {
  return scoreWithEvents(
    Array.from({ length: 8 }, (_, index) =>
      createRest({
        id: `eighth-rest-${index + 1}`,
        position: createTimePosition((quarter / 2) * index),
        duration: createDuration('eighth')
      })
    )
  )
}

function readEvents(score: ReturnType<typeof createScore>) {
  return score.parts[0].staves[0].measures[0].voices[0].events
}

function idSequence() {
  let eventIndex = 0
  let measureIndex = 1

  return (kind: 'event' | 'measure') =>
    kind === 'event'
      ? `event-${++eventIndex}`
      : `measure-${++measureIndex}`
}
