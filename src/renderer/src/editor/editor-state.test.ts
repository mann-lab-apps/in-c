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
  type PitchStep,
  type Score,
  type VoiceEvent
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createPlaybackTimeline } from '../playback/timeline'
import {
  buildDeleteCommand,
  buildDotCommand,
  buildDurationCommand,
  buildFilteredDeleteCommand,
  buildFilteredRangeClipboard,
  buildFilteredRangePasteCommand,
  buildNoteEntryCommand,
  buildRangeClipboard,
  buildRangePasteCommand,
  buildRangeRestCommand,
  buildRestEntryCommand,
  buildTupletGroupCommand,
  createEventSelection,
  createRangeSelection,
  getAdjacentEventId,
  getFilteredSelectedEventIds,
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

  it('score-addressing.locates duplicate event ids by explicit voice address', () => {
    const score = scoreWithDuplicateEventIds()
    const celloAddress = {
      partId: 'cello',
      staffId: 'cello-staff',
      measureId: 'measure-1',
      voiceId: 'voice-1'
    }

    expect(locateEvent(score, 'shared')?.address.partId).toBe('violin')
    expect(locateEvent(score, 'shared', celloAddress)).toMatchObject({
      address: celloAddress,
      event: {
        id: 'shared',
        type: 'note',
        pitch: {
          step: 'G'
        }
      }
    })
  })

  it('score-addressing.selects duplicate event ids by same-staff voice address', () => {
    const score = scoreWithSameStaffDuplicateEventIds()
    const voiceTwoAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-2'
    }

    expect(createEventSelection(score, 'shared-note', voiceTwoAddress)).toEqual({
      type: 'event',
      eventId: 'shared-note',
      address: voiceTwoAddress
    })
    expect(
      locateEvent(score, 'shared-note', voiceTwoAddress)?.event
    ).toMatchObject({
      id: 'shared-note',
      pitch: {
        step: 'G'
      }
    })
  })

  it('score-addressing.keeps duration edits scoped to the addressed voice', () => {
    const score = scoreWithDuplicateEventIds()
    const celloAddress = {
      partId: 'cello',
      staffId: 'cello-staff',
      measureId: 'measure-1',
      voiceId: 'voice-1'
    }
    const command = buildDurationCommand(
      score,
      {
        type: 'event',
        eventId: 'shared',
        address: celloAddress
      },
      createDuration('eighth'),
      () => 'released-rest'
    )
    const result = applyScoreCommand(score, command!)

    expect(
      locateEvent(result.score, 'shared', celloAddress)?.event.duration.value
    ).toBe('eighth')
    expect(
      locateEvent(result.score, 'shared', {
        partId: 'violin',
        staffId: 'violin-staff',
        measureId: 'measure-1',
        voiceId: 'voice-1'
      })?.event.duration.value
    ).toBe('quarter')
  })

  it('score-addressing.moves adjacent selection inside the active voice address', () => {
    const score = scoreWithDuplicateEventIds()
    const violinSelection = createEventSelection(score, 'shared')
    const celloAddress = {
      partId: 'cello',
      staffId: 'cello-staff',
      measureId: 'measure-1',
      voiceId: 'voice-1'
    }

    expect(violinSelection).toMatchObject({
      type: 'event',
      address: {
        partId: 'violin',
        staffId: 'violin-staff',
        voiceId: 'voice-1'
      }
    })
    expect(getAdjacentEventId(score, 'shared', 1, violinSelection.address)).toBe(
      'violin-next'
    )
    expect(getAdjacentEventId(score, 'shared', 1, celloAddress)).toBe('cello-next')
  })

  it('creates an ordered event range selection in one voice', () => {
    const selection = createRangeSelection(demoScore, 'note-g4', 'note-c5')

    expect(selection).toMatchObject({
      type: 'range',
      anchorEventId: 'note-g4',
      focusEventId: 'note-c5',
      eventIds: ['note-g4', 'note-a4', 'note-b4', 'note-c5'],
      address: {
        partId: 'piano',
        staffId: 'piano-staff',
        voiceId: 'voice-1'
      }
    })
    expect(getSelectedEventIds(selection!)).toEqual([
      'note-g4',
      'note-a4',
      'note-b4',
      'note-c5'
    ])
  })

  it('selection-filter.filters note and rest ids inside the addressed voice only', () => {
    const score = scoreWithSameStaffVoiceDuplicateRestIds()
    const voiceTwoAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-2'
    }
    const selection = createRangeSelection(
      score,
      'shared-note',
      'shared-rest',
      voiceTwoAddress
    )

    expect(selection).toMatchObject({
      type: 'range',
      eventIds: ['shared-note', 'shared-rest'],
      address: voiceTwoAddress
    })
    expect(getFilteredSelectedEventIds(score, selection!, { eventTypes: 'notes' })).toEqual([
      'shared-note'
    ])
    expect(getFilteredSelectedEventIds(score, selection!, { eventTypes: 'rests' })).toEqual([
      'shared-rest'
    ])
    expect(
      getFilteredSelectedEventIds(score, selection!, { eventTypes: 'notes-and-rests' })
    ).toEqual(['shared-note', 'shared-rest'])
    expect(
      locateEvent(score, 'shared-note', voiceTwoAddress)?.event
    ).toMatchObject({
      type: 'note',
      pitch: {
        step: 'G'
      }
    })
  })

  it('selection-filter.note-only-delete converts only notes in the addressed voice range', () => {
    const score = scoreWithSameStaffVoiceDuplicateRestIds()
    const voiceTwoAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-2'
    }
    const selection = createRangeSelection(
      score,
      'shared-note',
      'shared-rest',
      voiceTwoAddress
    )
    const command = buildFilteredDeleteCommand(score, selection!, {
      eventTypes: 'notes'
    })
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voiceOne = measure.voices.find((voice) => voice.id === 'voice-1')
    const voiceTwo = measure.voices.find((voice) => voice.id === 'voice-2')

    expect(command).toMatchObject({
      type: 'voice-events.replace',
      target: voiceTwoAddress,
      editedEventId: 'shared-note'
    })
    expect(voiceOne?.events.map((event) => event.id)).toEqual([
      'shared-note',
      'shared-rest',
      'v1-rest'
    ])
    expect(voiceTwo?.events).toMatchObject([
      {
        id: 'shared-note',
        type: 'rest',
        position: { tick: 0 },
        duration: { value: 'quarter' }
      },
      {
        id: 'shared-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER },
        duration: { value: 'quarter' }
      },
      {
        id: 'v2-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER * 2 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('selection-filter.rest-only-delete rejects a note-only range and leaves other voices untouched', () => {
    const score = scoreWithSameStaffVoices()
    const voiceTwoAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-2'
    }
    const selection = createRangeSelection(
      score,
      'v2-note-1',
      'v2-note-2',
      voiceTwoAddress
    )

    expect(buildFilteredDeleteCommand(score, selection!, { eventTypes: 'rests' }))
      .toBeUndefined()
  })

  it('keeps range selection ordered when extending backward', () => {
    expect(createRangeSelection(demoScore, 'note-c5', 'note-g4')).toMatchObject({
      type: 'range',
      anchorEventId: 'note-c5',
      focusEventId: 'note-g4',
      eventIds: ['note-g4', 'note-a4', 'note-b4', 'note-c5'],
      address: {
        partId: 'piano',
        staffId: 'piano-staff',
        voiceId: 'voice-1'
      }
    })
  })

  it('collapses a one-event range back to an event selection', () => {
    expect(createRangeSelection(demoScore, 'note-g4', 'note-g4')).toMatchObject({
      type: 'event',
      eventId: 'note-g4',
      address: {
        partId: 'piano',
        staffId: 'piano-staff',
        voiceId: 'voice-1'
      }
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

  it('[note-input.convert-selected-note-to-rest] converts a selected note to a rest without moving or resizing it', () => {
    const original = readEvent(demoScore, 'note-g4')
    const restCommand = buildRestEntryCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      original!.duration,
      () => 'unused'
    )
    const restResult = applyScoreCommand(demoScore, restCommand!)

    expect(readEvent(restResult.score, 'note-g4')).toMatchObject({
      type: 'rest',
      position: original!.position,
      duration: original!.duration
    })
    expect(
      restResult.score.parts[0].staves.flatMap((staff) => staff.measures)
        .every((measure) => validateMeasureRhythm(measure).isExact)
    ).toBe(true)
  })

  it('note-input.edit-selected-event-in-inspector changes duration and converts a selected note to a same-position rest', () => {
    const original = readEvent(demoScore, 'note-g4')
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
      position: original!.position,
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
    expect(
      restResult.score.parts[0].staves.flatMap((staff) => staff.measures)
        .every((measure) => validateMeasureRhythm(measure).isExact)
    ).toBe(true)
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

  it('augmentation-dots.add-first-dot note-input.edit-selected-event-in-inspector adds and removes augmentation dots through rhythm transactions', () => {
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

  it('tuplets.edit-member-duration absorbs trailing tuplet rests for an eighth-plus-quarter group', () => {
    const apply = buildTupletGroupCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      () => 'tuplet-remainder'
    )
    const applied = applyScoreCommand(demoScore, apply!)
    const changeDuration = buildDurationCommand(
      applied.score,
      { type: 'event', eventId: 'note-a4' },
      createDuration('quarter')
    )
    const changed = applyScoreCommand(applied.score, changeDuration!)
    const measure = changed.score.parts[0].staves[0].measures[1]
    const voice = measure.voices[0]

    expect(changeDuration).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'note-a4'
    })
    expect(voice.events.slice(0, 3)).toMatchObject([
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
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 4_480 }
      },
      {
        id: 'note-b4',
        duration: { value: 'eighth' },
        position: { tick: 13_440 }
      }
    ])
    expect(voice.events.some((event) => event.id === 'tuplet-remainder')).toBe(
      false
    )
    expect(voice.tuplets?.[0]).toMatchObject({
      eventIds: ['note-g4', 'note-a4'],
      actualNotes: 3,
      normalNotes: 2
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('tuplets.edit-member-duration restores tuplet rests when shrinking a mixed group member', () => {
    const apply = buildTupletGroupCommand(
      demoScore,
      { type: 'event', eventId: 'note-g4' },
      () => 'tuplet-remainder'
    )
    const applied = applyScoreCommand(demoScore, apply!)
    const growDuration = buildDurationCommand(
      applied.score,
      { type: 'event', eventId: 'note-a4' },
      createDuration('quarter')
    )
    const grown = applyScoreCommand(applied.score, growDuration!)
    const shrinkDuration = buildDurationCommand(
      grown.score,
      { type: 'event', eventId: 'note-a4' },
      createDuration('eighth'),
      idSequence('restored-triplet-rest')
    )
    const shrunk = applyScoreCommand(grown.score, shrinkDuration!)
    const measure = shrunk.score.parts[0].staves[0].measures[1]
    const voice = measure.voices[0]

    expect(shrinkDuration).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'note-a4'
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
        id: 'restored-triplet-rest-1',
        type: 'rest',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        },
        position: { tick: 8_960 }
      },
      {
        id: 'note-b4',
        duration: { value: 'eighth' },
        position: { tick: 13_440 }
      }
    ])
    expect(voice.tuplets?.[0]).toMatchObject({
      eventIds: ['note-g4', 'note-a4', 'restored-triplet-rest-1'],
      actualNotes: 3,
      normalNotes: 2
    })
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
  })

  it('tuplets.remove-existing-group toggles a mixed group back when right rest space exists', () => {
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
                        createNote({
                          id: 'triplet-eighth',
                          position: createTimePosition(0),
                          duration: {
                            ...createDuration('eighth'),
                            tuplet: { actualNotes: 3, normalNotes: 2 }
                          },
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'triplet-quarter',
                          position: createTimePosition(quarter / 3),
                          duration: {
                            ...createDuration('quarter'),
                            tuplet: { actualNotes: 3, normalNotes: 2 }
                          },
                          pitch: { step: 'D', octave: 4 }
                        }),
                        createRest({
                          id: 'right-rest',
                          position: createTimePosition(quarter),
                          duration: createDuration('half', 1)
                        })
                      ],
                      tuplets: [
                        {
                          id: 'tuplet-1',
                          eventIds: ['triplet-eighth', 'triplet-quarter'],
                          actualNotes: 3,
                          normalNotes: 2
                        }
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
    const remove = buildTupletGroupCommand(
      score,
      { type: 'event', eventId: 'triplet-quarter' },
      idSequence('split-right-rest')
    )
    const removed = applyScoreCommand(score, remove!)
    const measure = removed.score.parts[0].staves[0].measures[0]
    const voice = measure.voices[0]

    expect(remove).toMatchObject({
      type: 'voice-content.replace',
      editedEventId: 'triplet-eighth'
    })
    expect(voice.tuplets).toEqual([])
    expect(voice.events).toMatchObject([
      {
        id: 'triplet-eighth',
        duration: { value: 'eighth', tuplet: undefined },
        position: { tick: 0 }
      },
      {
        id: 'triplet-quarter',
        duration: { value: 'quarter', tuplet: undefined },
        position: { tick: quarter / 2 }
      },
      {
        id: 'right-rest',
        type: 'rest',
        duration: { value: 'half' },
        position: { tick: quarter * 1.5 }
      },
      {
        id: 'split-right-rest-1',
        type: 'rest',
        duration: { value: 'eighth' },
        position: { tick: quarter * 3.5 }
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
          ties: undefined
        }),
        expect.objectContaining({
          id: 'note-d4',
          type: 'rest',
          duration: expect.objectContaining({ value: 'quarter' })
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
      type: 'voice-events.replace'
    })
    expect(measure.voices[0].events).toHaveLength(3)
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'note-1',
        type: 'note',
        duration: { value: 'quarter' },
        ties: undefined
      },
      {
        id: 'rest-1',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER },
        duration: { value: 'half' }
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

  it('range paste removes replaced span endpoints in one undoable native-safe transaction', () => {
    const score = scoreWith([note('source-1', 0, 'quarter'), note('source-2', TICKS_PER_QUARTER, 'quarter'),
      note('target-1', TICKS_PER_QUARTER * 2, 'quarter'), note('target-2', TICKS_PER_QUARTER * 3, 'quarter')])
    const retained = { id: 'retained', startEventId: 'source-1', endEventId: 'source-2', engraving: { height: 3 } }
    score.slurs = [retained, { id: 'overwritten', startEventId: 'target-1', endEventId: 'target-2' }]
    score.hairpins = [{ id: 'partial', startEventId: 'source-2', endEventId: 'target-1', type: 'crescendo' }]
    score.octaveShifts = [{ id: 'octave', startEventId: 'target-1', endEventId: 'target-2', type: '8va' }]
    const source = createRangeSelection(score, 'source-1', 'source-2')!
    const target = createRangeSelection(score, 'target-1', 'target-2')!
    const command = buildRangePasteCommand(score, target, buildRangeClipboard(score, source)!, idSequence('pasted'))!
    const result = applyScoreCommand(score, command)
    expect(result.score.slurs).toEqual([retained, { ...retained, id: 'pasted-3', startEventId: 'pasted-1', endEventId: 'pasted-2' }])
    expect(result.score.hairpins).toEqual([])
    expect(result.score.octaveShifts).toEqual([])
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(JSON.parse(JSON.stringify(result.score)))
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it.each(['same-staff', 'other-part'])('range paste reconnects contained spans and musical geometry to %s', destination => {
    const score = scoreWithSameStaffVoices()
    const part = score.parts[0]!, staff = part.staves[0]!, measure = staff.measures[0]!
    const sourceAddress = { partId: part.id, staffId: staff.id, measureId: measure.id, voiceId: 'voice-1' }
    let targetAddress = { ...sourceAddress, voiceId: 'voice-2' }
    let targetIds = ['v2-note-1', 'v2-note-2']
    if (destination === 'other-part') {
      const other = structuredClone(part)
      other.id = 'other-part'; other.staves[0]!.id = 'other-staff'; other.staves[0]!.measures[0]!.id = 'other-measure'
      for (const voice of other.staves[0]!.measures[0]!.voices) for (const event of voice.events) event.id += '-other'
      score.parts.push(other)
      targetAddress = { partId: other.id, staffId: 'other-staff', measureId: 'other-measure', voiceId: 'voice-2' }
      targetIds = targetIds.map(id => id + '-other')
    }
    const engraving = { height: 3, segments: [{ partId: part.id, staffId: staff.id,
      startMeasureId: measure.id, endMeasureId: measure.id, geometry: { offsetY: 2 } }] }
    score.slurs = [{ id: 'source-slur', startEventId: 'v1-note-1', endEventId: 'v1-note-2', engraving }]
    score.hairpins = [{ id: 'source-hairpin', type: 'crescendo', startEventId: 'v1-note-1', endEventId: 'v1-note-2', engraving },
      { id: 'partial', type: 'diminuendo', startEventId: 'v1-note-2', endEventId: 'v1-rest' }]
    const original = structuredClone(score)
    const clipboard = buildRangeClipboard(score, createRangeSelection(score, 'v1-note-1', 'v1-note-2', sourceAddress)!)!
    const command = buildRangePasteCommand(score, createRangeSelection(score, targetIds[0]!, targetIds[1]!, targetAddress)!, clipboard, idSequence('copy'))!
    const result = applyScoreCommand(score, command)
    expect(result.score.slurs).toHaveLength(2)
    expect(result.score.hairpins).toHaveLength(3)
    const copied = result.score.slurs!.find(span => span.id !== 'source-slur')!
    expect(copied).toMatchObject({ startEventId: 'copy-1', endEventId: 'copy-2', engraving: { height: 3, segments: [{
      partId: targetAddress.partId, staffId: targetAddress.staffId, startMeasureId: targetAddress.measureId, endMeasureId: targetAddress.measureId, geometry: { offsetY: 2 }
    }] } })
    expect(score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score.slurs).toEqual(result.score.slurs)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(original)
    copied.engraving!.segments![0]!.geometry!.offsetY = 7
    expect(score.slurs![0]!.engraving!.segments![0]!.geometry!.offsetY).toBe(2)
  })

  it.each(['8va', '8vb', '15ma', '15mb'] as const)('range paste preserves contained %s lines and performed pitch through XML/native reopen', type => {
    const score = scoreWith([note('source-1', 0, 'quarter'), note('source-2', TICKS_PER_QUARTER, 'quarter'),
      note('target-1', TICKS_PER_QUARTER * 2, 'quarter'), note('target-2', TICKS_PER_QUARTER * 3, 'quarter')])
    const retained = { id: 'source-octave', startEventId: 'source-1', endEventId: 'source-2', type }
    score.octaveShifts = [retained, { id: 'partial-octave', startEventId: 'source-2', endEventId: 'target-1', type }]
    const clipboard = buildRangeClipboard(score, createRangeSelection(score, 'source-1', 'source-2')!)!
    expect(clipboard.excludedSpanCount).toBe(1)
    const result = applyScoreCommand(score, buildRangePasteCommand(score,
      createRangeSelection(score, 'target-1', 'target-2')!, clipboard, idSequence('octave-paste'))!)
    expect(result.score.octaveShifts).toEqual([retained, { ...retained, id: 'octave-paste-3', startEventId: 'octave-paste-1', endEventId: 'octave-paste-2' }])
    const timeline = createPlaybackTimeline(result.score)
    expect(timeline.events.slice(2).map(event => event.frequency)).toEqual(timeline.events.slice(0, 2).map(event => event.frequency))
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(reopened.octaveShifts?.map(span => span.type)).toEqual([type, type])
    expect(createPlaybackTimeline(reopened).events.map(event => event.frequency)).toEqual(timeline.events.map(event => event.frequency))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score.octaveShifts).toEqual(result.score.octaveShifts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it.each(['identical', 'different-type', 'partial-overlap'] as const)('range octave paste handles %s staff-wide intervals without double transposition', scenario => {
    const source = scoreWithSameStaffVoices()
    source.octaveShifts = [{ id: 'source-octave', startEventId: 'v1-note-1', endEventId: 'v1-note-2', type: '8va' }]
    const clipboard = buildRangeClipboard(source, createRangeSelection(source, 'v1-note-1', 'v1-note-2')!)!
    const target = scoreWithSameStaffVoices()
    target.octaveShifts = [{ id: 'existing', startEventId: 'v1-note-1',
      endEventId: scenario === 'partial-overlap' ? 'v1-note-1' : 'v1-note-2', type: scenario === 'different-type' ? '8vb' : '8va' }]
    const original = structuredClone(target)
    const command = buildRangePasteCommand(target, createRangeSelection(target, 'v2-note-1', 'v2-note-2')!, clipboard, idSequence('octave'))
    if (scenario === 'identical') {
      const result = applyScoreCommand(target, command!)
      expect(result.score.octaveShifts).toEqual(target.octaveShifts)
      const timeline = createPlaybackTimeline(result.score)
      expect(timeline.events.filter(event => event.voiceId === 'voice-2').map(event => event.frequency))
        .toEqual(timeline.events.filter(event => event.voiceId === 'voice-1').map(event => event.frequency))
      expect(applyScoreCommand(result.score, result.undo).score).toEqual(original)
    } else expect(command).toBeUndefined()
    expect(target).toEqual(original)
  })

  it('range span clipboard survives source deletion and repeated paste into another document', () => {
    const source = scoreWithSameStaffVoices()
    const staff = source.parts[0]!.staves[0]!, measure = staff.measures[0]!
    const segment = { partId: source.parts[0]!.id, staffId: staff.id, startMeasureId: measure.id, endMeasureId: measure.id, geometry: { height: 2 } }
    source.slurs = [{ id: 'copied', startEventId: 'v1-note-1', endEventId: 'v1-note-2', engraving: { segments: [segment] } }]
    source.hairpins = [{ id: 'partial', type: 'crescendo', startEventId: 'v1-note-2', endEventId: 'v1-rest' }]
    const clipboard = buildRangeClipboard(source, createRangeSelection(source, 'v1-note-1', 'v1-note-2')!)!
    expect(clipboard.excludedSpanCount).toBe(1)
    expect(clipboard.excludedSegmentCount).toBe(0)
    const snapshot = structuredClone(clipboard)
    source.slurs = []
    measure.voices[0]!.events = []
    const target = scoreWith([rest('target-1', 0, 'half'), rest('target-2', TICKS_PER_QUARTER * 2, 'half')])
    target.parts[0]!.id = 'destination'
    target.parts[0]!.staves[0]!.id = 'destination-staff'
    target.parts[0]!.staves[0]!.measures[0]!.id = 'destination-measure'
    const id = idSequence('repeated')
    const first = applyScoreCommand(target, buildRangePasteCommand(target, createEventSelection(target, 'target-1'), clipboard, id)!)
    const second = applyScoreCommand(first.score, buildRangePasteCommand(first.score, createEventSelection(first.score, 'target-2'), clipboard, id)!)
    expect(second.score.slurs).toHaveLength(2)
    expect(second.score.hairpins ?? []).toEqual([])
    const ids = second.score.slurs!.flatMap(span => [span.id, span.startEventId, span.endEventId])
    expect(new Set(ids).size).toBe(6)
    for (const span of second.score.slurs!) expect(span.engraving!.segments![0]).toEqual({ ...segment,
      partId: 'destination', staffId: 'destination-staff', startMeasureId: 'destination-measure', endMeasureId: 'destination-measure' })
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(second.score))).score).toEqual(JSON.parse(JSON.stringify(second.score)))
    expect(applyScoreCommand(second.score, second.undo).score).toEqual(first.score)
    expect(applyScoreCommand(first.score, first.undo).score).toEqual(target)
    expect(clipboard).toEqual(snapshot)
  })

  it('range clipboard snapshots and deep-clones note-attached markings without aliasing source or clipboard', () => {
    const marked = { ...note('source', 0, 'half'), lyrics: [{ number: 1, text: 'la', syllabic: 'single' as const }],
      articulations: ['accent' as const], ornaments: ['trill' as const], graceNotes: [{ pitch: { step: 'D' as const, octave: 4 } }],
      tremolo: { type: 'single' as const, marks: 1 as const }, fermata: true, breathMark: 'breath' as const }
    const score = scoreWith([marked, rest('target', TICKS_PER_QUARTER * 2, 'half')])
    const clipboard = buildRangeClipboard(score, createEventSelection(score, 'source'))!
    marked.lyrics[0]!.text = 'changed after copy'
    const result = applyScoreCommand(score, buildRangePasteCommand(score, createEventSelection(score, 'target'), clipboard, idSequence('pasted'))!)
    const pasted = locateEvent(result.score, 'pasted-1')!.event
    expect(pasted).toMatchObject({ lyrics: [{ text: 'la' }], articulations: ['accent'], ornaments: ['trill'], graceNotes: marked.graceNotes, tremolo: marked.tremolo, fermata: true, breathMark: 'breath' })
    if (pasted.type !== 'note') throw new Error('Missing pasted note')
    pasted.lyrics![0]!.text = 'edited paste'
    pasted.articulations!.push('staccato')
    expect(clipboard.events[0]!.event).toMatchObject({ lyrics: [{ text: 'la' }], articulations: ['accent'] })
    expect(marked.lyrics[0]!.text).toBe('changed after copy')
    expect(marked.articulations).toEqual(['accent'])
  })

  it('range-editing.same-staff-voice-delete keeps range deletion scoped to voice 2', () => {
    const score = scoreWithSameStaffVoices()
    const voiceTwoAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-2'
    }
    const selection = createRangeSelection(
      score,
      'v2-note-1',
      'v2-note-2',
      voiceTwoAddress
    )
    const command = buildDeleteCommand(score, selection!)
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voiceOne = measure.voices.find((voice) => voice.id === 'voice-1')
    const voiceTwo = measure.voices.find((voice) => voice.id === 'voice-2')

    expect(selection).toMatchObject({
      type: 'range',
      address: voiceTwoAddress,
      eventIds: ['v2-note-1', 'v2-note-2']
    })
    expect(command).toMatchObject({
      type: 'voice-events.replace',
      target: voiceTwoAddress
    })
    expect(voiceOne?.events.map((event) => event.id)).toEqual([
      'v1-note-1',
      'v1-note-2',
      'v1-rest'
    ])
    expect(voiceTwo?.events).toMatchObject([
      {
        id: 'v2-note-1',
        type: 'rest',
        position: { tick: 0 },
        duration: { value: 'whole' }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('range-editing.same-staff-voice-copy-paste targets the addressed voice', () => {
    const score = scoreWithSameStaffVoices()
    const voiceOneAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-1'
    }
    const voiceTwoAddress = {
      ...voiceOneAddress,
      voiceId: 'voice-2'
    }
    const source = createRangeSelection(
      score,
      'v1-note-1',
      'v1-note-2',
      voiceOneAddress
    )
    const target = createRangeSelection(
      score,
      'v2-note-1',
      'v2-note-2',
      voiceTwoAddress
    )
    const clipboard = buildRangeClipboard(score, source!)
    const command = buildRangePasteCommand(
      score,
      target!,
      clipboard!,
      idSequence('voice-2-paste')
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voiceOne = measure.voices.find((voice) => voice.id === 'voice-1')
    const voiceTwo = measure.voices.find((voice) => voice.id === 'voice-2')

    expect(command).toMatchObject({
      type: 'voice-events.replace',
      target: voiceTwoAddress,
      editedEventId: 'voice-2-paste-1'
    })
    expect(voiceOne?.events.map((event) => event.id)).toEqual([
      'v1-note-1',
      'v1-note-2',
      'v1-rest'
    ])
    expect(voiceTwo?.events).toMatchObject([
      {
        id: 'voice-2-paste-1',
        type: 'note',
        pitch: { step: 'C' },
        position: { tick: 0 }
      },
      {
        id: 'voice-2-paste-2',
        type: 'note',
        pitch: { step: 'D' },
        position: { tick: TICKS_PER_QUARTER }
      },
      {
        id: 'v2-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER * 2 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('selection-filter.note-only-copy-paste targets filtered events in the addressed voice', () => {
    const score = scoreWithSameStaffVoices()
    const voiceOneAddress = {
      partId: 'part-1',
      staffId: 'staff-1',
      measureId: 'measure-1',
      voiceId: 'voice-1'
    }
    const voiceTwoAddress = {
      ...voiceOneAddress,
      voiceId: 'voice-2'
    }
    const source = createRangeSelection(
      score,
      'v1-note-1',
      'v1-rest',
      voiceOneAddress
    )
    const target = createRangeSelection(
      score,
      'v2-note-1',
      'v2-rest',
      voiceTwoAddress
    )
    const clipboard = buildFilteredRangeClipboard(score, source!, {
      eventTypes: 'notes'
    })
    const command = buildFilteredRangePasteCommand(
      score,
      target!,
      clipboard!,
      idSequence('filtered-voice-2-paste'),
      { eventTypes: 'notes' }
    )
    const result = applyScoreCommand(score, command!)
    const measure = result.score.parts[0].staves[0].measures[0]
    const voiceOne = measure.voices.find((voice) => voice.id === 'voice-1')
    const voiceTwo = measure.voices.find((voice) => voice.id === 'voice-2')

    expect(source).toMatchObject({
      type: 'range',
      eventIds: ['v1-note-1', 'v1-note-2', 'v1-rest']
    })
    expect(clipboard).toMatchObject({
      durationTicks: TICKS_PER_QUARTER * 2,
      eventCount: 2
    })
    expect(command).toMatchObject({
      type: 'voice-events.replace',
      target: voiceTwoAddress,
      editedEventId: 'filtered-voice-2-paste-1'
    })
    expect(voiceOne?.events.map((event) => event.id)).toEqual([
      'v1-note-1',
      'v1-note-2',
      'v1-rest'
    ])
    expect(voiceTwo?.events).toMatchObject([
      {
        id: 'filtered-voice-2-paste-1',
        type: 'note',
        pitch: { step: 'C' },
        position: { tick: 0 }
      },
      {
        id: 'filtered-voice-2-paste-2',
        type: 'note',
        pitch: { step: 'D' },
        position: { tick: TICKS_PER_QUARTER }
      },
      {
        id: 'v2-rest',
        type: 'rest',
        position: { tick: TICKS_PER_QUARTER * 2 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('selection-filter.copy rejects filtered events that would leave rhythmic gaps', () => {
    const score = scoreWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', TICKS_PER_QUARTER, 'quarter'),
      note('note-2', TICKS_PER_QUARTER * 2, 'quarter'),
      rest('rest-2', TICKS_PER_QUARTER * 3, 'quarter')
    ])
    const selection = createRangeSelection(score, 'note-1', 'note-2')

    expect(
      buildFilteredRangeClipboard(score, selection!, { eventTypes: 'notes' })
    ).toBeUndefined()
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

function scoreWithSameStaffVoices(): Score {
  return createScore({
    parts: [
      createPart({
        id: 'part-1',
        staves: [
          createStaff({
            id: 'staff-1',
            measures: [
              createMeasure({
                id: 'measure-1',
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: [
                      noteWithPitch('v1-note-1', 0, 'quarter', 'C'),
                      noteWithPitch(
                        'v1-note-2',
                        TICKS_PER_QUARTER,
                        'quarter',
                        'D'
                      ),
                      rest('v1-rest', TICKS_PER_QUARTER * 2, 'half')
                    ]
                  }),
                  createVoice({
                    id: 'voice-2',
                    events: [
                      noteWithPitch('v2-note-1', 0, 'quarter', 'G'),
                      noteWithPitch(
                        'v2-note-2',
                        TICKS_PER_QUARTER,
                        'quarter',
                        'A'
                      ),
                      rest('v2-rest', TICKS_PER_QUARTER * 2, 'half')
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

function scoreWithSameStaffDuplicateEventIds(): Score {
  return createScore({
    parts: [
      createPart({
        id: 'part-1',
        staves: [
          createStaff({
            id: 'staff-1',
            measures: [
              createMeasure({
                id: 'measure-1',
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: [
                      noteWithPitch('shared-note', 0, 'quarter', 'C'),
                      rest('v1-rest', TICKS_PER_QUARTER, 'half')
                    ]
                  }),
                  createVoice({
                    id: 'voice-2',
                    events: [
                      noteWithPitch('shared-note', 0, 'quarter', 'G'),
                      rest('v2-rest', TICKS_PER_QUARTER, 'half')
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

function scoreWithSameStaffVoiceDuplicateRestIds(): Score {
  return createScore({
    parts: [
      createPart({
        id: 'part-1',
        staves: [
          createStaff({
            id: 'staff-1',
            measures: [
              createMeasure({
                id: 'measure-1',
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: [
                      noteWithPitch('shared-note', 0, 'quarter', 'C'),
                      rest('shared-rest', TICKS_PER_QUARTER, 'quarter'),
                      rest('v1-rest', TICKS_PER_QUARTER * 2, 'half')
                    ]
                  }),
                  createVoice({
                    id: 'voice-2',
                    events: [
                      noteWithPitch('shared-note', 0, 'quarter', 'G'),
                      rest('shared-rest', TICKS_PER_QUARTER, 'quarter'),
                      rest('v2-rest', TICKS_PER_QUARTER * 2, 'half')
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

function scoreWithDuplicateEventIds(): Score {
  return createScore({
    parts: [
      createPart({
        id: 'violin',
        name: 'Violin',
        staves: [
          createStaff({
            id: 'violin-staff',
            measures: [
              createMeasure({
                id: 'measure-1',
                voices: [
                  createVoice({
                    events: [
                      noteWithPitch('shared', 0, 'quarter', 'C'),
                      noteWithPitch(
                        'violin-next',
                        TICKS_PER_QUARTER,
                        'quarter',
                        'D'
                      ),
                      rest('violin-rest', TICKS_PER_QUARTER * 2, 'half')
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      createPart({
        id: 'cello',
        name: 'Cello',
        staves: [
          createStaff({
            id: 'cello-staff',
            measures: [
              createMeasure({
                id: 'measure-1',
                voices: [
                  createVoice({
                    events: [
                      noteWithPitch('shared', 0, 'quarter', 'G'),
                      noteWithPitch(
                        'cello-next',
                        TICKS_PER_QUARTER,
                        'quarter',
                        'A'
                      ),
                      rest('cello-rest', TICKS_PER_QUARTER * 2, 'half')
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

function note(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0]
) {
  return noteWithPitch(id, tick, value, 'C')
}

function noteWithPitch(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0],
  step: PitchStep
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step,
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
