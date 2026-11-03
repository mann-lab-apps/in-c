import { measureDurationTicks, type Measure, type Score } from '../../../score-core'

export type HarmonySpacingWidths = ReadonlyMap<string, ReadonlyMap<number, number>>

// Distinct in-measure chord times can reserve layout-only rhythmic columns.
// A lone label / coincident stack keeps its previous layout. Never guess a
// different owner or clamp boundary/out-of-bar annotations into this measure.
export function spacedHarmonies(score: Score) {
  const measures = new Map<string, Measure | undefined>()
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    measures.set(measure.id, measures.has(measure.id) ? undefined : measure)
  }
  const eligible = (score.harmonies ?? []).filter(h => {
    const measure = measures.get(h.measureId)
    return measure && Number.isInteger(h.tick) && h.tick >= 0 && h.tick < measureDurationTicks(measure)
  })
  const ticks = new Map<string, Set<number>>()
  for (const h of eligible) {
    const onsets = ticks.get(h.measureId) ?? new Set<number>()
    onsets.add(h.tick); ticks.set(h.measureId, onsets)
  }
  return eligible.filter(h => ticks.get(h.measureId)!.size > 1)
}

export function harmonySpacingByMeasure(score: Score, widths: ReadonlyMap<string, number>): HarmonySpacingWidths {
  const result = new Map<string, Map<number, number>>()
  for (const h of spacedHarmonies(score)) {
    const width = widths.get(h.text)
    if (!width || !Number.isFinite(width) || width <= 0) continue
    const onsets = result.get(h.measureId) ?? new Map<number, number>()
    onsets.set(h.tick, Math.max(onsets.get(h.tick) ?? 0, width)); result.set(h.measureId, onsets)
  }
  return result
}
