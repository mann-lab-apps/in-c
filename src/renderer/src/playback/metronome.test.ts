import { expect, it } from 'vitest'
import { createDuration,createMeasure,createNote,createPart,createScore,createStaff,createVoice,TICKS_PER_QUARTER as T } from '../../../score-core'
import { createMetronomePlan } from './metronome'
import { beatDeltaToSeconds,createPlaybackTimeline } from './timeline'
import { createNativeProject,encodeNativeProject } from '../../../project/schema'
import { serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
function fixture(beats=4,beatType=4,bpm=120){return createScore({id:'metronome-score',tempo:{bpm},parts:[createPart({id:'p',staves:[createStaff({id:'s',measures:[createMeasure({id:'a',timeSignature:{beats,beatType}}),createMeasure({id:'b',timeSignature:{beats,beatType}})]})]})]})}
const plan=(s:ReturnType<typeof fixture>,bpm=s.tempo!.bpm)=>createMetronomePlan(s,createPlaybackTimeline(s),bpm)
it.each([{beats:4,type:4,want:[0,1,2,3,4,5,6,7]},{beats:3,type:8,want:[0,.5,1,1.5,2,2.5]},{beats:5,type:8,want:[0,.5,1,1.5,2,2.5,3,3.5,4,4.5]}])('uses actual denominator beats for $beats/$type',({beats,type,want})=>{
 const s=fixture(beats,type),p=plan(s);expect(p.clicks.map(c=>c.beat)).toEqual(want);expect(p.clicks.filter(c=>c.accent).map(c=>c.beat)).toEqual([0,beats*4/type])
})
it.each([{bpm:120,want:[0,1.5,3,4.5]},{bpm:90,want:[0,1.5,3,4.5]},{bpm:80,want:[0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5]}])('groups 6/8 at the compound-beat threshold: quarter $bpm',({bpm,want})=>expect(plan(fixture(6,8,bpm)).clicks.map(c=>c.beat)).toEqual(want))
it.each([{ticks:T,want:[0,1,2,3,4]},{ticks:T/2,want:[.5,1.5,2.5,3.5]}])('end-aligns a 4/4 pickup of $ticks ticks',({ticks,want})=>{
 const s=fixture();s.parts[0].staves[0].measures[0].timing={type:'pickup',durationTicks:ticks};const p=plan(s)
 expect(p.clicks.map(c=>c.beat)).toEqual(want);expect(p.clicks.filter(c=>c.accent).map(c=>c.beat)).toEqual([ticks/T])
})
it('does not invent a grouped pulse inside a tiny compound pickup',()=>{
 const s=fixture(6,8);s.parts[0].staves[0].measures[0].timing={type:'pickup',durationTicks:T/2};expect(plan(s).clicks.map(c=>c.beat)).toEqual([.5,2])
})
it('uses changed meter, location tempo and repeated source occurrences without rewriting data',()=>{
 const s=fixture(6,8);s.parts[0].staves[0].measures[0].repeat={start:true};s.parts[0].staves[0].measures[1].repeat={end:true,times:2}
 s.tempoEvents=[{id:'slow',measureId:'b',tick:0,bpm:80}]
 const before=structuredClone(s),t=createPlaybackTimeline(s),p=plan(s)
 expect(p.clicks.map(c=>c.beat)).toEqual([0,1.5,3,3.5,4,4.5,5,5.5,6,7.5,9,9.5,10,10.5,11,11.5])
 expect(p.clicks.map(c=>beatDeltaToSeconds(t,0,c.beat,120))).toEqual([0,.75,1.5,1.875,2.25,2.625,3,3.375,3.75,4.5,5.25,5.625,6,6.375,6.75,7.125]);expect(s).toEqual(before)
 const changed=fixture();changed.parts[0].staves[0].measures[1].timeSignature={beats:3,beatType:8};expect(plan(changed).clicks.map(c=>c.beat)).toEqual([0,1,2,3,4,4.5,5])
})
it('uses the existing first/second volta plan, not source order',()=>{
 const s=fixture();const bars=s.parts[0].staves[0].measures;bars[0].repeat={start:true};bars[1].repeat={end:true,times:2};bars[1].volta={number:1,start:true,end:true};bars.push(createMeasure({id:'c',timeSignature:{beats:3,beatType:4},volta:{number:2,start:true,end:true}}))
 expect(plan(s).clicks.filter(c=>c.accent).map(c=>[c.beat,c.measureIndex])).toEqual([[0,0],[4,1],[8,0],[12,2]])
})
it('shares the longest simultaneous fermata hold once and emits no extra hold ticks',()=>{
 const s=fixture(),bar=s.parts[0].staves[0].measures[0];bar.voices=[createVoice({events:[createNote({id:'held',pitch:{step:'C',octave:4},duration:createDuration('quarter'),fermata:true})]})]
 s.parts.push(structuredClone(s.parts[0]));s.parts[1].id='other'
 const before=structuredClone(s),p=plan(s);expect(p.clicks.map(c=>c.beat)).toEqual([0,1.5,2.5,3.5,4.5,5.5,6.5,7.5]);expect(s).toEqual(before)
})
it.each(['meter','length','count'])('rejects independent staff %s while preserving the playback timeline',kind=>{
 const s=fixture();s.parts[0].staves.push(structuredClone(s.parts[0].staves[0]));const bars=s.parts[0].staves[1].measures
 if(kind==='meter')bars[0].timeSignature={beats:8,beatType:8};if(kind==='length')bars[0].timing={type:'pickup',durationTicks:T};if(kind==='count')bars.pop()
 expect(plan(s)).toMatchObject({clicks:[],unavailableReason:expect.stringContaining('보표별')})
})
it('practice plan creation preserves native bytes, XML and MIDI',()=>{
 const s=fixture(),native=encodeNativeProject(createNativeProject(s)),xml=serializeMusicXml(s),midi=serializeMidi(s);plan(s)
 expect(encodeNativeProject(createNativeProject(s))).toBe(native);expect(serializeMusicXml(s)).toBe(xml);expect(serializeMidi(s)).toEqual(midi)
})
