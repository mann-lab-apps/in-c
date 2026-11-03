import { readStaffMusicInk, resolveLyricInkSpacing } from './lyric-ink-spacing'
import { type MeasureInkOwner, type StaffInk } from './staff-ink-spacing'
import { readOwnedMeasureTextInk } from './measure-text-ink'

type DynamicInk = StaffInk & { measureId:string }

export function resolveDynamicInkSpacing(notes:readonly StaffInk[],marks:readonly DynamicInk[],existing:ReadonlyMap<number,number>,anticipated:ReadonlyMap<string,number>=new Map()):ReadonlyMap<number,number> {
  // The existing lower-text resolver checks actual horizontal overlap,owner,
  // system and an8px gap. Apply only the deficit left after pending lyric lanes.
  return resolveLyricInkSpacing(notes,marks.map(mark=>({...mark,y:mark.y+(anticipated.get(mark.measureId)??0)})),existing)
}

export function measureDynamicInkSpacing(svg:SVGSVGElement,owners:ReadonlyMap<string,MeasureInkOwner|undefined>,existing:ReadonlyMap<number,number>,anticipated:ReadonlyMap<string,number>):ReadonlyMap<number,number> {
  const nodes=[...svg.querySelectorAll<SVGTextContentElement>('.notation-dynamic-mark[data-measure-id]')]
  if(!nodes.length||!document.fonts||typeof svg.getCTM!=='function')return existing
  const context=document.createElement('canvas').getContext('2d')
  if(!context)return existing
  const { ink: marks }=readOwnedMeasureTextInk(svg,owners,context,'.notation-dynamic-mark[data-measure-id]')
  if(!marks.length)return existing
  return resolveDynamicInkSpacing(readStaffMusicInk(svg,owners,context),marks,existing,anticipated)
}
