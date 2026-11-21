import { expect, it } from 'vitest'
import { createWordsComponentsFixture, stripWordsComponentDirections } from '../testing/words-components-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented words components '))
it.each(['styled','plain','positioned','multiple','normalized'] as const)('reports the actual lost %s words containers without changing the existing music or guessing text joins',kind=>{
 const source=createWordsComponentsFixture(kind),result=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(stripWordsComponentDirections(source)),marks=notices(source)
 expect(marks.map(w=>w.path)).toEqual(kind==='multiple'?['part[1].measure[3].direction[1].direction-type[1].words','part[2].measure[2].direction[1].direction-type[1].words','part[2].measure[2].direction[2].direction-type[1].words']:['part[2].measure[2].direction[1].direction-type[1].words'])
 expect(marks.map(w=>[w.partNumber,w.measureNumber])).toEqual(kind==='multiple'?[[1,3],[2,2],[2,2]]:[[2,2]])
 expect(marks.every(w=>w.code==='unsupported-direction'&&w.message.includes('count=2'))).toBe(true)
 expect(result.score).toEqual(control.score);expect(result.score.staffTexts).toBeUndefined();expect(result.score.expressionTexts).toBeUndefined()
 const copy=serializeMusicXml(result.score);expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('molto');expect(notices(copy)).toEqual([])
 const native=decodeNativeProject(encodeNativeProject(createNativeProject(result.score)));expect(native.score).toEqual(result.score);expect(serializeMidi(native.score)).toEqual(serializeMidi(control.score));expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control.score));expect(source).toBe(createWordsComponentsFixture(kind))
})
it.each(['single','separate','none'] as const)('retains the existing %s text contract without inventing a component warning',kind=>{
 const source=createWordsComponentsFixture(kind),result=parseMusicXmlWithReport(source);expect(notices(source)).toEqual([])
 if(kind==='single')expect(result.score.expressionTexts?.map(t=>t.text)).toEqual(['dolce'])
 if(kind==='separate')expect(result.score.staffTexts?.map(t=>t.text)).toEqual(['molto','dolce'])
 if(kind==='none')expect(result.score.staffTexts).toBeUndefined()
 expect(notices(serializeMusicXml(result.score))).toEqual([])
})
it('does not invent text loss for an empty component group, but still reports a nonempty neighbour',()=>{
 const source=createWordsComponentsFixture('plain'),empty=source.replace('<words>molto</words><words>dolce</words>','<words/><words> </words>'),one=source.replace('<words>molto</words>','<words/>')
 expect(notices(empty)).toEqual([]);expect(notices(one)).toHaveLength(1);expect(parseMusicXmlWithReport(empty).score.staffTexts).toBeUndefined()
})
it('keeps the separate existing symbol diagnostic rather than swallowing or duplicating it',()=>{
 const source=createWordsComponentsFixture('plain').replace('</words><words>','</words><symbol>coda</symbol><words>'),all=parseMusicXmlWithReport(source).report.warnings
 expect(notices(source)).toHaveLength(1);expect(all.filter(w=>w.message==='symbol direction is not imported yet.')).toHaveLength(1);expect(all).toHaveLength(2)
})
