import { describe, expect, it } from 'vitest'
import { Clef as VexFlowClef, Stave, StaveNote, VexFlow } from 'vexflow'
import type { Clef, Pitch } from '../../../score-core'

import {
  addVexFlowClef,
  sameDisplayedClef,
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
  toVexFlowRestKey,
  toVexFlowKeySignature
} from './vexflow-adapter'

describe('VexFlow adapter', () => {
  it('maps score-core durations for notes and rests', () => {
    expect(toVexFlowDuration({ value: 'quarter', dots: 0 })).toBe('q')
    expect(toVexFlowDuration({ value: 'eighth', dots: 0 }, true)).toBe('8r')
  })

  it('maps pitches and accidentals', () => {
    const pitch = {
      step: 'F' as const,
      octave: 4,
      alter: 1 as const
    }

    expect(toVexFlowKey(pitch)).toBe('f#/4')
    expect(toVexFlowAccidental(pitch)).toBe('#')
    expect(toVexFlowKey({ step: 'F', octave: 4, alter: 0 })).toBe('f/4')
    expect(toVexFlowAccidental({ step: 'F', octave: 4, alter: 0 })).toBe('n')
  })

  it('maps supported clefs', () => {
    expect(toVexFlowClef({ sign: 'G', line: 2 })).toBe('treble')
    expect(toVexFlowClef({ sign: 'F', line: 4 })).toBe('bass')
    expect(toVexFlowClef({ sign: 'C', line: 4 })).toBe('tenor')
  })

  it.each([
    [{ sign: 'G', line: 1 }, 'french', { step: 'G', octave: 4 }],
    [{ sign: 'F', line: 3 }, 'baritone-f', { step: 'F', octave: 3 }],
    [{ sign: 'F', line: 5 }, 'subbass', { step: 'F', octave: 3 }],
    [{ sign: 'C', line: 1 }, 'soprano', { step: 'C', octave: 4 }],
    [{ sign: 'C', line: 2 }, 'mezzo-soprano', { step: 'C', octave: 4 }],
    [{ sign: 'C', line: 5 }, 'baritone-c', { step: 'C', octave: 4 }]
  ] satisfies [Clef, string, Pitch][])('puts the clef and reference pitch on the authored line for %j', (clef, family, pitch) => {
    const stave = new Stave(0, 0, 120)
    addVexFlowClef(stave, clef)
    expect(stave.getClef()).toBe(family)
    const note = new StaveNote({ clef: family, keys: [toVexFlowKey(pitch, clef)], duration: 'w' })
    expect(note.getKeyProps()[0].line).toBe(clef.line)
    for (const value of ['whole', 'half', 'quarter'] as const) {
      const rest = new StaveNote({ clef: family, keys: [toVexFlowRestKey(clef, value)], duration: toVexFlowDuration({ value, dots: 0 }, true) })
      expect(rest.getKeyProps()[0].line).toBe(value === 'whole' ? 4 : 3)
    }
  })

  const { Glyphs } = VexFlow
  it.each([
    [{ sign: 'G', line: 2, octaveChange: -2 }, 'treble', Glyphs.gClef15mb],
    [{ sign: 'G', line: 2, octaveChange: -1 }, 'treble', Glyphs.gClef8vb],
    [{ sign: 'G', line: 2, octaveChange: 1 }, 'treble', Glyphs.gClef8va],
    [{ sign: 'G', line: 2, octaveChange: 2 }, 'treble', Glyphs.gClef15ma],
    [{ sign: 'F', line: 4, octaveChange: -2 }, 'bass', Glyphs.fClef15mb],
    [{ sign: 'F', line: 4, octaveChange: -1 }, 'bass', Glyphs.fClef8vb],
    [{ sign: 'F', line: 4, octaveChange: 1 }, 'bass', Glyphs.fClef8va],
    [{ sign: 'F', line: 4, octaveChange: 2 }, 'bass', Glyphs.fClef15ma],
    [{ sign: 'C', line: 4, octaveChange: -1 }, 'tenor', Glyphs.cClef8vb]
  ] satisfies [Clef, string, string][])('draws %j with its octave glyph and base clef family', (clef, family, glyph) => {
    const stave = new Stave(0, 0, 120)
    addVexFlowClef(stave, clef)
    expect(stave.getClef()).toBe(family)
    expect(stave.getModifiers(undefined, VexFlowClef.CATEGORY)[0].getText()).toBe(glyph)
    expect(sameDisplayedClef(clef, { ...clef, octaveChange: 0 })).toBe(false)
  })

  it.each<Clef>([{ sign: 'G', line: 2 }, { sign: 'F', line: 4 }, { sign: 'C', line: 3 }, { sign: 'C', line: 4 }])(
    'centers rest keys on the same staff line for clef %j', clef => {
      for (const value of ['whole', 'half', 'quarter'] as const) {
        const rest = new StaveNote({ clef: toVexFlowClef(clef), keys: [toVexFlowRestKey(clef, value)], duration: toVexFlowDuration({ value, dots: 0 }, true) })
        expect(rest.getKeyProps()[0]!.line).toBe(value === 'whole' ? 4 : 3)
      }
    }
  )

  it('maps major and minor key signatures', () => {
    expect(toVexFlowKeySignature({ fifths: 0, mode: 'major' })).toBe('C')
    expect(toVexFlowKeySignature({ fifths: 2, mode: 'major' })).toBe('D')
    expect(toVexFlowKeySignature({ fifths: -3, mode: 'minor' })).toBe('Cm')
  })
})
