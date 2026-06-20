import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createRest,
  createTimePosition,
  createVoice,
  durationToTicks,
  measureDurationTicks,
  timeSignatureDurationTicks,
  validateMeasureRhythm
} from './index'

const quarter = TICKS_PER_QUARTER

describe('score-core timing', () => {
  it('converts supported durations, dots, and tuplets to integer ticks', () => {
    expect(durationToTicks(createDuration('whole'))).toBe(quarter * 4)
    expect(durationToTicks(createDuration('eighth', 1))).toBe(quarter * 0.75)
    expect(
      durationToTicks({
        value: 'quarter',
        dots: 0,
        tuplet: {
          actualNotes: 3,
          normalNotes: 2
        }
      })
    ).toBe(quarter * (2 / 3))
  })

  it('derives regular and pickup measure durations', () => {
    expect(
      timeSignatureDurationTicks({
        beats: 6,
        beatType: 8
      })
    ).toBe(quarter * 3)

    expect(
      measureDurationTicks(
        createMeasure({
          timing: {
            type: 'pickup',
            durationTicks: quarter
          }
        })
      )
    ).toBe(quarter)
  })

  it('represents a default empty measure as an exact full-measure rest', () => {
    const measure = createMeasure()
    const event = measure.voices[0].events[0]

    expect(event).toMatchObject({
      type: 'rest',
      position: {
        tick: 0
      },
      fullMeasure: true
    })
    expect(validateMeasureRhythm(measure)).toMatchObject({
      status: 'exact',
      expectedTicks: quarter * 4,
      isExact: true,
      issues: []
    })
  })

  it('distinguishes empty, gap, overlap, and overflow measures', () => {
    expect(validateMeasureRhythm(measureWith([])).status).toBe('empty')

    const gap = measureWith([
      note('note-1', 0, 'quarter'),
      rest('rest-1', quarter * 2, 'half')
    ])
    expect(validateMeasureRhythm(gap)).toMatchObject({
      status: 'gap',
      issues: [
        {
          type: 'gap',
          startTick: quarter,
          endTick: quarter * 2
        }
      ]
    })

    const overlap = measureWith([
      note('note-1', 0, 'half'),
      rest('rest-1', quarter, 'half'),
      rest('rest-2', quarter * 3, 'quarter')
    ])
    expect(validateMeasureRhythm(overlap).status).toBe('overlap')

    const overflow = measureWith([
      note('note-1', 0, 'whole'),
      rest('rest-1', quarter * 4, 'quarter')
    ])
    expect(validateMeasureRhythm(overflow).status).toBe('overflow')
  })

  it('uses the declared pickup duration for exact-fill validation', () => {
    const measure = createMeasure({
      timing: {
        type: 'pickup',
        durationTicks: quarter
      },
      voices: [
        createVoice({
          events: [
            createFullMeasureRest({
              id: 'pickup-rest'
            })
          ]
        })
      ]
    })

    expect(validateMeasureRhythm(measure)).toMatchObject({
      status: 'exact',
      expectedTicks: quarter,
      isExact: true
    })
  })
})

function measureWith(events: ReturnType<typeof createVoice>['events']) {
  return createMeasure({
    voices: [
      createVoice({
        events
      })
    ]
  })
}

function note(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0]
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step: 'C',
      octave: 4
    },
    duration: createDuration(value)
  })
}

function rest(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0]
) {
  return createRest({
    id,
    position: createTimePosition(tick),
    duration: createDuration(value)
  })
}
