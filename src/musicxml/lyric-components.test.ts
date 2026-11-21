import { expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createLyricComponentsFixture, lyricComponentCases } from '../testing/lyric-components-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(lyricComponentCases)('preserves $id text without invented or removed word boundaries',example=>{
  const xml=createLyricComponentsFixture(example),scalar=createLyricComponentsFixture(example,true)
  const {score}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(scalar).score
  const event=score.parts[1].staves[0].measures[1].voices[0].events[0]
  expect(event).toMatchObject({type:'note',lyrics:[{number:1,syllabic:'single',text:example.expected},{number:2,syllabic:'single',text:'둘째 절'}]})
  expect(score).toEqual(control)
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  const native=encodeNativeProject(createNativeProject(score)),copy=serializeMusicXml(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  expect(parseMusicXmlWithReport(copy).score).toEqual(score)
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control))
  const dir=process.env.DDIRORI_LYRIC_COMPONENTS_QA_DIR
  if(dir){mkdirSync(dir,{recursive:true});for(const[name,text]of[['source.musicxml',xml],['scalar.musicxml',scalar],['copy.musicxml',copy],['native.chromatics',native]])writeFileSync(join(dir,example.id+'-'+name),text,{flag:'wx'})}
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(lyricComponentCases)('validates $id source/copy with complete offline pinned XSD',example=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-lyric-components-xsd-'))
 try{const xml=createLyricComponentsFixture(example);for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]){
  const path=join(dir,name+'.musicxml');writeFileSync(path,text)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),path],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
  expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})
