import {expect,it} from 'vitest'
import {createRest,createTimePosition,TICKS_PER_QUARTER as T} from '../../../score-core'
import {createPracticeLoopFixture} from '../../../testing/practice-loop-fixture'
import {createRangeSelection,type EditorSelection} from '../editor/editor-state'
import {createNativeProject,encodeNativeProject} from '../../../project/schema'
import {serializeMusicXml} from '../../../musicxml'
import {serializeMidi} from '../midi/serialize-midi'
import {createPracticeLoopPlan} from './practice-loop'
import {beatDeltaToSeconds,createPlaybackTimeline} from './timeline'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createMetronomePlan} from './metronome'

const address={partId:'upper',staffId:'upper-staff',voiceId:'upper-voice',measureId:'upper-bar-0'}
function selected(score:ReturnType<typeof createPracticeLoopFixture>,first=1,last=6){return createRangeSelection(score,`upper-note-${first}`,`upper-note-${last}`,address)!}
it.each([false,true])('includes the final duration with an exclusive end, reversed=%s',reverse=>{
  const score=createPracticeLoopFixture(),range=createPracticeLoopPlan(score,selected(score,reverse?6:1,reverse?1:6)).range
  expect(range).toMatchObject({startBeat:1,endBeat:7});expect(range?.label).toContain('총보')
})
it.each(['note','rest'] as const)('supports one selected %s without inventing an extra beat',kind=>{
  const score=createPracticeLoopFixture();if(kind==='rest')score.parts[0].staves[0].measures[0].voices[0].events[1]=createRest({id:'upper-note-1',position:createTimePosition(T),duration:{value:'quarter',dots:0}})
  expect(createPracticeLoopPlan(score,{type:'event',eventId:'upper-note-1',address}).range).toMatchObject({startBeat:1,endBeat:2})
})
it('uses the existing shared fermata and location tempo clock',()=>{
  const score=createPracticeLoopFixture();score.parts[1].staves[0].measures[0].voices[0].events[3].fermata=true
  score.tempoEvents=[{id:'slow',measureId:'upper-bar-1',tick:0,bpm:60}]
  const range=createPracticeLoopPlan(score,selected(score)).range!;expect(range).toMatchObject({startBeat:1,endBeat:7.5})
  expect(beatDeltaToSeconds(createPlaybackTimeline(score),range.startBeat,range.endBeat,120)).toBe(4.75)
})
it('supports a pickup followed by aligned changed meter',()=>{
  const score=createPracticeLoopFixture()
  for(const part of score.parts){const bars=part.staves[0].measures;bars[0].timing={type:'pickup',durationTicks:T};bars[0].voices[0].events=bars[0].voices[0].events.slice(0,1);bars[1].timeSignature={beats:3,beatType:4};bars[1].voices[0].events.pop()}
  expect(createPracticeLoopPlan(score,selected(score,0,6)).range).toMatchObject({startBeat:0,endBeat:4})
})
it.each(['repeat','volta'] as const)('rejects %s on any staff while leaving ordinary playback available',kind=>{
 const score=createPracticeLoopFixture(),bar=score.parts[1].staves[0].measures[1]
 if(kind==='repeat')bar.repeat={end:true,times:2};else bar.volta={number:1,start:true,end:true}
 expect(createPracticeLoopPlan(score,selected(score))).toMatchObject({unavailableReason:expect.stringMatching(/반복|볼타/)})
 expect(createPlaybackTimeline(score).events.length).toBeGreaterThan(0)
})
it.each(['start','end'] as const)('rejects a tie crossing the %s boundary in another part',side=>{
 const score=createPracticeLoopFixture(),bars=score.parts[1].staves[0].measures,notes=bars.flatMap(b=>b.voices[0].events),n=side==='start'?0:6
 const first=notes[n],last=notes[n+1];if(first.type==='note')first.ties={start:true};if(last.type==='note')last.ties={stop:true}
 expect(createPracticeLoopPlan(score,selected(score))).toMatchObject({unavailableReason:expect.stringContaining('타이')})
})
it('keeps complete ties inside the loop',()=>{
 const score=createPracticeLoopFixture(),notes=score.parts[0].staves[0].measures[0].voices[0].events
 if(notes[2].type==='note')notes[2].ties={start:true};if(notes[3].type==='note')notes[3].ties={stop:true}
 expect(createPracticeLoopPlan(score,selected(score)).range).toMatchObject({startBeat:1,endBeat:7})
})
it.each(['meter','length','count'] as const)('explains unequal staff %s',kind=>{
 const score=createPracticeLoopFixture(),bars=score.parts[1].staves[0].measures
 if(kind==='meter')bars[0].timeSignature={beats:8,beatType:8};if(kind==='length')bars[0].timing={type:'pickup',durationTicks:T};if(kind==='count')bars.pop()
 expect(createPracticeLoopPlan(score,selected(score))).toMatchObject({unavailableReason:expect.stringContaining('보표')})
})
it.each(['missing','gap','address','measure'] as const)('rejects stale or noncontiguous selection: %s',kind=>{
 const score=createPracticeLoopFixture();let selection=structuredClone(selected(score))
 if(kind==='missing'&&selection.type==='range')selection.eventIds[0]='missing'
 if(kind==='gap'&&selection.type==='range')selection.eventIds.splice(1,1)
 if(kind==='address')selection.address={...address,staffId:'missing'}
 if(kind==='measure')selection={type:'measure',measureId:'upper-bar-0',address}
 expect(createPracticeLoopPlan(score,selection as EditorSelection).range).toBeUndefined();expect(createPracticeLoopPlan(score,selection).unavailableReason).toBeTruthy()
})
it('does not mutate score, native, XML, MIDI or selection',()=>{
 const score=createPracticeLoopFixture(),selection=selected(score),before=structuredClone({score,selection})
 const bytes=()=>[encodeNativeProject(createNativeProject(score)),serializeMusicXml(score),Array.from(serializeMidi(score))]
 const outputs=bytes();createPracticeLoopPlan(score,selection);expect({score,selection}).toEqual(before);expect(bytes()).toEqual(outputs)
 const dir=process.env.STUDIO_PRACTICE_LOOP_QA_DIR
 if(dir){
  mkdirSync(dir,{recursive:true})
  for(const id of ['plain','tempo','repeat','boundary']){
   const input=createPracticeLoopFixture()
   if(id==='tempo'){input.parts[0].staves[0].measures[0].voices[0].events[2].fermata=true;input.tempoEvents=[{id:'slow',measureId:'upper-bar-0',tick:2*T,bpm:60}]}
   if(id==='repeat')input.parts[1].staves[0].measures[0].repeat={end:true,times:2}
   if(id==='boundary'){const notes=input.parts[1].staves[0].measures[0].voices[0].events,a=notes[0],b=notes[1];if(a.type==='note')a.ties={start:true};if(b.type==='note')b.ties={stop:true}}
   const timeline=createPlaybackTimeline(input),plan=createPracticeLoopPlan(input,selected(input,1,2))
   writeFileSync(join(dir,id+'.chromatics'),encodeNativeProject(createNativeProject(input)),{flag:'wx'})
   writeFileSync(join(dir,id+'.musicxml'),serializeMusicXml(input),{flag:'wx'});writeFileSync(join(dir,id+'.mid'),serializeMidi(input),{flag:'wx'})
   writeFileSync(join(dir,id+'.json'),JSON.stringify({firstId:'upper-note-1',lastId:'upper-note-2',plan,clicks:createMetronomePlan(input,timeline,120).clicks,periodSeconds:plan.range?beatDeltaToSeconds(timeline,plan.range.startBeat,plan.range.endBeat,120):undefined},null,2),{flag:'wx'})
  }
 }
})

it('does not map a score selection into a linear practice loop when D.C. changes playback order', () => {
  const score = createPracticeLoopFixture()
  const bars = score.parts[1].staves[0].measures
  bars[bars.length - 1].navigation = [{ type: 'dacapo' }]
  expect(createPracticeLoopPlan(score, selected(score))).toEqual({
    unavailableReason: expect.stringContaining('재생 이동')
  })
  expect(createPlaybackTimeline(score).totalBeats).toBe(24)
})

it('keeps linear practice available when the score only has a navigation marker', () => {
  const score = createPracticeLoopFixture()
  score.parts[1].staves[0].measures[0].navigation = [{ type: 'segno', label: 'S' }]
  expect(createPracticeLoopPlan(score, selected(score)).range).toMatchObject({ startBeat: 1, endBeat: 7 })
})
