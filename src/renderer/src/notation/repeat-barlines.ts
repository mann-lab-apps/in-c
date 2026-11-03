import { scoreRepeatSource, type Measure, type Score } from '../../../score-core'

// A linked performed sequence has one native owner, but normal repeat barlines
// are visible on each aligned staff. Conflicting or ambiguous native data keeps
// its existing local drawing; this adapter never rewrites the saved score.
export function createSharedRepeatBarlines(score: Score): ReadonlyMap<string, Measure['repeat']> | undefined {
  const source = scoreRepeatSource(score)
  if (!source) return undefined
  const shape = (measures: Measure[]) => JSON.stringify(measures.map(measure => ({
    repeat: measure.repeat ?? null, volta: measure.volta ?? null
  })))
  const sequence = shape(source.measures)
  const result = new Map<string, Measure['repeat']>()
  for (const part of score.parts) for (const staff of part.staves) {
    const marked = staff.measures.some(measure => measure.repeat?.start || measure.repeat?.end || measure.volta)
    if (marked && shape(staff.measures) !== sequence) return undefined
    for (const [index, measure] of staff.measures.entries()) {
      if (result.has(measure.id)) return undefined
      result.set(measure.id, source.measures[index].repeat)
    }
  }
  return result
}
