import { createDuration, createMeasure, createNote, createPart, createScore,
  createStaff, createTimePosition, createVoice, TICKS_PER_QUARTER } from '../score-core'

/** Original synthetic QA score. Never used as real performance training data. */
export function createPianoStressScore() {
  const steps = ['C', 'D', 'E', 'G'] as const
  return createScore({ id: 'piano-stress-synthetic', title: 'Piano QA — 1000 generated notes',
    composer: 'Synthetic QA fixture', tempo: { bpm: 100 },
    parts: [createPart({ id: 'piano', name: 'Piano', staves: [createStaff({ id: 'piano-staff',
      measures: Array.from({ length: 250 }, (_, bar) => createMeasure({
        id: `piano-bar-${bar}`, number: bar + 1, timeSignature: { beats: 4, beatType: 4 },
        voices: [createVoice({ id: 'voice-1', events: steps.map((step, beat) => createNote({
          id: `qa-${bar * 4 + beat}`, pitch: { step, octave: 3 + bar % 3 },
          duration: createDuration('quarter'), position: createTimePosition(beat * TICKS_PER_QUARTER)
        })) })]
      }))
    })] })] })
}
