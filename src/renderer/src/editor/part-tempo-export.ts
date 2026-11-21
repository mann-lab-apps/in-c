import { createGlobalMeasureResolver, measureDurationTicks, type Score } from '../../../score-core'

/** Private part-copy context. Live part view/PDF and the saved score keep their
 * existing owners. For equal measure grids, all score-common tempo directions
 * belong at the same time in a part copy, regardless of their source staff ID.
 */
export function preparePartTempoExport(source: Score, projected: Score): Score {
  if (!source.tempoEvents?.length || projected.parts.length !== 1) return projected
  const reference = source.parts[0]?.staves[0]?.measures
  const target = projected.parts[0].staves[0]?.measures
  if (!reference?.length || !target) return projected
  const durations = reference.map(measureDurationTicks)
  const staves = [...source.parts.flatMap(part => part.staves), ...projected.parts[0].staves]
  // Same counts and lengths imply identical starts. Do not interpolate between
  // unequal grids or use printed measure numbers as time coordinates.
  if (staves.some(staff => staff.measures.length !== durations.length ||
    staff.measures.some((measure, index) => measureDurationTicks(measure) !== durations[index]))) return projected
  const indices = new Map(source.parts.flatMap(part => part.staves.flatMap(staff =>
    staff.measures.map((measure, index) => [measure.id, index] as const))))
  const resolve = createGlobalMeasureResolver(source)
  const tempoEvents = [] as NonNullable<Score['tempoEvents']>
  for (const event of source.tempoEvents) {
    const id = resolve(event.measureId)
    const index = id === undefined ? undefined : indices.get(id)
    if (index === undefined || !target[index]) return projected
    const measureId = target[index].id
    tempoEvents.push(measureId === event.measureId ? event : { ...event, measureId })
  }
  // Preserve the source order, including multiple instructions at the same tick.
  return { ...projected, tempoEvents }
}
