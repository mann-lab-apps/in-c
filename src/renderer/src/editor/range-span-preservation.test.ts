import { expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createMeasure, createNote, createPart,
  createRest, createScore, createStaff, createTimePosition, createVoice
} from '../../../score-core'
import { createNativeProject } from '../../../project/schema'
import { buildDeleteCommand, buildRangeRestCommand, createRangeSelection } from './editor-state'

const make = () => createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
  (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
})] })] })] })] })
const events = (s: ReturnType<typeof make>) => s.parts[0].staves[0].measures[0].voices[0].events

it.each(['delete', 'rest'] as const)('range %s removes only invalidated slurs and preserves valid hairpin anchors', mode => {
  const score = make(); score.slurs = [{ id: 'affected', startEventId: 'n0', endEventId: 'n2', engraving: { offsetY: 0, height: 4 } },
    { id: 'neighbor', startEventId: 'n2', endEventId: 'n3', engraving: { offsetY: -2 } }]
  score.hairpins = [{ id: 'keep', startEventId: mode === 'delete' ? 'n0' : 'n1', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  const source = createNativeProject(score), selection = createRangeSelection(score, 'n0', 'n1')!,
    command = mode === 'delete' ? buildDeleteCommand(score, selection) : buildRangeRestCommand(score, selection)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.slurs).toEqual([score.slurs[1]])
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(() => createNativeProject(result.score)).not.toThrow()
  const undone = applyScoreCommand(result.score, result.undo)
  expect(createNativeProject(undone.score)).toEqual(source)
  expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(result.score)
})

it('rejects range compaction that would remove a surviving hairpin anchor ID', () => {
  const score = make(); score.hairpins = [{ id: 'keep', startEventId: 'n1', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  const source = createNativeProject(score), command = buildDeleteCommand(score, createRangeSelection(score, 'n0', 'n1')!)
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined(); expect(createNativeProject(score)).toEqual(source)
})

it.each(['delete', 'rest'] as const)('rejects range %s that would invalidate an octave note endpoint', mode => {
  const score = make(); score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n2' }]
  const source = createNativeProject(score), selection = createRangeSelection(score, 'n0', 'n1')!,
    command = mode === 'delete' ? buildDeleteCommand(score, selection) : buildRangeRestCommand(score, selection)
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined(); expect(createNativeProject(score)).toEqual(source)
})

it.each(['fermata', 'breath', 'span'])('range delete preserves the unselected following rest’s %s', kind => {
  const score = make(); events(score)[2] = createRest({ id: 'protected', position: createTimePosition(2 * T),
    ...(kind === 'fermata' ? { fermata: true } : kind === 'breath' ? { breathMark: 'caesura' as const } : {}) })
  if (kind === 'span') score.hairpins = [{ id: 'keep', startEventId: 'protected', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  const source = createNativeProject(score), originalRest = structuredClone(events(score)[2]), command = buildDeleteCommand(score, createRangeSelection(score, 'n0', 'n1')!)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(events(result.score).find(e => e.id === 'protected')).toEqual(originalRest)
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(source)
})

it.each(['delete', 'rest'] as const)('keeps a supported interior octave range %s', mode => {
  const score = make(); score.octaveShifts = [{ id: 'octave', type: '8va', startEventId: 'n0', endEventId: 'n3' }]
  const source = createNativeProject(score), selection = createRangeSelection(score, 'n1', 'n2')!,
    command = mode === 'delete' ? buildDeleteCommand(score, selection) : buildRangeRestCommand(score, selection)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.octaveShifts).toEqual(score.octaveShifts)
  expect(events(result.score).filter(e => e.type === 'note')).toEqual([events(score)[0], events(score)[3]])
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(source)
})

it('keeps ordinary following rest compaction for a range delete', () => {
  const score = make(); events(score)[2] = createRest({ id: 'plain', position: createTimePosition(2 * T) })
  const result = applyScoreCommand(score, buildDeleteCommand(score, createRangeSelection(score, 'n0', 'n1')!)!)
  expect(events(result.score)).toHaveLength(2)
  expect(events(result.score)[0]).toMatchObject({ id: 'n0', type: 'rest', duration: { value: 'half', dots: 1 }, position: { tick: 0 } })
  expect(() => createNativeProject(result.score)).not.toThrow()
})

it.each(['delete', 'rest'] as const)('distinguishes an explicitly selected rest marking during %s', mode => {
  const score = make(); events(score)[1] = createRest({ id: 'selected-rest', position: createTimePosition(T), fermata: true })
  const source = createNativeProject(score), selection = createRangeSelection(score, 'n0', 'selected-rest')!,
    command = mode === 'delete' ? buildDeleteCommand(score, selection) : buildRangeRestCommand(score, selection)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  if (mode === 'delete') expect(events(result.score).some(e => e.fermata)).toBe(false)
  else expect(events(result.score).find(e => e.id === 'selected-rest')).toEqual(events(score)[1])
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(source)
})
