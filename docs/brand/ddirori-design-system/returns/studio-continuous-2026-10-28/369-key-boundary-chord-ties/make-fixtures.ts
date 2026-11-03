import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand,createDuration,createFullMeasureRest,createMeasure,createNote,createPart,createScore,createStaff,createVoice,validateTieRelations,collectTiePairs } from '../../../../../../src/score-core'
import { buildKeySignatureCommand } from '../../../../../../src/renderer/src/editor/key-signature'
import { createPlaybackTimeline } from '../../../../../../src/renderer/src/playback/timeline'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'

const dir='out/ddirori/continuous-369-source';mkdirSync(dir,{recursive:true})
for(const owner of ['upper','lower']as const)for(const [key,fifths,label]of [['c',0,'다장조 (조표 없음)'],['d',2,'라장조 (♯ 2개)']]as const)for(const cross of [false,true]){
 const name=[owner,key,cross?'cross':'same'].join('-')
 const source=createScore({id:'key-boundary-ties',title:'Generated measure dynamics consistency · key-boundary ties '+name,tempo:{bpm:120,beatUnit:'quarter'},parts:[createPart({id:'boundary-part',name:'Key tie QA',staves:['upper','lower'].map(staffName=>createStaff({id:'boundary-'+staffName,measures:[0,1].map(index=>{
  const id=staffName+'-bar-'+(index+1),octave=staffName==='upper'?4:3
  const event=staffName===owner?createNote({id:id+'-chord',pitch:{step:'C',octave},pitches:[{step:'C',octave},{step:'F',octave}],duration:createDuration('whole'),ties:index===0?{start:true}:{stop:true}}):createFullMeasureRest({id:id+'-rest'})
  return createMeasure({id,number:index+1,keySignature:{fifths:1,mode:'major'},clef:{sign:staffName==='upper'?'G':'F',line:staffName==='upper'?2:4},voices:[createVoice({id:'voice-1',events:[event]})]})})}))})]})
 if(cross)source.layout={systemBreakBeforeMeasureIds:['upper-bar-2']}
 const staff=source.parts[0].staves[owner==='upper'?0:1],measure=staff.measures[1],event=measure.voices[0].events[0],before=structuredClone(source)
 const command=buildKeySignatureCommand(source,{type:'event',eventId:event.id,address:{partId:'boundary-part',staffId:staff.id,measureId:measure.id,voiceId:'voice-1'}},{fifths,mode:'major'})!,result=applyScoreCommand(source,command),edited=result.score,midi=serializeMidi(source)
 for(const score of [source,edited]){
  assert.deepEqual(validateTieRelations(score),[]);assert.deepEqual(collectTiePairs(score),[{fromEventId:owner+'-bar-1-chord',toEventId:event.id}])
  const notes=createPlaybackTimeline(score).events.filter(e=>e.frequency||e.frequencies?.length);assert.equal(notes.length,1);assert.equal(notes[0].durationBeats,8);assert.equal(notes[0].frequencies?.length,2)
  assert.deepEqual(serializeMidi(score),midi)
 }
 assert.deepEqual(source,before);assert.deepEqual(applyScoreCommand(edited,result.undo).score,source)
 assert.deepEqual(edited.parts[0].staves[owner==='upper'?1:0],source.parts[0].staves[owner==='upper'?1:0]);assert.deepEqual(edited.parts[0].staves[owner==='upper'?0:1].measures[0],staff.measures[0])
 for(const[phase,score]of [['source',source],['edited',edited]]as const){const xml=serializeMusicXml(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(`${dir}/${name}-${phase}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}-${phase}.musicxml`,xml);writeFileSync(`${dir}/${name}-${phase}.mid`,midi)}
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({name,owner,fifths,label,eventId:event.id,measureId:measure.id,targetStaffId:staff.id,systems:cross?2:1,tiePaths:cross?4:2,heads:4,expectedPitches:owner==='upper'?[60,66]:[48,54],durationTicks:3840},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/upper-c-same-source.chromatics`));console.log('PASS8key-boundary whole-chord tie scopes;one8beat/two-pitch sustain;source/native/XML/MIDI/undo exact')
