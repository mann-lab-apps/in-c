import { expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { XMLParser } from 'fast-xml-parser'
import { createScore, type HarmonyMark } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { parseMusicXml, serializeMusicXml } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const schema=resolve('src/musicxml/schema/musicxml-4.0')
const available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
const cases:HarmonyMark[]=[
  {id:'plain',measureId:'measure-1',tick:0,text:'C7'},
  {id:'minor',measureId:'measure-1',tick:0,text:'Dm'},
  {id:'structured',measureId:'measure-1',tick:0,text:'Cmaj7/G',root:{step:'C'},kind:'major-seventh',bass:{step:'G'}},
  {id:'altered',measureId:'measure-1',tick:0,text:'Bb7/F#'}
]
it.each(cases)('emits a real root and standard kind value for $id without changing text/tick/native/MIDI',harmony=>{
  const score=createScore({harmonies:[harmony]}),native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(score)
  const xml=serializeMusicXml(score),node=new XMLParser({ignoreAttributes:false}).parse(xml)['score-partwise'].part.measure.harmony
  expect(node.root).toBeDefined()
  expect(node.kind['@_value']).toBeUndefined()
  expect(node.kind['#text']).toBe(harmony.kind??(harmony.text==='Dm'?'minor':'dominant'))
  const reopened=parseMusicXml(xml)
  expect(reopened.harmonies?.[0]).toMatchObject({text:harmony.text,tick:harmony.tick,kind:node.kind['#text']})
  if(harmony.root)expect(reopened.harmonies?.[0]?.root).toEqual(harmony.root)
  if(harmony.bass)expect(reopened.harmonies?.[0]?.bass).toEqual(harmony.bass)
  expect(serializeMidi(reopened)).toEqual(midi)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
it.skipIf(!available).each(cases)('validates $id against the complete offline W3C4 XSD',harmony=>{
  const dir=mkdtempSync(join(tmpdir(),'studio-harmony-xsd-')),path=join(dir,'score.musicxml')
  try{writeFileSync(path,serializeMusicXml(createScore({harmonies:[harmony]})));const r=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),path],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}});expect(r.status,r.stderr).toBe(0)}
  finally{rmSync(dir,{recursive:true,force:true})}
})

it.each([
  {id:'opaque',measureId:'measure-1',tick:0,text:'Unspecified analysis'},
  {id:'custom-kind',measureId:'measure-1',tick:0,text:'C',root:{step:'C' as const},kind:'custom-kind'}
])('does not invent or silently discard unsupported harmony structure for $id',harmony=>{
  const score=createScore({harmonies:[harmony]}),before=encodeNativeProject(createNativeProject(score))
  expect(()=>serializeMusicXml(score)).toThrow('화음 구조를 MusicXML로 보존할 수 없습니다')
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})

it('keeps reading legacy kind value attributes while writing standard kind content',()=>{
  const xml=serializeMusicXml(createScore({harmonies:[cases[2]]}))
  const legacy=xml.replace('<kind text="Cmaj7/G">major-seventh</kind>','<kind text="Cmaj7/G" value="major-seventh">Cmaj7/G</kind>')
  expect(legacy).not.toBe(xml)
  expect(parseMusicXml(legacy).harmonies?.[0]).toMatchObject({text:'Cmaj7/G',kind:'major-seventh',root:{step:'C'},bass:{step:'G'}})
})
