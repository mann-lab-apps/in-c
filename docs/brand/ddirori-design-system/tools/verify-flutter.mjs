import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(root,'../../..'),out=path.join(root,'evidence');
await mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),scope:'Independent package and catalog only; no device or audio certification',flutter:spawnSync('flutter',['--version'],{encoding:'utf8'}).stdout.trim(),steps:[]};
const tasks=[['package analyze','packages/ddirori_ui',['analyze']],['package tests','packages/ddirori_ui',['test','--machine']],['catalog analyze','packages/ddirori_ui/example',['analyze']],['catalog tests','packages/ddirori_ui/example',['test','--machine']],['catalog web build','packages/ddirori_ui/example',['build','web','--no-web-resources-cdn']]];
for(const[name,cwd,args]of tasks){console.log(name);const r=spawnSync('flutter',args,{cwd:path.join(repo,cwd),encoding:'utf8',maxBuffer:20*1024*1024});const events=(r.stdout??'').split('\n').flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
 const tests=events.filter(e=>e.type==='testDone'&&!e.hidden);report.steps.push({name,command:'flutter '+args.join(' '),cwd,exitCode:r.status,tests:tests.length||undefined,passed:tests.length?tests.filter(e=>e.result==='success').length:undefined,stdout:r.stdout,stderr:r.stderr});
 if(r.status!==0){report.status='failed';await writeFile(path.join(out,'flutter-validation.json'),JSON.stringify(report,null,2)+'\n');console.error(r.stdout,r.stderr);process.exit(1)}
}
report.status='passed';await writeFile(path.join(out,'flutter-validation.json'),JSON.stringify(report,null,2)+'\n');console.log('Flutter package, catalog and web build passed.');
