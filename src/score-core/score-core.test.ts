import { describe, expect, it } from 'vitest'

import {
  applyScoreCommand,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  type Score,
  type VoiceAddress,
  type VoiceEvent
} from './index'

const defaultVoiceAddress: VoiceAddress = {
  partId: 'part-1',
  staffId: 'staff-1',
  measureId: 'measure-1',
  voiceId: 'voice-1'
}

describe('score-core', () => {
  it('creates a default editable score shape', () => {
    const score = createScore({
      id: 'sketch-1',
      title: 'First sketch',
      composer: 'In C'
    })

    expect(score).toMatchObject({
      id: 'sketch-1',
      title: 'First sketch',
      composer: 'In C',
      parts: [
        {
          id: 'part-1',
          name: 'Piano',
          staves: [
            {
              id: 'staff-1',
              measures: [
                {
                  id: 'measure-1',
                  number: 1,
                  clef: {
                    sign: 'G',
                    line: 2
                  },
                  keySignature: {
                    fifths: 0,
                    mode: 'major'
                  },
                  timeSignature: {
                    beats: 4,
                    beatType: 4
                  },
                  voices: [
                    {
                      id: 'voice-1',
                      events: [
                        {
                          id: 'measure-1-full-measure-rest',
                          type: 'rest',
                          position: {
                            tick: 0
                          },
                          duration: {
                            value: 'whole',
                            dots: 0
                          },
                          fullMeasure: true
                        }
                      ]
                    }
                  ],
                  timing: {
                    type: 'regular'
                  }
                }
              ]
            }
          ]
        }
      ]
    })
  })

  it('updates score metadata and returns an undo command', () => {
    const score = createScore({
      title: 'First sketch',
      composer: 'In C'
    })
    const updated = applyScoreCommand(score, {
      type: 'score-metadata.update',
      title: '새 악보',
      composer: '김작곡'
    })

    expect(updated.score).toMatchObject({
      title: '새 악보',
      composer: '김작곡'
    })
    expect(updated.undo).toEqual({
      type: 'score-metadata.update',
      title: 'First sketch',
      composer: 'In C'
    })
    expect(applyScoreCommand(updated.score, updated.undo).score).toEqual(score)
  })

  it('inserts a note and returns a command that undoes the edit', () => {
    const score = withEvents([])
    const note = createNote({
      id: 'note-1',
      pitch: {
        step: 'C',
        octave: 4
      }
    })

    const inserted = applyScoreCommand(score, {
      type: 'voice-event.insert',
      target: defaultVoiceAddress,
      event: note
    })

    expect(readEvents(inserted.score)).toEqual([note])
    expect(inserted.undo).toEqual({
      type: 'voice-event.remove',
      target: defaultVoiceAddress,
      eventId: 'note-1'
    })

    const undone = applyScoreCommand(inserted.score, inserted.undo)
    expect(readEvents(undone.score)).toEqual([])
  })

  it('removes an event and can restore it at the same index', () => {
    const firstRest = createRest({
      id: 'rest-1',
      position: createTimePosition(0)
    })
    const note = createNote({
      id: 'note-1',
      position: createTimePosition(13_440),
      pitch: {
        step: 'E',
        octave: 4
      }
    })
    const score = withEvents([firstRest, note])

    const removed = applyScoreCommand(score, {
      type: 'voice-event.remove',
      target: defaultVoiceAddress,
      eventId: 'rest-1'
    })

    expect(readEvents(removed.score)).toEqual([note])
    expect(removed.undo).toEqual({
      type: 'voice-event.insert',
      target: defaultVoiceAddress,
      event: firstRest,
      index: 0
    })

    const restored = applyScoreCommand(removed.score, removed.undo)
    expect(readEvents(restored.score)).toEqual([firstRest, note])
  })

  it('inserts and removes measures while keeping sequential numbers', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({ id: 'measure-a', number: 1 }),
                createMeasure({ id: 'measure-b', number: 2 })
              ]
            })
          ]
        })
      ]
    })
    const inserted = applyScoreCommand(score, {
      type: 'staff-measure.insert',
      target: {
        partId: 'part-1',
        staffId: 'staff-1'
      },
      measure: createMeasure({
        id: 'measure-new',
        number: 99
      }),
      index: 1
    })

    expect(readMeasures(inserted.score).map(({ id, number }) => ({ id, number }))).toEqual([
      { id: 'measure-a', number: 1 },
      { id: 'measure-new', number: 2 },
      { id: 'measure-b', number: 3 }
    ])

    const removed = applyScoreCommand(inserted.score, {
      type: 'staff-measure.remove',
      target: {
        partId: 'part-1',
        staffId: 'staff-1'
      },
      measureId: 'measure-new'
    })

    expect(readMeasures(removed.score).map(({ id, number }) => ({ id, number }))).toEqual([
      { id: 'measure-a', number: 1 },
      { id: 'measure-b', number: 2 }
    ])
    expect(applyScoreCommand(removed.score, removed.undo).score).toEqual(
      inserted.score
    )
  })

  it('replaces staff measures and restores them with undo', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({ id: 'measure-1', number: 1 }),
                createMeasure({ id: 'measure-2', number: 2 })
              ]
            })
          ]
        })
      ]
    })
    const nextMeasures = score.parts[0].staves[0].measures.map((measure) => ({
      ...measure,
      keySignature: { fifths: -1, mode: 'major' as const }
    }))
    const replaced = applyScoreCommand(score, {
      type: 'staff-measures.replace',
      target: {
        partId: 'part-1',
        staffId: 'staff-1'
      },
      measures: nextMeasures
    })

    expect(
      replaced.score.parts[0].staves[0].measures.map(
        (measure) => measure.keySignature
      )
    ).toEqual([
      { fifths: -1, mode: 'major' },
      { fifths: -1, mode: 'major' }
    ])
    expect(applyScoreCommand(replaced.score, replaced.undo).score).toEqual(score)
  })

  it('rejects empty command batches instead of creating no-op undo entries', () => {
    const score = createScore()

    expect(() =>
      applyScoreCommand(score, {
        type: 'score.batch',
        commands: []
      })
    ).toThrow('batch must contain at least one command')
  })

  it('does not remove the final measure from a staff', () => {
    const score = createScore()

    expect(() =>
      applyScoreCommand(score, {
        type: 'staff-measure.remove',
        target: {
          partId: 'part-1',
          staffId: 'staff-1'
        },
        measureId: 'measure-1'
      })
    ).toThrow('at least one measure')
  })
})

function withEvents(events: VoiceEvent[]): Score {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                voices: [
                  createVoice({
                    events
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function readEvents(score: Score): VoiceEvent[] {
  return score.parts[0].staves[0].measures[0].voices[0].events
}

function readMeasures(score: Score) {
  return score.parts[0].staves[0].measures
}
