// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {installCompactDockMedia,playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it.each(['popup-clear','popup-clipped','ordinary-dock'] as const)('keeps the native popup scroll boundary separate from the workspace: %s',async kind=>{
 const media=installCompactDockMedia(),frames=new Map<number,FrameRequestCallback>();let id=0
 const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
 const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(token=>{frames.delete(token)})
 const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
 try{
  window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>)
  const source=structuredClone(playbackMockState.lastScore!),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),dock=screen.getByRole('complementary',{name:'고정 팔레트'})
  dock.style.overflowY='auto';Object.defineProperty(dock,'clientHeight',{configurable:true,value:200});Object.defineProperty(dock,'scrollHeight',{configurable:true,value:1000})
  vi.spyOn(dock,'getBoundingClientRect').mockReturnValue(new DOMRect(0,100,280,200))
  vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,282,960,186))
  let popup:HTMLElement|undefined
  if(kind!=='ordinary-dock'){
   fireEvent.click(screen.getByRole('button',{name:'팔레트 도크 설정'}));popup=screen.getByRole('dialog',{name:'팔레트 도크 설정'})
   expect(popup.matches(':popover-open')).toBe(true);popup.style.overflowY='auto'
   Object.defineProperty(popup,'clientHeight',{configurable:true,value:434});Object.defineProperty(popup,'scrollHeight',{configurable:true,value:800})
   vi.spyOn(popup,'getBoundingClientRect').mockReturnValue(new DOMRect(16,16,320,436))
  }
  const target=(kind==='ordinary-dock'?screen.getByRole('searchbox',{name:'표기 기호 검색'}):screen.getByRole('button',{name:'팔레트 표시 기본값'}))as HTMLElement
  target.style.outlineWidth='2px';target.style.outlineStyle='solid';target.style.outlineOffset='2px';target.scrollIntoView=vi.fn()
  expect(parseFloat(getComputedStyle(target).outlineWidth)+parseFloat(getComputedStyle(target).outlineOffset)).toBe(4)
  const top=kind==='popup-clipped'?500:kind==='popup-clear'?360:420
  vi.spyOn(target,'getBoundingClientRect').mockImplementation(()=>new DOMRect(40,top-(popup?.scrollTop??dock.scrollTop),220,66))
  act(()=>target.focus());frames.clear();dock.scrollTop=0;if(popup)popup.scrollTop=0;scroll.mockClear();vi.mocked(target.scrollIntoView).mockClear()
  fireEvent(window,new Event('resize'))
  act(()=>{const queued=[...frames.values()];frames.clear();queued.forEach(cb=>cb(0))})
  if(kind==='ordinary-dock'){expect(dock.scrollTop).toBeGreaterThan(0);expect(scroll).toHaveBeenCalled()}
  else{
   expect(scroll).not.toHaveBeenCalled();expect(dock.scrollTop).toBe(0)
   if(kind==='popup-clipped'){
    expect(popup!.scrollTop).toBeGreaterThan(0)
    expect(target.getBoundingClientRect().bottom+4).toBeLessThanOrEqual(16+434-8)
   }else expect(popup!.scrollTop).toBe(0)
  }
  expect(target).toHaveFocus();expect(target.scrollIntoView).toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(source);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()
 }finally{cleanup();media.restore();raf.mockRestore();cancel.mockRestore();scroll.mockRestore()}
})
