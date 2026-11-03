// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it.each(['dynamic','harmony']as const)('reveals focused %s ink above the footer without overriding newer manual inspection',async kind=>{
 const frames=new Map<number,FrameRequestCallback>();let serial=0
 const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++serial,cb);return serial})
 const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
 const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
 const flush=()=>act(()=>{const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(0))})
 try{
  window.history.replaceState({},'','/?fixture=single-voice-mvp');const {App}=await import('./App');render(<App/>)
  const source=structuredClone(playbackMockState.lastScore),preview=screen.getByTestId('notation-preview'),selection=preview.getAttribute('data-selected-event-id')
  const canvas=screen.getByLabelText('악보 캔버스'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),mark=document.createElementNS(svg.namespaceURI,'g')as SVGGElement,ink=document.createElementNS(svg.namespaceURI,'rect')as SVGRectElement
  mark.classList.add(`notation-${kind}-target`);mark.setAttribute('role','button');mark.setAttribute('tabindex','0');mark.setAttribute(`data-${kind}-id`,'mark-owned');mark.append(ink);svg.append(mark);canvas.append(svg)
  // The group may contain extra outline/interaction nodes. Read the existing
  // measured ink rect, as for the other interactive score text families.
  vi.spyOn(mark,'getBoundingClientRect').mockReturnValue(new DOMRect(30,20,200,580))
  vi.spyOn(ink,'getBoundingClientRect').mockReturnValue(new DOMRect(30,620,40,20))
  vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,600,960,100))
  mark.scrollIntoView=vi.fn()
  const button=screen.getByRole('button',{name:'악보로 이동'})
  for(const intent of ['normal','zero-wheel','wheel','touch']as const){
   act(()=>button.focus());flush();frames.clear();scroll.mockClear();vi.mocked(mark.scrollIntoView).mockClear()
   act(()=>mark.focus());expect(mark).toHaveFocus()
   if(intent==='zero-wheel')fireEvent.wheel(document.documentElement,{deltaX:0,deltaY:0})
   if(intent==='wheel')fireEvent.wheel(document.documentElement,{deltaY:200})
   if(intent==='touch')fireEvent.touchMove(document.documentElement)
   flush()
   if(intent==='wheel'||intent==='touch'){
    expect(scroll).not.toHaveBeenCalled();expect(mark.scrollIntoView).not.toHaveBeenCalled()
   }else{
    expect(scroll).toHaveBeenCalled();expect(mark.scrollIntoView).toHaveBeenCalled()
   }
   expect(mark).toHaveFocus()
   act(()=>{button.focus();mark.focus()});scroll.mockClear();flush();expect(scroll).toHaveBeenCalled()
  }
  expect(playbackMockState.lastScore).toEqual(source);expect(preview).toHaveAttribute('data-selected-event-id',selection!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
 }finally{raf.mockRestore();cancel.mockRestore();scroll.mockRestore()}
})
