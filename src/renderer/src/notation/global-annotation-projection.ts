import type { Score } from '../../../score-core'

// Rendering resolves global aliases without changing the portable score anchors.
export function projectGlobalAnnotationsForRendering(score: Score): Score {
  const measureIds = new Map(
    (score.parts[0]?.staves[0]?.measures ?? []).map(measure => [`measure-${measure.number}`, measure.id])
  )
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    measureIds.set(measure.id, measure.id)
  }
  const project = <T extends { measureId: string }>(items: T[] | undefined): T[] | undefined =>
    items?.map(item => {
      const measureId = measureIds.get(item.measureId)
      return measureId && measureId !== item.measureId ? { ...item, measureId } : item
    })
  return {
    ...score,
    rehearsalMarks: project(score.rehearsalMarks),
    systemTexts: project(score.systemTexts),
    tempoEvents: project(score.tempoEvents)
  }
}
