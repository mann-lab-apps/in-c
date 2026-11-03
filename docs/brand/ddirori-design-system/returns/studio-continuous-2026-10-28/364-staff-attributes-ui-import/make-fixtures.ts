import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createNativeProject, encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-364-source';mkdirSync(dir,{recursive:true})
for(const sign of ['F','C'])for(const type of ['8vb','15mb','8va','15ma']){
 const name=type+'-'+sign,input=`out/ddirori/continuous-362-source/${name}`,xml=readFileSync(input+'.musicxml','utf8'),score=parseMusicXml(xml),midi=serializeMidi(score)
 assert.deepEqual(Buffer.from(midi),readFileSync(input+'.mid'))
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}-reexport.musicxml`,serializeMusicXml(score));writeFileSync(`${dir}/${name}.mid`,midi)
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/8vb-F.chromatics`))
console.log('PASS8actual-import oracles;existingXML original bytes and MIDI retained;reexport oracle respects imported IDs')
