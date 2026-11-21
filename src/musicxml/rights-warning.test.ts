import {expect,it} from 'vitest'
import {createRightsFixture} from '../testing/rights-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {expandScoreRepeatsForMusicXml} from './expand-repeats'
const cases=[{kind:'root-single',paths:['identification.rights[1]']},{kind:'root-multi',paths:['identification.rights[1]','identification.rights[2]']},{kind:'root-custom',paths:['identification.rights[1]']},{kind:'credit',paths:['credit[3].credit-words[1]']},{kind:'credit-multi',paths:['credit[3].credit-words[1]','credit[3].credit-words[2]']},{kind:'mixed',paths:['identification.rights[1]','identification.rights[2]','credit[3].credit-words[1]']}] as const
it.each(cases)('reports $kind source rights occurrences without claiming they survived the score/native/copy',({kind,paths})=>{
 const xml=createRightsFixture(kind),{score,report}=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(createRightsFixture('control')).score
 expect(report.warnings.map(w=>w.path)).toEqual(paths)
 expect(report.warnings.every(w=>w.code==='unsupported-notation'&&w.partNumber===undefined&&w.measureNumber===undefined&&w.message.startsWith('Unrepresented rights notice '))).toBe(true)
 if(kind.startsWith('credit'))expect(report.warnings.every(w=>w.message.includes('page="2"'))).toBe(true)
 expect(score).toEqual(control);const native=encodeNativeProject(createNativeProject(score)),midi=serializeMidi(control);expect(decodeNativeProject(native).score).toEqual(control)
 for(const value of[score,expandScoreRepeatsForMusicXml(score)]){const copy=serializeMusicXml(value),parsed=parseMusicXmlWithReport(copy);expect(copy).not.toContain('<rights');expect(copy).not.toContain('<credit-type>rights');expect(parsed.report.warnings).toEqual([]);expect(serializeMidi(parsed.score)).toEqual(midi)}
 expect(serializeMidi(score)).toEqual(midi);expect(xml).toBe(createRightsFixture(kind))
})
it.each(['control','empty','body-control']as const)('does not invent a notice for %s',kind=>{
 const result=parseMusicXmlWithReport(createRightsFixture(kind));expect(result.report.warnings).toEqual([]);expect(()=>createNativeProject(result.score)).not.toThrow()
 if(kind==='body-control')expect(result.score.staffTexts?.some(t=>t.text.includes('© Studio QA'))).toBe(true)
})
