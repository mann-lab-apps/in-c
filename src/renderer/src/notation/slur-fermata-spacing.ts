import type { SystemInk } from './system-ink-spacing'

type InkBounds = Pick<SystemInk, 'x' | 'y' | 'width' | 'height'> & {
  /** Preserve ordinary bows already separated from notehead ink bounds. */
  collisionOnly?: boolean
}
export interface AutomaticSlurCurve {
  x1: number; x2: number; controlX: number
  y1: number; y2: number; controlY: number
  side: 'above' | 'below'; strokeWidth: number
}

interface SlurStemAttachment {
  startY: number; endY: number; side: 'above' | 'below'
  startStem?: InkBounds; endStem?: InkBounds
  startStemDirection?: number; endStemDirection?: number
  manual: boolean
}

/** Include the painted beam edge at a real owned stem; never virtual stem metrics. */
export function resolveSlurBeamStemBounds(stem: InkBounds, beams: readonly InkBounds[]): InkBounds {
  const valid = (ink: InkBounds) => [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) &&
    ink.width > 0 && ink.height > 0
  if (!valid(stem)) return stem
  const touching = beams.filter(ink => valid(ink) && ink.x <= stem.x + stem.width &&
    ink.x + ink.width >= stem.x && ink.y <= stem.y + stem.height && ink.y + ink.height >= stem.y)
  if (!touching.length) return stem
  const top = Math.min(stem.y, ...touching.map(ink => ink.y))
  const bottom = Math.max(stem.y + stem.height, ...touching.map(ink => ink.y + ink.height))
  return { ...stem, y: top, height: bottom - top }
}

/** Attach automatic stem-side bows to real stems, without changing note identity. */
export function resolveSlurStemAttachment(input: SlurStemAttachment): { startY: number; endY: number } {
  const original = { startY: input.startY, endY: input.endY }
  const direction = input.side === 'above' ? 1 : -1
  const valid = (ink: InkBounds | undefined): ink is InkBounds => Boolean(ink &&
    [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite) && ink.width > 0 && ink.height > 0)
  if (input.manual ||
    ![1, -1].includes(input.startStemDirection ?? 0) || ![1, -1].includes(input.endStemDirection ?? 0) ||
    !valid(input.startStem) || !valid(input.endStem) ||
    !Number.isFinite(input.startY) || !Number.isFinite(input.endY)) return original
  // Mixed stem directions still have a real stem-side endpoint. Preserve the
  // opposing head-side endpoint instead of declining both attachments.
  const attachStart = input.startStemDirection === direction
  const attachEnd = input.endStemDirection === direction
  if (input.side === 'above') return {
    startY: attachStart ? Math.min(input.startY, input.startStem.y - 8) : input.startY,
    endY: attachEnd ? Math.min(input.endY, input.endStem.y - 8) : input.endY
  }
  return {
    startY: attachStart ? Math.max(input.startY, input.startStem.y + input.startStem.height + 8) : input.startY,
    endY: attachEnd ? Math.max(input.endY, input.endStem.y + input.endStem.height + 8) : input.endY
  }
}

/** Clear a hanging start that meets measured staff-start symbol ink. */
export function resolveSlurContinuationStartCurve(curve: AutomaticSlurCurve, symbols: readonly InkBounds[], preferHorizontalStart = false): AutomaticSlurCurve {
  const half = curve.strokeWidth / 2
  const touching = symbols.filter(ink => ink.x <= curve.x1 + 8 && ink.x + ink.width + half > curve.x1 &&
    resolveSlurFermataControlY(curve, [{ ...ink, collisionOnly: true }], true) !== curve.controlY)
  if (!touching.length) return curve
  if (preferHorizontalStart) {
    const x1 = Math.max(curve.x1, ...touching.map(ink => ink.x + ink.width + 8 + half))
    // Preserve the attached note and bow height when the hanging start fits
    // beyond the header. Tight continuations retain the floating-end solver.
    if (x1 <= curve.x2 - 18) return { ...curve, x1, controlX: (x1 + curve.x2) / 2 }
  }
  const next = { ...curve }
  next.y1 = curve.side === 'above'
    ? Math.min(curve.y1, ...touching.map(ink => ink.y - 8 - half))
    : Math.max(curve.y1, ...touching.map(ink => ink.y + ink.height + 8 + half))
  next.controlY = curve.side === 'above'
    ? Math.min(next.y1, next.y2) - (Math.min(curve.y1, curve.y2) - curve.controlY)
    : Math.max(next.y1, next.y2) + (curve.controlY - Math.max(curve.y1, curve.y2))
  next.controlY = resolveSlurFermataControlY(next, touching, true)
  return next
}

