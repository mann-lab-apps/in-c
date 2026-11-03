import type { Score } from '../../../score-core'
import type { MeasureAnnotationLanes } from './annotation-lanes'
import { createStaffAnnotationSpacing, type MeasureTextInk, type StaffAnnotationSpacing } from './staff-annotation-spacing'
import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'
import { isVisibleSvgPaint } from './system-ink-spacing'

export interface LabelInk { x: number; y: number; width: number; height: number }

export function localStaffLabelShifts(
  score: Score, indices: readonly number[], lanes: ReadonlyMap<string, MeasureAnnotationLanes>,
  measureInk: MeasureTextInk, global: StaffAnnotationSpacing, lyricScale = 1,
  lyricOffsets: ReadonlyMap<number, number> = new Map()
): readonly number[] {
  const unchanged = global.labelBaselines.map(() => 0)
  const count = score.parts[0]?.staves[0]?.measures.length ?? 0
  if (!global.measured || !indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= count)) return unchanged
  const selected = new Set(indices)
  const local: Score = { ...score, parts: score.parts.map(part => ({ ...part, staves: part.staves.map(staff => ({
    ...staff, measures: staff.measures.filter((_, index) => selected.has(index))
  })) })) }
  const spacing = createStaffAnnotationSpacing(local, lanes, measureInk, lyricScale, lyricOffsets)
  if (!spacing.measured || spacing.labelBaselines.length !== unchanged.length) return unchanged
  return spacing.labelBaselines.map((baseline, index) => {
    const shift = baseline - global.labelBaselines[index]
    return Number.isFinite(shift) && shift > .05 ? shift : 0
  })
}

const validInk = (b: LabelInk) => [b.x,b.y,b.width,b.height].every(Number.isFinite) && b.width > 0 && b.height > 0
export function resolveStaffLabelShift(current: LabelInk, desired: number, obstacles: readonly LabelInk[]): number {
  if (!validInk(current) || !Number.isFinite(desired) || desired <= .05) return 0
  const candidate = { ...current, y: current.y + desired }
  for (const ink of obstacles) {
    if (!validInk(ink)) return 0
    if (candidate.x < ink.x + ink.width + 6 && candidate.x + candidate.width > ink.x - 6 &&
      candidate.y < ink.y + ink.height + 6 && candidate.y + candidate.height > ink.y - 6) return 0
  }
  return desired
}

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

/** Labels alone may relax after all music/spans paint; uncertainty keeps the old baseline. */
export function applyStaffLabelShifts(svg: SVGSVGElement, proposed: ReadonlyMap<SVGTextElement, number>): void {
  if (![...proposed.values()].some(shift => Number.isFinite(shift) && shift > .05) ||
    document.fonts?.status !== 'loaded' || typeof svg.getCTM !== 'function') return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  if ([...svg.querySelectorAll<SVGElement>('use,image,foreignObject')].some(painted)) return
  const labels = new Map<SVGTextElement, LabelInk>(), obstacles: LabelInk[] = []
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('text,path,line,circle,ellipse,rect,polygon,polyline')) {
    if (node.closest('defs,clipPath,mask') || !painted(node)) continue
    const text = node.tagName.toLowerCase() === 'text'
    if (text && !node.textContent?.trim()) continue
    if (text && node.querySelector('tspan')) return
    const ink = text ? readSvgTextInk(node as SVGTextElement, context) : readSvgShapeInk(node)
    if (!ink || ![ink.x,ink.y,ink.width,ink.height].every(Number.isFinite)) return
    if (ink.width === 0 || ink.height === 0) continue
    if (!validInk(ink)) return
    if (node.classList.contains('notation-staff-label')) labels.set(node as SVGTextElement, ink)
    else obstacles.push(ink)
  }
  for (const [label, desired] of proposed) {
    const current = labels.get(label), y = Number(label.getAttribute('y'))
    if (!current || label.parentNode !== svg || !Number.isFinite(y)) continue
    const shift = resolveStaffLabelShift(current, desired, [...obstacles, ...[...labels].filter(([node]) => node !== label).map(([, ink]) => ink)])
    if (shift > 0) {
      label.setAttribute('y', String(y + shift))
      labels.set(label, { ...current, y: current.y + shift })
    }
  }
}
