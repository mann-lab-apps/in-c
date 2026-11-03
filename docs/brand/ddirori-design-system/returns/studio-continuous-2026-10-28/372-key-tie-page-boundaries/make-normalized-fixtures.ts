import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand,createDuration,createFullMeasureRest,createMeasure,createNote,createPart,createScore,createStaff,createVoice,validateTieRelations,collectTiePairs } from '../../../../../../src/score-core'
import { buildKeySignatureCommand } from '../../../../../../src/renderer/src/editor/key-signature'
import { createPlaybackTimeline } from '../../../../../../src/renderer/src/playback/timeline'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'

const dir='out/ddirori/continuous-372-normalized-source';mkdirSync(dir,{recursive:true})
for(const name of ['explicit-pages','long-header']as const){
 const staves=['upper','lower','tail'].map(staffName=>{
  const measures=Array.from({length:8},(_,index)=>{
  const id=staffName+'-bar-'+(index+1)
  const event=staffName==='lower'?createNote({id:id+'-chord',pitch:{step:'C',octave:3},pitches:[{step:'C',octave:3},{step:'F',octave:3}],duration:createDuration('whole'),ties:index%2===0?{start:true}:{stop:true}}):staffName==='tail'?createNote({id:id+'-high',pitch:{step:'C',octave:5,alter:0},duration:createDuration('whole')}):createFullMeasureRest({id:id+'-rest'})
  return createMeasure({id,number:index+1,keySignature:{fifths:1,mode:'major'},clef:{sign:staffName==='upper'?'G':'F',line:staffName==='upper'?2:4},voices:[createVoice({id:'voice-1',events:[event]})]})
  })
  return createStaff({id:'boundary-'+staffName,measures})
 })
 const source=createScore({id:'key-tie-page-boundaries',title:'Generated measure dynamics consistency · '+(name==='long-header'?'긴 악보 제목과 페이지 경계 검사 '.repeat(26):'explicit-page-breaks'),composer:name==='long-header'?'임시 검증 악보의 긴 작곡가 표기 '.repeat(8):'Owned generated page QA',tempo:{bpm:120,beatUnit:'quarter'},parts:[createPart({id:'boundary-part',name:'Key tie QA',staves})]})
 // Match the real metadata editor's authored value contract before freezing fixtures.
 source.title=source.title.trim();if(source.composer)source.composer=source.composer.trim()
 source.layout={systemBreakBeforeMeasureIds:['upper-bar-3','upper-bar-5','upper-bar-7'],...(name==='explicit-pages'?{pageBreakBeforeMeasureIds:['upper-bar-3','upper-bar-7']}:{}),pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:8,staffSizePercent:100,systemSpacingPercent:100}}
 const staff=staves[1],measure=staff.measures[1],event=measure.voices[0].events[0],before=structuredClone(source)
 const command=buildKeySignatureCommand(source,{type:'event',eventId:event.id,address:{partId:'boundary-part',staffId:staff.id,measureId:measure.id,voiceId:'voice-1'}},{fifths:2,mode:'major'})!,result=applyScoreCommand(source,command),edited=result.score,midi=serializeMidi(source)
 for(const score of [source,edited]){
  assert.deepEqual(validateTieRelations(score),[]);assert.equal(collectTiePairs(score).length,4)
  const held=createPlaybackTimeline(score).events.filter(e=>e.staffId==='boundary-lower');assert.equal(held.length,4);assert.deepEqual(held.map(e=>[e.startBeat,e.durationBeats,e.frequencies?.length]),[0,8,16,24].map(beat=>[beat,8,2]));assert.deepEqual(serializeMidi(score),midi)
 }
 assert.deepEqual(source,before);assert.deepEqual(applyScoreCommand(edited,result.undo).score,source)
 for(const index of [0,2])assert.deepEqual(edited.parts[0].staves[index],source.parts[0].staves[index])
 for(const[phase,score]of [['source',source],['edited',edited]]as const){const xml=serializeMusicXml(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(`${dir}/${name}-${phase}.chromatics`,encodeNativeProject(createNativeProject(score)));writeFileSync(`${dir}/${name}-${phase}.musicxml`,xml);writeFileSync(`${dir}/${name}-${phase}.mid`,midi)}
 const owners=staves.flatMap((s,staffIndex)=>s.measures.map((m,index)=>[m.id,{partId:'boundary-part',staffId:s.id,staffIndex,systemIndex:Math.floor(index/2)}]))
 writeFileSync(`${dir}/${name}-meta.json`,JSON.stringify({name,fifths:2,label:'라장조 (♯ 2개)',eventId:event.id,measureId:measure.id,heads:16,restGlyphGroups:8,systems:4,tiePaths:8,tieStaffIndex:1,owners,primaryMeasureIds:['upper-bar-1','upper-bar-3','upper-bar-5','upper-bar-7'],expectedMinimumPages:name==='explicit-pages'?3:2,longHeader:name==='long-header',explicitPageSystems:name==='explicit-pages'?[1,3]:[]},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/explicit-pages-source.chromatics`));console.log('PASS2eight-bar/three-staff/four-system key/tie page fixtures;4held chords/8tail notes;native/XML/MIDI/undo preserved')
