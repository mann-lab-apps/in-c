import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {scoreRepeatSource} from '../score-core'
import {secondaryRepeatFixture} from '../testing/secondary-repeat-fixture'
import {createNativeProject,encodeNativeProject} from '../project/schema'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {parseMusicXml} from './parse'
import {serializeMusicXml} from './serialize'

it.each((['primary','lower','other'] as const).flatMap(owner=>(['repeat','volta'] as const).map(kind=>({owner,kind}))))('preserves $owner-only $kind through default MusicXML and MIDI without touching native owners',({owner,kind})=>{
 const {score,input,staff}=secondaryRepeatFixture(owner,kind),before=structuredClone(score),native=encodeNativeProject(createNativeProject(score)),expected=createPlaybackTimeline(score),xml=serializeMusicXml(score),reopened=parseMusicXml(xml)
 const out=process.env.DDIRORI_SECONDARY_REPEAT_QA_DIR
 if(out){const dir=join(out,owner,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'input.chromatics'),encodeNativeProject(createNativeProject(input)));writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.mid'),serializeMidi(score));writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expectations.json'),JSON.stringify({owner,kind,staffId:staff.id,measureIds:staff.measures.map(m=>m.id),totalBeats:expected.totalBeats}))}
 expect(expected.totalBeats).toBe(kind==='volta'?20:24);expect(scoreRepeatSource(score)?.id).toBe(staff.id)
 expect(createPlaybackTimeline(reopened).totalBeats).toBe(expected.totalBeats);expect(serializeMidi(reopened)).toEqual(serializeMidi(score));expect(scoreRepeatSource(reopened)?.measures.map(m=>({repeat:m.repeat,volta:m.volta}))).toEqual(staff.measures.map(m=>({repeat:m.repeat,volta:m.volta})))
 expect(encodeNativeProject(createNativeProject(score))).toBe(native);expect(score).toEqual(before)
})

it('keeps the existing first-marked primary sequence authoritative rather than merging a conflicting lower sequence',()=>{
 const {score}=secondaryRepeatFixture('lower','volta');score.parts[0].staves[0].measures[0].repeat={start:true};const before=structuredClone(score),expected=createPlaybackTimeline(score);expect(expected.totalBeats).toBe(16)
 const reopened=parseMusicXml(serializeMusicXml(score));expect(createPlaybackTimeline(reopened).totalBeats).toBe(16);expect(serializeMidi(reopened)).toEqual(serializeMidi(score));expect(score).toEqual(before)
})
it('retains malformed part count rejection without assigning an arbitrary fallback barline staff',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[1].measures.pop();const before=structuredClone(score);expect(scoreRepeatSource(score)).toBeUndefined();expect(()=>serializeMusicXml(score)).toThrow(/measure 수가 일치하지/);expect(score).toEqual(before)
})

it('also preserves an explicitly closed second ending on the aligned lower repeat source',()=>{
 const {score}=secondaryRepeatFixture('lower','volta');score.parts[0].staves[1].measures[2].volta={number:2,start:true,end:true};const before=structuredClone(score),reopened=parseMusicXml(serializeMusicXml(score));expect(createPlaybackTimeline(reopened).totalBeats).toBe(20);expect(serializeMidi(reopened)).toEqual(serializeMidi(score));expect(scoreRepeatSource(reopened)?.measures[2].volta).toEqual({number:2,start:true,end:true});expect(score).toEqual(before)
})


it.each(['primary','lower','other'] as const)('keeps three performed repetitions from %s through native/XML/MIDI with a system break',owner=>{
 const {score,staff}=secondaryRepeatFixture(owner,'repeat');staff.measures[1].repeat={end:true,times:3};score.layout={systemBreakBeforeMeasureIds:['primary-bar-3']}
 const before=structuredClone(score),midi=serializeMidi(score),xml=serializeMusicXml(score),reopened=parseMusicXml(xml),native=encodeNativeProject(createNativeProject(score))
 expect(createPlaybackTimeline(score).totalBeats).toBe(32);expect(createPlaybackTimeline(reopened).totalBeats).toBe(32);expect(serializeMidi(reopened)).toEqual(midi);expect(score).toEqual(before)
 if(process.env.DDIRORI_REPEAT_COUNT_QA_DIR){const dir=join(process.env.DDIRORI_REPEAT_COUNT_QA_DIR,owner);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.mid'),midi)}
})
