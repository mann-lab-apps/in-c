import type { ScorePageSetup } from '../../../score-core'
import { planPngPages } from '../image-export/pages'
import { crossingPrintPage } from './print-page-ink'
import { readPrintSystemInk, type PrintSystemBand } from './print-system-ink'
export type { PrintSystemBand } from './print-system-ink'

export interface MeasuredPrintLayout {
  origins: ReadonlyMap<number, number>
  height: number
}
interface PageGrid { origin: number; height: number; headerBottom: number; tolerance?: number; viewportBottom?: number }

/** Repair measured crossings or a reservation-only leading page. Never change
 * glyphs or relative manual geometry; preserve other safe print placement. */
export function resolveMeasuredPrintLayout(
  bands: readonly PrintSystemBand[], page: PageGrid, previous?: MeasuredPrintLayout
): MeasuredPrintLayout | undefined {
  const tolerance = page.tolerance ?? .25
  if (!bands.length || ![page.origin,page.height,page.headerBottom,tolerance].every(Number.isFinite) || page.height <= 16 || tolerance < 0) return undefined
  let ordered = [...bands].sort((a,b)=>a.systemIndex-b.systemIndex)
  for (let i=0;i<ordered.length;i++) {
    const b=ordered[i]
    if (b.systemIndex!==i || ![b.origin,b.top,b.bottom].every(Number.isFinite) || b.origin<0 || b.bottom<=b.top ||
      b.bottom-b.top>page.height-16+tolerance || (i>0 && b.top<ordered[i-1].bottom-tolerance)) return undefined
  }
  // Model reservations can defer the whole score while its actual first band
  // fits beside the fixed header. Remove only whole leading page reservations,
  // unless a break explicitly precedes the first band. Later authored breaks
  // retain their relative next-page boundary on the shifted physical grid.
  const leadingPages = ordered[0].breakBefore ? 0 : Math.max(0,Math.floor((ordered[0].top-page.origin+tolerance)/page.height))
  if (leadingPages) {
    const shift = leadingPages * page.height
    ordered = ordered.map(b=>({...b,origin:b.origin-shift,top:b.top-shift,bottom:b.bottom-shift}))
  }
  const origins = new Map<number,number>()
  let previousBottom = -Infinity, previousOrigin = -Infinity, changed = leadingPages > 0, lastBottom = page.headerBottom
  for (const b of ordered) {
    const height=b.bottom-b.top
    const minimumPage=b.breakBefore && Number.isFinite(previousOrigin)
      ? Math.max(0,Math.floor((b.origin-page.origin)/page.height),Math.floor((previousOrigin-page.origin)/page.height)+1) : 0
    let index=Math.max(0,Math.floor((b.top-page.origin+tolerance)/page.height),minimumPage)
    let top=b.top
    const crosses=crossingPrintPage(b.top-page.origin,b.bottom-page.origin,page.height)!==undefined
    if (crosses || b.top<page.origin-tolerance || b.top<previousBottom || Math.floor((b.top-page.origin+tolerance)/page.height)<minimumPage ||
      (leadingPages>0 && b.systemIndex===0 && b.top<page.headerBottom+8)) {
      const lower=()=>Math.max(page.origin+index*page.height+8,previousBottom+8,index===0?page.headerBottom+8:-Infinity)
      const upper=()=>page.origin+(index+1)*page.height-8-height
      if (lower()>upper()+tolerance) {
        // Do not orphan the first system's fixed header/tempo on its own page.
        if (b.systemIndex===0) return undefined
        index=Math.max(index+1,Math.floor((previousBottom+8-page.origin)/page.height))
      }
      if (lower()>upper()+tolerance) return undefined
      top=Math.max(lower(),Math.min(top,upper()))
    }
    const y=top===b.top ? b.origin : b.origin+top-b.top
    if (y<0 || !Number.isFinite(y)) return undefined
    origins.set(b.systemIndex,y)
    changed ||= Math.abs(y-b.origin)>.05
    previousBottom=top+height;previousOrigin=y;lastBottom=Math.max(lastBottom,previousBottom)
  }
  if (!changed) {
    // A measured, fully owned score can already have safe system origins while
    // its model-only final reservation creates a wholly blank output page.
    // Keep normal final-page whitespace and the same manual/system positions.
    const bottom = page.viewportBottom
    const inkHeight = Math.max(190,lastBottom+8)
    if (bottom !== undefined && Number.isFinite(bottom) && bottom > inkHeight &&
      Math.ceil((bottom-page.origin-tolerance)/page.height) > Math.ceil((inkHeight-page.origin)/page.height)) {
      if (previous && Math.abs(previous.height-inkHeight)<.05 &&
        ordered.every(b=>Math.abs((previous.origins.get(b.systemIndex)??NaN)-b.origin)<.05)) return previous
      return {origins,height:inkHeight}
    }
    return previous
  }
  // Trim only the unused final reservation, leaving real ink and an AA gutter.
  return {origins,height:Math.max(190,lastBottom+4)}
}

/** Keep the first oversized prefix fixed and unprintable. Later systems may
 * move forward on the output surface so a complete normal system does not
 * share a physical page with an oversized neighbour. Relative manual ink is
 * unchanged; the strict planner still handles ordinary/manual-overlap cases. */
