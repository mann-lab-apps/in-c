// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'
import {restoreNotationFocus} from './notation/focus-viewport'

registerAppTestHooks()
it.each(['document-wheel','dock-edge','dock-inner','dock-contained','dock-short-contained','dock-short-auto','dock-fractional-bottom','dock-bottom-room','touch-fractional-bottom','touch-bottom-room','touch-short-contained','touch-short-auto','zero-wheel','page','ime-page','touch-edge','touch-inner','touch-contained','overlay-drag','overlay-click','overlay-inner-scroll']as const)(
 'preserves selection viewport ownership across %s and automatic SVG focus',async kind=>{
  window.history.replaceState({},'','/?fixture=single-voice-mvp');const {App}=await import('./App');render(<App/>)
  const source=structuredClone(playbackMockState.lastScore),preview=screen.getByTestId('notation-preview'),selection=preview.getAttribute('data-selected-event-id')
  const canvas=screen.getByLabelText('악보 캔버스'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),original=document.createElementNS(svg.namespaceURI,'g')as SVGGElement
  original.classList.add('notation-event');original.setAttribute('tabindex','0');svg.append(original);canvas.append(svg)
  const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
  const width=vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
  const originalY=Object.getOwnPropertyDescriptor(window,'scrollY')!;let viewportY=100
  Object.defineProperty(window,'scrollY',{configurable:true,get:()=>viewportY})
  try{
   act(()=>original.focus());expect(playbackMockState.readViewportOwnership?.()).toBe(true)
   const dock=document.createElement('div');dock.style.overflowY='auto';dock.style.overscrollBehaviorY=kind.endsWith('contained')?'contain':'auto'
   Object.defineProperties(dock,{clientHeight:{value:50},scrollHeight:{value:kind.includes('short')?50:100}});dock.scrollTop=kind.includes('fractional')?49.5:kind.endsWith('bottom-room')?49:kind.endsWith('inner')?25:0
   document.querySelector('.studio-palette-dock')!.append(dock)
   if(kind.startsWith('overlay-')){
    vi.spyOn(document.documentElement,'clientHeight','get').mockReturnValue(768)
    vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(1200)
    vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-100,1024,1200))
    fireEvent.pointerDown(kind==='overlay-inner-scroll'?dock:document.documentElement,{clientX:1021,button:0})
    if(kind==='overlay-drag'){viewportY=20;fireEvent.scroll(document)}
    if(kind==='overlay-inner-scroll'){dock.scrollTop=20;fireEvent.scroll(dock)}
   }
   else if(kind.startsWith('touch-'))act(()=>{
    dock.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[{identifier:1,clientY:100}as Touch]}))
    dock.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,touches:[{identifier:1,clientY:kind.includes('bottom')?80:120}as Touch]}))
   })
   else if(kind==='page'||kind==='ime-page')fireEvent.keyDown(original,{key:'PageDown',isComposing:kind==='ime-page',keyCode:kind==='ime-page'?229:34})
   else fireEvent.wheel(kind.startsWith('dock-')?dock:canvas,{deltaY:kind==='zero-wheel'?0:kind.includes('bottom')?20:-20})
   const manual=['document-wheel','dock-edge','dock-short-auto','touch-short-auto','dock-fractional-bottom','touch-fractional-bottom','page','touch-edge','overlay-drag','overlay-click'].includes(kind)
   expect(playbackMockState.readViewportOwnership?.()).toBe(!manual)
   const replacement=original.cloneNode(true)as SVGGElement;original.remove();svg.append(replacement)
   act(()=>restoreNotationFocus(replacement,replacement,new DOMRect(0,0,10,10),canvas,false))
   expect(replacement).toHaveFocus();expect(playbackMockState.readViewportOwnership?.()).toBe(!manual)
   act(()=>screen.getByRole('button',{name:'악보로 이동'}).focus())
   expect(playbackMockState.readViewportOwnership?.()).toBe(true)
   expect(playbackMockState.lastScore).toEqual(source);expect(preview).toHaveAttribute('data-selected-event-id',selection!)
   expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled()
  }finally{scroll.mockRestore();width.mockRestore();Object.defineProperty(window,'scrollY',originalY)}
 })
