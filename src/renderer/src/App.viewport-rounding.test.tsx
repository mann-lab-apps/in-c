// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it.each(['top','bottom','manual-wheel','newer-focus'] as const)('keeps the token gutter after native subpixel rounding: %s',async kind=>{
  const frames=new Map<number,FrameRequestCallback>();let id=0,offset=0
  const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
  const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(token=>{frames.delete(token)})
  // Electron's DPR2 scroll position can discard a 0.1171875px correction.
  const scroll=vi.spyOn(window,'scrollBy').mockImplementation((x?:number|ScrollToOptions,y?:number)=>{const delta=typeof x==='object'?x.top??0:y??0;offset+=Math.round(delta*2)/2})
  try{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'PNG 출력 설정'}))
    const source=structuredClone(playbackMockState.lastScore!),target=screen.getByRole('combobox',{name:'PNG 해상도'}) as HTMLButtonElement
    const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    target.style.outlineWidth='2px';target.style.outlineStyle='solid';target.style.outlineOffset='2px';target.scrollIntoView=vi.fn()
    expect(parseFloat(getComputedStyle(target).outlineWidth)+parseFloat(getComputedStyle(target).outlineOffset)).toBe(4)
    const top=kind==='bottom'?548.1171875:11.8828125
    vi.spyOn(target,'getBoundingClientRect').mockImplementation(()=>new DOMRect(20,top-offset,240,40))
    vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,600,960,150))
    const other=screen.getByRole('button',{name:'악보로 이동'})
    act(()=>other.focus());frames.clear();scroll.mockClear();offset=0
    act(()=>target.focus())
    if(kind==='manual-wheel')fireEvent.wheel(document.documentElement,{deltaY:-400})
    if(kind==='newer-focus')act(()=>other.focus())
    act(()=>{const queued=[...frames.values()];frames.clear();queued.forEach(cb=>cb(0))})
    if(kind==='manual-wheel'||kind==='newer-focus')expect(scroll).not.toHaveBeenCalled()
    else{
      const bounds=target.getBoundingClientRect()
      expect(bounds.top-4).toBeGreaterThanOrEqual(8)
      expect(bounds.bottom+4).toBeLessThanOrEqual(600-8)
    }
    expect(kind==='newer-focus'?other:target).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  }finally{cleanup();raf.mockRestore();cancel.mockRestore();scroll.mockRestore()}
})
