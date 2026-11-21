import {expect,it} from 'vitest'
import {createFretboardFixture,stripFretboardFrames} from '../testing/fretboard-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {expandScoreRepeatsForMusicXml} from './expand-repeats'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented fretboard diagram '))
it.each(['basic','barre','hidden','multiple','normalized'] as const)('reports lost %s frames while preserving the existing chord/music contract',kind=>{
 const xml=createFretboardFixture(kind),result=parseMusicXmlWithReport(xml),control=parseMusicXmlWithReport(stripFretboardFrames(xml)).score,marks=notices(xml)
 const expected=kind==='multiple'?['part[1].measure[3].harmony[1].frame','part[2].measure[2].harmony[1].frame','part[2].measure[2].harmony[2].frame']:['part[2].measure[2].harmony[1].frame']
 expect(marks.map(w=>w.path)).toEqual(expected)
 expect(marks.map(w=>[w.partNumber,w.measureNumber])).toEqual(kind==='multiple'?[[1,3],[2,2],[2,2]]:[[2,2]])
 expect(marks.every(w=>w.code==='unsupported-notation')).toBe(true)
 expect(marks.at(-1)!.message).toContain('strings="6"');expect(marks.at(-1)!.message).toContain(`frets="${kind==='barre'?5:4}"`)
 if(kind==='hidden')expect(marks[0].message).toContain('print-frame="no"')
 if(kind==='barre')expect(marks[0].message).toContain('first-fret="3"')
 expect(result.score).toEqual(control);expect(result.score.harmonies?.length).toBe(kind==='multiple'?3:1)
 const midi=serializeMidi(control),native=decodeNativeProject(encodeNativeProject(createNativeProject(result.score)));expect(native.score).toEqual(control);expect(serializeMidi(native.score)).toEqual(midi)
 for(const[score,expected]of[[result.score,control],[expandScoreRepeatsForMusicXml(result.score),expandScoreRepeatsForMusicXml(control)]]){const copy=serializeMusicXml(score);expect(copy).toBe(serializeMusicXml(expected));expect(copy).not.toMatch(/<frame(?:\s|>)/);expect(notices(copy)).toEqual([]);expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi)}
 expect(xml).toBe(createFretboardFixture(kind))
})
it.each(['control','none'] as const)('does not invent a diagram loss notice for %s',kind=>expect(parseMusicXmlWithReport(createFretboardFixture(kind)).report.warnings).toEqual([]))
