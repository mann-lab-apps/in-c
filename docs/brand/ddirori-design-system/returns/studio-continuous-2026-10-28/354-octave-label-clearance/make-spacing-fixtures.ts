import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {legacySpanOrderFixture}from '../../../../../../src/testing/legacy-span-order-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const base=legacySpanOrderFixture('hairpin','equal').repaired,dir='out/ddirori/continuous-354-spacing-source';mkdirSync(dir,{recursive:true})
for(const name of ['source','8va','8vb','15ma','15mb']as const){const score=structuredClone(base);if(name!=='source')score.octaveShifts=[{id:'one-note-octave-control',type:name,startEventId:'primary-bar-2-a',endEventId:'primary-bar-2-a'}]
 score.layout={systemBreakBeforeMeasureIds:['primary-bar-3']}
 for(const part of score.parts)for(const staff of part.staves)for(const measure of staff.measures)for(const event of measure.voices[0].events)if(event.type==='note'&&measure.id.startsWith('primary-bar-')&&measure.number>=2)event.pitch={step:name.endsWith('b')?'C':'A',octave:name.endsWith('b')?1:6}
 if(name!=='source')score.octaveShifts![0].endEventId='primary-bar-4-b'
 const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS4one-note octave native/XML/MIDI typed oracles,base/control exact parsed MIDI,no model changes')
