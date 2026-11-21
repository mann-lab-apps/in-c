import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createMultipleRestFixture} from '../testing/multiple-rest-fixture'
import {parseMusicXml,parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../project/schema'
const warnings=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented multimeasure rest grouping '))
it.each([{count:4,symbols:'no'},{count:4,symbols:'yes'},{count:4,symbols:'omitted'},{count:1,symbols:'no'}]as const)('diagnoses grouping without merging bars or changing music %j',options=>{
 const xml=createMultipleRestFixture(options),plain=xml.replace(/<measure-style.*?<\/measure-style>/g,''),score=parseMusicXml(xml)
 expect(warnings(xml)).toEqual([expect.objectContaining({code:'unsupported-notation',partNumber:2,measureNumber:2,path:'part[2].measure[2].attributes[1].measure-style[1].multiple-rest',message:expect.stringContaining(`count="${options.count}"`)})])
 if(options.symbols==='omitted')expect(warnings(xml)[0].message).not.toContain('use-symbols=');else expect(warnings(xml)[0].message).toContain(`use-symbols="${options.symbols}"`)
 expect(warnings(xml)[0].message).toContain('staff="1"')
 expect(score).toEqual(parseMusicXml(plain));expect(score.parts.map(p=>p.staves[0].measures.length)).toEqual([5,5]);expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(parseMusicXml(plain)));expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXml(plain)))
 const native=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(serializeMidi(native.score)).toEqual(serializeMidi(score));const copy=serializeMusicXml(score);expect(copy).not.toMatch(/<multiple-rest(?:\s|>)/);expect(warnings(copy)).toEqual([]);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
 const dir=process.env.STUDIO_MULTIPLE_REST_QA_DIR;if(dir&&options.count===4&&options.symbols!=='omitted'){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,options.symbols+'.musicxml'),xml,{flag:'wx'});writeFileSync(join(dir,options.symbols+'-expected.chromatics'),encodeNativeProject(native),{flag:'wx'})}
})
it('does not warn on ordinary full-measure rests, including omitted type',()=>expect(warnings(createMultipleRestFixture({include:false}))).toEqual([]))