function resolvePrintAfterOversized(
  bands: readonly PrintSystemBand[], page: PageGrid, previous?: MeasuredPrintLayout
): MeasuredPrintLayout | undefined {
  const tolerance=page.tolerance??.25
  if (!bands.length || ![page.origin,page.height,page.headerBottom,tolerance].every(Number.isFinite) || page.height<=16 || tolerance<0) return
  const ordered=[...bands].sort((a,b)=>a.systemIndex-b.systemIndex)
  let firstOversized=-1
  for (let i=0;i<ordered.length;i++) {
    const b=ordered[i]
    if (b.systemIndex!==i || ![b.origin,b.top,b.bottom].every(Number.isFinite) || b.origin<0 || b.bottom<=b.top ||
      (i>0 && b.origin<ordered[i-1].origin)) return
    if (firstOversized<0 && b.bottom-b.top>page.height+tolerance) firstOversized=i
  }
  if (firstOversized<0 || firstOversized===ordered.length-1) return
  const oversized=(b:PrintSystemBand)=>b.bottom-b.top>page.height+tolerance
  for (let i=firstOversized+1;i<ordered.length;i++) {
    if ((!oversized(ordered[i]) && ordered[i].bottom-ordered[i].top>page.height-16+tolerance) ||
      (!oversized(ordered[i]) && !oversized(ordered[i-1]) && ordered[i].top<ordered[i-1].bottom-tolerance)) return
  }
  const prefix=ordered.slice(0,firstOversized+1)
  const origins=new Map(prefix.map(b=>[b.systemIndex,b.origin]))
  let previousBottom=Math.max(page.headerBottom,...prefix.map(b=>b.bottom))
  let previousOrigin=prefix[prefix.length-1].origin,lastBottom=previousBottom,changed=false,previousOversized=true
  for (const b of ordered.slice(firstOversized+1)) {
    const height=b.bottom-b.top
    const isOversized=oversized(b)
    const authoredPage=b.breakBefore ? Math.max(0,Math.floor((b.origin-page.origin)/page.height),Math.floor((previousOrigin-page.origin)/page.height)+1) : 0
    // The oversized guard rejects any page touched by that system. Isolate
    // complete neighbours even when the remaining fragment could fit beside it.
    const minimumPage=Math.max(authoredPage,previousOversized || isOversized ? Math.ceil((previousBottom-page.origin)/page.height) : 0)
    let index=Math.max(0,Math.floor((b.top-page.origin+tolerance)/page.height),minimumPage),top=b.top
    if (crossingPrintPage(b.top-page.origin,b.bottom-page.origin,page.height)!==undefined || b.top<previousBottom ||
      Math.floor((b.top-page.origin+tolerance)/page.height)<minimumPage) {
      index=Math.max(index,Math.floor((previousBottom+8-page.origin)/page.height))
      const lower=()=>Math.max(b.top,previousBottom+8,page.origin+index*page.height+8)
      top=lower()
      if (!isOversized && top+height>page.origin+(index+1)*page.height-8+tolerance) {index++;top=lower()}
      if (!isOversized && top+height>page.origin+(index+1)*page.height-8+tolerance) return
    }
    const y=b.origin+(top-b.top)
    if (!Number.isFinite(y) || y<b.origin) return
    origins.set(b.systemIndex,y);changed ||= Math.abs(y-b.origin)>.05
    previousBottom=top+height;previousOrigin=y;previousOversized=isOversized;lastBottom=Math.max(lastBottom,previousBottom)
  }
  return changed ? {origins,height:Math.max(190,lastBottom+4)} : previous
}

/** Measure the immutable output surface in SVG units on the actual paper grid.
 * Unknown paint ownership disables the repair; the existing output guard stays. */
export function measurePrintPageLayout(
  svg: SVGSVGElement, host: HTMLElement, header: HTMLElement | null,
  origins: ReadonlyMap<number,number>, measureSystems: ReadonlyMap<string,number|undefined>,
  breaks: ReadonlySet<number>, paper: Required<ScorePageSetup>, previous?: MeasuredPrintLayout
): {layout?:MeasuredPrintLayout; unknown:number} {
  if (typeof svg.getCTM!=='function' || !document.fonts) return {unknown:0}
  try {
    const rect=svg.getBoundingClientRect(), hr=host.getBoundingClientRect(), box=svg.viewBox.baseVal
    if (rect.width<=0 || hr.width<=0 || box.width<=0) return {unknown:0}
    const scale=rect.width/box.width, offset=rect.top-hr.top-box.y*scale
    const pageHeight=planPngPages(hr,paper,150).contentPageHeight/scale
    const context=document.createElement('canvas').getContext('2d')
    if (!context) return {unknown:0}
    const {bands,unknown,globalBottom}=readPrintSystemInk(svg,context,origins,measureSystems,breaks)
    const headerBottom=Math.max(globalBottom,header ? (header.getBoundingClientRect().bottom-hr.top-offset)/scale : -offset/scale)
    if (unknown) return {unknown}
    const page={origin:-offset/scale,height:pageHeight,headerBottom,tolerance:.25/scale,viewportBottom:box.y+box.height}
    return {layout:resolveMeasuredPrintLayout(bands,page,previous) ?? resolvePrintAfterOversized(bands,page,previous),unknown:0}
  } catch { return {unknown:1} } // Measurement failure must not crash the editor.
}
