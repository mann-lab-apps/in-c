import { createDuration, createMeasure, createNote, createPart, createScore, createStaff, createVoice } from '../score-core'

export type RepeatHairpinCase = 'internal' | 'missing-first-stop' | 'missing-last-stop' | 'cross-ending'

/** Existing event-anchored model only. Explicit performed orders are test oracles. */
export function createRepeatHairpinFixture(kind: RepeatHairpinCase, restStart = false) {
  const measures = [0, 1, 2].map(index => createMeasure({
    id: `rh-m${index}`, number: index + 1,
    voices: [createVoice({ id: 'voice-1', events: [createNote({
      id: `rh-n${index}`, pitch: { step: ['C', 'D', 'E'][index] as 'C' | 'D' | 'E', octave: 4 },
      duration: createDuration('whole')
    })] })]
  }))
  if (restStart) measures[0].voices[0].events = [{ type: 'rest', id: 'rh-n0', position: { tick: 0 }, duration: createDuration('whole') }]
  measures[0].repeat = { start: true }
  measures[1].repeat = { end: true, times: kind === 'internal' ? 3 : 2 }
  if (kind !== 'internal') {
    measures[1].volta = { number: 1, start: true, end: true }
    measures[2].volta = { number: 2, start: true, end: true }
  }
  const score = createScore({ id: 'repeat-hairpin', title: `Repeat hairpin ${kind}`, tempo: { bpm: 120, beatUnit: 'quarter' },
    parts: [createPart({ id: 'rh-part', staves: [createStaff({ id: 'rh-staff', measures })] })],
    hairpins: [{ id: 'rh-hairpin', type: 'crescendo', startEventId: kind === 'cross-ending' ? 'rh-n1' : 'rh-n0', endEventId: kind === 'missing-first-stop' || kind === 'cross-ending' ? 'rh-n2' : 'rh-n1' }]
  })
  return { score, order: kind === 'internal' ? [0, 1, 0, 1, 0, 1, 2] : [0, 1, 0, 2] }
}
