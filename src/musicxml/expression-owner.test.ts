import { expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { createExpressionOwnerFixture } from '../testing/expression-owner-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

it.each(['grand-staff','ensemble'] as const)('keeps filtered direction identity, concrete ownership and source cursor for %s',kind=>{
  const {xml,expected}=createExpressionOwnerFixture(kind),parsed=parseMusicXmlWithReport(xml),score=parsed.score
  expect(parsed.report.warnings).toEqual([])
  for(const candidate of [score,parseMusicXml(serializeMusicXml(score)),parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(score)))]){
    expect(candidate.expressionTexts).toHaveLength(expected.length)
    expect(new Set(candidate.expressionTexts!.map(t=>t.id)).size).toBe(expected.length)
    for(const owner of expected){
      const measure=candidate.parts.find(p=>p.id===owner.partId)!.staves[owner.staff-1].measures[0]
      expect(candidate.expressionTexts!.filter(t=>t.measureId===measure.id)).toEqual([expect.objectContaining({tick:owner.tick,text:'dolce'})])
    }
    expect(serializeMidi(candidate)).toEqual(serializeMidi(score))
  }
  const withoutText=parseMusicXml(xml.replace(/<direction\b[\s\S]*?<\/direction>/g,''))
  expect({...score,expressionTexts:undefined}).toEqual(withoutText)
  expect(serializeMidi(score)).toEqual(serializeMidi(withoutText))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
})

it.skipIf(spawnSync('xmllint',['--version']).status!==0)('validates all ownership source and both output modes with pinned MusicXML XSD',()=>{
 const schema=resolve('src/musicxml/schema/musicxml-4.0'),manifest=JSON.parse(readFileSync(join(schema,'SOURCE.json'),'utf8'))
 for(const file of manifest.files)expect(createHash('sha256').update(readFileSync(join(schema,file.file))).digest('hex')).toBe(file.sha256)
 const dir=mkdtempSync(join(tmpdir(),'studio-expression-owner-xsd-'))
 try{for(const kind of ['grand-staff','ensemble'] as const){const {xml}=createExpressionOwnerFixture(kind),score=parseMusicXml(xml)
  for(const [mode,text] of [['source',xml],['copy',serializeMusicXml(score)],['expanded',serializeMusicXml(expandScoreRepeatsForMusicXml(score))]]){
   const file=join(dir,kind+'-'+mode+'.musicxml');writeFileSync(file,text)
   const checked=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',timeout:10000,env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
   expect(checked.status,checked.stderr).toBe(0)
  }
 }}finally{rmSync(dir,{recursive:true})}
})
