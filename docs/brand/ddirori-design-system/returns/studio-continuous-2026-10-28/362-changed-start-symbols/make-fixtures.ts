import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { decodeNativeProject, createNativeProject, encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-362-source';mkdirSync(dir,{recursive:true})
for(const sign of ['F','C']as const)for(const type of ['8vb','15mb','8va','15ma']){
 const input=`out/ddirori/continuous-359-source/${type}`,score=decodeNativeProject(readFileSync(input+'.chromatics','utf8')).score
 for(const measure of score.parts[0].staves[0].measures.slice(2)){
  measure.clef={sign,line:sign==='F'?4:3};measure.keySignature={fifths:4,mode:'major'};measure.timeSignature={beats:2,beatType:2}
  for(const voice of measure.voices)for(const event of voice.events)if(event.type==='note')event.pitch={...event.pitch,alter:0}
 }
 const name=type+'-'+sign,xml=serializeMusicXml(score),midi=serializeMidi(score)
 assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);assert.deepEqual(Buffer.from(midi),readFileSync(input+'.mid'))
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/8vb-F.chromatics`))
console.log('PASS8 changed F/C clef,E-major four-sharp,2/2 native/XML/MIDI controls;24notes and all performed bytes same359')
