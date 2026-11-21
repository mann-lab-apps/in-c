import {expect,it} from 'vitest'
import {parseMusicXmlWithReport,parseMusicXml} from './parse'
import {serializeMusicXml} from './serialize'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../project/schema'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createInlineClefFixture as fixture} from '../testing/inline-clef-fixture'
it.each(['middle','end'])('warns about unpreserved %s clef position without claiming inline support',kind=>{
 const xml=fixture(kind),{score,report}=parseMusicXmlWithReport(xml)
 expect(report.warnings).toContainEqual(expect.objectContaining({code:'unsupported-notation',measureNumber:2,path:'part[1].measure[2].attributes[1].clef[1]'}))
 expect(report.warnings.find(w=>w.path.endsWith('.clef[1]'))?.message).toMatch(/위치.*보존/)
 expect(score).toEqual(parseMusicXml(xml))
 const native=createNativeProject(score),output=serializeMusicXml(score)
 expect(decodeNativeProject(encodeNativeProject(native)).score).toEqual(score)
 expect(serializeMidi(parseMusicXml(output))).toEqual(serializeMidi(score))
 const out=process.env.STUDIO_INLINE_CLEF_QA_DIR
 if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,`${kind}.musicxml`),xml);writeFileSync(join(out,`${kind}.chromatics`),encodeNativeProject(native))}
})
it.each(['start','backup'])('does not warn about a clef at musical tick zero: %s',kind=>{
 const {score,report}=parseMusicXmlWithReport(fixture(kind));expect(report.warnings.filter(w=>w.path.endsWith('.clef[1]'))).toEqual([]);expect(score.parts[0].staves[0].measures[1].clef).toMatchObject({sign:'F',line:4})
})
