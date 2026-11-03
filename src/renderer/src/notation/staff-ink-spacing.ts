import type { StaffAnnotationSpacing } from './staff-annotation-spacing'
import { isVisibleSvgPaint, type SystemInk } from './system-ink-spacing'

export interface StaffInk extends SystemInk { staffIndex: number }
export interface MeasureInkOwner { partId: string; staffId: string; staffIndex: number; systemIndex: number }
type Bounds = Pick<SystemInk, 'x' | 'y' | 'width' | 'height'>

const valid = (b: StaffInk) => [b.x,b.y,b.width,b.height,b.staffIndex,b.systemIndex].every(Number.isFinite) &&
  b.width>0 && b.height>0 && Number.isInteger(b.staffIndex) && b.staffIndex>=0 && Number.isInteger(b.systemIndex) && b.systemIndex>=0

export function resolveStaffInkSpacing(notes: readonly StaffInk[], text: readonly StaffInk[], existing: ReadonlyMap<number,number>): ReadonlyMap<number,number> {
  const deficits=new Map<number,number>()
  for(const lower of text)for(const upper of notes){
    if(!valid(lower)||!valid(upper)||upper.systemIndex!==lower.systemIndex||upper.staffIndex>=lower.staffIndex||
      Math.min(upper.x+upper.width,lower.x+lower.width)<=Math.max(upper.x,lower.x))continue
    const deficit=upper.y+upper.height+8-lower.y
    if(deficit>0.05)deficits.set(lower.staffIndex-1,Math.max(deficits.get(lower.staffIndex-1)??0,deficit))
  }
  if(!deficits.size)return existing
  const next=new Map(existing)
  for(const [index,deficit] of deficits)next.set(index,(existing.get(index)??0)+Math.ceil(deficit*100)/100)
  return next
}

export function applyStaffInkSpacing(base: StaffAnnotationSpacing, gaps: ReadonlyMap<number,number>): StaffAnnotationSpacing {
  let added=0
  const offsets=base.offsets.map((y,index)=>{
    const value=gaps.get(index-1)??0
    if(index>0&&Number.isFinite(value)&&value>0)added+=value
    return y+added
  })
  return added?{...base,offsets,minimumSystemHeight:base.minimumSystemHeight+added}:base
}

function visible(node: SVGElement): boolean {
  for(let parent:Element|null=node;parent;parent=parent.parentElement){
    const s=getComputedStyle(parent)
    if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false
    if(parent.tagName.toLowerCase()==='svg')break
  }
  return true
}

function toRoot(node: SVGGraphicsElement, bounds: Bounds): Bounds | undefined {
  const root=node.ownerSVGElement?.getCTM(),matrix=node.getCTM()
  if(!root||!matrix)return undefined
  const m=root.inverse().multiply(matrix)
  const points=[[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],[bounds.x,bounds.y+bounds.height],[bounds.x+bounds.width,bounds.y+bounds.height]]
    .map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}))
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y))
  return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y}
}

