const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {execFileSync}=require('node:child_process')
const assert=require('node:assert/strict')
const root=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:__dirname,encoding:'utf8'}).trim()
const resolve=file=>path.join(root,file)
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const write=(file,data)=>{const target=path.join(__dirname,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data)}
const json=(file,data)=>write(file,JSON.stringify(data,null,2)+'\n')
const copy=(file,target)=>{const to=path.join(__dirname,target);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(resolve(file),to)}
const before='out/ddirori/studio-r3-baseline'
const files=['src/renderer/src/App.tsx','src/renderer/src/App.test.tsx','src/renderer/src/studio-r3.css','scripts/verify-studio-first-use.cjs']
let diff=''
for(const file of files){
  const old=file.endsWith('App.tsx')?`${before}/${file}`:file.endsWith('App.test.tsx')?`${before}/${file}.snapshot`:'/dev/null'
  try {diff+=execFileSync('git',['diff','--no-index','--',old,file],{cwd:root,encoding:'utf8'})}
  catch(error){if(error.status!==1)throw error;diff+=error.stdout}
}
write('r3-only.diff',diff)
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
const manifest='docs/brand/ddirori-design-system/product-design-r3/revision.json'
const manifestSha=hash(resolve(manifest))
assert.equal(manifestSha,'a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36')
json('source.json',{implementation:'uncommitted',head,designManifestSha256:manifestSha,
  baseline:JSON.parse(fs.readFileSync(resolve(`${before}/source.json`))),files:files.map(file=>({path:file,sha256:hash(resolve(file))}))})
const r2='docs/brand/ddirori-design-system/product-design-r2/returns/studio-product-design-r2'
const protectedFiles=JSON.parse(fs.readFileSync(resolve(`${r2}/source.json`))).files.filter(file=>!['src/renderer/src/App.tsx','src/renderer/src/App.test.tsx'].includes(file.path))
for(const file of protectedFiles)assert.equal(hash(resolve(file.path)),file.sha256,`R2 dependency changed: ${file.path}`)
json('protected-r2.json',protectedFiles.map(file=>({...file,unchanged:true})))
for(const file of fs.readdirSync(resolve('out/ddirori')).filter(file=>file.startsWith('studio-r3-')&&file.endsWith('.log')))
  copy(`out/ddirori/${file}`,`logs/${file.replace('studio-r3-','')}`)
for(const file of fs.readdirSync(resolve('out/ddirori/studio-r3-renderer'))){
  const diagnostic=/^(failure|keyboard-red)/.test(file)
  copy(`out/ddirori/studio-r3-renderer/${file}`,`artifacts/${diagnostic?'diagnostics':'renderer'}/${file}`)
}
const results=JSON.parse(fs.readFileSync(resolve('out/ddirori/studio-r3-renderer/results.json')))
assert.equal(results.recoveryVerified,true)
assert.equal(results.enlargedText,results.normalText*2)
assert.ok(results.coarse.height>=48)
const checks=[
  ['product-tests-final','npm test -- --dir src --reporter=dot','pass',/621 passed/],
  ['focused-final','npm test -- src\/renderer\/src\/App.test.tsx -t studio.r3','pass',/10 passed/],
  ['root-tests','npm test -- --reporter=dot','fail',/7 failed/],
  ['shared-tests','npm --prefix packages/ddirori_web test','pass',/56 passed/],
  ['node-tests','node --test docs/brand/ddirori-design-system/tools/api-portability.test.mjs docs/brand/ddirori-design-system/tools/token-model.test.mjs','pass',/# pass 4/],
  ['typecheck','npm run typecheck','pass',/tsc --noEmit/],
  ['build','npm run build','pass',/built in/],
  ['renderer','env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-first-use.cjs','pass',/R3 actual first-use.*passed/],
  ['r2-regression','env -u ELECTRON_RUN_AS_NODE DDIRORI_STUDIO_QA_OUT=out/ddirori/studio-r3-r2-regression npx electron scripts/verify-ddirori-studio.cjs --r2','pass',/R2 command context.*passed/],
  ['fixed-canvas','env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-notation-snapshots.cjs --fixed-canvas','pass',/Verified notation snapshots/],
  ['revision-check',`python3 ${manifest.replace('revision.json','revision.py')}`,'changed',/R3 inputs changed/]
].map(([name,command,result,pattern])=>{
  const log=fs.readFileSync(resolve(`out/ddirori/studio-r3-${name}.log`),'utf8')
  assert.match(log,pattern)
  return {command,result,log:`logs/${name}.log`,summary:log.match(/Test Files[^\n]*\n[^\n]*/)?.[0]}
})
const pdf=path.join(__dirname,'artifacts/renderer/practice.pdf')
json('return.json',{service:'studio',status:'implemented-awaiting-review',implementationCommit:'uncommitted',baseProductCommit:'827ad18203e673b1e923d00cbcf0fd7f3af755d7',currentHead:head,
  designRevision:'product-design-r3',designManifestSha256:manifestSha,backlog:['R3-T01','R3-J01'],
  actualExecution:results,checks,pdf:{file:'artifacts/renderer/practice.pdf',sha256:hash(pdf),
    info:execFileSync('pdfinfo',[pdf],{encoding:'utf8'}),raster:'artifacts/renderer/practice.png',scope:'Actual App export scene and production preload with QA IPC disk destination; not an OS dialog or Score receipt'},
  mapping:'handoff.md',sharedChanges:[],metadataCheck:'not-applicable: desktop-only; concurrent iOS changes not owned by this task',
  sourceVerified:['real native project file and reopen','actual score note and undo/redo','real recovery payload and reopen','real MusicXML serializer','actual App PDF scene and bytes'],
  receiverVerified:false,unverified:['mobile file transfer','Score internal copy and PDF ready','Score annotation/practice','physical Korean IME','OS file dialogs and menu','screen reader','physical touch hardware','representative user score and human usability'],
  knownFailures:['Root Vitest missing DOM/Node-native collection configuration','Pre-existing responsive baseline differences retained in R2; no baseline updated']})
const artifacts=[]
const walk=folder=>{for(const item of fs.readdirSync(path.join(__dirname,folder),{withFileTypes:true})){
  const file=path.join(folder,item.name);if(item.isDirectory())walk(file);else artifacts.push(file)
}}
walk('artifacts');walk('logs')
write('artifact-sha256.txt',artifacts.sort().map(file=>`${hash(path.join(__dirname,file))}  ${file}`).join('\n')+'\n')
console.log(JSON.stringify({head,implementation:'uncommitted',artifacts:artifacts.length,protectedR2Files:protectedFiles.length,manifestSha},null,2))
