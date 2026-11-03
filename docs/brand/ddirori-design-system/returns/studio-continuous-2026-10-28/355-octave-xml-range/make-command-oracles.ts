import { mkdirSync, writeFileSync } from 'node:fs'
import { legacySpanOrderFixture } from '../../../../../../src/testing/legacy-span-order-fixture'
import { createNativeProject, encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-355-validated-source';mkdirSync(dir,{recursive:true})
const source=legacySpanOrderFixture('hairpin','equal').repaired
const target=source.parts[0].staves[0].measures[1].voices[0].events[0];if(target.type!=='note')throw Error('Typed note required');target.pitch={step:'C',octave:1}
source.octaveShifts=[{id:'low-octave-exchange',type:'15mb',startEventId:target.id,endEventId:target.id}]
const edited=structuredClone(source);edited.slurs![0].engraving!.height=4
const repaired=structuredClone(edited),note=repaired.parts[0].staves[0].measures[1].voices[0].events[0];if(note.type!=='note')throw Error('Typed note required');note.pitch={...note.pitch,octave:2,alter:0}
for(const [name,score]of Object.entries({source,edited,repaired})){
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)))
 writeFileSync(`${dir}/${name}.mid`,serializeMidi(score))
 if(name==='repaired'){const xml=serializeMusicXml(score);writeFileSync(`${dir}/${name}.musicxml`,xml);assert.deepEqual(serializeMidi(parseMusicXml(xml)),serializeMidi(score))}
}
console.log('PASS native C1/15mb + unchanged source/edited MIDI;explicit C2 repair XML/MIDI roundtrip')
