import { describe, expect, it } from 'vitest'

import {
  toVexFlowAccidental,
  toVexFlowClef,
  toVexFlowDuration,
  toVexFlowKey
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
  })

  it('maps supported clefs', () => {
    expect(toVexFlowClef({ sign: 'G', line: 2 })).toBe('treble')
    expect(toVexFlowClef({ sign: 'F', line: 4 })).toBe('bass')
    expect(toVexFlowClef({ sign: 'C', line: 4 })).toBe('tenor')
  })
})
