import {expect,it} from 'vitest'
import {createFiguredBassFixture,type FiguredBassFixtureKind} from '../testing/figured-bass-fixture'
import {parseMusicXml,parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
const warnings=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented figured-bass '))
it.each(['stacked','hidden','extend','empty'] as FiguredBassFixtureKind[])('reports each original %s container without changing normalized music',kind=>{
 const xml=createFiguredBassFixture(kind),score=parseMusicXml(xml),plain=parseMusicXml(xml.replace(/<figured-bass(?:\s[^>]*)?>[\s\S]*?<\/figured-bass>/g,'')),marks=warnings(xml)
 const bars=kind==='extend'?[2,3]:[2]
 expect(marks.map(w=>({part:w.partNumber,bar:w.measureNumber,path:w.path}))).toEqual(bars.map(bar=>({part:2,bar,path:`part[2].measure[${bar}].figured-bass[1]`})))
 expect(marks[0].message).toContain(`figures="${kind==='stacked'?2:1}"`)
 if(kind==='hidden')expect(marks[0].message).toContain('print-object="no"')
 if(kind==='stacked'){expect(marks[0].message).toContain('duration="8"');expect(marks[0].message).toContain('parentheses="yes"')}
 expect(score).toEqual(plain);expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(plain));expect(serializeMidi(score)).toEqual(serializeMidi(plain))
 const native=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(native.score).toEqual(score);expect(serializeMidi(native.score)).toEqual(serializeMidi(score));const copy=serializeMusicXml(score);expect(copy).not.toMatch(/<figured-bass(?:\s|>)/);expect(warnings(copy)).toEqual([]);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
})
it.each(['control','harmony'] as const)('does not invent a figured-bass warning for %s',kind=>expect(warnings(createFiguredBassFixture(kind))).toEqual([]))
it('keeps multiple source occurrences distinct within the same part and measure',()=>{
 const xml=createFiguredBassFixture('stacked').replace('</figured-bass>','</figured-bass><figured-bass><figure><figure-number>4</figure-number></figure></figured-bass>')
 expect(warnings(xml).map(w=>w.path)).toEqual(['part[2].measure[2].figured-bass[1]','part[2].measure[2].figured-bass[2]'])
})
