import { createVoiceMoveFixture } from './voice-move-fixture'

/** Owned ordinary-note score; grace performance is intentionally unsupported. */
export function createGraceMidiFixture(count: 0 | 1 | 2 = 1) {
  const score = createVoiceMoveFixture()
  score.title = '꾸밈음 MIDI 손실 검증'
  const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw new Error('Expected owned leading note')
  if (count > 0) {
    note.graceNotes = [{ pitch: { step: 'D', octave: 5 }, slash: true }]
    if (count === 2) note.graceNotes.push({ pitch: { step: 'E', octave: 5 }, slash: false })
  }
  return score
}
