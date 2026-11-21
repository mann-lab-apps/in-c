import {afterEach,expect,it,vi} from 'vitest'
import {createCreditImageFixture} from '../testing/credit-image-fixture'
import {parseMusicXml,parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
afterEach(()=>vi.restoreAllMocks())
const warnings=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented credit image '))
it.each(['single','pages']as const)('reports each %s original page image without fetching or changing normalized music',kind=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('Image URI must not be fetched')})
 const xml=createCreditImageFixture(kind),score=parseMusicXml(xml),plain=parseMusicXml(xml.replace(/<credit\b[\s\S]*?<\/credit>/g,'')),marks=warnings(xml),count=kind==='pages'?2:1
 expect(marks).toHaveLength(count);expect(marks.map(w=>w.path)).toEqual(Array.from({length:count},(_,n)=>`credit[${n+1}].credit-image[1]`));expect(marks.every(w=>w.partNumber===undefined&&w.measureNumber===undefined&&w.code==='unsupported-notation')).toBe(true)
 for(let n=0;n<count;n++)expect(marks[n].message).toContain(`page="${n+1}"`)
 expect(marks[0].message).toContain('type="image/svg+xml"');expect(JSON.stringify(marks)).not.toMatch(/studio-qa\.invalid|first-fixture|second-fixture|fixture=private/)
 if(kind==='single'){expect(marks[0].message).toContain('width="100"');expect(marks[0].message).toContain('height="50"')}
 expect(fetch).not.toHaveBeenCalled()
 expect(score).toEqual(plain);expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(plain));expect(serializeMidi(score)).toEqual(serializeMidi(plain));const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)));expect(project.score).toEqual(score)
 const copy=serializeMusicXml(score);expect(copy).not.toMatch(/<credit-image\b/);expect(warnings(copy)).toEqual([]);expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
})
it('uses MusicXML page1 when the source omits the credit page attribute',()=>{
 const marks=warnings(createCreditImageFixture().replace(' page="1"',''));expect(marks).toHaveLength(1);expect(marks[0].message).toContain('page="1"')
})
it.each(['control','title']as const)('does not invent an image warning for %s',kind=>expect(parseMusicXmlWithReport(createCreditImageFixture(kind)).report.warnings).toEqual([]))
it('retains the existing direction-image diagnostic without adding a root-image warning',()=>{
 const report=parseMusicXmlWithReport(createCreditImageFixture('direction')).report;expect(report.warnings).toHaveLength(1);expect(report.warnings[0].code).toBe('unsupported-direction');expect(report.warnings[0].path).toBe('part[2].measure[2].direction[1].direction-type[1].image');expect(warnings(createCreditImageFixture('direction'))).toEqual([])
})
