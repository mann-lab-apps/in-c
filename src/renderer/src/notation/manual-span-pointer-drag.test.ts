// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { attachManualSpanPointerDrag } from './manual-span-pointer-drag'
import * as ownership from './span-pointer-owner'
const disposers:(()=>void)[]=[]
afterEach(()=>{for(const dispose of disposers.splice(0))dispose();document.body.replaceChildren();vi.restoreAllMocks()})
function pointer(target:EventTarget,type:string,x=100,y=100,extra:Record<string,unknown>={}){
 const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,...extra});Object.defineProperties(event,{pointerId:{value:extra.pointerId??1},pointerType:{value:extra.pointerType??'mouse'},isPrimary:{value:extra.isPrimary??true}});target.dispatchEvent(event);return event
}
function setup(extra:Partial<Parameters<typeof attachManualSpanPointerDrag>[1]>={}){
 const root=document.createElement('div');document.body.append(root);root.innerHTML='<svg><g class="notation-span-target is-selected" data-span-kind="slur" data-span-id="one" tabindex="0"><path/></g><g class="notation-span-target is-selected" data-span-kind="slur" data-span-id="one" transform="translate(0 40)"><path/></g><g class="notation-span-target" data-span-kind="slur" data-span-id="other"><path/></g></svg><button>다른 도구</button>'
 const svg=root.querySelector('svg')!,nodes=[...root.querySelectorAll<SVGElement>('[data-span-id="one"]')],commit=vi.fn(()=>true),reject=vi.fn(),begin=vi.fn(()=>({commit,reject})),base=Object.freeze({offsetX:0,offsetY:0,height:2})
 let scale=2
 Object.defineProperty(svg,'getScreenCTM',{value:()=>({a:scale,b:0,c:0,d:scale,e:10,f:20,inverse:()=>({a:1/scale,b:0,c:0,d:1/scale,e:-10/scale,f:-20/scale})})})
 vi.spyOn(ownership,'resolveSpanPointerOwner').mockReturnValue(undefined)
 const dispose=attachManualSpanPointerDrag(root,{reference:{kind:'slur',id:'one'},engraving:base,begin,...extra});disposers.push(dispose)
 return{root,svg,nodes,commit,reject,begin,base,dispose,setScale:(value:number)=>{scale=value}}
}
it('previews all pieces in SVG coordinates and commits one command only at release',()=>{
 const f=setup();pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',110,105);expect(f.commit).not.toHaveBeenCalled();expect(f.base).toEqual({offsetX:0,offsetY:0,height:2});expect(f.nodes[0].getAttribute('transform')).toBe('translate(5 2.5)');expect(f.nodes[1].getAttribute('transform')).toBe('translate(5 2.5) translate(0 40)')
 pointer(window,'pointerup',110,105);expect(f.commit).toHaveBeenCalledExactlyOnceWith({offsetX:.5,offsetY:.25,height:2});expect(f.nodes[0].getAttribute('transform')).toBeNull();expect(f.nodes[1].getAttribute('transform')).toBe('translate(0 40)');pointer(window,'pointerup',110,105);expect(f.commit).toHaveBeenCalledOnce()
 const click=new MouseEvent('click',{bubbles:true,cancelable:true,detail:1,clientX:110,clientY:105});f.nodes[0].dispatchEvent(click);expect(click.defaultPrevented).toBe(true)
 const other=new MouseEvent('click',{bubbles:true,cancelable:true,detail:1,clientX:110,clientY:105});f.root.querySelector('button')!.dispatchEvent(other);expect(other.defaultPrevented).toBe(false)
})
it.each(['escape','pointercancel','capture','blur','scroll','wheel','resize','composition','other-key','focus','cleanup','disconnected','matrix'] as const)('cancels %s without a score command or lingering transform',cause=>{
 const f=setup();pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',110,105)
 if(cause==='escape'){const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true)}
 else if(cause==='pointercancel')pointer(window,'pointercancel')
 else if(cause==='capture')pointer(f.nodes[0],'lostpointercapture')
 else if(cause==='wheel')window.dispatchEvent(new WheelEvent('wheel',{deltaY:1}))
 else if(cause==='composition')window.dispatchEvent(new Event('compositionstart'))
 else if(cause==='other-key')window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}))
 else if(cause==='focus')f.root.querySelector('button')!.focus()
 else if(cause==='cleanup')f.dispose()
 else if(cause==='disconnected')f.svg.remove()
 else if(cause==='matrix')f.setScale(3)
 else window.dispatchEvent(new Event(cause))
 pointer(window,'pointerup',110,105);expect(f.commit).not.toHaveBeenCalled();expect(f.reject).not.toHaveBeenCalled();expect(f.nodes[0].getAttribute('transform')).toBeNull();expect(f.nodes[1].getAttribute('transform')).toBe('translate(0 40)')
})
it('ignores a zero wheel and unrelated pointers; a real move can still finish',()=>{
 const f=setup();pointer(f.nodes[0],'pointerdown');window.dispatchEvent(new WheelEvent('wheel'));pointer(window,'pointermove',200,200,{pointerId:2});pointer(window,'pointerup',200,200,{pointerId:2});expect(f.commit).not.toHaveBeenCalled();pointer(window,'pointermove',110,105);pointer(window,'pointerup',110,105);expect(f.commit).toHaveBeenCalledOnce()
})
it.each([{ctrlKey:true},{altKey:true},{shiftKey:true},{metaKey:true},{pointerType:'touch'},{pointerType:'pen'},{button:2},{isPrimary:false}])('preserves ordinary selection/pan for unsupported start %o',extra=>{
 const f=setup(),event=pointer(f.nodes[0],'pointerdown',100,100,extra);pointer(window,'pointermove',110,105);pointer(window,'pointerup',110,105);expect(event.defaultPrevented).toBe(false);expect(f.begin).not.toHaveBeenCalled();expect(f.commit).not.toHaveBeenCalled()
})
it.each([{engraving:undefined},{engraving:{}},{printLayout:true}])('never starts a manual drag in %o',extra=>{const f=setup(extra);pointer(f.nodes[0],'pointerdown');expect(f.begin).not.toHaveBeenCalled()})
it('keeps a click/threshold jitter out of history and rejects an overflowing release without a clamp',()=>{
 const f=setup();pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',101,101);pointer(window,'pointerup',101,101);expect(f.commit).not.toHaveBeenCalled();expect(f.reject).not.toHaveBeenCalled()
 pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',300,100);expect(f.nodes[0].hasAttribute('data-span-drag-invalid')).toBe(true);pointer(window,'pointerup',300,100);expect(f.commit).not.toHaveBeenCalled();expect(f.reject).toHaveBeenCalledExactlyOnceWith('range')
})
it('permits re-entry after overflow and respects unique painted ownership over the broad hit path',()=>{
 const f=setup();vi.mocked(ownership.resolveSpanPointerOwner).mockReturnValueOnce({kind:'slur',id:'other'});pointer(f.nodes[0],'pointerdown');expect(f.begin).not.toHaveBeenCalled();pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',300,100);pointer(window,'pointermove',110,100);pointer(window,'pointerup',110,100);expect(f.commit).toHaveBeenCalledExactlyOnceWith({offsetX:.5,offsetY:0,height:2});expect(f.reject).not.toHaveBeenCalled()
})

it('ignores another pointer or an obsolete capture-loss event while its own capture is still held',()=>{
 const f=setup();Object.defineProperty(f.nodes[0],'hasPointerCapture',{value:()=>true});pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',110,105);pointer(f.nodes[0],'lostpointercapture',110,105,{pointerId:2});pointer(f.nodes[0],'lostpointercapture',110,105);pointer(window,'pointerup',110,105);expect(f.commit).toHaveBeenCalledOnce()
})
it.each(['Control','Meta','Alt','Shift'])('cancels preview when %s is pressed during a plain-mouse gesture',key=>{const f=setup();pointer(f.nodes[0],'pointerdown');pointer(window,'pointermove',110,105);window.dispatchEvent(new KeyboardEvent('keydown',{key}));pointer(window,'pointerup',110,105);expect(f.commit).not.toHaveBeenCalled();expect(f.nodes[0].getAttribute('transform')).toBeNull()})
