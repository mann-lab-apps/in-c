import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {expandScoreRepeatsForMusicXml} from './expand-repeats'
import {serializeMusicXml} from './serialize'
import {secondaryRepeatFixture} from '../testing/secondary-repeat-fixture'
import {createNativeProject,encodeNativeProject} from '../project/schema'
const perPart=(xml:string,token:string)=>[...xml.matchAll(/<part id="[^"]+">([\s\S]*?)<\/part>/g)].map(m=>m[1].split(token).length-1)
it('preserves ordinal global scope across parts while concrete and local markings retain their original owners',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat'),other=score.parts[1].staves[0].measures[1].id
 score.rehearsalMarks=[{id:'global-rehearsal',measureId:'measure-2',text:'GLOBAL_B'},{id:'other-only',measureId:other,text:'OTHER_ONLY'}]
 score.systemTexts=[{id:'global-system',measureId:'measure-2',text:'GLOBAL_SYSTEM'}]
 score.staffTexts=[{id:'primary-local',measureId:'measure-2',text:'PRIMARY_LOCAL'}]
 const native=encodeNativeProject(createNativeProject(score)),ordinary=serializeMusicXml(score),expanded=serializeMusicXml(expandScoreRepeatsForMusicXml(score))
 expect(perPart(ordinary,'GLOBAL_B')).toEqual([1,1]);expect(perPart(expanded,'GLOBAL_B')).toEqual([2,2])
 expect(perPart(ordinary,'GLOBAL_SYSTEM')).toEqual([1,1]);expect(perPart(expanded,'GLOBAL_SYSTEM')).toEqual([2,2])
 expect(perPart(expanded,'OTHER_ONLY')).toEqual([0,2]);expect(perPart(expanded,'PRIMARY_LOCAL')).toEqual([2,0])
 expect(serializeMusicXml(score)).toBe(ordinary);expect(encodeNativeProject(createNativeProject(score))).toBe(native)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa){const dir=join(qa,'alias-global');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),ordinary);writeFileSync(join(dir,'expanded.musicxml'),expanded);writeFileSync(join(dir,'expected.mid'),serializeMidi(score));writeFileSync(join(dir,'policy.json'),JSON.stringify({defaultBlocked:true,reason:'Existing rehearsal-mark roundtrip guard rejects the concrete other-part global owner; keep as a no-write control'}))}
})
it('blocks an ordinal dynamic whose original playback contract cannot yet be preserved rather than making it newly audible',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.dynamics=[{id:'kept-alias',measureId:'measure-1',value:'p'}]
 const native=encodeNativeProject(createNativeProject(score));expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/셈여림/)
 expect(encodeNativeProject(createNativeProject(score))).toBe(native)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa){const dir=join(qa,'unsupported-dynamic-alias');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),serializeMusicXml(score));writeFileSync(join(dir,'expected.mid'),serializeMidi(score))}
})

it('keeps the supported ordinal global scope without the pre-existing other-part global-owner conflict',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.rehearsalMarks=[{id:'global',measureId:'measure-2',text:'GLOBAL_B'}];score.systemTexts=[{id:'system',measureId:'measure-2',text:'GLOBAL_SYSTEM'}];score.staffTexts=[{id:'local',measureId:'measure-2',text:'PRIMARY_LOCAL'}]
 const ordinary=serializeMusicXml(score),expanded=serializeMusicXml(expandScoreRepeatsForMusicXml(score));expect(perPart(expanded,'GLOBAL_B')).toEqual([2,2]);expect(perPart(expanded,'GLOBAL_SYSTEM')).toEqual([2,2]);expect(perPart(expanded,'PRIMARY_LOCAL')).toEqual([2,0])
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa){const dir=join(qa,'alias-global-supported');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'source.musicxml'),ordinary);writeFileSync(join(dir,'expanded.musicxml'),expanded);writeFileSync(join(dir,'expected.mid'),serializeMidi(score))}
})
it('preserves global ordinal scope when a real primary measure ID also has the ordinal spelling',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[0].measures[1].id='measure-2';score.rehearsalMarks=[{id:'legacy-global',measureId:'measure-2',text:'LEGACY_GLOBAL'}];score.systemTexts=[{id:'legacy-system',measureId:'measure-2',text:'LEGACY_SYSTEM'}]
 const native=encodeNativeProject(createNativeProject(score)),ordinary=serializeMusicXml(score),expanded=serializeMusicXml(expandScoreRepeatsForMusicXml(score));expect(perPart(ordinary,'LEGACY_GLOBAL')).toEqual([1,1]);expect(perPart(expanded,'LEGACY_GLOBAL')).toEqual([2,2]);expect(perPart(expanded,'LEGACY_SYSTEM')).toEqual([2,2]);expect(encodeNativeProject(createNativeProject(score))).toBe(native)
 const qa=process.env.DDIRORI_REPEAT_FLATTEN_FIXTURE_OUT
 if(qa){const dir=join(qa,'legacy-global-concrete');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),ordinary);writeFileSync(join(dir,'expanded.musicxml'),expanded);writeFileSync(join(dir,'expected.mid'),serializeMidi(score))}
})
it('blocks a global ordinal/concrete reference pointing to conflicting source positions',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[0].measures[1].id='measure-1';score.rehearsalMarks=[{id:'ambiguous',measureId:'measure-1',text:'Keep both meanings'}];const native=encodeNativeProject(createNativeProject(score));expect(()=>expandScoreRepeatsForMusicXml(score)).toThrow(/일반 MusicXML/);expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
