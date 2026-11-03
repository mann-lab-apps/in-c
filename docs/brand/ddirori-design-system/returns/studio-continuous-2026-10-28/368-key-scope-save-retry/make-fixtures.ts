import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import { createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand,type Note,type Staff } from '../../../../../../src/score-core'
import { implicitChordFixture } from '../../../../../../src/testing/implicit-chord-fixture'
import { buildKeySignatureCommand } from '../../../../../../src/renderer/src/editor/key-signature'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import assert from 'node:assert/strict'
const dir='out/ddirori/continuous-368-source';mkdirSync(dir,{recursive:true})
for(const owner of ['upper','lower'])for(const [key,fifths,label]of [['c',0,'다장조 (조표 없음)'],['d',2,'라장조 (♯ 2개)']]as const){
 const source=implicitChordFixture('key').source;source.title=`Generated measure dynamics consistency · key scope ${owner}-${key}`
 source.parts[0].id='scope-part';source.parts[0].name='Scope QA'
 source.parts[0].staves=['upper','lower'].map(staffName=>{
  const template=implicitChordFixture('key').source.parts[0].staves[0].measures[0],preceding=implicitChordFixture('preceding').source.parts[0].staves[0].measures[0].voices[0]
  const measures=Array.from({length:4},(_,index)=>{
   const m=structuredClone(template);m.id=`${staffName}-bar-${index+1}`;m.number=index+1;m.clef={sign:staffName==='upper'?'G':'F',line:staffName==='upper'?2:4};m.voices=[structuredClone(template.voices[0]),structuredClone(preceding)]
   m.voices.forEach((v,vi)=>{v.id=`voice-${vi+1}`;v.events.forEach(e=>{e.id=`${m.id}-v${vi+1}-${e.id}`;if(e.type==='note'&&staffName==='lower'){e.pitch={...e.pitch,octave:e.pitch.octave-1};if(e.pitches)e.pitches=e.pitches.map(p=>({...p,octave:p.octave-1}))}})})
   return m
  });return{id:`scope-${staffName}`,measures}as Staff
 })
 source.layout={systemBreakBeforeMeasureIds:['upper-bar-3']}
 const staff=source.parts[0].staves[owner==='upper'?0:1],measure=staff.measures[1],event=measure.voices[1].events[1]as Note
 const selection={type:'event'as const,eventId:event.id,address:{partId:source.parts[0].id,staffId:staff.id,measureId:measure.id,voiceId:measure.voices[1].id}}
 const command=buildKeySignatureCommand(source,selection,{fifths,mode:'major'})!,result=applyScoreCommand(source,command),edited=result.score,midi=serializeMidi(source),name=owner+'-'+key
 assert.deepEqual(serializeMidi(edited),midi);assert.deepEqual(applyScoreCommand(edited,result.undo).score,source)
 const target=edited.parts[0].staves[owner==='upper'?0:1],neighbor=owner==='upper'?1:0
 assert.deepEqual(target.measures.map(m=>m.keySignature.fifths),[1,fifths,fifths,fifths]);assert.deepEqual(edited.parts[0].staves[neighbor],source.parts[0].staves[neighbor]);assert.deepEqual(target.measures[0],staff.measures[0])
 for(const[phase,score]of [['source',source],['edited',edited]]as const){const xml=serializeMusicXml(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(`${dir}/${name}-${phase}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}-${phase}.musicxml`,xml);writeFileSync(`${dir}/${name}-${phase}.mid`,midi)}
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({name,owner,fifths,label,eventId:event.id,measureId:measure.id,voiceId:measure.voices[1].id,targetStaffId:staff.id,untouchedStaffId:source.parts[0].staves[neighbor].id,expectedMeasureKeys:[1,fifths,fifths,fifths],performedNoteOns:80},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/upper-c-source.chromatics`));console.log('PASS4multi-measure/two-voice/two-staff key-scope native/XML/MIDI/undo controls;80note-ons expected')
