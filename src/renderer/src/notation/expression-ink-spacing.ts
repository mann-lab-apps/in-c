import type { MeasureAnnotationLanes } from './annotation-lanes'
import { readSvgTextInk, type MeasureInkOwner, type StaffInk } from './staff-ink-spacing'

type ExpressionInk = StaffInk & { measureId: string }

export function resolveExpressionInkOffsets(obstacles: readonly StaffInk[], texts: readonly ExpressionInk[], existing: ReadonlyMap<string,number>): ReadonlyMap<string,number> {
  const deficits = new Map<string,number>()
  for (const text of texts) for (const obstacle of obstacles) {
    if (![text.x,text.y,text.width,text.height,obstacle.x,obstacle.y,obstacle.width,obstacle.height].every(Number.isFinite) || text.width<=0 || text.height<=0 || obstacle.width<=0 || obstacle.height<=0 ||
      text.staffIndex!==obstacle.staffIndex || text.systemIndex!==obstacle.systemIndex || Math.min(text.x+text.width,obstacle.x+obstacle.width)<=Math.max(text.x,obstacle.x)) continue
    const deficit = obstacle.y + obstacle.height + 8 - text.y
    if (deficit>0.05) deficits.set(text.measureId, Math.max(deficits.get(text.measureId)??0,deficit))
  }
  if (!deficits.size) return existing
  const next = new Map(existing)
  for (const [id,deficit] of deficits) next.set(id,(existing.get(id)??0)+Math.ceil((deficit+0.01)*100)/100)
  return next
}

export function applyExpressionInkOffsets(lanes: ReadonlyMap<string,MeasureAnnotationLanes>, offsets: ReadonlyMap<string,number>): Map<string,MeasureAnnotationLanes> {
  const next = new Map(lanes)
  for (const [id,offset] of offsets) {
    const lane = lanes.get(id)
    if (!lane || !Number.isFinite(offset) || offset<=0 || !lane.expressionTextYOffsets.length) continue
    const expressionTextYOffsets = lane.expressionTextYOffsets.map(y=>y+offset)
    next.set(id,{...lane,expressionTextYOffsets,requiredBelow:Math.max(lane.requiredBelow,...expressionTextYOffsets.map(y=>y+18))})
  }
  return next
}

export function measureExpressionInkOffsets(svg: SVGSVGElement, owners: ReadonlyMap<string,MeasureInkOwner|undefined>, obstacles: readonly StaffInk[], existing: ReadonlyMap<string,number>): ReadonlyMap<string,number> {
  const nodes=[...svg.querySelectorAll<SVGTextContentElement>('.notation-expression-text[data-measure-id]')]
  if (!nodes.length || !document.fonts || typeof svg.getCTM!=='function') return existing
  const context=document.createElement('canvas').getContext('2d')
  if (!context) return existing
  const texts=nodes.flatMap(node=>{
    const measureId=node.dataset.measureId!,owner=owners.get(measureId),ink=readSvgTextInk(node,context)
    return owner&&ink?[{...ink,...owner,measureId}]:[]
  })
  return resolveExpressionInkOffsets(obstacles,texts,existing)
}
