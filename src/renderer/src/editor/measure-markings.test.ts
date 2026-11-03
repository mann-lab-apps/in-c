import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand, createNote, createScore, TICKS_PER_QUARTER } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline } from '../playback/timeline'
import { buildSingleMeasureTextClipboard, buildMeasureMarkingClipboard, buildMeasureMarkingPasteCommand, buildMeasureObjectDeleteCommand } from './measure-markings'

function fixture() {
  const score = createScore(), staff = score.parts[0].staves[0], first = staff.measures[0]
  first.voices[0].events = [createNote({ id:'first-note', pitch:{step:'C',octave:4}, duration:{value:'whole',dots:0} })]
  const second = structuredClone(first); second.id='target'; second.number=2; second.voices[0].events[0].id='target-note'
  staff.measures.push(second)
  const neighbor = structuredClone(first); neighbor.id='neighbor';neighbor.voices[0].events[0].id='neighbor-note'
  score.parts.push({...structuredClone(score.parts[0]),id:'neighbor-part',staves:[{...structuredClone(staff),id:'neighbor-staff',measures:[neighbor]}]})
  score.staffTexts=[{id:'source',measureId:first.id,text:'Source'}, {id:'target-text',measureId:second.id,text:'Old'}, {id:'neighbor-text',measureId:neighbor.id,text:'Neighbor'}]
  score.systemTexts=[{id:'system',measureId:second.id,text:'Keep system'}]
  score.expressionTexts=[{id:'expression',measureId:second.id,tick:0,text:'Keep expression'}]
  score.dynamics=[{id:'dynamic',measureId:second.id,value:'mf'}]
  score.slurs=[{id:'manual',startEventId:'first-note',endEventId:'target-note',engraving:{offsetX:0,height:3}}]
  return score
}

