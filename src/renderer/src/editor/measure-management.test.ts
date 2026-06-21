import { describe, expect, it } from 'vitest'

import {
  applyScoreCommand,
  createDuration,
  createMeasure,
  createPart,
  createScore,
  createStaff,
  createVoice,
  validateMeasureRhythm
} from '../../../score-core'
import {
  buildInsertMeasureAfter,
  buildRemoveMeasure,
  resolveActiveMeasureId
} from './measure-management'
import { createNoteInputState } from './note-input-state'

const inputState = createNoteInputState({
  target: {
    partId: 'part-1',
    staffId: 'staff-1',
    measureId: 'measure-2',
    voiceId: 'voice-1'
  },
  tick: 0,
  duration: createDuration('quarter'),
  mode: 'note'
})

describe('measure management', () => {
  it('adds an inherited empty measure after the active measure', () => {
    const score = createThreeMeasureScore()
    const edit = buildInsertMeasureAfter(
      score,
      'measure-2',
      idSequence(),
      inputState
    )
    const result = applyScoreCommand(score, edit!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(measures.map((measure) => measure.id)).toEqual([
      'measure-1',
      'measure-2',
      'measure-new',
      'measure-3'
    ])
    expect(measures.map((measure) => measure.number)).toEqual([1, 2, 3, 4])
    expect(measures[2]).toMatchObject({
      clef: measures[1].clef,
      keySignature: measures[1].keySignature,
      timeSignature: measures[1].timeSignature
    })
    expect(validateMeasureRhythm(measures[2]).isExact).toBe(true)
    expect(edit!.selection).toEqual({
      type: 'measure',
      measureId: 'measure-new'
    })
    expect(edit!.inputState?.target.measureId).toBe('measure-new')
  })

  it('moves selection and input state to the next measure after deletion', () => {
    const score = createThreeMeasureScore()
    const edit = buildRemoveMeasure(score, 'measure-2', inputState)
    const result = applyScoreCommand(score, edit!.command)

    expect(result.score.parts[0].staves[0].measures.map((measure) => measure.id)).toEqual([
      'measure-1',
      'measure-3'
    ])
    expect(edit!.selection).toEqual({
      type: 'measure',
      measureId: 'measure-3'
    })
    expect(edit!.inputState).toMatchObject({
      target: {
        measureId: 'measure-3'
      },
      tick: 0
    })
  })

  it('falls back to the previous measure when deleting the last measure', () => {
    const score = createThreeMeasureScore()
    const edit = buildRemoveMeasure(score, 'measure-3', {
      ...inputState,
      target: {
        ...inputState.target,
        measureId: 'measure-3'
      }
    })

    expect(edit!.selection).toEqual({
      type: 'measure',
      measureId: 'measure-2'
    })
    expect(edit!.inputState?.target.measureId).toBe('measure-2')
  })

  it('does not build a command that removes the only measure', () => {
    expect(buildRemoveMeasure(createScore(), 'measure-1')).toBeUndefined()
  })

  it('resolves the active measure from input state before selection', () => {
    expect(
      resolveActiveMeasureId(
        createThreeMeasureScore(),
        {
          type: 'measure',
          measureId: 'measure-1'
        },
        inputState
      )
    ).toBe('measure-2')
  })
})

function createThreeMeasureScore() {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [1, 2, 3].map((number) =>
              createMeasure({
                id: `measure-${number}`,
                number,
                voices: [
                  createVoice({
                    id: 'voice-1'
                  })
                ]
              })
            )
          })
        ]
      })
    ]
  })
}

function idSequence() {
  return (kind: 'event' | 'measure') =>
    kind === 'measure' ? 'measure-new' : 'event-new'
}
