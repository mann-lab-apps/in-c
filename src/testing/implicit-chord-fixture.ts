// Owned QA fixtures: unique simultaneous pitches, no new product data model.
import { type Note, type Score } from '../score-core'
import { createChordAccidentalMemoryScore } from './chord-accidental-memory-fixture'
export function implicitChordFixture(kind: 'key' | 'preceding'): { source: Score; explicit: Score; keys: string[][]; signs: number[][]; xmlNotes: Note['pitch'][]; letter: 'F' | 'E'; notesByBeat: number[][] } {
  const source = createChordAccidentalMemoryScore(), measure = source.parts[0]!.staves[0]!.measures[0]!, events = measure.voices[0]!.events as Note[]
  source.title = `Implicit chord ${kind}`
  const letter = kind === 'key' ? 'F' : 'E'
  measure.keySignature = { fifths: kind === 'key' ? 1 : 0, mode: 'major' }
  events.forEach(event => { event.pitch = { step: letter, octave: 4 }; delete event.pitches })
  if (kind === 'key') {
    events[0]!.pitch = { step: 'C', octave: 4 }
    events[0]!.pitches = [events[0]!.pitch, { step: 'F', octave: 4 }]
  } else {
    events[0]!.pitch.alter = -1
    events[1]!.pitch = { step: 'C', octave: 4, alter: 0 }
    events[1]!.pitches = [events[1]!.pitch, { step: 'E', octave: 4 }]
  }
  events[2]!.pitch.alter = 0
  const explicit = structuredClone(source), spelled = explicit.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events as Note[]
  const inherited = kind === 'key' ? 1 : -1
  if (kind === 'key') {
    spelled[0]!.pitch.alter = 0
    spelled[0]!.pitches = [{ step: 'C', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 1 }]
    spelled[1]!.pitch.alter = 1
  } else spelled[1]!.pitches![1]!.alter = inherited
  spelled[3]!.pitch.alter = 0
  return { source, explicit, letter,
    keys: kind === 'key' ? [['c/4','f#/4'],['f#/4'],['f/4'],['f/4']] : [['eb/4'],['c/4','eb/4'],['e/4'],['e/4']],
    signs: kind === 'key' ? [[2,0,0],[1,0,0],[1,0,1],[1,0,0]] : [[1,0,0],[2,0,0],[1,0,1],[1,0,0]],
    xmlNotes: spelled.flatMap(n => n.pitches?.length ? n.pitches : [n.pitch]),
    notesByBeat: kind === 'key' ? [[60,66],[66],[65],[65]] : [[63],[60,63],[64],[64]] }
}
