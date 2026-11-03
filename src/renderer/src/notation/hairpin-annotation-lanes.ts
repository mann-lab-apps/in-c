import type { Hairpin, Score } from '../../../score-core'
import { hasManualSpanEngraving } from '../../../project/span-engraving'
import type { MeasureAnnotationLanes } from './annotation-lanes'
import type { MeasureTextInk } from './staff-annotation-spacing'

// Concrete native owners only. Unsupported cross-staff endpoints must not
// reserve unrelated staff lanes or acquire a new rendering meaning here.
export function hairpinCoveredMeasureIds(score: Score, hairpin: Hairpin): string[] {
  for (const part of score.parts) for (const staff of part.staves) {
    const start = staff.measures.findIndex(m => m.voices.some(v => v.events.some(e => e.id === hairpin.startEventId)))
    const end = staff.measures.findIndex(m => m.voices.some(v => v.events.some(e => e.id === hairpin.endEventId)))
    if (start >= 0 && end >= start) return staff.measures.slice(start, end + 1).map(m => m.id)
  }
  return []
}

export function reserveInteriorHairpinLanes(score: Score, lanes: ReadonlyMap<string, MeasureAnnotationLanes>, measureInk: MeasureTextInk, minimumSpanOffsets: ReadonlyMap<string, number> = new Map()): Map<string, MeasureAnnotationLanes> {
  // Endpoint annotations also need real descender clearance on two-bar spans.
  // Single-bar lanes and any authored manual geometry keep their own contract.
  const spans = (score.hairpins ?? []).filter(h => !hasManualSpanEngraving(h.engraving)).map(h => ({ id: h.id, ids: hairpinCoveredMeasureIds(score, h) })).filter(s => s.ids.length > 1)
  const ranges = spans.map(s => s.ids)
  const result = new Map(lanes)
  for (const id of new Set(ranges.flat())) {
    const lane = result.get(id), dynamic = score.dynamics?.find(mark => mark.measureId === id)
    if (!lane || !dynamic || lane.dynamicMarkYOffset === undefined) continue
    const ink = measureInk('notation-dynamic-mark', dynamic.value)
    if (!ink || !Number.isFinite(ink.y + ink.height) || ink.height <= 0) continue
    // Baseline gaps do not include the real dynamic font's descender.
    result.set(id, { ...lane, hairpinYOffset: Math.max(lane.hairpinYOffset ?? 0, lane.dynamicMarkYOffset + ink.y + ink.height + 18.9) })
  }
  for (const span of spans) {
    const minimum = minimumSpanOffsets.get(span.id)
    if (minimum === undefined || !Number.isFinite(minimum)) continue
    for (const id of span.ids) {
      const lane = result.get(id)
      if (lane) result.set(id, { ...lane, hairpinYOffset: Math.max(lane.hairpinYOffset ?? 0, minimum) })
    }
  }
  // Overlapping long spans converge to the same maximum regardless of array
  // order. No native arrays or manual geometry are changed.
  for (let pass = 0; pass < ranges.length; pass++) {
    let changed = false
    for (const ids of ranges) {
      const offset = Math.max(...ids.map(id => result.get(id)?.hairpinYOffset ?? 0))
      for (const id of ids) {
        const lane = result.get(id)
        if (lane && (lane.hairpinYOffset ?? 0) < offset) {
          result.set(id, { ...lane, hairpinYOffset: offset }); changed = true
        }
      }
    }
    if (!changed) break
  }
  for (const id of new Set(ranges.flat())) {
    const lane = result.get(id), original = lanes.get(id)
    if (!lane || !original || lane.hairpinYOffset === undefined) continue
    const delta = Math.max(0, lane.hairpinYOffset - (original.hairpinYOffset ?? 0))
    let shift = delta
    const expressions = (score.expressionTexts ?? []).filter(t => t.measureId === id)
    for (const [index, text] of expressions.entries()) {
      const ink = measureInk('notation-expression-text', text.text)
      const baseline = original.expressionTextYOffsets[index]
      if (ink && Number.isFinite(ink.y) && baseline !== undefined) {
        // Full automatic opening10 + stroke half.9 + minimum8px ink gap.
        shift = Math.max(shift, lane.hairpinYOffset + 18.9 - ink.y - baseline)
      }
    }
    const expressionTextYOffsets = original.expressionTextYOffsets.map(y => y + shift)
    result.set(id, { ...lane, expressionTextYOffsets,
      requiredBelow: Math.max(original.requiredBelow, lane.hairpinYOffset + 28.9, ...expressionTextYOffsets.map(y => y + 18)) })
  }
  return result
}