describe('measure marking clipboard', () => {
  it.each(['alias','concrete'] as const)('copies rehearsal marks through %s ownership without changing neighboring music or geometry',reference=>{
    const score=fixture(),first=score.parts[0].staves[0].measures[0]
    first.id='primary-first';score.staffTexts![0].measureId=first.id
    const neighbor=structuredClone(first);neighbor.id='rehearsal-neighbor';neighbor.number=3;neighbor.voices[0].events[0].id='rehearsal-neighbor-note';score.parts[0].staves[0].measures.push(neighbor)
    score.rehearsalMarks=[{id:'rehearsal-source',measureId:reference==='alias'?'measure-1':first.id,text:'Source R1'},
      {id:'rehearsal-source-two',measureId:first.id,text:'Source R2'},
      {id:'rehearsal-old',measureId:'target',text:'Old R1'},{id:'rehearsal-old-alias',measureId:'measure-2',text:'Old R2'},
      {id:'rehearsal-neighbor',measureId:neighbor.id,text:'Neighbor R'}]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,first.id,'rehearsal-marks')
    expect(clipboard).toBeDefined();expect(clipboard?.type).toBe('rehearsal-marks')
    if(clipboard?.type!=='rehearsal-marks')throw Error('Missing rehearsal clipboard')
    let sequence=0
    const command=buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>String(++sequence))!
    const result=applyScoreCommand(score,command),marks=result.score.rehearsalMarks!
    expect(sequence).toBe(2)
    expect(marks.filter(mark=>mark.measureId==='target').map(mark=>mark.text)).toEqual(['Source R1','Source R2'])
    expect(marks.some(mark=>mark.measureId==='measure-2')).toBe(false)
    expect(marks.slice(0,3)).toEqual([score.rehearsalMarks[0],score.rehearsalMarks[1],score.rehearsalMarks[4]])
    expect(marks.filter(mark=>mark.measureId==='target').every(mark=>!before.rehearsalMarks!.some(old=>old.id===mark.id))).toBe(true)
    expect({...result.score,rehearsalMarks:score.rehearsalMarks}).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
    expect(parseMusicXml(serializeMusicXml(result.score)).rehearsalMarks?.map(mark=>mark.text).sort()).toEqual(marks.map(mark=>mark.text).sort())
    const deleted=applyScoreCommand(score,buildMeasureObjectDeleteCommand(score,'target','rehearsal-marks')!)
    expect(deleted.score.rehearsalMarks).toEqual(score.rehearsalMarks.filter(mark=>!mark.id.startsWith('rehearsal-old')))
    expect(applyScoreCommand(deleted.score,deleted.undo).score).toEqual(before)
    const out=process.env.DDIRORI_REHEARSAL_CLIPBOARD_QA_DIR
    if(out&&reference==='alias'){mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(before)));writeFileSync(join(out,'source.mid'),serializeMidi(before))}
    score.rehearsalMarks[0].text='Later source edit'
    expect(clipboard.rehearsalMarks[0].text).toBe('Source R1')
  })

  it.each(['missing','ambiguous','other-part','other-staff'] as const)('rejects rehearsal paste to %s without allocating IDs',kind=>{
    const score=fixture(),first=score.parts[0].staves[0].measures[0]
    score.rehearsalMarks=[{id:'rehearsal-source',measureId:first.id,text:'A'}]
    const clipboard=buildMeasureMarkingClipboard(score,first.id,'rehearsal-marks')
    expect(clipboard).toBeDefined()
    if(!clipboard)throw Error('Missing rehearsal clipboard')
    if(kind==='ambiguous')score.parts[1].staves[0].measures[0].id='target'
    if(kind==='other-staff'){const staff=structuredClone(score.parts[0].staves[0]);staff.id='lower-staff';staff.measures=staff.measures.slice(0,1);staff.measures[0].id='lower-target';score.parts[0].staves.push(staff)}
    const before=structuredClone(score),target=kind==='missing'?'missing':kind==='other-part'?'neighbor':kind==='other-staff'?'lower-target':'target'
    expect(buildMeasureMarkingPasteCommand(score,target,clipboard,()=>{throw Error('No IDs for unsupported owner')})).toBeUndefined()
    expect(score).toEqual(before)
  })

  it.each(['dynamics','harmonies'] as const)('preserves %s paste history/native/XML and changes only its intended playback behavior',kind=>{
    const score=fixture(),first=score.parts[0].staves[0].measures[0].id
    score.dynamics=[{id:'dyn-source',measureId:first,value:'pp'},...score.dynamics!,{id:'dyn-neighbor',measureId:'neighbor',value:'ff'}]
    score.harmonies=[{id:'h-source-0',measureId:first,tick:0,text:'C7'},{id:'h-source-2',measureId:first,tick:26880,text:'G7'},
      {id:'h-old-target',measureId:'target',tick:0,text:'F'},{id:'h-neighbor',measureId:'neighbor',tick:0,text:'Dm'}]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,first,kind)!
    let id=0
    const result=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>String(++id))!)
    const family=kind==='dynamics'?'dynamics':'harmonies'
    expect({...result.score,[family]:score[family]}).toEqual(score)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    const reopened=parseMusicXml(serializeMusicXml(result.score))
    const target=reopened.parts[0].staves[0].measures[1].id
    if(kind==='harmonies'){
      expect(reopened.harmonies?.filter(h=>h.measureId===target).map(h=>[h.text,h.tick])).toEqual([['C7',0],['G7',26880]])
      expect(serializeMidi(result.score)).toEqual(serializeMidi(score))
    }else{
      expect(reopened.dynamics?.find(d=>d.measureId===target)?.value).toBe('pp')
      const a=createPlaybackTimeline(score).events,b=createPlaybackTimeline(result.score).events
      expect(b).toHaveLength(a.length)
      for(const event of b){
        const old=a.find(e=>e.eventId===event.eventId)!
        if(event.eventId==='target-note'){
          expect(event.velocityStart).toBeLessThan(old.velocityStart)
          expect({...event,velocityStart:old.velocityStart,velocityEnd:old.velocityEnd}).toEqual(old)
        }else expect(event).toEqual(old)
      }
      expect(serializeMidi(result.score)).not.toEqual(serializeMidi(score))
    }
    const out=process.env.DDIRORI_MARKING_FAMILY_QA_DIR
    if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'source.mid'),serializeMidi(score));writeFileSync(join(dir,'pasted.mid'),serializeMidi(result.score))
      if(kind==='harmonies'){
        const simultaneous=structuredClone(score);simultaneous.harmonies![1].tick=0
        const copy=buildMeasureMarkingClipboard(simultaneous,first,'harmonies')!
        const pasted=applyScoreCommand(simultaneous,buildMeasureMarkingPasteCommand(simultaneous,'target',copy,()=>String(++id))!).score
        expect(pasted.harmonies!.filter(h=>h.measureId==='target').map(h=>h.tick)).toEqual([0,0])
        const duplicateDir=join(out,'harmonies-same-tick');mkdirSync(duplicateDir,{recursive:true});writeFileSync(join(duplicateDir,'source.chromatics'),encodeNativeProject(createNativeProject(simultaneous)));writeFileSync(join(duplicateDir,'source.mid'),serializeMidi(simultaneous));writeFileSync(join(duplicateDir,'pasted.mid'),serializeMidi(pasted))
      }
    }
    expect(score).toEqual(before)
  })
  it('copies expression text positions as a snapshot and changes only the target family with exact undo/native/XML/MIDI', () => {
    const score=fixture(),first=score.parts[0].staves[0].measures[0].id
    score.expressionTexts=[{id:'expression-source-0',measureId:first,tick:0,text:'Source expression zero'},
      {id:'expression-source-2',measureId:first,tick:TICKS_PER_QUARTER*2,text:'Source expression two'},
      ...score.expressionTexts!,{id:'expression-neighbor',measureId:'neighbor',tick:0,text:'Neighbor expression'}]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,first,'expression-texts')!
    expect(clipboard?.type).toBe('expression-texts')
    let id=0
    const result=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>String(++id))!)
    const pasted=result.score.expressionTexts!.filter(t=>t.measureId==='target')
    expect(pasted).toEqual([{id:'expression-text-1',measureId:'target',tick:0,text:'Source expression zero'},
      {id:'expression-text-2',measureId:'target',tick:TICKS_PER_QUARTER*2,text:'Source expression two'}])
    expect({...result.score,expressionTexts:score.expressionTexts}).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    const deleted=applyScoreCommand(result.score,buildMeasureObjectDeleteCommand(result.score,'target','expression-texts')!)
    expect(deleted.score.expressionTexts).toEqual(result.score.expressionTexts!.filter(t=>t.measureId!=='target'))
    expect(applyScoreCommand(deleted.score,deleted.undo).score).toEqual(result.score)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    const reopened=parseMusicXml(serializeMusicXml(result.score))
    expect(reopened.expressionTexts?.map(t=>[t.text,t.tick])).toEqual(expect.arrayContaining([['Source expression two',TICKS_PER_QUARTER*2],['Neighbor expression',0]]))
    expect(serializeMidi(result.score)).toEqual(serializeMidi(score))
    const out=process.env.DDIRORI_EXPRESSION_MARKING_QA_DIR
    if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.mid'),serializeMidi(score))}
    score.expressionTexts[0].text='Edited later'
    expect(clipboard.type==='expression-texts'&&clipboard.expressionTexts[0].text).toBe('Source expression zero')
  })

  it('preserves a filled-text production fixture without changing its music', () => {
    const score=fixture(),before=serializeMidi(score),staff=score.parts[0].staves[0]
    for(const [index,measure] of staff.measures.entries()){
      const event=measure.voices[0].events[0]
      if(event.type==='note')event.lyrics=[{text:index?'이어':'같이'}]
    }
    score.harmonies=[{id:'paint-harmony',measureId:staff.measures[0].id,tick:0,text:'C7'}]
    expect(serializeMidi(score)).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    const out=process.env.DDIRORI_TEXT_PAINT_QA_DIR
    if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.mid'),serializeMidi(score))}
  })

  it.each(['harmonies','expression-texts'] as const)('rejects %s paste beyond the target pickup length without replacing its existing text', kind => {
    const score=fixture(),target=score.parts[0].staves[0].measures[1]
    target.timing={type:'pickup',durationTicks:TICKS_PER_QUARTER*2}
    target.voices[0].events=[createNote({id:'target-note',pitch:{step:'C',octave:4},duration:{value:'half',dots:0}})]
    score.harmonies=[{id:'late',measureId:score.parts[0].staves[0].measures[0].id,tick:TICKS_PER_QUARTER*3,text:'C7'}, {id:'target-chord',measureId:target.id,tick:0,text:'F'}]
    score.expressionTexts=[{id:'late-expression',measureId:score.parts[0].staves[0].measures[0].id,tick:TICKS_PER_QUARTER*3,text:'Late'},...score.expressionTexts!]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,score.parts[0].staves[0].measures[0].id,kind)!
    expect(buildMeasureMarkingPasteCommand(score,target.id,clipboard,()=>{throw Error('No IDs for out-of-bar positions')})).toBeUndefined()
    expect(score).toEqual(before)
  })

  it.each([0, TICKS_PER_QUARTER*2])('retains valid harmony anchor %i exactly through undo/native/XML', tick => {
    const score=fixture(),target=score.parts[0].staves[0].measures[1]
    target.timing={type:'pickup',durationTicks:TICKS_PER_QUARTER*2}
    target.voices[0].events=[createNote({id:'target-note',pitch:{step:'C',octave:4},duration:{value:'half',dots:0}})]
    score.harmonies=[{id:'source-harmony',measureId:score.parts[0].staves[0].measures[0].id,tick,text:'C7'}]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,score.parts[0].staves[0].measures[0].id,'harmonies')!
    const result=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,target.id,clipboard,()=> 'new-harmony')!)
    expect(result.score.harmonies?.find(h=>h.measureId===target.id)?.tick).toBe(tick)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    expect(parseMusicXml(serializeMusicXml(result.score)).harmonies?.map(h=>h.tick)).toEqual([tick,tick])
    expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
  })

  it.each(['alias','concrete'] as const)('copies system text %s ownership as a snapshot with target-only history/native/XML/MIDI', reference => {
    const score=fixture(),first=score.parts[0].staves[0].measures[0]
    first.id='primary-first';score.staffTexts![0].measureId=first.id
    const next=structuredClone(first);next.id='system-neighbor';next.number=3;next.voices[0].events[0].id='system-neighbor-note';score.parts[0].staves[0].measures.push(next)
    score.systemTexts=[
      {id:'system-source',measureId:reference==='alias'?'measure-1':first.id,text:'Source system'},
      {id:'system-source-two',measureId:first.id,text:'Source system second'},
      {id:'system-old',measureId:'target',text:'Old system'},
      {id:'system-old-alias',measureId:'measure-2',text:'Old system alias'},
      {id:'system-neighbor',measureId:'system-neighbor',text:'Neighbor system'}
    ]
    const before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,first.id,'system-texts')!
    expect(clipboard).toBeDefined();expect(clipboard.type).toBe('system-texts')
    let id=0;const result=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>String(++id))!)
    const texts=result.score.systemTexts!
    expect(texts.filter(t=>t.measureId==='target').map(t=>t.text)).toEqual(['Source system','Source system second'])
    expect(texts.some(t=>t.measureId==='measure-2')).toBe(false)
    expect(texts.slice(0,3)).toEqual([score.systemTexts[0],score.systemTexts[1],score.systemTexts[4]])
    expect({...result.score,systemTexts:score.systemTexts}).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    expect(serializeMidi(result.score)).toEqual(serializeMidi(score))
    const xml=serializeMusicXml(result.score),imported=parseMusicXml(xml)
    expect(imported.systemTexts?.map(t=>t.text).sort()).toEqual(texts.map(t=>t.text).sort())
    expect(imported.systemTexts?.some(t=>t.text.includes('Old system'))).toBe(false)
    const deleted=applyScoreCommand(score,buildMeasureObjectDeleteCommand(score,'target','system-texts')!)
    expect(deleted.score.systemTexts).toEqual(score.systemTexts.filter(t=>!t.id.startsWith('system-old')))
    expect(applyScoreCommand(deleted.score,deleted.undo).score).toEqual(before)
    const out=process.env.DDIRORI_SYSTEM_TEXT_CLIPBOARD_QA_DIR
    if(out&&reference==='alias'){
      mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.mid'),serializeMidi(score))
    }
    score.systemTexts[0].text='Later source edit'
    expect(clipboard.type==='system-texts'&&clipboard.systemTexts[0].text).toBe('Source system')
  })
  it.each(['missing','ambiguous','other-part','other-staff'] as const)('rejects system text paste to a %s owner without allocating IDs', kind => {
    const score=fixture();score.systemTexts=[{id:'system-source',measureId:score.parts[0].staves[0].measures[0].id,text:'Source'}]
    const clipboard=buildMeasureMarkingClipboard(score,score.parts[0].staves[0].measures[0].id,'system-texts')!
    if(kind==='ambiguous')score.parts[1].staves[0].measures[0].id='target'
    if(kind==='other-staff'){const lower=structuredClone(score.parts[0].staves[0]);lower.id='other-staff';lower.measures=lower.measures.slice(0,1);lower.measures[0].id='other-staff-target';score.parts[0].staves.push(lower)}
    const before=structuredClone(score)
    const target=kind==='missing'?'missing':kind==='other-part'?'neighbor':kind==='other-staff'?'other-staff-target':'target'
    expect(buildMeasureMarkingPasteCommand(score,target,clipboard,()=>{throw Error('No IDs for unsupported owner')})).toBeUndefined()
    expect(score).toEqual(before)
  })

  it('copies a snapshot, replaces only target staff text and preserves exact undo/native/XML/MIDI', () => {
    const score=fixture(),before=structuredClone(score),id=score.parts[0].staves[0].measures[0].id
    const out=process.env.DDIRORI_MEASURE_MARKING_QA_DIR
    if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.mid'),serializeMidi(score))}
    const clipboard=buildMeasureMarkingClipboard(score,id,'staff-texts')!
    expect(clipboard.type).toBe('staff-texts')
    let sequence=0
    const result=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>String(++sequence))!)
    expect(result.score.staffTexts).toEqual([score.staffTexts![0],score.staffTexts![2],{id:'staff-text-1',measureId:'target',text:'Source'}])
    expect({...result.score,staffTexts:score.staffTexts}).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
    const parsed=parseMusicXml(serializeMusicXml(result.score))
    expect(parsed.staffTexts?.map(t=>t.text)).toEqual(expect.arrayContaining(['Source','Neighbor']))
    expect(parsed.staffTexts?.some(t=>t.text==='Old')).toBe(false)
    score.staffTexts![0].text='Later edit'
    expect(clipboard.type==='staff-texts'&&clipboard.staffTexts[0].text).toBe('Source')
  })
  it('deletes only selected staff text and restores the original ID with one undo', () => {
    const score=fixture(),before=structuredClone(score)
    const result=applyScoreCommand(score,buildMeasureObjectDeleteCommand(score,'target','staff-texts')!)
    expect(result.score.staffTexts).toEqual(score.staffTexts!.filter(t=>t.measureId!=='target'))
    expect({...result.score,staffTexts:score.staffTexts}).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(buildMeasureObjectDeleteCommand(result.score,'target','staff-texts')).toBeUndefined()
  })
  it.each(['missing','ambiguous'] as const)('rejects a %s measure instead of altering another staff', kind => {
    const score=fixture(),before=structuredClone(score),clipboard=buildMeasureMarkingClipboard(score,'target','staff-texts')!
    const id=kind==='missing'?'unknown':'target'
    if(kind==='ambiguous')score.parts[1].staves[0].measures[0].id='target'
    const unchanged=structuredClone(score)
    expect(buildMeasureObjectDeleteCommand(score,id,'staff-texts')).toBeUndefined()
    expect(buildMeasureMarkingClipboard(score,id,'staff-texts')).toBeUndefined()
    expect(buildMeasureMarkingPasteCommand(score,id,clipboard,()=>{throw Error('No IDs for invalid target')})).toBeUndefined()
    expect(score).toEqual(unchanged)
    expect(before.parts[0]).toEqual(score.parts[0])
  })
  it('keeps dynamics/harmony family commands and source ownership independent', () => {
    const score=fixture(),bar=score.parts[0].staves[0].measures[0]
    score.harmonies=[{id:'harmony',measureId:'target',tick:0,text:'C7'}]
    for(const kind of ['dynamics','harmonies'] as const){
      const clipboard=buildMeasureMarkingClipboard(score,'target',kind)!
      const pasted=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,bar.id,clipboard,()=>kind)!)
      expect(pasted.score.staffTexts).toEqual(score.staffTexts)
      expect(applyScoreCommand(pasted.score,pasted.undo).score).toEqual(score)
    }
  })
})


