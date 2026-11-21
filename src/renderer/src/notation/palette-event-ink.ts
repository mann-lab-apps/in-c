import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'

/** UI-only principal body frame; never change hit geometry or engraving. */
export function readPaletteEventInk(event: SVGElement, context?: CanvasRenderingContext2D | null): DOMRect | undefined {
  const svg = event.ownerSVGElement
  if (!svg || !event.isConnected || !event.matches('.notation-event.vf-stavenote:not(.is-preview)')) return undefined
  try {
    const matrix = svg.getScreenCTM()
    const measure = context === undefined ? document.createElement('canvas').getContext('2d') : context
    if (!matrix || !measure) return undefined
    // Grace notes have nested stavenotes and an anonymous slash. Only principal
    // heads (including rests/chords), flags and stems belong to this cue.
    const principal = (node: Element) => node.closest('.vf-stavenote') === event
    const text = [...event.querySelectorAll<SVGTextContentElement>('.vf-notehead text, .vf-flag text')].filter(principal)
    const stems = [...event.querySelectorAll<SVGGraphicsElement>('.vf-stem path')].filter(principal)
    const ink = [...text.map(node => readSvgTextInk(node, measure)), ...stems.map(readSvgShapeInk)]
      .flatMap(bounds => !bounds || bounds.width <= 0 || bounds.height <= 0 ? [] :
        [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y],
          [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]]
          .map(([x, y]) => ({ x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f })))
    if (!ink.length || ink.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return undefined
    const left = Math.min(...ink.map(p => p.x)), right = Math.max(...ink.map(p => p.x))
    const top = Math.min(...ink.map(p => p.y)), bottom = Math.max(...ink.map(p => p.y))
    return right > left && bottom > top ? new DOMRect(left, top, right - left, bottom - top) : undefined
  } catch {
    // Keep textual target guidance; do not invent a frame from hit/em bounds.
    return undefined
  }
}
