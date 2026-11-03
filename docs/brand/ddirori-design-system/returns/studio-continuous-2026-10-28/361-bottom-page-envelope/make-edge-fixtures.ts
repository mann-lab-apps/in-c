import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { decodeNativeProject, createNativeProject, encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-361-edge-source';mkdirSync(dir,{recursive:true})
for(const octave of ['none','8vb']){
 const input=`out/ddirori/continuous-360-source/last-${octave}`,score=decodeNativeProject(readFileSync(input+'.chromatics','utf8')).score
 score.title='Generated measure dynamics consistency '.repeat(22).trim()
 const name='last-title-'+octave,xml=serializeMusicXml(score),midi=serializeMidi(score)
 assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 assert.deepEqual(Buffer.from(midi),readFileSync(input+'.mid'))
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)))
 writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
 writeFileSync(`${dir}/${name}-meta.json`,readFileSync(input+'-meta.json'))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/last-title-none.chromatics`))
console.log('PASS2 long-title last-staff native/XML/MIDI controls;only title changed')
