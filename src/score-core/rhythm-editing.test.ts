import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildRhythmDeleteCommand,
  buildRhythmEditCommand,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  validateMeasureRhythm,
  validateTieRelations,
  type Score,
  type VoiceAddress,
  type VoiceEvent
} from './index'

const quarter = TICKS_PER_QUARTER
const target: VoiceAddress = {
  partId: 'part-1',
  staffId: 'staff-1',
  measureId: 'measure-1',
  voiceId: 'voice-1'
}

describe('monophonic rhythm editing', () => {
  it('replaces part of a full-measure rest and fills the remaining span', () => {
    const score = createScore()
    const command = buildRhythmEditCommand(score, {
      target,
      eventId: 'measure-1-full-measure-rest',
      event: note('replacement', 0, 'quarter'),
      createId: idSequence('rest')
    })

    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'measure-1-full-measure-rest',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'quarter' }
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'half', dots: 1 }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)

    expect(result.undo).toMatchObject({
      type: 'voice-events.replace',
      target
    })
    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(score)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(
      result.score
    )
  })

  it('deletes a leading note by shifting following events left', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'half', 1)
    ])
    const command = buildRhythmDeleteCommand(score, target, 'note-1')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: 0 },
        fullMeasure: true
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(score)
  })

  it('deletes a selected note into a tied note chain', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      note('note-2', quarter, 'quarter'),
      rest('rest-1', quarter * 2, 'half')
    ])
    const command = buildRhythmDeleteCommand(score, target, 'note-2')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'quarter' },
        ties: { start: true }
      },
      {
        id: 'note-2',
        type: 'note',
        position: { tick: quarter },
        pitch: { step: 'C', octave: 4 },
        duration: { value: 'quarter' },
        ties: { stop: true }
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter * 2 },
        duration: { value: 'half' }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a rest into a tied note chain', () => {
    const score = scoreWith([
      note('note-1', 0, 'eighth'),
      rest('rest-1', quarter / 2, 'half'),
      rest('tail-rest', quarter * 2.5, 'quarter', 1)
    ])
    const command = buildRhythmDeleteCommand(score, target, 'rest-1')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'eighth' },
        ties: { start: true }
      },
      {
        id: 'rest-1',
        type: 'note',
        position: { tick: quarter / 2 },
        duration: { value: 'half' },
        pitch: { step: 'C', octave: 4 },
        ties: { stop: true }
      },
      {
        id: 'tail-rest',
        type: 'rest',
        position: { tick: quarter * 2.5 },
        duration: { value: 'quarter', dots: 1 }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a selected note by adding its duration to the previous rest', () => {
    const score = scoreWith([
      rest('rest-1', 0, 'quarter'),
      note('note-1', quarter, 'quarter'),
      rest('rest-2', quarter * 2, 'half')
    ])
    const command = buildRhythmDeleteCommand(score, target, 'note-1')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: 0 },
        fullMeasure: true
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a selected rest by adding its duration to the previous rest', () => {
    const score = scoreWith([
      rest('rest-1', 0, 'quarter'),
      rest('rest-2', quarter, 'quarter'),
      note('note-1', quarter * 2, 'half')
    ])
    const command = buildRhythmDeleteCommand(score, target, 'rest-2')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: 0 },
        duration: { value: 'half' }
      },
      {
        id: 'note-1',
        type: 'note',
        position: { tick: quarter * 2 },
        duration: { value: 'half' }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a selected rest into a tied previous note chain', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'quarter'),
      note('note-2', quarter * 2, 'half')
    ])
    const command = buildRhythmDeleteCommand(score, target, 'rest-1')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'quarter' },
        ties: { start: true }
      },
      {
        id: 'rest-1',
        type: 'note',
        position: { tick: quarter },
        pitch: { step: 'C', octave: 4 },
        duration: { value: 'quarter' },
        ties: { stop: true }
      },
      {
        id: 'note-2',
        type: 'note',
        position: { tick: quarter * 2 },
        duration: { value: 'half' }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a shorter rest into the previous rest span', () => {
    const score = scoreWith([
      rest('rest-1', 0, 'quarter'),
      rest('rest-2', quarter, 'quarter'),
      rest('rest-3', quarter * 2, 'eighth'),
      note('note-1', quarter * 2.5, 'quarter', 1)
    ])
    const command = buildRhythmDeleteCommand(score, target, 'rest-2')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: 0 },
        duration: { value: 'half' }
      },
      { id: 'rest-1-trailing-rest-1', position: { tick: quarter * 2 } },
      { id: 'note-1', position: { tick: quarter * 2.5 } }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('deletes a leading rest by shifting following events left', () => {
    const isolatedRest = scoreWith([
      rest('rest-1', 0, 'quarter'),
      note('note-1', quarter, 'half', 1)
    ])
    const command = buildRhythmDeleteCommand(isolatedRest, target, 'rest-1')
    const result = applyScoreCommand(isolatedRest, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'half', dots: 1 }
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter * 3 },
        duration: { value: 'quarter' }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
  })

  it('deletes a rest into an existing tied note chain', () => {
    const tiedChain = scoreWith([
      {
        ...note('note-1', 0, 'quarter'),
        ties: { start: true }
      },
      {
        ...note('note-2', quarter, 'quarter'),
        ties: { stop: true }
      },
      rest('rest-1', quarter * 2, 'quarter'),
      rest('rest-2', quarter * 3, 'quarter')
    ])
    const command = buildRhythmDeleteCommand(tiedChain, target, 'rest-1')
    const result = applyScoreCommand(tiedChain, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        ties: { start: true }
      },
      {
        id: 'note-2',
        type: 'note',
        ties: { stop: true, start: true }
      },
      {
        id: 'rest-1',
        type: 'note',
        pitch: { step: 'C', octave: 4 },
        ties: { stop: true }
      },
      {
        id: 'rest-2',
        type: 'rest'
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(tiedChain)
  })

  it('deletes a leading tied start and clears the orphaned tie stop', () => {
    const tiedLeadingNote = scoreWith([
      {
        ...note('note-1', 0, 'quarter'),
        ties: { start: true }
      },
      {
        ...note('note-2', quarter, 'quarter'),
        ties: { stop: true }
      },
      rest('rest-1', quarter * 2, 'half')
    ])
    const command = buildRhythmDeleteCommand(tiedLeadingNote, target, 'note-1')
    const result = applyScoreCommand(tiedLeadingNote, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-2',
        type: 'note',
        position: { tick: 0 },
        ties: undefined
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'half', dots: 1 }
      }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(validateTieRelations(result.score)).toEqual([])
  })

  it('deletes a cross-measure tie stop and clears the previous tie start', () => {
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
                        rest('rest-1', 0, 'half', 1),
                        {
                          ...note('tie-start', quarter * 3, 'quarter'),
                          ties: { start: true }
                        }
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
                        {
                          ...note('tie-stop', 0, 'quarter'),
                          ties: { stop: true }
                        },
                        rest('rest-2', quarter, 'half', 1)
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
    const command = buildRhythmDeleteCommand(
      score,
      {
        ...target,
        measureId: 'measure-2'
      },
      'tie-stop'
    )
    const result = applyScoreCommand(score, command!)
    const firstMeasureEvents =
      result.score.parts[0].staves[0].measures[0].voices[0].events
    const secondMeasureEvents =
      result.score.parts[0].staves[0].measures[1].voices[0].events

    expect(command?.type).toBe('score.batch')
    expect(firstMeasureEvents.at(-1)).toMatchObject({
      id: 'tie-start',
      type: 'note',
      ties: undefined
    })
    expect(secondMeasureEvents[0]).toMatchObject({
      id: 'rest-2',
      type: 'rest',
      position: { tick: 0 },
      fullMeasure: true
    })
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('rejects deleting a tuplet note independently', () => {
    const tripletDuration = {
      ...createDuration('eighth'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const score = scoreWith([
      {
        ...note('triplet-note-1', 0, 'eighth'),
        duration: tripletDuration
      },
      {
        ...note('triplet-note-2', quarter / 3, 'eighth'),
        duration: tripletDuration
      },
      rest('triplet-rest-3', (quarter * 2) / 3, 'eighth'),
      rest('rest-after', quarter, 'half', 1)
    ])
    score.parts[0].staves[0].measures[0].voices[0].events[2].duration =
      tripletDuration
    score.parts[0].staves[0].measures[0].voices[0].tuplets = [
      {
        id: 'tuplet-1',
        eventIds: ['triplet-note-1', 'triplet-note-2', 'triplet-rest-3'],
        actualNotes: 3,
        normalNotes: 2
      }
    ]
    const command = buildRhythmDeleteCommand(
      score,
      target,
      'triplet-note-2'
    )

    expect(command).toBeUndefined()
  })

  it('shrinks an event and fills the released time with rests', () => {
    const score = scoreWith([
      note('note-1', 0, 'half'),
      rest('rest-1', quarter * 2, 'half')
    ])
    const command = buildRhythmEditCommand(score, {
      target,
      eventId: 'note-1',
      event: note('note-1', 0, 'quarter'),
      createId: idSequence('split')
    })
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      { id: 'note-1', position: { tick: 0 }, duration: { value: 'quarter' } },
      {
        id: 'split-1',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'quarter' }
      },
      { id: 'rest-1', position: { tick: quarter * 2 } }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
  })

  it('shrinks a selected rest by pulling following events forward', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'half'),
      note('note-2', quarter * 3, 'quarter')
    ])
    const command = buildRhythmEditCommand(score, {
      target,
      eventId: 'rest-1',
      event: rest('rest-1', quarter, 'quarter'),
      createId: idSequence('remaining-rest')
    })
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'note-1',
        position: { tick: 0 }
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'quarter' }
      },
      {
        id: 'note-2',
        position: { tick: quarter * 2 }
      },
      {
        id: 'remaining-rest-1',
        type: 'rest',
        position: { tick: quarter * 3 },
        duration: { value: 'quarter' }
      }
    ])
    expect(command).toMatchObject({
      editedEventId: 'rest-1'
    })
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('grows an event by consuming following rests and splitting the last rest', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'half'),
      note('note-2', quarter * 3, 'quarter')
    ])
    const command = buildRhythmEditCommand(score, {
      target,
      eventId: 'note-1',
      event: note('note-1', 0, 'half'),
      createId: idSequence('unused')
    })
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      { id: 'note-1', duration: { value: 'half' } },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: quarter * 2 },
        duration: { value: 'quarter' }
      },
      { id: 'note-2', position: { tick: quarter * 3 } }
    ])
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
  })

  it('grows a selected rest by consuming following rests and keeping its id', () => {
    const score = scoreWith([
      rest('rest-1', 0, 'quarter'),
      rest('rest-2', quarter, 'half'),
      note('note-1', quarter * 3, 'quarter')
    ])
    const command = buildRhythmEditCommand(score, {
      target,
      eventId: 'rest-1',
      event: rest('rest-1', 0, 'half'),
      createId: idSequence('remaining-rest')
    })
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)).toMatchObject([
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: 0 },
        duration: { value: 'half' }
      },
      {
        id: 'rest-2',
        type: 'rest',
        position: { tick: quarter * 2 },
        duration: { value: 'quarter' }
      },
      {
        id: 'note-1',
        position: { tick: quarter * 3 }
      }
    ])
    expect(command).toMatchObject({
      editedEventId: 'rest-1'
    })
    expect(validateFirstMeasure(result.score).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('rejects growth that would consume a note or cross the measure boundary', () => {
    const blockedByNote = scoreWith([
      note('note-1', 0, 'quarter'),
      note('note-2', quarter, 'quarter'),
      rest('rest-1', quarter * 2, 'half')
    ])

    expect(
      buildRhythmEditCommand(blockedByNote, {
        target,
        eventId: 'note-1',
        event: note('note-1', 0, 'half'),
        createId: idSequence('rest')
      })
    ).toBeUndefined()

    const boundary = scoreWith([
      rest('rest-1', 0, 'half', 1),
      note('note-1', quarter * 3, 'quarter')
    ])

    expect(
      buildRhythmEditCommand(boundary, {
        target,
        eventId: 'note-1',
        event: note('note-1', quarter * 3, 'half'),
        createId: idSequence('rest')
      })
    ).toBeUndefined()
  })

  it('rejects a non-exact replacement transaction without changing the score', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'half', 1)
    ])
    const invalidCommand = {
      type: 'voice-events.replace' as const,
      target,
      events: [note('note-1', 0, 'quarter')]
    }

    expect(() => applyScoreCommand(score, invalidCommand)).toThrow(
      'must preserve an exact measure'
    )
    expect(validateFirstMeasure(score).isExact).toBe(true)
  })
})

function scoreWith(events: VoiceEvent[]): Score {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                voices: [
                  createVoice({
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

function note(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0],
  dots = 0
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step: 'C',
      octave: 4
    },
    duration: createDuration(value, dots)
  })
}

function rest(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0],
  dots = 0
) {
  return createRest({
    id,
    position: createTimePosition(tick),
    duration: createDuration(value, dots)
  })
}

function readEvents(score: Score): VoiceEvent[] {
  return score.parts[0].staves[0].measures[0].voices[0].events
}

function validateFirstMeasure(score: Score) {
  return validateMeasureRhythm(score.parts[0].staves[0].measures[0])
}

function idSequence(prefix: string): () => string {
  let index = 0
  return () => `${prefix}-${++index}`
}