it.each(['staffTexts','systemTexts','rehearsalMarks'] as const)('single text snapshot appends only the selected %s and keeps destination objects undoable',family=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0];first.id='primary-first';score.staffTexts![0].measureId=first.id
 score[family]=[{id:'copy-first',measureId:first.id,text:'First'},{id:'copy-second',measureId:family==='staffTexts'?first.id:'measure-1',text:'Second'},{id:'keep-target',measureId:'target',text:'Keep target'}]
 const clipboard=buildSingleMeasureTextClipboard(score,family,'copy-second')!;expect(clipboard).toBeDefined()
 score[family]![1].text='Later source edit';const before=structuredClone(score)
 const command=buildMeasureMarkingPasteCommand(score,'target',clipboard,()=> 'single-new')!;const result=applyScoreCommand(score,command)
 expect(result.score[family]!.slice(0,3)).toEqual(before[family]);expect(result.score[family]!.slice(3)).toEqual([{id:expect.any(String),measureId:'target',text:'Second'}])
 expect(result.score[family]![3].id).not.toBe('copy-second');expect({...result.score,[family]:before[family]}).toEqual(before)
 expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
 expect(serializeMidi(result.score)).toEqual(serializeMidi(before))
 expect(parseMusicXml(serializeMusicXml(result.score))[family]!.map(n=>n.text).sort()).toEqual(['First','Later source edit','Keep target','Second'].sort())
 const replacement=buildMeasureMarkingClipboard(before,first.id,clipboard.type)!
 let sequence=0;const replaced=applyScoreCommand(before,buildMeasureMarkingPasteCommand(before,'target',replacement,()=> 'replaced-'+(++sequence))!).score
 expect(replaced[family]!.some(n=>n.id==='keep-target')).toBe(false)
})

