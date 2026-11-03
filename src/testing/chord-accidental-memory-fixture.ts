// Chromatics-authored QA score, not a user/external-app document or runtime fixture.
import { TICKS_PER_QUARTER, createDuration, createMeasure, createNote, createPart, createScore, createStaff, createTimePosition, createVoice, type Score } from '../score-core'

export function createChordAccidentalMemoryScore(): Score {
  return createScore({ id: 'chord-memory-score', title: 'Chord accidental memory', tempo: { bpm: 120, beatUnit: 'quarter', text: '♩ = 120' }, parts: [
    createPart({ id: 'memory-part', name: 'Memory QA', staves: [createStaff({ id: 'memory-staff', measures: [createMeasure({ id: 'memory-measure', voices: [createVoice({ id: 'voice-1', events: [
      createNote({ id: 'memory-chord', pitch: { step: 'C', octave: 4, alter: 0 }, pitches: [{ step: 'C', octave: 4, alter: 0 }, { step: 'E', octave: 4, alter: 1 }], duration: createDuration('quarter') }),
      createNote({ id: 'memory-carried', position: createTimePosition(TICKS_PER_QUARTER), pitch: { step: 'E', octave: 4 }, duration: createDuration('quarter') }),
      createNote({ id: 'memory-natural', position: createTimePosition(TICKS_PER_QUARTER * 2), pitch: { step: 'E', octave: 4, alter: 0 }, duration: createDuration('quarter') }),
      createNote({ id: 'memory-after-natural', position: createTimePosition(TICKS_PER_QUARTER * 3), pitch: { step: 'E', octave: 4 }, duration: createDuration('quarter') })
    ] })] })] })] })
  ] })
}

export function explicitChordMemoryOracle(score: Score): Score {
  const explicit = structuredClone(score), events = explicit.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events
  const carried = events[1]!, natural = events[3]!
  if (carried.type !== 'note' || natural.type !== 'note') throw Error('Expected authored QA notes')
  carried.pitch.alter = 1
  natural.pitch.alter = 0
  return explicit
}
