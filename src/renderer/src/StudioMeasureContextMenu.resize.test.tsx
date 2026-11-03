// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {StudioMeasureContextMenu} from './StudioMeasureContextMenu'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it.each(['current','newer-focus','unmounted'] as const)('keeps the resized context menu owner without replacing %s',async owner=>{
 const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>(),frames=new Map<number,FrameRequestCallback>();let id=0,height=200
 vi.stubGlobal('ResizeObserver',class{
  targets=new Set<Element>()
  constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
  observe(node:Element){this.targets.add(node)}
  disconnect(){observers.delete(this)}
 })
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(token=>{frames.delete(token)})
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){return this.getAttribute('role')==='menu'?new DOMRect(parseFloat(this.style.left)||100,parseFloat(this.style.top)||500,320,height):new DOMRect()})
 const select=vi.fn(),close=vi.fn(),{unmount}=render(<><button>New destination</button><StudioMeasureContextMenu theme="light" x={100} y={500} canRemove onSelect={select} onClose={close}/></>)
 const menu=screen.getByRole('menu',{name:'마디 작업'}),first=screen.getByRole('menuitem',{name:'앞에 마디 추가'}),last=screen.getByRole('menuitem',{name:'마디 제거'}),later=screen.getByRole('button',{name:'New destination'})
 fireEvent.keyDown(first,{key:'End'});expect(document.activeElement).toBe(last)
 const scroll=vi.fn(),firstScroll=vi.fn();last.scrollIntoView=scroll;first.scrollIntoView=firstScroll;frames.clear()
 act(()=>{height=600;for(const observer of observers)if(observer.targets.has(menu))observer.callback([],observer as unknown as ResizeObserver)})
 if(owner==='newer-focus')later.focus()
 if(owner==='unmounted')unmount()
 await act(async()=>{const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(0))})
 expect(scroll).toHaveBeenCalledTimes(owner==='current'?1:0);expect(firstScroll).not.toHaveBeenCalled();expect(select).not.toHaveBeenCalled();expect(close).not.toHaveBeenCalled()
 if(owner==='current')expect(document.activeElement).toBe(last)
 if(owner==='newer-focus')expect(document.activeElement).toBe(later)
})

it.each([false,true])('keeps disabled pointer activation from blurring the current command, canRemove=%s', canRemove=>{
 const select=vi.fn(),close=vi.fn()
 render(<><div className="score-canvas" tabIndex={0}>Score</div><StudioMeasureContextMenu theme="light" x={20} y={20} canRemove={canRemove} onSelect={select} onClose={close}/></>)
 const first=screen.getByRole('menuitem',{name:'앞에 마디 추가'}),remove=screen.getByRole('menuitem',{name:'마디 제거'})
 fireEvent.keyDown(first,{key:'End'})
 const current=screen.getByRole('menuitem',{name:canRemove?'마디 제거':'박자표 변경…'})
 expect(current).toHaveFocus()
 // Chromium's default pointerdown can blur the enabled command even though a
 // disabled button never activates. Cancel that default only for disabled items.
 expect(fireEvent.pointerDown(remove.querySelector('svg')!,{button:0,pointerType:'mouse'})).toBe(canRemove)
 expect(current).toHaveFocus();expect(select).not.toHaveBeenCalled();expect(close).not.toHaveBeenCalled()
 fireEvent.keyDown(current,{key:'Escape'})
 expect(close).toHaveBeenCalledOnce();expect(document.querySelector('.score-canvas')).toHaveFocus()
})
