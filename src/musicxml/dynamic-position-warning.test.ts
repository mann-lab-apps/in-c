import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createDynamicPositionFixture,dynamicPositionCases} from '../testing/dynamic-position-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
it.each(dynamicPositionCases)('diagnoses only lost dynamic scope at $id while retaining the measure projection',c=>{
 const source=createDynamicPositionFixture(c.id),control=parseMusicXmlWithReport(createDynamicPositionFixture()),result=parseMusicXmlWithReport(source)
 const lost=c.tick!==0||c.voice!==undefined
 const warnings=result.report.warnings.filter(w=>w.message.startsWith('Unrepresented dynamic scope '))
 expect(warnings).toHaveLength(lost?1:0)
 if(lost){
  expect(warnings[0]).toMatchObject({code:'unsupported-direction',partNumber:1,measureNumber:1,path:'part[1].measure[1].direction[1].direction-type[1].dynamics'})
  expect(warnings[0].message).toContain('position='+c.tick+' quarter-beats')
  if(c.offset!==undefined)expect(warnings[0].message).toContain('offset='+JSON.stringify(c.offset))
  if(c.voice!==undefined)expect(warnings[0].message).toContain('voice='+JSON.stringify(c.voice))
 }
 expect(result.score).toEqual(control.score)
 const native=encodeNativeProject(createNativeProject(result.score)),copy=serializeMusicXml(result.score),midi=serializeMidi(result.score)
 expect(decodeNativeProject(native).score).toEqual(control.score);expect(copy).toBe(serializeMusicXml(control.score));expect(midi).toEqual(serializeMidi(control.score))
 expect(parseMusicXmlWithReport(copy).report.warnings.filter(w=>w.message.startsWith('Unrepresented dynamic scope '))).toEqual([])
 const root=process.env.STUDIO_DYNAMIC_POSITION_QA_DIR
 if(root){const d=join(root,c.id);mkdirSync(d,{recursive:true});for(const[n,data]of[['source.musicxml',source],['project.chromatics',native],['copy.musicxml',copy],['current.mid',midi],['report.json',JSON.stringify(result.report,null,2)]]as const)writeFileSync(join(d,n),data)}
})
