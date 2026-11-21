import { expect, it } from 'vitest'
import { applyScoreCommand, createDuration, createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice, validateMeasureRhythm, TICKS_PER_QUARTER as T } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { buildTupletGroupCommand } from './editor-state'

it.each(['note', 'rest'] as const)('fills the released interval of a 2:3 group ending with %s without moving neighbors', kind => {
  const duration = { ...createDuration('eighth'), tuplet: { actualNotes: 2, normalNotes: 3 } }
  const first = createNote({ id: 'first', position: createTimePosition(T), duration, pitch: { step: 'C', octave: 4 } })
  first.articulations = ['staccato']
  const second = kind === 'rest'
    ? { ...createRest({ id: 'second', position: createTimePosition(T * 1.75), duration }), fermata: true, breathMark: 'caesura' as const }
    : createNote({ id: 'second', position: createTimePosition(T * 1.75), duration, pitch: { step: 'D', octave: 4 } })
  const before = createRest({ id: 'before', duration: createDuration('quarter') })
  const after = createNote({ id: 'after', position: createTimePosition(T * 2.5), duration: createDuration('quarter', 1), pitch: { step: 'E', octave: 4 } })
  const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [before, first, second, after], tuplets: [{ id: 'two', actualNotes: 2, normalNotes: 3, eventIds: ['first', 'second'] }] })] })] })] })], hairpins: [{ id: 'manual', startEventId: 'first', endEventId: 'second', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }] })
  const original = createNativeProject(score)
  let id = 0
  const command = buildTupletGroupCommand(score, { type: 'event', eventId: 'first' }, () => 'filler-' + ++id)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!), measure = result.score.parts[0].staves[0].measures[0]
  expect(validateMeasureRhythm(measure).isExact).toBe(true)
  expect(measure.voices[0].tuplets ?? []).toEqual([])
  const events = measure.voices[0].events
  expect(events.find(e => e.id === 'before')).toEqual(before)
  expect(events.find(e => e.id === 'after')).toEqual(after)
  expect(events.find(e => e.id === 'first')).toMatchObject({ articulations: ['staccato'], position: { tick: T }, duration: { value: 'eighth' } })
  const expectedSecond = { ...second, position: createTimePosition(T * 1.5), duration: { ...createDuration('eighth'), tuplet: undefined } }
  if (expectedSecond.type === 'rest') delete expectedSecond.fullMeasure
  expect(events.find(e => e.id === 'second')).toEqual(expectedSecond)
  expect(events.find(e => e.id === 'filler-1')).toMatchObject({ type: 'rest', position: { tick: T * 2 }, duration: { value: 'eighth' } })
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})
