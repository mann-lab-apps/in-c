import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {measureDynamicsFixture}from '../../../../../../src/testing/measure-dynamics-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const {source}=measureDynamicsFixture(),dir='out/ddirori/continuous-332-source';mkdirSync(dir,{recursive:true})
for(const name of ['source','f','mf','mp']){const score=structuredClone(source);if(name!=='source')score.dynamics![1].value=name as 'f'|'mf'|'mp';const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(midi,serializeMidi(source));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),xml);writeFileSync(join(dir,name+'.mid'),midi)}
console.log('PASS4native/XML/MIDI sources;stored-only snapshots preserve MIDI')
