import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=new URL('../evidence/basic-set/',import.meta.url);await mkdir(out,{recursive:true});
const checks=[
 ['generated','.', 'node',['docs/brand/ddirori-design-system/tools/build.mjs','--check']],
 ['token-model','.', 'node',['--test','docs/brand/ddirori-design-system/tools/token-model.test.mjs']],
 ['palette-contrast','.', 'node',['docs/brand/ddirori-design-system/tools/verify-palettes.mjs']],
 ['react-tests','packages/ddirori_web','npm',['test']],
 ['react-build','packages/ddirori_web','npm',['run','build']],
 ['studio-build','packages/ddirori_web','npm',['run','build:studio']],
 ['flutter-analyze','packages/ddirori_ui','flutter',['analyze']],
 ['flutter-tests','packages/ddirori_ui','flutter',['test','--reporter','expanded']],
 ['flutter-catalog-analyze','packages/ddirori_ui/example','flutter',['analyze']],
 ['flutter-catalog-tests','packages/ddirori_ui/example','flutter',['test','--reporter','expanded']],
 ['flutter-catalog-build','packages/ddirori_ui/example','flutter',['build','web','--no-web-resources-cdn']],
 ['score-regression','apps/in_c_sheet','flutter',['test','test/brand_pilot_test.dart','--reporter','expanded']],
 ['play-regression','apps/classical_local_library','flutter',['test','test/brand_pilot_test.dart','test/play_library_components_test.dart','test/play_playback_components_test.dart','test/play_activity_components_test.dart','--reporter','expanded']],
];
const selected=process.argv.slice(2);
for(const name of selected)if(!checks.some(c=>c[0]===name))throw Error('Unknown check: '+name);
const previous=selected.length?JSON.parse(await readFile(new URL('core.json',out),'utf8')).results:[];
const results=previous.filter(r=>!selected.includes(r.name));
for(const [name,cwd,cmd,args]of checks){
 if(selected.length&&!selected.includes(name))continue;
 const started=new Date().toISOString();let output='';
 const exitCode=await new Promise(resolve=>{const child=spawn(cmd,args,{cwd:path.resolve(root,cwd),env:process.env});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',e=>{output+=String(e);resolve(-1)});child.on('exit',resolve)});
 await writeFile(new URL(name+'.log',out),output);
 results.push({name,command:[cmd,...args],cwd,started,finished:new Date().toISOString(),exitCode});
 await writeFile(new URL('core.json',out),JSON.stringify({scope:'Local component and consumer regression checks; not device/store approval',results},null,2)+'\n');
 console.log(name+': '+(exitCode===0?'passed':'FAILED'));
 if(exitCode!==0){console.error(output.slice(-5000));process.exitCode=1;break;}
}
