import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {applyScoreCommand,createDuration,createMeasure,createNote,createPart,createScore,createStaff,createVoice,TICKS_PER_QUARTER,type Score} from '../score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {parseMusicXml,serializeMusicXml} from './index'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'

function source(){
 const q=TICKS_PER_QUARTER
 const quarters=(prefix:string,octave:number,steps:readonly ('C'|'D'|'E'|'F')[]= ['C','D','E','F'])=>steps.map((step,i)=>createNote({id:`${prefix}-${i}`,position:{tick:i*q},pitch:{step,octave,alter:0},duration:createDuration('quarter')}))
 return createScore({id:'octave-scope-score',title:'옥타브 보표 시간 범위',parts:[
  createPart({id:'piano',name:'Piano',staves:[createStaff({id:'upper',measures:[createMeasure({id:'upper-bar',voices:[
   createVoice({id:'voice-1',events:quarters('upper',4)}),
   createVoice({id:'voice-2',events:[createNote({id:'held-before',pitch:{step:'G',octave:3,alter:0},duration:createDuration('half')}),createNote({id:'other-inside',position:{tick:2*q},pitch:{step:'A',octave:3,alter:0}}),createNote({id:'other-after',position:{tick:3*q},pitch:{step:'B',octave:3,alter:0}})]})
  ]})]}),createStaff({id:'lower',measures:[createMeasure({id:'lower-bar',voices:[createVoice({events:quarters('lower',3,['C','C','C','C'])})]})]})]}),
  createPart({id:'peer',name:'Peer',staves:[createStaff({id:'peer-staff',measures:[createMeasure({id:'peer-bar',voices:[createVoice({events:quarters('peer',5,['C','C','C','C'])})]})]})]})
 ]})
}
function vector(score:Score,partIndex:number,staffIndex:number,voiceId:string){
 const part=score.parts[partIndex],staff=part.staves[staffIndex]
 return createPlaybackTimeline(score).events.filter(e=>e.partId===part.id&&e.staffId===staff.id&&e.voiceId===voiceId).sort((a,b)=>a.startBeat-b.startBeat).map(e=>[e.startBeat,e.durationBeats,Math.round(69+12*Math.log2(e.frequency!/440))])
}
it.each([['8va',12],['8vb',-12],['15ma',24],['15mb',-24]] as const)('%s keeps all-voice onset scope, other staves and exact undo/native/XML/MIDI', (type,semitones)=>{
 const s=source(),original=encodeNativeProject(createNativeProject(s)),changed=applyScoreCommand(s,{type:'score-octave-shifts.update',octaveShifts:[{id:'staff-time-shift',type,startEventId:'upper-1',endEventId:'upper-2'}]})
 const expected=source();for(const [voiceIndex,eventIndex] of [[0,1],[0,2],[1,1]]){const note=expected.parts[0].staves[0].measures[0].voices[voiceIndex].events[eventIndex];if(note.type!=='note')throw Error('Typed expected note');note.pitch.octave+=semitones/12}
 const xml=serializeMusicXml(changed.score),native=encodeNativeProject(createNativeProject(changed.score))
 for(const candidate of [changed.score,decodeNativeProject(native).score,parseMusicXml(xml)]){
  expect(vector(candidate,0,0,'voice-1')).toEqual([[0,1,60],[1,1,62+semitones],[2,1,64+semitones],[3,1,65]])
  expect(vector(candidate,0,0,'voice-2')).toEqual([[0,2,55],[2,1,57+semitones],[3,1,59]])
  expect(vector(candidate,0,1,'voice-1')).toEqual([[0,1,48],[1,1,48],[2,1,48],[3,1,48]])
  expect(vector(candidate,1,0,'voice-1')).toEqual([[0,1,72],[1,1,72],[2,1,72],[3,1,72]])
  expect(serializeMidi(candidate)).toEqual(serializeMidi(expected))
 }
 expect(changed.score.parts).toEqual(s.parts)
 expect(encodeNativeProject(createNativeProject(applyScoreCommand(changed.score,changed.undo).score))).toBe(original)
 expect(encodeNativeProject(createNativeProject(s))).toBe(original)
 const dir=process.env.STUDIO_OCTAVE_SCOPE_QA_DIR
 if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,`${type}.musicxml`),xml,{flag:'wx'});writeFileSync(join(dir,`${type}.chromatics`),native,{flag:'wx'});writeFileSync(join(dir,`${type}.mid`),serializeMidi(changed.score),{flag:'wx'})}
})
