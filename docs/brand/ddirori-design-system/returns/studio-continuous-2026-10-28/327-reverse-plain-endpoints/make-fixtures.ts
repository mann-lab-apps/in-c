import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {validateTieRelations,voiceEventDurationTicks,measureDurationTicks} from '../../../../../../src/score-core'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const variant of ['beam-down-up','plain-up-down','plain-down-up'])for(const mode of ['auto','manual']){
 const input=join('out/ddirori',variant.startsWith('beam')?'continuous-322-source':'continuous-317-source',mode,'source.chromatics'),bytes=readFileSync(input,'utf8'),native=decodeNativeProject(bytes),m=native.score.parts[0].staves[0].measures[0]
 m.voices[0].events.slice(0,4).forEach((e,i)=>{assert.equal(e.type,'note');if(e.type==='note')e.pitch={step:i%2===0?'C':'D',octave:variant.endsWith('down-up')?(i<2?5:4):(i<2?4:5),alter:0}})
 const events=m.voices[0].events;for(let i=0;i<events.length;i++)assert.equal(events[i].position.tick+voiceEventDurationTicks(events[i],m),events[i+1]?.position.tick??measureDurationTicks(m))
 const score=native.score,encoded=encodeNativeProject(native),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 const p=join('out/ddirori/continuous-327-source',variant,mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded);writeFileSync(join(p,'expected.musicxml'),xml);writeFileSync(join(p,'expected.mid'),midi);writeFileSync(join(p,'expected-import.score.json'),JSON.stringify(decodeNativeProject(encodeNativeProject(createNativeProject(parseMusicXml(xml)))).score,null,2));assert.equal(readFileSync(input,'utf8'),bytes)
}
console.log('PASS6 reverse/plain sources:exact bar,native/XML/MIDI/ties,source unchanged;actual direction preconditions remain UI checks')
