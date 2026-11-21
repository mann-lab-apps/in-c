import { expect, it } from 'vitest'
import { applyScoreCommand, createNote, createRest, resolveNotePitch, validateMeasureRhythm, TICKS_PER_QUARTER as T, type Note } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createVoiceMoveFixture } from '../../../testing/voice-move-fixture'
import { locateEvent } from './editor-state'
import { buildEmptyVoiceMove } from './empty-voice-move'

it.each([false, true])('moves one note to an absent/existing empty voice (%s), preserving rhythm, pitch, neighbors and one exact undo', existing => {
  const score = createVoiceMoveFixture(existing), before = structuredClone(score), location = locateEvent(score, 'moving')!
  let n = 0
  const result = buildEmptyVoiceMove(score, location, 'voice-2', () => `moved-rest-${++n}`)
  expect(result.reason).toBeUndefined(); expect(result.command).toBeDefined()
  const applied = applyScoreCommand(score, result.command!), measure = applied.score.parts[0].staves[0].measures[0], source = measure.voices[0], target = measure.voices.find(v => v.id === 'voice-2')!
  expect(result.selection).toEqual({ type: 'event', eventId: 'moving', address: { ...location.address, voiceId: 'voice-2' } })
  expect(target.events.find(e => e.id === 'moving')).toMatchObject({ type: 'note', position: { tick: T }, duration: location.event.duration })
  expect(source.events[1]).toMatchObject({ type: 'rest', position: { tick: T }, duration: location.event.duration })
  expect(source.events.map(e => e.id).filter(id => id === 'moving')).toEqual([])
  expect(resolveNotePitch(measure, target, target.events.find(e => e.id === 'moving') as Note)).toEqual(resolveNotePitch(location.measure, location.measure.voices[0], location.event as Note))
  expect(validateMeasureRhythm(measure).isExact).toBe(true)
  expect(applied.score.parts[1]).toEqual(before.parts[1]); expect(applied.score.parts[0].staves[0].measures.slice(1)).toEqual(before.parts[0].staves[0].measures.slice(1)); expect(measure.number).toBe(10)
  expect(applied.score.slurs).toEqual(before.slurs)
  const ids = applied.score.parts.flatMap(p => p.staves.flatMap(s => s.measures.flatMap(m => m.voices.flatMap(v => v.events.map(e => e.id)))))
  expect(new Set(ids).size).toBe(ids.length)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(applied.score))).score).toEqual(applied.score)
  expect(serializeMidi(applied.score)).toEqual(serializeMidi(before)); expect(serializeMidi(parseMusicXml(serializeMusicXml(applied.score)))).toEqual(serializeMidi(before))
  expect(applyScoreCommand(applied.score, applied.undo).score).toEqual(before); expect(score).toEqual(before)
})
it('pins surviving implicit accidentals when moving the earlier explicit accidental', () => {
  const score = createVoiceMoveFixture(), before = structuredClone(score); let n = 0
  const result = buildEmptyVoiceMove(score, locateEvent(score, 'leading'), 'voice-3', () => `rest-${++n}`)
  expect(result.reason).toBeUndefined()
  const after = applyScoreCommand(score, result.command!).score
  expect((locateEvent(after, 'moving')!.event as Note).pitch.alter).toBe(1)
  expect(serializeMidi(after)).toEqual(serializeMidi(before))
})
it('fills an empty target only to the actual pickup length', () => {
  const score = createVoiceMoveFixture(true), measure = score.parts[0].staves[0].measures[0]
  measure.timing = { type: 'pickup', durationTicks: 2 * T }; measure.voices[0].events = measure.voices[0].events.slice(0, 2)
  let n = 0; const result = buildEmptyVoiceMove(score, locateEvent(score, 'moving'), 'voice-2', () => `pickup-rest-${++n}`)
  expect(result.reason).toBeUndefined(); expect(validateMeasureRhythm(applyScoreCommand(score, result.command!).score.parts[0].staves[0].measures[0]).isExact).toBe(true)
})
it.each(['chord', 'grace', 'tie', 'tuplet', 'span', 'lyric', 'articulation', 'target-note', 'marked-target', 'complex-target', 'same', 'invalid', 'rest'] as const)('refuses %s without mutating any source or IDs', kind => {
  const score = createVoiceMoveFixture(true), measure = score.parts[0].staves[0].measures[0], note = measure.voices[0].events[1] as Note
  if (kind === 'chord') note.pitches = [note.pitch, { step: 'A', octave: 4 }]
  if (kind === 'grace') note.graceNotes = [{ pitch: note.pitch }]
  if (kind === 'tie') note.ties = { start: true }
  if (kind === 'tuplet') measure.voices[0].tuplets = [{ id: 'triplet', eventIds: ['moving'], actualNotes: 3, normalNotes: 2 }]
  if (kind === 'span') score.slurs = [{ id: 's', startEventId: 'moving', endEventId: 'following' }]
  if (kind === 'lyric') note.lyrics = [{ text: '가' }]
  if (kind === 'articulation') note.articulations = ['staccato']
  if (kind === 'target-note') measure.voices[1].events = [createNote({ id: 'occupied', pitch: { step: 'C', octave: 4 }, duration: { value: 'whole', dots: 0 } })]
  if (kind === 'marked-target') measure.voices[1].events[0].fermata = true
  if (kind === 'complex-target') measure.voices[1].events = [createRest({ id: 'r1', duration: { value: 'half', dots: 0 } }), createRest({ id: 'r2', position: { tick: 2 * T }, duration: { value: 'half', dots: 0 } })]
  const before = structuredClone(score), allocate = () => { throw Error('Rejected edits must not allocate IDs') }
  const result = buildEmptyVoiceMove(score, locateEvent(score, kind === 'rest' ? 'tail' : 'moving'), kind === 'same' ? 'voice-1' : kind === 'invalid' ? 'voice-5' : 'voice-2', allocate)
  expect(result.command).toBeUndefined(); expect(result.reason).toBeTruthy(); expect(score).toEqual(before)
})
