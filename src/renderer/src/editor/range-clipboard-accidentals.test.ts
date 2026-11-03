import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createMeasure,
  createNote, createPart, createRest, createScore, createStaff, createTimePosition,
  createVoice, effectiveAlterAt, pitchToMidi, resolveNotePitch,
  type Note, type Pitch, type Score, type VoiceEvent
} from '../../../score-core'
import { buildRangeClipboard, buildRangePasteCommand, createRangeSelection } from './editor-state'

const note=(id:string,tick:number,pitch:Pitch):Note=>createNote({id,position:createTimePosition(tick),pitch,duration:createDuration('quarter')})
const rest=(id:string,tick:number,value:'quarter'|'half',dots=0)=>createRest({id,position:createTimePosition(tick),duration:createDuration(value,dots)})
const make=(leader:Note,automatic:Note,sourceFifths=0,targetFifths=0)=>createScore({parts:[createPart({staves:[createStaff({measures:[
  createMeasure({id:'source-measure',number:1,keySignature:{fifths:sourceFifths,mode:'major'},voices:[createVoice({events:[leader,automatic,rest('source-tail',2*T,'half')]})]}),
  createMeasure({id:'target-measure',number:2,keySignature:{fifths:targetFifths,mode:'major'},voices:[createVoice({events:[rest('target',0,'quarter'),rest('target-2',T,'quarter'),rest('target-tail',2*T,'half')]})]})
]})]})]})
const voice=(score:Score,index:number)=>score.parts[0].staves[0].measures[index].voices[0]
const paste=(score:Score,clipboard=buildRangeClipboard(score,{type:'event',eventId:'automatic'})!)=>{
  const command=buildRangePasteCommand(score,{type:'event',eventId:'target'},clipboard,()=> 'pasted')!
  return applyScoreCommand(score,command)
}
const sounding=(score:Score)=>{
  const measure=score.parts[0].staves[0].measures[1],v=measure.voices[0],event=v.events.find(e=>e.id==='pasted') as Note
  return pitchToMidi(resolveNotePitch(measure,v,event))
}
const autoPitch:Pitch={step:'C',octave:4}

describe('range clipboard accidental context',()=>{
  it.each([{name:'sharp',alter:1,midi:61},{name:'flat',alter:-1,midi:59},{name:'double sharp',alter:2,midi:62},{name:'double flat',alter:-2,midi:58}] as const)('preserves a $name carried from before the copied range',({alter,midi})=>{
    const score=make(note('leader',0,{...autoPitch,alter}),note('automatic',T,{...autoPitch})),before=structuredClone(score),result=paste(score)
    expect(sounding(result.score)).toBe(midi)
    expect((voice(result.score,1).events[0] as Note).pitch.alter).toBe(alter)
    expect(score).toEqual(before);expect((voice(score,0).events[1] as Note).pitch.alter).toBeUndefined()
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
  })
  it('preserves an implicit natural after a cancellation in the source key',()=>{
    const score=make(note('leader',0,{step:'F',octave:4,alter:0}),note('automatic',T,{step:'F',octave:4}),1,1)
    expect(sounding(paste(score).score)).toBe(65)
  })
  it('preserves the source key accidental when the destination key differs',()=>{
    const score=make(note('leader',0,{step:'G',octave:4,alter:0}),note('automatic',T,{step:'F',octave:4}),1,0)
    expect(sounding(paste(score).score)).toBe(66)
  })
  it('cancels an unrelated destination accidental for a copied natural',()=>{
    const score=make(note('leader',0,{...autoPitch,alter:0}),note('automatic',T,{...autoPitch}));voice(score,1).events=[note('target-leader',0,{...autoPitch,alter:1}),rest('target',T,'quarter'),rest('target-tail',2*T,'half')]
    expect(sounding(paste(score).score)).toBe(60)
  })
  it('preserves every implicit chord member using the original source voice',()=>{
    const leader={...note('leader',0,{...autoPitch,alter:1}),pitches:[{...autoPitch,alter:1 as const},{step:'E' as const,octave:4,alter:-1 as const},{step:'G' as const,octave:4,alter:0 as const}]}
    const automatic={...note('automatic',T,{...autoPitch}),pitches:[{...autoPitch},{step:'E' as const,octave:4},{step:'G' as const,octave:4}]},score=make(leader,automatic),result=paste(score),measure=result.score.parts[0].staves[0].measures[1],v=measure.voices[0],event=v.events[0] as Note
    expect(event.pitches!.map(p=>pitchToMidi({...p,alter:effectiveAlterAt({measure,voice:v,step:p.step,octave:p.octave,tick:event.position.tick,override:p.alter})}))).toEqual([61,63,67])
    expect(event.pitch.alter).toBe(1);expect(automatic.pitches).toEqual([{...autoPitch},{step:'E',octave:4},{step:'G',octave:4}])
  })
  it('captures the accidental at copy time even when the source is later edited',()=>{
    const score=make(note('leader',0,{...autoPitch,alter:1}),note('automatic',T,{...autoPitch})),clipboard=buildRangeClipboard(score,{type:'event',eventId:'automatic'})!,later=structuredClone(score);(voice(later,0).events[0] as Note).pitch.alter=0
    expect(sounding(paste(later,clipboard).score)).toBe(61)
  })
  it('keeps an unchanged automatic pitch automatic in the same context',()=>{
    const score=make(note('leader',0,{...autoPitch,alter:0}),note('automatic',T,{...autoPitch})),result=paste(score)
    expect((voice(result.score,1).events[0] as Note).pitch).toEqual(autoPitch);expect(sounding(result.score)).toBe(60)
  })
  it('uses the pasted leading accidental for following automatic notes',()=>{
    const score=make(note('leader',0,{...autoPitch,alter:1}),note('automatic',T,{...autoPitch})),source=createRangeSelection(score,'leader','automatic')!,target=createRangeSelection(score,'target','target-2')!,clipboard=buildRangeClipboard(score,source)!,ids=['pasted-a','pasted-b'];const result=applyScoreCommand(score,buildRangePasteCommand(score,target,clipboard,()=>ids.shift()!)!),events=voice(result.score,1).events as Note[]
    expect(events.slice(0,2).map(e=>e.pitch.alter)).toEqual([1,undefined])
    const measure=result.score.parts[0].staves[0].measures[1];expect(events.slice(0,2).map(e=>pitchToMidi(resolveNotePitch(measure,voice(result.score,1),e)))).toEqual([61,61])
  })
})
