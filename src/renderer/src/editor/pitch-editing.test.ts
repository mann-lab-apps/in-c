import { describe, expect, it } from 'vitest'

import { applyScoreCommand } from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import { locateEvent } from './editor-state'
import {
  buildAccidentalCommand,
  buildPitchMovementCommand,
  buildPitchStepCommand
} from './pitch-editing'

describe('pitch editing commands', () => {
  it('changes only the selected note pitch step without entering a new note', () => {
    const selection = { type: 'event' as const, eventId: 'note-b4' }
    const command = buildPitchStepCommand(demoScore, selection, 'C')
    const result = applyScoreCommand(demoScore, command!)

    expect(locateEvent(result.score, 'note-b4')?.event).toMatchObject({
      type: 'note',
      id: 'note-b4',
      position: locateEvent(demoScore, 'note-b4')?.event.position,
      duration: locateEvent(demoScore, 'note-b4')?.event.duration,
      pitch: { step: 'C', octave: 5, alter: 0 }
    })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(demoScore)
  })

  it('does not turn a selected rest into a note while editing pitch', () => {
    expect(
      buildPitchStepCommand(
        demoScore,
        { type: 'event', eventId: 'rest-half' },
        'C'
      )
    ).toBeUndefined()
  })

  it('moves selected notes diatonically across octave boundaries', () => {
    const selection = { type: 'event' as const, eventId: 'note-b4' }
    const command = buildPitchMovementCommand(
      demoScore,
      selection,
      'diatonic',
      1
    )
    const result = applyScoreCommand(demoScore, command!)

    expect(locateEvent(result.score, 'note-b4')?.event).toMatchObject({
      type: 'note',
      pitch: { step: 'C', octave: 5, alter: 0 }
    })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(demoScore)
  })

  it('supports chromatic and octave movement', () => {
    const selection = {
      type: 'event' as const,
      eventId: 'note-f-sharp-4'
    }
    const chromatic = buildPitchMovementCommand(
      demoScore,
      selection,
      'chromatic',
      -1
    )
    const chromaticResult = applyScoreCommand(demoScore, chromatic!)
    const octave = buildPitchMovementCommand(
      chromaticResult.score,
      selection,
      'octave',
      1
    )
    const octaveResult = applyScoreCommand(chromaticResult.score, octave!)

    expect(locateEvent(octaveResult.score, selection.eventId)?.event).toMatchObject({
      type: 'note',
      pitch: { step: 'F', octave: 5, alter: 0 }
    })
  })

  it('applies accidentals as undoable score commands', () => {
    const selection = { type: 'event' as const, eventId: 'note-e4' }
    const command = buildAccidentalCommand(demoScore, selection, -1)
    const result = applyScoreCommand(demoScore, command!)

    expect(locateEvent(result.score, 'note-e4')?.event).toMatchObject({
      type: 'note',
      pitch: { step: 'E', octave: 4, alter: -1 }
    })

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(demoScore)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(
      result.score
    )
  })
})
