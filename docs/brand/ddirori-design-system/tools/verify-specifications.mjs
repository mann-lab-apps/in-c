// Documentation contracts only; does not run product UI tests or change product code.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolveTokens} from './token-model.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const base=path.join(root,'docs/brand/ddirori-design-system');
const spec=path.join(base,'specifications'), evidence=path.join(base,'evidence/specifications');
const reportPath=path.resolve(root,process.env.DDIRORI_SPEC_REPORT || 'out/ddirori/specifications.json');
const skipFlutter=process.argv.includes('--skip-flutter');
const read=p=>fs.readFileSync(p,'utf8'), json=p=>JSON.parse(read(p));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rel=p=>path.relative(root,p);
const errors=[], checks={}, commands=[];
function assert(ok,message){if(!ok)errors.push(message);}
function command(bin,args,cwd=root){
 const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
 const output=(r.stdout??'')+(r.stderr??'');
 commands.push({command:[bin,...args].join(' '),cwd:rel(cwd),exitCode:r.status,output});
 assert(r.status===0,`Command failed: ${bin} ${args.join(' ')}\n${output}`);return r;
}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
command(process.execPath,[path.join(base,'tools/snapshot-spec-api.mjs'),'--check']);
const registry=json(path.join(spec,'registry.json')),api=json(path.join(evidence,'api.json'));
const ids=registry.components.map(c=>c.id);
assert(new Set(ids).size===ids.length&&ids.length===39,'Component IDs/count mismatch');
for(const [platform,list,support]of [['react',api.react,registry.supportReact],['flutter',api.dart,registry.supportFlutter]]){
 const names=new Set(list.map(e=>e.name));
 const covered=new Set([...Object.keys(support),...registry.components.flatMap(c=>c[platform])]);
 for(const name of names)assert(covered.has(name),`Undocumented ${platform} export: ${name}`);
 for(const name of covered)assert(names.has(name),`Stale ${platform} symbol: ${name}`);
 checks[platform+'Declarations']=names.size;
}
for(const c of registry.components){
 const p=path.join(spec,c.file);assert(fs.existsSync(p),`Missing ${c.file}`);
 const s=read(p);assert(s.startsWith(`# ${c.id} `),`ID mismatch ${c.file}`);
 for(const name of c.react)assert(s.includes('api-react.md#'+name),`Missing React API link ${c.id}/${name}`);
 for(const name of c.flutter)assert(s.includes('api-flutter.md#'+name),`Missing Flutter API link ${c.id}/${name}`);
 for(const p of [...c.sources,...c.testSources])assert(fs.existsSync(path.join(root,p)),`Missing source/test ${p}`);
 for(const heading of ['목적·구조','상태·전이·접근성','실제 API·기본값','최소 사용·서비스 연결','수용 조건·근거','기존 테스트 연결'])assert(s.includes('## '+heading),`Missing ${heading}: ${c.id}`);
}
checks.componentContracts=ids.length;
checks.serviceSpecs=files(path.join(spec,'services')).filter(p=>p.endsWith('.md')).length;
assert(checks.serviceSpecs===6,'Expected six service specifications');
// Local links: API anchors are explicit. Markdown heading anchors follow GitHub conventions.
const clean=s=>s.replace(/```[\s\S]*?```/g,'');
function anchors(s){const out=new Set([...s.matchAll(/<a\s+id="([^"]+)"/g)].map(m=>m[1]));const used=new Map();
 for(const m of clean(s).matchAll(/^#{1,6} (.+)$/gm)){const slug=m[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');const n=used.get(slug)??0;used.set(slug,n+1);out.add(slug+(n?'-'+n:''));}return out;}
let links=0;
for(const p of files(spec).filter(p=>p.endsWith('.md'))){for(const m of clean(read(p)).matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)){
 const href=m[1];if(/^(https?:|mailto:)/.test(href))continue;
 const [target,fragment]=href.split('#'), dest=target?path.resolve(path.dirname(p),decodeURIComponent(target)):p;links++;
 // This report is created after validation.
 if(dest===path.join(evidence,'validation.json'))continue;
 assert(fs.existsSync(dest),`Broken link ${rel(p)} -> ${href}`);
 if(fragment&&fs.existsSync(dest)&&dest.endsWith('.md'))assert(anchors(read(dest)).has(decodeURIComponent(fragment)),`Broken anchor ${rel(p)} -> ${href}`);
}}
checks.localLinks=links;
const source=json(path.join(base,'tokens.json')),palette=json(path.join(base,source.brandInput)),resolved=resolveTokens(source,palette);
function flatten(v,prefix=''){return Object.entries(v).flatMap(([k,v])=>{const p=prefix?prefix+'.'+k:k;return v&&typeof v==='object'&&!Array.isArray(v)?flatten(v,p):[[p,v]];});}
const flat=flatten(source),values=new Map(flatten(resolved));
const table=read(path.join(spec,'token-reference.md'));
const rows=[...table.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| `([^`]+)` \|/gm)];
assert(rows.length===flat.length,'Token table row count mismatch');
const rowMap=new Map(rows.map(m=>[m[1],[m[2],m[3]]]));
for(const [p,v]of flat){const row=rowMap.get(p);assert(row&&JSON.stringify(JSON.parse(row[0]))===JSON.stringify(v)&&JSON.stringify(JSON.parse(row[1]))===JSON.stringify(values.get(p)),`Stale token row ${p}`);}
checks.tokenRows=flat.length;
// Type check documentation against the actual local package implementation.
const require=createRequire(path.join(root,'package.json')),ts=require('typescript');
const configPath=path.join(root,'packages/ddirori_web/tsconfig.json');
const cfg=ts.readConfigFile(configPath,ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,path.dirname(configPath));
const program=ts.createProgram([path.join(spec,'examples-react.tsx')],{...parsed.options,noEmit:true});
const diagnostics=ts.getPreEmitDiagnostics(program);
const formatted=ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'});
assert(!diagnostics.length,'React documentation example typecheck failed:\n'+formatted);
checks.reactExamples={diagnostics:diagnostics.length,typescript:ts.version,output:formatted};
// Resolve relative package roots before copying configuration to an external temp folder.
if (!skipFlutter) {
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ddirori-spec-check-'));
try{
 const original=path.join(root,'packages/ddirori_ui/example/.dart_tool/package_config.json');
 const cfg=json(original);cfg.packages=cfg.packages.map(p=>({...p,rootUri:new URL(p.rootUri,pathToFileURL(original)).href}));
 fs.mkdirSync(path.join(temporary,'.dart_tool'));
 fs.writeFileSync(path.join(temporary,'.dart_tool/package_config.json'),JSON.stringify(cfg));
 fs.copyFileSync(path.join(spec,'examples-flutter.dart'),path.join(temporary,'examples.dart'));
 command('dart',['analyze','--fatal-infos',path.join(temporary,'examples.dart')],temporary);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
} else checks.flutterExamples='not run (--skip-flutter; separate Flutter job required)';
// Historical preservation audit is opt-in; it is not a product implementation gate.
if (process.argv.includes('--historical-baseline')) {
const baseline=json(path.join(evidence,'baseline.json'));
const allowed=new Set(['README.md','components.md','basic-set.md','adoption.md','handoff.md','system-review.md','validation.md'].map(p=>'docs/brand/ddirori-design-system/'+p));
const changed=[];
for(const [p,hash]of Object.entries(baseline.hashes)) {
 if(!fs.existsSync(path.join(root,p))||sha(path.join(root,p))!==hash){changed.push(p);assert(allowed.has(p),`Changed since historical documentation baseline: ${p}`);}
}
checks.baseline={compared:Object.keys(baseline.hashes).length,changed,scope:'Historical documentation-only baseline; later product changes are expected to differ.'};
} else checks.baseline={status:'not requested',scope:'Current-task preservation is audited separately; historical evidence is not overwritten.'};
command(process.execPath,[path.join(base,'tools/build.mjs'),'--check']);
command('git',['diff','--check']);
const hashes={};for(const p of [...files(spec),...new Set([...api.react,...api.dart].map(e=>path.join(root,e.file))),path.join(base,'tokens.json'),path.join(base,'palette-pilot.json'),path.join(base,'color-system.json')])hashes[rel(p)]=sha(p);
const report={recordedAt:new Date().toISOString(),passed:errors.length===0,checks,commands,sourceHashes:hashes,errors,limitations:['Document/API/example verification only; product changes and UI checks are reported by the separate adoption run.','Historical UI evidence remains historical; browser, device, screen-reader and audio behavior require the linked implementation acceptance checks.','Baseline comparison covers recorded files; unrelated concurrent additions are not deleted or attributed to this task.']};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,checks,errors},null,2));
process.exitCode=errors.length?1:0;
