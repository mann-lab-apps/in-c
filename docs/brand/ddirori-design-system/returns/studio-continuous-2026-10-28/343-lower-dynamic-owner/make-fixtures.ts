import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const source=decodeNativeProject(readFileSync('out/ddirori/continuous-341-source/source.chromatics','utf8')).score,dir='out/ddirori/continuous-343-source'
mkdirSync(dir,{recursive:true})
for(const name of ['source','edited','promoted','pasted']){
 const score=structuredClone(source)
 if(name!=='source')score.dynamics!.find(m=>m.id==='lower-later')!.value='ff'
 if(name==='promoted'||name==='pasted')score.dynamics=score.dynamics!.filter(m=>m.id!=='lower-first')
 if(name==='pasted'){score.dynamics=score.dynamics!.filter(m=>m.measureId!=='other-bar-2');score.dynamics.push({id:'owned-new-dynamic',measureId:'other-bar-2',value:'pp'})}
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 if(name==='edited')assert.deepEqual(midi,serializeMidi(source))
 writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS4typed lower-owner native/XML/MIDI stages;stored edit preserves MIDI,pp clipboard snapshot remains distinct from edited ff')
