import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {measureDynamicsFixture} from '../../../../../../src/testing/measure-dynamics-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
const {source}=measureDynamicsFixture(),edited=structuredClone(source),deleted=structuredClone(source),next=structuredClone(source)
edited.dynamics![1].value='f';deleted.dynamics=deleted.dynamics!.filter(m=>m.id!=='primary-later');next.title='Stored dynamics destination matching IDs';next.dynamics![1].value='pp'
const pasted=structuredClone(edited);pasted.dynamics=[...pasted.dynamics!.filter(m=>m.measureId!=='other-bar-2'),{id:'dynamic-expected-new',measureId:'other-bar-2',value:'ff'}]
const dense=structuredClone(source);dense.title='Stored dynamics supported maximum';for(let i=0;i<9995;i++)dense.dynamics!.push({id:`stored-extra-${i}`,measureId:'primary-bar-1',value:'pp'})
assert.equal(dense.dynamics!.length,10000);const denseEdited=structuredClone(dense);denseEdited.dynamics!.at(-1)!.value='f'
const dir='out/ddirori/continuous-329-source';mkdirSync(dir,{recursive:true})
for(const [name,score]of Object.entries({source,edited,deleted,next,pasted,dense,'dense-edited':denseEdited})){
 const native=createNativeProject(score),encoded=encodeNativeProject(native),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 writeFileSync(join(dir,name+'.chromatics'),encoded);writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
assert.deepEqual(serializeMidi(edited),serializeMidi(source));assert.deepEqual(serializeMidi(deleted),serializeMidi(source));assert.deepEqual(serializeMidi(denseEdited),serializeMidi(dense))
console.log('PASS7 native/XML/MIDI sources;stored-only edits/deletion preserve MIDI;max10000 array validates')
