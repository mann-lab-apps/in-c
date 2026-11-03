// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createScore} from '../../score-core'
import {createNativeProject,encodeNativeProject} from '../../project/schema'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it.each(['window','surface','manual-wheel','manual-return','newer-focus','cancel','dock-edge','dock-inside','dock-contained'] as const)('keeps pending input resize ownership: %s',async kind=>{
  const original=globalThis.ResizeObserver
  const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
  vi.stubGlobal('ResizeObserver',class{
    targets=new Set<Element>()
    constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
    observe(target:Element){this.targets.add(target)}
    unobserve(target:Element){this.targets.delete(target)}
    disconnect(){observers.delete(this);this.targets.clear()}
  })
  const frames=new Map<number,FrameRequestCallback>();let id=0
  const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
  const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(token=>{frames.delete(token)})
  const flush=()=>act(()=>{const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(0))})
  try{
    const source=createScore(),part=source.parts[0]!,staff=part.staves[0]!,measure=staff.measures[0]!,voice=measure.voices[0]!
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/test/pending.chromatics',fileName:'pending.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:`${voice.events[0]!.id} 선택`}))
    fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'3',code:'Digit3',ctrlKey:true})
    const canvas=screen.getByLabelText('악보 캔버스'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
    const nodes=[0,1,2].map(i=>{
      const node=document.createElementNS(svg.namespaceURI,'g') as SVGGElement
      node.classList.add('notation-event','is-preview');Object.assign(node.dataset,{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:voice.id,eventTick:String(i*4480)})
      node.getBoundingClientRect=()=>new DOMRect(1380+i*30,200,20,34);node.scrollIntoView=vi.fn();svg.append(node);return node
    });canvas.append(svg)
    act(()=>canvas.focus());fireEvent.keyDown(window,{key:'c',code:'KeyC'});flush();frames.clear();nodes.forEach(n=>vi.mocked(n.scrollIntoView).mockClear())
    if(kind==='manual-wheel'||kind==='manual-return')fireEvent.wheel(canvas,{deltaX:400})
    if(kind.startsWith('dock-')){
      const dock=document.createElement('div');dock.style.overflowY='auto';dock.style.overscrollBehaviorY=kind==='dock-contained'?'contain':'auto'
      Object.defineProperties(dock,{clientHeight:{value:50},scrollHeight:{value:100}});dock.scrollTop=kind==='dock-inside'?25:0
      document.querySelector('.studio-palette-dock')!.append(dock);fireEvent.wheel(dock,{deltaY:-20})
    }
    if(kind==='manual-return'){
      fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));flush();frames.clear();nodes.forEach(n=>vi.mocked(n.scrollIntoView).mockClear())
    }
    const other=screen.getByRole('button',{name:'악보로 이동'})
    if(kind==='newer-focus')act(()=>other.focus())
    if(kind==='cancel')fireEvent.keyDown(window,{key:'Escape'})
    if(kind==='surface')act(()=>{for(const observer of observers)if(observer.targets.has(canvas))observer.callback([],observer as unknown as ResizeObserver)})
    else fireEvent(window,new Event('resize'))
    flush()
    nodes.forEach((node,i)=>{
      if(['window','surface','manual-return','dock-inside','dock-contained'].includes(kind)&&i===1)expect(node.scrollIntoView).toHaveBeenCalledOnce()
      else expect(node.scrollIntoView).not.toHaveBeenCalled()
    })
    expect(kind==='newer-focus'?other:canvas).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  }finally{cleanup();raf.mockRestore();cancel.mockRestore();vi.stubGlobal('ResizeObserver',original)}
})