it.each(['staffTexts','systemTexts','rehearsalMarks'] as const)('single text %s rejects missing IDs and malformed multi-object insertion before allocating IDs',family=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0];score[family]=[{id:'single',measureId:first.id,text:'One'}]
 expect(buildSingleMeasureTextClipboard(score,family,'missing')).toBeUndefined()
 const clipboard=buildSingleMeasureTextClipboard(score,family,'single')!,createId=()=>{throw Error('Must reject before ID allocation')}
 const malformed={...clipboard,[family]:[...score[family]!,{...score[family]![0],id:'second'}]}
 expect(buildMeasureMarkingPasteCommand(score,'target',malformed,createId)).toBeUndefined()
 expect(buildMeasureMarkingPasteCommand(score,'missing',clipboard,createId)).toBeUndefined()
 if(family!=='staffTexts')expect(buildMeasureMarkingPasteCommand(score,'neighbor',clipboard,createId)).toBeUndefined()
})


it.each([0,TICKS_PER_QUARTER,4*TICKS_PER_QUARTER])('single expression snapshot appends at destination tick %s and preserves every neighbor',tick=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0].id
 score.expressionTexts=[{id:'copy-first',measureId:first,tick:0,text:'First'},{id:'copy-second',measureId:first,tick:TICKS_PER_QUARTER/2,text:'Second'},{id:'copy-third',measureId:first,tick:TICKS_PER_QUARTER/2,text:'Third'},...score.expressionTexts!]
 const clipboard=buildSingleMeasureTextClipboard(score,'expressionTexts','copy-second')!;expect(clipboard).toBeDefined()
 score.expressionTexts[1].text='Edited after copy';const before=structuredClone(score)
 const pasted=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',clipboard,()=> 'new-single',tick)!)
 expect(pasted.score.expressionTexts).toEqual([...before.expressionTexts!,{id:'expression-text-new-single',measureId:'target',tick,text:'Second'}]);expect({...pasted.score,expressionTexts:before.expressionTexts}).toEqual(before)
 expect(applyScoreCommand(pasted.score,pasted.undo).score).toEqual(before);expect(decodeNativeProject(encodeNativeProject(createNativeProject(pasted.score))).score).toEqual(pasted.score);expect(serializeMidi(pasted.score)).toEqual(serializeMidi(before))
 expect(parseMusicXml(serializeMusicXml(pasted.score)).expressionTexts).toEqual(expect.arrayContaining([expect.objectContaining({text:'Second',tick})]))
})
it.each([-1,.25,NaN,Infinity,TICKS_PER_QUARTER+1])('single expression rejects invalid pickup destination tick %s before ID allocation',tick=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0].id;score.expressionTexts!.push({id:'copy',measureId:first,tick:0,text:'Copy'})
 const clipboard=buildSingleMeasureTextClipboard(score,'expressionTexts','copy')!;expect(clipboard).toBeDefined();score.parts[0].staves[0].measures[1].timing={type:'pickup',durationTicks:TICKS_PER_QUARTER}
 const before=structuredClone(score);expect(buildMeasureMarkingPasteCommand(score,'target',clipboard,()=>{throw Error('No IDs before validation')},tick)).toBeUndefined();expect(score).toEqual(before)
})
it('single expression rejects ambiguous IDs/ownership and malformed single snapshots while legacy measure replacement stays unchanged',()=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0].id;score.expressionTexts!.push({id:'copy',measureId:first,tick:TICKS_PER_QUARTER/2,text:'Copy'})
 expect(buildSingleMeasureTextClipboard(score,'expressionTexts','missing')).toBeUndefined();const clipboard=buildSingleMeasureTextClipboard(score,'expressionTexts','copy')!;expect(clipboard).toBeDefined();if(clipboard.type!=='expression-texts')throw Error('Wrong family')
 const fail=()=>{throw Error('No ID allocation for rejected clipboard')};expect(buildMeasureMarkingPasteCommand(score,'missing',clipboard,fail)).toBeUndefined();expect(buildMeasureMarkingPasteCommand(score,'target',{...clipboard,expressionTexts:[...clipboard.expressionTexts,...clipboard.expressionTexts]},fail)).toBeUndefined()
 const legacy=buildMeasureMarkingClipboard(score,first,'expression-texts')!;const replaced=applyScoreCommand(score,buildMeasureMarkingPasteCommand(score,'target',legacy,()=> 'legacy',TICKS_PER_QUARTER)!).score;expect(replaced.expressionTexts!.filter(n=>n.measureId==='target')).toEqual([{id:'expression-text-legacy',measureId:'target',tick:TICKS_PER_QUARTER/2,text:'Copy'}])
 score.expressionTexts!.push({...score.expressionTexts!.at(-1)!});expect(buildSingleMeasureTextClipboard(score,'expressionTexts','copy')).toBeUndefined();score.expressionTexts!.pop();score.parts[1].staves[0].measures[0].id=first;expect(buildSingleMeasureTextClipboard(score,'expressionTexts','copy')).toBeUndefined();expect(buildMeasureMarkingPasteCommand(score,first,clipboard,fail)).toBeUndefined()
})

it.each([-1,.25,NaN,Infinity,4*TICKS_PER_QUARTER+1])('single expression rejects invalid source tick %s without changing source',tick=>{
 const score=fixture(),first=score.parts[0].staves[0].measures[0].id;score.expressionTexts!.push({id:'invalid-source',measureId:first,tick,text:'Invalid'});const before=structuredClone(score);expect(buildSingleMeasureTextClipboard(score,'expressionTexts','invalid-source')).toBeUndefined();expect(score).toEqual(before)
})
