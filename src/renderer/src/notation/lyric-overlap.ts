export interface LyricInk {
  eventId: string
  verse: string
  svg: Element
  x: number
  y: number
  width: number
  height: number
}

// A warning only: never move a lyric/manual span or reject an intentional print.
export function hasOverlappingLyricInk(inks: readonly LyricInk[]): boolean {
  const ordered = inks.filter(ink => ink.width > 0 && ink.height > 0 &&
    [ink.x, ink.y, ink.width, ink.height].every(Number.isFinite)).slice().sort((a,b)=>a.x-b.x)
  for (let i=0;i<ordered.length;i++) {
    const a=ordered[i]
    for (let j=i+1;j<ordered.length && ordered[j].x<a.x+a.width;j++) {
      const b=ordered[j]
      if (a.svg !== b.svg || a.verse !== b.verse || a.eventId === b.eventId) continue
      if (Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)) return true
    }
  }
  return false
}

export function hasClippedLyricInk(inks: readonly LyricInk[]): boolean {
  return hasClippedNotationText(inks)
}

export function hasClippedNotationText(inks: readonly Pick<LyricInk, 'svg' | 'x' | 'width'>[]): boolean {
  return inks.some(ink=>{
    const viewBox=ink.svg.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number)
    const left=viewBox?.length===4?viewBox[0]:0
    const width=viewBox?.length===4?viewBox[2]:Number(ink.svg.getAttribute('width'))
    return width>0 && ink.width>0 && (ink.x<left || ink.x+ink.width>left+width)
  })
}

export interface HarmonyInk extends Pick<LyricInk, 'svg' | 'x' | 'y' | 'width' | 'height'> {
  measureId?: string
  text: string
}

export function readHarmonyInk(root: ParentNode): HarmonyInk[] {
  return [...root.querySelectorAll<SVGGraphicsElement>('.notation-preview svg .notation-harmony-mark')].flatMap(node => {
    if (!node.ownerSVGElement || typeof node.getBBox !== 'function') return []
    const { x, y, width, height } = node.getBBox()
    return [{ measureId: node.dataset.measureId, text: node.textContent ?? '', svg: node.ownerSVGElement, x, y, width, height }]
  })
}

export function readLyricInk(root: ParentNode): LyricInk[] {
  return [...root.querySelectorAll<SVGGraphicsElement>('.notation-preview svg .notation-lyric')].flatMap(node => {
    if (!node.ownerSVGElement || !node.dataset.eventId || typeof node.getBBox !== 'function') return []
    const {x,y,width,height}=node.getBBox()
    return [{eventId:node.dataset.eventId,verse:node.dataset.lyricNumber??'1',svg:node.ownerSVGElement,x,y,width,height}]
  })
}
