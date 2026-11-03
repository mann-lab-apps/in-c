// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,beforeEach,describe,expect,it,vi,type Mock} from 'vitest'
import {usePlaybackViewport} from './usePlaybackViewport'
import {restoreNotationFocus} from '../notation/focus-viewport'

function mockOverlayGeometry(){
 vi.spyOn(document.documentElement,'clientHeight','get').mockReturnValue(768)
 vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(1200)
 vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-100,1024,1200))
}

describe('playback viewport ownership',()=>{
 let canvas:HTMLDivElement,reveal:Mock<(target:Element)=>void>,frames:Map<number,FrameRequestCallback>,next:number
 const flush=(time=performance.now()+1)=>act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))})
 const cursor=()=>{const n=document.createElementNS('http://www.w3.org/2000/svg','line');n.classList.add('notation-playhead');canvas.append(n);return n}
 beforeEach(()=>{
  canvas=document.createElement('div');document.body.append(canvas);reveal=vi.fn();frames=new Map();next=0
  vi.spyOn(document,'hasFocus').mockReturnValue(true)
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++next,fn);return next})
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id))
 })
 afterEach(()=>{cleanup();canvas.remove();vi.restoreAllMocks();vi.unstubAllGlobals()})
 it('reveals the rendered cursor without moving focus, including delayed renderer replacement',async()=>{
  const first=cursor(),focus=document.activeElement
  renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush()
  expect(reveal).toHaveBeenLastCalledWith(first);expect(document.activeElement).toBe(focus)
  let second:Element
  await act(async()=>{first.remove();second=cursor()});flush()
  expect(reveal).toHaveBeenLastCalledWith(second!);expect(reveal).toHaveBeenCalledTimes(2)
 })
 it('gives manual document scrolling priority until the user enables following again',()=>{
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush();reveal.mockClear()
  act(()=>window.dispatchEvent(new WheelEvent('wheel',{deltaY:120})))
  expect(result.current.following).toBe(false);flush();expect(reveal).not.toHaveBeenCalled()
  act(()=>result.current.toggleFollowing());flush();expect(reveal).toHaveBeenCalledOnce()
 })
 it('keeps following when a separate dock scrollport receives the wheel',()=>{
  const dock=document.createElement('div');dock.style.overflowY='auto';Object.defineProperties(dock,{clientHeight:{value:50},scrollHeight:{value:100}});document.body.append(dock)
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush()
  act(()=>dock.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:20})))
  expect(result.current.following).toBe(true);dock.remove()
 })
 it.each([
  {top:49.5,delta:20,overscroll:'auto',following:false},
  {top:49,delta:20,overscroll:'auto',following:true},
  {top:48.5,delta:20,overscroll:'auto',following:true},
  {top:49.5,delta:-20,overscroll:'auto',following:true},
  {top:49.5,delta:20,overscroll:'contain',following:true},
  {top:0,delta:-20,overscroll:'auto',following:false},
  {top:50,delta:20,overscroll:'auto',following:false},
  {top:0,delta:20,overscroll:'auto',following:true},
  {top:50,delta:-20,overscroll:'auto',following:true},
  {top:25,delta:20,overscroll:'auto',following:true},
  {top:25,delta:-20,overscroll:'auto',following:true},
  {top:0,delta:-20,overscroll:'contain',following:true},
  {top:50,delta:20,overscroll:'none',following:true},
  {top:0,delta:-20,overscroll:'contain',height:50,following:true},
  {top:0,delta:20,overscroll:'none',height:50,following:true},
  {top:0,delta:-20,overscroll:'auto',height:50,following:false},
  {top:0,delta:-20,overscroll:'contain',height:50,overflow:'visible',following:false},
  {top:0,delta:-20,overscroll:'contain',height:0,client:0,following:false}
 ])('respects dock wheel chaining at top=$top delta=$delta with $overscroll range=$height/$client overflow=$overflow',value=>{
  const dock=document.createElement('div');dock.style.overflowY=value.overflow??'auto';dock.style.overscrollBehaviorY=value.overscroll
  Object.defineProperties(dock,{clientHeight:{value:value.client??50},scrollHeight:{value:value.height??100}});dock.scrollTop=value.top;document.body.append(dock)
  try{
   cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
   // The wheel arrives before the pending cursor reveal, as in a real frame.
   act(()=>dock.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:value.delta})))
   expect(result.current.following).toBe(value.following);flush()
   expect(reveal).toHaveBeenCalledTimes(value.following?1:0)
  }finally{dock.remove()}
 })
 it('lets an outer dock consume a wheel that reaches the inner scroll boundary',()=>{
  const outer=document.createElement('div'),inner=document.createElement('div')
  for(const node of [outer,inner]){node.style.overflowY='auto';Object.defineProperties(node,{clientHeight:{value:50},scrollHeight:{value:100}})}
  inner.scrollTop=50;outer.scrollTop=25;outer.append(inner);document.body.append(outer)
  try{
   cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
   act(()=>inner.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:20})));flush()
   expect(result.current.following).toBe(true);expect(reveal).toHaveBeenCalledOnce()
  }finally{outer.remove()}
 })
 it.each(['drag','click','inner-scroll','released','zero','no-candidate','cancelled','blurred']as const)(
  'keeps approved press ownership through subsequent native events: %s',kind=>{
   const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
   Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
   const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
   mockOverlayGeometry()
   try{
    cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
    const manual=kind!=='no-candidate'&&kind!=='inner-scroll'
    act(()=>{
     if(kind!=='no-candidate')(kind==='inner-scroll'?canvas:document.documentElement).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:1021,button:0}))
    })
    expect(result.current.following).toBe(!manual)
    act(()=>{
     if(kind==='released')window.dispatchEvent(new PointerEvent('pointerup'))
     if(kind==='cancelled')window.dispatchEvent(new PointerEvent('pointercancel'))
     if(kind==='blurred')window.dispatchEvent(new Event('blur'))
     if(!['click','zero','inner-scroll'].includes(kind))viewportY=20
     if(kind==='inner-scroll')canvas.dispatchEvent(new Event('scroll',{bubbles:true}))
     else if(kind!=='click')document.dispatchEvent(new Event('scroll'))
    })
    expect(result.current.following).toBe(!manual);flush()
    expect(reveal).toHaveBeenCalledTimes(manual?0:1)
   }finally{width.mockRestore();Object.defineProperty(window,'scrollY',originalY)}
  })
 it.each(['pending-track','expired-track','thumb-click','new-focus','pending-drag','expired-drag']as const)(
  'yields on track or thumb press regardless of release timing and later focus: %s',kind=>{
   const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
   Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
   const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
   mockOverlayGeometry()
   try{
    cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
    act(()=>{
     for(const type of ['pointerdown','pointerup'])document.documentElement.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:1021,clientY:type==='pointerup'&&kind.endsWith('drag')?20:65,button:0}))
     if(kind==='new-focus'){const button=document.createElement('button');canvas.append(button);button.focus()}
    })
    // The approved press owns the viewport before any compositor movement.
    expect(result.current.following).toBe(false)
    if(kind==='expired-track'||kind==='expired-drag')flush()
    if(kind!=='thumb-click')act(()=>{viewportY=20;document.dispatchEvent(new Event('scroll'))})
    expect(result.current.following).toBe(false);flush()
    expect(reveal).not.toHaveBeenCalled()
    act(()=>result.current.toggleFollowing());flush();expect(reveal).toHaveBeenCalledOnce()
   }finally{width.mockRestore();Object.defineProperty(window,'scrollY',originalY)}
  })
 it.each([true,false])('keeps press ownership across SVG focus with automatic=%s until explicit following',automatic=>{
  const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
  Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
  const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
   mockOverlayGeometry()
  try{
   cursor();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),original=document.createElementNS(svg.namespaceURI,'g')as SVGGElement
   original.classList.add('notation-event');original.setAttribute('tabindex','0');svg.append(original);canvas.append(svg)
   const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
   act(()=>original.focus())
   let replacement:SVGGElement
   act(()=>{
    for(const type of ['pointerdown','pointerup'])document.documentElement.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:1021,clientY:65,button:0}))
    replacement=original.cloneNode(true)as SVGGElement;original.remove();svg.append(replacement)
    restoreNotationFocus(replacement,replacement,new DOMRect(0,0,10,10),canvas,false,automatic)
   })
   expect(document.activeElement).toBe(replacement!)
   act(()=>{viewportY=20;document.dispatchEvent(new Event('scroll'))})
   expect(result.current.following).toBe(false);flush()
   expect(reveal).not.toHaveBeenCalled()
   act(()=>result.current.toggleFollowing());flush();expect(reveal).toHaveBeenCalledOnce()
  }finally{width.mockRestore();Object.defineProperty(window,'scrollY',originalY)}
 })
 it.each([99,100])('does not revive following after a native press on frame timestamp %s',time=>{
  vi.spyOn(performance,'now').mockReturnValue(100)
  const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
  Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
  const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
   mockOverlayGeometry()
  try{
   cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush(101);reveal.mockClear()
   act(()=>{for(const type of ['pointerdown','pointerup'])document.documentElement.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:1021,clientY:65,button:0}))})
   flush(time)
   act(()=>{viewportY=20;document.dispatchEvent(new Event('scroll'))})
   expect(result.current.following).toBe(false);flush(101);expect(reveal).not.toHaveBeenCalled()
  }finally{width.mockRestore();Object.defineProperty(window,'scrollY',originalY)}
 })
 it.each([
  {top:49.5,endY:80,overscroll:'auto',following:false},
  {top:49,endY:80,overscroll:'auto',following:true},
  {top:48.5,endY:80,overscroll:'auto',following:true},
  {top:49.5,endY:80,overscroll:'contain',following:true},
  {top:0,endY:120,overscroll:'auto',following:false},
  {top:50,endY:80,overscroll:'auto',following:false},
  {top:25,endY:120,overscroll:'auto',following:true},
  {top:0,endY:80,overscroll:'auto',following:true},
  {top:0,endY:120,overscroll:'contain',following:true},
  {top:50,endY:80,overscroll:'none',following:true},
  {top:0,endY:100,overscroll:'auto',following:true},
  {top:0,endY:120,overscroll:'contain',height:50,following:true},
  {top:0,endY:120,overscroll:'auto',height:50,following:false}
 ])('respects a touch direction at top=$top endY=$endY with $overscroll',value=>{
  const dock=document.createElement('div');dock.style.overflowY='auto';dock.style.overscrollBehaviorY=value.overscroll
  Object.defineProperties(dock,{clientHeight:{value:50},scrollHeight:{value:value.height??100}});dock.scrollTop=value.top;document.body.append(dock)
  try{
   cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
   const touch=(type:string,y:number)=>dock.dispatchEvent(new TouchEvent(type,{bubbles:true,touches:[{identifier:1,clientY:y,clientX:20}as Touch]}))
   act(()=>{touch('touchstart',100);touch('touchmove',value.endY)})
   expect(result.current.following).toBe(value.following);flush()
   expect(reveal).toHaveBeenCalledTimes(value.following?1:0)
  }finally{dock.remove()}
 })
 it('cancels pending work on pause and does not reveal background or unmounted documents',()=>{
  cursor();const {rerender,unmount}=renderHook(({status}:{status:'playing'|'paused'})=>usePlaybackViewport({current:canvas},status,reveal),{initialProps:{status:'playing'}})
  rerender({status:'paused'});flush();expect(reveal).not.toHaveBeenCalled()
  vi.mocked(document.hasFocus).mockReturnValue(false);rerender({status:'playing'});flush();expect(reveal).not.toHaveBeenCalled()
  vi.mocked(document.hasFocus).mockReturnValue(true);act(()=>window.dispatchEvent(new Event('focus')));unmount();flush();expect(reveal).not.toHaveBeenCalled()
 })
 it('keeps the document ownership fallback when no single touch point is available',()=>{
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
  act(()=>canvas.dispatchEvent(new TouchEvent('touchmove',{bubbles:true})))
  expect(result.current.following).toBe(false);flush();expect(reveal).not.toHaveBeenCalled()
 })
 it('keeps a touch latched to its initial dock until a new gesture starts at the boundary',()=>{
  const dock=document.createElement('div');dock.style.overflowY='auto'
  Object.defineProperties(dock,{clientHeight:{value:50},scrollHeight:{value:100}});dock.scrollTop=1;document.body.append(dock)
  try{
   cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal))
   const touch=(type:string,y:number)=>dock.dispatchEvent(new TouchEvent(type,{bubbles:true,touches:[{identifier:1,clientY:y}as Touch]}))
   act(()=>{touch('touchstart',100);touch('touchmove',120)})
   expect(result.current.following).toBe(true)
   dock.scrollTop=0;act(()=>touch('touchmove',140))
   expect(result.current.following).toBe(true)
   act(()=>{touch('touchstart',140);touch('touchmove',160)})
   expect(result.current.following).toBe(false);flush();expect(reveal).not.toHaveBeenCalled()
  }finally{dock.remove()}
 })
 it.each<{key:string;input?:boolean;composing?:boolean;keyCode?:number}>([
  {key:'Home',input:true},{key:'Home',composing:true},{key:'End',keyCode:229}
 ])('keeps editing/composition ownership for $key with input=$input and composition=$composing',value=>{
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush()
  const target=value.input?document.createElement('input'):canvas
  if(target!==canvas)canvas.append(target)
  act(()=>target.dispatchEvent(new KeyboardEvent('keydown',{key:value.key,keyCode:value.keyCode,isComposing:value.composing,bubbles:true})))
  expect(result.current.following).toBe(true)
 })
 it('still yields to a real canvas navigation intent',()=>{
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush()
  act(()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true})))
  expect(result.current.following).toBe(false)
 })
 it('does not pan a focused inline editor and resumes after focus leaves',async()=>{
  cursor();const {result}=renderHook(()=>usePlaybackViewport({current:canvas},'playing',reveal));flush();reveal.mockClear()
  const input=document.createElement('input')
  await act(async()=>{canvas.append(input);input.focus()});flush()
  expect(reveal).not.toHaveBeenCalled();expect(result.current.following).toBe(true)
  act(()=>{canvas.tabIndex=0;canvas.focus()});flush();expect(reveal).toHaveBeenCalledOnce()
 })
})
