import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildRhythmEditCommand,
  createDuration,
  createMeasure,
  createNote,
  createRest,
  createScore,
  createTimePosition,
  createVoice,
  validateVoiceTuplets
} from './index'

const quarter = TICKS_PER_QUARTER
const tripletEighth = {
  ...createDuration('eighth'),
  tuplet: {
    actualNotes: 3,
    normalNotes: 2
  }
}

describe('score-core tuplets', () => {
  it('validates a complete contiguous tuplet relation', () => {
    const voice = tripletVoice()

    expect(validateVoiceTuplets(voice)).toEqual([])
  })

  it('rejects incomplete, overlapping, and ungrouped tuplet members', () => {
    const voice = tripletVoice()

    expect(
      validateVoiceTuplets({
        ...voice,
        tuplets: [
          {
            ...voice.tuplets![0],
            eventIds: ['triplet-1', 'triplet-2']
          }
        ]
      })
    ).toContain('Invalid tuplet ratio or member count: tuplet-1')

    expect(
      validateVoiceTuplets({
        ...voice,
        tuplets: []
      })
    ).toContain('Tuplet duration has no complete group: triplet-1')
  })

  it('replaces tuplet events and relations as one undoable command', () => {
    const score = createScore()
    const voice = tripletVoice()
    const command = {
      type: 'voice-content.replace' as const,
      target: {
        partId: 'part-1',
        staffId: 'staff-1',
        measureId: 'measure-1',
        voiceId: 'voice-1'
      },
      events: voice.events,
      tuplets: voice.tuplets!
    }
    const result = applyScoreCommand(score, command)

    expect(
      result.score.parts[0].staves[0].measures[0].voices[0].tuplets
    ).toEqual(voice.tuplets)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('tuplets.reject-relation-breaking-edit rejects an isolated duration edit that would break a tuplet group', () => {
    const score = createScore()
    const voice = tripletVoice()
    const installed = applyScoreCommand(score, {
      type: 'voice-content.replace',
      target: {
        partId: 'part-1',
        staffId: 'staff-1',
        measureId: 'measure-1',
        voiceId: 'voice-1'
      },
      events: voice.events,
      tuplets: voice.tuplets
    }).score

    expect(
      buildRhythmEditCommand(installed, {
        target: {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-1'
        },
        eventId: 'triplet-1',
        event: createNote({
          id: 'triplet-1',
          position: createTimePosition(0),
          pitch: { step: 'C', octave: 4 },
          duration: createDuration('quarter')
        }),
        createId: () => 'unused'
      })
    ).toBeUndefined()
  })
})

function tripletVoice() {
  return createVoice({
    events: [
      ...Array.from({ length: 3 }, (_, index) =>
        createNote({
          id: `triplet-${index + 1}`,
          position: createTimePosition((quarter / 3) * index),
          pitch: { step: 'C', octave: 4 + index },
          duration: tripletEighth
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
}
