import { createScore, createPart, createStaff, createMeasure, createVoice, createNote, TICKS_PER_QUARTER } from '../score-core'

export function createRepeatHairpinTimeFixture(exit: boolean) {
  return createScore({ id: 'repeat-hairpin-time', title: exit ? 'Timed exit ramp' : 'Timed internal ramp', tempo: { bpm: 120, beatUnit: 'quarter' },
    tempoEvents: [{ id: 'fast', measureId: 'timed-repeat', tick: 0, bpm: 120, beatUnit: 'quarter' }, { id: 'slow', measureId: 'timed-repeat', tick: TICKS_PER_QUARTER, bpm: 60, beatUnit: 'quarter' }],
    parts: [createPart({ id: 'timed-part', staves: [createStaff({ id: 'timed-staff', measures: [
      createMeasure({ id: 'timed-repeat', number: 1, timeSignature: { beats: 2, beatType: 4 }, repeat: { start: true, end: true, times: 3 }, voices: [createVoice({ events: [
        createNote({ id: 'timed-a', pitch: { step: 'C', octave: 4 }, fermata: true }),
        createNote({ id: 'timed-b', pitch: { step: 'D', octave: 4 }, position: { tick: TICKS_PER_QUARTER } })
      ] })] }),
      createMeasure({ id: 'timed-tail', number: 2, timeSignature: { beats: 2, beatType: 4 }, voices: [createVoice({ events: [createNote({ id: 'timed-c', pitch: { step: 'E', octave: 4 }, duration: { value: 'half', dots: 0 } })] })] })
    ] })] })],
    hairpins: [{ id: 'timed-hairpin', type: 'crescendo', startEventId: exit ? 'timed-b' : 'timed-a', endEventId: exit ? 'timed-c' : 'timed-b' }]
  })
}
