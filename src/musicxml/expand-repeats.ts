import {
  collectTiePairs,collectUnsupportedChordTieWarnings,createGlobalMeasureResolver,
  createScoreRepeatPlaybackPlan,createPerformedPedalPlan,durationToTicks,measureDurationTicks,sortVoiceEvents,
  TICKS_PER_QUARTER,validateTieRelations,voiceEventDurationTicks,
  type Score,type TempoEvent,type TempoMarking,type VoiceEvent
} from '../score-core'

const unsupported=()=>new Error('이 악보의 일부 표기는 아직 반복 펼치기로 옮길 수 없습니다. 일반 MusicXML 내보내기나 프로젝트 저장을 사용해 주세요.')
const id=(kind:string,occurrence:number,source:string)=>`expanded-${occurrence+1}-${kind}-${source}`
const quarterBpm=(tempo:TempoMarking)=>tempo.bpm*durationToTicks({value:tempo.beatUnit??'quarter',dots:tempo.dots??0})/TICKS_PER_QUARTER

/** Explicit compatibility copy only. Never mutates the editor/native snapshot.
 * Unsupported transformations fail closed; this is not a new score schema. */
export function expandScoreRepeatsForMusicXml(score:Score):Score {
  const marked=score.parts.some(p=>p.staves.some(s=>s.measures.some(m=>m.repeat?.start||m.repeat?.end||m.volta)))
  if(!marked)return structuredClone(score)
  const plan=createScoreRepeatPlaybackPlan(score)
  if(!plan)throw new Error('보표의 마디 수와 길이가 달라 반복을 펼칠 수 없습니다. 일반 MusicXML 내보내기를 사용해 주세요.')
  if(collectUnsupportedChordTieWarnings(score).length||validateTieRelations(score).length)throw unsupported()

  const resolve=createGlobalMeasureResolver(score)
  const measures=new Map<string,{index:number;part:number;staff:number}>()
  const eventSource=new Map<string,string>()
  const eventLocations=new Map<string,{index:number;part:number;staff:number;voice:string;event:VoiceEvent}>()
  score.parts.forEach((p,part)=>p.staves.forEach((s,staff)=>s.measures.forEach((m,index)=>{
    if(measures.has(m.id))throw unsupported()
    measures.set(m.id,{index,part,staff})
    for(const v of m.voices)for(const e of v.events){
      if(eventLocations.has(e.id))throw unsupported()
      eventLocations.set(e.id,{index,part,staff,voice:v.id,event:e})
    }
  })))
  // These retained ordinal dynamics are not currently rendered/performed by
  // the editor's concrete-owner policy. Do not make them audible in a copy.
  if(score.dynamics?.some(mark=>!measures.has(mark.measureId)))throw new Error('이 악보의 셈여림 위치는 현재 반복 펼치기에서 지원하지 않습니다. 일반 MusicXML 내보내기나 프로젝트 저장을 사용해 주세요.')
  const output=structuredClone(score)
  output.parts=score.parts.map(p=>({...structuredClone(p),staves:p.staves.map(s=>({...structuredClone(s),measures:plan.entries.map((entry,occurrence)=>{
    const m=structuredClone(s.measures[entry.measureIndex]);m.id=id('measure',occurrence,m.id);m.number=occurrence+1;delete m.repeat;delete m.volta
    for(const v of m.voices){
      // A voice is a continuing owner, not a per-measure event identity.
      for(const e of v.events){const original=e.id;e.id=id('event',occurrence,original);eventSource.set(e.id,original);if(e.type==='note')delete e.ties}
      for(const t of v.tuplets??[]){t.id=id('tuplet',occurrence,t.id);t.eventIds=t.eventIds.map(e=>id('event',occurrence,e))}
    }
    return m
  })}))}))

  const copiedRanges=<T extends {id:string;startEventId:string;endEventId:string}>(
    spans:T[]|undefined,kind:'slur'|'hairpin'|'octave',notesOnly:boolean
  ):T[]|undefined=>{
   let previousStart=-1
   const ranges=spans?.flatMap(span=>{
    const from=eventLocations.get(span.startEventId),to=eventLocations.get(span.endEventId)
    if(!from||!to||(notesOnly&&(from.event.type!=='note'||to.event.type!=='note'))||
      from.part!==to.part||from.staff!==to.staff||from.voice!==to.voice||
      from.index>to.index||(from.index===to.index&&
        (from.event.position.tick>to.event.position.tick||
        (from.event.position.tick===to.event.position.tick&&(kind!=='octave'||span.startEventId!==span.endEventId)))))throw unsupported()
    // The serializer reads directions by starting measure. Reordering ranges
    // across source measures could change precedence for overlapping ramps.
    if(kind==='hairpin'&&from.index<previousStart)throw unsupported()
    previousStart=from.index
    const distance=to.index-from.index
    return plan.entries.flatMap((entry,occurrence)=>{
      if(entry.measureIndex!==from.index)return []
      // A copied start needs its complete original phrase, never a fabricated
      // endpoint or a connection across a repeat/volta jump.
      for(let step=0;step<=distance;step++){
        if(plan.entries[occurrence+step]?.measureIndex!==from.index+step)throw unsupported()
      }
      return [{occurrence,span:{...structuredClone(span),id:id(kind,occurrence,span.id),
        startEventId:id('event',occurrence,span.startEventId),
        endEventId:id('event',occurrence+distance,span.endEventId)}}]
    })
   })
   // XML directions are read in measure order. Interleave performed copies,
   // retaining the original range order within each start measure. Copies in
   // different completed traversals cannot overlap or change each other's ramp.
   return ranges?.sort((a,b)=>a.occurrence-b.occurrence).map(item=>item.span)
  }
  output.slurs=copiedRanges(score.slurs,'slur',true)
  output.hairpins=copiedRanges(score.hairpins,'hairpin',false)
  output.octaveShifts=copiedRanges(score.octaveShifts,'octave',true)

  if(score.pedalEvents?.length){
    const owners=new Map<string,string>(),pedals=new Map(score.pedalEvents.map(event=>[event.id,event]))
    if(pedals.size!==score.pedalEvents.length)throw unsupported()
    for(const event of score.pedalEvents){
      const part=score.parts.findIndex(part=>part.id===event.partId),staff=score.parts[part]?.staves.findIndex(staff=>staff.id===event.staffId)
      const at=measures.get(event.measureId),measure=part>=0&&staff!==undefined&&staff>=0?score.parts[part].staves[staff].measures[at?.index??-1]:undefined
      if(!at||!measure||at.part!==part||at.staff!==staff||!Number.isInteger(event.tick)||event.tick<0||event.tick>measureDurationTicks(measure)||
        !Number.isInteger(event.value)||event.value<0||event.value>127)throw unsupported()
      // Authored commands retain their individual staff. The instrument-level
      // synthetic reset uses its first authored staff only in this copied score.
      if(!owners.has(event.partId))owners.set(event.partId,event.staffId)
    }
    output.pedalEvents=createPerformedPedalPlan(score,plan).map(entry=>{
      const source=entry.sourceId?pedals.get(entry.sourceId):undefined,staffId=source?.staffId??owners.get(entry.partId)!
      const measure=score.parts.find(part=>part.id===entry.partId)!.staves.find(staff=>staff.id===staffId)!.measures[entry.measureIndex]
      return {id:id(source?'pedal':'pedal-reset',entry.occurrence,source?.id??entry.partId),partId:entry.partId,staffId,
        measureId:id('measure',entry.occurrence,measure.id),tick:source?.tick??0,value:entry.value}
    })
  }

  const ties=new Map(collectTiePairs(score).map(pair=>[pair.fromEventId,pair.toEventId]))
  for(const part of output.parts)for(const staff of part.staves){
    let startTick=0
    const previous=new Map<string,{event:VoiceEvent;endTick:number}>()
    for(const m of staff.measures){
      for(const voice of m.voices)for(const event of sortVoiceEvents(voice.events)){
        const before=previous.get(voice.id)
        if(before?.event.type==='note'&&event.type==='note'&&before.endTick===startTick+event.position.tick&&
          ties.get(eventSource.get(before.event.id)!)===eventSource.get(event.id)){
          before.event.ties={...before.event.ties,start:true};event.ties={...event.ties,stop:true}
        }
        previous.set(voice.id,{event,endTick:startTick+event.position.tick+voiceEventDurationTicks(event,m)})
      }
      startTick+=measureDurationTicks(m)
    }
  }

  const location=(reference:string)=>{
    const concrete=resolve(reference),found=concrete?measures.get(concrete):undefined
    if(!found||!concrete)throw unsupported()
    return{...found,concrete}
  }
  const targetMeasure=(reference:string,occurrence:number,global=false)=>{
    const at=location(reference)
    const ordinals=score.parts[0].staves[0].measures.flatMap((m,index)=>`measure-${m.number}`===reference?[index]:[])
    if(global&&ordinals.length){
      if(ordinals.length!==1||ordinals[0]!==at.index)throw unsupported()
      return `measure-${occurrence+1}`
    }
    // Ordinal global marks apply at every part's primary staff in MusicXML;
    // concrete references retain only their actual source owner.
    return measures.has(reference)?id('measure',occurrence,at.concrete):`measure-${occurrence+1}`
  }
  const mapped=<T extends {id:string;measureId:string}>(items:T[]|undefined,global=false):T[]|undefined=>items?.flatMap(item=>{
    const at=location(item.measureId)
    return plan.entries.flatMap((entry,occurrence)=>entry.measureIndex===at.index?[{...structuredClone(item),id:id('mark',occurrence,item.id),measureId:targetMeasure(item.measureId,occurrence,global)}]:[])
  })
  output.harmonies=mapped(score.harmonies);output.rehearsalMarks=mapped(score.rehearsalMarks,true)
  output.staffTexts=mapped(score.staffTexts);output.systemTexts=mapped(score.systemTexts,true)
  output.expressionTexts=mapped(score.expressionTexts);output.dynamics=mapped(score.dynamics)
  if(score.layout){
    const breaks=(refs:string[]|undefined)=>refs?.flatMap(ref=>{
      const at=location(ref);return plan.entries.flatMap((entry,occurrence)=>entry.measureIndex===at.index?[targetMeasure(ref,occurrence)]:[])
    })
    output.layout={...structuredClone(score.layout),systemBreakBeforeMeasureIds:breaks(score.layout.systemBreakBeforeMeasureIds),pageBreakBeforeMeasureIds:breaks(score.layout.pageBreakBeforeMeasureIds)}
  }

  const primary=score.parts[0].staves[0].measures,starts:number[]=[];let beat=0
  for(const m of primary){starts.push(beat);beat+=measureDurationTicks(m)/TICKS_PER_QUARTER}
  const sourceTempo=(score.tempoEvents??[]).map(event=>({event,at:location(event.measureId)}))
    .sort((a,b)=>a.at.index-b.at.index||a.event.tick-b.event.tick)
  const initial=score.tempo??{bpm:120,beatUnit:'quarter' as const};let active=quarterBpm(initial)
  const tempoEvents:TempoEvent[]=[]
  plan.entries.forEach((entry,occurrence,entries)=>{
    const events=sourceTempo.filter(t=>t.at.index===entry.measureIndex)
    const jumped=occurrence?entry.measureIndex!==entries[occurrence-1].measureIndex+1:entry.measureIndex!==0
    if(jumped&&!events.some(t=>t.event.tick===0)){
      let restored:TempoMarking=initial
      for(const item of sourceTempo){if(starts[item.at.index]+item.event.tick/TICKS_PER_QUARTER>starts[entry.measureIndex])break;restored=item.event}
      if(active!==quarterBpm(restored)){
        // Copy marking fields only: no source event ID/tick/owner leaks.
        const {bpm,beatUnit,dots,text,transparent}=restored
        tempoEvents.push({id:id('tempo-return',occurrence,'state'),measureId:output.parts[0].staves[0].measures[occurrence].id,tick:0,bpm,beatUnit,dots,text,transparent});active=quarterBpm(restored)
      }
    }
    for(const {event}of events){tempoEvents.push({...structuredClone(event),id:id('tempo',occurrence,event.id),measureId:targetMeasure(event.measureId,occurrence,true)});active=quarterBpm(event)}
  })
  output.tempoEvents=score.tempoEvents||tempoEvents.length?tempoEvents:undefined
  if(validateTieRelations(output).length)throw unsupported()
  return output
}
