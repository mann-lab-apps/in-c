import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createScore,createPart,createStaff,createMeasure,createVoice,createNote,createRest,createFullMeasureRest,createDuration,TICKS_PER_QUARTER,validateTieRelations} from './src/score-core'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from './src/project/schema'
import {serializeMusicXml,parseMusicXml} from './src/musicxml'
import {serializeMidi} from './src/renderer/src/midi/serialize-midi'
const dir=path.resolve('out/ddirori/continuous-379-source');assert(!fs.existsSync(dir));fs.mkdirSync(dir,{recursive:true})
for(const [name,step,octave] of [['near-e','E',4],['near-f','F',4],['far-c','C',3]] as const){
 const measures=[0,1].map(i=>createMeasure({id:'bar-'+(i+1),number:i+1,voices:[
  createVoice({id:'voice-1',events:[createNote({id:'tied-'+(i+1),pitch:{step:'G',octave:4},pitches:[{step:'G',octave:4},{step:'B',octave:4}],duration:createDuration('whole'),ties:i===0?{start:true}:{stop:true}})]}),
  createVoice({id:'voice-2',events:i===0?[createRest({id:'other-half-rest',duration:createDuration('half')}),createNote({id:'other-note',position:{tick:TICKS_PER_QUARTER*2},pitch:{step,octave},duration:createDuration('half')})]:[createFullMeasureRest({id:'other-whole-rest'})]})]}))
 const score=createScore({id:'concurrent-tie-'+name,title:'Concurrent voice tie ink '+name,tempo:{bpm:120,beatUnit:'quarter'},parts:[createPart({id:'tie-part',name:'Piano',staves:[createStaff({id:'tie-staff',measures})]})]})
 assert.deepEqual(validateTieRelations(score),[]);const native=encodeNativeProject(createNativeProject(score)),normalized=decodeNativeProject(native).score,xml=serializeMusicXml(normalized),midi=serializeMidi(normalized)
 assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 fs.writeFileSync(path.join(dir,name+'.chromatics'),native);fs.writeFileSync(path.join(dir,name+'.musicxml'),xml);fs.writeFileSync(path.join(dir,name+'.mid'),midi)
 fs.writeFileSync(path.join(dir,name+'-meta.json'),JSON.stringify({name,otherPitch:step,otherOctave:octave,tiePaths:2,actualNoteHeads:5,otherStartMidiTick:960,otherDurationMidiTicks:960},null,2))
}
console.log('PASS3valid existing-model two-voice sources;native/XML/MIDI exact;no schema/engine changes')
