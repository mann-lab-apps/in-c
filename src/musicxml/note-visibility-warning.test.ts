import { expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNoteVisibilityFixture, createRepeatedNoteVisibilityFixture } from '../testing/note-visibility-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const cases=[
  {id:'main',owner:'main'}, {id:'chord',owner:'chord'}, {id:'grace',owner:'grace'}, {id:'rest',owner:'rest'},
  {id:'whitespace',owner:'main',printObject:' no '}, {id:'no-spacing',owner:'main',printSpacing:'no'},
  {id:'rest-no-spacing',owner:'rest',printSpacing:'no',printLeger:'no'}
] as const
const visibility = (xml:string) => parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented note visibility '))
it.each(cases)('reports hidden $id at its source note without changing music/native/MIDI',options=>{
 const xml=createNoteVisibilityFixture({...options,partCount:2,targetPart:2,targetMeasure:2})
 const plain=xml.replace(/ print-object="[^"]*"| print-spacing="[^"]*"| print-leger="[^"]*"/g,'')
 const score=parseMusicXml(xml),index=options.owner==='chord'?2:1,warnings=visibility(xml)
 expect(warnings).toEqual([expect.objectContaining({code:'unsupported-notation',partNumber:2,measureNumber:2,eventIndex:index,path:`part[2].measure[2].note[${index}].@print-object`,message:expect.stringContaining('"printObject":"no"')})])
 if('printSpacing' in options)expect(warnings[0].message).toContain('"printSpacing":"no"')
 expect(score).toEqual(parseMusicXml(plain));expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXml(plain)))
 const native=decodeNativeProject(encodeNativeProject(createNativeProject(score))),copy=serializeMusicXml(score)
 expect(native.score).toEqual(score);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
 expect(copy).not.toMatch(/<note[^>]*print-object=/)
 const dir=process.env.DDIRORI_NOTE_VISIBILITY_QA_DIR
 if(dir){mkdirSync(dir,{recursive:true});for(const[name,text]of[['source.musicxml',xml],['copy.musicxml',copy],['expected.chromatics',encodeNativeProject(native)]] as const)writeFileSync(join(dir,options.id+'-'+name),text,{flag:'wx'})}
})
it.each(['main','chord','grace','rest'] as const)('does not warn for omitted/default-visible %s',owner=>{
 const visible=createNoteVisibilityFixture({owner,printObject:'yes',printSpacing:'no'})
 expect(visibility(visible)).toEqual([]);expect(visibility(visible.replace(' print-object="yes"',''))).toEqual([])
})
it('keeps independent notehead loss alongside hidden whole-note appearance',()=>{
 const xml=createNoteVisibilityFixture({value:'whole'}).replace('<type>whole</type>','<type>whole</type><notehead>none</notehead>')
 const report=parseMusicXmlWithReport(xml).report
 expect(visibility(xml)).toHaveLength(1);expect(report.warnings.some(w=>w.message.startsWith('Explicit notehead appearance '))).toBe(true)
})
const schema=resolve('src/musicxml/schema/musicxml-4.0'),available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.skipIf(!available).each(cases)('validates actual hidden $id source/copy against complete offline MusicXML4 XSD',options=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-hidden-note-xsd-'))
 try{const xml=createNoteVisibilityFixture({...options,partCount:2,targetPart:2,targetMeasure:2});for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXml(xml))]]) {
  const path=join(dir,name+'.musicxml');writeFileSync(path,text)
  const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),path],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
  expect(result.status,result.stderr).toBe(0)
 }}finally{rmSync(dir,{recursive:true,force:true})}
})

it('retains every hidden-note source path in a larger generated document',()=>{
 const xml=createRepeatedNoteVisibilityFixture(30),notices=visibility(xml)
 expect(notices).toHaveLength(30);expect(new Set(notices.map(w=>w.path)).size).toBe(30)
 expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(parseMusicXml(xml.replaceAll(' print-object="no"',''))))
 const dir=process.env.DDIRORI_NOTE_VISIBILITY_QA_DIR
 if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'many-source.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,'many-copy.musicxml'),serializeMusicXml(parseMusicXml(xml)),{flag:'wx'})}
})
