import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {measureDynamicsFixture}from '../../../../../../src/testing/measure-dynamics-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const {source}=measureDynamicsFixture(),index=source.dynamics!.findIndex(m=>m.id==='primary-later')
source.dynamics!.splice(index+1,0,{id:'primary-third',measureId:'primary-bar-1',value:'mp'})
const dir='out/ddirori/continuous-341-source';mkdirSync(dir,{recursive:true})
for(const name of ['source','promoted-ff','promoted-mp']){
 const score=structuredClone(source)
 if(name!=='source')score.dynamics=score.dynamics!.filter(m=>m.id!=='primary-first')
 if(name==='promoted-mp')score.dynamics=score.dynamics!.filter(m=>m.id!=='primary-later')
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS3typed native/XML/MIDI sources;successive removal of only first effective IDs,neighbors/manual spans retained')
