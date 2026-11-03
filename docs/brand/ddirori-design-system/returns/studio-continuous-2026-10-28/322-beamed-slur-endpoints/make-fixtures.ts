import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createReleaseTestScore} from '../../../../../../src/testing/single-voice-mvp-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {createDuration,createRest,createTimePosition,TICKS_PER_QUARTER,validateTieRelations} from '../../../../../../src/score-core'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const mode of ['auto','manual']){
 const score=createReleaseTestScore(),voice=score.parts[0].staves[0].measures[0].voices[0]
 voice.events.forEach((e,i)=>{e.duration=createDuration('eighth');e.position=createTimePosition(TICKS_PER_QUARTER/2*i)})
 voice.events.push(createRest({id:'m1-beamed-tail-rest',duration:createDuration('half'),position:createTimePosition(TICKS_PER_QUARTER*2)}))
 if(mode==='manual')score.slurs![0].engraving={offsetY:0}
 const project=createNativeProject(score),encoded=encodeNativeProject(project),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 const p=join('out/ddirori/continuous-322-source',mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded);writeFileSync(join(p,'expected.musicxml'),xml);writeFileSync(join(p,'expected.mid'),midi);writeFileSync(join(p,'expected-import.score.json'),JSON.stringify(decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score,null,2))
}
console.log('PASS2 beamed endpoint sources:4eighth+half rest,native/XML/MIDI/ties')
