import { readSvgShapeInk, readSvgTextInk } from './staff-ink-spacing'

/** Screen reveal only; never extend the cue itself or change engraving. */
export function readInputViewportInk(cursor:SVGElement, context?:CanvasRenderingContext2D|null):DOMRect {
  const cue=cursor.getBoundingClientRect(),svg=cursor.ownerSVGElement
  if(!svg||!cursor.matches('.notation-note-input-cursor'))return cue
  const keys=['partId','staffId','measureId','voiceId'] as const
  const tick=cursor.dataset.tick
  if(keys.some(key=>!cursor.dataset[key])||!tick||(!Number.isFinite(Number(tick))||Number(tick)<0))return cue
  const events=[...svg.querySelectorAll<SVGElement>('.notation-event:not(.is-preview)[data-event-tick]')].filter(node=>
    keys.every(key=>node.dataset[key]===cursor.dataset[key])&&node.dataset.eventTick!==''&&Number(node.dataset.eventTick)===Number(tick))
  if(events.length!==1)return cue
  const heads=[...events[0].querySelectorAll<SVGTextContentElement>('.vf-notehead text')]
  if(!heads.length)return cue
  try{
    const matrix=svg.getScreenCTM()
    if(!matrix)return cue
    const measure=context===undefined?document.createElement('canvas').getContext('2d'):context
    if(!measure)return cue
    // VexFlow paints a principal note's flag outside its head/stem. Keep its
    // actual glyph ink visible too; nested grace flags belong to another note.
    const flags=[...events[0].querySelectorAll<SVGTextContentElement>(':scope > .vf-flag text')]
    const ink=[...heads.map(node=>readSvgTextInk(node,measure)),
      ...flags.map(node=>readSvgTextInk(node,measure)),
      ...[...events[0].querySelectorAll<SVGGraphicsElement>('.vf-stem path')].map(readSvgShapeInk)]
      .flatMap(bounds=>{
        if(!bounds)return[]
        return [[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],
          [bounds.x,bounds.y+bounds.height],[bounds.x+bounds.width,bounds.y+bounds.height]]
          .map(([x,y])=>({x:matrix.a*x+matrix.c*y+matrix.e,y:matrix.b*x+matrix.d*y+matrix.f}))
      })
    if(!ink.length||ink.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return cue
    const left=Math.min(cue.left,...ink.map(p=>p.x)),right=Math.max(cue.right,...ink.map(p=>p.x))
    const top=Math.min(cue.top,...ink.map(p=>p.y)),bottom=Math.max(cue.bottom,...ink.map(p=>p.y))
    return left===cue.left&&right===cue.right&&top===cue.top&&bottom===cue.bottom?cue:new DOMRect(left,top,right-left,bottom-top)
  }catch{return cue}
}
