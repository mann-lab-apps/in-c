import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {measureDynamicsFixture}from '../../../../../../src/testing/measure-dynamics-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const kind of ['low','high','chord']){const {source}=measureDynamicsFixture(),note=source.parts[0].staves[0].measures[0].voices[0].events[0];assert(note.type==='note');note.pitch={step:'C',octave:kind==='high'?6:3,alter:0};if(kind==='chord')note.pitches=[{...note.pitch},{step:'C',octave:4,alter:0},{step:'C',octave:6,alter:0}];const dir=join('out/ddirori/continuous-337-source',kind);mkdirSync(dir,{recursive:true});const xml=serializeMusicXml(source),midi=serializeMidi(source);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)));writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.mid'),midi)}
console.log('PASS3 owned native/XML/MIDI sources;C3/C6/whole-event3head chord preserved')
