import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { createPlaybackTimeline } from '../playback/timeline'

import {
  applyScoreCommand,
  createDuration,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createPart,
  createScore,
  createStaff,
  createVoice,
  validateMeasureRhythm
} from '../../../score-core'
import {
  buildInsertMeasureAfter,
  buildInsertMeasureBefore,
  buildRemoveMeasure,
  resolveActiveMeasureId
} from './measure-management'
import { createNoteInputState } from './note-input-state'

const inputState = createNoteInputState({
  target: {
    partId: 'part-1',
    staffId: 'staff-1',
    measureId: 'measure-2',
    voiceId: 'voice-1'
  },
  tick: 0,
  duration: createDuration('quarter'),
  mode: 'note'
})

describe('measure management', () => {
  it.each([1, 2, 3, 4])('shrinks a volta when its boundary measure %i is deleted', index => {
    const score = createVoltaEnsemble()
    const selected = score.parts[1]!.staves[0]!.measures[index]!
    const result = applyScoreCommand(score, buildRemoveMeasure(score, selected.id)!.command)
    const primary = result.score.parts[0]!.staves[0]!.measures
    const remainingNumber = index < 3 ? 1 : 2
    const remainingId = `p0-m${index === 1 ? 2 : index === 2 ? 1 : index === 3 ? 4 : 3}`
    expect(primary.find(measure => measure.id === remainingId)?.volta).toEqual({ number: remainingNumber, start: true, end: true })
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(reopened.parts[0]!.staves[0]!.measures.map(measure => measure.volta)).toEqual(primary.map(measure => measure.volta))
    expect(createPlaybackTimeline(reopened).totalBeats).toBe(createPlaybackTimeline(result.score).totalBeats)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it.each([1, 2, 3, 4])('inserting before volta boundary %i preserves ending coverage and addresses', index => {
    const score = createVoltaEnsemble()
    const selected = score.parts[1]!.staves[0]!.measures[index]!
    let id = 0
    const edit = buildInsertMeasureBefore(score, selected.id, kind => `volta-${kind}-${++id}`)!
    const result = applyScoreCommand(score, edit.command)
    const timeline = createPlaybackTimeline(result.score)
    // Before a start: outside the bracket. Before an end: inside it.
    expect(timeline.totalBeats).toBe([0, 32, 28, 28, 28][index])
    expect(timeline.events.filter(event => event.partId === 'p0').map(event => event.startBeat))
      .toEqual(timeline.events.filter(event => event.partId === 'p1').map(event => event.startBeat))
    expect(createPlaybackTimeline(parseMusicXml(serializeMusicXml(result.score))).totalBeats).toBe(timeline.totalBeats)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('inserts before a signature boundary without moving that boundary earlier', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    for (const part of score.parts) for (const staff of part.staves) {
      const changed = staff.measures[1]!
      changed.keySignature = { fifths: -3, mode: 'minor' }
      changed.timeSignature = { beats: 3, beatType: 4 }
      changed.clef = { sign: 'C', line: 3 }
      changed.transposition = { diatonic: -4, chromatic: -7 }
      changed.voices = changed.voices.map(voice => createVoice({ id: voice.id, events: [createFullMeasureRest({ id: `${staff.id}-${voice.id}-boundary-rest` })] }))
    }
    score.hairpins = []
    score.slurs = []
    const selected = score.parts[1]!.staves[0]!.measures[1]!
    let nextId = 0
    const state = { ...inputState, target: { partId: 'P2', staffId: 'P2-staff-1', measureId: selected.id, voiceId: selected.voices[1]!.id } }
    const edit = buildInsertMeasureBefore(score, selected.id, kind => `boundary-${kind}-${++nextId}`, state)!
    const result = applyScoreCommand(score, edit.command)
    for (const part of result.score.parts) for (const staff of part.staves) {
      expect(staff.measures[1]).toMatchObject({ clef: staff.measures[0]!.clef, keySignature: staff.measures[0]!.keySignature, timeSignature: staff.measures[0]!.timeSignature, transposition: staff.measures[0]!.transposition })
      expect(staff.measures[2]!.timeSignature).toEqual({ beats: 3, beatType: 4 })
      expect(validateMeasureRhythm(staff.measures[1]!).isExact).toBe(true)
    }
    expect(edit.inputState?.target.voiceId).toBe(selected.voices[1]!.id)
    expect(edit.selection.address?.voiceId).toBe(selected.voices[1]!.id)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(reopened.parts[1]!.staves[0]!.measures.map(measure => measure.timeSignature.beats)).toEqual([4, 4, 3])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    expect(applyScoreCommand(applyScoreCommand(result.score, result.undo).score, edit.command).score).toEqual(result.score)
  })

  it.each([
    ['before', 0, 20], ['after', 0, 24], ['before', 1, 24], ['after', 1, 20],
    ['remove', 0, 8], ['remove', 1, 4]
  ] as const)('keeps repeat barlines on surviving measures: %s at %i', (action, index, totalBeats) => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    const measure = score.parts[1]!.staves[1]!.measures[index]!
    let id = 0
    const edit = action === 'remove' ? buildRemoveMeasure(score, measure.id)!
      : (action === 'before' ? buildInsertMeasureBefore : buildInsertMeasureAfter)(score, measure.id, kind => `repeat-${kind}-${++id}`)!
    const result = applyScoreCommand(score, edit.command)
    expect(createPlaybackTimeline(result.score).totalBeats).toBe(totalBeats)
    expect(createPlaybackTimeline(parseMusicXml(serializeMusicXml(result.score))).totalBeats).toBe(totalBeats)
    expect(() => createNativeProject(result.score)).not.toThrow()
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    for (const part of result.score.parts) for (const staff of part.staves) {
      for (const retained of staff.measures.filter(measure => !measure.id.startsWith('repeat-'))) {
        const original = score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures)).find(measure => measure.id === retained.id)!
        expect(retained.repeat).toEqual(original.repeat)
      }
    }
  })

  it.each(['before', 'after', 'remove'] as const)('edits %s the selected lower-staff measure across the score with valid markings and undo', action => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8'))
    const part = score.parts[1]!
    const staff = part.staves[1]!
    const selected = staff.measures[1]!
    const state = { ...inputState, target: { partId: part.id, staffId: staff.id, measureId: selected.id, voiceId: selected.voices[0]!.id } }
    let id = 0
    const createId = (kind: 'event' | 'measure') => `inserted-${kind}-${++id}`
    const edit = action === 'remove'
      ? buildRemoveMeasure(score, selected.id, state)!
      : (action === 'before' ? buildInsertMeasureBefore : buildInsertMeasureAfter)(score, selected.id, createId, state)!
    const result = applyScoreCommand(score, edit.command)
    const expectedLength = action === 'remove' ? 1 : 3
    expect(result.score.parts.flatMap(part => part.staves.map(staff => staff.measures.length))).toEqual([expectedLength, expectedLength, expectedLength])
    expect(edit.inputState?.target).toMatchObject({ partId: part.id, staffId: staff.id })
    expect(edit.selection.address).toMatchObject({ partId: part.id, staffId: staff.id })
    expect(() => createNativeProject(result.score)).not.toThrow()
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(reopened.parts.flatMap(part => part.staves.map(staff => staff.measures.length))).toEqual([expectedLength, expectedLength, expectedLength])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    if (action === 'remove') {
      expect(result.score.hairpins ?? []).toHaveLength(0)
      expect(result.score.slurs ?? []).toHaveLength(0)
      expect(result.score.tempoEvents ?? []).toHaveLength(0)
    } else if (action === 'before') {
      expect(result.score.tempoEvents?.[0]?.measureId).toBe('measure-3')
    }
  })

  it('adds an inherited empty measure after the active measure', () => {
    const score = createThreeMeasureScore()
    const edit = buildInsertMeasureAfter(
      score,
      'measure-2',
      idSequence(),
      inputState
    )
    const result = applyScoreCommand(score, edit!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(measures.map((measure) => measure.id)).toEqual([
      'measure-1',
      'measure-2',
      'measure-new',
      'measure-3'
    ])
    expect(measures.map((measure) => measure.number)).toEqual([1, 2, 3, 4])
    expect(measures[2]).toMatchObject({
      clef: measures[1].clef,
      keySignature: measures[1].keySignature,
      timeSignature: measures[1].timeSignature
    })
    expect(validateMeasureRhythm(measures[2]).isExact).toBe(true)
    expect(edit!.selection).toEqual({
      type: 'event',
      eventId: 'event-new',
      address: { partId: 'part-1', staffId: 'staff-1', measureId: 'measure-new', voiceId: 'voice-1' }
    })
    expect(edit!.inputState?.target.measureId).toBe('measure-new')
  })

  it('adds an inherited empty measure before the active measure', () => {
    const score = createThreeMeasureScore()
    const edit = buildInsertMeasureBefore(
      score,
      'measure-2',
      idSequence(),
      inputState
    )
    const result = applyScoreCommand(score, edit!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(measures.map((measure) => measure.id)).toEqual([
      'measure-1',
      'measure-new',
      'measure-2',
      'measure-3'
    ])
    expect(measures.map((measure) => measure.number)).toEqual([1, 2, 3, 4])
    expect(measures[1]).toMatchObject({
      clef: measures[2].clef,
      keySignature: measures[2].keySignature,
      timeSignature: measures[2].timeSignature
    })
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(edit!.selection).toEqual({
      type: 'event',
      eventId: 'event-new',
      address: { partId: 'part-1', staffId: 'staff-1', measureId: 'measure-new', voiceId: 'voice-1' }
    })
    expect(edit!.inputState?.target.measureId).toBe('measure-new')
  })

  it('moves selection and input state to the next measure after deletion', () => {
    const score = createThreeMeasureScore()
    const edit = buildRemoveMeasure(score, 'measure-2', inputState)
    const result = applyScoreCommand(score, edit!.command)

    expect(result.score.parts[0].staves[0].measures.map((measure) => measure.id)).toEqual([
      'measure-1',
      'measure-3'
    ])
    expect(edit!.selection).toEqual({
      type: 'measure',
      measureId: 'measure-3',
      address: { partId: 'part-1', staffId: 'staff-1', measureId: 'measure-3', voiceId: 'voice-1' }
    })
    expect(edit!.inputState).toMatchObject({
      target: {
        measureId: 'measure-3'
      },
      tick: 0
    })
  })

  it('falls back to the previous measure when deleting the last measure', () => {
    const score = createThreeMeasureScore()
    const edit = buildRemoveMeasure(score, 'measure-3', {
      ...inputState,
      target: {
        ...inputState.target,
        measureId: 'measure-3'
      }
    })

    expect(edit!.selection).toEqual({
      type: 'measure',
      measureId: 'measure-2',
      address: { partId: 'part-1', staffId: 'staff-1', measureId: 'measure-2', voiceId: 'voice-1' }
    })
    expect(edit!.inputState?.target.measureId).toBe('measure-2')
  })

  it('does not build a command that removes the only measure', () => {
    expect(buildRemoveMeasure(createScore(), 'measure-1')).toBeUndefined()
  })

  it('rejects unaligned imported staves without partially changing the score', () => {
    const score = createThreeMeasureScore()
    score.parts.push(createPart({ id: 'short-part', staves: [createStaff({ id: 'short-staff' })] }))
    const before = structuredClone(score)
    expect(buildInsertMeasureBefore(score, 'measure-2', idSequence())).toBeUndefined()
    expect(buildRemoveMeasure(score, 'measure-2')).toBeUndefined()
    expect(score).toEqual(before)
  })

  it('resolves the active measure from input state before selection', () => {
    expect(
      resolveActiveMeasureId(
        createThreeMeasureScore(),
        {
          type: 'measure',
          measureId: 'measure-1'
        },
        inputState
      )
    ).toBe('measure-2')
  })
})

function createThreeMeasureScore() {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [1, 2, 3].map((number) =>
              createMeasure({
                id: `measure-${number}`,
                number,
                voices: [
                  createVoice({
                    id: 'voice-1'
                  })
                ]
              })
            )
          })
        ]
      })
    ]
  })
}

function idSequence() {
  return (kind: 'event' | 'measure') =>
    kind === 'measure' ? 'measure-new' : 'event-new'
}

function createVoltaEnsemble() {
  return createScore({ parts: [0, 1].map(partIndex => createPart({ id: `p${partIndex}`, staves: [createStaff({
    id: `s${partIndex}`, measures: [0, 1, 2, 3, 4].map(index => createMeasure({
      id: `p${partIndex}-m${index}`, number: index + 1,
      repeat: partIndex === 0 ? index === 0 ? { start: true } : index === 2 ? { end: true, times: 2 } : undefined : undefined,
      volta: partIndex === 0 && index > 0 ? { number: index < 3 ? 1 : 2, start: index === 1 || index === 3 || undefined, end: index === 2 || index === 4 || undefined } : undefined,
      voices: [createVoice({ id: 'voice-1', events: [createNote({ id: `p${partIndex}-e${index}`, pitch: { step: 'C', octave: 4 }, duration: createDuration('whole') })] })]
    }))
  })] })) })
}
