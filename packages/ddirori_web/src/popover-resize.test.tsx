import React, {useState} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {Button,Input,Popover,ddiroriTokens} from './index'

const opened=new WeakSet<Element>(),matches=Element.prototype.matches
const show=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'showPopover')
const hide=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidePopover')
beforeAll(()=>{
  Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){opened.add(this);this.style.display='block'}})
  Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(this:HTMLElement){opened.delete(this);this.style.display='none'}})
})
beforeEach(()=>{vi.spyOn(Element.prototype,'matches').mockImplementation(function(this:Element,selector:string){return selector===':popover-open'?opened.has(this):matches.call(this,selector)})})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
afterAll(()=>{
  if(show)Object.defineProperty(HTMLElement.prototype,'showPopover',show);else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
  if(hide)Object.defineProperty(HTMLElement.prototype,'hidePopover',hide);else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
})

it.each(['menu','dialog'] as const)('keeps the open %s inside the viewport after content growth without resetting its owner',kind=>verifyResize(kind,'surface'))
it.each(['menu','dialog'] as const)('keeps the open %s below its resized trigger when there is room',kind=>verifyResize(kind,'trigger'))

async function verifyResize(kind:'menu'|'dialog',changed:'surface'|'trigger'){
  const originalHeight=Object.getOwnPropertyDescriptor(window,'innerHeight')!
  Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>600})
  let surfaceHeight=100,triggerHeight=40
  const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
  vi.stubGlobal('ResizeObserver',class{
    targets=new Set<Element>()
    constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
    observe(node:Element){this.targets.add(node)}
    unobserve(node:Element){this.targets.delete(node)}
    disconnect(){observers.delete(this);this.targets.clear()}
  })
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
    if(this.hasAttribute('aria-haspopup'))return new DOMRect(40,300,80,triggerHeight)
    if(this.matches('[role="menu"],[role="dialog"]'))return new DOMRect(parseFloat(this.style.left)||0,parseFloat(this.style.top)||0,320,surfaceHeight)
    return new DOMRect()
  })
  const close=vi.fn(),change=vi.fn(),command=vi.fn()
  function Consumer(){
    const[value,setValue]=useState('280')
    return <div className="ddirori"><Popover label="Actions" menu={kind==='menu'} open onOpenChange={close}>
      {kind==='menu'?<Button role="menuitem" onClick={command}>Action</Button>:<Input label="Dock width" type="number" min={200} max={360} value={value} onChange={event=>{change();setValue(event.currentTarget.value)}}/>}
    </Popover></div>
  }
  try{
    render(<Consumer />)
    const surface=screen.getByRole(kind,{name:'Actions'}),trigger=screen.getByRole('button',{name:'Actions'}),control=kind==='menu'?screen.getByRole('menuitem',{name:'Action'}):screen.getByRole('spinbutton',{name:'Dock width'})
    expect(document.activeElement).toBe(control)
    if(kind==='dialog')fireEvent.change(control,{target:{value:'2'}})
    expect(surface.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight-ddiroriTokens.spacing.md)
    act(()=>{
      if(changed==='surface')surfaceHeight=350;else triggerHeight=120
      for(const observer of observers)if(observer.targets.has(changed==='surface'?surface:trigger))observer.callback([],observer as unknown as ResizeObserver)
    })
    const rect=surface.getBoundingClientRect()
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight-ddiroriTokens.spacing.md)
    expect(rect.top).toBeGreaterThanOrEqual(ddiroriTokens.spacing.md)
    if(changed==='trigger')expect(rect.top).toBeGreaterThanOrEqual(trigger.getBoundingClientRect().bottom)
    expect(document.activeElement).toBe(control)
    if(kind==='dialog')expect((control as HTMLInputElement).value).toBe('2')
    expect(change).toHaveBeenCalledTimes(kind==='dialog'?1:0)
    expect(close).not.toHaveBeenCalled();expect(command).not.toHaveBeenCalled()
  }finally{cleanup();Object.defineProperty(window,'innerHeight',originalHeight)}
}


it.each(['menu','dialog'] as const)('preserves the current owner during %s resize and leaves ordinary scroll inspection alone',kind=>{
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  disconnect(){observers.delete(this)}
 })
 const close=vi.fn(),command=vi.fn()
 render(<Popover label="Owned surface" menu={kind==='menu'} open onOpenChange={close}>
  {kind==='menu'?<><Button role="menuitem" onClick={command}>First</Button><Button role="menuitem" onClick={command}>Current</Button></>:<input aria-label="Draft" defaultValue="2"/>}
 </Popover>)
 const surface=screen.getByRole(kind,{name:'Owned surface'}),owner=kind==='menu'?screen.getByRole('menuitem',{name:'Current'}):screen.getByRole('textbox',{name:'Draft'})
 owner.focus();const scroll=vi.fn();owner.scrollIntoView=scroll
 fireEvent.scroll(surface);expect(scroll).not.toHaveBeenCalled()
 act(()=>{for(const observer of observers)if(observer.targets.has(surface))observer.callback([],observer as unknown as ResizeObserver)})
 if(kind==='menu'){expect(scroll).toHaveBeenCalledTimes(1);expect(scroll).toHaveBeenCalledWith({block:'nearest'})}
 else expect(scroll).not.toHaveBeenCalled()
 expect(document.activeElement).toBe(owner);expect(close).not.toHaveBeenCalled();expect(command).not.toHaveBeenCalled()
 scroll.mockClear();fireEvent.scroll(surface);expect(scroll).not.toHaveBeenCalled()
})
