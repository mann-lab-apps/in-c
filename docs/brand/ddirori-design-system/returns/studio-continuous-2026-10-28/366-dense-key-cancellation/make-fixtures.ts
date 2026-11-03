import { readFileSync,mkdirSync,writeFileSync } from 'node:fs'
import { decodeNativeProject,createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { createNote,TICKS_PER_QUARTER } from '../../../../../../src/score-core'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-366-source';mkdirSync(dir,{recursive:true})
for(const owner of ['primary','passive'])for(const [sign,fifths]of [['sharp',7],['flat',-7]]as const)for(const clef of ['F','C']as const){
 const base=`out/ddirori/continuous-365-source/${owner}-${sign}-mid`,score=decodeNativeProject(readFileSync(base+'.chromatics','utf8')).score,staff=score.parts[0].staves[owner==='primary'?0:1]
 staff.measures[0].keySignature={fifths,mode:'major'};staff.measures[1].keySignature={fifths:0,mode:'minor'};staff.measures[1].clef={sign:clef,line:clef==='F'?4:3}
 staff.measures[1].voices[0].events=Array.from({length:8},(_,i)=>createNote({id:`dense-cancel-${owner}-${sign}-${clef}-${i}`,position:{tick:i*TICKS_PER_QUARTER/2},duration:{value:'eighth',dots:0},pitch:{step:(['C','D','E','F','G','A','B','C']as const)[i],octave:i===7?5:4,alter:0}}))
 score.octaveShifts![0].endEventId=staff.measures[1].voices[0].events.at(-1)!.id
 const name=[owner,sign,clef].join('-'),xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({previousMeasureId:staff.measures[0].id,targetMeasureId:staff.measures[1].id,targetEventId:staff.measures[1].voices[0].events[0].id,expectedNaturals:7,owner,sign,mode:'auto-dense',clef,neutralMode:'minor',targetEvents:8},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/primary-sharp-F.chromatics`));console.log('PASS8 valid seven-natural/F-C-clef/Am/dense-native XML MIDI controls')
