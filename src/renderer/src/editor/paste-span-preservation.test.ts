import { expect, it } from 'vitest'
import { TICKS_PER_QUARTER as T, applyScoreCommand, createMeasure, createNote, createPart, createRest, createScore, createStaff, createTimePosition, createVoice } from '../../../score-core'
import { createNativeProject } from '../../../project/schema'
import { buildRangeClipboard, buildRangePasteCommand, createRangeSelection } from './editor-state'

const make = () => createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events:
  (['C', 'D', 'E', 'F'] as const).map((step, i) => createNote({ id: `n${i}`, position: createTimePosition(i * T), pitch: { step, octave: 4 } }))
})] })] })] })] })
const events = (s: ReturnType<typeof make>) => s.parts[0].staves[0].measures[0].voices[0].events

it.each(['single', 'range', 'rest'] as const)('cleans only invalidated slur endpoints during %s paste', mode => {
  const score = make()
  if (mode === 'rest') events(score)[0] = createRest({ id: 'n0', position: createTimePosition(0) })
  score.slurs = [{ id: 'affected', startEventId: 'n2', endEventId: 'n3', engraving: { offsetY: 0, height: 4 } }]
  if (mode !== 'rest') score.slurs.push({ id: 'neighbor', startEventId: 'n0', endEventId: 'n1', engraving: { offsetY: -2 } })
  const original = createNativeProject(score), clipboard = buildRangeClipboard(score, mode === 'range' ? createRangeSelection(score, 'n0', 'n1')! : { type: 'event', eventId: 'n0' })!
  let id = 0
  const command = buildRangePasteCommand(score, mode === 'range' ? createRangeSelection(score, 'n2', 'n3')! : { type: 'event', eventId: 'n2' }, clipboard, () => `pasted-${++id}`)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(result.score.slurs).toEqual(mode === 'rest' ? [] : [score.slurs[1]])
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
  expect(createNativeProject(score)).toEqual(original)
})

it.each(['note', 'rest'] as const)('rejects a paste that removes the ID of a %s hairpin endpoint', mode => {
  const score = make()
  if (mode === 'rest') events(score)[2] = createRest({ id: 'n2', position: createTimePosition(2 * T) })
  score.hairpins = [{ id: 'keep', startEventId: 'n2', endEventId: 'n3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  const original = createNativeProject(score), clipboard = buildRangeClipboard(score, { type: 'event', eventId: 'n0' })!
  const command = buildRangePasteCommand(score, { type: 'event', eventId: 'n2' }, clipboard, () => 'pasted')
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined(); expect(createNativeProject(score)).toEqual(original)
})

it.each(['8va', '8vb', '15ma', '15mb'] as const)('rejects a paste that removes a %s endpoint without rewriting source pitches', type => {
  const score = make(); score.octaveShifts = [{ id: 'keep', type, startEventId: 'n2', endEventId: 'n3' }]
  const original = createNativeProject(score), clipboard = buildRangeClipboard(score, { type: 'event', eventId: 'n0' })!
  const command = buildRangePasteCommand(score, { type: 'event', eventId: 'n2' }, clipboard, () => 'pasted')
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined(); expect(createNativeProject(score)).toEqual(original)
})

it.each(['hairpin', 'octave'] as const)('does not block an unrelated source %s during ordinary destination paste', kind => {
  const score = make()
  if (kind === 'hairpin') score.hairpins = [{ id: 'source-span', type: 'crescendo', startEventId: 'n0', endEventId: 'n1', engraving: { offsetY: 0 } }]
  else score.octaveShifts = [{ id: 'source-span', type: '8va', startEventId: 'n0', endEventId: 'n1' }]
  const original = createNativeProject(score), clipboard = buildRangeClipboard(score, { type: 'event', eventId: 'n0' })!, command = buildRangePasteCommand(score, { type: 'event', eventId: 'n2' }, clipboard, () => 'pasted')!
  expect(command).toBeDefined(); const result = applyScoreCommand(score, command)
  expect(result.score.hairpins).toEqual(score.hairpins); expect(result.score.octaveShifts).toEqual(score.octaveShifts)
  expect(events(result.score)[2]).toMatchObject({ id: 'pasted', pitch: { step: 'C', octave: 4 } })
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})
