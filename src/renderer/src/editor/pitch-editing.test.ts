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
  pitchToMidi
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import partFixture from '../../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { locateEvent } from './editor-state'
import {
  buildAccidentalCommand,
  buildEnharmonicRespellCommand,
  buildPitchMovementCommand,
  buildPitchStepCommand
} from './pitch-editing'

describe('pitch editing commands', () => {
  it.each([
    { movement: 'octave', direction: 1, pitches: [{ step: 'C', octave: 8 }, { step: 'E', octave: 9 }] },
    { movement: 'diatonic', direction: 1, pitches: [{ step: 'C', octave: 4 }, { step: 'B', octave: 9 }] },
    { movement: 'diatonic', direction: -1, pitches: [{ step: 'C', octave: -1 }, { step: 'E', octave: 0 }] },
    { movement: 'chromatic', direction: 1, pitches: [{ step: 'C', octave: 4 }, { step: 'E', octave: 4, alter: 2 }] }
  ] as const)('chord.pitch-movement rejects an unpersistable member atomically: $movement $direction', ({ movement, direction, pitches }) => {
    const event = createNote({ id: 'bounded-chord', pitch: pitches[0], pitches: [...pitches], duration: createDuration('whole') })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [event] })] })] })] })] })
    const before = structuredClone(score)
    expect(buildPitchMovementCommand(score, { type: 'event', eventId: event.id }, movement, direction)).toBeUndefined()
    expect(score).toEqual(before)
  })
  it.each([
    ['diatonic', ['D', 'F'], [4, 4], [0, 0]],
    ['chromatic', ['C', 'E'], [4, 4], [1, 1]],
    ['octave', ['C', 'E'], [5, 5], [0, 0]]
  ] as const)('chord.pitch-movement %s keeps the visible/playback/XML vector and primary pitch in sync with exact undo', (movement, steps, octaves, alters) => {
    const score = parseMusicXml(partFixture), before = structuredClone(score)
    const part = score.parts[1]!, staff = part.staves[0]!, measure = staff.measures[0]!, voice = measure.voices[0]!, event = voice.events[0]!
    const address = { partId: part.id, staffId: staff.id, measureId: measure.id, voiceId: voice.id }
    const command = buildPitchMovementCommand(score, { type: 'event', eventId: event.id, address }, movement, 1)!
    const result = applyScoreCommand(score, command)
    const note = locateEvent(result.score, event.id, address)!.event
    expect(note.type).toBe('note')
    if (note.type !== 'note') throw Error('Lost chord')
    expect(note.pitches?.map(pitch => pitch.step)).toEqual(steps)
    expect(note.pitches?.map(pitch => pitch.octave)).toEqual(octaves)
    expect(note.pitches?.map(pitch => pitch.alter ?? 0)).toEqual(alters)
    expect(note.pitch).toEqual(note.pitches![0])
    expect(result.score.parts[0]).toEqual(score.parts[0])
    expect(result.score.slurs).toEqual(score.slurs)
    expect(note.lyrics).toEqual(event.type === 'note' ? event.lyrics : undefined)
    const roundTrip = parseMusicXml(serializeMusicXml(result.score))
    const reopened = locateEvent(roundTrip, event.id, address)!.event
    expect(reopened.type === 'note' ? reopened.pitches : undefined).toEqual(note.pitches)
    const played = createPlaybackTimeline(result.score).events.find(candidate => candidate.eventId === event.id)!
    expect(played.frequencies).toHaveLength(2)
    const midi = Array.from(serializeMidi(result.score))
    for (const pitch of note.pitches!) expect(midi.some((byte, index) => byte === 0x91 && midi[index + 1] === pitchToMidi(pitch))).toBe(true)
    note.pitches!.forEach((pitch, index) => expect(played.frequencies![index]).toBeCloseTo(440 * 2 ** ((pitchToMidi(pitch) - 69) / 12)))
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })
  it.each(['accidental', 'enharmonic'] as const)('chord.spelling %s updates the existing vector atomically and preserves non-pitch data', operation => {
    const score = parseMusicXml(partFixture)
    const part = score.parts[1]!, staff = part.staves[0]!, measure = staff.measures[0]!, voice = measure.voices[0]!, event = voice.events[0]!
    if (event.type !== 'note' || !event.pitches) throw Error('Expected imported chord')
    if (operation === 'enharmonic') {
      event.pitches = event.pitches.map(pitch => ({ ...pitch, alter: 1 }))
      event.pitch = event.pitches[0]!
    }
    const before = structuredClone(score), address = { partId: part.id, staffId: staff.id, measureId: measure.id, voiceId: voice.id }
    const selection = { type: 'event' as const, eventId: event.id, address }
    const command = operation === 'accidental' ? buildAccidentalCommand(score, selection, 1) : buildEnharmonicRespellCommand(score, selection)
    const result = applyScoreCommand(score, command!)
    const actual = locateEvent(result.score, event.id, address)!.event
    const pitches = operation === 'accidental' ? [{ step: 'C', octave: 4, alter: 1 }, { step: 'E', octave: 4, alter: 1 }] : [{ step: 'D', octave: 4, alter: -1 }, { step: 'F', octave: 4, alter: 0 }]
    expect(actual).toEqual({ ...event, pitch: pitches[0], pitches })
    const expected = structuredClone(before); expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0] = { ...event, pitch: pitches[0]!, pitches } as typeof event
    expect(result.score).toEqual(expected)
    const reopened = parseMusicXml(serializeMusicXml(result.score))
    expect(locateEvent(reopened, event.id, address)!.event).toMatchObject({ pitch: pitches[0], pitches })
    if (operation === 'enharmonic') {
      expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
      expect(createPlaybackTimeline(result.score)).toEqual(createPlaybackTimeline(before))
    }
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })

  it.each(['single-note', 'chord-to-single', 'rest'] as const)('pitch.letter-replacement %s retains non-pitch attachments and exact undo', kind => {
    const score = parseMusicXml(partFixture), part = score.parts[1]!, staff = part.staves[0]!, measure = staff.measures[0]!, voice = measure.voices[0]!
    const old = voice.events[0]!
    if (old.type !== 'note') throw Error('Expected fixture note')
    if (kind === 'single-note') delete old.pitches
    old.fermata = true; old.breathMark = 'caesura'; old.tremolo = { type: 'single', marks: 2 }
    old.graceNotes = [{ pitch: { step: 'D', octave: 4, alter: 0 }, slash: true }]
    old.ornaments = ['trill']; old.lyrics = [{ number: 1, text: '음높이만', syllabic: 'single' }]
    if (kind === 'rest') voice.events[0] = { type: 'rest', id: old.id, position: old.position, duration: old.duration, fullMeasure: true, fermata: true, breathMark: 'breath' }
    const original = voice.events[0]!, before = structuredClone(score), address = { partId: part.id, staffId: staff.id, measureId: measure.id, voiceId: voice.id }
    const command = buildPitchStepCommand(score, { type: 'event', eventId: original.id, address }, 'D')!
    const result = applyScoreCommand(score, command), after = locateEvent(result.score, original.id, address)!.event
    const metadata = { ...original } as Record<string, unknown>; delete metadata.pitches; delete metadata.fullMeasure
    const expected = { ...metadata, type: 'note', pitch: { step: 'D', octave: 4, alter: 0 } }
    expect(after).toEqual(expected)
    expect(locateEvent(parseMusicXml(serializeMusicXml(result.score)), original.id, address)!.event).toEqual(expected)
    expect(result.score.parts[0]).toEqual(before.parts[0]); expect(result.score.slurs).toEqual(before.slurs)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(before); expect(score).toEqual(before)
  })
  it.each([
    [{ step: 'B', octave: 9 }, 'C'], [{ step: 'C', octave: -1 }, 'B']
  ] as const)('pitch.letter-replacement refuses outside-native octave from %o to %s', (pitch, step) => {
    const note = createNote({ id: 'bounded-letter', pitch, duration: createDuration('whole') })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [note] })] })] })] })] })
    const before = structuredClone(score)
    expect(buildPitchStepCommand(score, { type: 'event', eventId: note.id }, step)).toBeUndefined()
    expect(score).toEqual(before)
  })

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

  it('respells the selected note enharmonically without changing the sounding pitch', () => {
    const selection = {
      type: 'event' as const,
      eventId: 'note-f-sharp-4'
    }
    const before = locateEvent(demoScore, selection.eventId)?.event
    const command = buildEnharmonicRespellCommand(demoScore, selection)
    const result = applyScoreCommand(demoScore, command!)
    const after = locateEvent(result.score, selection.eventId)?.event

    expect(after).toMatchObject({
      type: 'note',
      pitch: { step: 'G', octave: 4, alter: -1 }
    })
    expect(before?.type).toBe('note')
    expect(after?.type).toBe('note')
    if (before?.type === 'note' && after?.type === 'note') {
      expect(pitchToMidi(after.pitch)).toBe(pitchToMidi(before.pitch))
    }
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(demoScore)
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
