import { expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, buildRhythmDeleteCommand, buildRhythmEditCommand,
  createDuration, createMeasure, createNote, createPart, createRest, createScore,
  createStaff, createTimePosition, createVoice, type Score
} from './index'
import { createNativeProject } from '../project/schema'

const make = (): Score => createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
  (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
})] })] })] })] })
const target = (s: Score) => ({ partId: s.parts[0].id, staffId: s.parts[0].staves[0].id, measureId: s.parts[0].staves[0].measures[0].id, voiceId: s.parts[0].staves[0].measures[0].voices[0].id })
const events = (s: Score) => s.parts[0].staves[0].measures[0].voices[0].events

it.each(['n0', 'n2', 'n1'])('deleting %s removes only invalidated slurs in one exact undo', id => {
  const score = make(); score.slurs = [{ id: 'main', startEventId: 'n0', endEventId: 'n2', engraving: { offsetY: 0, height: 4 } },
    { id: 'neighbor', startEventId: 'n1', endEventId: 'n3', engraving: { offsetY: -2 } }]
  score.hairpins = [{ id: 'rest-supported', type: 'crescendo', startEventId: 'n0', endEventId: 'n3', engraving: { offsetY: 0, height: 4 } }]
  const original = createNativeProject(score), before = structuredClone(score), command = buildRhythmDeleteCommand(score, target(score), id)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.slurs).toEqual(score.slurs.filter(s => s.startEventId !== id && s.endEventId !== id))
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(events(result.score).find(e => e.id === id)?.type).toBe('rest')
  expect(() => createNativeProject(result.score)).not.toThrow()
  const undone = applyScoreCommand(result.score, result.undo)
  expect(createNativeProject(undone.score)).toEqual(original)
  expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(result.score)
  expect(score).toEqual(before)
})

it('keeps cross-measure tie normalization and slur cleanup in the same delete transaction', () => {
  const score = make(), staff = score.parts[0].staves[0]
  staff.measures[0].voices[0].events = [createNote({ id: 'start', duration: createDuration('whole'), pitch: { step: 'C', octave: 4 }, ties: { start: true } })]
  staff.measures.push(createMeasure({ id: 'second', number: 2, voices: [createVoice({ events: [createNote({ id: 'stop', duration: createDuration('whole'), pitch: { step: 'C', octave: 4 }, ties: { stop: true } })] })] }))
  score.slurs = [{ id: 'tie-slur', startEventId: 'start', endEventId: 'stop', engraving: { offsetY: 0, height: 4 } }]
  const original = createNativeProject(score), command = buildRhythmDeleteCommand(score, target(score), 'start')
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.slurs).toEqual([])
  const second = result.score.parts[0].staves[0].measures[1].voices[0].events[0]
  expect(second.type === 'note' && second.ties?.stop).toBeFalsy()
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})

it.each([
  { type: '8va', id: 'n0', rest: false }, { type: '8vb', id: 'n2', rest: false },
  { type: '15ma', id: 'n0', rest: true }, { type: '15mb', id: 'n2', rest: true }
] as const)('preserves $type when its $id endpoint would become a rest (convert: $rest)', ({ type, id, rest }) => {
  const score = make(); score.octaveShifts = [{ id: 'octave', type, startEventId: 'n0', endEventId: 'n2' }]
  const original = createNativeProject(score), event = events(score).find(e => e.id === id)!, command = rest ?
    buildRhythmEditCommand(score, { target: target(score), eventId: id, event: createRest({ id, position: event.position, duration: event.duration }), createId: () => 'unused' }) :
    buildRhythmDeleteCommand(score, target(score), id)
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined()
  expect(createNativeProject(score)).toEqual(original)
})

it('keeps deleting an interior octave note without changing its neighbours or octave meaning', () => {
  const score = make(); score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  const original = createNativeProject(score), command = buildRhythmDeleteCommand(score, target(score), 'n1')
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.octaveShifts).toEqual(score.octaveShifts)
  expect(events(result.score).filter(e => e.type === 'note')).toEqual(events(score).filter(e => e.id !== 'n1'))
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})

it('keeps a valid octave endpoint note when only its duration grows', () => {
  const score = make(); events(score)[1] = createRest({ id: 'plain', position: createTimePosition(T) }); events(score)[2].duration = createDuration('half'); events(score).pop()
  score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  const original = createNativeProject(score), command = buildRhythmEditCommand(score, { target: target(score), eventId: 'n0', event: { ...events(score)[0], duration: createDuration('half') }, createId: () => 'unused' })
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.octaveShifts).toEqual(score.octaveShifts)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})
