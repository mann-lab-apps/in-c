import { expect, it } from 'vitest'
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve,join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createLyricElisionFixture,lyricElisionCases,plainLyricElisionControl } from '../testing/lyric-elision-fixture'
import { parseMusicXmlWithReport,serializeMusicXml } from './index'
import { createNativeProject,encodeNativeProject,decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented lyric elision '))
it.each(lyricElisionCases)('reports explicit $id symbol loss without changing existing plain lyrics/native/MIDI',example=>{
 const xml=createLyricElisionFixture(example),controlXml=plainLyricElisionControl(xml),{score}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(controlXml).score,found=notices(xml),verse=example.id==='second-verse'?2:1
 expect(found).toHaveLength(example.values.length)
 example.values.forEach((value,i)=>{
  const path='part[2].measure[2].note[1].lyric['+verse+'].elision['+(i+1)+']'+(example.id==='smufl'?'.@smufl':'')
  expect(found[i]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:2,eventIndex:1,path})
  // Numeric references now carry their XML character value. The separate
  // escaped-reference case must retain its literal reference spelling,
  // proving diagnostics do not decode a second time.
  expect(found[i].message).toContain(JSON.stringify(value));expect(found[i].message).toContain('"number":"'+verse+'"')
 })
 expect(score).toEqual(control);expect(serializeMidi(score)).toEqual(serializeMidi(control))
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control)
 const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(control));expect(notices(copy)).toEqual([])
 expect(parseMusicXmlWithReport(copy).score).toEqual(control)
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(lyricElisionCases)('validates $id source/copy against complete offline pinned XSD',example=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-elision-xsd-'))
 try{const xml=createLyricElisionFixture(example);for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]){
  const file=join(dir,name+'.musicxml');writeFileSync(file,text)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})

const sparseElisionSource = () => createLyricElisionFixture(lyricElisionCases.find(example=>example.id==='multiple')!).replace('<elision>_</elision>','<elision/>')
const sparseExpectedControl = () => sparseElisionSource().replace('<elision>‿</elision>','<elision/>')
it('keeps middle text when normalizing a default followed by an explicit elision',()=>{
 const source=sparseElisionSource(),control=plainLyricElisionControl(source)
 expect(control).toBe(sparseExpectedControl())
 expect(parseMusicXmlWithReport(control).score).toEqual(parseMusicXmlWithReport(source).score)
})
it('keeps sparse source index two and all syllables/native/MIDI independently of the control helper',()=>{
 const source=sparseElisionSource(),{score}=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(sparseExpectedControl()).score
 expect(notices(source)).toHaveLength(1);expect(notices(source)[0]).toMatchObject({path:'part[2].measure[2].note[1].lyric[1].elision[2]'})
 expect(score.parts[1].staves[0].measures[1].voices[0].events[0]).toMatchObject({type:'note',lyrics:[{number:1,text:'한 둘 셋'},{number:2,text:'둘째 절'}]})
 expect(score).toEqual(control);expect(serializeMidi(score)).toEqual(serializeMidi(control));expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control)
})
it.skipIf(!available)('validates sparse source, independently expected control and re-export with pinned full XSD',()=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-sparse-elision-xsd-'))
 try{const source=sparseElisionSource(),control=sparseExpectedControl(),copy=serializeMusicXml(parseMusicXmlWithReport(source).score)
 for(const[name,text]of[['source',source],['control',control],['copy',copy]]){
  const file=join(dir,name+'.musicxml');writeFileSync(file,text)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(result.status,result.stderr).toBe(0)
 }
 }finally{rmSync(dir,{recursive:true,force:true})}
})
