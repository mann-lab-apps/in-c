// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWholeChordTieScore } from '../../../testing/chord-tie-fixture'
import { useScorePlayback } from './useScorePlayback'
import { createSwingPlaybackFixture } from '../../../testing/swing-playback-fixture'
const owned=vi.hoisted(()=>({contexts:[] as any[],pianos:[] as any[],transports:[] as any[],loads:[] as (()=>Promise<void>)[],clickErrors:[] as Error[]}))
vi.mock('./piano-sampler',()=>({PianoSampler:class {
  ready=true;hasPitches=vi.fn(()=>true);preparePitches=vi.fn(async()=>{await owned.loads.shift()?.()});stopAll=vi.fn();dispose=vi.fn();noteOn=vi.fn();noteOff=vi.fn();setSustain=vi.fn()
  constructor(){owned.pianos.push(this)}
}}))
vi.mock('./piano-transport',()=>({PianoTransport:class{
  stop=vi.fn();finish=vi.fn();start=vi.fn(()=>owned.contexts.at(-1).currentTime+.03)
  constructor(){owned.transports.push(this)}
}}))
let frames:Map<number,FrameRequestCallback>
beforeEach(()=>{
  vi.useFakeTimers();owned.contexts.length=owned.pianos.length=owned.transports.length=owned.loads.length=owned.clickErrors.length=0;frames=new Map();let id=0
  vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++id,f);return id});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id))
  const param=()=>({value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()})
  vi.stubGlobal('AudioContext',class extends EventTarget{
    currentTime=0;state='running';destination={};nodes:any[]=[]
    resume=vi.fn(async()=>{this.state='running'});close=vi.fn(async()=>{this.state='closed'})
    constructor(){super();owned.contexts.push(this)}
    createGain(){return{gain:param(),connect:vi.fn(),disconnect:vi.fn()}}
    createOscillator(){const error=owned.clickErrors.shift();if(error)throw error;const node={frequency:param(),type:'sine',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:undefined};this.nodes.push(node);return node}
    changeState(value:string){this.state=value;this.dispatchEvent(new Event('statechange'))}
  })
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
function setup(enabled=false){const score=createWholeChordTieScore(false),mix={['tie-part']:{muted:true,solo:false,volume:0}};return {score,...renderHook(({enabled})=>useScorePlayback(score,mix,undefined,undefined,enabled),{initialProps:{enabled}})}}
it.each(['eighth', '16th'] as const)('rebuilds actual transport scheduling for explicit %s swing, stops stale scheduling and reuses the audio context', async unit => {
  const swung = createSwingPlaybackFixture(unit, '3:2'), straight = { ...swung, swingPlayback: undefined }
  const { result, rerender } = renderHook(({ score }) => useScorePlayback(score, {}, undefined, undefined, true), { initialProps: { score: straight as typeof swung } })
  await act(async () => { result.current.play() })
  const unitBeat = unit === 'eighth' ? 0.5 : 0.25
  expect(owned.transports[0].start.mock.calls.at(-1)[0].events[1].startBeat).toBe(unitBeat)
  act(() => rerender({ score: swung }))
  expect(result.current.status).toBe('stopped')
  expect(owned.transports[0].stop).toHaveBeenCalled()
  await act(async () => { result.current.play() })
  expect(owned.transports[0].start.mock.calls.at(-1)[0].events[1].startBeat).toBeCloseTo(2 * unitBeat * 3 / 5)
  expect(owned.contexts).toHaveLength(1); expect(owned.pianos).toHaveLength(1)
})
async function play(result:ReturnType<typeof setup>['result']){await act(async()=>{result.current.play()})}
it('defaults off and never adds practice clicks to edit preview',async()=>{
  const {result}=setup();await play(result);expect(owned.contexts[0].nodes).toHaveLength(0)
  act(()=>result.current.stop());await act(async()=>result.current.previewNote());expect(owned.contexts[0].nodes).toHaveLength(0)
})
it('uses the same origin/context/cache and clicks even when the piano part is muted at zero volume',async()=>{
  const {result,score}=setup(true),before=structuredClone(score);await play(result)
  expect(owned.contexts).toHaveLength(1);expect(owned.pianos).toHaveLength(1)
  expect(owned.contexts[0].nodes).toHaveLength(2)
  expect(owned.contexts[0].nodes.map((n:any)=>n.start.mock.calls[0][0])).toEqual([.03,.53]);expect(score).toEqual(before)
})
it('turns on at the next actual beat and cancels every future source on off without restarting piano',async()=>{
  const {result,rerender}=setup();await play(result);const c=owned.contexts[0];c.currentTime=.4
  act(()=>rerender({enabled:true}));expect(c.nodes).toHaveLength(2);expect(c.nodes[0].start).toHaveBeenCalledExactlyOnceWith(.53)
  const nodes=[...c.nodes];act(()=>rerender({enabled:false}));for(const n of nodes)expect(n.stop.mock.calls.at(-1)[0]).toBe(.4)
  expect(owned.transports[0].start).toHaveBeenCalledTimes(1);expect(owned.pianos[0].preparePitches).toHaveBeenCalledTimes(1)
  act(()=>{c.currentTime=2;vi.advanceTimersByTime(1000)});expect(c.nodes).toHaveLength(nodes.length)
})
it.each(['pause','stop','device','unmount','end'])('cancels scheduled practice clicks on %s',async action=>{
  const {result,unmount}=setup(true);await play(result);const c=owned.contexts[0],nodes=[...c.nodes];expect(nodes.length).toBeGreaterThan(0)
  act(()=>{c.currentTime=.2;if(action==='pause')result.current.pause();if(action==='stop')result.current.stop();if(action==='device')c.changeState('suspended');if(action==='unmount')unmount();if(action==='end'){c.currentTime=10;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(10000))}})
  for(const n of nodes)expect(n.stop.mock.calls.length).toBeGreaterThan(1)
  const count=c.nodes.length;act(()=>vi.advanceTimersByTime(2000));expect(c.nodes).toHaveLength(count)
})

