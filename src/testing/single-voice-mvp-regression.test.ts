import { describe, expect, it } from 'vitest'

import { parseMusicXml, serializeMusicXml } from '../musicxml'
import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildTieCommand,
  collectTiePairs,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  resolveNotePitch,
  validateMeasureRhythm,
  validateTieRelations,
  validateVoiceTuplets
} from '../score-core'
import {
  buildDeleteCommand,
  buildDurationCommand,
  getAdjacentEventId,
  locateEvent
} from '../renderer/src/editor/editor-state'
import {
  buildInsertMeasureAfter,
  buildRemoveMeasure
} from '../renderer/src/editor/measure-management'
import { buildKeySignatureCommand } from '../renderer/src/editor/key-signature'
import { buildPitchStepCommand } from '../renderer/src/editor/pitch-editing'
import { createNewScore } from '../renderer/src/editor/new-score'
import { buildTimeSignatureCommand } from '../renderer/src/editor/time-signature'
import {
  buildSequentialInput,
  createNoteInputState
} from '../renderer/src/editor/note-input-state'
import { createBeamGroups } from '../renderer/src/notation/beam-groups'
import { createSystemLayout } from '../renderer/src/notation/system-layout'
import {
  createPlaybackTimeline,
  findPlaybackEvent
} from '../renderer/src/playback/timeline'
import {
  createScoreSemanticSnapshot,
  createReleaseTestScore,
  createSingleVoiceMvpScore
} from './single-voice-mvp-fixture'

const quarter = TICKS_PER_QUARTER
const inputTarget = {
  partId: 'part-1',
  staffId: 'staff-1',
  measureId: 'measure-1',
  voiceId: 'voice-1'
}

