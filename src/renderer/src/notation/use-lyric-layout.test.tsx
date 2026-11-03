// @vitest-environment jsdom
import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {createNote,createScore} from '../../../score-core'
import {minimumLyricScoreWidths,supportsAutomaticLyricSpacing,useLyricWidths,useHarmonyWidths} from './use-lyric-layout'
vi.mock('./NotationPreview',()=>({createStaveNote:vi.fn()}))
const originalFonts=Object.getOwnPropertyDescriptor(document,'fonts')
const originalBBox=Object.getOwnPropertyDescriptor(SVGElement.prototype,'getBBox')
afterEach(()=>{
 cleanup();document.querySelectorAll('.notation-preview').forEach(node=>node.remove());vi.restoreAllMocks();vi.unstubAllGlobals()
 if(originalFonts)Object.defineProperty(document,'fonts',originalFonts);else Reflect.deleteProperty(document,'fonts')
 if(originalBBox)Object.defineProperty(SVGElement.prototype,'getBBox',originalBBox);else Reflect.deleteProperty(SVGElement.prototype,'getBBox')
})
const scoreWith=(text:string)=>{
 const score=createScore(),voice=score.parts[0].staves[0].measures[0].voices[0],rest=voice.events[0]
 voice.events[0]={...createNote({id:rest.id,position:rest.position,duration:rest.duration,pitch:{step:'C',octave:4}}),lyrics:[{text}]}
 return score
}
function metricsHost(){
 const host=document.createElement('div');host.className='notation-preview';host.innerHTML='<svg><text class="notation-lyric" style="font-family:serif;font-size:13px">보이는 가사</text></svg>';document.body.append(host)
 Object.defineProperty(SVGElement.prototype,'getBBox',{configurable:true,value:function(this:SVGElement){return {x:0,y:0,width:(this.textContent?.length??0)*10,height:13}}})
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>setTimeout(()=>cb(0),0))
}
it('does not mark new lyrics ready or publish a stale document measurement after a late font response',async()=>{
 // jsdom has no SVG font engine. These widths test lifecycle only, not typography.
 metricsHost()
 let resolveOld!:()=>void
 const oldReady=new Promise<void>(resolve=>{resolveOld=resolve})
 let ready:Promise<void>=oldReady
 Object.defineProperty(document,'fonts',{configurable:true,get:()=>({ready})})
 const {result,rerender}=renderHook(({score,context})=>useLyricWidths(score,context),{initialProps:{score:scoreWith('이전'),context:'score'}})
 expect(result.current.ready).toBe(false)
 ready=Promise.resolve();rerender({score:scoreWith('새 문서'),context:'part'})
 expect(result.current.ready).toBe(false)
 await waitFor(()=>expect(result.current.ready).toBe(true))
 expect(result.current.widths.get('새 문서')).toBe(40)
 await act(async()=>resolveOld())
 expect(result.current.widths.has('이전')).toBe(false)
 expect(document.querySelector('[data-notation-text-metrics]')).toBeNull()
})
it('keeps empty/unsupported-font environments usable without pretending to measure ink',()=>{
 const {result}=renderHook(()=>useLyricWidths(createScore()))
 expect(result.current.ready).toBe(true)
 expect(result.current.widths.size).toBe(0)
})
it('measures multi-staff words before publishing output readiness', async()=>{
 metricsHost()
 let resolve!:()=>void
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready:new Promise<void>(r=>{resolve=r})}})
 const score=scoreWith('합주');score.parts.push({...structuredClone(score.parts[0]),id:'lower-part'})
 const {result}=renderHook(()=>useLyricWidths(score,'score',supportsAutomaticLyricSpacing(score)))
 expect(result.current.ready).toBe(false)
 await act(async()=>resolve())
 await waitFor(()=>expect(result.current.ready).toBe(true))
 expect(result.current.widths.get('합주')).toBe(20)
})
it('does not block explicitly disabled measurement on unused fonts',()=>{
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready:new Promise(()=>{})}})
 const {result}=renderHook(()=>useLyricWidths(scoreWith('합주'),'score',false))
 expect(result.current.ready).toBe(true);expect(result.current.widths.size).toBe(0)
})

it('measures chord text with its own style and discards a late previous-view measurement',async()=>{
 metricsHost()
 const host=document.querySelector('.notation-preview svg')!
 host.insertAdjacentHTML('beforeend','<text class="notation-harmony-mark" style="font-family:Georgia;font-size:16px;font-weight:700">C7</text>')
 let resolve!:()=>void,ready:Promise<void>=new Promise(r=>{resolve=r})
 Object.defineProperty(document,'fonts',{configurable:true,get:()=>({ready})})
 const score=scoreWith('합주'),measure=score.parts[0].staves[0].measures[0]
 measure.voices[0].events[0].duration={value:'half',dots:0}
 measure.voices[0].events.push(createNote({id:'second',position:{tick:26880},duration:{value:'half',dots:0},pitch:{step:'D',octave:4}}))
 score.harmonies=[{id:'h0',measureId:measure.id,tick:0,text:'C7'},{id:'h2',measureId:measure.id,tick:26880,text:'G7'}]
 const {result,rerender}=renderHook(({score,context})=>useHarmonyWidths(score,context),{initialProps:{score,context:'score'}})
 expect(result.current.ready).toBe(false)
 ready=Promise.resolve();const next=structuredClone(score);next.harmonies!.forEach(h=>h.text='Fmaj7/Gb')
 rerender({score:next,context:'part'})
 await waitFor(()=>expect(result.current.ready).toBe(true))
 expect(result.current.widths.get('Fmaj7/Gb')).toBe(80)
 await act(async()=>resolve())
 expect(result.current.widths.has('C7')).toBe(false)
 expect(document.querySelector('[data-notation-text-metrics]')).toBeNull()
})
