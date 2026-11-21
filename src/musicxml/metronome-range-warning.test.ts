import {it,expect} from 'vitest'
import {createMetronomeTextFixture} from '../testing/metronome-text-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
it.each([1001,2000,0,-10,1000.5])('reports primary %s legacy normalization without changing its actual score/copy/native/MIDI',source=>{
 const result=parseMusicXmlWithReport(createMetronomeTextFixture({text:String(source)})),bpm=source>1000?240:40
 expect(result.score.tempo).toMatchObject({bpm,text:'♩ = '+bpm})
 expect(result.report.warnings).toEqual([expect.objectContaining({partNumber:1,measureNumber:1,path:'part[1].measure[1].direction[1].direction-type[1].metronome.per-minute',message:expect.stringMatching(new RegExp('Normalized metronome tempo .*source="'+source+'".*applied="'+bpm+'"'))})])
 const scalar=parseMusicXmlWithReport(createMetronomeTextFixture({text:String(bpm)}))
 expect(result.score).toEqual(scalar.score);expect(serializeMidi(result.score)).toEqual(serializeMidi(scalar.score))
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
 const copy=parseMusicXmlWithReport(serializeMusicXml(result.score));expect(copy.score).toEqual(result.score);expect(copy.report.warnings).toEqual([])
})
it.each([39,90.5,360,1000])('keeps native-valid %s without a normalization warning',bpm=>{
 const r=parseMusicXmlWithReport(createMetronomeTextFixture({text:String(bpm)}));expect(r.score.tempo?.bpm).toBe(bpm);expect(r.report.warnings).toEqual([])
})
it('records local half-note unit/dot and a positioned source without hiding independent sound mismatch',()=>{
 const r=parseMusicXmlWithReport(createMetronomeTextFixture({text:'1001',beatUnit:'half',dots:1,soundQuarter:95,position:true}))
 expect(r.score.tempoEvents?.[0]).toMatchObject({bpm:240,beatUnit:'half',dots:1})
 expect(r.report.warnings).toHaveLength(2)
 expect(r.report.warnings[0]).toMatchObject({path:'part[1].measure[2].direction[1].direction-type[1].metronome.per-minute',message:expect.stringMatching(/Normalized metronome tempo .*beat-unit="half".*dots="1"/)})
 expect(r.report.warnings[1].message).toContain('Independent sound tempo')
})
it('does not claim a secondary ignored clock was normalized into the global clock',()=>{
 const r=parseMusicXmlWithReport(createMetronomeTextFixture({text:'2000',secondary:true}));expect(r.score.tempo).toBeUndefined();expect(r.report.warnings.some(w=>w.message.startsWith('Normalized metronome tempo '))).toBe(false)
})