describe('single-voice MVP regression', () => {
  it('shares one exact eight-measure fixture across score features', () => {
    const score = createSingleVoiceMvpScore()
    const measures = score.parts[0].staves[0].measures

    expect(measures).toHaveLength(8)
    measures.forEach((measure) => {
      expect(validateMeasureRhythm(measure).isExact).toBe(true)
      expect(validateVoiceTuplets(measure.voices[0])).toEqual([])
    })
    expect(validateTieRelations(score)).toEqual([])
    expect(
      createBeamGroups(measures[1], measures[1].voices[0])
    ).toHaveLength(4)
    expect(measures[6].voices[0].tuplets).toHaveLength(1)
  })

  it('toggles a same-pitch adjacent tie without changing the rhythm', () => {
    const score = createSingleVoiceMvpScore()
    const command = buildTieCommand(score, 'm4-f-natural-1', true)
    const tied = applyScoreCommand(score, command!)

    expect(collectTiePairs(tied.score)).toEqual(
      expect.arrayContaining([
        {
          fromEventId: 'm4-f-natural-1',
          toEventId: 'm4-f-natural-2'
        }
      ])
    )
    expect(validateTieRelations(tied.score)).toEqual([])
    expect(
      validateMeasureRhythm(tied.score.parts[0].staves[0].measures[3]).isExact
    ).toBe(true)

    const roundTripped = parseMusicXml(serializeMusicXml(tied.score))
    expect(validateTieRelations(roundTripped)).toEqual([])
    expect(collectTiePairs(roundTripped)).toHaveLength(
      collectTiePairs(tied.score).length
    )

    const remove = buildTieCommand(tied.score, 'm4-f-natural-2', false)
    const removed = applyScoreCommand(tied.score, remove!)
    expect(collectTiePairs(removed.score)).not.toContainEqual({
      fromEventId: 'm4-f-natural-1',
      toEventId: 'm4-f-natural-2'
    })
  })

  it('delete-event.clean-ties completes sequential input and restores compound edits with undo/redo', () => {
    let score = createScore()
    let state = createNoteInputState({
      target: inputTarget,
      tick: 0,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const createId = idSequence()

    for (const step of ['C', 'D', 'E', 'F'] as const) {
      const input = buildSequentialInput(score, state, step, createId)
      const result = applyScoreCommand(score, input!.command)
      score = result.score
      state = input!.nextState
    }

    expect(state).toMatchObject({
      target: { measureId: 'measure-2' },
      tick: 0
    })
    expect(score.parts[0].staves[0].measures).toHaveLength(2)

    const fixture = createSingleVoiceMvpScore()
    const durationCommand = buildDurationCommand(
      fixture,
      { type: 'event', eventId: 'm3-d5' },
      createDuration('quarter'),
      () => 'm3-released-rest'
    )
    const shortened = applyScoreCommand(fixture, durationCommand!)

    expect(
      locateEvent(shortened.score, 'm3-released-rest')?.event
    ).toMatchObject({
      type: 'rest',
      position: { tick: quarter },
      duration: { value: 'eighth' }
    })

    const deleteCommand = buildDeleteCommand(shortened.score, {
      type: 'event',
      eventId: 'm4-g4'
    })
    const deleted = applyScoreCommand(shortened.score, deleteCommand!)

    expect(locateEvent(deleted.score, 'm4-f-natural-2')?.event).toMatchObject({
      type: 'note',
      duration: { value: 'quarter' },
      ties: { start: true }
    })
    expect(locateEvent(deleted.score, 'm4-g4')?.event).toMatchObject({
      type: 'note',
      pitch: { step: 'F', octave: 4, alter: 0 },
      duration: { value: 'quarter' },
      ties: { stop: true }
    })
    expect(validateTieRelations(deleted.score)).toEqual([])

    const undoDelete = applyScoreCommand(deleted.score, deleted.undo)
    const undoDuration = applyScoreCommand(undoDelete.score, shortened.undo)

    expect(undoDuration.score).toEqual(fixture)
    expect(applyScoreCommand(undoDuration.score, undoDuration.undo).score)
      .toEqual(shortened.score)
  })

  it('preserves musical meaning across MusicXML export and import', () => {
    const score = createSingleVoiceMvpScore()
    const roundTrip = parseMusicXml(serializeMusicXml(score))

    expect(createScoreSemanticSnapshot(roundTrip)).toEqual(
      createScoreSemanticSnapshot(score)
    )
  })

  it('preserves the release-test score across MusicXML save and reopen', () => {
    const score = createReleaseTestScore()
    const roundTrip = parseMusicXml(serializeMusicXml(score))

    expect(createScoreSemanticSnapshot(roundTrip)).toEqual(
      createScoreSemanticSnapshot(score)
    )
  })

  it('preserves edited title and composer through undo and MusicXML', () => {
    const score = createSingleVoiceMvpScore()
    const edited = applyScoreCommand(score, {
      type: 'score-metadata.update',
      title: '새 악보 제목',
      composer: '김작곡'
    })
    const roundTrip = parseMusicXml(serializeMusicXml(edited.score))

    expect(edited.score).toMatchObject({
      title: '새 악보 제목',
      composer: '김작곡'
    })
    expect(applyScoreCommand(edited.score, edited.undo).score).toEqual(score)
    expect(roundTrip).toMatchObject({
      title: '새 악보 제목',
      composer: '김작곡'
    })
  })

  it('creates an input-ready score from new score settings', () => {
    const score = createNewScore({
      title: '현악 연습곡',
      composer: '김작곡',
      partName: 'Violin',
      partAbbreviation: 'Vln.',
      keySignature: { fifths: 2, mode: 'major' },
      timeSignature: { beats: 3, beatType: 4 },
      measureCount: 5
    })
    const part = score.parts[0]
    const measures = part.staves[0].measures

    expect(score).toMatchObject({
      title: '현악 연습곡',
      composer: '김작곡'
    })
    expect(part).toMatchObject({
      name: 'Violin',
      abbreviation: 'Vln.'
    })
    expect(measures).toHaveLength(5)
    measures.forEach((measure, index) => {
      expect(measure).toMatchObject({
        number: index + 1,
        keySignature: { fifths: 2, mode: 'major' },
        timeSignature: { beats: 3, beatType: 4 }
      })
      expect(measure.voices[0].events).toHaveLength(1)
      expect(measure.voices[0].events[0]).toMatchObject({
        type: 'rest',
        fullMeasure: true
      })
      expect(validateMeasureRhythm(measure).isExact).toBe(true)
    })
  })

  it.each([
    ['2/4', { beats: 2, beatType: 4 }, { value: 'half', dots: 0 }],
    ['3/4', { beats: 3, beatType: 4 }, { value: 'half', dots: 1 }],
    ['6/8', { beats: 6, beatType: 8 }, { value: 'half', dots: 1 }]
  ] as const)(
    '[rest-to-note.full-measure-rest] changes a %s full-measure rest to a note with the measure duration',
    (_label, timeSignature, duration) => {
      const score = createNewScore({
        title: 'Non Common Time',
        composer: 'in-C',
        partName: 'Piano',
        keySignature: { fifths: 0, mode: 'major' },
        timeSignature,
        measureCount: 1
      })
      const command = buildPitchStepCommand(
        score,
        {
          type: 'event',
          eventId: 'measure-1-full-measure-rest'
        },
        'C'
      )
      const changed = applyScoreCommand(score, command!)
      const measure = changed.score.parts[0].staves[0].measures[0]
      const event = measure.voices[0].events[0]

      expect(event).toMatchObject({
        id: 'measure-1-full-measure-rest',
        type: 'note',
        duration
      })
      expect(validateMeasureRhythm(measure).isExact).toBe(true)
    }
  )

  it('changes key signature from the selected measure while preserving pitches', () => {
    const score = createSingleVoiceMvpScore()
    const command = buildKeySignatureCommand(
      score,
      { type: 'measure', measureId: 'measure-2' },
      { fifths: 0, mode: 'major' }
    )
    const changed = applyScoreCommand(score, command!)
    const measures = changed.score.parts[0].staves[0].measures
    const measure2 = measures[1]
    const measure1 = measures[0]
    const voice2 = measure2.voices[0]
    const fSharp = voice2.events.find((event) => event.id === 'm2-7')

    expect(measure1.keySignature).toEqual({ fifths: 1, mode: 'major' })
    expect(measures.slice(1).map((measure) => measure.keySignature)).toEqual(
      Array.from({ length: 7 }, () => ({ fifths: 0, mode: 'major' }))
    )
    expect(fSharp).toMatchObject({
      type: 'note',
      pitch: { step: 'F', alter: 1 }
    })
    expect(
      fSharp?.type === 'note'
        ? resolveNotePitch(measure2, voice2, fSharp)
        : undefined
    ).toMatchObject({
      step: 'F',
      alter: 1
    })
    measures.forEach((measure) => {
      expect(validateMeasureRhythm(measure).isExact).toBe(true)
    })

    const roundTrip = parseMusicXml(serializeMusicXml(changed.score))

    expect(
      createScoreSemanticSnapshot(roundTrip).parts[0].staves[0].measures.map(
        (measure) => measure.keySignature
      )
    ).toEqual(
      createScoreSemanticSnapshot(changed.score)
        .parts[0].staves[0].measures.map((measure) => measure.keySignature)
    )
    expect(applyScoreCommand(changed.score, changed.undo).score).toEqual(score)
  })

  it('changes time signature for the selected measure and refits rests', () => {
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
                        createNote({
                          id: 'note-c4',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('quarter')
                        }),
                        createRest({
                          id: 'trailing-rest',
                          position: createTimePosition(quarter),
                          duration: createDuration('half', 1)
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
    const command = buildTimeSignatureCommand(
      score,
      { type: 'measure', measureId: 'measure-1' },
      { beats: 2, beatType: 4 }
    )
    const changed = applyScoreCommand(score, command!)
    const measure = changed.score.parts[0].staves[0].measures[0]

    expect(measure.timeSignature).toEqual({ beats: 2, beatType: 4 })
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'note-c4',
        type: 'note',
        duration: { value: 'quarter', dots: 0 }
      },
      {
        id: 'trailing-rest',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'quarter', dots: 0 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)

    const roundTrip = parseMusicXml(serializeMusicXml(changed.score))

    expect(roundTrip.parts[0].staves[0].measures[0].timeSignature).toEqual({
      beats: 2,
      beatType: 4
    })
    expect(applyScoreCommand(changed.score, changed.undo).score).toEqual(score)
  })

  it('changes an empty full-measure rest measure to the target meter', () => {
    const score = createNewScore({
      title: 'Meter Sketch',
      composer: 'in-C',
      partName: 'Piano',
      keySignature: { fifths: 0, mode: 'major' },
      timeSignature: { beats: 4, beatType: 4 },
      measureCount: 1
    })
    const command = buildTimeSignatureCommand(
      score,
      { type: 'measure', measureId: 'measure-1' },
      { beats: 6, beatType: 8 }
    )
    const changed = applyScoreCommand(score, command!)
    const measure = changed.score.parts[0].staves[0].measures[0]

    expect(measure.timeSignature).toEqual({ beats: 6, beatType: 8 })
    expect(measure.voices[0].events).toEqual([
      expect.objectContaining({
        id: 'measure-1-full-measure-rest',
        type: 'rest',
        fullMeasure: true
      })
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)

    const roundTrip = parseMusicXml(serializeMusicXml(changed.score))
    const roundTripMeasure = roundTrip.parts[0].staves[0].measures[0]

    expect(roundTripMeasure.timeSignature).toEqual({ beats: 6, beatType: 8 })
    expect(validateMeasureRhythm(roundTripMeasure).isExact).toBe(true)
  })

  it('extends a measure after a time signature change by filling clear time with rests', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  id: 'measure-1',
                  number: 1,
                  timeSignature: { beats: 2, beatType: 4 },
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'note-c4',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
                          duration: createDuration('quarter')
                        }),
                        createRest({
                          id: 'existing-rest',
                          position: createTimePosition(quarter),
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
    const command = buildTimeSignatureCommand(
      score,
      { type: 'measure', measureId: 'measure-1' },
      { beats: 4, beatType: 4 }
    )
    const changed = applyScoreCommand(score, command!)
    const measure = changed.score.parts[0].staves[0].measures[0]

    expect(measure.timeSignature).toEqual({ beats: 4, beatType: 4 })
    expect(measure.voices[0].events).toMatchObject([
      {
        id: 'note-c4',
        type: 'note',
        position: { tick: 0 },
        duration: { value: 'quarter', dots: 0 }
      },
      {
        id: 'existing-rest',
        type: 'rest',
        position: { tick: quarter },
        duration: { value: 'quarter', dots: 0 }
      },
      {
        type: 'rest',
        position: { tick: quarter * 2 },
        duration: { value: 'half', dots: 0 }
      }
    ])
    expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(applyScoreCommand(changed.score, changed.undo).score).toEqual(score)
  })

  it('rejects time signatures that cannot contain existing notes', () => {
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
                        createNote({
                          id: 'whole-c4',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 4 },
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

    expect(
      buildTimeSignatureCommand(
        score,
        { type: 'measure', measureId: 'measure-1' },
        { beats: 3, beatType: 4 }
      )
    ).toBeUndefined()
  })

  it('adds and removes an inherited measure without disturbing the fixture', () => {
    const score = createSingleVoiceMvpScore()
    const createId = (() => {
      let event = 0

      return (kind: 'event' | 'measure') =>
        kind === 'measure' ? 'measure-9-added' : `measure-9-rest-${++event}`
    })()
    const insert = buildInsertMeasureAfter(
      score,
      'measure-8',
      createId
    )!
    const inserted = applyScoreCommand(score, insert.command)

    expect(inserted.score.parts[0].staves[0].measures).toHaveLength(9)
    expect(
      inserted.score.parts[0].staves[0].measures[8]
    ).toMatchObject({
      id: 'measure-9-added',
      number: 9,
      keySignature: { fifths: 1, mode: 'major' },
      timeSignature: { beats: 4, beatType: 4 }
    })

    const remove = buildRemoveMeasure(
      inserted.score,
      'measure-9-added'
    )!
    const removed = applyScoreCommand(inserted.score, remove.command)

    expect(createScoreSemanticSnapshot(removed.score)).toEqual(
      createScoreSemanticSnapshot(score)
    )
    expect(applyScoreCommand(removed.score, removed.undo).score).toEqual(
      inserted.score
    )
    expect(applyScoreCommand(inserted.score, inserted.undo).score).toEqual(
      score
    )
  })

  it('keeps playback, tie chains, tuplets, and playhead lookup on one timeline', () => {
    const timeline = createPlaybackTimeline(createSingleVoiceMvpScore())
    const tied = timeline.events.find(
      (event) => event.eventId === 'm5-c5-tie-start'
    )
    const triplet = timeline.events.filter(
      (event) => event.measureId === 'measure-7'
    )

    expect(timeline.totalBeats).toBe(32)
    expect(tied).toMatchObject({
      startBeat: 19,
      durationBeats: 2
    })
    expect(triplet.slice(0, 3).map((event) => event.startBeat)).toEqual([
      24,
      24 + 1 / 3,
      24 + 2 / 3
    ])
    triplet.slice(0, 3).forEach((event) => {
      expect(event.durationBeats).toBeCloseTo(1 / 3)
    })
    expect(findPlaybackEvent(timeline, 19.5)?.eventId).toBe(
      'm5-c5-tie-start'
    )
    expect(findPlaybackEvent(timeline, 24.4)?.eventId).toBe(
      'm7-triplet-rest'
    )
  })

  it('wraps all events into stable desktop and minimum-width systems', () => {
    const score = createSingleVoiceMvpScore()
    const measures = score.parts[0].staves[0].measures
    const desktop = createSystemLayout(measures, 1200)
    const minimum = createSystemLayout(measures, 560)

    expect(desktop.systemCount).toBe(2)
    expect(minimum.systemCount).toBe(4)

    for (const layout of [desktop, minimum]) {
      const placementByMeasure = new Map(
        layout.placements.map((placement) => [
          placement.measure.id,
          placement
        ])
      )

      measures.forEach((measure) => {
        const placement = placementByMeasure.get(measure.id)

        expect(placement).toBeDefined()
        measure.voices[0].events.forEach((event) => {
          expect(locateEvent(score, event.id)?.measure.id).toBe(measure.id)
        })
      })

      for (let system = 0; system < layout.systemCount; system += 1) {
        const placements = layout.placements.filter(
          (placement) => placement.systemIndex === system
        )
        const last = placements.at(-1)!

        expect(placements[0].x).toBe(16)
        expect(last.x + last.width).toBeCloseTo(
          layout === desktop ? 1184 : 544
        )
      }
    }

    expect(getAdjacentEventId(score, 'm1-f-sharp-4', 1)).toBe('m2-1')
    expect(getAdjacentEventId(score, 'm8-half-rest', 1)).toBeUndefined()
  })
})

function idSequence() {
  let event = 0
  let measure = 1

  return (kind: 'event' | 'measure') =>
    kind === 'event' ? `input-${++event}` : `measure-${++measure}`
}
