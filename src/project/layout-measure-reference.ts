import type {Score,ScoreLayout} from '../score-core/types'

/** Snapshot of the existing MusicXML aligned-index policy; never edits anchors. */
export function createLayoutMeasureIndexResolver(score:Pick<Score,'parts'>):(reference:string)=>number {
 const staves=score.parts.flatMap(part=>part.staves)
 const alignedLength=staves.length?Math.min(...staves.map(staff=>staff.measures.length)):0
 const concrete=new Map<string,number>(),aliases=new Map<string,number>()
 for(const staff of staves)staff.measures.forEach((measure,index)=>{
  if(!concrete.has(measure.id))concrete.set(measure.id,index)
 })
 staves[0]?.measures.forEach((measure,index)=>{
  const alias=`measure-${measure.number}`
  if(!aliases.has(alias))aliases.set(alias,index)
 })
 return reference=>{
  // Concrete IDs take precedence even when they resemble an ordinal alias.
  const index=concrete.get(reference)??aliases.get(reference)??-1
  return index>=0&&index<alignedLength?index:-1
 }
}

export function resolveLayoutMeasureIndex(score:Pick<Score,'parts'>,reference:string):number {
 return createLayoutMeasureIndexResolver(score)(reference)
}

/** Read-only break addresses for a formatter that lays out the first staff. */
export function resolveLayoutForPrimaryStaff(score:Score):ScoreLayout|undefined {
 const layout=score.layout
 if(!layout)return layout
 const primary=score.parts[0]?.staves[0]?.measures??[]
 const indexOf=createLayoutMeasureIndexResolver(score)
 const map=(ids:string[]|undefined)=>{
  if(!ids)return ids
  const next=ids.map(id=>primary[indexOf(id)]?.id??id)
  return next.some((id,index)=>id!==ids[index])?next:ids
 }
 const system=map(layout.systemBreakBeforeMeasureIds),page=map(layout.pageBreakBeforeMeasureIds)
 if(system===layout.systemBreakBeforeMeasureIds&&page===layout.pageBreakBeforeMeasureIds)return layout
 return{...layout,
  ...(system!==undefined?{systemBreakBeforeMeasureIds:system}:{}),
  ...(page!==undefined?{pageBreakBeforeMeasureIds:page}:{})}
}
