import { chordNeighborFixture } from './chord-neighbor-fixture'
import type { Note, Pitch } from '../score-core'

export const chordNativeRangeCases = [
  { kind: 'blocked-third', start: { step: 'B', octave: 9, alter: 0 }, member: { step: 'D', octave: 10, alter: 0 }, operation: 'add-third', blocked: true },
  { kind: 'blocked-fifth', start: { step: 'G', octave: 9, alter: 0 }, member: { step: 'D', octave: 10, alter: 0 }, operation: 'add-fifth', blocked: true },
  { kind: 'upper-third-control', start: { step: 'C', octave: 9, alter: 0 }, member: { step: 'E', octave: 9, alter: 0 }, operation: 'add-third', blocked: false },
  { kind: 'upper-fifth-control', start: { step: 'C', octave: 9, alter: 0 }, member: { step: 'G', octave: 9, alter: 0 }, operation: 'add-fifth', blocked: false },
  { kind: 'lower-third-control', start: { step: 'C', octave: -1, alter: 0 }, member: { step: 'E', octave: -1, alter: 0 }, operation: 'add-third', blocked: false },
  { kind: 'lower-fifth-control', start: { step: 'C', octave: -1, alter: 0 }, member: { step: 'G', octave: -1, alter: 0 }, operation: 'add-fifth', blocked: false },
  { kind: 'shift-lower-member-control', start: { step: 'G', octave: 9, alter: 0 }, member: { step: 'E', octave: 9 }, operation: 'shift-E', blocked: false }
] as const

export function chordNativeRangeFixture(spec: typeof chordNativeRangeCases[number]) {
  const { project } = chordNeighborFixture('add-third', 'explicit')
  project.score.title = '화음 음역과 프로젝트 보존'
  const note = project.score.parts[0].staves[0].measures[0].voices[0].events[0] as Note
  note.pitch = { ...spec.start } as Pitch
  delete note.pitches
  const expected = structuredClone(project)
  if (!spec.blocked) {
    const target = expected.score.parts[0].staves[0].measures[0].voices[0].events[0] as Note
    target.pitches = spec.operation === 'shift-E' ? [{ ...spec.member }, target.pitch] : [target.pitch, { ...spec.member }]
  }
  return { project, expected, ...spec }
}
