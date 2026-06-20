import { describe, expect, it } from 'vitest'

import {
  applyScoreCommand,
  createDuration,
  createScore,
  validateMeasureRhythm,
  type Score
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import {
  buildDeleteCommand,
  buildDurationCommand,
  buildNoteEntryCommand,
  buildRestEntryCommand,
  getAdjacentEventId,
  locateEvent,
  locateMeasure
} from './editor-state'

describe('editor state', () => {
  it('locates selected events and measures', () => {
    expect(locateEvent(demoScore, 'note-g4')).toMatchObject({
      eventIndex: 0,
      measureNumber: 2,
      address: {
        measureId: 'measure-2',
        voiceId: 'voice-1'
      }
    })
    expect(locateMeasure(demoScore, 'measure-2')).toMatchObject({
      measureNumber: 2,
      events: [{ id: 'note-g4' }, { id: 'rest-half' }]
    })
  })

  it('replaces a selected rest with a keyboard-entered note', () => {
    const command = buildNoteEntryCommand(
      demoScore,
      { type: 'event', eventId: 'rest-half' },
      'A',
      createDuration('quarter'),
      () => 'unused'
    )

    expect(command).toMatchObject({
      type: 'voice-events.replace',
      editedEventId: 'rest-half',
      events: expect.arrayContaining([
        expect.objectContaining({
          type: 'note',
          id: 'rest-half',
          pitch: {
            step: 'A',
            octave: 4
          },
          duration: {
            value: 'quarter',
            dots: 0
          }
        })
      ])
    })
  })

  it('changes duration and converts a selected note to a rest', () => {
    const durationCommand = buildDurationCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      createDuration('quarter'),
      () => 'split-rest'
    )
    const durationResult = applyScoreCommand(demoScore, durationCommand!)
    const restCommand = buildRestEntryCommand(
      durationResult.score,
      { type: 'event', eventId: 'note-g4' },
      createDuration('quarter'),
      () => 'unused'
    )
    const restResult = applyScoreCommand(durationResult.score, restCommand!)

    expect(readEvent(restResult.score, 'note-g4')).toMatchObject({
      type: 'rest',
      duration: {
        value: 'quarter'
      }
    })
    expect(readEvent(restResult.score, 'split-rest')).toMatchObject({
      type: 'rest',
      position: {
        tick: 13_440
      }
    })
  })

  it('turns a full-measure rest into an ordinary duration and fills the remainder', () => {
    const score = createScore()
    const command = buildDurationCommand(
      score,
      {
        type: 'event',
        eventId: 'measure-1-full-measure-rest'
      },
      createDuration('quarter'),
      () => 'remaining-rest'
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]

    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'measure-1-full-measure-rest',
        type: 'rest',
        fullMeasure: undefined,
        duration: {
          value: 'quarter'
        }
      },
      {
        id: 'remaining-rest',
        type: 'rest',
        duration: {
          value: 'half',
          dots: 1
        }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('builds delete commands and traverses events in score order', () => {
    expect(getAdjacentEventId(demoScore, 'note-f-sharp-4', 1)).toBe('note-g4')
    expect(getAdjacentEventId(demoScore, 'note-c4', -1)).toBeUndefined()
    expect(
      buildDeleteCommand(demoScore, {
        type: 'event',
        eventId: 'note-d4'
      })
    ).toMatchObject({
      type: 'voice-events.replace',
      editedEventId: 'note-d4',
      events: expect.arrayContaining([
        expect.objectContaining({
          id: 'note-d4',
          type: 'rest'
        })
      ])
    })
  })
})

function readEvent(score: Score, eventId: string) {
  return score.parts
    .flatMap((part) => part.staves)
    .flatMap((staff) => staff.measures)
    .flatMap((measure) => measure.voices)
    .flatMap((voice) => voice.events)
    .find((event) => event.id === eventId)
}
