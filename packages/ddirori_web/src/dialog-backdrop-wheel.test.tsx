import React from 'react'
import '@testing-library/jest-dom/vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterAll,afterEach,beforeAll,expect,it,vi} from 'vitest'
import {Dialog,Input} from './index'

const show=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal'),close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close')
beforeAll(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(this:HTMLDialogElement){this.open=true}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(this:HTMLDialogElement){this.open=false}})
})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
afterAll(()=>{
 if(show)Object.defineProperty(HTMLDialogElement.prototype,'showModal',show);else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal
 if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close
})
function setup(open=true,sheet=false){
 const change=vi.fn(),cancel=vi.fn()
 const content=(active:boolean)=><Dialog open={active} sheet={sheet} title="Owned modal" onClose={cancel}><Input label="Draft" value="Uncommitted title" onChange={change}/><div role="listbox" aria-label="Nested foreground choice">Option</div></Dialog>
 const host=render(content(open)),dialog=document.querySelector('dialog')!,field=screen.getByRole('textbox',{name:'Draft',hidden:!open})
 vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue(new DOMRect(100,100,400,400))
 if(open)field.focus()
 return{host,content,dialog,field,change,cancel}
}
it.each([false,true])('prevents only the active dialog backdrop wheel and keeps draft/focus, sheet=%s',sheet=>{
 const {dialog,field,change,cancel}=setup(true,sheet)
 expect(fireEvent.wheel(dialog,{clientX:50,clientY:200,deltaY:120,cancelable:true})).toBe(false)
 expect(field).toHaveFocus();expect(field).toHaveValue('Uncommitted title')
 expect(change).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled()
})
it('leaves native scrolling inside the visible dialog box available',()=>{
 const {dialog,field}=setup()
 expect(fireEvent.wheel(dialog,{clientX:120,clientY:200,deltaY:120,cancelable:true})).toBe(true)
 expect(field).toHaveFocus()
})
it('does not consume a nested foreground choice outside the parent border box',()=>{
 const {field}=setup(),nested=screen.getByRole('listbox',{name:'Nested foreground choice'})
 expect(fireEvent.wheel(nested,{clientX:50,clientY:200,deltaY:120,cancelable:true})).toBe(true)
 expect(field).toHaveFocus()
})
it('does not handle a closed dialog',()=>{
 const {dialog}=setup(false)
 expect(fireEvent.wheel(dialog,{clientX:50,clientY:200,deltaY:120,cancelable:true})).toBe(true)
})
it('removes its native listener when closed or unmounted',()=>{
 const {host,content,dialog}=setup(),remove=vi.spyOn(window,'removeEventListener')
 host.rerender(content(false))
 expect(remove).toHaveBeenCalledWith('wheel',expect.any(Function),true)
 remove.mockClear();host.rerender(content(true));host.unmount()
 expect(remove).toHaveBeenCalledWith('wheel',expect.any(Function),true)
})
it.each(['ctrlKey','metaKey','altKey','shiftKey'] as const)('preserves modified wheel intent %s outside the dialog',modifier=>{
 const {dialog}=setup()
 expect(fireEvent.wheel(dialog,{clientX:50,clientY:200,deltaY:120,[modifier]:true,cancelable:true})).toBe(true)
})
it('does not redefine a pure horizontal wheel gesture',()=>{
 const {dialog}=setup()
 expect(fireEvent.wheel(dialog,{clientX:50,clientY:200,deltaX:120,deltaY:0,cancelable:true})).toBe(true)
})

