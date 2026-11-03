import type { Score } from './types'

/** Global annotations may use the ordinal aliases accepted by native/XML files.
 * Concrete references keep their owner; aliases belong to the primary staff.
 * This is a read/layout adapter, never a rewrite of the saved score. */
export function createGlobalMeasureResolver(score: Score): (reference: string) => string | undefined {
  const concrete = new Map<string, number>()
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    concrete.set(measure.id, (concrete.get(measure.id) ?? 0) + 1)
  }
  const aliases = new Map<string, string | undefined>()
  for (const measure of score.parts[0]?.staves[0]?.measures ?? []) {
    const alias = `measure-${measure.number}`
    aliases.set(alias, aliases.has(alias) ? undefined : measure.id)
  }
  return reference => {
    if (concrete.has(reference)) return concrete.get(reference) === 1 ? reference : undefined
    const target = aliases.get(reference)
    return target && concrete.get(target) === 1 ? target : undefined
  }
}
