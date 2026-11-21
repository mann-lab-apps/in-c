// @vitest-environment jsdom
import {expect,it} from 'vitest'
import {resolveUnchangedSpanFocusTarget} from './focus-viewport'
function setup(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
 const piece=(kind:string,id:string,system:number,selected:boolean)=>{const n=document.createElementNS(svg.namespaceURI,'g')as SVGGElement;n.classList.add('notation-span-target');n.dataset.spanId=id;n.dataset.spanKind=kind;n.dataset.systemIndex=String(system);n.setAttribute('aria-pressed',String(selected));return n}
 const selected=piece('slur','selected',0,true),first=piece('hairpin','tabbed',0,false),last=piece('hairpin','tabbed',2,false);svg.append(selected,first,last)
 return{svg,selected,first,last,piece}
}
it.each([0,2])('retains a separately focused unselected system %i without changing selection or order',system=>{
 const{svg,selected,first,last,piece}=setup(),previous=piece('hairpin','tabbed',system,false),before=[...svg.children]
 expect(resolveUnchangedSpanFocusTarget(svg,previous,false)).toBe(system===0?first:last)
 expect(selected.getAttribute('aria-pressed')).toBe('true');expect(first.getAttribute('aria-pressed')).toBe('false');expect(last.getAttribute('aria-pressed')).toBe('false');expect([...svg.children]).toEqual(before)
})
it('leaves a changed selection or document intent to the existing explicit selection resolver',()=>{
 const{svg,first}=setup();expect(resolveUnchangedSpanFocusTarget(svg,first,true)).toBeUndefined()
})
it('uses the existing first surviving piece fallback after reflow',()=>{
 const{svg,first,piece}=setup();expect(resolveUnchangedSpanFocusTarget(svg,piece('hairpin','tabbed',3,false),false)).toBe(first)
})
it('does not invent a target after deletion or for non-span focus',()=>{
 const{svg,piece}=setup();expect(resolveUnchangedSpanFocusTarget(svg,piece('hairpin','deleted',0,false),false)).toBeUndefined();expect(resolveUnchangedSpanFocusTarget(svg,document.createElement('input'),false)).toBeUndefined();expect(resolveUnchangedSpanFocusTarget(svg,null,false)).toBeUndefined()
})
it('rejects incomplete or unsupported painted references',()=>{
 const{svg,piece}=setup();for(const invalid of[piece('tie','tabbed',0,false),piece('hairpin','',0,false)])expect(resolveUnchangedSpanFocusTarget(svg,invalid,false)).toBeUndefined()
})
