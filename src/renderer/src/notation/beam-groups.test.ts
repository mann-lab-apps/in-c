import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createRest,
  createTimePosition,
  createVoice
} from '../../../score-core'
import {
  beatGroupDurationTicks,
  createBeamGroups
} from './beam-groups'

const quarter = TICKS_PER_QUARTER
const eighth = quarter / 2

describe('beam groups', () => {
  it('groups 4/4 eighth notes by quarter-note beats', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      Array.from({ length: 8 }, (_, index) =>
        note(`note-${index + 1}`, index * eighth, 'eighth')
      )
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['note-1', 'note-2'] },
      { eventIds: ['note-3', 'note-4'] },
      { eventIds: ['note-5', 'note-6'] },
      { eventIds: ['note-7', 'note-8'] }
    ])
  })

  it('groups 3/4 eighth notes by quarter-note beats', () => {
    const measure = measureWith(
      {
        beats: 3,
        beatType: 4
      },
      Array.from({ length: 6 }, (_, index) =>
        note(`note-${index + 1}`, index * eighth, 'eighth')
      )
    )

    expect(beatGroupDurationTicks(measure)).toBe(quarter)
    expect(createBeamGroups(measure, measure.voices[0])).toHaveLength(3)
  })

  it('groups 2/4 eighth notes by quarter-note beats', () => {
    const measure = measureWith(
      {
        beats: 2,
        beatType: 4
      },
      Array.from({ length: 4 }, (_, index) =>
        note(`note-${index + 1}`, index * eighth, 'eighth')
      )
    )

    expect(beatGroupDurationTicks(measure)).toBe(quarter)
    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['note-1', 'note-2'] },
      { eventIds: ['note-3', 'note-4'] }
    ])
  })

  it('groups 6/8 notes into two dotted-quarter beats', () => {
    const measure = measureWith(
      {
        beats: 6,
        beatType: 8
      },
      Array.from({ length: 6 }, (_, index) =>
        note(`note-${index + 1}`, index * eighth, 'eighth')
      )
    )

    expect(beatGroupDurationTicks(measure)).toBe(eighth * 3)
    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['note-1', 'note-2', 'note-3'] },
      { eventIds: ['note-4', 'note-5', 'note-6'] }
    ])
  })

  it('groups 6/8 sixteenth notes inside dotted-quarter beats', () => {
    const sixteenth = quarter / 4
    const measure = measureWith(
      {
        beats: 6,
        beatType: 8
      },
      Array.from({ length: 12 }, (_, index) =>
        note(`note-${index + 1}`, index * sixteenth, '16th')
      )
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      {
        eventIds: [
          'note-1',
          'note-2',
          'note-3',
          'note-4',
          'note-5',
          'note-6'
        ]
      },
      {
        eventIds: [
          'note-7',
          'note-8',
          'note-9',
          'note-10',
          'note-11',
          'note-12'
        ]
      }
    ])
  })

  it('beams dotted short notes but still breaks at quarter notes', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      [
        note('dotted-eighth', 0, 'eighth', 1),
        note('sixteenth', quarter * 0.75, '16th'),
        note('quarter-note', quarter, 'quarter'),
        note('eighth-1', quarter * 2, 'eighth'),
        note('eighth-2', quarter * 2 + eighth, 'eighth')
      ]
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['dotted-eighth', 'sixteenth'] },
      { eventIds: ['eighth-1', 'eighth-2'] }
    ])
  })

  it('breaks groups at rests, long notes, and discontinuous positions', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      [
        note('note-1', 0, '16th'),
        note('note-2', quarter / 4, '16th'),
        rest('rest-1', eighth, 'eighth'),
        note('note-3', quarter, 'eighth'),
        note('note-4', quarter + eighth, 'eighth'),
        note('note-5', quarter * 2, 'quarter'),
        note('note-6', quarter * 3, '16th'),
        note('note-7', quarter * 3 + eighth, '16th')
      ]
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['note-1', 'note-2'] },
      { eventIds: ['note-3', 'note-4'] }
    ])
  })

  it('keeps tied notes subject to the same beat and continuity rules', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      [
        note('tie-start', 0, '16th', 0, { start: true }),
        note('tie-stop', quarter / 4, '16th', 0, { stop: true }),
        rest('rest-break', eighth, 'eighth'),
        note('next-beat-1', quarter, 'eighth'),
        note('next-beat-2', quarter + eighth, 'eighth')
      ]
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['tie-start', 'tie-stop'] },
      { eventIds: ['next-beat-1', 'next-beat-2'] }
    ])
  })

  it('does not beam a short note that crosses a beat boundary', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      [
        note('note-1', 0, 'eighth', 1),
        note('crossing-note', eighth * 1.5, 'eighth'),
        note('note-3', quarter + eighth, 'eighth'),
        rest('rest-tail', quarter * 2, 'half')
      ]
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([])
  })

  it('recomputes groups from edited duration and position values', () => {
    const measure = measureWith(
      {
        beats: 4,
        beatType: 4
      },
      [
        note('note-1', 0, 'eighth'),
        note('note-2', eighth, 'eighth'),
        rest('rest-tail', quarter, 'half', 1)
      ]
    )

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      { eventIds: ['note-1', 'note-2'] }
    ])

    const editedMeasure = measureWith(
      measure.timeSignature,
      [
        note('note-1', 0, 'quarter'),
        note('note-2', quarter, 'eighth'),
        rest('rest-tail', quarter + eighth, 'half'),
        rest('rest-end', quarter * 3.5, 'eighth')
      ]
    )

    expect(createBeamGroups(editedMeasure, editedMeasure.voices[0])).toEqual([])
  })

  it('beams a complete eighth-note triplet within one beat', () => {
    const duration = {
      ...createDuration('eighth'),
      tuplet: {
        actualNotes: 3,
        normalNotes: 2
      }
    }
    const measure = createMeasure({
      voices: [
        createVoice({
          events: [
            ...Array.from({ length: 3 }, (_, index) =>
              createNote({
                id: `triplet-${index + 1}`,
                position: createTimePosition((quarter / 3) * index),
                pitch: { step: 'C', octave: 4 },
                duration
              })
            ),
            createRest({
              id: 'remainder',
              position: createTimePosition(quarter),
              duration: createDuration('half', 1)
            })
          ],
          tuplets: [
            {
              id: 'tuplet-1',
              eventIds: ['triplet-1', 'triplet-2', 'triplet-3'],
              actualNotes: 3,
              normalNotes: 2
            }
          ]
        })
      ]
    })

    expect(createBeamGroups(measure, measure.voices[0])).toEqual([
      {
        eventIds: ['triplet-1', 'triplet-2', 'triplet-3']
      }
    ])
  })
})

function measureWith(
  timeSignature: {
    beats: number
    beatType: number
  },
  events: ReturnType<typeof note | typeof rest>[]
) {
  return createMeasure({
    timeSignature,
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
  value: Parameters<typeof createDuration>[0],
  dots = 0,
  ties?: Parameters<typeof createNote>[0]['ties']
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step: 'C',
      octave: 4
    },
    duration: createDuration(value, dots),
    ties
  })
}

function rest(
  id: string,
  tick: number,
  value: Parameters<typeof createDuration>[0],
  dots = 0
) {
  return createRest({
    id,
    position: createTimePosition(tick),
    duration: createDuration(value, dots)
  })
}
