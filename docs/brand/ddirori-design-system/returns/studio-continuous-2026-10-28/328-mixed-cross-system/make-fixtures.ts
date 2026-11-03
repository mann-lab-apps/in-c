import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {validateTieRelations} from '../../../../../../src/score-core'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const variant of ['plain-cross-up-down','plain-cross-down-up'])for(const mode of ['auto','manual']){
 const input=join('out/ddirori/continuous-319-forced-source',mode,'source.chromatics'),bytes=readFileSync(input,'utf8'),native=decodeNativeProject(bytes),span=native.score.slurs![1],events=native.score.parts[0].staves[0].measures.flatMap(m=>m.voices.flatMap(v=>v.events)),id=variant.endsWith('down-up')?span.startEventId:span.endEventId,e=events.find(e=>e.id===id)!
 assert.equal(e.type,'note');if(e.type==='note')e.pitch={step:variant.endsWith('down-up')?'C':'D',octave:5,alter:0};assert(!('ties'in e),'Do not silently alter any tie chain for this fixture')
 const score=native.score,encoded=encodeNativeProject(native),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 const p=join('out/ddirori/continuous-328-source',variant,mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded);writeFileSync(join(p,'expected.musicxml'),xml);writeFileSync(join(p,'expected.mid'),midi);writeFileSync(join(p,'expected-import.score.json'),JSON.stringify(decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score,null,2));assert.equal(readFileSync(input,'utf8'),bytes)
}
console.log('PASS4 mixed cross sources:native/XML/MIDI/valid ties;only untied target pitch changed,source untouched')
