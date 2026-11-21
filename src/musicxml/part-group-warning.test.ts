import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPartGroupFixture,stripPartGroups,type PartGroupFixtureKind} from '../testing/part-group-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented part-group '))
it.each(['named','default','nested','separate','stop-children'] as const)('reports only start group loss for %s while preserving existing parts and music',kind=>{
 const source=createPartGroupFixture(kind),result=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(stripPartGroups(source)),marks=notices(source),indices=kind==='nested'?[1,2]:kind==='separate'?[1,3]:[1]
 expect(marks.map(w=>w.path)).toEqual(indices.map(i=>`part-list.part-group[${i}]`));expect(marks.every(w=>w.code==='unsupported-notation'&&w.partNumber===undefined&&w.measureNumber===undefined)).toBe(true)
 expect(result.score).toEqual(control.score);expect(result.report.warnings).toHaveLength(indices.length)
 if(kind==='named'){expect(marks[0].message).toContain('Woodwinds');expect(marks[0].message).toContain('Ww.');expect(marks[0].message).toContain('bracket');expect(marks[0].message).toContain('yes')}
 if(kind==='default')expect(marks[0].message).toContain('"number":"1"')
 if(kind==='stop-children')expect(marks[0].message).not.toContain('Ignored stop text')
 const native=encodeNativeProject(createNativeProject(result.score)),copy=serializeMusicXml(result.score),midi=serializeMidi(control.score);expect(decodeNativeProject(native).score).toEqual(control.score);expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('<part-group');expect(notices(copy)).toEqual([]);expect(serializeMidi(result.score)).toEqual(midi);expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi);expect(source).toBe(createPartGroupFixture(kind))
 const dir=process.env.STUDIO_PART_GROUP_QA_DIR;if(kind==='named'&&dir){mkdirSync(dir,{recursive:true});for(const k of ['named','default','nested','separate','stop-children','none','grand']as PartGroupFixtureKind[]){const xml=createPartGroupFixture(k),score=parseMusicXmlWithReport(xml).score;for(const[name,value]of Object.entries({[k+'.musicxml']:xml,[k+'-expected.chromatics']:encodeNativeProject(createNativeProject(score)),[k+'-copy.musicxml']:serializeMusicXml(score),[k+'-expected.mid']:Buffer.from(serializeMidi(score))}))writeFileSync(join(dir,name),value,{flag:'wx'})}}
})
it.each(['none','grand'] as const)('does not mistake existing %s parts for explicit part-group loss',kind=>{
 const result=parseMusicXmlWithReport(createPartGroupFixture(kind));expect(result.report.warnings).toEqual([]);expect(notices(serializeMusicXml(result.score))).toEqual([]);if(kind==='grand')expect(result.score.parts[0].staves).toHaveLength(2)
})
