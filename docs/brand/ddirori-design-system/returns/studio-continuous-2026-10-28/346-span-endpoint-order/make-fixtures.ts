import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
import {spanEndpointOptions}from '../../../../../../src/renderer/src/editor/span-editing'
const source=decodeNativeProject(readFileSync('out/ddirori/continuous-344-source/auto.chromatics','utf8')).score,dir='out/ddirori/continuous-346-source',reference={kind:'hairpin' as const,id:'manual-dynamic-control'}
// Leave crescendo headroom:ff would saturate and hide the playback difference.
source.dynamics!.find(m=>m.id==='lower-later')!.value='mp'
mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'owners.json'),JSON.stringify({reference,span:source.hairpins![0],options:spanEndpointOptions(source,reference),targetEndId:'lower-bar-3-b'},null,2))
for(const name of ['source','changed']){const score=structuredClone(source);if(name==='changed')score.hairpins![0].endEventId='lower-bar-3-b'
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 if(name==='changed')assert.notDeepEqual(midi,serializeMidi(source),'Actual endpoint playback interval must differ')
 writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS source/extended-end native/XML/MIDI oracles;only endEventId changes,mp gives measurable crescendo headroom')
