import { expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createLyricFontFixture, createRepeatedLyricFontFixture, type LyricFontKind } from '../testing/lyric-font-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const kinds:LyricFontKind[]=['italic','bold','combined','fragmented','normalized','second-verse','default','normal','empty']
const fonts=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented lyric font-'))
const plain=(xml:string)=>xml.replace(/ font-style="[^"]*"| font-weight="[^"]*"/g,'')
it.each(kinds)('reports only real %s emphasis loss and preserves words/native/XML/MIDI',kind=>{
  const xml=createLyricFontFixture(kind),{score}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(plain(xml)).score,notices=fonts(xml)
  const expected=kind==='italic'||kind==='second-verse'?[['font-style',1]]:kind==='bold'?[['font-weight',1]]:kind==='combined'||kind==='normalized'?[['font-style',1],['font-weight',1]]:kind==='fragmented'?[['font-style',1],['font-weight',2]]:[]
  expect(notices).toHaveLength(expected.length)
  const verse=kind==='second-verse'?2:1
  expected.forEach(([field,index],i)=>{
    expect(notices[i]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:2,eventIndex:1,path:`part[2].measure[2].note[1].lyric[${verse}].text[${index}].@${field}`})
    expect(notices[i].message).toContain(`"number":"${verse}"`)
    expect(notices[i].message).toContain(`"textIndex":${index}`)
    expect(notices[i].message).toContain(`"value":"${field==='font-style'?'italic':'bold'}"`)
  })
  expect(score).toEqual(control);expect(serializeMidi(score)).toEqual(serializeMidi(control))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control)
  const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(control))
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control));expect(fonts(copy)).toEqual([])
  const dir=process.env.DDIRORI_LYRIC_FONT_QA_DIR
  if(dir){mkdirSync(dir,{recursive:true});for(const[name,text]of[['source.musicxml',xml],['copy.musicxml',copy],['native.chromatics',encodeNativeProject(createNativeProject(score))]])writeFileSync(join(dir,kind+'-'+name),text,{flag:'wx'})}
})
it('keeps an independent notehead loss and all repeated source paths',()=>{
  const mixed=createLyricFontFixture('italic').replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>')
  const report=parseMusicXmlWithReport(mixed).report
  expect(fonts(mixed)).toHaveLength(1);expect(report.warnings.some(w=>w.message.startsWith('Explicit notehead appearance '))).toBe(true)
  const many=createRepeatedLyricFontFixture(),notices=fonts(many)
  expect(notices).toHaveLength(30);expect(new Set(notices.map(w=>w.path)).size).toBe(30)
  expect(parseMusicXmlWithReport(many).score).toEqual(parseMusicXmlWithReport(plain(many)).score)
  const dir=process.env.DDIRORI_LYRIC_FONT_QA_DIR
  if(dir){mkdirSync(dir,{recursive:true});for(const[id,xml]of[['mixed',mixed],['many',many]]){writeFileSync(join(dir,id+'-source.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,id+'-copy.musicxml'),serializeMusicXml(parseMusicXmlWithReport(xml).score),{flag:'wx'})}}
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(kinds)('validates %s source/copy using complete offline pinned XSD',kind=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-lyric-font-xsd-'))
 try{const xml=createLyricFontFixture(kind);for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]){
  const path=join(dir,name+'.musicxml');writeFileSync(path,text)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),path],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
  expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})
