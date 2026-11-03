import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {expandScoreRepeatsForMusicXml} from './expand-repeats'
import {serializeMusicXml,parseMusicXml} from './index'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline,beatDeltaToSeconds} from '../renderer/src/playback/timeline'
import {createRepeatTieFixture,type RepeatTieCase} from '../testing/repeat-tie-fixture'
import {createRepeatTempoStateFixture} from '../testing/repeat-tempo-state-fixture'
import {secondaryRepeatFixture} from '../testing/secondary-repeat-fixture'
import {createNativeProject,encodeNativeProject} from '../project/schema'
import {validateTieRelations} from '../score-core'

const equivalent=(score:ReturnType<typeof createRepeatTempoStateFixture>,label?:string)=>{
 const before=structuredClone(score),native=encodeNativeProject(createNativeProject(score)),ordinary=serializeMusicXml(score)
 const expanded=expandScoreRepeatsForMusicXml(score),xml=serializeMusicXml(expanded),reopened=parseMusicXml(xml)
 expect(serializeMidi(expanded)).toEqual(serializeMidi(score));expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
 expect(expanded.parts.every(p=>p.staves.every(s=>s.measures.every(m=>!m.repeat&&!m.volta)))).toBe(true)
 expect(validateTieRelations(expanded)).toEqual([]);expect(encodeNativeProject(createNativeProject(score))).toBe(native);expect(serializeMusicXml(score)).toBe(ordinary);expect(score).toEqual(before)
 const events=expanded.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events))));expect(new Set(events.map(e=>e.id)).size).toBe(events.length)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa&&label){const dir=join(qa,label);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),ordinary);writeFileSync(join(dir,'expanded.musicxml'),xml);writeFileSync(join(dir,'expected.mid'),serializeMidi(score))}
 return expanded
}
it.each(['internal','exit','entry','middle','volta'] as RepeatTieCase[])('expands conditional %s ties without new schemas or changing source',kind=>{
 const {score,expanded:literal}=createRepeatTieFixture(kind,true),expanded=equivalent(score,'tie-'+kind)
 expect(serializeMidi(expanded)).toEqual(serializeMidi(literal))
})
it.each(['primary','lower','other'] as const)('expands the existing %s-owned aligned volta sequence across all staves',owner=>{
 const {score}=secondaryRepeatFixture(owner,'volta'),expanded=equivalent(score,'owner-'+owner)
 expect(expanded.parts.every(p=>p.staves.every(s=>s.measures.length===5))).toBe(true)
 expect(expanded.parts[0].staves[0].measures.map(m=>m.voices[0].events[0].type==='note'?m.voices[0].events[0].pitch.step:'rest')).toEqual(['C','D','C','E','F'])
})
it('restores implicit tempo with unchanged sounding pitches, attacks and source markings',()=>{
 const expanded=equivalent(createRepeatTempoStateFixture(),'tempo'),timeline=createPlaybackTimeline(expanded)
 expect(timeline.events.map(e=>beatDeltaToSeconds(timeline,0,e.startBeat,120))).toEqual([0,.5,1.5,2,3,3.5,4.5])
})
it('duplicates source key/clef/time/transposition and measure marks on their original owners',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat')
 for(const part of score.parts)for(const staff of part.staves){staff.measures[1].keySignature={fifths:4};staff.measures[1].clef={sign:'C',line:3};staff.measures[1].transposition={chromatic:-2}}
 const id=score.parts[0].staves[1].measures[1].id;score.staffTexts=[{id:'text',measureId:id,text:'dolce'}];score.harmonies=[{id:'chord',measureId:id,tick:0,text:'E'}];score.rehearsalMarks=[{id:'rehearsal',measureId:'measure-2',text:'B'}];score.layout={systemBreakBeforeMeasureIds:[id],pageBreakBeforeMeasureIds:[id]}
 const expanded=equivalent(score,'signatures'),ms=expanded.parts[0].staves[1].measures
 expect([ms[1].keySignature,ms[3].keySignature]).toEqual([{fifths:4},{fifths:4}]);expect(ms[2].keySignature).toEqual({fifths:0,mode:'major'})
 expect(expanded.staffTexts?.map(t=>t.measureId)).toEqual([ms[1].id,ms[3].id]);expect(expanded.layout?.pageBreakBeforeMeasureIds).toEqual([ms[1].id,ms[3].id]);expect(expanded.harmonies).toHaveLength(2);expect(expanded.rehearsalMarks).toHaveLength(2)
})
it.each(['slurs','hairpins','octaveShifts','pedalEvents'] as const)('rejects not-yet-supported %s instead of silently dropping musical meaning',field=>{
 const score=createRepeatTempoStateFixture();Object.assign(score,{[field]:[{id:'unsupported',startEventId:'tempo-a',endEventId:'tempo-c'}]});const before=structuredClone(score)
 expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/일반 MusicXML/);expect(score).toEqual(before)
})
it('rejects misaligned repeated staves instead of inventing a shared traversal',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[1].measures.pop()
 expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/마디/)
})

it('leaves a non-repeated score structurally intact, including spans',()=>{
 const score=createRepeatTempoStateFixture();score.parts[0].staves[0].measures[0].repeat=undefined;score.slurs=[{id:'unchanged',startEventId:'tempo-a',endEventId:'tempo-c',engraving:{offsetY:0}}]
 const before=structuredClone(score),expanded=expandScoreRepeatsForMusicXml(score);expect(expanded).toEqual(before);expect(expanded).not.toBe(score);expect(score).toEqual(before)
})
it('rejects ambiguous or missing annotation anchors and leaves original values untouched',()=>{
 const score=createRepeatTempoStateFixture();score.staffTexts=[{id:'lost',measureId:'absent',text:'keep me'}];const before=structuredClone(score)
 expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/일반 MusicXML/);expect(score).toEqual(before)
})
it('blocks a valid repeated slur while retaining the ordinary XML fallback source',()=>{
 const score=createRepeatTempoStateFixture();score.slurs=[{id:'preserve-slur',startEventId:'tempo-a',endEventId:'tempo-c'}]
 expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/일반 MusicXML/)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa){const dir=join(qa,'unsupported-slur');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'source.musicxml'),serializeMusicXml(score));writeFileSync(join(dir,'expected.mid'),serializeMidi(score))}
})
