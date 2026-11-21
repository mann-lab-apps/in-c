import type { SpanEngraving } from '../../../score-core'
import { hasManualSpanEngraving } from '../../../project/span-engraving'
export interface SpanDragReference { kind: 'slur' | 'hairpin'; id: string }
export interface ManualSpanDragTransaction {
  commit: (engraving: SpanEngraving) => boolean
  reject: (reason: 'range') => void
}
export type BeginManualSpanDrag = (reference: SpanDragReference, engraving: SpanEngraving) => ManualSpanDragTransaction | undefined
export function equalSpanEngraving(a?: SpanEngraving, b?: SpanEngraving) {
  return (['placement', 'offsetX', 'offsetY', 'height'] as const).every(key => Object.is(a?.[key], b?.[key]))
}
export function isManualSpanTranslation(base: SpanEngraving, next: SpanEngraving): boolean {
  return hasManualSpanEngraving(base) && !equalSpanEngraving(base, next) &&
    base.placement === next.placement && Object.is(base.height, next.height) &&
    [next.offsetX ?? 0, next.offsetY ?? 0].every(value => Number.isFinite(value) && value >= -8 && value <= 8)
}
export function planManualSpanTranslation(base: SpanEngraving | undefined, deltaX: number, deltaY: number):
  { status: 'unsupported' | 'no-change' | 'out-of-range' } | { status: 'valid'; engraving: SpanEngraving; deltaX: number; deltaY: number } {
  if (!base || !hasManualSpanEngraving(base) || ![deltaX, deltaY, base.offsetX ?? 0, base.offsetY ?? 0].every(Number.isFinite)) return { status: 'unsupported' }
  // Snap the user's relative movement, never the imported fractional origin.
  const snap = (value: number) => Math.sign(value) * Math.round(Math.abs(value) * 4) / 4
  const x = snap(deltaX), y = snap(deltaY)
  if (x === 0 && y === 0) return { status: 'no-change' }
  const engraving = { ...base, ...(x !== 0 ? { offsetX: (base.offsetX ?? 0) + x } : {}), ...(y !== 0 ? { offsetY: (base.offsetY ?? 0) + y } : {}) }
  if (!isManualSpanTranslation(base, engraving)) return { status: 'out-of-range' }
  return { status: 'valid', engraving, deltaX: x, deltaY: y }
}
