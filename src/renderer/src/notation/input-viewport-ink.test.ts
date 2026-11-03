// @vitest-environment jsdom
import {afterEach,expect,it,vi}from 'vitest'
import {readInputViewportInk}from './input-viewport-ink'
afterEach(()=>document.body.replaceChildren())
function fixture(){
 const host=document.createElement('div');host.innerHTML='<svg><g class="notation-event" data-part-id="p" data-staff-id="s" data-measure-id="m" data-voice-id="v" data-event-tick="0"><g class="vf-notehead"><text style="font:40px Bravura;fill:black;stroke:none">&#xe0a4;</text></g><rect opacity="0" width="9999" height="9999"/></g><g class="notation-note-input-cursor" data-part-id="p" data-staff-id="s" data-measure-id="m" data-voice-id="v" data-tick="0"/></svg>';document.body.append(host)
 const svg=host.querySelector('svg')!,event=host.querySelector<SVGElement>('.notation-event')!,cursor=host.querySelector<SVGElement>('.notation-note-input-cursor')!,head=host.querySelector('text')!,cue=new DOMRect(500,590,12,84)
 const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(m:DOMMatrix){return m}}as unknown as DOMMatrix
 svg.getCTM=()=>identity;svg.getScreenCTM=()=>identity;head.getCTM=()=>identity;head.getStartPositionOfChar=()=>({x:544,y:676}as DOMPoint);head.getBBox=()=>{throw Error('Font em is not head ink')};host.querySelector('rect')!.getBBox=()=>{throw Error('Transparent hit rectangle must not be measured')};cursor.getBoundingClientRect=()=>cue
 const measureText=vi.fn(()=>({actualBoundingBoxLeft:0,actualBoundingBoxRight:12,actualBoundingBoxAscent:10,actualBoundingBoxDescent:5,fontBoundingBoxAscent:999,fontBoundingBoxDescent:999})),context={font:'',letterSpacing:'',wordSpacing:'',measureText}as unknown as CanvasRenderingContext2D
 return{host,svg,event,cursor,head,cue,context,measureText,identity}
}
it('reveals actual low-head ink beyond a fully visible cue without using an em or hit box',()=>{
 const f=fixture(),before=f.host.innerHTML,bounds=readInputViewportInk(f.cursor,f.context);expect(f.cue.bottom).toBe(674);expect(bounds.bottom).toBe(681);expect(bounds.left).toBe(500);expect(bounds.right).toBe(556);expect(bounds.top).toBe(590);expect(f.host.innerHTML).toBe(before)
})
it('includes high/chord heads and screen transforms while leaving the visible cue geometry unchanged',()=>{
 const f=fixture();f.head.getStartPositionOfChar=()=>({x:544,y:580}as DOMPoint);expect(readInputViewportInk(f.cursor,f.context).top).toBe(570)
 const second=f.head.cloneNode(true)as SVGTextContentElement;f.head.parentElement!.append(second);second.getCTM=()=>f.identity;second.getStartPositionOfChar=()=>({x:544,y:712}as DOMPoint);expect(readInputViewportInk(f.cursor,f.context).bottom).toBe(717)
 f.svg.getScreenCTM=()=>({a:1.5,b:0,c:0,d:1.5,e:20,f:10}as DOMMatrix);const b=readInputViewportInk(f.cursor,f.context);expect(b.bottom).toBe(1085.5);expect(b.right).toBe(854);expect(f.cursor.getBoundingClientRect()).toBe(f.cue)
})
it.each(['partId','staffId','measureId','voiceId','eventTick']as const)('does not attach another %s owner or timestamp',key=>{
 const f=fixture();f.event.dataset[key]=key==='eventTick'?'480':'other';expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);expect(f.measureText).not.toHaveBeenCalled()
})
it('declines ambiguous,preview,empty and missing metadata rather than guessing a neighboring event',()=>{
 const f=fixture(),clone=f.event.cloneNode(true)as SVGElement;f.svg.append(clone);expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);clone.remove();f.event.classList.add('is-preview');expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);f.event.classList.remove('is-preview');delete f.event.dataset.eventTick;expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);f.event.dataset.eventTick='';expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);expect(f.measureText).not.toHaveBeenCalled()
})
it('falls back safely for unavailable or invisible ink and missing screen transforms',()=>{
 const f=fixture();expect(readInputViewportInk(f.cursor,null)).toBe(f.cue);f.event.style.opacity='0';expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue);expect(f.measureText).not.toHaveBeenCalled();f.event.style.opacity='1';f.svg.getScreenCTM=()=>null;expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue)
})
it('includes only the matching event painted stem, not transparent or hidden geometry',()=>{
 const f=fixture(),group=document.createElementNS('http://www.w3.org/2000/svg','g'),stem=document.createElementNS('http://www.w3.org/2000/svg','path');group.classList.add('vf-stem');stem.style.cssText='fill:none;stroke:black;stroke-width:2px';stem.getCTM=()=>f.identity;stem.getBBox=()=>new DOMRect(550,540,0,100);group.append(stem);f.event.append(group)
 expect(readInputViewportInk(f.cursor,f.context).top).toBe(539);expect(readInputViewportInk(f.cursor,f.context).bottom).toBe(681);stem.style.opacity='0';expect(readInputViewportInk(f.cursor,f.context).top).toBe(590)
})
it('declines malformed negative or empty cursor timestamps',()=>{
 const f=fixture();for(const tick of ['-1','','not-a-tick']){f.cursor.dataset.tick=tick;f.event.dataset.eventTick=tick;expect(readInputViewportInk(f.cursor,f.context)).toBe(f.cue)}expect(f.measureText).not.toHaveBeenCalled()
})

it.each([['up',580,550,592],['down',570,720,582]]as const)('includes the current note %s flag paint beyond its head/stem without changing the SVG',(_direction,x,y,right)=>{
 const f=fixture(),flag=document.createElementNS('http://www.w3.org/2000/svg','g'),text=f.head.cloneNode(true)as SVGTextContentElement;flag.classList.add('vf-flag');text.textContent='\ue246';text.getCTM=()=>f.identity;text.getStartPositionOfChar=()=>({x,y}as DOMPoint);flag.append(text);f.event.append(flag)
 const before=f.host.innerHTML,bounds=readInputViewportInk(f.cursor,f.context);expect(bounds.right).toBe(right);expect(bounds.top).toBe(Math.min(590,y-10));expect(bounds.bottom).toBe(Math.max(681,y+5));expect(f.host.innerHTML).toBe(before)
 flag.style.opacity='0';expect(readInputViewportInk(f.cursor,f.context).right).toBe(556)
})
it('does not include a foreign event flag or a nested grace flag as the principal flag',()=>{
 const f=fixture(),flag=document.createElementNS('http://www.w3.org/2000/svg','g'),text=f.head.cloneNode(true)as SVGTextContentElement;flag.classList.add('vf-flag');text.getCTM=()=>f.identity;text.getStartPositionOfChar=()=>({x:900,y:400}as DOMPoint);flag.append(text)
 const foreign=f.event.cloneNode(false)as SVGElement;foreign.dataset.voiceId='other';foreign.append(flag);f.svg.append(foreign);expect(readInputViewportInk(f.cursor,f.context).right).toBe(556)
 const grace=document.createElementNS('http://www.w3.org/2000/svg','g');grace.classList.add('vf-gracenote');grace.append(flag);f.event.append(grace);expect(readInputViewportInk(f.cursor,f.context).right).toBe(556)
})
