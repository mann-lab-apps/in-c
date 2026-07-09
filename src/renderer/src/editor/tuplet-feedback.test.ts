import { describe, expect, it } from 'vitest'

import {
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  TICKS_PER_QUARTER
} from '../../../score-core'
import { demoScore } from '../notation/demo-score'
import { describeTupletToggleFailure } from './tuplet-feedback'

describe('tuplet feedback', () => {
  it('asks for an event selection before toggling tuplets', () => {
    expect(
      describeTupletToggleFailure(demoScore, {
        type: 'measure',
        measureId: 'measure-1'
      })
    ).toContain('음표 또는 쉼표를 선택')
  })

  it('explains when a triplet would cross the measure boundary', () => {
    expect(
      describeTupletToggleFailure(demoScore, {
        type: 'event',
        eventId: 'note-f-sharp-4'
      })
    ).toContain('현재 마디를 넘어갑니다')
  })

  it('explains that tied notes must be untied first', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'tied-note',
                          position: createTimePosition(0),
                          duration: createDuration('quarter'),
                          pitch: { step: 'C', octave: 4 },
                          ties: { start: true }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    expect(
      describeTupletToggleFailure(score, {
        type: 'event',
        eventId: 'tied-note'
      })
    ).toContain('타이를 해제')
  })

  it('explains orphaned tuplet duration without a group relation', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'orphan-tuplet',
                          position: createTimePosition(0),
                          duration: {
                            value: 'eighth',
                            dots: 0,
                            tuplet: { actualNotes: 3, normalNotes: 2 }
                          },
                          pitch: { step: 'C', octave: 4 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    expect(
      describeTupletToggleFailure(score, {
        type: 'event',
        eventId: 'orphan-tuplet'
      })
    ).toContain('그룹 정보를 찾을 수 없습니다')
  })

  it('explains mixed durations inside the target span', () => {
    const score = createScore({
      parts: [
        createPart({
          staves: [
            createStaff({
              measures: [
                createMeasure({
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'quarter-note',
                          position: createTimePosition(0),
                          duration: createDuration('quarter'),
                          pitch: { step: 'C', octave: 4 }
                        }),
                        createNote({
                          id: 'eighth-note',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: createDuration('eighth'),
                          pitch: { step: 'D', octave: 4 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    expect(
      describeTupletToggleFailure(score, {
        type: 'event',
        eventId: 'quarter-note'
      })
    ).toContain('같은 음가')
  })
})
