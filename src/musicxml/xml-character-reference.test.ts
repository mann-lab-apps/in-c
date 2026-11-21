import { expect,it } from 'vitest'
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve,join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createXmlCharacterFixture,xmlCharacterCases } from '../testing/xml-character-reference-fixture'
import { parseMusicXmlWithReport,serializeMusicXml } from './index'
import { createNativeProject,encodeNativeProject,decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it.each(xmlCharacterCases)('interprets valid $id references once and preserves scalar/native/XML/MIDI meaning',example=>{
 const source=createXmlCharacterFixture(example),control=createXmlCharacterFixture(example,true),{score,report}=parseMusicXmlWithReport(source),expected=parseMusicXmlWithReport(control).score
 expect(score).toEqual(expected)
 expect(score.parts[1].staves[0].measures[1].voices[0].events[0]).toMatchObject({type:'note',lyrics:[{number:1,text:example.expected},{number:2,text:'둘째 절'}]})
 expect(report.warnings).toEqual(parseMusicXmlWithReport(control).report.warnings)
 expect(serializeMidi(score)).toEqual(serializeMidi(expected))
 const native=encodeNativeProject(createNativeProject(score));expect(decodeNativeProject(native).score).toEqual(expected)
 const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(expected));expect(parseMusicXmlWithReport(copy).score).toEqual(expected)
 // Existing native literal-reference strings remain literal through XML copies.
 const literal=xmlCharacterCases.find(c=>c.id==='escaped-literal')!,literalScore=parseMusicXmlWithReport(createXmlCharacterFixture(literal,true)).score
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(literalScore))).score).toEqual(literalScore)
 expect(parseMusicXmlWithReport(serializeMusicXml(literalScore)).score).toEqual(literalScore)
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(xmlCharacterCases)('validates $id source/scalar against pinned offline full XSD',example=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-character-xsd-'))
 try{for(const[name,xml]of[['source',createXmlCharacterFixture(example)],['scalar',createXmlCharacterFixture(example,true)]]){
  const file=join(dir,name+'.musicxml');writeFileSync(file,xml)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})
