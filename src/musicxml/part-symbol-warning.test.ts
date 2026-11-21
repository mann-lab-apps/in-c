import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPartSymbolFixture,partSymbolFixtureKinds,stripPartSymbols} from '../testing/part-symbol-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented part-symbol '))
it.each(['bracket','line','square','none','partial','top-only','bottom-only','later'] as const)('reports %s unsupported part symbol once without changing existing staves or music',kind=>{
 const source=createPartSymbolFixture(kind),result=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(stripPartSymbols(source)),marks=notices(source),number=kind==='later'?2:1
 expect(marks).toHaveLength(1)
 expect(marks[0]).toMatchObject({code:'unsupported-notation',partNumber:1,measureNumber:number,path:'part[1].measure['+number+'].attributes[1].part-symbol'})
 expect(marks[0].eventIndex).toBeUndefined()
 expect(result.report.warnings).toHaveLength(1)
 expect(marks[0].message).toContain('"symbol":"'+(['partial','top-only','bottom-only','later'].includes(kind)?'brace':kind)+'"')
 if(['partial','top-only','bottom-only','later'].includes(kind)){
  expect(marks[0].message).toContain('"staffCount":3')
  expect(marks[0].message).toContain('"topStaff":"'+(kind==='top-only'?2:1)+'"')
  expect(marks[0].message).toContain('"bottomStaff":"'+(kind==='top-only'?3:2)+'"')
 }
 expect(result.score).toEqual(control.score)
 const native=encodeNativeProject(createNativeProject(result.score)),copy=serializeMusicXml(result.score),midi=serializeMidi(control.score)
 expect(decodeNativeProject(native).score).toEqual(control.score);expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('<part-symbol');expect(notices(copy)).toEqual([]);expect(serializeMidi(result.score)).toEqual(midi);expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi);expect(source).toBe(createPartSymbolFixture(kind))
 const dir=process.env.STUDIO_PART_SYMBOL_QA_DIR
 if(kind==='bracket'&&dir){mkdirSync(dir,{recursive:true});for(const k of partSymbolFixtureKinds){const xml=createPartSymbolFixture(k),score=parseMusicXmlWithReport(xml).score;for(const[name,value]of Object.entries({[k+'.musicxml']:xml,[k+'-expected.chromatics']:encodeNativeProject(createNativeProject(score)),[k+'-copy.musicxml']:serializeMusicXml(score),[k+'-expected.mid']:Buffer.from(serializeMidi(score))}))writeFileSync(join(dir,name),value,{flag:'wx'})}}
})
it.each(['plain','brace','full-bounds'] as const)('does not invent source grouping loss for the default %s control',kind=>{
 const result=parseMusicXmlWithReport(createPartSymbolFixture(kind));expect(result.report.warnings).toEqual([]);expect(result.score.parts[0].staves).toHaveLength(2);expect(notices(serializeMusicXml(result.score))).toEqual([])
})
