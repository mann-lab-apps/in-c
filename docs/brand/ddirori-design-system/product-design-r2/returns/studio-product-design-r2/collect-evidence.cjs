// Collect completed local runs without changing the historical design manifest.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const {execFileSync} = require('node:child_process')
const assert = require('node:assert/strict')
const root = execFileSync('git',['rev-parse','--show-toplevel'],{cwd:__dirname,encoding:'utf8'}).trim()
const source = name => path.join(root,name)
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const read = name => fs.readFileSync(source(name),'utf8')
const write = (name,data) => {
  const target=path.join(__dirname,name)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,data)
}
const json = (name,data) => write(name,JSON.stringify(data,null,2)+'\n')
const copy = (from,to) => {
  const target=path.join(__dirname,to)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.copyFileSync(source(from),target)
}
const files = [
  'src/renderer/src/App.tsx','src/renderer/src/App.test.tsx',
  'src/renderer/src/SpanProperties.tsx','src/renderer/src/SpanProperties.test.tsx',
  'src/renderer/src/editor/keyboard-input.ts','src/renderer/src/editor/keyboard-input.test.ts',
  'src/renderer/src/notation/NotationPreview.tsx','src/renderer/src/studio-r2.css',
  'scripts/verify-ddirori-studio.cjs','scripts/verify-studio-input-events.cjs'
]
const git = args => execFileSync('git',args,{cwd:root,encoding:'utf8'})
const head = git(['rev-parse','HEAD']).trim()
const base = '827ad18203e673b1e923d00cbcf0fd7f3af755d7'
let diff=git(['diff','--',...files])
for(const file of files) {
  if(!git(['ls-files','--',file]).trim()) {
    try { diff+=git(['diff','--no-index','--','/dev/null',file]) }
    catch(error) { if(error.status!==1) throw error; diff+=error.stdout }
  }
}
write('artifacts/implementation.diff',diff)
write('source-sha256.txt',files.map(file=>`${sha(fs.readFileSync(source(file)))}  ${file}`).join('\n')+'\n')
json('source.json',{head,implementation:'uncommitted',files:files.map(file=>({path:file,sha256:sha(fs.readFileSync(source(file)))}))})
json('protected-contracts.json',[
  'src/score-core/commands.ts','src/score-core/types.ts','src/project/schema.ts','src/musicxml/serialize.ts',
  'src/renderer/src/styles.css','src/renderer/src/studio-r1.css','docs/testing/notation-snapshot-baseline.json'
].map(file=>{
  const current=sha(fs.readFileSync(source(file)))
  const original=sha(execFileSync('git',['show',`${base}:${file}`],{cwd:root}))
  assert.equal(current,original,`Protected contract changed: ${file}`)
  return {path:file,baseSha256:original,currentSha256:current,unchanged:true}
}))

const manifestPath='docs/brand/ddirori-design-system/product-design-r2/revision.json'
const manifest=JSON.parse(read(manifestPath))
const manifestSha=sha(fs.readFileSync(source(manifestPath)))
assert.equal(manifestSha,'af56b0a3ca6e25b9928835645562f5056cfa16553f2881bdb9750df37636f416')
json('shared-dependencies.json',Object.entries(manifest.dependencies).filter(([file])=>file.startsWith('packages/ddirori_web/')).map(([file,expected])=>{
  const actual=sha(fs.readFileSync(source(file)))
  return {path:file,designSha256:expected,currentSha256:actual,unchangedFromDesign:expected===actual,editedByStudioTask:false}
}))

for(const file of fs.readdirSync(source('out/ddirori')).filter(name=>name.startsWith('studio-r2-')&&name.endsWith('.log'))) {
  copy(`out/ddirori/${file}`,`logs/${file.replace('studio-r2-','')}`)
}
fs.cpSync(source('out/ddirori/studio-r2-final-renderer'),path.join(__dirname,'artifacts/renderer'),{recursive:true})
for(const folder of ['studio-r2-t04-baseline','studio-r2-t04-batch-baseline','studio-r2-t04-focus-control-2','studio-r2-final-events']) {
  copy(`out/ddirori/${folder}/event-traces.json`,`artifacts/events/${folder}.json`)
}
for(const file of ['file-light-1400.png','file-toolbar-metrics.json']) {
  copy(`out/ddirori/studio-r2-toolbar-red/${file}`,`artifacts/toolbar-red/${file}`)
}
for(const file of ['r2-next-input-960.png','r2-input-layout.json']) {
  copy(`out/ddirori/studio-r2-input-layout-red/${file}`,`artifacts/input-layout-red/${file}`)
}
const responsiveLog=read('out/ddirori/studio-r2-responsive-baseline.log')
const responsiveDiff=responsiveLog.match(/Diff: (.*?). Screenshots:/)[1]
fs.copyFileSync(responsiveDiff,path.join(__dirname,'artifacts/responsive-diff.json'))
for(const width of [960,1400]) {
  fs.copyFileSync(path.join(path.dirname(responsiveDiff),`in-c-notation-snapshot-${width}.png`),path.join(__dirname,`artifacts/responsive-${width}.png`))
}

const before=source('out/ddirori/studio-r2-final-renderer/r2-export-before.png')
const after=source('out/ddirori/studio-r2-final-renderer/r2-export-after.png')
assert.equal(sha(fs.readFileSync(before)),sha(fs.readFileSync(after)))
const pdfs=['before','after'].map(stage=>{
  const file=`artifacts/renderer/r2-export-${stage}.pdf`
  return {file,sha256:sha(fs.readFileSync(path.join(__dirname,file))),
    pdfinfo:execFileSync('pdfinfo',[path.join(__dirname,file)],{encoding:'utf8'})}
})
json('pdf-equivalence.json',{scope:'Actual App PDF export scene; isolated file bridge, no OS dialog',
  renderer:'pdftoppm -png -scale-to 1200 -singlefile',pdfs,
  rasterSha256:sha(fs.readFileSync(before)),rasterIdentical:true})

