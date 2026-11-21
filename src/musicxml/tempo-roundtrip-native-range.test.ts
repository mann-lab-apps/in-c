import {expect,it} from 'vitest'
import {createGlobalMeasureResolver,TICKS_PER_QUARTER} from '../score-core'
import {parseMusicXmlWithReport} from './parse'
import {serializeMusicXml} from './serialize'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
import {createTempoRoundtripFixture} from '../testing/tempo-roundtrip-fixture'
const cases=(['global','position']as const).flatMap(scope=>[39,241,60.5,96].map(bpm=>({scope,bpm})))
const markAt=(score:ReturnType<typeof parseMusicXmlWithReport>['score'],scope:'global'|'position')=>scope==='global'?score.tempo:score.tempoEvents?.[0]
it.each(cases)('preserves native-valid $scope BPM $bpm through actual XML/native/MIDI',({scope,bpm})=>{
 const{score,source,mark}=createTempoRoundtripFixture(scope,bpm),original=structuredClone(score),parsed=parseMusicXmlWithReport(source)
 expect(createNativeProject(score).score).toEqual(score);expect(markAt(parsed.score,scope)).toMatchObject(mark);expect(parsed.report.warnings).toEqual([]);expect(parsed.score.parts).toEqual(score.parts)
 expect(serializeMidi(parsed.score)).toEqual(serializeMidi(score));const again=parseMusicXmlWithReport(serializeMusicXml(parsed.score));expect(markAt(again.score,scope)).toMatchObject(mark);expect(serializeMidi(again.score)).toEqual(serializeMidi(score));expect(decodeNativeProject(encodeNativeProject(createNativeProject(parsed.score))).score).toEqual(parsed.score);expect(score).toEqual(original)
})
it.each([3.75,1000])('preserves native-valid boundary BPM %s without widening the editor',bpm=>{
 const{source,mark,score}=createTempoRoundtripFixture('global',bpm),parsed=parseMusicXmlWithReport(source);expect(parsed.score.tempo).toMatchObject(mark);expect(createNativeProject(parsed.score).score.tempo?.bpm).toBe(bpm);expect(serializeMidi(parsed.score)).toEqual(serializeMidi(score))
})
it('preserves dotted half unit and a nonzero offset independently of quarter BPM',()=>{
 const{source,score,mark}=createTempoRoundtripFixture('position',60.5,'half',1,TICKS_PER_QUARTER),parsed=parseMusicXmlWithReport(source),actual=parsed.score.tempoEvents![0]
 expect(actual).toMatchObject({...mark,tick:TICKS_PER_QUARTER});expect(createGlobalMeasureResolver(parsed.score)(actual.measureId)).toBe(parsed.score.parts[0].staves[0].measures[1].id)
 expect(serializeMidi(parsed.score)).toEqual(serializeMidi(score));const tempo=(s:typeof score)=>createPlaybackTimeline(s).tempoEvents.map(({startBeat,bpm,quarterBpm,text})=>({startBeat,bpm,quarterBpm,text}));expect(tempo(parsed.score)).toEqual(tempo(score))
})
