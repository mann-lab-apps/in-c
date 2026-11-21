import { expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyScoreCommand } from '../../../score-core'
import { createGlobalMeasureResolver } from '../../../score-core/measure-reference'
import { createPracticeLoopFixture } from '../../../testing/practice-loop-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { buildInsertMeasureAfter, buildInsertMeasureBefore, buildRemoveMeasure } from './measure-management'

it.each(([ [10,30,70], [70,10,30] ] as const).flatMap(numbers=>
  (['before','after','remove-first','remove-anchor'] as const).map(action=>({numbers,action}))))('keeps surviving global anchors through $action on authored $numbers numbering',({numbers,action})=>{
  const score=createPracticeLoopFixture()
  for(const part of score.parts)for(const staff of part.staves)staff.measures.forEach((m,i)=>{m.number=numbers[i]})
  const primary=score.parts[0].staves[0].measures,anchorId=primary[1].id,alias='measure-'+numbers[1]
  score.tempoEvents=[{id:'kept-tempo',measureId:alias,tick:0,bpm:80}]
  score.rehearsalMarks=[{id:'kept-rehearsal',measureId:alias,text:'B'}]
  score.systemTexts=[{id:'kept-system',measureId:alias,text:'같은 음악 위치'}]
  // Native permits ordinal aliases for global marks, but layout breaks require concrete IDs.
  score.layout={systemBreakBeforeMeasureIds:[anchorId],pageBreakBeforeMeasureIds:[anchorId]}
  const before=structuredClone(score);expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  const selected=score.parts[1].staves[0].measures[action==='remove-first'?0:1].id
  let id=0;const ids=(kind:'event'|'measure')=>'alias-'+kind+'-'+(++id)
  const edit=action==='before'?buildInsertMeasureBefore(score,selected,ids):action==='after'?buildInsertMeasureAfter(score,selected,ids):buildRemoveMeasure(score,selected)
  expect(edit).toBeDefined();const applied=applyScoreCommand(score,edit!.command),result=applied.score,removed=action==='remove-anchor'
  const target=action==='before'?'measure-3':action==='after'?'measure-2':'measure-1'
  const resolver=createGlobalMeasureResolver(result)
  for(const key of ['tempoEvents','rehearsalMarks','systemTexts'] as const){
    expect(result[key]?.map(m=>m.measureId)).toEqual(removed?[]:[target])
    if(!removed)expect(resolver(result[key]![0].measureId)).toBe(anchorId)
  }
  expect(result.layout?.systemBreakBeforeMeasureIds).toEqual(removed?[]:[anchorId])
  expect(result.layout?.pageBreakBeforeMeasureIds).toEqual(removed?[]:[anchorId])
  const physical=structuredClone(result)
  physical.tempoEvents=removed?[]:before.tempoEvents!.map(m=>({...m,measureId:anchorId}))
  physical.rehearsalMarks=removed?[]:before.rehearsalMarks!.map(m=>({...m,measureId:anchorId}))
  physical.systemTexts=removed?[]:before.systemTexts!.map(m=>({...m,measureId:anchorId}))
  physical.layout={systemBreakBeforeMeasureIds:removed?[]:[anchorId],pageBreakBeforeMeasureIds:removed?[]:[anchorId]}
  expect(serializeMidi(result)).toEqual(serializeMidi(physical))
  const xml=serializeMusicXml(result)
  // Existing XML contract: ordinal global marks project into every part;
  // concrete references retain their owner. Byte equality to the playback
  // control would incorrectly demand removing the other parts' directions.
  const root=new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise']
  const array=<T,>(value:T|T[]|undefined):T[]=>value===undefined?[]:Array.isArray(value)?value:[value]
  for(const part of array(root.part)){
    const measures=array(part.measure)
    const positions=(kind:'tempo'|'rehearsal'|'system')=>measures.flatMap((m,i)=>{
      const found=array(m.direction).some((d:any)=>kind==='tempo'?Number(d.sound?.['@_tempo'])===80:
        array(d['direction-type']).some((t:any)=>kind==='rehearsal'?t.rehearsal==='B':(t.words?.['#text']??t.words)==='같은 음악 위치'))
      return found?[i]:[]
    })
    const expected=removed?[]:[Number(target.slice('measure-'.length))-1]
    expect(positions('tempo')).toEqual(expected);expect(positions('rehearsal')).toEqual(expected);expect(positions('system')).toEqual(expected)
  }
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(result))
  const native=decodeNativeProject(encodeNativeProject(createNativeProject(result)));expect(native.score).toEqual(result)
  expect(applyScoreCommand(result,applied.undo).score).toEqual(before)
  expect(applyScoreCommand(applyScoreCommand(result,applied.undo).score,edit!.command).score).toEqual(result)
  expect(score).toEqual(before)
  const output=process.env.STUDIO_STRUCTURAL_ALIAS_QA_DIR
  if(output){
    mkdirSync(output,{recursive:true});const prefix=join(output,action+'-'+numbers.join('-'))
    writeFileSync(prefix+'-source.musicxml',serializeMusicXml(before),{flag:'wx'})
    writeFileSync(prefix+'-result.musicxml',xml,{flag:'wx'})
    writeFileSync(prefix+'-source.chromatics',encodeNativeProject(createNativeProject(before)),{flag:'wx'})
    writeFileSync(prefix+'-result.chromatics',encodeNativeProject(native),{flag:'wx'})
    writeFileSync(prefix+'-result.mid',serializeMidi(result),{flag:'wx'})
  }
})
