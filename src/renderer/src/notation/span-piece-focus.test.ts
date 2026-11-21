// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest'
import {isSameNotationFocus} from './focus-viewport'
function piece(kind:'slur'|'hairpin',system?:number,id='same'){
 const group=document.createElementNS('http://www.w3.org/2000/svg','g')
 group.classList.add('notation-span-target');group.dataset.spanId=id;group.dataset.spanKind=kind
 if(system!==undefined)group.dataset.systemIndex=String(system)
 return group
}
afterEach(()=>document.body.replaceChildren())
it.each(['slur','hairpin']as const)('does not equate different painted systems of the same %s',kind=>{
 expect(isSameNotationFocus(piece(kind,1),piece(kind,0))).toBe(false)
})
it.each(['slur','hairpin']as const)('keeps same-piece redraw identity including system zero for %s',kind=>{
 for(const system of[0,1,2])expect(isSameNotationFocus(piece(kind,system),piece(kind,system))).toBe(true)
})
it('keeps legacy unaddressed targets compatible but does not equate a known piece with an unknown one',()=>{
 expect(isSameNotationFocus(piece('slur'),piece('slur'))).toBe(true)
 expect(isSameNotationFocus(piece('slur',0),piece('slur'))).toBe(false)
 expect(isSameNotationFocus(piece('slur',1,'one'),piece('slur',1,'two'))).toBe(false)
 expect(isSameNotationFocus(piece('slur',1),piece('hairpin',1))).toBe(false)
})

it.each(['slur','hairpin']as const)('restores the same painted %s piece after detachment and keeps DOM order',async kind=>{
 const{resolveSpanFocusTarget}=await import('./focus-viewport'),root=document.createElementNS('http://www.w3.org/2000/svg','svg')
 const candidates=[piece(kind,0),piece(kind,1),piece(kind,2)];root.append(...candidates)
 const previous=piece(kind,1)
 expect(resolveSpanFocusTarget(root,{kind,id:'same'},previous)).toBe(candidates[1])
 expect([...root.children]).toEqual(candidates)
 expect(resolveSpanFocusTarget(root,{kind,id:'same'},piece(kind,0))).toBe(candidates[0])
})
it('uses the existing first-piece fallback after reflow removes a system or logical selection changes',async()=>{
 const{resolveSpanFocusTarget}=await import('./focus-viewport'),root=document.createElementNS('http://www.w3.org/2000/svg','svg')
 const first=piece('hairpin',0),second=piece('hairpin',1);root.append(first,second)
 expect(resolveSpanFocusTarget(root,{kind:'hairpin',id:'same'},piece('hairpin',2))).toBe(first)
 expect(resolveSpanFocusTarget(root,{kind:'hairpin',id:'same'},piece('slur',1))).toBe(first)
 expect(resolveSpanFocusTarget(root,{kind:'hairpin',id:'same'},piece('hairpin',1,'other'))).toBe(first)
 expect(resolveSpanFocusTarget(root,{kind:'hairpin',id:'same'},null)).toBe(first)
 expect(resolveSpanFocusTarget(root,{kind:'slur',id:'missing'},piece('slur',1))).toBeUndefined()
})
