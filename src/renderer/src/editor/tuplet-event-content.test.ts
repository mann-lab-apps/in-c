import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createMeasure,
  createNote, createPart, createRest, createScore, createStaff, createTimePosition,
  createVoice, validateMeasureRhythm, validateVoiceTuplets,
  type Note, type Rest, type Score, type VoiceEvent
} from '../../../score-core'
import { buildTupletGroupCommand } from './editor-state'

const note = (): Note => createNote({
  id: 'member', pitch: { step: 'C', octave: 4 },
  pitches: [{ step: 'C', octave: 4 }, { step: 'E', alter: -1, octave: 4 }, { step: 'G', octave: 4 }],
  articulations: ['staccato', 'accent'], fermata: true, breathMark: 'caesura',
  tremolo: { type: 'single', marks: 2 }, ornaments: ['trill'],
  lyrics: [{ number: 1, text: '한글', syllabic: 'single', extend: true }],
  graceNotes: [{ pitch: { step: 'D', alter: 1, octave: 4 }, slash: true }]
})
const rest = (): Rest => createRest({ id: 'member', fermata: true, breathMark: 'breath' })
const plainRest = (id: string, tick: number, value: 'half' | 'quarter') =>
  createRest({ id, position: createTimePosition(tick), duration: createDuration(value) })
const make = (events: VoiceEvent[], tuplet = false): Score => createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({
  voices: [createVoice({ events, ...(tuplet ? { tuplets: [{ id: 'group', eventIds: events.filter(e => e.duration.tuplet).map(e => e.id), actualNotes: 3, normalNotes: 2 }] } : {}) })]
})] })] })] })
const voice = (score: Score) => score.parts[0].staves[0].measures[0].voices[0]
const shape = (event: VoiceEvent) => { const { position, duration, ...content } = event; return content }
const convert = (score: Score) => {
  let id = 0
  const command = buildTupletGroupCommand(score, { type: 'event', eventId: 'member' }, () => `new-${++id}`)
  expect(command).toBeDefined()
  const result = applyScoreCommand(score, command!)
  expect(validateMeasureRhythm(result.score.parts[0].staves[0].measures[0]).isExact).toBe(true)
  expect(validateVoiceTuplets(voice(result.score))).toEqual([])
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  const redo = applyScoreCommand(result.score, result.undo)
  expect(applyScoreCommand(redo.score, redo.undo).score).toEqual(result.score)
  return result
}
const assertContents = (score: Score, expected: VoiceEvent) => {
  const actual = voice(score).events.find(e => e.id === expected.id)!
  expect(shape(actual)).toEqual(shape(expected))
  if (actual.type === 'note' && expected.type === 'note') {
    for (const key of ['pitch', 'pitches', 'articulations', 'lyrics', 'graceNotes', 'ornaments', 'tremolo'] as const)
      if (expected[key]) expect(actual[key]).not.toBe(expected[key])
    expect(actual.pitches?.[1]).not.toBe(expected.pitches?.[1])
    expect(actual.lyrics?.[0]).not.toBe(expected.lyrics?.[0])
    expect(actual.graceNotes?.[0].pitch).not.toBe(expected.graceNotes?.[0].pitch)
  }
}

describe('tuplet event contents', () => {
  it.each([['chord and attachments', note], ['rest attachments', rest]] as const)('preserves %s when creating a group', (_label, factory) => {
    const event = factory(), score = make([event, plainRest('middle', T, 'quarter'), plainRest('tail', 2 * T, 'half')]), before = structuredClone(score)
    const result = convert(score)
    assertContents(result.score, event)
    expect(voice(result.score).events[0].duration.tuplet).toEqual({ actualNotes: 3, normalNotes: 2 })
    expect(score).toEqual(before)
  })

  it.each([['chord and attachments', note], ['rest attachments', rest]] as const)('preserves %s when expanding a group back to regular durations', (_label, factory) => {
    const event = { ...factory(), duration: { ...createDuration('quarter'), tuplet: { actualNotes: 3, normalNotes: 2 } } },
      events = [event, ...[1, 2].map(i => ({ ...plainRest(`slot-${i}`, i * T * 2 / 3, 'quarter'), duration: structuredClone(event.duration) })), plainRest('tail', 2 * T, 'half')],
      score = make(events, true), before = structuredClone(score)
    const result = convert(score)
    assertContents(result.score, event)
    expect(voice(result.score).tuplets).toEqual([])
    expect(voice(result.score).events.find(e => e.id === 'member')!.duration.tuplet).toBeUndefined()
    expect(score).toEqual(before)
  })

  it('preserves the kept chord and rest when compact removal cannot expand past the bar', () => {
    const duration = { ...createDuration('quarter'), tuplet: { actualNotes: 3, normalNotes: 2 } },
      event = { ...note(), position: createTimePosition(2 * T), duration },
      keptRest = { ...rest(), id: 'kept-rest', position: createTimePosition(2 * T + T * 2 / 3), duration: structuredClone(duration) },
      lastRest = { ...plainRest('last-rest', 2 * T + T * 4 / 3, 'quarter'), duration: structuredClone(duration) },
      score = make([plainRest('before', 0, 'half'), event, keptRest, lastRest], true), before = structuredClone(score)
    const result = convert(score)
    assertContents(result.score, event)
    assertContents(result.score, keptRest)
    expect(voice(result.score).events.map(e => e.id)).toEqual(['before', 'member', 'kept-rest'])
    expect(voice(result.score).events.map(e => e.position.tick)).toEqual([0, 2 * T, 3 * T])
    expect(voice(result.score).tuplets).toEqual([])
    expect(score).toEqual(before)
  })

  it.each(['start', 'stop'] as const)('retains the existing tied-%s rejection', side => {
    const event = { ...note(), ties: { [side]: true } }, score = make([event, plainRest('middle', T, 'quarter'), plainRest('tail', 2 * T, 'half')])
    expect(buildTupletGroupCommand(score, { type: 'event', eventId: event.id }, () => 'unused')).toBeUndefined()
  })
})
