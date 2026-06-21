import { describe, expect, it } from 'vitest'

import {
  createMeasure,
  createNote,
  createTimePosition,
  createVoice,
  effectiveAlterAt,
  keySignatureAlter,
  nearestPitch,
  shouldDisplayAccidental,
  transposeChromatic,
  transposeDiatonic,
  transposeOctave
} from './index'

describe('score-core pitch context', () => {
  it('derives alterations from sharp and flat key signatures', () => {
    expect(keySignatureAlter({ fifths: 2 }, 'F')).toBe(1)
    expect(keySignatureAlter({ fifths: 2 }, 'C')).toBe(1)
    expect(keySignatureAlter({ fifths: 2 }, 'G')).toBe(0)
    expect(keySignatureAlter({ fifths: -3 }, 'B')).toBe(-1)
    expect(keySignatureAlter({ fifths: -3 }, 'A')).toBe(-1)
    expect(keySignatureAlter({ fifths: -3 }, 'C')).toBe(0)
  })

  it('applies preceding accidentals within the same measure and octave', () => {
    const first = note('first', 0, 'F', 4, 0)
    const later = note('later', 100, 'F', 4)
    const continued = note('continued', 200, 'F', 4)
    const otherOctave = note('other', 300, 'F', 5)
    const measure = createMeasure({
      keySignature: { fifths: 1 },
      voices: [
        createVoice({ events: [first, later, continued, otherOctave] })
      ]
    })
    const voice = measure.voices[0]

    expect(
      effectiveAlterAt({
        measure,
        voice,
        step: 'F',
        octave: 4,
        tick: 100
      })
    ).toBe(0)
    expect(
      effectiveAlterAt({
        measure,
        voice,
        step: 'F',
        octave: 5,
        tick: 300
      })
    ).toBe(1)
    expect(
      effectiveAlterAt({
        measure,
        voice,
        step: 'F',
        octave: 4,
        tick: 200
      })
    ).toBe(0)
    expect(shouldDisplayAccidental(measure, voice, first)).toBe(true)
    expect(shouldDisplayAccidental(measure, voice, later)).toBe(false)
    expect(shouldDisplayAccidental(measure, voice, continued)).toBe(false)
  })

  it('chooses the nearest octave for letter-name input', () => {
    expect(
      nearestPitch({
        step: 'C',
        alter: 0,
        reference: { step: 'B', octave: 4, alter: 0 }
      })
    ).toMatchObject({ step: 'C', octave: 5 })
    expect(
      nearestPitch({
        step: 'B',
        alter: 0,
        reference: { step: 'C', octave: 5, alter: 0 }
      })
    ).toMatchObject({ step: 'B', octave: 4 })
  })

  it('supports diatonic, chromatic, and octave movement', () => {
    expect(transposeDiatonic({ step: 'B', octave: 4 }, 1)).toEqual({
      step: 'C',
      octave: 5
    })
    expect(transposeChromatic({ step: 'F', octave: 4, alter: 0 }, 1)).toEqual({
      step: 'F',
      octave: 4,
      alter: 1
    })
    expect(transposeOctave({ step: 'D', octave: 4, alter: -1 }, -1)).toEqual({
      step: 'D',
      octave: 3,
      alter: -1
    })
  })
})

function note(
  id: string,
  tick: number,
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
  octave: number,
  alter?: -2 | -1 | 0 | 1 | 2
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step,
      octave,
      alter
    }
  })
}
