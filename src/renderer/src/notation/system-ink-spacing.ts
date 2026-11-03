/** Layout-only envelopes in the final SVG coordinate space, never selection boxes. */
export interface SystemInk {
  x: number
  y: number
  width: number
  height: number
  systemIndex: number
}

const CLEARANCE = 8
export const isVisibleSvgPaint = (paint: string) => paint !== '' && paint !== 'none' && paint !== 'transparent' &&
  !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(paint)
const valid = (ink: SystemInk) => Number.isInteger(ink.systemIndex) && ink.systemIndex >= 0 &&
  [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) && ink.width > 0 && ink.height > 0

export function resolveSystemInkSpacing(
  spans: readonly SystemInk[],
  followingText: readonly SystemInk[],
  existing: ReadonlyMap<number, number>
): ReadonlyMap<number, number> {
  const deficits = new Map<number, number>()
  for (const text of followingText) {
    if (!valid(text)) continue
    for (const span of spans) {
      if (!valid(span) || text.systemIndex !== span.systemIndex + 1 ||
        Math.min(span.x + span.width, text.x + text.width) <= Math.max(span.x, text.x)) continue
      const deficit = span.y + span.height + CLEARANCE - text.y
      if (deficit > 0.05) deficits.set(span.systemIndex, Math.max(deficits.get(span.systemIndex) ?? 0, deficit))
    }
  }
  if (!deficits.size) return existing
  const next = new Map(existing)
  for (const [index, deficit] of deficits) next.set(index, (existing.get(index) ?? 0) + Math.ceil(deficit * 100) / 100)
  return next
}

export function measureSystemInkSpacing(
  svg: SVGSVGElement,
  measureSystems: ReadonlyMap<string, number | undefined>,
  existing: ReadonlyMap<number, number>
): ReadonlyMap<number, number> {
  const read = (element: SVGGraphicsElement, systemIndex: number | undefined): SystemInk[] => {
    if (systemIndex === undefined) return []
    try {
      const b = element.getBBox(), style = getComputedStyle(element)
      const stroke = isVisibleSvgPaint(style.stroke) && style.strokeOpacity !== '0'
        ? (parseFloat(style.strokeWidth) || 0) / 2 : 0
      return [{ x: b.x - stroke, y: b.y - stroke, width: b.width + 2 * stroke,
        height: b.height + 2 * stroke, systemIndex }]
    } catch { return [] } // No SVG metrics in non-rendering environments.
  }
  const spans = [...svg.querySelectorAll<SVGGraphicsElement>('.vf-stavetie[data-system-index] path,.notation-slur[data-system-index]')]
    .flatMap(element => {
      const owner = element.matches('.notation-slur') ? element : element.closest<SVGElement>('.vf-stavetie')
      return read(element, owner?.dataset.systemIndex === undefined ? undefined : Number(owner.dataset.systemIndex))
    })
  const text = [...svg.querySelectorAll<SVGGraphicsElement>('.notation-harmony-mark')]
    .flatMap(element => read(element, measureSystems.get(element.dataset.measureId ?? '')))
  return resolveSystemInkSpacing(spans, text, existing)
}
