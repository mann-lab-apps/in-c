import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createDuration,
  createMeasure,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
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

  it('rejects input that crosses a measure boundary', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('half'),
      mode: 'note'
    })

    expect(buildSequentialInput(score, state, 'C', idSequence())).toBeUndefined()
  })
})

function twoMeasureScore() {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
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
                voices: [
                  createVoice({
                    id: 'voice-1'
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