/** SVG text getBBox includes the music font's large em box, not glyph ink. */
export function readSvgTextInk(node: SVGTextContentElement, context: CanvasRenderingContext2D): Bounds | undefined {
  if(!node.textContent||!visible(node))return undefined
  try{
    const s=getComputedStyle(node)
    const stroke=isVisibleSvgPaint(s.stroke)&&s.strokeOpacity!=='0'?(parseFloat(s.strokeWidth)||0)/2:0
    if(!(isVisibleSvgPaint(s.fill)&&s.fillOpacity!=='0')&&!stroke)return undefined
    context.font=s.font||`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    context.textAlign='start';context.textBaseline='alphabetic';context.direction=s.direction==='rtl'?'rtl':'ltr'
    if('letterSpacing' in context)context.letterSpacing=s.letterSpacing==='normal'?'0px':s.letterSpacing
    if('wordSpacing' in context)context.wordSpacing=s.wordSpacing==='normal'?'0px':s.wordSpacing
    const b=context.measureText(node.textContent),p=node.getStartPositionOfChar(0)
    const bounds={x:p.x-b.actualBoundingBoxLeft-stroke,y:p.y-b.actualBoundingBoxAscent-stroke,
      width:b.actualBoundingBoxLeft+b.actualBoundingBoxRight+2*stroke,height:b.actualBoundingBoxAscent+b.actualBoundingBoxDescent+2*stroke}
    if(![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return undefined
    return toRoot(node,bounds)
  }catch{return undefined}
}

export function readSvgShapeInk(node: SVGGraphicsElement): Bounds | undefined {
  if(!visible(node))return undefined
  try{
    const s=getComputedStyle(node),b=node.getBBox(),stroke=isVisibleSvgPaint(s.stroke)&&s.strokeOpacity!=='0'?(parseFloat(s.strokeWidth)||0)/2:0
    if(!(isVisibleSvgPaint(s.fill)&&s.fillOpacity!=='0')&&!stroke)return undefined
    return toRoot(node,{x:b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke})
  }catch{return undefined}
}

export function measureStaffInkSpacing(svg: SVGSVGElement, owners: ReadonlyMap<string,MeasureInkOwner|undefined>, existing: ReadonlyMap<number,number>, spanInk: readonly StaffInk[] = []): ReadonlyMap<number,number> {
  const lowerNodes=[...svg.querySelectorAll<SVGTextContentElement>('.notation-harmony-mark,.notation-staff-text,.notation-system-text,.notation-tempo-marking--positioned,.notation-staff-label')]
  if(!document.fonts||typeof svg.getCTM!=='function')return existing
  const byStaff=new Map<string,number|undefined>()
  for(const owner of owners.values())if(owner){
    const key=JSON.stringify([owner.partId,owner.staffId])
    byStaff.set(key,byStaff.has(key)&&byStaff.get(key)!==owner.staffIndex?undefined:owner.staffIndex)
  }
  const lowerOwner=(n:SVGElement):MeasureInkOwner|undefined=>{
    if(!n.classList.contains('notation-staff-label'))return owners.get(n.dataset.measureId??'')
    const staffIndex=byStaff.get(JSON.stringify([n.dataset.partId,n.dataset.staffId])),systemIndex=Number(n.dataset.systemIndex)
    return staffIndex===undefined||!Number.isInteger(systemIndex)?undefined:{partId:n.dataset.partId!,staffId:n.dataset.staffId!,staffIndex,systemIndex}
  }
  const lower=lowerNodes.map(node=>({node,owner:lowerOwner(node)})).filter((v):v is {node:SVGTextContentElement;owner:MeasureInkOwner}=>Boolean(v.owner&&v.owner.staffIndex>0))
  const context=document.createElement('canvas').getContext('2d')
  if(!context)return existing
  const text=lower.flatMap(({node,owner})=>{const bounds=readSvgTextInk(node,context);return bounds?[{...bounds,...owner}]:[]})
  // Span bounds are already painted in root coordinates. Reserving the staff
  // gap preserves authored offset/curvature instead of locally moving a span.
  const notes:StaffInk[]=[...spanInk]
  for(const event of svg.querySelectorAll<SVGElement>('.notation-event')){
    const owner=owners.get(event.dataset.measureId??'')
    if(!owner||owner.partId!==event.dataset.partId||owner.staffId!==event.dataset.staffId)continue
    for(const node of event.querySelectorAll<SVGTextContentElement>('text')){
      const bounds=readSvgTextInk(node,context);if(bounds)notes.push({...bounds,...owner})
    }
    for(const node of event.querySelectorAll<SVGGraphicsElement>('path,line,circle,ellipse,polygon,polyline')){
      const bounds=readSvgShapeInk(node);if(bounds)notes.push({...bounds,...owner})
    }
  }
  for(const node of svg.querySelectorAll<SVGGraphicsElement>('.vf-beam[data-measure-id] path')){
    const owner=owners.get(node.closest<SVGElement>('.vf-beam')?.dataset.measureId??''),bounds=readSvgShapeInk(node)
    if(owner&&bounds)notes.push({...bounds,...owner})
  }
  for(const node of svg.querySelectorAll<SVGTextContentElement>('.vf-clef[data-measure-id] text,.vf-keysignature[data-measure-id] text,.vf-timesignature[data-measure-id] text')){
    const owner=owners.get(node.closest<SVGElement>('[data-measure-id]')?.dataset.measureId??''),bounds=readSvgTextInk(node,context)
    if(owner&&bounds)notes.push({...bounds,...owner})
  }
  // Staff lines/start symbols can paint over a preceding low note just as
  // another note's stem can. Their owner is explicit,never a selection box.
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('.vf-stave[data-measure-id] path,.vf-stave[data-measure-id] line')) {
    const owner = owners.get(node.closest<SVGElement>('.vf-stave')?.dataset.measureId ?? '')
    const bounds = readSvgShapeInk(node)
    if (owner && bounds) notes.push({ ...bounds, ...owner })
  }
  return resolveStaffInkSpacing(notes,[...notes,...text],existing)
}
