import { expect, it } from 'vitest'
import { createStaffUsageFixture } from '../testing/staff-usage-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const prefix='Unrepresented staff usage '
it.each(['alternate','cue','editorial','ossia','default-number','normalized','multiple','mixed'] as const)('reports %s usage loss without changing current music or other notices',kind=>{
 const xml=createStaffUsageFixture(kind),control=parseMusicXmlWithReport(xml.replace(/<staff-type>[\s\S]*?<\/staff-type>/g,'')),result=parseMusicXmlWithReport(xml),notices=result.report.warnings.filter(w=>w.message.startsWith(prefix))
 expect(notices).toHaveLength(kind==='multiple'?2:1)
 const number=kind==='normalized'?2:10
 expect(notices[0]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:number,path:`part[2].measure[${number}].attributes[1].staff-details[1].staff-type`})
 expect(notices[0].message).toContain('"staffNumber":"'+(kind==='default-number'?'1':'2')+'"')
 expect(notices[0].message).toContain('"staffType":"'+(['default-number','normalized','multiple','mixed'].includes(kind)?'alternate':kind)+'"')
 if(kind==='multiple') expect(notices[1]).toMatchObject({path:'part[2].measure[10].attributes[1].staff-details[2].staff-type',message:expect.stringContaining('"staffType":"cue"')})
 expect(result.report.warnings.filter(w=>!w.message.startsWith(prefix))).toEqual(control.report.warnings)
 expect(result.score).toEqual(control.score)
 expect(encodeNativeProject(createNativeProject(result.score))).toBe(encodeNativeProject(createNativeProject(control.score)))
 expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
 const copy=serializeMusicXml(result.score)
 expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('staff-type')
 expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control.score))
 expect(xml).toBe(createStaffUsageFixture(kind))
})
it.each(['regular','none'] as const)('does not invent non-default usage loss for %s',kind=>{expect(parseMusicXmlWithReport(createStaffUsageFixture(kind)).report.warnings.filter(w=>w.message.startsWith(prefix))).toEqual([])})