it.each(['off','stop'])('does not leak a click after pending sample preparation and %s',async action=>{
  let release!:()=>void;owned.loads.push(()=>new Promise<void>(resolve=>{release=resolve}))
  const {result,rerender}=setup(true);await play(result)
  act(()=>{if(action==='off')rerender({enabled:false});else result.current.stop()})
  await act(async()=>release());expect(owned.contexts[0].nodes).toHaveLength(0)
  expect(result.current.status).toBe(action==='off'?'playing':'stopped')
})
it('never clicks in preview even with the practice preference enabled, and resumes on the retained audio clock',async()=>{
 const {result}=setup(true);await act(async()=>result.current.previewNote());expect(owned.contexts[0].nodes).toHaveLength(0)
 await play(result);const c=owned.contexts[0];act(()=>{c.currentTime=.2;result.current.pause()});const old=[...c.nodes];await play(result)
 expect(owned.contexts).toHaveLength(1);expect(owned.pianos).toHaveLength(1);// Pause at .2 reads beat .34 from the first origin .03. Resume has
 // piano origin .23, so beat1 is .23+(1-.34)*.5 = .56, not .53.
 expect(owned.transports[0].start.mock.calls.at(-1)[1]).toBeCloseTo(.34)
 expect(c.nodes.slice(old.length)[0].start.mock.calls[0][0]).toBeCloseTo(.56)
})

it.each(['start','toggle','pump'])('owns click-source failure during %s and permits an explicit cached retry',async phase=>{
 const raw='Owned click source unavailable',message='메트로놈 소리를 준비하지 못해 재생을 멈췄습니다.'
 if(phase==='start')owned.clickErrors.push(new Error(raw))
 const {result,rerender,score}=setup(phase!=='toggle'),before=structuredClone(score);await play(result)
 const c=owned.contexts[0]
 if(phase!=='start'){
  owned.clickErrors.push(new Error(raw))
  act(()=>{c.currentTime=phase==='pump'?.8:.2;if(phase==='toggle')rerender({enabled:true});else vi.advanceTimersByTime(20)})
 }
 expect(result.current.status).toBe(phase==='start'?'stopped':'paused');expect(result.current.audioState).toBe('error');expect(result.current.audioError).toBe(message)
 expect(result.current.audioErrorDetails?.message).toBe(raw);expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0)
 for(const n of c.nodes)expect(n.stop.mock.calls.at(-1)[0]).toBe(c.currentTime)
 expect(score).toEqual(before);await play(result);expect(result.current.status).toBe('playing');expect(result.current.audioError).toBe('');expect(result.current.audioErrorDetails).toBeUndefined();expect(owned.contexts).toHaveLength(1);expect(owned.pianos).toHaveLength(1)
})
