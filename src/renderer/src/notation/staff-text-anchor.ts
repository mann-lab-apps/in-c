import { readSvgShapeInk, readSvgTextInk, type MeasureInkOwner, type StaffInk } from './staff-ink-spacing'
import { isVisibleSvgPaint } from './system-ink-spacing'

type Ink = Pick<StaffInk, 'x' | 'y' | 'width' | 'height'>
const valid = (b: Ink) => [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0
function painted(node: SVGElement): boolean {
  for (let parent: Element | null = node; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' ||
      [...parent.classList].some(name => name.endsWith('-hit')) ||
      parent.classList.contains('notation-note-input-cursor') ||
      parent.classList.contains('notation-range-selection-layer') ||
      parent.classList.contains('notation-playhead')) return false
    if (parent.tagName.toLowerCase() === 'svg') break
  }
  const style = getComputedStyle(node)
  return (isVisibleSvgPaint(style.fill) && style.fillOpacity !== '0') ||
    (isVisibleSvgPaint(style.stroke) && style.strokeOpacity !== '0')
}

/** Move only automatic staff text. Onsets/top lines come from the existing
 * formatted stave, never its constructor origin or a note's font/em box.
 * Measured neighboring-staff clearance remains the staff/system layout's job.
 */
export function applyStaffTextAnchors(
  svg: SVGSVGElement,
  owners: ReadonlyMap<string, MeasureInkOwner | undefined>,
  spanInk: readonly StaffInk[] = []
): StaffInk[] {
  const texts = [...svg.querySelectorAll<SVGTextElement>('.notation-staff-text[data-staff-anchor-x]')]
  if (!texts.length || document.fonts?.status !== 'loaded' || typeof svg.getCTM !== 'function') return []
  if ([...svg.querySelectorAll<SVGElement>('use,image,foreignObject')].some(painted)) return []
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return []
  const ownerOf = (node: SVGElement) => {
    const ref = node.closest<SVGElement>('[data-measure-id],[data-print-measure-id],[data-fermata-measure-id],[data-ornament-measure-id]')
    const owner = owners.get(ref?.dataset.measureId ?? ref?.dataset.printMeasureId ?? ref?.dataset.fermataMeasureId ?? ref?.dataset.ornamentMeasureId ?? '')
    if (owner) return owner
    if (node.classList.contains('notation-staff-label')) return [...owners.values()].find(value => value &&
      value.partId === node.dataset.partId && value.staffId === node.dataset.staffId && value.systemIndex === Number(node.dataset.systemIndex))
    return undefined
  }
  const measured = new Map<SVGGraphicsElement, { ink: Ink; owner?: MeasureInkOwner }>()
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('text,path,line,circle,ellipse,rect,polygon,polyline')) {
    if (node.closest('defs,clipPath,mask') || !painted(node) || node.classList.contains('notation-tempo-marking--transparent')) continue
    const text = node.tagName.toLowerCase() === 'text'
    if (text && !node.textContent?.trim()) continue
    if (text && node.querySelector('tspan')) return []
    const ink = text ? readSvgTextInk(node as SVGTextElement, context) : readSvgShapeInk(node)
    if (!ink || ![ink.x, ink.y, ink.width, ink.height].every(Number.isFinite)) return []
    if (!ink.width || !ink.height) continue
    if (!valid(ink)) return []
    measured.set(node, { ink, owner: ownerOf(node) })
  }
  const relocated: StaffInk[] = []
  // Bottom row first; preserve DOM/model/keyboard order while higher rows clear it.
  const ordered = [...texts].sort((a, b) => Number(b.dataset.staffAnchorY) - Number(a.dataset.staffAnchorY))
  for (const text of ordered) {
    const before = measured.get(text), owner = ownerOf(text)
    const x = Number(text.dataset.staffAnchorX), y = Number(text.dataset.staffAnchorY), space = Number(text.dataset.staffAnchorSpace)
    const oldX = Number(text.getAttribute('x')), oldY = Number(text.getAttribute('y'))
    if (!owner || !before || ![x, y, oldX, oldY, space].every(Number.isFinite) || space <= 0 || !painted(text)) continue
    // VexFlow pixel-aligns painted staff strokes half a device-independent SVG
    // unit away from getYForLine(). Use five measured horizontal stroke centers,
    // not a hard-coded half pixel or the stroke's outer edge.
    const lineCenters = [...measured].flatMap(([node, item]) =>
      node.closest<SVGElement>('.vf-stave')?.dataset.measureId === text.dataset.measureId &&
      item.ink.width > space * 4 && item.ink.height <= space / 3 ? [item.ink.y + item.ink.height / 2] : [])
      .sort((a, b) => a - b).filter((value, index, all) => index === 0 || value - all[index - 1] > .1)
    const apiTop = Number(text.dataset.staffAnchorTop)
    const alignedTop = lineCenters.length === 5 && lineCenters.every((value, index) => Math.abs(value - lineCenters[0] - index * space) < .1)
    if (text.dataset.staffAnchorTop !== undefined && (!Number.isFinite(apiTop) || !alignedTop)) continue
    const topCorrection = alignedTop && Number.isFinite(apiTop) ? lineCenters[0] - apiTop : 0
    const candidate = { ...before.ink, x: before.ink.x + x - oldX, y: before.ink.y + y + topCorrection - oldY }
    // Fit the complete automatic ink if possible, never abbreviate or scale it.
    const width = Number(svg.getAttribute('width'))
    if (width > 8 && candidate.width <= width - 8) candidate.x += candidate.x < 4 ? 4 - candidate.x : Math.min(0, width - 4 - candidate.x - candidate.width)
    const sameStaff = (other?: MeasureInkOwner) => !other || (other.staffIndex === owner.staffIndex && other.systemIndex === owner.systemIndex)
    const obstacles = [...measured].flatMap(([node, item]) => node === text || !sameStaff(item.owner) ? [] : [item.ink])
    obstacles.push(...spanInk.filter(ink => ink.staffIndex === owner.staffIndex && ink.systemIndex === owner.systemIndex && valid(ink)))
    const gap = space / 2
    for (const ink of obstacles.sort((a, b) => b.y - a.y)) {
      if (candidate.x < ink.x + ink.width && candidate.x + candidate.width > ink.x &&
        candidate.y < ink.y + ink.height + gap && candidate.y + candidate.height > ink.y - gap) {
        candidate.y = ink.y - gap - candidate.height
      }
    }
    text.setAttribute('x', String(oldX + candidate.x - before.ink.x))
    text.setAttribute('y', String(oldY + candidate.y - before.ink.y))
    measured.set(text, { ink: candidate, owner })
    const hit = text.parentElement?.querySelector<SVGRectElement>(':scope > .notation-staff-text-hit')
    if (hit) for (const [key, value] of Object.entries(candidate)) hit.setAttribute(key, String(value))
    relocated.push({ ...candidate, ...owner })
  }
  return relocated
}
