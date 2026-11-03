import React from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {Select} from './index'

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

it.each(['below-trigger','above-trigger','content-flip'] as const)('repositions an open Select on %s resize without committing its active option',scenario=>{
 const descriptor=Object.getOwnPropertyDescriptor(window,'innerHeight')!
 Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>600})
 let top=scenario==='above-trigger'?500:scenario==='content-flip'?300:200,triggerHeight=40,contentHeight=100
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  unobserve(node:Element){this.targets.delete(node)}
  disconnect(){observers.delete(this);this.targets.clear()}
 })
 vi.spyOn(HTMLElement.prototype,'scrollHeight','get').mockImplementation(function(this:HTMLElement){return this.getAttribute('role')==='listbox'?contentHeight:0})
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(this.getAttribute('role')==='combobox')return new DOMRect(40,top,192,triggerHeight)
  if(this.getAttribute('role')==='listbox')return new DOMRect(parseFloat(this.style.left)||0,parseFloat(this.style.top)||0,192,Math.min(contentHeight,parseFloat(this.style.maxHeight)||contentHeight))
  return new DOMRect()
 })
 const change=vi.fn()
 try{
  render(<Select label="Target" options={[{label:'First',value:'first'},{label:'Second',value:'second'}]} value="first" onChange={change}/>)
  const trigger=screen.getByRole('combobox',{name:'Target'})
  trigger.focus();fireEvent.keyDown(trigger,{key:'ArrowDown'});fireEvent.keyDown(trigger,{key:'ArrowDown'})
  const surface=screen.getByRole('listbox',{name:'Target'}),active=trigger.getAttribute('aria-activedescendant')
  expect(document.getElementById(active!)?.textContent).toBe('Second')
  act(()=>{
   if(scenario==='content-flip')contentHeight=300
   else if(scenario==='above-trigger'){top=400;triggerHeight=160}
   else triggerHeight=120
   const changed=scenario==='content-flip'?surface:trigger
   for(const observer of observers)if(observer.targets.has(changed))observer.callback([],observer as unknown as ResizeObserver)
  })
  const r=surface.getBoundingClientRect(),t=trigger.getBoundingClientRect()
  expect(r.top).toBeGreaterThanOrEqual(8);expect(r.bottom).toBeLessThanOrEqual(592)
  if(scenario==='below-trigger')expect(r.top).toBeGreaterThanOrEqual(t.bottom+4)
  else expect(r.bottom).toBeLessThanOrEqual(t.top-4)
  expect(document.activeElement).toBe(trigger)
  expect(trigger.getAttribute('aria-activedescendant')).toBe(active)
  expect(screen.getByRole('option',{name:'First'}).getAttribute('aria-selected')).toBe('true')
  expect(trigger.getAttribute('aria-expanded')).toBe('true');expect(change).not.toHaveBeenCalled()
  fireEvent.keyDown(trigger,{key:'Escape'});expect(change).not.toHaveBeenCalled()
  expect(observers.size).toBe(0)
 }finally{cleanup();Object.defineProperty(window,'innerHeight',descriptor)}
})


it('reveals the current uncommitted option after density resize but leaves manual list inspection alone',()=>{
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  disconnect(){observers.delete(this)}
 })
 const changed=vi.fn()
 render(<Select label="Parts" value="1" options={Array.from({length:17},(_,i)=>({value:String(i+1),label:'Part '+(i+1)}))} onChange={changed}/>)
 const trigger=screen.getByRole('combobox',{name:'Parts'});trigger.focus()
 fireEvent.keyDown(trigger,{key:'ArrowDown'});fireEvent.keyDown(trigger,{key:'End'})
 const surface=screen.getByRole('listbox',{name:'Parts'}),active=screen.getByRole('option',{name:'Part 17'}),selected=screen.getByRole('option',{name:'Part 1'})
 const activeScroll=vi.fn(),selectedScroll=vi.fn()
 active.scrollIntoView=activeScroll;selected.scrollIntoView=selectedScroll
 fireEvent.scroll(surface)
 expect(activeScroll).not.toHaveBeenCalled()
 act(()=>{for(const observer of observers)if(observer.targets.has(trigger))observer.callback([],observer as unknown as ResizeObserver)})
 expect(activeScroll).toHaveBeenCalledTimes(1);expect(activeScroll).toHaveBeenCalledWith({block:'nearest'})
 expect(selectedScroll).not.toHaveBeenCalled();expect(changed).not.toHaveBeenCalled()
 expect(trigger.getAttribute('aria-activedescendant')).toBe(active.id);expect(document.activeElement).toBe(trigger)
 expect(selected.getAttribute('aria-selected')).toBe('true')
 activeScroll.mockClear();fireEvent.scroll(surface);expect(activeScroll).not.toHaveBeenCalled()
 fireEvent.keyDown(trigger,{key:'Escape'});expect(changed).not.toHaveBeenCalled()
})
