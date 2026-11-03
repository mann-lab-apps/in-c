import { expect, it } from 'vitest'
import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSoundDynamicsFixture,type SoundDynamicsCase } from '../testing/sound-dynamics-fixture'
import { parseMusicXml,parseMusicXmlWithReport } from './parse'
import { createNativeProject,encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { serializeMusicXml } from './serialize'

it.each(['direct','direction','symbolic','secondary','combined']as SoundDynamicsCase[])('warns about explicit sound dynamics in %s without changing notation or playback',kind=>{
 const {xml}=createSoundDynamicsFixture(kind),baseline=parseMusicXml(xml.replace(/ dynamics="20"/g,'')),{score,report}=parseMusicXmlWithReport(xml)
 expect(score).toEqual(baseline);expect(serializeMidi(score)).toEqual(serializeMidi(baseline));expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline))
 expect(report.warnings).toHaveLength(1);expect(report.warnings[0]).toMatchObject({code:'unsupported-direction',measureNumber:1,path:`part[${kind==='secondary'?2:1}].measure[1].${kind==='direction'||kind==='symbolic'?'direction[1].sound':'sound[1]'}.dynamics`});expect(report.warnings[0].message).toContain('Explicit sound dynamics');expect(report.warnings[0].message).toContain('20')
 const dir=process.env.DDIRORI_SOUND_DYNAMICS_QA_DIR
 if(dir){const target=join(dir,kind);mkdirSync(target,{recursive:true});writeFileSync(join(target,'source.musicxml'),xml);writeFileSync(join(target,'expected.chromatics'),encodeNativeProject(createNativeProject(baseline)));writeFileSync(join(target,'expected.mid'),serializeMidi(baseline));writeFileSync(join(target,'warnings.json'),JSON.stringify(report,null,2))}
})
it.each(['0','12.5','100'])('keeps explicit dynamics %s diagnosed without inferring a symbolic marking',value=>{
 const {xml}=createSoundDynamicsFixture('direct',value),{score,report}=parseMusicXmlWithReport(xml)
 expect(score.dynamics).toBeUndefined();expect(report.warnings).toHaveLength(1);expect(report.warnings[0].message).toContain(`(${value}%`)
})
it('retains source indexes for multiple direct sound values',()=>{
 const {xml}=createSoundDynamicsFixture('direct');const {report}=parseMusicXmlWithReport(xml.replace('</measure>','<sound dynamics="0"/></measure>'))
 expect(report.warnings.map(w=>w.path)).toEqual(['part[1].measure[1].sound[1].dynamics','part[1].measure[1].sound[2].dynamics'])
})
