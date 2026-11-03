import { expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createMeasure, createNote,
  createPart, createRest, createScore, createStaff, createTimePosition, createVoice, type VoiceEvent
} from '../../../score-core'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { buildTupletGroupCommand } from './editor-state'

const rest = (id: string, tick: number, half = false) => createRest({ id,
  position: createTimePosition(tick), duration: createDuration(half ? 'half' : 'quarter') })
let generated = 0
const nextId = () => `generated-${++generated}`
const note = (id: string, tick: number) => createNote({ id,
  position: createTimePosition(tick), pitch: { step: 'C', octave: 4 } })
const make = (mode: 'create' | 'expand' | 'compact') => {
  const start = mode === 'compact' ? 2 * T : 0
  let events: VoiceEvent[]
  if (mode === 'create') events = [note('member', 0), rest('protected', T), rest('tail', 2 * T, true)]
  else {
    const members = [note('member', start), mode === 'expand' ? note('slot-1', start + T * 2 / 3) : rest('slot-1', start + T * 2 / 3),
      mode === 'expand' ? note('slot-2', start + T * 4 / 3) : rest('protected', start + T * 4 / 3)]
    for (const event of members) event.duration = { ...event.duration, tuplet: { actualNotes: 3, normalNotes: 2 } }
    events = mode === 'expand' ? [...members, rest('protected', 2 * T), rest('tail', 3 * T)] : [rest('before', 0, true), ...members]
  }
  return createScore({ hairpins: [{ id: 'span', startEventId: 'member', endEventId: 'protected', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }],
    parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events,
      ...(mode !== 'create' ? { tuplets: [{ id: 'group', actualNotes: 3, normalNotes: 2, eventIds: events.filter(e => e.duration.tuplet).map(e => e.id) }] } : {})
    })] })] })] })] })
}

it.each(['create', 'expand', 'compact'] as const)('rejects a %s command that would destroy a hairpin endpoint and invalidate Native', mode => {
  const score = make(mode), source = createNativeProject(score), before = structuredClone(score),
    command = buildTupletGroupCommand(score, { type: 'event', eventId: 'member' }, nextId)
  if (command) expect(() => createNativeProject(applyScoreCommand(score, command).score)).not.toThrow()
  expect(command).toBeUndefined()
  expect(score).toEqual(before)
  expect(decodeNativeProject(encodeNativeProject(source))).toEqual(source)
})

it.each(['hairpin', 'slur', 'octave'] as const)('keeps a surviving %s endpoint and its existing manual settings', kind => {
  const score = make('create'), v = score.parts[0].staves[0].measures[0].voices[0]
  v.events[1] = note('protected', T)
  if (kind === 'slur') { score.slurs = [{ id: 'slur', startEventId: 'member', endEventId: 'protected', engraving: { offsetY: 0, height: 4 } }]; score.hairpins = undefined }
  if (kind === 'octave') { score.octaveShifts = [{ id: 'octave', startEventId: 'member', endEventId: 'protected', type: '8va' }]; score.hairpins = undefined }
  const source = createNativeProject(score), command = buildTupletGroupCommand(score, { type: 'event', eventId: 'member' }, nextId)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(result.score.hairpins).toEqual(score.hairpins); expect(result.score.slurs).toEqual(score.slurs); expect(result.score.octaveShifts).toEqual(score.octaveShifts)
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(source)
})

it('does not treat a different part’s endpoints as removed from the edited voice', () => {
  const score = make('create')
  score.parts.push(createPart({ id: 'other-part', staves: [createStaff({ id: 'other-staff', measures: [createMeasure({ id: 'other-measure', voices: [createVoice({ events: [note('other-start', 0),
    { ...rest('other-end', T), duration: createDuration('half', 1) }] })] })] })] }))
  score.hairpins![0].startEventId = 'other-start'; score.hairpins![0].endEventId = 'other-end'
  const source = createNativeProject(score), command = buildTupletGroupCommand(score, { type: 'event', eventId: 'member' }, nextId)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(result.score.parts[1]).toEqual(source.score.parts[1]); expect(result.score.hairpins).toEqual(source.score.hairpins)
  expect(() => createNativeProject(result.score)).not.toThrow()
})
