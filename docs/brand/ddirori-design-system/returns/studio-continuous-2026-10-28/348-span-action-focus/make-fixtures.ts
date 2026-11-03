import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {serializeMusicXml,parseMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const original=decodeNativeProject(readFileSync('out/ddirori/continuous-346-source/source.chromatics','utf8')).score,dir='out/ddirori/continuous-348-source';mkdirSync(dir,{recursive:true})
for(const name of ['source','slur-deleted','hairpin-deleted']){const score=structuredClone(original);if(name==='slur-deleted')delete score.slurs;if(name==='hairpin-deleted')delete score.hairpins
 const native=encodeNativeProject(createNativeProject(score));assert.deepEqual(decodeNativeProject(native).score,score);const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);if(name==='slur-deleted')assert.deepEqual(midi,serializeMidi(original))
 writeFileSync(join(dir,name+'.chromatics'),native);writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASSsource/slur-delete/hairpin-delete typed native/XML/MIDI,slur deletion MIDI invariant')
