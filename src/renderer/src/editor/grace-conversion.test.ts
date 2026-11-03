import { expect,it } from 'vitest'
import { applyScoreCommand, createNote, createRest, durationToTicks, measureDurationTicks, resolveNotePitch, voiceEventDurationTicks } from '../../../score-core'
import { createPartSpanResetFixture } from '../../../testing/part-span-reset-fixture'
import { buildGraceConversion } from './grace-conversion'
function fixture(){const project=createPartSpanResetFixture(),score=project.score,part=score.parts[0],staff=part.staves[0],measure=staff.measures[0],voice=measure.voices[0];voice.tuplets=undefined;voice.events=[createNote({id:'source',pitch:{step:'F',octave:4,alter:1}}),createNote({id:'host',position:{tick:durationToTicks({value:'quarter',dots:0})},pitch:{step:'F',octave:4}}),createRest({id:'tail',position:{tick:durationToTicks({value:'half',dots:0})},duration:{value:'half',dots:0}})];score.slurs=undefined;score.hairpins=undefined;score.octaveShifts=undefined;return{score,measure,voice,address:{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:voice.id}}}
it('converts a timed note to host grace, closes the gap and restores exactly with one undo',()=>{
 const {score,measure,voice,address}=fixture(),before=structuredClone(score);let id=0
 const result=buildGraceConversion(score,{address,event:voice.events[0],eventIndex:0,measure,measureNumber:1},()=>`new-rest-${++id}`)
 expect(result.reason).toBeUndefined();const applied=applyScoreCommand(score,result.command!),updated=applied.score.parts[0].staves[0].measures[0],next=updated.voices[0]
 expect(next.events[0]).toMatchObject({id:'host',position:{tick:0},graceNotes:[{pitch:{step:'F',octave:4,alter:1},slash:true}]})
 expect(next.events.map(e=>e.id)).toEqual(['host','tail','new-rest-1'])
 expect(resolveNotePitch(updated,next,next.events[0] as any)).toEqual(resolveNotePitch(measure,voice,voice.events[1] as any))
 expect(next.events.reduce((sum,event)=>sum+voiceEventDurationTicks(event,updated),0)).toBe(measureDurationTicks(updated))
 expect(applyScoreCommand(applied.score,applied.undo).score).toEqual(before);expect(score).toEqual(before)
})
it.each(['tie','tuplet','lyric','span','chord','last'])('explains unsupported %s rather than dropping notation',kind=>{
 const {score,measure,voice,address}=fixture();let note=voice.events[0] as any
 if(kind==='tie')note.ties={start:true};if(kind==='tuplet')voice.tuplets=[{}]as any;if(kind==='lyric')note.lyrics=[{text:'가',number:1}];if(kind==='span')score.slurs=[{id:'s',startEventId:'source',endEventId:'host'}];if(kind==='chord')note.pitches=[note.pitch,{step:'A',octave:4}];if(kind==='last'){note=voice.events[1];voice.events=voice.events.slice(0,2)}
 const before=structuredClone(score),result=buildGraceConversion(score,{address,event:note,eventIndex:0,measure,measureNumber:1},()=> 'unused')
 expect(result.command).toBeUndefined();expect(result.reason).toBeTruthy();expect(score).toEqual(before)
})
