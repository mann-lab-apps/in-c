import { expect, it } from 'vitest'
import { planSlurNesting, slurCurveInk, strictlyContainsSlur, type SlurNestingEntry } from './slur-nesting'
import { resolveSlurFermataControlY, type AutomaticSlurCurve } from './slur-fermata-spacing'

const entry = (index:number,startX:number,endX:number):SlurNestingEntry => ({ index,startX,endX,
  automatic:true,voiceKey:'part/staff/voice',staffIndex:0,systemIndex:0 })
it('plans three strictly nested automatic spans inside out without mutating source order', () => {
  const source=[entry(0,0,1000),entry(1,200,800),entry(2,350,500),{...entry(3,0,1000),staffIndex:1}]
  const before=structuredClone(source), plan=planSlurNesting(source)
  expect(plan.order).toEqual([2,1,0,3]); expect([...plan.innerByIndex]).toEqual([[0,[1,2]],[1,[2]]])
  expect(source).toEqual(before)
})
it('keeps an already inner-first geometry sequence and unrelated slots stable', () => {
  expect(planSlurNesting([entry(0,200,400),entry(1,0,800),entry(2,900,1000)]).order).toEqual([0,1,2])
})
it('does not infer nesting across manual, shared-endpoint, voice, staff, system or unknown scope', () => {
  for(const changed of [{automatic:false},{startX:0},{endX:1000},{voiceKey:'other'},{staffIndex:1},
    {systemIndex:1},{voiceKey:undefined},{systemIndex:undefined},{startX:NaN}]) {
    const plan=planSlurNesting([entry(0,0,1000),{...entry(1,200,400),...changed}])
    expect(plan.order).toEqual([0,1]);expect(plan.innerByIndex.size).toBe(0)
  }
})
it('identifies only strictly contained authored endpoints without changing automatic ordering policy',()=>{
  const outer=entry(0,0,1000),inner={...entry(1,200,400),automatic:false}
  expect(strictlyContainsSlur(outer,inner)).toBe(true)
  expect(strictlyContainsSlur(inner,outer)).toBe(false)
  for(const changed of [{startX:8},{endX:992},{voiceKey:'other'},{staffIndex:1},
    {systemIndex:1},{voiceKey:undefined},{systemIndex:undefined},{startX:NaN}])
    expect(strictlyContainsSlur(outer,{...inner,...changed})).toBe(false)
  expect(planSlurNesting([outer,inner]).innerByIndex.size).toBe(0)
})
const outer:AutomaticSlurCurve={x1:132.23995971679688,y1:213.75,x2:779.2000122070312,y2:208.75,
  controlX:455.71998596191406,controlY:235.75,side:'below',strokeWidth:1.6}
const inner:AutomaticSlurCurve={x1:348.49330647786456,y1:208.75,x2:562.9466654459635,y2:213.75,
  controlX:455.71998596191406,controlY:239.0508023071289,side:'below',strokeWidth:1.6}
it.each(['below','above'] as const)('clears actually touching nested ink on the %s side using the existing solver', side => {
  const flip=(curve:AutomaticSlurCurve)=>side==='below'?curve:{...curve,side,y1:-curve.y1,y2:-curve.y2,controlY:-curve.controlY}
  const bow=flip(outer), marks=slurCurveInk(flip(inner)), next=resolveSlurFermataControlY(bow,marks)
  expect(side==='below'?next>bow.controlY:next<bow.controlY).toBe(true)
})
it('does not move an already clear reversed-order bow merely because its large bbox overlaps', () => {
  const clearOuter={...outer,controlY:241.75}, clearInner={...inner,controlY:233.0508023071289}
  expect(resolveSlurFermataControlY(clearOuter,slurCurveInk(clearInner))).toBe(clearOuter.controlY)
})
it('covers exact quadratic extrema and stroke without reserving the whole empty bow rectangle', () => {
  const ink=slurCurveInk(inner), half=inner.strokeWidth/2
  expect(ink.length).toBeGreaterThan(10);expect(Math.max(...ink.map(box=>box.width))).toBeLessThan(4)
  for(let i=0;i<=1000;i++) {
    const t=i/1000,x=(1-t)*(1-t)*inner.x1+2*(1-t)*t*inner.controlX+t*t*inner.x2
    const y=(1-t)*(1-t)*inner.y1+2*(1-t)*t*inner.controlY+t*t*inner.y2
    expect(ink.some(box=>x>=box.x+half-1e-8&&x<=box.x+box.width-half+1e-8&&y>=box.y+half-1e-8&&y<=box.y+box.height-half+1e-8)).toBe(true)
  }
})
it('declines invalid or unpainted curves without inventing collision ink', () => {
  for(const changed of [{strokeWidth:0},{strokeWidth:NaN},{x2:0},{controlX:-1}])expect(slurCurveInk({...inner,...changed})).toEqual([])
})
