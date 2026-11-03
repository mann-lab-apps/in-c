import type { Score } from '../../../score-core'
import { createGlobalMeasureResolver } from '../../../score-core'
export { createGlobalMeasureResolver } from '../../../score-core'

export function resolveGlobalAnnotationMeasures(score: Score, resolve = createGlobalMeasureResolver(score)): Score {
  const rebind = <T extends { measureId: string }>(items: T[] | undefined): T[] | undefined => {
    if (!items) return items
    let changed = false
    const mapped = items.map(item => {
      const measureId = resolve(item.measureId)
      if (!measureId || measureId === item.measureId) return item
      changed = true
      return { ...item, measureId }
    })
    return changed ? mapped : items
  }
  const systemTexts = rebind(score.systemTexts)
  const rehearsalMarks = rebind(score.rehearsalMarks)
  const tempoEvents = rebind(score.tempoEvents)
  return systemTexts === score.systemTexts && rehearsalMarks === score.rehearsalMarks && tempoEvents === score.tempoEvents
    ? score : { ...score, systemTexts, rehearsalMarks, tempoEvents }
}
