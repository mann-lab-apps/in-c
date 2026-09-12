import { describe, expect, it } from 'vitest'
import { applyScoreCommand, createMeasure, createPart, createScore, createStaff } from '../../../score-core'
import { buildPartTranspositionCommand, resolveInstrumentTranspositionId } from './instrument-transposition'
import { buildInsertMeasureAfter } from './measure-management'

describe('instrument transposition editing', () => {
  it('changes only the selected part, preserves written notes and supports undo', () => {
    const score = createScore({ parts: [createPart({ id: 'wind' }), createPart({ id: 'piano' })] })
    const command = buildPartTranspositionCommand(score, 'wind', 'bb')!
    const changed = applyScoreCommand(score, command)
    expect(changed.score.parts[0].staves[0].measures[0].transposition?.chromatic).toBe(-2)
    expect(changed.score.parts[0].staves[0].measures[0].voices).toEqual(score.parts[0].staves[0].measures[0].voices)
    expect(changed.score.parts[1]).toEqual(score.parts[1])
    expect(applyScoreCommand(changed.score, changed.undo).score).toEqual(score)
  })

  it('inherits the written instrument when inserting a measure and can reset it', () => {
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ transposition: { chromatic: -7, diatonic: -4 } })] })] })] })
    const inserted = buildInsertMeasureAfter(score, 'measure-1', (kind) => `new-${kind}`)!
    const changed = applyScoreCommand(score, inserted.command).score
    expect(changed.parts[0].staves[0].measures[1].transposition?.chromatic).toBe(-7)
    const reset = applyScoreCommand(changed, buildPartTranspositionCommand(changed, 'part-1', 'concert')!).score
    expect(reset.parts[0].staves[0].measures.every((measure) => resolveInstrumentTranspositionId(measure.transposition) === 'concert')).toBe(true)
    expect(buildPartTranspositionCommand(score, 'missing', 'bb')).toBeUndefined()
    expect(resolveInstrumentTranspositionId({ chromatic: 1 })).toBe('custom')
  })
})