const results=[
  ['product-tests-final','npm test -- --dir src --reporter=dot','pass',/48 passed.*1 skipped/s,{filesPassed:48,testsPassed:611,testsSkipped:1}],
  ['root-tests','npm test -- --reporter=dot','fail',/7 failed.*51 passed.*1 skipped/s,{filesFailed:7,testsFailed:12,testsPassed:619,testsSkipped:23}],
  ['shared-tests','npm --prefix packages/ddirori_web test','pass',/56 passed/,{filesPassed:6,testsPassed:56}],
  ['node-tests','node --test docs/brand/ddirori-design-system/tools/api-portability.test.mjs docs/brand/ddirori-design-system/tools/token-model.test.mjs','pass',/# pass 4/,{testsPassed:4}],
  ['typecheck','npm run typecheck','pass',/tsc --noEmit/,{}],
  ['final-build','npm run build','pass',/built in/,{}],
  ['final-renderer','env -u ELECTRON_RUN_AS_NODE DDIRORI_STUDIO_QA_OUT=out/ddirori/studio-r2-final-renderer npx electron scripts/verify-ddirori-studio.cjs --r2','pass',/R2 command context and responsive\/fixed workspace matrix passed/,{}],
  ['final-events','env -u ELECTRON_RUN_AS_NODE DDIRORI_STUDIO_EVENT_OUT=out/ddirori/studio-r2-final-events npx electron scripts/verify-studio-input-events.cjs --focus-control','pass',/"runs": 36/,{}],
  ['fixed-canvas','env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-notation-snapshots.cjs --fixed-canvas','pass',/Verified notation snapshots/,{}],
  ['responsive-baseline','env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-notation-snapshots.cjs','fail',/Notation snapshot metrics changed/,{}],
  ['manifest-check',`python3 ${manifestPath.replace('revision.json','revision.py')}`,'changed',/R2 inputs\/artifacts changed/,{}],
  ['roadmap','npm run verify:chromatics-musescore-parity-roadmap','pass',/"status": "passed"/,{}],
  ['work-queue','npm run verify:chromatics-v1-work-queue','pass',/"status": "passed"/,{}]
].map(([name,command,result,pattern,counts])=>{
  assert.match(read(`out/ddirori/studio-r2-${name}.log`),pattern)
  return {command,result,counts,log:`logs/${name}.log`}
})
const events=JSON.parse(read('out/ddirori/studio-r2-final-events/event-traces.json'))
assert.equal(events.records.length,36)
assert.ok(events.records.every(record=>record.passed))
const renderer=JSON.parse(read('out/ddirori/studio-r2-final-renderer/r1-results.json'))
const workspace=JSON.parse(read('out/ddirori/studio-r2-final-renderer/r2-workspace.json'))
json('return.json',{
  service:'studio',designRevision:'product-design-r2',implementationCommit:'uncommitted',baseProductCommit:base,currentHead:head,
  designManifestSha256:manifestSha,status:'implemented-awaiting-review',backlog:['T04','T02','T03','T01'],
  actualProduct:{fixture:'release-test',kind:'Electron-built renderer, actual serializers, isolated OS-I/O bridge',
    runtime:workspace.versions,screens:renderer.screens,workspaceMatrix:workspace.records,
    additionalScreens:['no-span-selection','invalid-geometry','save-pending','save-failure','save-retry-success','file-light-1400','file-text-2','r2-next-input-960','r2-next-input-text-2'].map(name=>({file:`artifacts/renderer/${name}.png`,condition:'See handoff and renderer metrics; existing accent, measured chrome text scaling only'})),
    touch:renderer.touch,nativeScoreUnchanged:workspace.nativeScoreUnchanged,musicXmlUnchanged:workspace.musicXmlUnchanged},
  tests:results,t04:{backgroundNegativeControls:12,foregroundSynthetic:12,foregroundKeyboardInsertion:12,failedForeground:0,physicalIME:false},
  differences:['All seven actual command categories retained','Native endpoint Select and app GeometryInput retained','Narrow R1 stacked dock policy retained','Screen-only fixed view is workspace state, not PDF geometry'],
  sharedProposals:[],metadataCheck:'not-applicable: desktop-only task; no iOS metadata edited by this task',
  unverified:['physical Korean IME','actual OS file dialogs and menu','screen reader','real touch hardware','representative user score and external-app interchange','independent insertion caret glyph unavailable'],
  knownFailures:['Root Vitest collection/configuration: missing DOM and Node test files','Legacy responsive baseline at both960/1400; unchanged baseline retained'],
  preview:'http://127.0.0.1:5178/?fixture=release-test'
})
const artifactFiles=[]
const walk=folder=>{for(const item of fs.readdirSync(path.join(__dirname,folder),{withFileTypes:true})) {
  const relative=path.join(folder,item.name)
  if(item.isDirectory()) walk(relative)
  else artifactFiles.push(relative)
}}
walk('artifacts'); walk('logs')
write('artifact-sha256.txt',artifactFiles.sort().map(file=>`${sha(fs.readFileSync(path.join(__dirname,file)))}  ${file}`).join('\n')+'\n')
console.log(JSON.stringify({head,files:files.length,artifacts:artifactFiles.length,designManifestSha256:manifestSha,rootGate:'failed and retained',productTests:611},null,2))
