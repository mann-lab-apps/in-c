// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createNote, createRest, createScore, TICKS_PER_QUARTER, type Clef } from '../../../score-core'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createStaveNote } from './NotationPreview'
import { createNotationTuplet } from './create-tuplet'

const clefs: { name: string; clef: Clef; low: number; high: number }[] = [
  { name: 'treble', clef: { sign: 'G', line: 2 }, low: 3, high: 6 },
  { name: 'bass', clef: { sign: 'F', line: 4 }, low: 1, high: 4 },
  { name: 'alto', clef: { sign: 'C', line: 3 }, low: 2, high: 5 },
  { name: 'tenor', clef: { sign: 'C', line: 4 }, low: 2, high: 5 }
]
const cases = clefs.flatMap(clef => (['low', 'high'] as const).flatMap(register => [0, 1, 2].map(noteIndex => ({ ...clef, register, noteIndex }))))

function fixture(clef: Clef, octave: number, noteIndex: number, voiceCount = 1) {
  const score = createScore(), measure = score.parts[0]!.staves[0]!.measures[0]!, voice = measure.voices[0]!
  measure.clef = clef
  voice.id = voiceCount > 1 ? 'voice-2' : 'voice-1'
  const duration = { value: 'eighth' as const, dots: 0, tuplet: { actualNotes: 3, normalNotes: 2 } }
  voice.events = [0, 1, 2].map(i => {
    const shared = { id: 'member-' + i, position: { tick: i * TICKS_PER_QUARTER / 3 }, duration }
    return i === noteIndex ? createNote({ ...shared, pitch: { step: 'C', octave } }) : createRest(shared)
  })
  voice.events.push(createRest({ id: 'padding', position: { tick: TICKS_PER_QUARTER }, duration: { value: 'half', dots: 1 } }))
  voice.tuplets = [{ id: 'triplet', eventIds: voice.events.slice(0, 3).map(e => e.id), actualNotes: 3, normalNotes: 2 }]
  if (voiceCount > 1) measure.voices.push({ id: 'voice-1', events: [createRest({ id: 'other-voice', duration: { value: 'whole', dots: 0 } })] })
  const notes = voice.events.slice(0, 3).map(e => createStaveNote(e, measure, voice, new Set()))
  return { score, notes }
}

describe('tuplet rest positions', () => {
  it.each(cases)('keeps $name $register rests at the staff position with the pitched member at $noteIndex', ({ clef, register, low, high, noteIndex }) => {
    const { score, notes } = fixture(clef, register === 'low' ? low : high, noteIndex)
    const original = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score), xml = serializeMusicXml(score)
    const before = notes.map(n => ({ lines: n.getKeyProps().map(p => p.line), shift: n.getYShift(), keys: [...n.getKeys()] }))
    const group = createNotationTuplet(notes, { numNotes: 3, notesOccupied: 2, bracketed: true, ratioed: false })
    expect(notes.map(n => n.getKeyProps().map(p => p.line))).toEqual(before.map(n => n.lines))
    expect(notes.map(n => n.getYShift())).toEqual(before.map(n => n.shift))
    expect(notes.map(n => n.getKeys())).toEqual(before.map(n => n.keys))
    expect(group.getNoteCount()).toBe(3); expect(group.getNotesOccupied()).toBe(2)
    expect(notes.every(n => n.getTuplet() === group)).toBe(true)
    expect(score).toEqual(original); expect(encodeNativeProject(createNativeProject(score))).toBe(native)
    expect(serializeMidi(score)).toEqual(midi); expect(serializeMusicXml(score)).toBe(xml)
  })
  it('preserves secondary-voice rest offsets and an explicit non-default key line', () => {
    const { notes } = fixture({ sign: 'G', line: 2 }, 3, 0, 2)
    notes[2]!.setKeyLine(0, 4)
    const before = notes.map(n => ({ line: n.getKeyProps()[0]!.line, shift: n.getYShift() }))
    createNotationTuplet(notes, { numNotes: 3, notesOccupied: 2, bracketed: true })
    expect(notes.map(n => ({ line: n.getKeyProps()[0]!.line, shift: n.getYShift() }))).toEqual(before)
  })
})
