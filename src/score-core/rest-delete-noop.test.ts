import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER as T, applyScoreCommand, buildRhythmDeleteCommand, createFullMeasureRest, createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'

const make = (full = true) => createScore({ parts: [createPart({ id: 'p', staves: [createStaff({ id: 's', measures: [createMeasure({ id: 'm', voices: [createVoice({ id: 'v', events: full ? [createFullMeasureRest({ id: 'target' })] : [createNote({ id: 'n0', pitch: { step: 'C', octave: 4 } }), createRest({ id: 'target', position: createTimePosition(T) }), createNote({ id: 'n2', position: createTimePosition(2 * T), pitch: { step: 'E', octave: 4 } }), createNote({ id: 'n3', position: createTimePosition(3 * T), pitch: { step: 'F', octave: 4 } })] })] })] })] })] })
const target = { partId: 'p', staffId: 's', measureId: 'm', voiceId: 'v' }
const events = (s: ReturnType<typeof make>) => s.parts[0].staves[0].measures[0].voices[0].events
const native = (s: ReturnType<typeof make>) => decodeNativeProject(encodeNativeProject(createNativeProject(s))).score

it.each(['factory', 'native', 'reordered'] as const)('does not manufacture a full-rest Delete command for %s key order', mode => {
  const score = mode === 'native' ? native(make()) : make()
  if (mode === 'reordered') events(score)[0] = { fullMeasure: true, duration: { dots: 0, value: 'whole' }, position: { tick: 0 }, id: 'target', type: 'rest' }
  const before = structuredClone(score)
  expect(buildRhythmDeleteCommand(score, target, 'target')).toBeUndefined()
  expect(score).toEqual(before)
})
it.each(['factory', 'native'] as const)('does not manufacture an isolated quarter-rest Delete command for %s key order', mode => {
  const score = mode === 'native' ? native(make(false)) : make(false), before = structuredClone(score)
  expect(buildRhythmDeleteCommand(score, target, 'target')).toBeUndefined()
  expect(score).toEqual(before)
})
it.each(['marking', 'adjacent'] as const)('keeps the real %s rest Delete edit and its undo', mode => {
  const score = native(make(false))
  if (mode === 'marking') events(score)[1].fermata = true
  else events(score)[2] = createRest({ id: 'n2', position: createTimePosition(2 * T) })
  const before = createNativeProject(score), command = buildRhythmDeleteCommand(score, target, 'target')
  expect(command).toBeDefined(); const result = applyScoreCommand(score, command!)
  expect(createNativeProject(result.score)).not.toEqual(before)
  if (mode === 'marking') expect(events(result.score)[1].fermata).toBeUndefined()
  else expect(events(result.score)[1].duration).toEqual({ value: 'half', dots: 0 })
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(before)
})
