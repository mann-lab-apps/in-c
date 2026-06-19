import { describe, expect, it } from 'vitest'

import { applyScoreCommand, createDuration, type Score } from '../../../score-core'
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
      type: 'voice-event.replace',
      eventId: 'rest-half',
      event: {
        type: 'note',
        id: 'rest-half',
        pitch: {
          step: 'A',
          octave: 4
        },
        duration: {
          value: 'quarter'
        }
      }
    })
  })

  it('changes duration and converts a selected note to a rest', () => {
    const durationCommand = buildDurationCommand(
      demoScore,
      { type: 'event', eventId: 'note-c4' },
      createDuration('half')
    )
    const durationResult = applyScoreCommand(demoScore, durationCommand!)
    const restCommand = buildRestEntryCommand(
      durationResult.score,
      { type: 'event', eventId: 'note-c4' },
      createDuration('half'),
      () => 'unused'
    )
    const restResult = applyScoreCommand(durationResult.score, restCommand!)

    expect(readEvent(restResult.score, 'note-c4')).toMatchObject({
      type: 'rest',
      duration: {
        value: 'half'
      }
    })
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
      type: 'voice-event.remove',
      eventId: 'note-d4'
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
