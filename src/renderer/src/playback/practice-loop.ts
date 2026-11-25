import {createScoreRepeatPlaybackPlan,measureDurationTicks,voiceEventDurationTicks,TICKS_PER_QUARTER,type Score} from '../../../score-core'
import {createRangeSelection,locateEvent,type EditorSelection} from '../editor/editor-state'
import {metronomeUnavailableReason} from './metronome'
import {createPerformedBeatMapper,createPlaybackTimeline} from './timeline'

export interface PracticeLoopRange {startBeat:number;endBeat:number;label:string}
export interface PracticeLoopPlan {range?:PracticeLoopRange;unavailableReason?:string}

/** Resolve source anchors once. Playback-follow selection never edits this session range. */
export function createPracticeLoopPlan(score:Score,selection:EditorSelection):PracticeLoopPlan {
  const reject=(unavailableReason:string):PracticeLoopPlan=>({unavailableReason})
  const staves=score.parts.flatMap(part=>part.staves)
  if(staves.some(staff=>staff.measures.some(bar=>bar.repeat?.start||bar.repeat?.end||bar.volta))) {
    return reject('반복·볼타가 있는 악보는 아직 연습 루프를 사용할 수 없습니다. 일반 재생은 사용할 수 있습니다.')
  }
  if (createScoreRepeatPlaybackPlan(score)?.entries.some(entry => entry.navigationJump)) {
    return reject('재생 이동 지시가 있는 악보는 아직 연습 루프를 사용할 수 없습니다. 일반 재생은 사용할 수 있습니다.')
  }
  if(metronomeUnavailableReason(score))return reject('보표의 박자·마디 수·길이가 서로 달라 연습 루프를 사용할 수 없습니다.')
  if(selection.type==='measure')return reject('연습할 음표·쉼표 또는 연속 범위를 선택해 주세요.')
  let ids:string[]
  if(selection.type==='range'){
    const resolved=createRangeSelection(score,selection.anchorEventId,selection.focusEventId,selection.address)
    if(resolved?.type!=='range'||resolved.eventIds.length!==selection.eventIds.length||resolved.eventIds.some((id,i)=>id!==selection.eventIds[i]))return reject('선택 범위가 바뀌었습니다. 같은 보표·성부의 연속 범위를 다시 선택해 주세요.')
    ids=resolved.eventIds
  }else ids=[selection.eventId]
  const first=locateEvent(score,ids[0],selection.address),last=locateEvent(score,ids[ids.length-1],selection.address)
  if(!first||!last)return reject('선택한 음표·쉼표를 찾지 못했습니다. 연습 구간을 다시 선택해 주세요.')
  const staff=score.parts.find(part=>part.id===first.address.partId)?.staves.find(staff=>staff.id===first.address.staffId)
  if(!staff||first.address.partId!==last.address.partId||first.address.staffId!==last.address.staffId||first.address.voiceId!==last.address.voiceId)return reject('같은 보표·성부의 연속 범위를 선택해 주세요.')
  const at=(location:typeof first)=>{
    const index=staff.measures.findIndex(bar=>bar.id===location.measure.id)
    return staff.measures.slice(0,index).reduce((sum,bar)=>sum+measureDurationTicks(bar),0)/TICKS_PER_QUARTER+location.event.position.tick/TICKS_PER_QUARTER
  }
  const performed=createPerformedBeatMapper(score,undefined,first.address)
  const startBeat=performed(at(first)),endBeat=performed(at(last)+voiceEventDurationTicks(last.event,last.measure)/TICKS_PER_QUARTER,'end')
  if(!Number.isFinite(startBeat)||!Number.isFinite(endBeat)||endBeat<=startBeat)return reject('연습 구간의 길이를 확인할 수 없습니다. 범위를 다시 선택해 주세요.')
  const timeline=createPlaybackTimeline(score)
  if(timeline.events.some(event=>event.tiedEvents?.length&&[startBeat,endBeat].some(boundary=>event.startBeat<boundary-1e-9&&event.startBeat+event.durationBeats>boundary+1e-9)))return reject('연습 구간의 경계를 가로지르는 타이가 있습니다. 연결된 음을 모두 포함하도록 범위를 바꿔 주세요.')
  return {range:{startBeat,endBeat,label:`${first.measureNumber}마디 ${first.eventIndex+1}번째부터 ${last.measureNumber}마디 ${last.eventIndex+1}번째 끝까지 · 총보`}}
}
