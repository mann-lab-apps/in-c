import { readSvgShapeInk, readSvgTextInk, type MeasureInkOwner } from './staff-ink-spacing'
import { isVisibleSvgPaint } from './system-ink-spacing'

interface Ink { x: number; y: number; width: number; height: number }
const valid = (b: Ink) => [b.x,b.y,b.width,b.height].every(Number.isFinite) && b.width > 0 && b.height > 0
const overlaps = (a: Ink, b: Ink) => a.x < b.x+b.width+8 && a.x+a.width > b.x-8 &&
  a.y < b.y+b.height+8 && a.y+a.height > b.y-8

function painted(node: SVGElement): boolean {
  for (let parent: Element | null = node; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' ||
      [...parent.classList].some(name => name.endsWith('-hit'))) return false
    if (parent.tagName.toLowerCase() === 'svg') break
  }
  const style = getComputedStyle(node)
  return (isVisibleSvgPaint(style.fill) && style.fillOpacity !== '0') ||
    (isVisibleSvgPaint(style.stroke) && style.strokeOpacity !== '0')
}

/** Relax only a lone automatic tempo after all authored ink has painted.
 * The renderer supplies the actual stave-origin/top-line difference. Unknown
 * paint, competing upper stacks, or a crossed manual shape keep the old lane.
 */
export function applyTempoStaffAnchors(svg: SVGSVGElement, owners: ReadonlyMap<string, MeasureInkOwner | undefined>): void {
  if (document.fonts?.status !== 'loaded' || typeof svg.getCTM !== 'function') return
  const tempos = [...svg.querySelectorAll<SVGTextElement>('.notation-tempo-marking--positioned')]
  if (!tempos.length || [...svg.querySelectorAll<SVGElement>('use,image,foreignObject')].some(painted)) return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  const inkByNode = new Map<SVGGraphicsElement, Ink>()
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('text,path,line,circle,ellipse,rect,polygon,polyline')) {
    if (node.closest('defs,clipPath,mask') || !painted(node)) continue
    // Hidden playback instructions retain their screen ghost, but that display
    // ink must not make visible notation disagree with the printed placement.
    if (node.classList.contains('notation-tempo-marking--transparent')) continue
    const text = node.tagName.toLowerCase() === 'text'
    if (text && !node.textContent?.trim()) continue
    if (text && node.querySelector('tspan')) return
    const ink = text ? readSvgTextInk(node as SVGTextElement, context) : readSvgShapeInk(node)
    if (!ink || ![ink.x,ink.y,ink.width,ink.height].every(Number.isFinite)) return
    if (ink.width === 0 || ink.height === 0) continue
    if (!valid(ink)) return
    inkByNode.set(node, ink)
  }
  for (const tempo of tempos) {
    const owner = owners.get(tempo.dataset.measureId ?? '')
    const before = inkByNode.get(tempo), delta = Number(tempo.dataset.tempoStaffDelta), y = Number(tempo.getAttribute('y'))
    if (!owner || !before || tempo.parentNode !== svg || tempo.classList.contains('notation-tempo-marking--transparent') ||
      !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(y)) continue
    // Preserve the existing upper-stack order even when the glyphs do not
    // overlap horizontally. A second tempo keeps the shared conservative lane.
    if (tempos.some(other => other !== tempo && !other.classList.contains('notation-tempo-marking--transparent') &&
        owners.get(other.dataset.measureId ?? '')?.systemIndex === owner.systemIndex) ||
      [...svg.querySelectorAll<SVGElement>('.notation-staff-text,.notation-system-text,.notation-rehearsal-mark,.notation-harmony-mark')]
        .some(node => painted(node) && owners.get(node.dataset.measureId ?? '')?.systemIndex === owner.systemIndex)) continue
    const sweep = { ...before, height: before.height + delta }
    if ([...inkByNode].some(([node, ink]) => node !== tempo && overlaps(sweep, ink))) continue
    tempo.setAttribute('y', String(y + delta))
    inkByNode.set(tempo, { ...before, y: before.y + delta })
  }
}
