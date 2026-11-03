import { readFileSync,mkdirSync,writeFileSync } from 'node:fs'
import { createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand,type Note } from '../../../../../../src/score-core'
import { implicitChordFixture } from '../../../../../../src/testing/implicit-chord-fixture'
import { buildKeySignatureCommand } from '../../../../../../src/renderer/src/editor/key-signature'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-367-source';mkdirSync(dir,{recursive:true})
for(const [name,fifths,label]of [['secondary-c',0,'다장조 (조표 없음)'],['secondary-d',2,'라장조 (♯ 2개)'],['secondary-f',-1,'바장조 (♭ 1개)'],['first-c',0,'다장조 (조표 없음)'],['octaves-c',0,'다장조 (조표 없음)'],['preceding-g',1,'사장조 (♯ 1개)']]as const){
 const {source}=implicitChordFixture(name==='preceding-g'?'preceding':'key');source.title='Generated measure dynamics consistency · chord key '+name
 const measure=source.parts[0].staves[0].measures[0],events=measure.voices[0].events as Note[]
 if(name==='first-c'){events[0].pitch={step:'F',octave:4};events[0].pitches=[events[0].pitch,{step:'A',octave:4}]}
 if(name==='octaves-c')events[0].pitches=[events[0].pitch,{step:'F',octave:4},{step:'F',octave:5}]
 if(name==='preceding-g')events[1].graceNotes=[{pitch:{step:'F',octave:4}},{pitch:{step:'B',octave:4,alter:-1},slash:true}]
 const command=buildKeySignatureCommand(source,{type:'measure',measureId:measure.id},{fifths,mode:'major'})!,result=applyScoreCommand(source,command),edited=result.score,midi=serializeMidi(source)
 assert.deepEqual(serializeMidi(edited),midi);assert.deepEqual(applyScoreCommand(edited,result.undo).score,source)
 for(const [phase,score]of [['source',source],['edited',edited]]as const){const xml=serializeMusicXml(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(`${dir}/${name}-${phase}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}-${phase}.musicxml`,xml);writeFileSync(`${dir}/${name}-${phase}.mid`,midi)}
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({name,fifths,label,eventId:events[name==='preceding-g'?1:0].id,measureId:measure.id,sourceFifths:measure.keySignature.fifths,expectedBeatNotes:name==='preceding-g'?[[63],[60,63],[64],[64]]:name==='first-c'?[[66,69],[66],[65],[65]]:name==='octaves-c'?[[60,66,78],[66],[65],[65]]:[[60,66],[66],[65],[65]]},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/secondary-c-source.chromatics`));console.log('PASS6 authored source/edited whole-chord key-command native/XML/MIDI/undo oracles')
