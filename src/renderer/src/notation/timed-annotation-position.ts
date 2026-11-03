export interface TimedAnnotationAnchor { startX: number; centerX: number }
export interface TimedAnnotationLayout {
  durationTicks: number
  startX: number
  endX: number
  anchors: ReadonlyMap<number, TimedAnnotationAnchor>
}

/** Collect only real formatted onsets, after voice/shared-staff formatting.
 * Reordered voices choose the same leftmost anchor. Full-measure rest centering
 * is presentation, so callers leave those rests out of this rhythmic map. */
export function recordTimedAnnotationAnchor(
  anchors: Map<number, TimedAnnotationAnchor>, tick: number, beginX: number, endX: number
): void {
  if (![tick,beginX,endX].every(Number.isFinite)) return
  const previous = anchors.get(tick), centerX = (beginX + endX) / 2
  anchors.set(tick, { startX:Math.min(previous?.startX ?? Infinity, beginX), centerX:Math.min(previous?.centerX ?? Infinity, centerX) })
}

/** Exact onsets follow glyph columns. Other times interpolate between those
 * columns, not from the barline through clef/key/time-signature padding. */
export function resolveTimedAnnotationX(
  tick: number, layout: TimedAnnotationLayout, alignment: 'start' | 'center' = 'start'
): number {
  if (layout.durationTicks <= 0) return layout.startX
  const points = new Map([...layout.anchors].map(([time, point]) => [time, alignment === 'center' ? point.centerX : point.startX]))
  if (!points.has(0)) points.set(0, layout.startX)
  if (!points.has(layout.durationTicks)) points.set(layout.durationTicks, layout.endX)
  if (points.has(tick)) return points.get(tick)!
  const ordered = [...points].sort(([a],[b]) => a-b)
  const next = ordered.findIndex(([time]) => time > tick)
  const right = next < 0 ? ordered.length - 1 : Math.max(1, next)
  const [a,x] = ordered[right-1], [b,y] = ordered[right]
  // Keep out-of-bar times outside rather than silently clamping source anchors.
  return x + (y-x) * (tick-a) / (b-a)
}
