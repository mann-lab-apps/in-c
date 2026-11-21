import {expect,it} from 'vitest'
import {createMeasureNumberAppearanceFixture} from '../testing/measure-number-appearance-fixture'
import {parseMusicXml,parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
const warnings=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented measure number'))
it.each(['text','none','system','measure']as const)('reports original %s display data while preserving numeric identity and music',kind=>{
 const xml=createMeasureNumberAppearanceFixture(kind),score=parseMusicXml(xml),plain=parseMusicXml(xml.replace(' text="2a"','').replace(/<print>[\s\S]*?<\/print>/g,'')),marks=warnings(xml)
 expect(marks).toHaveLength(1);expect(marks[0]).toMatchObject({code:'unsupported-notation',partNumber:2,measureNumber:2,path:kind==='text'?'part[2].measure[2].@text':'part[2].measure[2].print[1].measure-numbering[1]'})
 expect(marks[0].message).toContain(kind==='text'?'text="2a"':`value="${kind}"`);if(kind!=='text'){expect(marks[0].message).toContain('font-size="12"');expect(marks[0].message).toContain('color="#000000"')}
 expect(score).toEqual(plain);expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(plain));expect(serializeMidi(score)).toEqual(serializeMidi(plain));const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(project.score).toEqual(score)
 const copy=serializeMusicXml(score);expect(copy).not.toContain('text="2a"');expect(copy).not.toContain('<measure-numbering');expect(warnings(copy)).toEqual([]);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
})
it.each(['same','control']as const)('does not invent loss when the effective label is unchanged: %s',kind=>expect(parseMusicXmlWithReport(createMeasureNumberAppearanceFixture(kind)).report.warnings).toEqual([]))
it('reads a measure-numbering value without formatting attributes',()=>{
 const marks=warnings(createMeasureNumberAppearanceFixture('system').replace(' font-size="12" color="#000000"',''));expect(marks).toHaveLength(1);expect(marks[0].message).toContain('value="system"')
})
it('keeps distinct source print occurrences rather than silently choosing the last one',()=>{
 const xml=createMeasureNumberAppearanceFixture('none').replace('</print>','</print><print><measure-numbering>measure</measure-numbering></print>')
 expect(warnings(xml).map(w=>w.path)).toEqual(['part[2].measure[2].print[1].measure-numbering[1]','part[2].measure[2].print[2].measure-numbering[1]'])
})
