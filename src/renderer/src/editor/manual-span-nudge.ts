import type {SpanEngraving} from '../../../score-core'
import {hasManualSpanEngraving} from '../../../project/span-engraving'

/** Same grid and bounds as the existing geometry input. Never normalize on read. */
export function nudgeManualSpanOffset(engraving: SpanEngraving | undefined, field: 'offsetX' | 'offsetY', direction: -1 | 1, large = false): SpanEngraving | undefined {
  if (!engraving || !hasManualSpanEngraving(engraving)) return undefined
  const step = large ? 1 : 0.25
  const current = engraving[field] ?? 0
  if (!Number.isFinite(current)) return undefined
  const units = current / step
  const next = (direction > 0 ? Math.floor(units + 1e-9) + 1 : Math.ceil(units - 1e-9) - 1) * step
  if (next < -8 || next > 8) return undefined
  return {...engraving, [field]: Object.is(next, -0) ? 0 : next}
}
