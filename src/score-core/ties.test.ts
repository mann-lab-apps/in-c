import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildTieCommand,
  collectTiePairs,
  createMeasure,
  createNote,
  createPart,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  validateTieRelations
} from './index'

const quarter = TICKS_PER_QUARTER

describe('score-core ties', () => {
  it('creates and removes a tie between adjacent equal pitches', () => {
    const score = tiedFixture(false)
    const command = buildTieCommand(score, 'note-1', true)
    const result = applyScoreCommand(score, command!)

    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'note-1',
        toEventId: 'note-2'
      }
    ])
    expect(validateTieRelations(result.score)).toEqual([])

    const remove = buildTieCommand(result.score, 'note-1', false)
    const removed = applyScoreCommand(result.score, remove!)

    expect(collectTiePairs(removed.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('creates a tie across a measure boundary as one undoable batch', () => {
    const score = crossMeasureFixture()
    const command = buildTieCommand(score, 'measure-1-note', true)
    const result = applyScoreCommand(score, command!)

    expect(command?.type).toBe('score.batch')
    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'measure-1-note',
        toEventId: 'measure-2-note'
      }
    ])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('rejects different pitches and non-adjacent notes', () => {
    const differentPitch = tiedFixture(false, 'D')

    expect(buildTieCommand(differentPitch, 'note-1', true)).toBeUndefined()

    const withGap = tiedFixture(false)
    const events =
      withGap.parts[0].staves[0].measures[0].voices[0].events
    events.splice(
      1,
      0,
      createNote({
        id: 'intervening-note',
        position: createTimePosition(quarter),
        pitch: { step: 'G', octave: 4 }
      })
    )
    events[2] = {
      ...events[2],
      position: createTimePosition(quarter * 2)
    }

    expect(buildTieCommand(withGap, 'note-1', true)).toBeUndefined()
  })

  it('can remove tie markers after an intervening edit invalidates the tie', () => {
    const score = tiedFixture(true, 'D')
    const command = buildTieCommand(score, 'note-1', false)
    const result = applyScoreCommand(score, command!)

    expect(command).toBeDefined()
    expect(validateTieRelations(result.score)).toEqual([])
    expect(collectTiePairs(result.score)).toEqual([])
  })
})

function tiedFixture(tied: boolean, secondStep: 'C' | 'D' = 'C') {
  return createScore({
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
                        id: 'note-1',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 },
                        ties: tied ? { start: true } : undefined
                      }),
                      createNote({
                        id: 'note-2',
                        position: createTimePosition(quarter),
                        pitch: { step: secondStep, octave: 4 },
                        ties: tied ? { stop: true } : undefined
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
}

function crossMeasureFixture() {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                timeSignature: { beats: 1, beatType: 4 },
                voices: [
                  createVoice({
                    events: [
                      createNote({
                        id: 'measure-1-note',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 }
                      })
                    ]
                  })
                ]
              }),
              createMeasure({
                id: 'measure-2',
                number: 2,
                timeSignature: { beats: 1, beatType: 4 },
                voices: [
                  createVoice({
                    events: [
                      createNote({
                        id: 'measure-2-note',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 }
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
}
