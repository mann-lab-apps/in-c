import { readFileSync,mkdirSync,writeFileSync } from 'node:fs'
import { decodeNativeProject,createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-365-source';mkdirSync(dir,{recursive:true});const base=decodeNativeProject(readFileSync('out/ddirori/continuous-358-source/source.chromatics','utf8')).score
for(const owner of ['primary','passive'])for(const [sign,fifths]of [['sharp',4],['flat',-3]]as const)for(const mode of ['mid','line']){
 const score=structuredClone(base)
 for(const part of score.parts)for(const staff of part.staves)staff.measures=staff.measures.slice(0,2)
 const staff=score.parts[0].staves[owner==='primary'?0:1],primary=score.parts[0].staves[0]
 staff.measures[0].keySignature={fifths,mode:'major'};staff.measures[1].keySignature={fifths:0,mode:'major'}
 for(const measure of staff.measures)for(const voice of measure.voices)for(const e of voice.events)if(e.type==='note')e.pitch={...e.pitch,alter:0}
 const first=staff.measures[0].voices[0].events[0],end=staff.measures[1].voices[0].events.at(-1)!
 score.octaveShifts=[{id:'cancel-octave',type:'8vb',startEventId:first.id,endEventId:end.id}]
 score.layout=mode==='line'?{systemBreakBeforeMeasureIds:[primary.measures[1].id]}:undefined
 const name=[owner,sign,mode].join('-'),xml=serializeMusicXml(score),midi=serializeMidi(score)
 assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({previousMeasureId:staff.measures[0].id,targetMeasureId:staff.measures[1].id,targetEventId:staff.measures[1].voices[0].events[0].id,expectedNaturals:Math.abs(fifths),owner,sign,mode},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/primary-sharp-mid.chromatics`));console.log('PASS8 valid neutral key-cancel fixtures,native/XML/MIDI self-roundtrip')
