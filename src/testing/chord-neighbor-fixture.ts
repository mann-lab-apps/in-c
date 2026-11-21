import { createEnharmonicNeighborFixture } from './enharmonic-neighbor-fixture'
import { resolveNotePitch, type Note, type Pitch, type Score } from '../score-core'
import { createNativeProject } from '../project/schema'

export type ChordNeighborOperation = 'add-third' | 'add-fifth' | 'remove-upper' | 'shift-E'
export type ChordNeighborStyle = 'implicit' | 'explicit'
export const chordNeighborCases = (['add-third', 'add-fifth', 'remove-upper', 'shift-E'] as const).flatMap(operation => (['implicit', 'explicit'] as const).map(style => ({ operation, style, kind: `${operation}-${style}` })))

function originalSounds(score: Score): Score {
  const result = structuredClone(score)
  score.parts.forEach((part, pi) => part.staves.forEach((staff, si) => staff.measures.forEach((measure, mi) => measure.voices.forEach((voice, vi) => voice.events.forEach((event, ei) => {
    if (event.type !== 'note') return
    const pitches = (event.pitches?.length ? event.pitches : [event.pitch]).map(pitch => resolveNotePitch(measure, voice, { ...event, pitch }))
    const target = result.parts[pi].staves[si].measures[mi].voices[vi].events[ei] as Note
    target.pitch = pitches[0]
    if (event.pitches?.length) target.pitches = pitches
  })))))
  return result
}

export function chordNeighborFixture(operation: ChordNeighborOperation, style: ChordNeighborStyle) {
  const { score } = createEnharmonicNeighborFixture('sharp')
  score.title = '화음 편집 이웃음 보존'
  const voice = score.parts[0].staves[0].measures[0].voices[0], leading = voice.events[0] as Note
  const step = operation === 'add-fifth' ? 'G' : 'E', originalAlter = operation === 'remove-upper' ? 1 : 0
  for (let index = 1; index < 4; index++) {
    const event = voice.events[index] as Note
    event.pitch = { step, octave: 4, ...(index === 3 ? { alter: 0 as const } : style === 'explicit' ? { alter: originalAlter as 0 | 1 } : {}) }
  }
  if (operation === 'remove-upper') {
    leading.pitch = { step: 'C', octave: 4, alter: 0 }
    leading.pitches = [leading.pitch, { step: 'E', octave: 4, alter: 1 }]
  }
  const expectedNote: Note = structuredClone(leading)
  if (operation === 'remove-upper') delete expectedNote.pitches
  else {
    const added: Pitch = { step, octave: 4, ...(operation === 'shift-E' ? {} : { alter: 1 as const }) }
    expectedNote.pitches = [expectedNote.pitch, added]
  }
  const reference = originalSounds(score), target = reference.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  target.pitch = { ...expectedNote.pitch }
  if (expectedNote.pitches) target.pitches = expectedNote.pitches.map(pitch => ({ ...pitch, alter: pitch.alter ?? 0 }))
  else delete target.pitches
  return { project: createNativeProject(score), expectedNote, reference, operation, style, kind: `${operation}-${style}` }
}
