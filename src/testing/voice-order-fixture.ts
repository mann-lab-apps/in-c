import { createDuration, createNote, createScore, createVoice, TICKS_PER_QUARTER } from '../score-core'

/** Native voice array order is not a voice number or span endpoint identity. */
export function createVoiceOrderFixture(reversed = false, secondVoiceNumber: 2 | 3 = 2) {
  const score = createScore({ title: 'Voice order and endpoint preservation' })
  const measure = score.parts[0].staves[0].measures[0]
  const voices = [1, secondVoiceNumber].map(number => createVoice({
    id: `voice-${number}`,
    events: Array.from({ length: 4 }, (_, index) => createNote({
      id: `ordered-${number}-${index}`,
      position: { tick: index * TICKS_PER_QUARTER },
      pitch: { step: index % 2 ? 'D' : 'C', octave: number === 1 ? 4 : 5 },
      duration: createDuration('quarter')
    }))
  }))
  measure.voices = reversed ? [...voices].reverse() : voices
  score.slurs = voices.map((voice, index) => ({
    id: `ordered-slur-${index}`, startEventId: voice.events[0].id, endEventId: voice.events[2].id
  }))
  score.hairpins = [{
    id: 'ordered-hairpin', type: 'crescendo',
    startEventId: voices[1].events[0].id, endEventId: voices[1].events[3].id
  }]
  return score
}
