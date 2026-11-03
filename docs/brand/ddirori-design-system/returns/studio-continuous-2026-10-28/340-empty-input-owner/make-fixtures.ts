import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createVoice}from '../../../../../../src/score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const score=decodeNativeProject(readFileSync('out/ddirori/continuous-338-source/source.chromatics','utf8')).score,measure=score.parts[0].staves[0].measures[0]
assert.deepEqual(measure.voices.map(v=>v.id),['voice-1','voice-2']);measure.voices.push(createVoice({id:'voice-3',events:[]}))
const dir='out/ddirori/continuous-340-source';mkdirSync(dir,{recursive:true});const midi=serializeMidi(score)
assert.throws(()=>serializeMusicXml(score),/리듬 정합성이 올바르지 않습니다: gap/)
assert.deepEqual(Buffer.from(midi),readFileSync('out/ddirori/continuous-338-source/source.mid'))
writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'source.mid'),midi)
console.log('PASS authored empty voice3 native/MIDI preserved;existing MusicXML gap rejection retained,not an exportable XML source')
