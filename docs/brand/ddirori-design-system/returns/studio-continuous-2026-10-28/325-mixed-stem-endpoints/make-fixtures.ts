import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {validateTieRelations} from '../../../../../../src/score-core'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const mode of ['auto','manual']){
 const path=join('out/ddirori/continuous-322-source',mode,'source.chromatics'),before=readFileSync(path,'utf8'),native=decodeNativeProject(before),events=native.score.parts[0].staves[0].measures[0].voices[0].events
 for(const [i,step]of [[2,'C'],[3,'D']]as const){const e=events[i];assert.equal(e.type,'note');if(e.type==='note')e.pitch={step,octave:5,alter:0}}
 const score=native.score,encoded=encodeNativeProject(native),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 const p=join('out/ddirori/continuous-325-source',mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded);writeFileSync(join(p,'expected.musicxml'),xml);writeFileSync(join(p,'expected.mid'),midi);writeFileSync(join(p,'expected-import.score.json'),JSON.stringify(decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score,null,2));assert.equal(readFileSync(path,'utf8'),before)
}
console.log('PASS2 sources:mixed beam directions expected;native/XML/MIDI/ties,prior source preserved')
