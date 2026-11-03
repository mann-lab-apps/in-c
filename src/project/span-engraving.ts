import type { SpanEngraving } from '../score-core'

/** Existing field contract: all absent means automatic; explicit zero is manual.
 * Interpret the value without normalizing or rewriting an imported native score. */
export function hasManualSpanEngraving(engraving?: SpanEngraving): boolean {
  return Boolean(engraving && (engraving.placement !== undefined || engraving.offsetX !== undefined || engraving.offsetY !== undefined || engraving.height !== undefined))
}
