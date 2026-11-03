import { applyScoreCommand, createRest, decomposeDurationTicks, durationToTicks, effectiveAlterAt, measureDurationTicks, resolveNotePitch, sortVoiceEvents, validateTieRelations, voiceEventDurationTicks, type Note, type Score, type ScoreCommand, type VoiceEvent } from '../../../score-core'
import { collectSpanEndpointIds } from '../../../score-core/span-references'
import type { EventLocation } from './editor-state'

export function buildGraceConversion(score: Score, location: EventLocation | undefined, createId: () => string): {command?:ScoreCommand;hostId?:string;reason?:string} {
  const blocked=(reason:string)=>({reason})
  if(!location || location.event.type!=='note')return blocked('꾸밈음으로 바꿀 음표 하나를 선택하세요.')
  const {event:note,measure,address}=location
  const voice=measure.voices.find(v=>v.id===address.voiceId)
  if(!voice)return blocked('선택한 성부를 찾을 수 없습니다.')
  const events=sortVoiceEvents(voice.events),index=events.findIndex(e=>e.id===note.id),host=events[index+1]
  if(!host || host.type!=='note')return blocked('같은 마디에서 바로 뒤에 음표가 있는 음을 선택하세요.')
  if((note.pitches?.length??1)>1)return blocked('화음은 구성음 하나씩 꾸밈음으로 변환할 수 없습니다. 단음을 선택하세요.')
  if(voice.tuplets?.length || events.some(e=>e.type==='note'&&(e.ties?.start||e.ties?.stop)))return blocked('타이·잇단음표가 없는 성부에서 변환하세요.')
  if(collectSpanEndpointIds(score).has(note.id) || score.octaveShifts?.some(s=>s.startEventId===host.id||s.endEventId===host.id))return blocked('선택 음표의 범위 기호 연결 또는 옥타브 경계를 먼저 정리하세요.')
  if(note.graceNotes?.length || note.lyrics?.length || note.articulations?.length || note.fermata || note.breathMark || note.ornaments?.length || note.tremolo)return blocked('선택 음표에 붙은 가사·꾸밈음·표현 기호를 먼저 정리하세요.')
  const ticks=voiceEventDurationTicks(note,measure)
  const rests=decomposeDurationTicks(ticks)
  if(!rests?.length)return blocked('이 음가를 마디 끝 쉼표로 옮길 수 없습니다.')
  const next:VoiceEvent[]=events.filter(e=>e.id!==note.id).map((event,i)=>({ ...event,position:{...event.position,tick:event.position.tick-(i>=index?ticks:0)} }))
  const target=next[index] as Note
  next[index]={...target,graceNotes:[{pitch:resolveNotePitch(measure,voice,note),slash:true},...(target.graceNotes??[])]}
  // Removing an explicit accidental must not respell later sounding pitches.
  for(let i=index;i<next.length;i++){
    const event=next[i],old=events.find(e=>e.id===event.id)
    if(event.type!=='note'||old?.type!=='note')continue
    const pin=(pitch:Note['pitch'])=>{
      const desired=effectiveAlterAt({measure,voice,step:pitch.step,octave:pitch.octave,tick:old.position.tick,override:pitch.alter})
      const actual=effectiveAlterAt({measure,voice:{...voice,events:next},step:pitch.step,octave:pitch.octave,tick:event.position.tick,override:pitch.alter})
      return desired===actual?pitch:{...pitch,alter:desired}
    }
    const pitches=event.pitches?.map(pin)
    next[i]={...event,pitch:pitches?.[0]??pin(event.pitch),...(pitches?{pitches}:{})}
  }
  let tick=measureDurationTicks(measure)-ticks
  for(const duration of rests){next.push(createRest({id:createId(),position:{tick},duration}));tick+=durationToTicks(duration)}
  const command:ScoreCommand={type:'voice-events.replace',target:address,events:next,editedEventId:host.id}
  try{if(validateTieRelations(applyScoreCommand(score,command).score).length)return blocked('기존 타이 연결을 보존할 수 없는 변환입니다.')}catch{return blocked('현재 마디 리듬을 보존할 수 없어 변환하지 않았습니다.')}
  return {command,hostId:host.id}
}
