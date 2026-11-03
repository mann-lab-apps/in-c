import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createReleaseTestScore} from '../../../../../../src/testing/single-voice-mvp-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {createRest,createTimePosition,TICKS_PER_QUARTER,validateTieRelations,voiceEventDurationTicks,measureDurationTicks,type Duration} from '../../../../../../src/score-core'
import {createBeamGroups} from '../../../../../../src/renderer/src/notation/beam-groups'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const variant of ['double','partial'])for(const mode of ['auto','manual']){
 const score=createReleaseTestScore(),measure=score.parts[0].staves[0].measures[0],voice=measure.voices[0]
 const durations:Duration[]=variant==='double'?Array.from({length:4},()=>({value:'16th',dots:0})):[{value:'eighth',dots:1},{value:'16th',dots:0},{value:'16th',dots:0},{value:'eighth',dots:1}]
 let tick=0;voice.events.forEach((e,i)=>{e.duration=durations[i];e.position=createTimePosition(tick);tick+=voiceEventDurationTicks(e,measure)})
 voice.events.push(createRest({id:'secondary-beam-tail-rest',duration:{value:'half',dots:variant==='double'?1:0},position:createTimePosition(tick)}))
 for(let i=0;i<voice.events.length;i++){const e=voice.events[i];assert.equal(e.position.tick+voiceEventDurationTicks(e,measure),voice.events[i+1]?.position.tick??measureDurationTicks(measure))}
 assert.equal(createBeamGroups(measure,voice).length,variant==='double'?1:2)
 if(mode==='manual')score.slurs![0].engraving={offsetY:0}
 const native=createNativeProject(score),encoded=encodeNativeProject(native),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 const p=join('out/ddirori/continuous-324-source',variant,mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded);writeFileSync(join(p,'expected.musicxml'),xml);writeFileSync(join(p,'expected.mid'),midi);writeFileSync(join(p,'expected-import.score.json'),JSON.stringify(decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score,null,2))
}
console.log('PASS4 full-secondary/partial endpoint sources:exact bar,1/2groups,native/XML/MIDI/ties')
