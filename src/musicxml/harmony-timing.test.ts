import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseMusicXml, serializeMusicXml } from './index'
import { TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const q=TICKS_PER_QUARTER
const note=(duration:number,voice=1)=>`<note><pitch><step>C</step><octave>${voice===1?4:3}</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>${voice===1?'quarter':'whole'}</type></note>`
const code=(offset:number)=>`<harmony><root><root-step>C</root-step></root><kind text="C7">dominant</kind><offset>${offset}</offset></harmony>`
const bar=(divisions:number,body:string,number=1,attributes=true)=>`<measure number="${number}">${attributes?`<attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:''}${body}</measure>`
const xml=(bars:string)=>`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Harmony source timing</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${bars}</part></score-partwise>`
const quarters=(divisions:number)=>note(divisions).repeat(4)
const cases=[
  {kind:'low-divisions',source:xml(bar(480,code(480)+quarters(480))),ticks:[q]},
  {kind:'relative-cursor',source:xml(bar(1,note(1)+code(1)+note(1).repeat(3))),ticks:[q*2]},
  {kind:'fractional-offset',source:xml(bar(1,code(0.5)+quarters(1))),ticks:[q/2]},
  {kind:'voice-backup',source:xml(bar(1,quarters(1)+'<backup><duration>4</duration></backup>'+note(4,2)+code(-1))),ticks:[q*3]},
  {kind:'inherited-divisions',source:xml(bar(480,code(480)+quarters(480))+bar(480,note(480)+code(240)+note(480).repeat(3),2,false)),ticks:[q,q*1.5]},
  {kind:'lower-staff',source:xml('<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>'+quarters(1).replaceAll('</type>','</type><staff>1</staff>')+'<backup><duration>4</duration></backup>'+note(1).replace('<octave>4','<octave>3').replace('<voice>1','<voice>5').replace('</type>','</type><staff>2</staff>')+code(0).replace('</harmony>','<staff>2</staff></harmony>')+note(1).repeat(3).replaceAll('<octave>4','<octave>3').replaceAll('<voice>1','<voice>5').replaceAll('</type>','</type><staff>2</staff>')+'</measure>'),ticks:[q]}
]
const schema=resolve('src/musicxml/schema/musicxml-4.0')
const available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
it.each(cases)('reads source divisions and current cursor for harmony $kind',({kind,source,ticks})=>{
  const score=parseMusicXml(source)
  expect(score.harmonies?.map(h=>h.tick)).toEqual(ticks)
  expect(score.harmonies?.map(h=>h.text)).toEqual(ticks.map(()=> 'C7'))
  if(kind==='lower-staff')expect(score.harmonies?.[0].measureId).toBe(score.parts[0].staves[1].measures[0].id)
  const native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(score)
  const reopened=parseMusicXml(serializeMusicXml(score))
  expect(reopened.harmonies?.map(h=>h.tick)).toEqual(ticks)
  expect(serializeMidi(reopened)).toEqual(midi)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  const out=process.env.DDIRORI_HARMONY_TIMING_QA_DIR
  if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),source);writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.mid'),midi)}
})
it.each([-1,0.00001])('rejects a harmony onset outside the representable nonnegative tick domain: %s',offset=>{
  expect(()=>parseMusicXml(xml(bar(1,code(offset)+quarters(1))))).toThrow('MusicXML harmony offset을 유효한 tick으로 변환할 수 없습니다.')
})
it.skipIf(!available).each(cases)('validates foreign input $kind against the pinned complete XSD',({source})=>{
  const dir=mkdtempSync(join(tmpdir(),'studio-harmony-time-')),file=join(dir,'input.musicxml')
  try{writeFileSync(file,source);const r=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(r.status,r.stderr).toBe(0)}
  finally{rmSync(dir,{recursive:true,force:true})}
})
