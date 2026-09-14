import type { Score } from '../score-core'
import type { NativeProject } from './schema'

export function remapRemovedStaffLayoutAnchors(
  layout: Score['layout'], previousParts: Score['parts'], nextParts: Score['parts']
): Score['layout'] {
  if (!layout) return layout
  const survivingIds = new Set(nextParts.flatMap(part => part.staves.flatMap(staff => staff.measures.map(measure => measure.id))))
  const remap = (ids: string[]) => [...new Set(ids.flatMap(id => {
    if (survivingIds.has(id)) return [id]
    for (const part of previousParts) for (const staff of part.staves) {
      const index = staff.measures.findIndex(measure => measure.id === id)
      if (index < 0) continue
      const nextPart = nextParts.find(candidate => candidate.id === part.id)
      // Deleting a measure removes its break; deleting its staff preserves position.
      if (nextPart?.staves.some(candidate => candidate.id === staff.id)) return []
      const replacement = (nextPart ?? nextParts[0])?.staves[0]
      return replacement?.measures.length === staff.measures.length && replacement.measures[index]
        ? [replacement.measures[index]!.id] : []
    }
    return []
  }))]
  return { ...layout,
    ...(layout.systemBreakBeforeMeasureIds ? { systemBreakBeforeMeasureIds: remap(layout.systemBreakBeforeMeasureIds) } : {}),
    ...(layout.pageBreakBeforeMeasureIds ? { pageBreakBeforeMeasureIds: remap(layout.pageBreakBeforeMeasureIds) } : {})
  }
}

export function applyPortablePartLayout(score: Score, override?: NativeProject['partLayouts'][number]): Score {
  const part = score.parts[0]
  if (!override || score.parts.length !== 1 || part?.id !== override.partId) return score
  const primary = part.staves[0]!.measures
  const normalizeBreaks = (ids: string[] | undefined) => ids === undefined ? undefined : [...new Set(ids.flatMap(id => {
    const index = part.staves.map(staff => staff.measures.findIndex(measure => measure.id === id)).find(index => index >= 0)
    const measure = index === undefined ? undefined : primary[index]
    return measure ? [measure.id] : []
  }))]
  return {
    ...score,
    slurs: score.slurs?.map(span => {
      const geometry = override.spanEngravings?.find(item => item.kind === 'slur' && item.spanId === span.id)
      return geometry ? { ...span, engraving: geometry.engraving ?? undefined } : span
    }),
    hairpins: score.hairpins?.map(span => {
      const geometry = override.spanEngravings?.find(item => item.kind === 'hairpin' && item.spanId === span.id)
      return geometry ? { ...span, engraving: geometry.engraving ?? undefined } : span
    }),
    layout: {
      ...score.layout,
      ...override.layout,
      ...(override.layout.systemBreakBeforeMeasureIds !== undefined ? { systemBreakBeforeMeasureIds: normalizeBreaks(override.layout.systemBreakBeforeMeasureIds) } : {}),
      ...(override.layout.pageBreakBeforeMeasureIds !== undefined ? { pageBreakBeforeMeasureIds: normalizeBreaks(override.layout.pageBreakBeforeMeasureIds) } : {})
    }
  }
}
