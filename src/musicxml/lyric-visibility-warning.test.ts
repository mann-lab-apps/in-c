import { expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createLyricVisibilityFixture, createRepeatedLyricVisibilityFixture, type LyricVisibilityKind } from '../testing/lyric-visibility-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix='Unrepresented lyric visibility '
const cases: {kind:LyricVisibilityKind; hidden:number[]}[] = [
  {kind:'verse-hidden',hidden:[1,2]}, {kind:'note-lyrics-hidden',hidden:[1,2]},
  {kind:'note-hidden',hidden:[1,2]}, {kind:'mixed-verses',hidden:[2]},
  {kind:'verse-hidden-override',hidden:[1,2]}, {kind:'padded-token',hidden:[1,2]}, {kind:'verse-visible-override',hidden:[]},
  {kind:'note-visible-override',hidden:[]}, {kind:'note-print-lyric-override',hidden:[]},
  {kind:'default',hidden:[]}, {kind:'explicit-visible',hidden:[]}, {kind:'no-lyrics',hidden:[]}
]
const available=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
const schema=resolve('src/musicxml/schema/musicxml-4.0')

it.each(cases)('diagnoses only effective hidden text for $kind and preserves music/native/copy',({kind,hidden})=>{
  const xml=createLyricVisibilityFixture(kind)
  const plain=xml.replace(/ print-object="[^"]*"| print-lyric="[^"]*"/g,'')
  const {score,report}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(plain).score
  const notices=report.warnings.filter(w=>w.message.startsWith(prefix))
  expect(notices).toHaveLength(hidden.length)
  for(const[index,lyricIndex] of hidden.entries()) {
    expect(notices[index]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:2,eventIndex:1,
      path:`part[2].measure[2].note[1].lyric[${lyricIndex}]`})
    expect(notices[index].message).toContain(`"lyricIndex":${lyricIndex}`)
    expect(notices[index].message).toContain(`"number":"${lyricIndex}"`)
    expect(notices[index].message).toContain('"effectivePrintObject":"no"')
    const attributePath = ['verse-hidden','verse-hidden-override','padded-token'].includes(kind)
      ? `part[2].measure[2].note[1].lyric[${lyricIndex}].@print-object`
      : kind==='note-hidden' ? 'part[2].measure[2].note[1].@print-object' : 'part[2].measure[2].note[1].@print-lyric'
    expect(notices[index].message).toContain(JSON.stringify(attributePath))
  }
  if(kind==='note-hidden'||kind==='note-visible-override'||kind==='note-print-lyric-override') {
    expect(report.warnings.filter(w=>w.message.startsWith('Unrepresented note visibility '))).toHaveLength(1)
  }
  expect(score).toEqual(control)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control)
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  const copy=serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control))
  expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(score))
  expect(parseMusicXmlWithReport(copy).report.warnings.filter(w=>w.message.startsWith(prefix))).toEqual([])
  expect(copy).not.toMatch(/print-lyric=|<lyric[^>]*print-object=/)
  const dir=process.env.DDIRORI_LYRIC_VISIBILITY_QA_DIR
  if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,kind+'-source.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,kind+'-copy.musicxml'),copy,{flag:'wx'});writeFileSync(join(dir,kind+'-native.chromatics'),encodeNativeProject(createNativeProject(score)),{flag:'wx'})}
})

it.skipIf(!available).each(cases)('validates $kind source/copy using complete offline pinned MusicXML4 XSD',({kind})=>{
  const dir=mkdtempSync(join(tmpdir(),'studio-lyric-visibility-xsd-'))
  try {
    const xml=createLyricVisibilityFixture(kind)
    for(const[name,text]of[['source',xml],['copy',serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file=join(dir,name+'.musicxml');writeFileSync(file,text)
      const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{
        encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}
      })
      expect(result.status,result.stderr).toBe(0)
    }
  } finally {rmSync(dir,{recursive:true,force:true})}
})

it('keeps every repeated hidden verse and distinct source identity',()=>{
  const xml=createRepeatedLyricVisibilityFixture(),{score,report}=parseMusicXmlWithReport(xml)
  const notices=report.warnings.filter(w=>w.message.startsWith(prefix))
  expect(notices).toHaveLength(30)
  expect(new Set(notices.map(w=>w.path)).size).toBe(30)
  expect(score.parts[1].staves[0].measures[1].voices[0].events[0]).toMatchObject({lyrics:[{number:1,text:'첫 절'},{number:2,text:'둘째 절'}]})
  expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXmlWithReport(xml.replaceAll(' print-object="no"','')).score))
  const dir=process.env.DDIRORI_LYRIC_VISIBILITY_QA_DIR
  if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'many-source.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,'many-copy.musicxml'),serializeMusicXml(score),{flag:'wx'})}
})
