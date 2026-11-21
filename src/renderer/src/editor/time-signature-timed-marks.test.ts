import { expect, it } from 'vitest'
import { applyScoreCommand, TICKS_PER_QUARTER as T } from '../../../score-core'
import { createNativeProject } from '../../../project/schema'
import { createNewScore } from './new-score'
import { buildTimeSignatureCommand } from './time-signature'

function source(kind: 'tempo' | 'tempo-alias' | 'harmony' | 'expression', tick = 3 * T) {
  const score = createNewScore({ title: '박자와 위치 표기', templateId: 'duet', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const bar = score.parts[0].staves[0].measures[0]
  bar.number = 10
  if (kind === 'tempo' || kind === 'tempo-alias') score.tempoEvents = [{ id: 'authored-tempo', measureId: kind === 'tempo' ? bar.id : 'measure-10', tick, bpm: 80 }]
  if (kind === 'harmony') score.harmonies = [{ id: 'authored-harmony', measureId: bar.id, tick, text: 'Cm' }]
  if (kind === 'expression') score.expressionTexts = [{ id: 'authored-expression', measureId: bar.id, tick, text: 'dolce' }]
  return { score, bar }
}
for (const kind of ['tempo', 'tempo-alias', 'harmony', 'expression'] as const) {
  it(`rejects shrinking past the authored ${kind} position without mutating the score`, () => {
    const { score, bar } = source(kind), before = createNativeProject(score)
    expect(buildTimeSignatureCommand(score, { type: 'measure', measureId: bar.id }, { beats: 2, beatType: 4 })).toBeUndefined()
    expect(createNativeProject(score)).toEqual(before)
  })
  it(`keeps legal bar-end ${kind} anchors and does not constrain another staff`, () => {
    const { score, bar } = source(kind, 2 * T)
    const command = buildTimeSignatureCommand(score, { type: 'measure', measureId: bar.id }, { beats: 2, beatType: 4 })!
    expect(command).toBeDefined()
    const result = applyScoreCommand(score, command)
    expect(result.score.tempoEvents).toEqual(score.tempoEvents)
    expect(result.score.harmonies).toEqual(score.harmonies)
    expect(result.score.expressionTexts).toEqual(score.expressionTexts)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
    const other = score.parts[1].staves[0].measures[0]
    expect(buildTimeSignatureCommand(score, { type: 'measure', measureId: other.id }, { beats: 1, beatType: 4 })).toBeDefined()
  })
}

it('does not silently normalize an imported out-of-bar marking on equal-length or expanding edits', () => {
  const { score, bar } = source('tempo-alias', 6 * T)
  for (const meter of [{ beats: 4, beatType: 4 }, { beats: 2, beatType: 2 }, { beats: 5, beatType: 4 }]) {
    const command = buildTimeSignatureCommand(score, { type: 'measure', measureId: bar.id }, meter)!
    expect(command).toBeDefined()
    expect(applyScoreCommand(score, command).score.tempoEvents).toEqual(score.tempoEvents)
  }
})
