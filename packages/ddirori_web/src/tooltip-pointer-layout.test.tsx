import React from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {Button,Tooltip} from './index'

const show=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'showPopover')
const hide=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidePopover')
let hostBox:DOMRect,tipBox:DOMRect
const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
beforeAll(()=>{
 Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){this.style.display='block'}})
 Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(){}})
})
beforeEach(()=>{
 hostBox=new DOMRect(40,100,48,32);tipBox=new DOMRect(40,60,200,40)
 const original=HTMLElement.prototype.getBoundingClientRect
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(this.matches('.dd-tooltip-wrap,button'))return hostBox
  if(this.getAttribute('role')==='tooltip')return tipBox
  return original.call(this)
 })
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(target:Element){this.targets.add(target)}
  unobserve(target:Element){this.targets.delete(target)}
  disconnect(){this.targets.clear();observers.delete(this)}
 })
})
afterEach(()=>{cleanup();observers.clear();vi.restoreAllMocks();vi.unstubAllGlobals()})
afterAll(()=>{
 if(show)Object.defineProperty(HTMLElement.prototype,'showPopover',show)
 else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
 if(hide)Object.defineProperty(HTMLElement.prototype,'hidePopover',hide)
 else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})

function setup(disabled=false){
 render(<Tooltip text="Command guidance"><Button disabled={disabled} onClick={()=>{}}>Command</Button></Tooltip>)
 const button=screen.getByRole('button'),host=button.closest<HTMLElement>('.dd-tooltip-wrap')!
 return{button,host}
}
function layout(kind:'scroll'|'resize'|'observer'){
 if(kind==='scroll')fireEvent.scroll(window)
 else if(kind==='resize')fireEvent.resize(window)
 else act(()=>{for(const observer of observers)if(observer.targets.has(document.body))observer.callback([],observer as unknown as ResizeObserver)})
}
const kinds=['scroll','resize','observer']as const
it.each(kinds.flatMap(kind=>(['host','text']as const).map(pointer=>({kind,pointer}))))(
 'dismisses hover guidance when $kind moves both surfaces away from a stationary pointer in $pointer',({kind,pointer})=>{
  const {host}=setup()
  fireEvent.mouseEnter(host,{clientX:50,clientY:110})
  expect(screen.getByRole('tooltip')).toBeTruthy()
  if(pointer==='text')fireEvent.mouseLeave(host,{clientX:80,clientY:80})
  hostBox=new DOMRect(40,300,48,32);tipBox=new DOMRect(40,260,200,40)
  layout(kind)
  expect(screen.queryByRole('tooltip')).toBeNull()
 })
it.each(kinds)('keeps real keyboard focus guidance through %s after hover geometry moves',kind=>{
 const {button,host}=setup()
 act(()=>button.focus())
 fireEvent.mouseEnter(host,{clientX:50,clientY:110})
 fireEvent.mouseLeave(host,{clientX:80,clientY:80})
 hostBox=new DOMRect(40,300,48,32);tipBox=new DOMRect(40,260,200,40)
 layout(kind)
 expect(screen.getByRole('tooltip')).toBeTruthy()
 expect(document.activeElement).toBe(button)
})
it('keeps text reading when the stationary pointer remains in the repositioned explanation',()=>{
 const {host}=setup()
 fireEvent.mouseEnter(host,{clientX:50,clientY:110})
 fireEvent.mouseLeave(host,{clientX:80,clientY:80})
 hostBox=new DOMRect(40,120,48,32);tipBox=new DOMRect(40,80,200,40)
 layout('scroll')
 expect(screen.getByRole('tooltip')).toBeTruthy()
 fireEvent.mouseMove(document.body,{clientX:400,clientY:400})
 expect(screen.queryByRole('tooltip')).toBeNull()
})
it('retains a disabled control explanation while its visible trigger still owns the pointer',()=>{
 const {host}=setup(true)
 fireEvent.mouseEnter(host,{clientX:50,clientY:110})
 layout('observer')
 expect(screen.getByRole('tooltip')).toBeTruthy()
})
it('uses a fresh pointer position when the same trigger is entered again after layout dismissal',()=>{
 const {host}=setup()
 fireEvent.mouseEnter(host,{clientX:50,clientY:110})
 hostBox=new DOMRect(40,300,48,32);tipBox=new DOMRect(40,260,200,40)
 layout('scroll')
 expect(screen.queryByRole('tooltip')).toBeNull()
 fireEvent.mouseEnter(host,{clientX:50,clientY:310})
 layout('observer')
 expect(screen.getByRole('tooltip')).toBeTruthy()
})
