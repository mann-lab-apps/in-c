const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const root=process.cwd(),out=path.join(root,'out/ddirori/continuous-385-source-v2'),{decodeNativeProject,encodeNativeProject}=require(path.join(root,'src/project/schema.ts')),{applyPortablePartLayout}=require(path.join(root,'src/project/part-layout.ts')),{serializeMusicXml,parseMusicXml}=require(path.join(root,'src/musicxml/index.ts')),{serializeMidi}=require(path.join(root,'src/renderer/src/midi/serialize-midi.ts'))
for(const part of[false,true]){
 const name=part?'view-part':'view-score',p=decodeNativeProject(fs.readFileSync(path.join(out,'cross-eight.chromatics'),'utf8'));p.score.title='Tied voices independent score and part systems';p.partLayouts=[{partId:p.score.parts[0].id,layout:{systemBreakBeforeMeasureIds:[],pageBreakBeforeMeasureIds:[]}}];p.view=part?{mode:'part',partId:p.score.parts[0].id}:{mode:'score'}
 const display=part?applyPortablePartLayout(p.score,p.partLayouts[0]):p.score,xml=serializeMusicXml(display),midi=serializeMidi(display);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
 for(const [ext,content]of[['.chromatics',encodeNativeProject(p)],['.musicxml',xml],['.mid',midi]]){const f=path.join(out,name+ext);assert(!fs.existsSync(f));fs.writeFileSync(f,content)}
 const meta=JSON.parse(fs.readFileSync(path.join(out,'cross-eight-meta.json')));Object.assign(meta,{systems:part?1:2,tiePaths:part?2:4,view:p.view.mode,partLayoutsPreserved:true});fs.writeFileSync(path.join(out,name+'-meta.json'),JSON.stringify(meta,null,2))
}
console.log('PASS same native score/layout overrides with saved score2systems versus part1system;XML/MIDI exact')
