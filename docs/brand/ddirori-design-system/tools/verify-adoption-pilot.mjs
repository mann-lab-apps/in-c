import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=path.join(root,'docs/brand/ddirori-design-system/evidence/adoption-pilot');
fs.mkdirSync(out,{recursive:true});
const tasks=[
 ['web-typecheck','packages/ddirori_web','npm',['run','typecheck']],
 ['web-tests','packages/ddirori_web','npm',['test']],
 ['web-build','packages/ddirori_web','npm',['run','build','--','--outDir','../../out/ddirori/adoption-catalog']],
 ['ui-analyze','packages/ddirori_ui','flutter',['analyze','--no-pub']],
 ['ui-tests','packages/ddirori_ui','flutter',['test','--no-pub','--reporter','expanded']],
 ['catalog-analyze','packages/ddirori_ui/example','flutter',['analyze','--no-pub']],
 ['catalog-tests','packages/ddirori_ui/example','flutter',['test','--no-pub','--reporter','expanded']],
 ['score-analyze','apps/in_c_sheet','flutter',['analyze','--no-pub']],
 ['score-tests','apps/in_c_sheet','flutter',['test','--no-pub','--reporter','expanded']],
 ['play-analyze','apps/classical_local_library','flutter',['analyze','--no-pub']],
 ['play-tests','apps/classical_local_library','flutter',['test','--no-pub','test/brand_pilot_test.dart','test/play_library_components_test.dart','test/play_playback_components_test.dart','test/play_activity_components_test.dart','--reporter','expanded']],
 ['specifications','.','node',['docs/brand/ddirori-design-system/tools/verify-specifications.mjs']],
 ['tokens','.','node',['--test','docs/brand/ddirori-design-system/tools/token-model.test.mjs']],
 ['contrast','.','node',['docs/brand/ddirori-design-system/tools/verify-palettes.mjs']],
 ['metadata-score','deployment','bundle',['exec','fastlane','prepare_ios_metadata','manifest:apps/clef/ios-metadata.yaml','mode:check']],
 ['metadata-play','deployment','bundle',['exec','fastlane','prepare_ios_metadata','manifest:apps/classical-local-library/ios-metadata.yaml','mode:check']],
 ['preservation','.','node',['docs/brand/ddirori-design-system/tools/verify-adoption-preservation.mjs']],
 ['diff','.','git',['diff','--check']],
];
const selected=process.argv.slice(2);for(const n of selected)if(!tasks.some(t=>t[0]===n))throw Error('Unknown task '+n);
const file=path.join(out,'checks.json');const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).results:[];
const results=selected.length?previous.filter(r=>!selected.includes(r.name)):[];
for(const [name,cwd,bin,args]of tasks.filter(t=>!selected.length||selected.includes(t[0]))){
 const startedAt=new Date().toISOString();const log=fs.createWriteStream(path.join(out,name+'.log'));
 const code=await new Promise(resolve=>{const child=spawn(bin,args,{cwd:path.join(root,cwd),env:{...process.env,DDIRORI_EVIDENCE_DIR:out,DDIRORI_SPEC_REPORT:path.join(out,'specifications.json')}});
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',e=>{log.write(String(e));});child.on('close',resolve);});
 await new Promise(resolve=>log.end(resolve));results.push({name,cwd,command:[bin,...args],startedAt,finishedAt:new Date().toISOString(),exitCode:code,log:name+'.log'});
 fs.writeFileSync(file,JSON.stringify({recordedAt:new Date().toISOString(),results},null,2)+'\n');console.log(name+': '+code);
}
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
