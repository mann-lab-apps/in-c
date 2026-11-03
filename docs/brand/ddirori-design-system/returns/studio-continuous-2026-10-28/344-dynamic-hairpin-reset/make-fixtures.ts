import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const source=decodeNativeProject(readFileSync('out/ddirori/continuous-343-source/promoted.chromatics','utf8')).score,dir='out/ddirori/continuous-344-source'
assert.deepEqual(source.hairpins![0].engraving,{offsetY:0,height:4});assert.equal(source.dynamics!.find(m=>m.id==='lower-later')!.value,'ff');mkdirSync(dir,{recursive:true})
for(const name of ['source','auto']){const score=structuredClone(source);if(name==='auto')delete score.hairpins![0].engraving
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(xml,serializeMusicXml(source));assert.deepEqual(midi,serializeMidi(source));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS manual0/height4 and automatic native oracles;only target engraving differs,XML/MIDI and neighbor manual slur exact')
