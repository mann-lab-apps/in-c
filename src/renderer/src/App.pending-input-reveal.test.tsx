// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createScore} from '../../score-core'
import {createNativeProject,encodeNativeProject} from '../../project/schema'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it.each(['first','second','rest','redrawn-origin','foreign-redrawn','manual-wheel','newer-focus','cancel']as const)('reveals the pending tuplet next member with viewport ownership: %s',async kind=>{
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
    const node=document.createElementNS(svg.namespaceURI,'g')as SVGGElement
    node.classList.add('notation-event','is-preview');Object.assign(node.dataset,{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:voice.id,eventTick:String(i*4480)})
    node.getBoundingClientRect=()=>new DOMRect(980+i*30,200,20,34);node.scrollIntoView=vi.fn();svg.append(node);return node
  });canvas.append(svg)
  const frames=new Map<number,FrameRequestCallback>();let id=0
  const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++id,cb);return id})
  const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(token=>{frames.delete(token)})
  try{
    let origin:SVGGElement|undefined
    if(kind==='redrawn-origin'||kind==='foreign-redrawn'){
      origin=document.createElementNS(svg.namespaceURI,'g')as SVGGElement;origin.classList.add('notation-event');origin.setAttribute('tabindex','0')
      Object.assign(origin.dataset,{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:kind==='foreign-redrawn'?'foreign':voice.id,eventTick:'0',eventId:voice.events[0]!.id});svg.append(origin)
    }
    act(()=>(origin??canvas).focus());fireEvent.keyDown(window,kind==='rest'?{key:'0',code:'Digit0'}:{key:'c',code:'KeyC'})
    if(origin){origin.remove();act(()=>canvas.focus())}
    if(kind==='second')fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    expect(document.querySelector('.editor-status')).toHaveTextContent(`셋잇단음표 ${kind==='second'?2:1}/3`)
    if(kind==='manual-wheel')fireEvent.wheel(canvas,{deltaX:400})
    const other=screen.getByRole('button',{name:'악보로 이동'})
    if(kind==='newer-focus')act(()=>other.focus())
    if(kind==='cancel')fireEvent.keyDown(window,{key:'Escape'})
    act(()=>{const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(0))})
    nodes.forEach((node,i)=>{
      if((['first','rest','redrawn-origin'].includes(kind)&&i===1)||(kind==='second'&&i===2))expect(node.scrollIntoView).toHaveBeenCalledOnce()
      else expect(node.scrollIntoView).not.toHaveBeenCalled()
    })
    expect(kind==='newer-focus'?other:canvas).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  }finally{cleanup();raf.mockRestore();cancel.mockRestore()}
})
