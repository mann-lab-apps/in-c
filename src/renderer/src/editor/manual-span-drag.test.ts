import { expect, it } from 'vitest'
import { isManualSpanTranslation, planManualSpanTranslation } from './manual-span-drag'
it('snaps only relative movement while preserving a fractional origin, explicit zero and shape',()=>{
 const base=Object.freeze({offsetX:0,offsetY:.13,height:2,placement:'above' as const}),plan=planManualSpanTranslation(base,.51,-.26)
 expect(plan).toEqual({status:'valid',engraving:{offsetX:.5,offsetY:-.12,height:2,placement:'above'},deltaX:.5,deltaY:-.25});expect(base.offsetY).toBe(.13)
 expect(planManualSpanTranslation({height:2},.25,0)).toEqual({status:'valid',engraving:{height:2,offsetX:.25},deltaX:.25,deltaY:0})
})
it.each([.125,-.125])('uses symmetric quarter-sp snapping for %s',delta=>expect(planManualSpanTranslation({offsetX:0},delta,0)).toMatchObject({status:'valid',deltaX:Math.sign(delta)*.25}))
it.each([{base:{offsetY:8},x:0,y:.25},{base:{offsetX:-8},x:-.25,y:0}])('rejects overflow without clamping the authored origin',({base,x,y})=>expect(planManualSpanTranslation(base,x,y)).toEqual({status:'out-of-range'}))
it('keeps automatic and zero-motion gestures out of score history',()=>{
 expect(planManualSpanTranslation(undefined,1,1)).toEqual({status:'unsupported'});expect(planManualSpanTranslation({},1,1)).toEqual({status:'unsupported'});expect(planManualSpanTranslation({offsetX:0},NaN,1)).toEqual({status:'unsupported'});expect(planManualSpanTranslation({offsetY:.13},.01,-.01)).toEqual({status:'no-change'})
 expect(isManualSpanTranslation({offsetX:0},{offsetX:0})).toBe(false);expect(isManualSpanTranslation({height:2},{height:3,offsetX:.25})).toBe(false);expect(isManualSpanTranslation({height:2},{height:2,offsetY:Infinity})).toBe(false)
})
