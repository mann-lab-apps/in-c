import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import { locateEvent } from './editor-state'
import {
  buildAccidentalCommand,
  buildPitchMovementCommand,
  buildPitchStepCommand
} from './pitch-editing'

describe('pitch editing commands', () => {
  it('[note-input.edit-selected-pitch] changes only the selected note pitch step without entering a new note', () => {
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

  it('[rest-to-note.convert-selected-rest] turns a selected rest into a same-duration note', () => {
    const selection = { type: 'event' as const, eventId: 'rest-half' }
    const command = buildPitchStepCommand(demoScore, selection, 'A')
    const result = applyScoreCommand(demoScore, command!)

    expect(
      result.score.parts[0].staves[0].measures[1].voices[0].events
    ).toHaveLength(
      demoScore.parts[0].staves[0].measures[1].voices[0].events.length
    )
    expect(locateEvent(result.score, 'rest-half')?.event).toMatchObject({
      type: 'note',
      id: 'rest-half',
      position: locateEvent(demoScore, 'rest-half')?.event.position,
      duration: locateEvent(demoScore, 'rest-half')?.event.duration,
      pitch: { step: 'A', octave: 4, alter: 0 }
    })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(demoScore)
  })

  it('converts a rest using the previous measure note as the pitch reference', () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'part-1',
          staves: [
            createStaff({
              id: 'staff-1',
              measures: [
                createMeasure({
                  id: 'measure-1',
                  number: 1,
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createRest({
                          id: 'rest-1',
                          position: createTimePosition(0)
                        }),
                        createRest({
                          id: 'rest-2',
                          position: createTimePosition(TICKS_PER_QUARTER)
                        }),
                        createRest({
                          id: 'rest-3',
                          position: createTimePosition(TICKS_PER_QUARTER * 2)
                        }),
                        createNote({
                          id: 'note-b4',
                          position: createTimePosition(TICKS_PER_QUARTER * 3),
                          pitch: { step: 'B', octave: 4 }
                        })
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      id: 'voice-1',
                      events: [
                        createFullMeasureRest({ id: 'rest-start' })
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
    const command = buildPitchStepCommand(
      score,
      { type: 'event', eventId: 'rest-start' },
      'C'
    )
    const result = applyScoreCommand(score, command!)

    expect(locateEvent(result.score, 'rest-start')?.event).toMatchObject({
      type: 'note',
      pitch: { step: 'C', octave: 5, alter: 0 }
    })
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

  it('note-input.edit-selected-event-in-inspector note-input.apply-accidental applies a sharp without moving or resizing the note', () => {
    const selection = { type: 'event' as const, eventId: 'note-e4' }
    const command = buildAccidentalCommand(demoScore, selection, 1)
    const result = applyScoreCommand(demoScore, command!)

    expect(locateEvent(result.score, 'note-e4')?.event).toMatchObject({
      type: 'note',
      position: locateEvent(demoScore, 'note-e4')?.event.position,
      duration: locateEvent(demoScore, 'note-e4')?.event.duration,
      pitch: { step: 'E', octave: 4, alter: 1 }
    })

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(demoScore)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(
      result.score
    )
  })
})
