import { describe, expect, it } from 'vitest'
import { Accidental } from 'vexflow'
import { createDuration, createMeasure, createNote, createVoice, type Pitch } from '../../../score-core'
import { createStaveNote } from './NotationPreview'

function accidentalIndices(pitches: Pitch[], fifths: number) {
  const event = createNote({ id: 'chord', pitch: pitches[0], pitches, duration: createDuration('whole') })
  const voice = createVoice({ events: [event] })
  const measure = createMeasure({ keySignature: { fifths }, voices: [voice] })
  return createStaveNote(event, measure, voice, new Set()).getModifiers()
    .filter(modifier => modifier instanceof Accidental).map(modifier => modifier.getIndex())
}

describe('chord accidental glyphs', () => {
  it('shows the explicit accidental on every chord member, not only its primary pitch', () => {
    expect(accidentalIndices([{ step: 'C', octave: 4, alter: 1 }, { step: 'E', octave: 4, alter: 1 }], 0)).toEqual([0, 1])
  })
  it('retains key-signature suppression and displays both explicit naturals', () => {
    expect(accidentalIndices([{ step: 'C', octave: 4, alter: 1 }, { step: 'F', octave: 4, alter: 1 }], 2)).toEqual([])
    expect(accidentalIndices([{ step: 'C', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }], 2)).toEqual([0, 1])
  })
})
