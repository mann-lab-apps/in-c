import { describe, expect, it } from 'vitest'

import { createNewScore } from './new-score'

const commonOptions = {
  title: 'New Work',
  composer: 'Composer',
  keySignature: { fifths: 0, mode: 'major' as const },
  timeSignature: { beats: 4, beatType: 4 },
  measureCount: 4,
  tempo: 96
}

describe('new score setup', () => {
  it('score-setup.create-grand-staff-score creates a piano part with treble and bass staves', () => {
    const score = createNewScore({
      ...commonOptions,
      templateId: 'piano-grand-staff'
    })

    expect(score.parts).toHaveLength(1)
    expect(score.parts[0]).toMatchObject({
      id: 'part-1',
      name: 'Piano',
      abbreviation: 'Pno.'
    })
    expect(score.parts[0].staves).toHaveLength(2)
    expect(
      score.parts[0].staves.map((staff) => staff.measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2 },
      { sign: 'F', line: 4 }
    ])
    expect(score.parts[0].staves[1].measures[0].id).toBe(
      'part-1-staff-2-measure-1'
    )
  })

  it('score-setup.create-ensemble-score creates a four-part string quartet skeleton', () => {
    const score = createNewScore({
      ...commonOptions,
      templateId: 'string-quartet'
    })

    expect(score.parts.map((part) => part.name)).toEqual([
      'Violin I',
      'Violin II',
      'Viola',
      'Cello'
    ])
    expect(score.parts.map((part) => part.staves.length)).toEqual([1, 1, 1, 1])
    expect(
      score.parts.map((part) => part.staves[0].measures[0].clef)
    ).toEqual([
      { sign: 'G', line: 2 },
      { sign: 'G', line: 2 },
      { sign: 'C', line: 3 },
      { sign: 'F', line: 4 }
    ])
    expect(
      score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.map((measure) => measure.id)
        )
      )
    ).toHaveLength(new Set(
      score.parts.flatMap((part) =>
        part.staves.flatMap((staff) =>
          staff.measures.map((measure) => measure.id)
        )
      )
    ).size)
  })
})
