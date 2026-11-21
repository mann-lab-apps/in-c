import { createVoiceMoveFixture } from './voice-move-fixture'

export type MidiExpressionKind = 'trill' | 'tremolo-1' | 'tremolo-2' | 'tremolo-3' | 'both' | 'mixed' | 'plain'
export function createMidiExpressionFixture(kind: MidiExpressionKind) {
  const score = createVoiceMoveFixture()
  score.title = '장식 연주 MIDI 손실 검증'
  const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw new Error('Expected owned leading note')
  if (['trill', 'both', 'mixed'].includes(kind)) note.ornaments = ['trill']
  if (kind.startsWith('tremolo-') || kind === 'both') note.tremolo = { type: 'single', marks: kind === 'both' ? 2 : Number(kind.at(-1)) as 1 | 2 | 3 }
  if (kind === 'mixed') note.graceNotes = [{ pitch: { step: 'D', octave: 5 }, slash: true }]
  return score
}
