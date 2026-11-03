import { expect, it } from 'vitest'
import { recordTimedAnnotationAnchor, resolveTimedAnnotationX, type TimedAnnotationLayout } from './timed-annotation-position'

const layout = ():TimedAnnotationLayout => ({durationTicks:4,startX:70,endX:700,
  anchors:new Map([[3,{startX:560,centerX:566}],[0,{startX:100,centerX:106}],[1,{startX:240,centerX:246}]])})

it('aligns exact chord centers and text starts with real formatted note columns',()=>{
  const input=layout()
  expect(resolveTimedAnnotationX(1,input,'center')).toBe(246)
  expect(resolveTimedAnnotationX(1,input,'start')).toBe(240)
  expect(resolveTimedAnnotationX(0,input,'center')).toBe(106)
})
it('interpolates a missing onset through actual unequal spacing without changing anchor order',()=>{
  const input=layout(),before=[...input.anchors]
  expect(resolveTimedAnnotationX(2,input,'center')).toBe(406)
  expect(resolveTimedAnnotationX(2,input)).toBe(400)
  expect([...input.anchors]).toEqual(before)
})
it('uses pickup duration and the music end, retaining explicit boundary/out-of-bar positions',()=>{
  const input=layout()
  expect(resolveTimedAnnotationX(4,input,'center')).toBe(700)
  expect(resolveTimedAnnotationX(5,input,'center')).toBe(834)
  const pickup={...input,durationTicks:2,endX:400,anchors:new Map([...input.anchors].filter(([t])=>t<2))}
  expect(resolveTimedAnnotationX(1.5,pickup,'center')).toBe(323)
})
it('uses the music interval for a bar with only a centered full-measure rest',()=>{
  const input={...layout(),startX:90,endX:500,anchors:new Map()}
  expect(resolveTimedAnnotationX(0,input,'center')).toBe(90)
  expect(resolveTimedAnnotationX(2,input,'center')).toBe(295)
})
it('keeps the same onset for overlapping voices regardless of their array order',()=>{
  const a=new Map(),b=new Map()
  recordTimedAnnotationAnchor(a,0,80,92);recordTimedAnnotationAnchor(a,0,100,112)
  recordTimedAnnotationAnchor(b,0,100,112);recordTimedAnnotationAnchor(b,0,80,92)
  expect(a).toEqual(b)
  expect(a.get(0)).toEqual({startX:80,centerX:86})
})
