import { applyScoreCommand, buildRhythmEditCommand, createRest, durationToTicks, effectiveAlterAt, measureDurationTicks, sortVoiceEvents, validateTieRelations, type Duration, type Note, type Score, type ScoreCommand, type VoiceEvent } from '../../../score-core'
import { collectSpanEndpointIds } from '../../../score-core/span-references'
import type { EventLocation } from './editor-state'

// An explicit, confirmed overwrite reuses the existing rhythm transaction.
// It never shifts unaffected notes or writes another bar / voice.
export function buildDurationOverwrite(score:Score, location:EventLocation|undefined, duration:Duration, createId:()=>string):{command?:ScoreCommand;count?:number;reason?:string}{
 if(!location)return{}
 const {measure,address,event}=location,voice=measure.voices.find(v=>v.id===address.voiceId)
 if(!voice || duration.tuplet || voice.tuplets?.length || event.duration.tuplet)return{}
 const end=event.position.tick+durationToTicks(duration)
 if(end>measureDurationTicks(measure))return{}
 const covered=voice.events.filter(e=>e.id!==event.id&&e.type==='note'&&e.position.tick>=event.position.tick&&e.position.tick<end) as Note[]
 if(!covered.length)return{}
 const anchors=collectSpanEndpointIds(score)
 if(covered.some(n=>n.ties?.start||n.ties?.stop||anchors.has(n.id)))return{reason:'겹치는 뒤 음표에 타이 또는 구간 기호가 연결되어 있습니다. 연결을 먼저 확인해 주세요.'}
 const removed=new Set(covered.map(n=>n.id)),events:VoiceEvent[]=sortVoiceEvents(voice.events).map(n=>removed.has(n.id)?createRest({id:n.id,position:n.position,duration:n.duration}):n)
 // Retain accidental inheritance for all surviving notes, including chords.
 for(let i=0;i<events.length;i++){
  const n=events[i];if(n.type!=='note')continue
  const pin=(pitch:Note['pitch'])=>{
   const desired=effectiveAlterAt({measure,voice,step:pitch.step,octave:pitch.octave,tick:n.position.tick,override:pitch.alter})
   const actual=effectiveAlterAt({measure,voice:{...voice,events},step:pitch.step,octave:pitch.octave,tick:n.position.tick,override:pitch.alter})
   return desired===actual?pitch:{...pitch,alter:desired}
  }
  const pitches=n.pitches?.map(pin);events[i]={...n,pitch:pitches?.[0]??pin(n.pitch),...(pitches?{pitches}:{})}
 }
 const prepare:ScoreCommand={type:'voice-events.replace',target:address,events,editedEventId:event.id}
 const temporary=applyScoreCommand(score,prepare).score
 const edit=buildRhythmEditCommand(temporary,{target:address,eventId:event.id,event:{...events.find(n=>n.id===event.id)!,duration},createId})
 if(!edit)return{}
 const command:ScoreCommand={type:'score.batch',commands:[prepare,edit]}
 if(validateTieRelations(applyScoreCommand(score,command).score).length)return{reason:'타이 연결을 보존할 수 없어 음가를 바꾸지 않았습니다.'}
 return {command,count:covered.length}
}
