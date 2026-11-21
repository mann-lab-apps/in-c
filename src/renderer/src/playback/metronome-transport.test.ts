import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {MetronomeTransport,scheduleMetronomeClick} from './metronome-transport'
import {createPlaybackTimeline} from './timeline'
import {createMetronomePlan} from './metronome'
import {createMetronomeFixture} from '../../../testing/metronome-fixture'
import {createNativeProject,encodeNativeProject} from '../../../project/schema'
import {serializeMusicXml} from '../../../musicxml'
import {serializeMidi} from '../midi/serialize-midi'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
function context(){const nodes:any[]=[],gains:any[]=[];const param=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});const c={currentTime:10,destination:{},createOscillator(){const n={type:'',frequency:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:undefined};nodes.push(n);return n},createGain(){const g={gain:param(),connect:vi.fn(),disconnect:vi.fn()};gains.push(g);return g}};return {c:c as unknown as BaseAudioContext,nodes,gains}}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers())
it('repeats exclusive practice clicks at the same continuous origin and skips elapsed laps',()=>{
 const {c,nodes}=context(),transport=new MetronomeTransport(c),timeline={events:[],tempoEvents:[],totalBeats:4}
 transport.start([0,1,2,3].map(beat=>({beat,accent:beat===0,measureIndex:0})),timeline,0,120,10.03,{startBeat:0,endBeat:1,label:'한 박'})
 expect(nodes.map(n=>n.start.mock.calls[0][0])).toEqual([10.03,10.53])
 Object.assign(c,{currentTime:11});vi.advanceTimersByTime(20)
 expect(nodes.slice(2).map(n=>n.start.mock.calls[0][0])).toEqual([11.03,11.53])
 expect(nodes.every(n=>n.frequency.setValueAtTime.mock.calls[0][0]===1760)).toBe(true)
 Object.assign(c,{currentTime:20.1});const old=nodes.length;vi.advanceTimersByTime(20)
 expect(nodes.slice(old).every(n=>n.start.mock.calls[0][0]>=20.1)).toBe(true)
 transport.stop();expect(vi.getTimerCount()).toBe(0)
})
it('schedules only lookahead ticks at the piano origin and continues via the audio clock',()=>{
 const {c,nodes}=context(),timeline={events:[],tempoEvents:[{id:'slow',measureId:'b',startBeat:1,bpm:60,quarterBpm:60}],totalBeats:3},transport=new MetronomeTransport(c)
 transport.start([0,1,2].map(beat=>({beat,accent:beat===0,measureIndex:0})),timeline,0,120,10.03)
 expect(nodes.map(n=>n.start.mock.calls[0][0])).toEqual([10.03,10.53]);Object.assign(c,{currentTime:11});vi.advanceTimersByTime(20);expect(nodes[2].start).toHaveBeenCalledExactlyOnceWith(11.53)
 vi.advanceTimersByTime(200);expect(nodes).toHaveLength(3);transport.stop();expect(vi.getTimerCount()).toBe(0)
 for(const n of nodes)expect(n.stop.mock.calls.at(-1)[0]).toBe(11)
})
it('skips elapsed ticks when enabled mid-play and cancels future sources before their start',()=>{
 const {c,nodes}=context(),transport=new MetronomeTransport(c),timeline={events:[],tempoEvents:[],totalBeats:8}
 transport.start([0,1,2,3].map(beat=>({beat,accent:false,measureIndex:0})),timeline,0,120,9.5)
 expect(nodes.map(n=>n.start.mock.calls[0][0])).toEqual([10,10.5]);transport.stop();for(const n of nodes){expect(n.stop.mock.calls.at(-1)[0]).toBe(10);expect(n.disconnect).toHaveBeenCalled()};expect(vi.getTimerCount()).toBe(0)
})
it('releases finished nodes and bounds the independent envelope and accent pitch',()=>{
 const {c,nodes,gains}=context();const transport=new MetronomeTransport(c);transport.start([{beat:0,accent:true,measureIndex:0}],{events:[],tempoEvents:[],totalBeats:1},0,120,10.03)
 expect(gains[0].gain.linearRampToValueAtTime.mock.calls[0][0]).toBe(.07);expect(nodes[0].frequency.setValueAtTime).toHaveBeenCalledWith(1760,10.03)
 nodes[0].onended();const stops=nodes[0].stop.mock.calls.length;transport.stop();expect(nodes[0].stop).toHaveBeenCalledTimes(stops)
 const quiet=scheduleMetronomeClick(c,11,false,.01);expect(nodes[1].frequency.setValueAtTime).toHaveBeenCalledWith(1320,11);expect(nodes[1].stop).toHaveBeenCalledWith(11.012);quiet.disconnect()
})
it.each([false,true])('uses real repeat/fermata fixtures and can freeze owned QA files, compound=%s',compound=>{
 const score=createMetronomeFixture(compound),t=createPlaybackTimeline(score),plan=createMetronomePlan(score,t,120),before=structuredClone(score)
 expect(plan.clicks.filter(c=>c.accent).map(c=>c.beat)).toEqual(compound?[0,3,7.5,10.5,15]:[0,4,10,14,20]);expect(score).toEqual(before)
 const dir=process.env.STUDIO_METRONOME_QA_DIR;if(dir){mkdirSync(dir,{recursive:true});const id=compound?'compound':'simple';writeFileSync(join(dir,id+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,id+'.musicxml'),serializeMusicXml(score));writeFileSync(join(dir,id+'.mid'),serializeMidi(score));writeFileSync(join(dir,id+'.json'),JSON.stringify({firstEventId:score.parts[0].staves[0].measures[0].voices[0].events[0].id,clicks:plan.clicks,tempo:120,totalBeats:t.totalBeats},null,2))}
})

it('disconnects a partially created click when source start fails',()=>{
 const {c,nodes,gains}=context(),create=c.createOscillator.bind(c)
 vi.spyOn(c,'createOscillator').mockImplementation(()=>{const n=create();vi.spyOn(n,'start').mockImplementation(()=>{throw new Error('Owned oscillator start failure')});return n})
 expect(()=>scheduleMetronomeClick(c,11,false)).toThrow('Owned oscillator start failure')
 expect(nodes[0].disconnect).toHaveBeenCalled();expect(gains[0].disconnect).toHaveBeenCalled()
})
