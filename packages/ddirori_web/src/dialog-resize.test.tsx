import React from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterAll,afterEach,beforeAll,expect,it,vi} from 'vitest'
import {Dialog,Input} from './index'

const show=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal'),close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close')
beforeAll(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.open=true}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.open=false}})
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
afterAll(()=>{
 if(show)Object.defineProperty(HTMLDialogElement.prototype,'showModal',show);else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal
 if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close
})
it.each(['owned','other-owner'] as const)('keeps current modal draft visible on resize without taking %s focus',owner=>{
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  unobserve(node:Element){this.targets.delete(node)}
  disconnect(){observers.delete(this)}
 })
 const change=vi.fn(),cancel=vi.fn()
 const {unmount}=render(<><button>Later destination</button><Dialog open title="New score" onClose={cancel}><Input label="Title" defaultValue="Draft" onChange={change}/></Dialog></>)
 const dialog=screen.getByRole('dialog',{name:'New score'}),field=screen.getByRole('textbox',{name:'Title'}),later=screen.getByRole('button',{name:'Later destination'})
 field.focus();fireEvent.change(field,{target:{value:'임시 창 검증'}})
 if(owner==='other-owner')later.focus()
 const scroll=vi.fn();field.scrollIntoView=scroll
 fireEvent.scroll(dialog);expect(scroll).not.toHaveBeenCalled()
 fireEvent(window,new Event('resize'))
 expect(scroll).toHaveBeenCalledTimes(owner==='owned'?1:0)
 if(owner==='owned')expect(scroll).toHaveBeenLastCalledWith({block:'nearest',inline:'nearest'})
 expect(document.activeElement).toBe(owner==='owned'?field:later)
 expect((field as HTMLInputElement).value).toBe('임시 창 검증');expect(change).toHaveBeenCalledTimes(1);expect(cancel).not.toHaveBeenCalled()
 scroll.mockClear()
 act(()=>{for(const observer of observers)if(observer.targets.has(dialog))observer.callback([],observer as unknown as ResizeObserver)})
 expect(scroll).toHaveBeenCalledTimes(owner==='owned'?1:0)
 expect(document.activeElement).toBe(owner==='owned'?field:later);expect(cancel).not.toHaveBeenCalled()
 unmount();expect(observers.size).toBe(0)
})

it.each(['same-editor','newer-editor'] as const)('observes only the currently owned editor when the modal outer size is clamped: %s',scenario=>{
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  unobserve(node:Element){this.targets.delete(node)}
  disconnect(){observers.delete(this)}
 })
 const cancel=vi.fn(),change=vi.fn()
 render(<Dialog open title="Clamped modal" onClose={cancel}><Input label="First editor" defaultValue="first" onChange={change}/><Input label="Next editor" defaultValue="next" onChange={change}/></Dialog>)
 const first=screen.getByRole('textbox',{name:'First editor'}),next=screen.getByRole('textbox',{name:'Next editor'}),a=vi.fn(),b=vi.fn()
 first.scrollIntoView=a;next.scrollIntoView=b;first.focus()
 const resize=(target:Element)=>act(()=>{for(const observer of observers)if(observer.targets.has(target))observer.callback([],observer as unknown as ResizeObserver)})
 if(scenario==='same-editor'){resize(first);expect(a).toHaveBeenCalledOnce();expect(b).not.toHaveBeenCalled();expect(document.activeElement).toBe(first)}
 else{
  next.focus();a.mockClear();b.mockClear();resize(first);expect(a).not.toHaveBeenCalled();expect(b).not.toHaveBeenCalled()
  resize(next);expect(b).toHaveBeenCalledOnce();expect(a).not.toHaveBeenCalled();expect(document.activeElement).toBe(next)
 }
 expect((first as HTMLInputElement).value).toBe('first');expect((next as HTMLInputElement).value).toBe('next');expect(change).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled()
})
