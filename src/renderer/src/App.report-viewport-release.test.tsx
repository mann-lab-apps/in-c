// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createStaffVisibilityFixture} from '../../testing/staff-visibility-fixture'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()

it.each(['playing-collapse','stopped-collapse','paused-collapse','fresh-focus','new-selection','never-selected']as const)(
 'keeps resize-follow ownership after diagnostic reading: %s',async scenario=>{
  const frames=new Map<number,FrameRequestCallback>();let id=0
  const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
  const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
  const foreground=vi.spyOn(document,'hasFocus').mockReturnValue(true)
  const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
  const observers:{callback:ResizeObserverCallback;targets:Set<Element>}[]=[]
  vi.stubGlobal('ResizeObserver',class{
   targets=new Set<Element>();constructor(public callback:ResizeObserverCallback){observers.push(this)}
   observe(target:Element){this.targets.add(target)}unobserve(target:Element){this.targets.delete(target)}disconnect(){this.targets.clear()}
  })
  const flush=()=>act(()=>{const queued=[...frames.values()];frames.clear();queued.forEach(cb=>cb(0))})
  try{
   window.history.replaceState({},'','/?fixture=release-test')
   vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'reader.musicxml',filePath:'/fixture/reader.musicxml',contents:createStaffVisibilityFixture('hidden-second')})
   const {App}=await import('./App');const view=render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
   const reader=await screen.findByRole('group',{name:'MusicXML 경고 상세 목록 읽기'}),footer=document.querySelector('main > .studio-status')!
   playbackMockState.value.status=scenario==='stopped-collapse'?'stopped':scenario==='paused-collapse'?'paused':'playing';view.rerender(<App/>);flush()
   const score=structuredClone(playbackMockState.lastScore!),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
   reader.scrollIntoView=vi.fn();vi.spyOn(reader,'getBoundingClientRect').mockReturnValue(new DOMRect(20,-400,900,448));vi.spyOn(footer,'getBoundingClientRect').mockReturnValue(new DOMRect(0,800,960,200))
   act(()=>reader.focus());flush()
   const chooseText=()=>{const range=document.createRange();range.selectNodeContents(reader.querySelector('li > :is(p,span)')!);const selection=document.getSelection()!;selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'))}
   if(scenario!=='never-selected'){
    act(chooseText);flush();act(()=>{document.getSelection()!.collapseToStart();document.dispatchEvent(new Event('selectionchange'))})
   }
   if(scenario==='fresh-focus'){act(()=>{screen.getByRole('button',{name:'악보로 이동'}).focus();reader.focus()});flush()}
   if(scenario==='new-selection'){act(chooseText);flush()}
   vi.mocked(reader.scrollIntoView).mockClear();scroll.mockClear();frames.clear()
   const observer=observers.find(o=>o.targets.has(footer)&&o.targets.has(reader.closest('.studio-warning-report')!));expect(observer).toBeDefined()
   act(()=>observer!.callback([],observer as unknown as ResizeObserver));flush()
   if(scenario==='playing-collapse'){expect(reader.scrollIntoView).not.toHaveBeenCalled();expect(scroll).not.toHaveBeenCalled()}
   else expect(reader.scrollIntoView).toHaveBeenCalledOnce()
   expect(reader).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected!)
   expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()
  }finally{document.getSelection()?.removeAllRanges();cleanup();raf.mockRestore();cancel.mockRestore();foreground.mockRestore();scroll.mockRestore();vi.unstubAllGlobals()}
 }
)