/** A hanging continuation can lift its free endpoint instead of making a tall bow. */
export function resolveSlurFermataCurve(curve: AutomaticSlurCurve, fermatas: readonly InkBounds[], freeStart: boolean, freeEnd: boolean): AutomaticSlurCurve {
  const needed = resolveSlurFermataControlY(curve, fermatas)
  if (needed === curve.controlY) return curve
  const next = {...curve}, width = curve.x2-curve.x1
  for (const ink of fermatas) {
    if (resolveSlurFermataControlY(curve,[ink]) === curve.controlY) continue
    const target = curve.side==='above' ? ink.y-8-curve.strokeWidth/2 : ink.y+ink.height+8+curve.strokeWidth/2
    if (freeStart && ink.x+ink.width<curve.x1+width/3) next.y1=curve.side==='above'?Math.min(next.y1,target):Math.max(next.y1,target)
    if (freeEnd && ink.x>curve.x2-width/3) next.y2=curve.side==='above'?Math.min(next.y2,target):Math.max(next.y2,target)
  }
  // Preserve the original bow depth before applying the exact glyph constraint.
  next.controlY=curve.side==='above'
    ? Math.min(next.y1,next.y2)-(Math.min(curve.y1,curve.y2)-curve.controlY)
    : Math.max(next.y1,next.y2)+(curve.controlY-Math.max(curve.y1,curve.y2))
  next.controlY=resolveSlurFermataControlY(next,fermatas)
  return next
}

/** Interior glyph clearance only. Authored endpoints and manual curves are not moved. */
export function resolveSlurFermataControlY(curve: AutomaticSlurCurve, fermatas: readonly InkBounds[], includeContinuationStart = false): number {
  const {x1,x2,controlX,y1,y2,controlY,side,strokeWidth} = curve
  if (![x1,x2,controlX,y1,y2,controlY,strokeWidth].every(Number.isFinite) || x2 <= x1 || controlX < x1 || controlX > x2 || strokeWidth < 0) return controlY
  const atX = (x: number) => {
    let lo=0,hi=1
    for (let i=0;i<40;i++) {
      const t=(lo+hi)/2,point=(1-t)*(1-t)*x1+2*(1-t)*t*controlX+t*t*x2
      if (point<x) lo=t; else hi=t
    }
    return (lo+hi)/2
  }
  let next=controlY
  // Resolve nearer glyphs first so a new bow cannot enter a skipped upper glyph.
  const ordered = [...fermatas].sort((a,b) => side === 'above' ? b.y-a.y : a.y-b.y)
  for (const ink of ordered) {
    if (![ink.x,ink.y,ink.width,ink.height].every(Number.isFinite) || ink.width<=0 || ink.height<=0 || (!includeContinuationStart && ink.x<=x1+8) || ink.x+ink.width>=x2-8) continue
    const ts=[atX(ink.x-strokeWidth/2),atX(ink.x+ink.width+strokeWidth/2)]
    const samples=[...ts],denominator=y1-2*next+y2,extremum=denominator ? (y1-next)/denominator : -1
    if (extremum>ts[0] && extremum<ts[1]) samples.push(extremum)
    const ys=samples.map(t=>(1-t)*(1-t)*y1+2*(1-t)*t*next+t*t*y2)
    // Notes trigger a correction only when their measured bounds meet the
    // stroke. Existing marks still reserve their usual padding. Once needed,
    // both use the same eight-unit clearance target.
    const gap = ink.collisionOnly ? 0 : 8
    // Another obstacle can move the curve just outside this one before its
    // turn. Ink touched by the original curve still needs the full clearance.
    const originalSamples = [...ts]
    const originalDenominator = y1-2*controlY+y2
    const originalExtremum = originalDenominator ? (y1-controlY)/originalDenominator : -1
    if (originalExtremum>ts[0] && originalExtremum<ts[1]) originalSamples.push(originalExtremum)
    const originalYs = originalSamples.map(t=>(1-t)*(1-t)*y1+2*(1-t)*t*controlY+t*t*y2)
    const originallyTouched = ink.collisionOnly && Math.max(...originalYs)+strokeWidth/2>ink.y && Math.min(...originalYs)-strokeWidth/2<ink.y+ink.height
    if (!originallyTouched && (Math.max(...ys)+strokeWidth/2+gap<=ink.y || Math.min(...ys)-strokeWidth/2-gap>=ink.y+ink.height)) continue
    const target=side==='above'?ink.y-8-strokeWidth/2:ink.y+ink.height+8+strokeWidth/2
    for (const t of ts) {
      const weight=2*(1-t)*t
      if (weight<=0) continue
      const bound=(target-(1-t)*(1-t)*y1-t*t*y2)/weight
      next=side==='above'?Math.min(next,bound):Math.max(next,bound)
    }
  }
  if (Math.abs(next-controlY)<=0.05) return controlY
  return side==='above'?Math.floor(next*100)/100:Math.ceil(next*100)/100
}
