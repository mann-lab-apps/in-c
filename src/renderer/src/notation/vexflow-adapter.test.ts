import { describe, expect, it } from 'vitest'

import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey,
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

  it('maps major and minor key signatures', () => {
    expect(toVexFlowKeySignature({ fifths: 0, mode: 'major' })).toBe('C')
    expect(toVexFlowKeySignature({ fifths: 2, mode: 'major' })).toBe('D')
    expect(toVexFlowKeySignature({ fifths: -3, mode: 'minor' })).toBe('Cm')
  })
})
