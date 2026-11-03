import {mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNote,createVoice}from '../../../../../../src/score-core'
import {measureDynamicsFixture}from '../../../../../../src/testing/measure-dynamics-fixture'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const {source}=measureDynamicsFixture(),measure=source.parts[0].staves[0].measures[0],note=measure.voices[0].events[0]
assert(note.type==='note');note.pitch={step:'C',octave:3,alter:0}
measure.voices.push(createVoice({id:'voice-2',events:[createNote({id:'owned-voice2-high',pitch:{step:'C',octave:6,alter:0},duration:{value:'whole',dots:0}})]}))
const lower=source.parts[0].staves[1].measures[0].voices[0].events[0],other=source.parts[1].staves[0].measures[0].voices[0].events[0]
assert(lower.type==='note'&&other.type==='note');lower.pitch={step:'C',octave:1,alter:0};other.pitch={step:'C',octave:7,alter:0}
const dir='out/ddirori/continuous-338-source';mkdirSync(dir,{recursive:true})
const xml=serializeMusicXml(source),midi=serializeMidi(source)
assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)))
writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.mid'),midi)
console.log('PASS owned existing voice2/high versus voice1/low,later onset and manual neighbor source contracts')
