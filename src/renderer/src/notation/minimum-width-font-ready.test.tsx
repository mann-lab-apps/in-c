// @vitest-environment jsdom
import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {createScore} from '../../../score-core'
import * as spacing from './lyric-spacing'
import {useMinimumTextScoreWidths} from './use-lyric-layout'
vi.mock('./NotationPreview',()=>({createStaveNote:vi.fn()}))
const originalFonts=Object.getOwnPropertyDescriptor(document,'fonts')
afterEach(()=>{cleanup();vi.restoreAllMocks();if(originalFonts)Object.defineProperty(document,'fonts',originalFonts);else Reflect.deleteProperty(document,'fonts')})
function fixture(){
 let resolve!:()=>void
 const ready=new Promise<void>(r=>{resolve=r}),fonts=new EventTarget()
 Object.defineProperty(document,'fonts',{configurable:true,value:Object.assign(fonts,{ready})})
 // Lifecycle oracle only. Real glyph geometry is covered by the delayed-font Electron fixture.
 let width=100
 const measured=vi.spyOn(spacing,'minimumLyricColumnWidth').mockImplementation(()=>width)
 const score=createScore(),source=structuredClone(score),empty=new Map<string,number>(),id=score.parts[0].staves[0].measures[0].id
 const hook=renderHook(()=>useMinimumTextScoreWidths(score,empty))
 return{...hook,resolve,fonts,measured,score,source,width:(value:number)=>{width=value},read:()=>hook.result.current.systemStart?.get(id)}
}
it('remeasures text-free system headers when pending fonts become ready without a score edit',async()=>{
 const f=fixture();expect(f.read()).toBe(100);f.width(220)
 await act(async()=>f.resolve())
 await waitFor(()=>expect(f.read()).toBe(220))
 expect(f.score).toEqual(f.source)
})
it('remeasures after later font loads while retaining memoization for unrelated renders',async()=>{
 const f=fixture();await act(async()=>f.resolve());const before=f.measured.mock.calls.length
 f.rerender();expect(f.measured).toHaveBeenCalledTimes(before)
 f.width(260);act(()=>f.fonts.dispatchEvent(new Event('loadingdone')))
 expect(f.read()).toBe(260);expect(f.score).toEqual(f.source)
})
it('removes its font listener and ignores late readiness after unmount',async()=>{
 const f=fixture(),remove=vi.spyOn(f.fonts,'removeEventListener'),before=f.measured.mock.calls.length
 f.unmount();expect(remove).toHaveBeenCalledWith('loadingdone',expect.any(Function))
 f.width(300);await act(async()=>{f.resolve();f.fonts.dispatchEvent(new Event('loadingdone'))})
 expect(f.measured).toHaveBeenCalledTimes(before)
})
it('keeps the no-FontFaceSet environment usable without an artificial loading state',()=>{
 Object.defineProperty(document,'fonts',{configurable:true,value:undefined})
 const measured=vi.spyOn(spacing,'minimumLyricColumnWidth').mockReturnValue(150),score=createScore(),empty=new Map<string,number>()
 const {result,rerender}=renderHook(()=>useMinimumTextScoreWidths(score,empty))
 expect(result.current.systemStart?.size).toBe(1);const before=measured.mock.calls.length
 rerender();expect(measured).toHaveBeenCalledTimes(before)
})
