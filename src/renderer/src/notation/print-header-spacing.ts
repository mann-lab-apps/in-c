import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'

/** Header bounds and first notation ink are in the same SVG coordinate space. */
export function resolvePrintHeaderInset(headerBottom: number, firstInk: number, cssScale: number, existing: number): number {
  if (![headerBottom, firstInk, cssScale, existing].every(Number.isFinite) || cssScale <= 0 || existing < 0) return existing
  const deficit = headerBottom + 8 / cssScale - firstInk
  return deficit > 0.05 ? existing + Math.ceil(deficit * 100) / 100 : existing
}

interface HeaderInkBounds { x: number; y: number; width: number; height: number }

export function resolvePrintHeaderInkInset(headings: readonly HeaderInkBounds[], notation: readonly HeaderInkBounds[], cssScale: number, existing: number): number {
  const valid = (b: HeaderInkBounds) => [b.x,b.y,b.width,b.height].every(Number.isFinite) && b.width>0 && b.height>0
  let next = existing
  for (const heading of headings) for (const ink of notation) {
    if (!valid(heading) || !valid(ink) || Math.min(heading.x+heading.width,ink.x+ink.width)<=Math.max(heading.x,ink.x)) continue
    next = Math.max(next, resolvePrintHeaderInset(heading.y+heading.height,ink.y,cssScale,existing))
  }
  return next
}

/** Conservative rendered text-line envelopes, not the full-width heading box.
 * They intentionally reserve word spacing; empty author placeholders have no ink.
 * SVG notation continues to use actual glyph and stroke bounds below. */
function readHeaderTextLines(header: HTMLElement, inverse: DOMMatrix): HeaderInkBounds[] {
  const boxes: HeaderInkBounds[] = [], walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode, parent = node.parentElement
    if (!node.textContent?.trim() || !parent) continue
    const style = getComputedStyle(parent)
    if (style.display==='none' || style.visibility==='hidden' || style.opacity==='0') continue
    const range = document.createRange(); range.selectNodeContents(node)
    for (const rect of range.getClientRects()) if (rect.width>0 && rect.height>0) boxes.push({
      x: inverse.a*rect.left+inverse.c*rect.top+inverse.e,
      y: inverse.b*rect.left+inverse.d*rect.top+inverse.f,
      width: rect.width*inverse.a, height: rect.height*inverse.d
    })
  }
  return boxes
}

/** The immutable snapshot uses print typography even before print media starts. */
export function measurePrintHeaderInset(svg: SVGSVGElement, header: HTMLElement | null, existing: number): number {
  if (!header || !document.fonts) return existing
  try {
    const box = header.getBoundingClientRect(), matrix = svg.getScreenCTM()
    if (!matrix || box.height <= 0 || box.width <= 0 || matrix.a <= 0 || matrix.d <= 0 || matrix.b || matrix.c) return existing
    const headings = readHeaderTextLines(header, matrix.inverse())
    if (!headings.length) return existing
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return existing
    const ink = [
      ...[...svg.querySelectorAll<SVGTextContentElement>('text')].map(node => readSvgTextInk(node, context)),
      ...[...svg.querySelectorAll<SVGGraphicsElement>('path,line,polygon,polyline,circle,ellipse,rect')].map(readSvgShapeInk)
    ].filter((bounds): bounds is NonNullable<typeof bounds> => Boolean(bounds &&
      [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) && bounds.width > 0 && bounds.height > 0))
    if (!ink.length) return existing
    return resolvePrintHeaderInkInset(headings, ink, matrix.d, existing)
  } catch { return existing } // Non-rendering tests cannot approve actual font layout.
}
