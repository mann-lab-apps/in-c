import { readSvgShapeInk } from './staff-ink-spacing'
import { isVisibleSvgPaint } from './system-ink-spacing'

interface SpanPointerOwner { kind: 'slur' | 'hairpin'; id: string }

/** Keep broad hit targets, but prefer a unique painted stroke over their DOM order. */
export function resolveSpanPointerOwner(
  fallback: SVGElement, clientX: number, clientY: number
): SpanPointerOwner | undefined {
  const svg = fallback.ownerSVGElement
  if (!fallback.isConnected || !svg || ![clientX, clientY].every(Number.isFinite)) return undefined
  try {
    const owners = new Map<string, SpanPointerOwner>()
    for (const group of svg.querySelectorAll<SVGElement>('.notation-span-target[role="button"]')) {
      if (group.ownerSVGElement !== svg) continue
      const { spanKind: kind, spanId: id } = group.dataset
      if ((kind !== 'slur' && kind !== 'hairpin') || !id) continue
      for (const node of group.querySelectorAll<SVGGeometryElement>('.notation-slur,.notation-hairpin line')) {
        const style = getComputedStyle(node)
        if (!isVisibleSvgPaint(style.stroke) || style.strokeOpacity === '0' || !(parseFloat(style.strokeWidth) > 0)) continue
        const ink = readSvgShapeInk(node)
        if (!ink || ![ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) || ink.width <= 0 || ink.height <= 0) continue
        if (typeof node.isPointInStroke !== 'function') return undefined
        const screen = node.getScreenCTM()
        if (!screen) return undefined
        const matrix = screen.inverse()
        const x = matrix.a * clientX + matrix.c * clientY + matrix.e
        const y = matrix.b * clientX + matrix.d * clientY + matrix.f
        if (![x, y].every(Number.isFinite)) return undefined
        if (node.isPointInStroke({ x, y })) owners.set(JSON.stringify([kind, id]), { kind, id })
      }
    }
    return owners.size === 1 ? owners.values().next().value : undefined
  } catch { return undefined }
}
