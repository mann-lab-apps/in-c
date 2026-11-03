import { expect, it } from 'vitest'
import { Accidental, GraceNote, GraceNoteGroup, StaveNote } from 'vexflow'
import { musicXmlOrderFixture } from '../../../testing/musicxml-order-fixture'
import { createStaveNote } from './NotationPreview'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { serializeMidi } from '../midi/serialize-midi'

it.each([0, 1])('attaches real zero-rhythm grace glyphs on staff %i without changing the source or host duration', index => {
  const score=musicXmlOrderFixture('lower-grace'),measure=score.parts[0].staves[index].measures[0],voice=measure.voices[0]
  if(index===0) voice.events[0]={...score.parts[0].staves[1].measures[0].voices[0].events[0],id:'upper-host'}
  const event=voice.events[0],native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(score)
  const note=createStaveNote(event,measure,voice,new Set())
  const groups=note.getModifiers().filter((m):m is GraceNoteGroup=>m instanceof GraceNoteGroup)
  expect(groups).toHaveLength(1)
  const grace=groups[0].getGraceNotes()[0] as GraceNote
  expect(grace).toBeInstanceOf(GraceNote)
  expect(grace.getKeys()).toEqual(['d#/3'])
  expect(grace.getDuration()).toBe('8')
  expect(grace.getModifiers().filter(m=>m instanceof Accidental)).toHaveLength(1)
  const ordinary=createStaveNote({...event,graceNotes:undefined} as typeof event,measure,voice,new Set())
  expect(note.getTicks().value()).toBe(ordinary.getTicks().value())
  expect(note.getTicks().value()).toBe(new StaveNote({keys:['c/4'],duration:'w'}).getTicks().value())
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMidi(score)).toEqual(midi)
})
