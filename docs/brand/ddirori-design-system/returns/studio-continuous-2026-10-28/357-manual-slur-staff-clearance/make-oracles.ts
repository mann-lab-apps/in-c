import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { decodeNativeProject, createNativeProject, encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-357-source';mkdirSync(dir,{recursive:true})
const {score:source}=decodeNativeProject(readFileSync('out/ddirori/continuous-356-source/without-octave.chromatics','utf8'))
const edited=structuredClone(source);edited.slurs!.find(s=>s.id==='manual-slur-control')!.engraving!.height=4
for(const[name,score]of Object.entries({source,edited})){
 const before=JSON.stringify(score),xml=serializeMusicXml(score),midi=serializeMidi(score)
 assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);assert.equal(JSON.stringify(score),before)
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
}
assert.deepEqual(serializeMidi(source),serializeMidi(edited))
console.log('PASS typed manual3/4 native/XML/MIDI oracles,source immutable,MIDI identical')
