import { expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { createExpressionPositionFixture, expressionPositionCases } from '../testing/expression-position-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

it.each(expressionPositionCases)('preserves the source musical cursor and divisions for expression text: %s', kind => {
  const f = createExpressionPositionFixture(kind), original = f.xml
  const result = parseMusicXmlWithReport(f.xml), expression = result.score.expressionTexts!
  expect(expression).toHaveLength(1)
  expect(expression[0]).toMatchObject({ tick: f.tick, text: f.text, measureId: 'measure-7' })
  expect(result.report.warnings).toEqual([])
  const withoutText = parseMusicXml(f.xml.replace(/<direction\b[\s\S]*?<\/direction>/g, ''))
  expect({ ...result.score, expressionTexts: undefined }).toEqual(withoutText)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(withoutText))
  expect(createPlaybackTimeline(result.score)).toEqual(createPlaybackTimeline(withoutText))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
  const copy = parseMusicXml(serializeMusicXml(result.score))
  expect(copy.expressionTexts?.map(t => ({ tick: t.tick, text: t.text }))).toEqual([{tick:f.tick,text:f.text}])
  expect(serializeMidi(copy)).toEqual(serializeMidi(result.score))
  const expanded = parseMusicXml(serializeMusicXml(expandScoreRepeatsForMusicXml(result.score)))
  expect(expanded.expressionTexts?.map(t => ({ tick: t.tick, text: t.text }))).toEqual(Array.from({length:kind==='repeat-mid'?2:1},()=>({tick:f.tick,text:f.text})))
  expect(f.xml).toBe(original)
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates expression timing source and both XML modes against pinned MusicXML XSD', () => {
  const schema=resolve('src/musicxml/schema/musicxml-4.0'),manifest=JSON.parse(readFileSync(join(schema,'SOURCE.json'),'utf8'))
  for(const file of manifest.files)expect(createHash('sha256').update(readFileSync(join(schema,file.file))).digest('hex')).toBe(file.sha256)
  const dir=mkdtempSync(join(tmpdir(),'studio-expression-position-xsd-'))
  try{for(const kind of expressionPositionCases){const f=createExpressionPositionFixture(kind),score=parseMusicXml(f.xml)
    for(const [mode,text] of [['source',f.xml],['copy',serializeMusicXml(score)],['expanded',serializeMusicXml(expandScoreRepeatsForMusicXml(score))]]){
      const file=join(dir,`${kind}-${mode}.musicxml`);writeFileSync(file,text)
      const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file],{encoding:'utf8',timeout:10000,env:{...process.env,XML_CATALOG_FILES:join(schema,'catalog.xml')}})
      expect(result.status,result.stderr).toBe(0)
    }
  }}finally{rmSync(dir,{recursive:true})}
})
