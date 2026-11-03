import { expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, buildRhythmDeleteCommand, buildRhythmEditCommand,
  createDuration, createMeasure, createNote, createPart, createRest, createScore,
  createStaff, createTimePosition, createVoice, validateMeasureRhythm, type Score, type VoiceEvent
} from './index'
import { createNativeProject } from '../project/schema'

const note = (id: string, tick: number) => createNote({ id, position: createTimePosition(tick), pitch: { step: 'C', octave: 4 } })
const rest = (id: string, tick: number, half = false) => createRest({ id, position: createTimePosition(tick), duration: createDuration(half ? 'half' : 'quarter') })
const make = (events: VoiceEvent[]): Score => createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events })] })] })] })] })
const voice = (score: Score) => score.parts[0].staves[0].measures[0].voices[0]
const target = (score: Score) => ({ partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, measureId: score.parts[0].staves[0].measures[0].id, voiceId: voice(score).id })
const protect = (score: Score, kind: string) => {
  const event = voice(score).events.find(e => e.id === 'protected')!
  if (kind === 'fermata') event.fermata = true
  else if (kind === 'breath') event.breathMark = 'caesura'
  else score.hairpins = [{ id: 'span', type: 'crescendo', startEventId: 'protected', endEventId: 'other', engraving: { offsetY: 0, height: 4 } }]
}

it.each((['following', 'preceding'] as const).flatMap(side => ['fermata', 'breath', 'span'].map(kind => ({ side, kind }))))('deleting a note preserves the $side rest’s $kind', ({ side, kind }) => {
  const events = side === 'following' ? [note('selected', 0), rest('protected', T), note('other', 2 * T), rest('tail', 3 * T)] :
    [rest('protected', 0), note('selected', T), note('other', 2 * T), rest('tail', 3 * T)]
  const score = make(events); protect(score, kind)
  const source = createNativeProject(score), original = structuredClone(voice(score).events.find(e => e.id === 'protected')),
    command = buildRhythmDeleteCommand(score, target(score), 'selected')
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(voice(result.score).events.find(e => e.id === 'protected')).toEqual(original)
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(validateMeasureRhythm(result.score.parts[0].staves[0].measures[0]).isExact).toBe(true)
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(source)
})

it.each(['fermata', 'breath', 'span'])('does not grow a note through a protected %s rest', kind => {
  const score = kind === 'span' ? make([note('selected', 0), rest('protected', T), { ...note('other', 2 * T), duration: createDuration('half') }]) : make([note('selected', 0), rest('protected', T, true), note('other', 3 * T)]); protect(score, kind)
  const source = createNativeProject(score), original = structuredClone(score)
  const command = buildRhythmEditCommand(score, { target: target(score), eventId: 'selected',
    event: { ...note('selected', 0), duration: createDuration('half') }, createId: () => 'remainder' })
  expect(command).toBeUndefined()
  expect(score).toEqual(original); expect(createNativeProject(score)).toEqual(source)
})

it('keeps ordinary rest compaction when deleting a note', () => {
  const score = make([rest('before', 0), note('selected', T), rest('tail', 2 * T, true)]),
    result = applyScoreCommand(score, buildRhythmDeleteCommand(score, target(score), 'selected')!)
  expect(voice(result.score).events).toHaveLength(1)
  expect(voice(result.score).events[0]).toMatchObject({ id: 'before', type: 'rest', fullMeasure: true })
})

it('keeps growth and split of an ordinary following rest', () => {
  const score = make([note('selected', 0), rest('plain', T, true), note('other', 3 * T)]),
    command = buildRhythmEditCommand(score, { target: target(score), eventId: 'selected', event: { ...note('selected', 0), duration: createDuration('half') }, createId: () => 'remainder' }),
    result = applyScoreCommand(score, command!)
  expect(voice(result.score).events).toMatchObject([{ id: 'selected', duration: { value: 'half' } }, { id: 'plain', position: { tick: 2 * T }, duration: { value: 'quarter' } }, { id: 'other', position: { tick: 3 * T } }])
})

it('keeps the existing partial consumption contract when an unmarked rest endpoint survives', () => {
  const score = make([note('selected', 0), rest('protected', T, true), note('other', 3 * T)]); protect(score, 'span')
  const original = createNativeProject(score), command = buildRhythmEditCommand(score, { target: target(score), eventId: 'selected', event: { ...note('selected', 0), duration: createDuration('half') }, createId: () => 'remainder' })
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(voice(result.score).events.find(e => e.id === 'protected')).toMatchObject({ position: { tick: 2 * T }, duration: { value: 'quarter' } })
  expect(result.score.hairpins).toEqual(score.hairpins)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(original)
})
