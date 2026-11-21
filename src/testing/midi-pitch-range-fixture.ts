import { createNativePartIdFixture } from './native-part-id-fixture'
import type { Note, Pitch } from '../score-core'
export type MidiPitchRangeKind = 'upper' | 'lower' | 'chord' | 'transpose-up' | 'transpose-down' | 'octave-up' | 'octave-down' | 'edge-upper' | 'edge-lower' | 'normal' | 'skipped-tab' | 'grace'
export function createMidiPitchRangeFixture(kind: MidiPitchRangeKind) {
  const score = createNativePartIdFixture(['midi-range-part'])
  score.title = 'MIDI 음높이 범위'
  const measure = score.parts[0].staves[0].measures[0], note = measure.voices[0].events[0] as Note
  note.id = 'midi-range-note'
  const pitch: Pitch = kind === 'upper' || kind === 'skipped-tab' ? { step: 'B', octave: 9, alter: 0 }
    : ['lower', 'transpose-down', 'octave-down', 'edge-lower'].includes(kind) ? { step: 'C', octave: -1, alter: kind === 'lower' ? -1 : 0 }
    : ['transpose-up', 'octave-up', 'edge-upper'].includes(kind) ? { step: 'G', octave: 9, alter: 0 }
    : { step: 'C', octave: 4, alter: 0 }
  note.pitch = pitch
  if (kind === 'chord') note.pitches = [pitch, { step: 'B', octave: 9, alter: 0 }]
  if (kind === 'transpose-up' || kind === 'transpose-down') measure.transposition = { diatonic: 0, chromatic: kind === 'transpose-up' ? 1 : -1 }
  if (kind === 'octave-up' || kind === 'octave-down') score.octaveShifts = [{ id: 'midi-range-octave', type: kind === 'octave-up' ? '8va' : '8vb', startEventId: note.id, endEventId: note.id }]
  if (kind === 'skipped-tab') measure.clef = { sign: 'tab', line: 5 }
  if (kind === 'grace') note.graceNotes = [{ pitch: { step: 'B', octave: 9 }, slash: true }]
  return score
}
