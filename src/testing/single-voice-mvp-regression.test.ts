import { describe, expect, it } from 'vitest'

import { parseMusicXml, serializeMusicXml } from '../musicxml'
import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createDuration,
  createScore,
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

  it('completes sequential input and restores compound edits with undo/redo', () => {
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
