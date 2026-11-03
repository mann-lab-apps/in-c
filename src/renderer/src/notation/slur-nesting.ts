import type { AutomaticSlurCurve } from './slur-fermata-spacing'
import { readSvgShapeInk } from './staff-ink-spacing'

export interface SlurNestingEntry {
  index: number
  automatic: boolean
  voiceKey?: string
  staffIndex?: number
  systemIndex?: number
  startX?: number
  endX?: number
}

/** Strict endpoint ownership shared by automatic ordering and authored guards. */
export function strictlyContainsSlur(outer:SlurNestingEntry,inner:SlurNestingEntry) {
  const valid=(entry:SlurNestingEntry)=>Boolean(entry.voiceKey)&&
    Number.isInteger(entry.staffIndex)&&entry.staffIndex!>=0&&
    Number.isInteger(entry.systemIndex)&&entry.systemIndex!>=0&&
    Number.isFinite(entry.startX)&&Number.isFinite(entry.endX)&&entry.endX!>entry.startX!
  return valid(outer)&&valid(inner)&&outer.voiceKey===inner.voiceKey&&
    outer.staffIndex===inner.staffIndex&&outer.systemIndex===inner.systemIndex&&
    inner.startX!>outer.startX!+8&&inner.endX!<outer.endX!-8
}

/** Compute inner geometry first, while leaving source and final DOM order alone. */
export function planSlurNesting(entries: readonly SlurNestingEntry[]) {
  const valid = (entry: SlurNestingEntry) => entry.automatic && Boolean(entry.voiceKey) &&
    Number.isInteger(entry.staffIndex) && entry.staffIndex! >= 0 &&
    Number.isInteger(entry.systemIndex) && entry.systemIndex! >= 0 &&
    Number.isFinite(entry.startX) && Number.isFinite(entry.endX) && entry.endX! > entry.startX!
  const innerByIndex = new Map<number, number[]>()
  for (const outer of entries) {
    if (!valid(outer)) continue
    const inner = entries.filter(entry => valid(entry) && strictlyContainsSlur(outer,entry)).map(entry => entry.index)
    if (inner.length) innerByIndex.set(outer.index, inner)
  }
  const remaining = new Set(entries.map(entry => entry.index)), order: number[] = []
  while (remaining.size) {
    const next = entries.find(entry => remaining.has(entry.index) &&
      !(innerByIndex.get(entry.index) ?? []).some(index => remaining.has(index)))
    if (!next) break
    order.push(next.index); remaining.delete(next.index)
  }
  return { order: [...order, ...remaining], innerByIndex }
}

/** Exact extrema per narrow quadratic segment; never the whole empty bow box. */
export function slurCurveInk(curve: AutomaticSlurCurve) {
  const { x1, x2, controlX, y1, y2, controlY, strokeWidth } = curve
  if (![x1, x2, controlX, y1, y2, controlY, strokeWidth].every(Number.isFinite) ||
    x2 <= x1 || controlX < x1 || controlX > x2 || strokeWidth <= 0) return []
  const steps = Math.min(2048, Math.ceil((x2 - x1) / 2)), half = strokeWidth / 2
  const at = (a: number, c: number, b: number, t: number) => (1-t)*(1-t)*a + 2*(1-t)*t*c + t*t*b
  const range = (a: number, c: number, b: number, lo: number, hi: number) => {
    const values = [at(a,c,b,lo), at(a,c,b,hi)], denominator = a - 2*c + b
    const extremum = denominator ? (a-c)/denominator : -1
    if (extremum > lo && extremum < hi) values.push(at(a,c,b,extremum))
    return [Math.min(...values)-half, Math.max(...values)+half]
  }
  return Array.from({ length: steps }, (_, index) => {
    const [left,right] = range(x1,controlX,x2,index/steps,(index+1)/steps)
    const [top,bottom] = range(y1,controlY,y2,index/steps,(index+1)/steps)
    return { x:left, y:top, width:right-left, height:bottom-top, collisionOnly:true as const }
  })
}

/** Only the renderer's measured M/Q stroke is supported; unknown paths stay legacy. */
export function readSlurCurveInk(path: SVGPathElement) {
  try {
    if (!readSvgShapeInk(path)) return []
    const tokens = path.getAttribute('d')?.trim().split(/\s+/)
    if (!tokens || tokens.length !== 8 || tokens[0] !== 'M' || tokens[3] !== 'Q') return []
    const [x1,y1,controlX,controlY,x2,y2] = [1,2,4,5,6,7].map(index => Number(tokens[index]))
    const root = path.ownerSVGElement?.getCTM(), matrix = path.getCTM()
    if (!root || !matrix) return []
    const transform = root.inverse().multiply(matrix)
    return slurCurveInk({ x1,y1,controlX,controlY,x2,y2,side:'below',
      strokeWidth:parseFloat(getComputedStyle(path).strokeWidth) }).map(ink => {
      const points = [[ink.x,ink.y],[ink.x+ink.width,ink.y],[ink.x,ink.y+ink.height],[ink.x+ink.width,ink.y+ink.height]]
        .map(([x,y]) => new DOMPoint(x,y).matrixTransform(transform))
      const x = Math.min(...points.map(point => point.x)), y = Math.min(...points.map(point => point.y))
      return { x,y,width:Math.max(...points.map(point => point.x))-x,
        height:Math.max(...points.map(point => point.y))-y,collisionOnly:true as const }
    })
  } catch { return [] }
}
