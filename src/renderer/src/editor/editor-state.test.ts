import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createDuration,
  createFullMeasureRest,
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
  type VoiceEvent
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import {
  buildDeleteCommand,
  buildDotCommand,
  buildDurationCommand,
  buildNoteEntryCommand,
  buildRangeClipboard,
  buildRangePasteCommand,
  buildRangeRestCommand,
  buildRestEntryCommand,
  buildTupletGroupCommand,
  createRangeSelection,
  getAdjacentEventId,
  getSelectedEventIds,
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
      events: [
        { id: 'note-g4' },
        { id: 'note-a4' },
        { id: 'note-b4' },
        { id: 'note-c5' },
        { id: 'rest-half' }
      ]
    })
  })

  it('creates an ordered event range selection in one voice', () => {
    const selection = createRangeSelection(demoScore, 'note-g4', 'note-c5')

    expect(selection).toEqual({
      type: 'range',
      anchorEventId: 'note-g4',
      focusEventId: 'note-c5',
      eventIds: ['note-g4', 'note-a4', 'note-b4', 'note-c5']
    })
    expect(getSelectedEventIds(selection!)).toEqual([
      'note-g4',
      'note-a4',
      'note-b4',
      'note-c5'
    ])
  })

  it('keeps range selection ordered when extending backward', () => {
    expect(createRangeSelection(demoScore, 'note-c5', 'note-g4')).toEqual({
      type: 'range',
      anchorEventId: 'note-c5',
      focusEventId: 'note-g4',
      eventIds: ['note-g4', 'note-a4', 'note-b4', 'note-c5']
    })
  })

  it('collapses a one-event range back to an event selection', () => {
    expect(createRangeSelection(demoScore, 'note-g4', 'note-g4')).toEqual({
      type: 'event',
      eventId: 'note-g4'
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
      createDuration('16th'),
      () => 'split-rest'
    )
    const durationResult = applyScoreCommand(demoScore, durationCommand!)
    const restCommand = buildRestEntryCommand(
      durationResult.score,
      { type: 'event', eventId: 'note-g4' },
      createDuration('16th'),
      () => 'unused'
    )
    const restResult = applyScoreCommand(durationResult.score, restCommand!)

    expect(readEvent(restResult.score, 'note-g4')).toMatchObject({
      type: 'rest',
      duration: {
        value: '16th'
      }
    })
    expect(readEvent(restResult.score, 'split-rest')).toMatchObject({
      type: 'rest',
      position: {
        tick: 3_360
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

  it('keeps a selected mid-measure rest while pulling following events forward', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('middle-rest', TICKS_PER_QUARTER, 'half'),
      note('note-2', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const command = buildDurationCommand(
      score,
      { type: 'event', eventId: 'middle-rest' },
      createDuration('quarter'),
      () => 'released-rest'
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]

    expect(command).toMatchObject({
      editedEventId: 'middle-rest'
    })
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'note-1',
        position: { tick: 0 }
      },
      {
        id: 'middle-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER },
        duration: { value: 'quarter' }
      },
      {
        id: 'note-2',
        position: { tick: TICKS_PER_QUARTER * 2 }
      },
      {
        id: 'released-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER * 3 },
        duration: { value: 'quarter' }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('augmentation-dots.add-first-dot adds and removes augmentation dots through rhythm transactions', () => {
    const add = buildDotCommand(
      demoScore,
      { type: 'event', eventId: 'note-c5' },
      1,
      () => 'dot-rest'
    )
    const added = applyScoreCommand(demoScore, add!)

    expect(readEvent(added.score, 'note-c5')).toMatchObject({
      type: 'note',
      duration: { value: 'eighth', dots: 1 }
    })
    expect(readEvent(added.score, 'rest-half')).toMatchObject({
      type: 'rest',
      position: { tick: 30_240 }
    })

    const remove = buildDotCommand(
      added.score,
      { type: 'event', eventId: 'note-c5' },
      -1,
      () => 'released-rest'
    )
    const removed = applyScoreCommand(added.score, remove!)

    expect(readEvent(removed.score, 'note-c5')).toMatchObject({
      duration: { value: 'eighth', dots: 0 }
    })
    expect(applyScoreCommand(added.score, added.undo).score).toEqual(demoScore)
  })

  it('augmentation-dots.add-second-dot adds a second augmentation dot', () => {
    const firstDot = buildDotCommand(
      demoScore,
      { type: 'event', eventId: 'note-c5' },
      1,
      () => 'first-dot-rest'
    )
    const dotted = applyScoreCommand(demoScore, firstDot!)
    const secondDot = buildDotCommand(
      dotted.score,
      { type: 'event', eventId: 'note-c5' },
      1,
      () => 'second-dot-rest'
    )
    const doubleDotted = applyScoreCommand(dotted.score, secondDot!)

    expect(readEvent(doubleDotted.score, 'note-c5')).toMatchObject({
      type: 'note',
      duration: { value: 'eighth', dots: 2 }
    })
    expect(
      validateMeasureRhythm(
        doubleDotted.score.parts[0].staves[0].measures[0]
      ).isExact
    ).toBe(true)
  })

  it('applies augmentation dots to rests with the same rhythm rules', () => {
    const shortenedNote = buildDurationCommand(
      demoScore,
      { type: 'event', eventId: 'note-c5' },
      createDuration('16th'),
      () => 'short-rest'
    )
    const prepared = applyScoreCommand(demoScore, shortenedNote!)
    const add = buildDotCommand(
      prepared.score,
      { type: 'event', eventId: 'short-rest' },
      1,
      () => 'rest-remainder'
    )
    const result = applyScoreCommand(prepared.score, add!)

    expect(readEvent(result.score, 'short-rest')).toMatchObject({
      type: 'rest',
      duration: { value: '16th', dots: 1 }
    })
    expect(
      validateMeasureRhythm(
        result.score.parts[0].staves[0].measures[1]
      ).isExact
    ).toBe(true)
  })

  it('augmentation-dots.reject-without-room rejects dot growth that would consume a note', () => {
    expect(
      buildDotCommand(
        demoScore,
        { type: 'event', eventId: 'note-c4' },
        1
      )
    ).toBeUndefined()
  })

  it('tuplets.group-selected-events turns only the selected tuplet span into a tuplet group', () => {
    const command = buildTupletGroupCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      () => 'tuplet-remainder'
    )
    const result = applyScoreCommand(demoScore, command!)
    const measure = result.score.parts[0].staves[0].measures[1]
    const voice = measure.voices[0]

    expect(command).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'note-g4'
    })
    expect(voice.events.slice(0, 4)).toMatchObject([
      {
        id: 'note-g4',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 0 }
      },
      {
        id: 'note-a4',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 4_480 }
      },
      {
        id: 'tuplet-remainder',
        type: 'rest',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 8_960 }
      },
      {
        id: 'note-b4',
        position: { tick: 13_440 },
        duration: { value: 'eighth' }
      }
    ])
    expect(voice.tuplets?.[0]).toMatchObject({
      eventIds: ['note-g4', 'note-a4', 'tuplet-remainder'],
      actualNotes: 3,
      normalNotes: 2
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('does not pull notes beyond the covered tuplet beats', () => {
    const command = buildTupletGroupCommand(
      demoScore,
      { type: 'event', eventId: 'note-c4' },
      () => 'generated-triplet-rest'
    )
    const result = applyScoreCommand(demoScore, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voice = measure.voices[0]

    expect(voice.events.slice(0, 4)).toMatchObject([
      {
        id: 'note-c4',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 0 }
      },
      {
        id: 'note-d4',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: (TICKS_PER_QUARTER * 2) / 3 }
      },
      {
        id: 'generated-triplet-rest',
        type: 'rest',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: (TICKS_PER_QUARTER * 4) / 3 }
      },
      {
        id: 'note-e4',
        position: { tick: TICKS_PER_QUARTER * 2 },
        duration: { value: 'quarter' }
      }
    ])
    expect(voice.tuplets?.[0]).toMatchObject({
      eventIds: ['note-c4', 'note-d4', 'generated-triplet-rest']
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('tuplets.remove-existing-group toggles an existing tuplet group back to regular durations', () => {
    const apply = buildTupletGroupCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      () => 'tuplet-remainder'
    )
    const applied = applyScoreCommand(demoScore, apply!)
    const remove = buildTupletGroupCommand(
      applied.score,
      { type: 'event', eventId: 'note-g4' },
      () => 'unused'
    )
    const removed = applyScoreCommand(applied.score, remove!)
    const measure = removed.score.parts[0].staves[0].measures[1]
    const voice = measure.voices[0]

    expect(remove).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'note-g4'
    })
    expect(voice.tuplets).toEqual([])
    expect(voice.events.slice(0, 4)).toMatchObject([
      {
        id: 'note-g4',
        duration: { value: 'eighth' },
        position: { tick: 0 }
      },
      {
        id: 'note-a4',
        duration: { value: 'eighth' },
        position: { tick: 6_720 }
      },
      {
        id: 'note-b4',
        duration: { value: 'eighth' },
        position: { tick: 13_440 }
      },
      {
        id: 'note-c5',
        position: { tick: 20_160 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('creates a tuplet group when the tuplet span fits without 3 pre-existing events', () => {
    const quarter = TICKS_PER_QUARTER
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
                        createRest({
                          id: 'rest-before',
                          position: createTimePosition(0),
                          duration: createDuration('half')
                        }),
                        createNote({
                          id: 'note-third-beat',
                          position: createTimePosition(quarter * 2),
                          duration: createDuration('quarter'),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fourth-beat',
                          position: createTimePosition(quarter * 3),
                          duration: createDuration('quarter')
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
    const command = buildTupletGroupCommand(
      score,
      { type: 'event', eventId: 'note-third-beat' },
      idSequence('generated-triplet-rest')
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voice = measure.voices[0]

    expect(voice.events.slice(1)).toMatchObject([
      {
        id: 'note-third-beat',
        type: 'note',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: quarter * 2 }
      },
      {
        type: 'rest',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: quarter * 2 + (quarter * 2) / 3 }
      },
      {
        type: 'rest',
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: quarter * 2 + (quarter * 4) / 3 }
      }
    ])
    expect(voice.tuplets?.[0]).toMatchObject({
      eventIds: [
        'note-third-beat',
        'generated-triplet-rest-1',
        'generated-triplet-rest-2'
      ],
      actualNotes: 3,
      normalNotes: 2
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('toggles a compact tuplet span back inside its occupied time', () => {
    const quarter = TICKS_PER_QUARTER
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
                        createRest({
                          id: 'rest-before',
                          position: createTimePosition(0),
                          duration: createDuration('half')
                        }),
                        createNote({
                          id: 'note-third-beat',
                          position: createTimePosition(quarter * 2),
                          duration: createDuration('quarter'),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createRest({
                          id: 'rest-fourth-beat',
                          position: createTimePosition(quarter * 3),
                          duration: createDuration('quarter')
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
    const apply = buildTupletGroupCommand(
      score,
      { type: 'event', eventId: 'note-third-beat' },
      idSequence('generated-triplet-rest')
    )
    const applied = applyScoreCommand(score, apply!)
    const remove = buildTupletGroupCommand(
      applied.score,
      { type: 'event', eventId: 'note-third-beat' },
      idSequence('unused')
    )
    const removed = applyScoreCommand(applied.score, remove!)
    const measure = removed.score.parts[0].staves[0].measures[0]
    const voice = measure.voices[0]

    expect(remove).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'note-third-beat'
    })
    expect(voice.tuplets).toEqual([])
    expect(voice.events.slice(1)).toMatchObject([
      {
        id: 'note-third-beat',
        type: 'note',
        duration: { value: 'quarter', tuplet: undefined },
        position: { tick: quarter * 2 }
      },
      {
        id: 'generated-triplet-rest-1',
        type: 'rest',
        duration: { value: 'quarter', tuplet: undefined },
        position: { tick: quarter * 3 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('tuplets.reject-relation-breaking-edit does not create a tuplet group when the span crosses a measure boundary', () => {
    expect(
      buildTupletGroupCommand(
        demoScore,
        { type: 'event', eventId: 'note-f-sharp-4' },
        idSequence('unused')
      )
    ).toBeUndefined()
  })

  it('builds delete commands and traverses events in score order', () => {
    expect(getAdjacentEventId(demoScore, 'note-f-sharp-4', 1)).toBe('note-g4')
    expect(getAdjacentEventId(demoScore, 'note-c4', -1)).toBeUndefined()
    const command = buildDeleteCommand(demoScore, {
      type: 'event',
      eventId: 'note-d4'
    })

    expect(command).toMatchObject({
      type: 'voice-events.replace'
    })
    if (command?.type !== 'voice-events.replace') {
      throw new Error('Expected a voice event replacement command')
    }
    expect(command.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'note-c4',
          type: 'note',
          duration: expect.objectContaining({ value: 'quarter' }),
          ties: expect.objectContaining({ start: true })
        }),
        expect.objectContaining({
          id: 'note-d4',
          type: 'note',
          pitch: expect.objectContaining({ step: 'C', octave: 4 }),
          duration: expect.objectContaining({ value: 'quarter' }),
          ties: expect.objectContaining({ stop: true })
        })
      ])
    )
  })

  it('range-editing.delete-same-measure deletes a same-measure range as one undoable rhythm edit', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', TICKS_PER_QUARTER, 'quarter'),
      rest('rest-2', TICKS_PER_QUARTER * 2, 'quarter'),
      note('note-2', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const selection = createRangeSelection(score, 'rest-1', 'rest-2')
    const command = buildDeleteCommand(score, selection!)
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]

    expect(selection).toMatchObject({
      type: 'range',
      eventIds: ['rest-1', 'rest-2']
    })
    expect(command).toMatchObject({
      type: 'score.batch'
    })
    expect(measure.voices[0].events).toHaveLength(3)
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        duration: { value: 'quarter' },
        ties: { start: true }
      },
      {
        id: 'rest-1',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER },
        duration: { value: 'half' },
        ties: { stop: true }
      },
      {
        id: 'note-2',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER * 3 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('range-editing.reject-cross-measure-delete rejects range deletion across measure boundaries', () => {
    const selection = createRangeSelection(demoScore, 'note-f-sharp-4', 'note-g4')

    expect(selection).toMatchObject({
      type: 'range'
    })
    expect(buildDeleteCommand(demoScore, selection!)).toBeUndefined()
  })

  it('range-editing.copy-paste-same-length copies and pastes a same-length simple range', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      note('note-2', TICKS_PER_QUARTER, 'quarter'),
      rest('rest-1', TICKS_PER_QUARTER * 2, 'quarter'),
      rest('rest-2', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const source = createRangeSelection(score, 'note-1', 'note-2')
    const target = createRangeSelection(score, 'rest-1', 'rest-2')
    const clipboard = buildRangeClipboard(score, source!)
    const command = buildRangePasteCommand(
      score,
      target!,
      clipboard!,
      idSequence('pasted')
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]

    expect(clipboard).toMatchObject({
      durationTicks: TICKS_PER_QUARTER * 2,
      eventCount: 2
    })
    expect(measure.voices[0].events).toMatchObject([
      { id: 'note-1', type: 'note', position: { tick: 0 } },
      {
        id: 'note-2',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER }
      },
      {
        id: 'pasted-1',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER * 2 }
      },
      {
        id: 'pasted-2',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER * 3 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('copies a single whole note and pastes it over a full-measure rest', () => {
    const score = createScore({
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
                      events: [
                        note('whole-note', 0, 'whole')
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createFullMeasureRest({
                          id: 'measure-2-full-rest'
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
    const clipboard = buildRangeClipboard(score, {
      type: 'event',
      eventId: 'whole-note'
    })
    const command = buildRangePasteCommand(
      score,
      {
        type: 'event',
        eventId: 'measure-2-full-rest'
      },
      clipboard!,
      idSequence('pasted-whole')
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[1]

    expect(clipboard).toMatchObject({
      durationTicks: TICKS_PER_QUARTER * 4,
      eventCount: 1
    })
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'pasted-whole-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'whole' }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('copies a single whole note and pastes it over another whole-note range', () => {
    const score = createScore({
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
                      events: [
                        note('source-whole-note', 0, 'whole')
                      ]
                    })
                  ]
                }),
                createMeasure({
                  id: 'measure-2',
                  number: 2,
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'target-whole-note',
                          position: createTimePosition(0),
                          pitch: { step: 'G', octave: 4 },
                          duration: createDuration('whole')
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
    const clipboard = buildRangeClipboard(score, {
      type: 'event',
      eventId: 'source-whole-note'
    })
    const command = buildRangePasteCommand(
      score,
      {
        type: 'event',
        eventId: 'target-whole-note'
      },
      clipboard!,
      idSequence('pasted-whole-note')
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[1]

    expect(command).toBeDefined()
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'pasted-whole-note-1',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'whole' },
        pitch: { step: 'C', octave: 4 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('range-editing.reject-different-length-paste rejects range paste when the target range has a different duration', () => {
    const score = scoreWith([
      note('note-1', 0, 'eighth'),
      note('note-2', TICKS_PER_QUARTER / 2, 'eighth'),
      rest('target-rest-1', TICKS_PER_QUARTER, 'quarter'),
      rest('target-rest-2', TICKS_PER_QUARTER * 2, 'quarter'),
      rest('tail-rest', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const source = createRangeSelection(score, 'note-1', 'note-2')
    const target = createRangeSelection(score, 'target-rest-1', 'target-rest-2')
    const clipboard = buildRangeClipboard(score, source!)

    expect(buildRangePasteCommand(
      score,
      target!,
      clipboard!,
      idSequence('unused')
    )).toBeUndefined()
  })

  it('range-editing.convert-notes-to-rests converts selected notes in a range to rests as one edit', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      note('note-2', TICKS_PER_QUARTER, 'quarter'),
      rest('rest-1', TICKS_PER_QUARTER * 2, 'quarter'),
      note('note-3', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const selection = createRangeSelection(score, 'note-1', 'rest-1')
    const command = buildRangeRestCommand(score, selection!)
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]

    expect(command).toMatchObject({
      type: 'voice-events.replace',
      editedEventId: 'note-1'
    })
    expect(measure.voices[0].events).toMatchObject([
      { id: 'note-1', type: 'rest', position: { tick: 0 } },
      {
        id: 'note-2',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER }
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER * 2 }
      },
      {
        id: 'note-3',
        type: 'note',
        position: { tick: TICKS_PER_QUARTER * 3 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('rejects range rest conversion when no selected notes change', () => {
    const score = scoreWith([
      rest('rest-1', 0, 'quarter'),
      rest('rest-2', TICKS_PER_QUARTER, 'quarter'),
      note('note-1', TICKS_PER_QUARTER * 2, 'half')
    ])
    const selection = createRangeSelection(score, 'rest-1', 'rest-2')

    expect(buildRangeRestCommand(score, selection!)).toBeUndefined()
  })

  it('range-editing.reject-unsafe-rest-conversion rejects range rest conversion when selected notes are tied', () => {
    const score = scoreWith([
      createNote({
        id: 'note-1',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 },
        duration: createDuration('quarter'),
        ties: { start: true }
      }),
      createNote({
        id: 'note-2',
        position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: 'C', octave: 4 },
        duration: createDuration('quarter'),
        ties: { stop: true }
      }),
      rest('rest-1', TICKS_PER_QUARTER * 2, 'half')
    ])
    const selection = createRangeSelection(score, 'note-1', 'note-2')

    expect(buildRangeRestCommand(score, selection!)).toBeUndefined()
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
  value: Parameters<typeof createDuration>[0]
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step: 'C',
      octave: 4
    },
    duration: createDuration(value)
  })
}

function rest(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0]
) {
  return createRest({
    id,
    position: createTimePosition(tick),
    duration: createDuration(value)
  })
}

function idSequence(prefix: string): () => string {
  let index = 0

  return () => `${prefix}-${++index}`
}
