import { describe, expect, it } from 'vitest'

import { createTremoloPulseBeats, createTrillPulseBeats } from './useScorePlayback'

describe('score playback hook helpers', () => {
  it('tremolo.playback-data turns three-mark single-note tremolo into 32nd-note pulses', () => {
    expect(createTremoloPulseBeats(0, 1, 0, 3)).toEqual([
      0,
      0.125,
      0.25,
      0.375,
      0.5,
      0.625,
      0.75,
      0.875
    ])
  })

  it('starts tremolo pulses from the resumed playback beat', () => {
    expect(createTremoloPulseBeats(0, 1, 0.5, 2)).toEqual([0.5, 0.75])
  })

  it('turns trill ornaments into alternating 32nd-note playback pulses', () => {
    expect(createTrillPulseBeats(0, 0.5, 0)).toEqual([
      0,
      0.125,
      0.25,
      0.375
    ])
  })

  it('starts trill pulses from the resumed playback beat', () => {
    expect(createTrillPulseBeats(0, 0.5, 0.25)).toEqual([0.25, 0.375])
  })
})
