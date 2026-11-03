import { readSvgTextInk, type MeasureInkOwner, type StaffInk } from './staff-ink-spacing'

export interface OwnedMeasureTextInk extends StaffInk { measureId: string }

/** Read painted text only; an unowned/unmeasurable mark remains conservative. */
export function readOwnedMeasureTextInk(
  svg: SVGSVGElement, owners: ReadonlyMap<string, MeasureInkOwner | undefined>,
  context: CanvasRenderingContext2D, selector: string
): { ink: OwnedMeasureTextInk[]; unresolved: boolean } {
  let unresolved = false
  const ink = [...svg.querySelectorAll<SVGTextContentElement>(selector)].flatMap(node => {
    if (node.ownerSVGElement !== svg) return []
    const measureId = node.dataset.measureId, owner = measureId ? owners.get(measureId) : undefined
    const bounds = readSvgTextInk(node, context)
    if (!owner || !bounds) unresolved = true
    return owner && bounds && measureId ? [{ ...bounds, ...owner, measureId }] : []
  })
  return { ink, unresolved }
}
