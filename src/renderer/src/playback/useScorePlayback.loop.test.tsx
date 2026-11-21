// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createPracticeLoopFixture} from '../../../testing/practice-loop-fixture'
import {useScorePlayback,type PlaybackPartMixerMap} from './useScorePlayback'
import type {PracticeLoopRange} from './practice-loop'
const owned=vi.hoisted(()=>({contexts:[]as any[],samplers:[]as any[],loads:[]as (()=>Promise<void>)[],forceLoading:false}))
vi.mock('./piano-sampler',()=>({PianoSampler:class{
 ready=true;noteOn=vi.fn();noteOff=vi.fn();limitNoteAt=vi.fn();stopAll=vi.fn();setSustain=vi.fn();dispose=vi.fn();hasPitches=vi.fn(()=>!owned.forceLoading)
 preparePitches=vi.fn(async()=>{await owned.loads.shift()?.()})
 constructor(readonly context:any){owned.samplers.push(this)}
}}))
let frames:Map<number,FrameRequestCallback>
beforeEach(()=>{
 vi.useFakeTimers();owned.contexts.length=owned.samplers.length=owned.loads.length=0;owned.forceLoading=false;frames=new Map();let id=0
 vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++id,f);return id});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id))
 const param=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()})
 vi.stubGlobal('AudioContext',class extends EventTarget{
  currentTime=0;state='running';destination={};nodes:any[]=[];resume=vi.fn(async()=>{});close=vi.fn(async()=>{})
  constructor(){super();owned.contexts.push(this)}
  createGain(){return{gain:param(),connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const n={frequency:param(),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:undefined};this.nodes.push(n);return n}
 })
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
const loop:PracticeLoopRange={startBeat:1,endBeat:3,label:'선택 구간'}
function setup(clicks=false){const score=createPracticeLoopFixture(),mix:PlaybackPartMixerMap={};return{score,...renderHook(({range})=>useScorePlayback(score,mix,undefined,undefined,clicks,range),{initialProps:{range:loop as PracticeLoopRange|undefined}})}}
async function play(result:ReturnType<typeof setup>['result']){await act(async()=>result.current.play())}
function advance(seconds:number){act(()=>{owned.contexts[0].currentTime=seconds;vi.advanceTimersByTime(20);const all=[...frames.values()];frames.clear();for(const f of all)f(seconds*1000)})}
it('starts outside the range at its beginning and keeps playing through many wraps on one context/cache',async()=>{
 const {result,score}=setup(),before=structuredClone(score);await play(result);expect(result.current.positionBeat).toBe(1)
 advance(1.23);expect(result.current.positionBeat).toBeCloseTo(1.4);expect(result.current.status).toBe('playing')
 advance(1000.23);expect(result.current.positionBeat).toBeCloseTo(1.4);expect(result.current.status).toBe('playing')
 expect(owned.contexts).toHaveLength(1);expect(owned.samplers).toHaveLength(1);expect(owned.samplers[0].preparePitches).toHaveBeenCalledTimes(1);expect(score).toEqual(before)
})
it('pauses inside the loop, resumes without reloading and rewinds to the loop start',async()=>{
 const {result}=setup();await play(result);advance(1.23);act(()=>result.current.pause());expect(result.current.positionBeat).toBeCloseTo(1.4)
 await play(result);expect(result.current.positionBeat).toBeCloseTo(1.4);advance(1.46);expect(result.current.positionBeat).toBeCloseTo(1.8)
 act(()=>result.current.pause());act(()=>result.current.jumpToStart());expect(result.current.positionBeat).toBe(1);expect(result.current.status).toBe('stopped')
 await play(result);expect(result.current.positionBeat).toBe(1);act(()=>result.current.stop());expect(result.current.positionBeat).toBe(0);expect(vi.getTimerCount()).toBe(0)
})
it('turns off at the current wrapped position and returns to ordinary playback',async()=>{
 const {result,rerender}=setup();await play(result);advance(1.23)
 await act(async()=>rerender({range:undefined}));expect(result.current.positionBeat).toBeCloseTo(1.4);expect(result.current.status).toBe('playing')
 advance(3);expect(result.current.positionBeat).toBeGreaterThan(3);expect(owned.contexts).toHaveLength(1)
})
it('shares the same loop origin with the metronome and cancels all future sources on stop',async()=>{
 const {result}=setup(true);await play(result);const c=owned.contexts[0]
 expect(c.nodes.map((n:any)=>n.start.mock.calls[0][0])).toEqual([.03,.53])
 advance(.4);expect(c.nodes[2].start.mock.calls[0][0]).toBeCloseTo(1.03)
 const starts=owned.samplers[0].noteOn.mock.calls.map((c:any)=>c[3]);expect(starts.some((at:number)=>Math.abs(at-1.03)<1e-9)).toBe(true)
 act(()=>result.current.stop());expect(vi.getTimerCount()).toBe(0);for(const n of c.nodes)expect(n.stop.mock.calls.at(-1)[0]).toBe(c.currentTime)
})
it.each(['off','stop','unmount']as const)('invalidates a pending loop prepare on %s',async action=>{
 owned.forceLoading=true
 let finish!:()=>void;owned.loads.push(()=>new Promise<void>(resolve=>{finish=resolve}))
 const {result,rerender,unmount}=setup();await play(result)
 act(()=>{if(action==='off')rerender({range:undefined});else if(action==='stop')result.current.stop();else unmount()})
 if(action!=='unmount')expect(result.current.audioState).not.toBe('loading')
 await act(async()=>finish());expect(owned.samplers[0].noteOn).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0)
})
it('clears preview ownership when changing the loop instead of leaving a canceled preview busy',async()=>{
 const {result,rerender}=setup();await act(async()=>result.current.previewNote());expect(result.current.previewing).toBe(true)
 act(()=>rerender({range:undefined}));expect(result.current.previewing).toBe(false);expect(vi.getTimerCount()).toBe(0)
})
it('owns a deferred piano pump error, pauses at the wrapped beat and allows explicit retry',async()=>{
 const {result}=setup();await play(result);const piano=owned.samplers[0];piano.noteOn.mockImplementationOnce(()=>{throw Error('Owned practice pump failure')})
 advance(.4);expect(result.current.status).toBe('paused');expect(result.current.audioState).toBe('error');expect(result.current.audioError).toContain('연습 구간');expect(vi.getTimerCount()).toBe(0)
 await play(result);expect(result.current.status).toBe('playing');expect(result.current.audioError).toBe('');expect(owned.contexts).toHaveLength(1)
})
