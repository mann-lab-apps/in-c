// Owned existing-model fixture. Unsupported measure and later supported measure share a staff.
import {
  createDuration, createFullMeasureRest, createMeasure, createNote, createPart,
  createScore, createStaff, createVoice, type Clef, type Score
} from '../score-core'

export function createMidiWarningScore(sign: 'percussion' | 'tab'): Score {
  const makeMeasures = (prefix: string, mixed: boolean) => [0, 1].map(index => {
    const clef: Clef = mixed && index === 0
      ? { sign, line: sign === 'tab' ? 5 : 2 }
      : { sign: 'G', line: 2 }
    return createMeasure({
      id: `${prefix}-measure-${index + 1}`, number: index + 1, clef,
      voices: [createVoice({ id: 'voice-1', events: [createNote({
        id: `${prefix}-note-${index + 1}`,
        pitch: { step: mixed ? (index === 0 ? 'E' : 'F') : (index === 0 ? 'C' : 'D'), octave: mixed ? 4 : 5, alter: 0 },
        duration: createDuration('whole')
      })] })]
    })
  })
  return createScore({
    id: `midi-warning-${sign}`, title: `MIDI warning ${sign}`,
    tempo: { bpm: 120, beatUnit: 'quarter', text: '♩ = 120' },
    parts: [
      createPart({id:'supported-part',name:'Piano',staves:[createStaff({id:'supported-staff',measures:makeMeasures('supported',false)})]}),
      createPart({id:'mixed-part',name:'Flute',staves:[createStaff({id:'mixed-staff',measures:makeMeasures('mixed',true)})]})
    ]
  })
}

export function midiWarningRestOracle(score: Score): Score {
  const copy = structuredClone(score)
  const measure = copy.parts[1]!.staves[0]!.measures[0]!
  const original = measure.voices[0]!.events[0]!
  measure.clef = { sign: 'G', line: 2 }
  measure.voices[0]!.events = [createFullMeasureRest({id:original.id,position:original.position})]
  return copy
}
