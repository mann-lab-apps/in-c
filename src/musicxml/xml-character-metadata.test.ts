import { expect,it } from 'vitest'
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve,join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createXmlCharacterMetadataFixture,xmlCharacterMetadataCases } from '../testing/xml-character-metadata-fixture'
import { parseMusicXmlWithReport,serializeMusicXml } from './index'
import { createNativeProject,encodeNativeProject,decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it.each(xmlCharacterMetadataCases)('preserves $id scalar meaning through the shared XML reference policy',kind=>{
 const source=createXmlCharacterMetadataFixture(kind),{score,report}=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(createXmlCharacterMetadataFixture(kind,true))
 expect(score).toEqual(control.score);expect(report).toEqual(control.report);expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control.score)
 const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(control.score));expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(xmlCharacterMetadataCases)('validates $id source/scalar/copy with complete offline XSD',kind=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-character-metadata-xsd-'))
 try{const source=createXmlCharacterMetadataFixture(kind);for(const[name,xml]of[['source',source],['scalar',createXmlCharacterMetadataFixture(kind,true)],['copy',serializeMusicXml(parseMusicXmlWithReport(source).score)]]){
  const file=join(dir,name+'.musicxml');writeFileSync(file,xml);const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})
