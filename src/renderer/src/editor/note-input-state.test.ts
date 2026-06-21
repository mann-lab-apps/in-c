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
  buildSequentialInput,
  createNoteInputState
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
