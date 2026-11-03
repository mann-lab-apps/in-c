import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'

export interface PrintSystemBand {
  systemIndex: number
  origin: number
  top: number
  bottom: number
  breakBefore?: boolean
}
/** Collect actual painted system envelopes once for page repair and output
 * validation. Selection geometry and fixed page furniture are not system ink. */
export function readPrintSystemInk(
  svg: SVGSVGElement, context: CanvasRenderingContext2D,
  origins: ReadonlyMap<number,number>, measureSystems: ReadonlyMap<string,number|undefined>,
  breaks: ReadonlySet<number> = new Set()
): {bands: PrintSystemBand[]; unknown: number; globalBottom: number} {
    const bands=new Map<number,PrintSystemBand>()
    let unknown=0,globalBottom=-Infinity
    for (const node of svg.querySelectorAll<SVGGraphicsElement>('text,path,line,circle,ellipse,polygon,polyline,rect')) {
      if (node.closest('defs,clipPath,mask,.notation-measure-layer,.notation-state-overlays,.notation-range-selection-layer') || node.classList.contains('notation-span-hit')) continue
      const b=node.tagName.toLowerCase()==='text' ? readSvgTextInk(node as SVGTextContentElement,context) : readSvgShapeInk(node)
      if (!b || b.width<=0 || b.height<=0) continue
      if (node.closest('[data-print-global="true"]')) {globalBottom=Math.max(globalBottom,b.y+b.height);continue}
      const explicit=node.closest<SVGElement>('[data-system-index]')?.dataset.systemIndex
      const measure=node.closest<SVGElement>('[data-print-measure-id]')?.dataset.printMeasureId ?? node.closest<SVGElement>('[data-measure-id]')?.dataset.measureId ??
        node.dataset.ornamentMeasureId ?? node.dataset.fermataMeasureId ?? node.dataset.articulationMeasureId
      const system=explicit!==undefined ? Number(explicit) : measure ? measureSystems.get(measure) : undefined
      if (system===undefined || !Number.isInteger(system) || !origins.has(system)) {unknown++;continue}
      const old=bands.get(system)
      bands.set(system,{systemIndex:system,origin:origins.get(system)!,top:Math.min(old?.top??Infinity,b.y),bottom:Math.max(old?.bottom??-Infinity,b.y+b.height),breakBefore:breaks.has(system)})
    }
    if (svg.querySelector('image,use,foreignObject') || bands.size!==origins.size) unknown++
    return {bands:[...bands.values()],unknown,globalBottom}
}
