import { expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createMixedWarningReportFixture } from '../testing/mixed-warning-report-fixture'
import { createRepeatedLyricFontFixture } from '../testing/lyric-font-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it('retains all mixed warning identities without modifying the represented music/native/copy',()=>{
 const xml=createMixedWarningReportFixture(),{score,report}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(createRepeatedLyricFontFixture()).score
 expect(report.warnings).toHaveLength(31);expect(new Set(report.warnings.map(w=>w.path)).size).toBe(31)
 expect(report.warnings.filter(w=>w.message.startsWith('Unrepresented lyric font-'))).toHaveLength(30)
 expect(report.warnings[0]).toMatchObject({code:'unsupported-direction',message:'other-direction direction is not imported yet.',path:'part[1].measure[1].direction[1].direction-type[1].other-direction'})
 expect(score).toEqual(control);expect(serializeMidi(score)).toEqual(serializeMidi(control));expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control)
 const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(control));expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(score))
 const dir=process.env.DDIRORI_REPORT_SCROLL_QA_DIR
 if(dir){mkdirSync(dir,{recursive:true});for(const[name,text]of[['source.musicxml',xml],['copy.musicxml',copy],['native.chromatics',encodeNativeProject(createNativeProject(score))],['warnings.json',JSON.stringify(report,null,2)]])writeFileSync(join(dir,name),text,{flag:'wx'})}
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available)('validates actual mixed source/copy with complete offline pinned XSD',()=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-mixed-report-xsd-'))
 try{const xml=createMixedWarningReportFixture();for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]){
  const file=join(dir,name+'.musicxml');writeFileSync(file,text);const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
  expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})
