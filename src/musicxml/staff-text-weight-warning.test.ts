import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createStaffTextWeightFixture,type StaffTextWeightKind} from '../testing/staff-text-weight-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'

const notice=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented staff text font-weight '))
it.each(['bold','below-bold','normalized'] as const)('reports single staff text bold loss for %s without changing music or text',kind=>{
 const source=createStaffTextWeightFixture(kind),plain=source.replace(' font-weight="bold"',''),result=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(plain),marks=notice(source)
 expect(marks).toHaveLength(1)
 expect(marks[0]).toMatchObject({code:'unsupported-direction',partNumber:2,measureNumber:2,path:'part[2].measure[2].direction[1].direction-type[1].words.@font-weight',message:expect.stringContaining('"bold"')})
 expect(result.score).toEqual(control.score);expect(result.score.staffTexts?.map(t=>t.text)).toEqual(['dolce']);expect(result.report.warnings.filter(w=>!w.message.startsWith('Unrepresented staff text font-weight '))).toHaveLength(kind==='normalized'?1:0)
 const native=encodeNativeProject(createNativeProject(result.score)),copy=serializeMusicXml(result.score),midi=serializeMidi(control.score)
 expect(decodeNativeProject(native).score).toEqual(control.score);expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('font-weight="bold"');expect(copy).toContain('dolce');expect(notice(copy)).toEqual([]);expect(serializeMidi(result.score)).toEqual(midi);expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi);expect(source).toBe(createStaffTextWeightFixture(kind))
})
it.each(['plain','normal','system','expression','tempo','empty','components'] as const)('does not claim unsupported staff bold for %s',kind=>{
 const source=createStaffTextWeightFixture(kind),result=parseMusicXmlWithReport(source);expect(notice(source)).toEqual([])
 if(kind==='system'){expect(result.score.systemTexts?.map(t=>t.text)).toEqual(['dolce']);expect(serializeMusicXml(result.score)).toContain('font-weight="bold"')}
 if(kind==='expression')expect(result.score.expressionTexts?.map(t=>t.text)).toEqual(['dolce'])
 if(kind==='tempo')expect(result.score.tempoEvents?.some(t=>t.bpm===90)||result.score.tempo?.bpm===90).toBe(true)
 if(kind==='components')expect(result.report.warnings.filter(w=>w.message.startsWith('Unrepresented words components '))).toHaveLength(1)
})
it('writes optional generated audit artifacts from the same parser contract',()=>{
 const dir=process.env.STUDIO_STAFF_TEXT_WEIGHT_QA_DIR;if(!dir)return;mkdirSync(dir,{recursive:true})
 const kinds:StaffTextWeightKind[]=['bold','below-bold','normalized','plain','normal','system','expression','tempo','empty','components']
 for(const kind of kinds){const source=createStaffTextWeightFixture(kind),result=parseMusicXmlWithReport(source),project=createNativeProject(result.score)
  for(const[name,value]of Object.entries({[kind+'.musicxml']:source,[kind+'-expected.chromatics']:encodeNativeProject(project),[kind+'-copy.musicxml']:serializeMusicXml(result.score),[kind+'-expected.mid']:Buffer.from(serializeMidi(result.score))}))writeFileSync(join(dir,name),value,{flag:'wx'})
 }
})
