import { describe, expect, it } from 'vitest'

import {
  createTremoloPulseBeats,
  createTrillPulseBeats,
  resolvePlaybackEventScheduleWindow,
  resolvePlaybackScheduledEvents,
  resolvePartMixerGain
} from './useScorePlayback'

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

  it('playback.part-mixer resolves mute, solo, and volume gain by part', () => {
    expect(resolvePartMixerGain('part-1', {})).toBe(1)
    expect(
      resolvePartMixerGain('part-1', {
        'part-1': {
          muted: true,
          solo: false,
          volume: 1
        }
      })
    ).toBe(0)
    expect(
      resolvePartMixerGain('part-1', {
        'part-1': {
          muted: false,
          solo: false,
          volume: 0.45
        }
      })
    ).toBe(0.45)
    expect(
      resolvePartMixerGain('part-1', {
        'part-1': {
          muted: false,
          solo: false,
          volume: 1
        },
        'part-2': {
          muted: false,
          solo: true,
          volume: 1
        }
      })
    ).toBe(0)
    expect(
      resolvePartMixerGain('part-2', {
        'part-1': {
          muted: false,
          solo: false,
          volume: 1
        },
        'part-2': {
          muted: false,
          solo: true,
          volume: 1.25
        }
      })
    ).toBe(1.25)
  })

  it('playback.part-mixer applies mute, solo, and volume to multi-part scheduling candidates', () => {
    const scheduled = resolvePlaybackScheduledEvents(
      {
        events: [
          createPlaybackEvent('violin-downbeat', 'violin', 0),
          createPlaybackEvent('viola-downbeat', 'viola', 0),
          createPlaybackEvent('cello-downbeat', 'cello', 0, {
            velocityStart: 0.2,
            velocityEnd: 0.18
          }),
          createPlaybackEvent('cello-past', 'cello', 0, {
            durationBeats: 1
          })
        ],
        tempoEvents: [],
        totalBeats: 4
      },
      1,
      {
        violin: {
          muted: true,
          solo: false,
          volume: 1
        },
        viola: {
          muted: false,
          solo: false,
          volume: 0.7
        },
        cello: {
          muted: false,
          solo: true,
          volume: 0.5
        }
      }
    )

    expect(scheduled.map(({ event }) => event.eventId)).toEqual([
      'cello-downbeat'
    ])
    expect(scheduled[0]).toMatchObject({
      partGain: 0.5,
      startVelocity: 0.19,
      endVelocity: 0.18
    })
  })

  it('playback.tempo-map schedules event seconds across positioned tempo changes', () => {
    const window = resolvePlaybackEventScheduleWindow(
      {
        events: [],
        totalBeats: 6,
        tempoEvents: [
          {
            id: 'meno-mosso',
            measureId: 'measure-1',
            startBeat: 2,
            bpm: 60,
            quarterBpm: 60,
            text: 'Meno mosso'
          }
        ]
      },
      {
        eventId: 'note-after-tempo-change',
        partId: 'part-1',
        staffId: 'staff-1',
        voiceId: 'voice-1',
        measureId: 'measure-1',
        startBeat: 3,
        durationBeats: 1,
        frequency: 440,
        velocityStart: 0.16,
        velocityEnd: 0.16
      },
      0,
      120,
      10
    )

    expect(window.startTime).toBeCloseTo(12)
    expect(window.endTime).toBeCloseTo(13)
    expect(window.sustainStart).toBeCloseTo(12.015)
    expect(window.releaseStart).toBeCloseTo(12.96)
  })
})

function createPlaybackEvent(
  eventId: string,
  partId: string,
  startBeat: number,
  overrides: Partial<{
    durationBeats: number
    frequency: number
    measureId: string
    staffId: string
    velocityEnd: number
    velocityStart: number
    voiceId: string
  }> = {}
) {
  return {
    durationBeats: overrides.durationBeats ?? 2,
    eventId,
    frequency: overrides.frequency ?? 440,
    measureId: overrides.measureId ?? `${partId}-measure-1`,
    partId,
    staffId: overrides.staffId ?? 'staff-1',
    startBeat,
    velocityEnd: overrides.velocityEnd ?? 0.16,
    velocityStart: overrides.velocityStart ?? 0.16,
    voiceId: overrides.voiceId ?? 'voice-1'
  }
}
