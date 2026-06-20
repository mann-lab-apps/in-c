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

  it('deletes a note by replacing it with an equal-duration rest', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter, 'half', 1)
    ])
    const command = buildRhythmDeleteCommand(score, target, 'note-1')
    const result = applyScoreCommand(score, command!)

    expect(readEvents(result.score)[0]).toMatchObject({
      id: 'note-1',
      type: 'rest',
      position: { tick: 0 },
      duration: { value: 'quarter' }
    })
    expect(validateFirstMeasure(result.score).isExact).toBe(true)

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(score)
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
