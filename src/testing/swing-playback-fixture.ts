import { createMeasure, createNote, createPart, createScore, createStaff, createVoice, TICKS_PER_QUARTER as T, type Score } from '../score-core'

export function createSwingPlaybackFixture(unit: 'eighth' | '16th' = 'eighth', ratio: '2:1' | '3:2' = '2:1'): Score {
  const step = unit === 'eighth' ? T / 2 : T / 4
  const score = createScore({ tempo: { bpm: 120 }, parts: [createPart({ staves: [createStaff({ measures: [createMeasure({
    id: 'swing-bar', voices: [createVoice({ id: 'swing-voice', events: Array.from({ length: 4 * T / step }, (_, i) => createNote({
      id: `swing-${i}`, position: { tick: i * step }, pitch: { step: 'C', octave: 4 }, duration: { value: unit, dots: 0 }
    })) })]
  })] })] })] })
  return { ...score, swingPlayback: { unit, ratio } } as Score
}


export function createInternalSwingPickupFixture(fermata = false) {
  const score = createSwingPlaybackFixture('eighth', '3:2'), staff = score.parts[0].staves[0], first = staff.measures[0]
  first.voices[0].events[7].fermata = fermata
  const partial = structuredClone(first); partial.id = 'short-bar'; partial.number = 2
  partial.timing = { type: 'pickup', durationTicks: T / 2 }
  partial.voices[0].events = partial.voices[0].events.slice(0, 1).map(event => ({ ...event, id: 'short-note', fermata: undefined }))
  const last = structuredClone(first); last.id = 'last-bar'; last.number = 3
  last.voices[0].events = last.voices[0].events.map(event => ({ ...event, id: 'last-' + event.id, fermata: undefined }))
  staff.measures.push(partial, last)
  return score
}
