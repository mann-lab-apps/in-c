import {it,expect} from 'vitest'
import {createCreditContentFixture,type CreditContentKind} from '../testing/credit-content-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
const cases:CreditContentKind[]=['subtitle','dedication','lyricist','untyped','page2','fragments','symbol','symbols','title-only','composer-only','default-title-collision']
it.each(cases)('reports each lost %s source page component without changing music/native/copy',kind=>{
 const xml=createCreditContentFixture(kind),r=parseMusicXmlWithReport(xml),plain=parseMusicXmlWithReport(xml.replace(/<credit\b[\s\S]*?<\/credit>/g,''))
 const count=kind==='fragments'||kind==='symbols'?2:1
 expect(r.report.warnings).toHaveLength(count)
 expect(r.report.warnings.every(w=>w.code==='unsupported-notation'&&w.partNumber===undefined&&w.measureNumber===undefined&&w.message.startsWith('Unrepresented credit content '))).toBe(true)
 const node=kind==='symbol'||kind==='symbols'?'credit-symbol':'credit-words'
 expect(r.report.warnings.map(w=>w.path)).toEqual(Array.from({length:count},(_,i)=>`credit[1].${node}[${i+1}]`))
 if(['page2','fragments','symbol'].includes(kind))expect(r.report.warnings.every(w=>w.message.includes('page="2"'))).toBe(true)
 expect(r.score).toEqual(plain.score);expect(serializeMidi(r.score)).toEqual(serializeMidi(plain.score))
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(r.score))).score).toEqual(r.score)
 const copy=serializeMusicXml(r.score);expect(parseMusicXmlWithReport(copy).score).toEqual(r.score);expect(parseMusicXmlWithReport(copy).report.warnings).toEqual([])
 expect(xml).toBe(createCreditContentFixture(kind))
})
it.each(['none','title-control','composer-control','empty','body']as const)('keeps %s quiet without inventing missing credit content',kind=>{const r=parseMusicXmlWithReport(createCreditContentFixture(kind));expect(r.report.warnings).toEqual([]);if(kind==='body')expect(r.score.staffTexts?.some(x=>x.text==='본문 글자는 유지')).toBe(true)})
it('keeps existing rights notice and separately reports a music symbol',()=>{const r=parseMusicXmlWithReport(createCreditContentFixture('rights-symbol'));expect(r.report.warnings).toHaveLength(2);expect(r.report.warnings.map(w=>w.path)).toEqual(['credit[1].credit-words[1]','credit[1].credit-symbol[1]']);expect(r.report.warnings[0].message).toContain('Unrepresented rights notice ');expect(r.report.warnings[1].message).toContain('Unrepresented credit content ')})
it('keeps existing image diagnostic without source fetching or misclassifying it as words',()=>{const r=parseMusicXmlWithReport(createCreditContentFixture('image-mixed'));expect(r.report.warnings).toHaveLength(2);expect(r.report.warnings[0].message).toContain('Unrepresented credit image ');expect(r.report.warnings[1].path).toBe('credit[2].credit-words[1]');expect(JSON.stringify(r.report.warnings)).not.toContain('never-fetch.svg')})
it('retains each repeated source path and page',()=>{const r=parseMusicXmlWithReport(createCreditContentFixture('many'));expect(r.report.warnings).toHaveLength(30);expect(new Set(r.report.warnings.map(w=>w.path)).size).toBe(30);expect(r.report.warnings[1].message).toContain('page="2"')})

// D found an invalid empty-symbol control that parser-only tests could not
// distinguish from valid MusicXML. Freeze normative source/copy validity too.
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {spawnSync} from 'node:child_process'
const creditSchema=resolve('src/musicxml/schema/musicxml-4.0')
const xsdAvailable=spawnSync('xmllint',['--version'],{encoding:'utf8'}).status===0
const normativeCases:CreditContentKind[]=['subtitle','dedication','lyricist','untyped','page2','fragments','symbol','symbols','title-only','composer-only','default-title-collision','title-control','composer-control','empty','body','none','rights-symbol','image-mixed','many','mixed']
it.skipIf(!xsdAvailable).each(normativeCases)('keeps %s fixture and normalized copy valid under full offline XSD',kind=>{
 const dir=mkdtempSync(join(tmpdir(),'studio-credit-content-'))
 try{
  const source=createCreditContentFixture(kind),copy=serializeMusicXml(parseMusicXmlWithReport(source).score)
  for(const [name,text]of [['source',source],['copy',copy]]){
   const file=join(dir,name+'.musicxml');writeFileSync(file,text)
   const result=spawnSync('xmllint',['--nonet','--noout','--schema',join(creditSchema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:join(creditSchema,'catalog.xml')}})
   expect(result.status,result.stderr).toBe(0)
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
})
