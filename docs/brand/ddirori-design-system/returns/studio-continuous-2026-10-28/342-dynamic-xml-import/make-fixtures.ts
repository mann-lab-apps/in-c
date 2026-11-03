import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {parseMusicXml,serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
const dir='out/ddirori/continuous-342-source',xml=readFileSync('out/ddirori/continuous-341-source/source.musicxml','utf8'),source=parseMusicXml(xml)
assert.deepEqual(parseMusicXml(xml),source,'Parser IDs used by this oracle must be deterministic')
const measure=source.parts[0].staves[0].measures[0],marks=source.dynamics!.filter(m=>m.measureId===measure.id)
assert.deepEqual(marks.map(m=>m.value),['p','ff','mp']);assert.equal(new Set(source.dynamics!.map(m=>m.id)).size,source.dynamics!.length)
mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'import.musicxml'),xml)
writeFileSync(join(dir,'owners.json'),JSON.stringify({eventId:measure.voices[0].events[0].id,effectiveIds:marks.map(m=>m.id)},null,2))
for(const name of ['source','promoted-ff','promoted-mp']){
 const score=structuredClone(source)
 if(name!=='source')score.dynamics=score.dynamics!.filter(m=>m.id!==marks[0].id)
 if(name==='promoted-mp')score.dynamics=score.dynamics!.filter(m=>m.id!==marks[1].id)
 const output=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(output)),midi)
 assert.deepEqual(Buffer.from(midi),readFileSync('out/ddirori/continuous-341-source/'+name+'.mid'))
 writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),output);writeFileSync(join(dir,name+'.mid'),midi)
}
console.log('PASS deterministic parsed owners,p/ff/mp order,3native/XML/MIDI oracles;MIDI exact341;native geometry loss not disguised as lossless XML')