const contact=(identifier=1,clientX=50,clientY=200)=>({identifier,clientX,clientY})
it.each([false,true])('contains a single-finger gesture that starts on its backdrop, sheet=%s',sheet=>{
 const {dialog,field,change,cancel}=setup(true,sheet)
 expect(fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})).toBe(true)
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,50,180)],cancelable:true})).toBe(false)
 expect(field).toHaveFocus();expect(field).toHaveValue('Uncommitted title')
 expect(change).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled()
})
it('allows a gesture starting in the visible dialog even if its finger leaves the border',()=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact(1,120,200)],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,50,200)],cancelable:true})).toBe(true)
})
it('allows a nested foreground gesture outside the parent border',()=>{
 setup();const nested=screen.getByRole('listbox',{name:'Nested foreground choice'})
 fireEvent.touchStart(nested,{touches:[contact()],cancelable:true})
 expect(fireEvent.touchMove(nested,{touches:[contact(1,50,180)],cancelable:true})).toBe(true)
})
it('does not restrict a multi-contact gesture starting on the backdrop',()=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact(),contact(2,60,200)],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,40,180),contact(2,70,220)],cancelable:true})).toBe(true)
})
it('releases backdrop ownership when another finger joins and does not reclaim the remaining finger',()=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})
 fireEvent.touchStart(dialog,{touches:[contact(),contact(2,60,200)],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,40,180),contact(2,70,220)],cancelable:true})).toBe(true)
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,40,170)],cancelable:true})).toBe(true)
})
it('does not consume a move with a different contact identity',()=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(2,50,180)],cancelable:true})).toBe(true)
})
it('keeps a backdrop gesture owned when its finger crosses into the dialog',()=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,120,180)],cancelable:true})).toBe(false)
})
it.each(['touchEnd','touchCancel'] as const)('releases contact ownership on %s',end=>{
 const {dialog}=setup()
 fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})
 fireEvent[end](dialog,{touches:[],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,50,180)],cancelable:true})).toBe(true)
})
it('ignores a move without an owned start or after an outside start',()=>{
 const {dialog}=setup()
 expect(fireEvent.touchMove(dialog,{touches:[contact()],cancelable:true})).toBe(true)
 fireEvent.touchStart(document.body,{touches:[contact()],cancelable:true})
 expect(fireEvent.touchMove(dialog,{touches:[contact()],cancelable:true})).toBe(true)
})
it('does not retain a gesture across closing and reopening the same dialog',()=>{
 const {dialog,host,content}=setup()
 fireEvent.touchStart(dialog,{touches:[contact()],cancelable:true})
 host.rerender(content(false));host.rerender(content(true))
 expect(fireEvent.touchMove(dialog,{touches:[contact(1,50,180)],cancelable:true})).toBe(true)
})
it('detaches all touch listeners when closed and unmounted',()=>{
 const {host,content}=setup(),remove=vi.spyOn(window,'removeEventListener')
 host.rerender(content(false))
 for(const name of ['touchstart','touchmove','touchend','touchcancel'])expect(remove).toHaveBeenCalledWith(name,expect.any(Function),true)
 remove.mockClear();host.rerender(content(true));host.unmount()
 for(const name of ['touchstart','touchmove','touchend','touchcancel'])expect(remove).toHaveBeenCalledWith(name,expect.any(Function),true)
})

const rounded=(dialog:HTMLDialogElement,radius='16px')=>{
 for(const edge of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'] as const)dialog.style[edge]=radius
}
it.each([
 ['top-left','wheel',101,101],['top-right','wheel',499,101],
 ['bottom-left','wheel',101,499],['bottom-right','wheel',499,499],
 ['top-left','touch',101,101],['top-right','touch',499,101],
 ['bottom-left','touch',101,499],['bottom-right','touch',499,499],
] as const)('contains the real rounded %s corner for %s',(_corner,kind,x,y)=>{
 const {dialog,field,change,cancel}=setup();rounded(dialog)
 if(kind==='wheel')expect(fireEvent.wheel(dialog,{clientX:x,clientY:y,deltaY:120,cancelable:true})).toBe(false)
 else{
  fireEvent.touchStart(dialog,{touches:[contact(1,x,y)],cancelable:true})
  expect(fireEvent.touchMove(dialog,{touches:[contact(1,x+1,y+1)],cancelable:true})).toBe(false)
 }
 expect(field).toHaveFocus();expect(change).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled()
})
it.each(['wheel','touch'] as const)('keeps the inside of a rounded corner scrollable for %s',kind=>{
 const {dialog}=setup();rounded(dialog)
 if(kind==='wheel')expect(fireEvent.wheel(dialog,{clientX:111,clientY:111,deltaY:120,cancelable:true})).toBe(true)
 else{
  fireEvent.touchStart(dialog,{touches:[contact(1,111,111)],cancelable:true})
  expect(fireEvent.touchMove(dialog,{touches:[contact(1,111,101)],cancelable:true})).toBe(true)
 }
})
it('retains a square sheet edge as ordinary inner padding',()=>{
 const {dialog}=setup(true,true);rounded(dialog);dialog.style.borderBottomLeftRadius='0px'
 expect(fireEvent.wheel(dialog,{clientX:101,clientY:499,deltaY:120,cancelable:true})).toBe(true)
})
it('uses reduced overlapping radii rather than excluding a real inner point',()=>{
 const {dialog}=setup();rounded(dialog,'300px')
 expect(fireEvent.wheel(dialog,{clientX:150,clientY:200,deltaY:120,cancelable:true})).toBe(true)
})
