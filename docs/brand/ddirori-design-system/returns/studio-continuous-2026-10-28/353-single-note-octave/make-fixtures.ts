import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {legacySpanOrderFixture}from '../../../../../../src/testing/legacy-span-order-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const base=legacySpanOrderFixture('hairpin','equal').repaired,dir='out/ddirori/continuous-353-source';mkdirSync(dir,{recursive:true})
for(const name of ['source','8va','8vb','15ma','15mb']as const){const score=structuredClone(base);if(name!=='source')score.octaveShifts=[{id:'one-note-octave-control',type:name,startEventId:'primary-bar-2-a',endEventId:'primary-bar-2-a'}]
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS4one-note octave native/XML/MIDI typed oracles,base/control exact parsed MIDI,no model changes')
