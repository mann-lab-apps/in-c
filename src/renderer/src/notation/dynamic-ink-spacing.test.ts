import { expect,it } from 'vitest'
import { resolveDynamicInkSpacing } from './dynamic-ink-spacing'

it('does not double-reserve a lower-note gap that the pending lyric layout already supplies',()=>{
 const note={x:10,y:100,width:20,height:10,staffIndex:0,systemIndex:0},mark={x:15,y:105,width:12,height:20,staffIndex:0,systemIndex:0,measureId:'bar'},existing=new Map<number,number>()
 expect(resolveDynamicInkSpacing([note],[mark],existing,new Map([['bar',13]]))).toBe(existing)
 expect([...resolveDynamicInkSpacing([note],[mark],existing,new Map([['bar',5]]))]).toEqual([[0,8]])
 expect(existing.size).toBe(0)
})
it('keeps independent staff corrections and preserves a settled measured map across systems',()=>{
 const notes=[{x:10,y:100,width:20,height:10,staffIndex:0,systemIndex:0},{x:10,y:200,width:20,height:10,staffIndex:1,systemIndex:1}],marks=[{x:15,y:105,width:12,height:20,staffIndex:0,systemIndex:0,measureId:'a'},{x:15,y:218,width:12,height:20,staffIndex:1,systemIndex:1,measureId:'b'}],existing=new Map([[1,24]])
 const corrected=resolveDynamicInkSpacing(notes,marks,existing)
 expect([...corrected]).toEqual([[1,24],[0,13]])
 const moved=marks.map(mark=>({...mark,y:mark.y+(mark.staffIndex===0?13:0)}))
 expect(resolveDynamicInkSpacing(notes,moved,corrected)).toBe(corrected)
})
