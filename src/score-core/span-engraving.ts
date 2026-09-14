import type { Score, SpanEngraving, SpanGeometry, SpanSegmentAddress } from './types'

export function spanSegmentKey(address: SpanSegmentAddress): string {
  return JSON.stringify([address.partId, address.staffId, address.startMeasureId, address.endMeasureId])
}

export function resolveSpanSegmentEngraving(engraving: SpanEngraving | undefined, address: SpanSegmentAddress): SpanGeometry | undefined {
  const override = engraving?.segments?.find(item => spanSegmentKey(item) === spanSegmentKey(address))
  if (override) return override.geometry ?? undefined
  if (!engraving) return undefined
  const { segments: _segments, ...whole } = engraving
  return Object.values(whole).some(value => value !== undefined) ? whole : undefined
}

// A missing entry inherits; null deliberately restores automatic geometry.
export function replaceSpanSegmentEngraving(engraving: SpanEngraving | undefined, address: SpanSegmentAddress, geometry: SpanGeometry | null | undefined): SpanEngraving {
  const segments = engraving?.segments?.filter(item => spanSegmentKey(item) !== spanSegmentKey(address)) ?? []
  if (geometry !== undefined) segments.push({ ...address, geometry })
  return { ...engraving, segments: segments.length ? segments : undefined }
}

export function isSpanSegmentAddressValid(score: Score, span: { startEventId: string; endEventId: string }, address: SpanSegmentAddress): boolean {
  const staff = score.parts.find(part => part.id === address.partId)?.staves.find(staff => staff.id === address.staffId)
  if (!staff) return false
  const events = new Set(staff.measures.flatMap(measure => measure.voices.flatMap(voice => voice.events.map(event => event.id))))
  const start = staff.measures.findIndex(measure => measure.id === address.startMeasureId)
  const end = staff.measures.findIndex(measure => measure.id === address.endMeasureId)
  return start >= 0 && end >= start && events.has(span.startEventId) && events.has(span.endEventId)
}

export function pruneSpanSegmentEngravings(score: Score, span: { startEventId: string; endEventId: string }, engraving?: SpanEngraving | null): SpanEngraving | null | undefined {
  if (!engraving?.segments) return engraving
  const segments = engraving.segments.filter(item => isSpanSegmentAddressValid(score, span, item))
  return { ...engraving, segments: segments.length ? segments : undefined }
}
