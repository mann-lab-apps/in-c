// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
it.each(['focus','manual-wheel','newer-focus'])('custom meter trigger preserves sticky-footer reveal ownership: %s',async kind=>{
 window.history.replaceState({},'', '/?fixture=release-test');const{App}=await import('./App');render(<App/>);openStudioWorkspace('악보')
 const source=playbackMockState.lastScore,frames=new Map<number,FrameRequestCallback>();let id=0
 const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id}),cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(key=>{frames.delete(key)}),scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
 try{
  const target=screen.getByRole('button',{name:'사용자 지정 박자표…'}),other=screen.getByRole('button',{name:'악보로 이동'})
  target.scrollIntoView=vi.fn();vi.spyOn(target,'getBoundingClientRect').mockReturnValue(new DOMRect(20,650,148,42));vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,600,960,150))
  act(()=>other.focus());frames.clear();scroll.mockClear();act(()=>target.focus())
  if(kind==='manual-wheel')fireEvent.wheel(document.documentElement,{deltaY:-400})
  if(kind==='newer-focus')act(()=>other.focus())
  act(()=>{const queued=[...frames.values()];frames.clear();queued.forEach(cb=>cb(0))})
  if(kind==='focus'){expect(target.scrollIntoView).toHaveBeenCalled();expect(scroll.mock.calls.some(([,y])=>typeof y==='number'&&y>=92)).toBe(true)}
  else{expect(target.scrollIntoView).not.toHaveBeenCalled();expect(scroll).not.toHaveBeenCalled()}
  expect(playbackMockState.lastScore).toEqual(source);expect(window.inC.project.save).not.toHaveBeenCalled()
 }finally{cleanup();raf.mockRestore();cancel.mockRestore();scroll.mockRestore()}
})
