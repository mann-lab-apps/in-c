const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const root=process.cwd(),{decodeNativeProject,encodeNativeProject,createNativeProject}=require(path.join(root,'src/project/schema.ts')),{serializeMusicXml,parseMusicXml}=require(path.join(root,'src/musicxml/index.ts')),{serializeMidi}=require(path.join(root,'src/renderer/src/midi/serialize-midi.ts')),{validateTieRelations,createNote,createRest,createDuration,TICKS_PER_QUARTER:T}=require(path.join(root,'src/score-core/index.ts'))
const out=path.join(root,'out/ddirori/continuous-384-source');assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true})
for(const [name,pitches,durations,starts]of[
 ['beam-eight',[['C',5],['D',5]],['eighth','eighth'],[2,2.5]],
 ['beam-mixed',[['C',5],['D',5],['E',5]],['16th','16th','eighth'],[2,2.25,2.5]],
 ['beam-far',[['C',3],['D',3]],['eighth','eighth'],[2,2.5]]]){
 const score=decodeNativeProject(fs.readFileSync(path.join(root,'out/ddirori/continuous-379-source/near-e.chromatics'),'utf8')).score;score.title='Foreign beam and whole-chord tie '+name
 score.parts[0].staves[0].measures[0].voices[1].events=[createRest({id:'other-half-rest',duration:createDuration('half')}),...pitches.map(([step,octave],i)=>createNote({id:i?'other-note-'+(i+1):'other-note',position:{tick:T*starts[i]},pitch:{step,octave},duration:createDuration(durations[i])})),createRest({id:'other-tail-rest',position:{tick:T*3},duration:createDuration('quarter')})]
 assert.deepEqual(validateTieRelations(score),[]);const native=encodeNativeProject(createNativeProject(score)),normalized=decodeNativeProject(native).score,xml=serializeMusicXml(normalized),midi=serializeMidi(normalized);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 fs.writeFileSync(path.join(out,name+'.chromatics'),native);fs.writeFileSync(path.join(out,name+'.musicxml'),xml);fs.writeFileSync(path.join(out,name+'.mid'),midi);fs.writeFileSync(path.join(out,name+'-meta.json'),JSON.stringify({stemCount:pitches.length,beamBodiesMinimum:1,notes:pitches.map(([step,octave],i)=>({step,octave,start:starts[i],duration:durations[i]==='16th'?.25:.5}))},null,2))
}
console.log('PASS3 valid existing-model beam/native/XML/MIDI sources')
