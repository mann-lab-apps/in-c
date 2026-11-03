import { expect, it } from 'vitest'
import { resolveOctaveInkShift, resolveOctaveStaffSpacing } from './octave-ink-spacing'
import type { StaffInk } from './staff-ink-spacing'
const ink=(x:number,y:number,width:number,height:number):StaffInk=>({x,y,width,height,staffIndex:0,systemIndex:0})
it('clears the measured D4/8vb label and final hook without changing music or horizontal anchors',()=>{
 const note=ink(188.92,152,12,10),pieces=[ink(195.324,151.156,20.268,9.024),ink(196.5,163.5,35,1),ink(230.5,153.5,1,11)],before=structuredClone({note,pieces})
 const shift=resolveOctaveInkShift(pieces,[note],true)
 expect(shift).toBeCloseTo(18.86,8)
 const moved=pieces.map(piece=>({...piece,y:piece.y+shift}))
 expect(moved[0].y-note.y-note.height).toBeGreaterThanOrEqual(8)
 expect(resolveOctaveInkShift(moved,[note],true)).toBe(0)
 expect({note,pieces}).toEqual(before)
})
it('mirrors above placement and never uses another staff,system or horizontal interval',()=>{
 const piece=ink(10,20,20,10),note=ink(10,22,10,10),shift=resolveOctaveInkShift([piece],[note],false)
 expect(piece.y+shift+piece.height+8).toBeLessThanOrEqual(note.y)
 for(const other of [{...note,staffIndex:1},{...note,systemIndex:1},{...note,x:40}])expect(resolveOctaveInkShift([piece],[other],false)).toBe(0)
})
it('uses only measured painted bounds,ignores invalid or empty inputs and keeps the largest constraint',()=>{
 const piece=ink(10,20,20,10),a=ink(10,22,10,10),b=ink(10,25,10,15)
 expect(resolveOctaveInkShift([piece],[a,b],true)).toBe(resolveOctaveInkShift([piece],[b,a],true))
 expect(resolveOctaveInkShift([],[a],true)).toBe(0)
 for(const invalid of [{...piece,width:0},{...piece,y:NaN},{...piece,staffIndex:-1},{...piece,systemIndex:0.5}])expect(resolveOctaveInkShift([invalid],[a],true)).toBe(0)
})

it('reserves the measured continuation gap once and keeps unrelated staff and manual source ink untouched',()=>{
 const octave={...ink(29.5,972.96,443.6,1),systemIndex:1},lower={...ink(300,980.64,12,10),staffIndex:1,systemIndex:1},existing=new Map([[0,5],[1,20]]),before=structuredClone({octave,lower})
 const next=resolveOctaveStaffSpacing([octave],[lower],existing)
 expect(next.get(0)).toBeGreaterThanOrEqual(6.32);expect(next.get(0)).toBeLessThanOrEqual(6.33);expect(next.get(1)).toBe(20);expect(existing.get(0)).toBe(5)
 expect(resolveOctaveStaffSpacing([octave],[{...lower,y:982}],next)).toBe(next)
 expect({octave,lower}).toEqual(before)
})
it('combines upper and lower octave constraints with max rather than sum for the same staff gap',()=>{
 const upper={...ink(10,20,20,10)},lower={...ink(10,34,20,10),staffIndex:1},existing=new Map<number,number>()
 expect(resolveOctaveStaffSpacing([upper,lower],[upper,lower],existing).get(0)).toBe(4)
 expect(resolveOctaveStaffSpacing([],[upper,lower],existing)).toBe(existing)
})
