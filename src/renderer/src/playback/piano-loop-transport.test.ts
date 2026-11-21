import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PianoTransport,createLoopPianoCommands} from './piano-transport'
import type {PianoSampler} from './piano-sampler'
import type {PlaybackTimeline} from './timeline'
const frequency=(pitch:number)=>440*2**((pitch-69)/12)
function fixture():PlaybackTimeline{return {events:[0,1,2,3].map(n=>({eventId:'note-'+n,partId:'p',staffId:'s',measureId:'m',voiceId:'v',startBeat:n,durationBeats:1,frequency:frequency(60+n),velocityStart:.16,velocityEnd:.16})).concat([{eventId:'bass',partId:'q',staffId:'qs',measureId:'qm',voiceId:'qv',startBeat:0,durationBeats:4,frequency:frequency(48),velocityStart:.16,velocityEnd:.16}]),tempoEvents:[],totalBeats:4}}
function sampler(){return {context:{currentTime:0},noteOn:vi.fn(),noteOff:vi.fn(),limitNoteAt:vi.fn(),stopAll:vi.fn(),setSustain:vi.fn()}}
const loop={startBeat:1,endBeat:3,label:'선택 구간'}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers())
it('excludes the end attack, includes the last duration and clips another part to the boundary',()=>{
 const t=fixture(),before=structuredClone(t),commands=createLoopPianoCommands(t,1,3,120,{})
 expect(commands.filter(c=>c.type==='on').map(c=>c.pitch)).toEqual([61,48,62])
 expect(commands.filter(c=>c.type==='off').every(c=>c.time<=1)).toBe(true)
 expect(commands.find(c=>c.type==='on'&&c.pitch===48)?.offset).toBe(.5);expect(t).toEqual(before)
})
it('bounds an authored pedal at the loop end while retaining the mixer',()=>{
 const t=fixture();t.pedalEvents=[{id:'down',partId:'p',startBeat:0,value:127}]
 const commands=createLoopPianoCommands(t,1,3,120,{q:{muted:true,solo:false,volume:1}})
 expect(commands.some(c=>c.pitch===48||c.pitch===63)).toBe(false)
 expect(commands.filter(c=>c.type==='off').every(c=>c.time<=1)).toBe(true)
})
it('queues the next lap on the original audio origin and gives each lap independent voices',()=>{
 const s=sampler(),transport=new PianoTransport(s as unknown as PianoSampler)
 transport.start(fixture(),1,120,{},false,loop)
 expect(s.noteOn.mock.calls.map(c=>[c[1],c[3]])).toEqual([[61,.03],[48,.03],[62,.53]])
 expect(s.limitNoteAt).toHaveBeenCalledTimes(3);expect(s.limitNoteAt.mock.calls.every(c=>c[1]===1.03)).toBe(true)
 s.context.currentTime=.4;vi.advanceTimersByTime(20)
 expect(s.noteOn.mock.calls.find(c=>c[1]===61&&c[3]>.5)?.[3]).toBeCloseTo(1.03)
 const ids=s.noteOn.mock.calls.map(c=>c[0]);expect(new Set(ids).size).toBe(ids.length)
 s.context.currentTime=10.4;vi.advanceTimersByTime(20)
 expect(s.noteOn.mock.calls.at(-1)?.[3]).toBeGreaterThanOrEqual(10.4)
 transport.stop();const count=s.noteOn.mock.calls.length;vi.advanceTimersByTime(1000);expect(s.noteOn).toHaveBeenCalledTimes(count);expect(vi.getTimerCount()).toBe(0)
})
it('owns a loop pump failure and cancels future work before reporting it',()=>{
 const s=sampler(),error=new Error('Owned loop source failure'),fail=vi.fn(),transport=new PianoTransport(s as unknown as PianoSampler,fail)
 transport.start(fixture(),1,120,{},false,loop);s.noteOn.mockImplementation(()=>{throw error});s.context.currentTime=.4
 vi.advanceTimersByTime(20);expect(fail).toHaveBeenCalledExactlyOnceWith(error);expect(vi.getTimerCount()).toBe(0);expect(s.stopAll).toHaveBeenCalled()
})
