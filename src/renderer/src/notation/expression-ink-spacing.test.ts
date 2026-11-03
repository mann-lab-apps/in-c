import { expect,it } from 'vitest'
import { resolveExpressionInkOffsets,applyExpressionInkOffsets } from './expression-ink-spacing'
import { resolveMeasureAnnotationLanes } from './annotation-lanes'
const text={x:100,y:268.519,width:33.777,height:9.776,staffIndex:0,systemIndex:0,measureId:'middle'}
const stem={x:110,y:189.35,width:1.5,height:101.5,staffIndex:0,systemIndex:0}
const wedge={x:50,y:297.2,width:400,height:21.8,staffIndex:0,systemIndex:0}
it('reserves real stem and manual wedge ink without moving either obstacle',()=>{
 const existing=new Map<string,number>(),obstacles=[stem,wedge],before=structuredClone(obstacles)
 expect([...resolveExpressionInkOffsets(obstacles,[text],existing)]).toEqual([['middle',58.5]])
 expect(existing.size).toBe(0);expect(obstacles).toEqual(before)
})
it('moves only the affected measure stack, keeping auto and explicit geometry lanes intact',()=>{
 const lane=resolveMeasureAnnotationLanes({hasHairpin:true,expressionTextCount:2}),other=resolveMeasureAnnotationLanes({expressionTextCount:1}),lanes=new Map([['middle',lane],['other',other]]),before=structuredClone(lanes)
 const result=applyExpressionInkOffsets(lanes,new Map([['middle',58.5]]))
 expect(result.get('middle')!.expressionTextYOffsets).toEqual(lane.expressionTextYOffsets.map(y=>y+58.5))
 expect(result.get('middle')!.hairpinYOffset).toBe(lane.hairpinYOffset);expect(result.get('other')).toBe(other);expect(lanes).toEqual(before)
 expect(result.get('middle')!.requiredBelow).toBeGreaterThan(result.get('middle')!.expressionTextYOffsets.at(-1)!)
})
it('keeps settled offsets and ignores unrelated staff,system and horizontal positions',()=>{
 const existing=new Map([['middle',58.5]]),moved={...text,y:text.y+58.5}
 expect(resolveExpressionInkOffsets([stem,wedge],[moved],existing)).toBe(existing)
 expect(resolveExpressionInkOffsets([{...stem,staffIndex:1},{...wedge,systemIndex:1},{...wedge,x:1000}],[text],existing)).toBe(existing)
})
it('aggregates multiple expression rows without double-counting the same deficit',()=>{
 const result=resolveExpressionInkOffsets([wedge,stem],[text,{...text,y:text.y+22}],new Map([['middle',10]]))
 expect([...result]).toEqual([['middle',68.5]])
})
