// Electron host for real renderer/PDF curve QA. Native file dialogs are adapted
// to owned fixtures; physical IME/OS dialogs are not covered.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const {app,BrowserWindow,dialog}=require('electron')
const root=path.resolve(__dirname,'..'),arg=process.argv.find(s=>s.startsWith('--qa-dir='));assert(arg,'owned --qa-dir required')
const out=path.resolve(arg.slice(9));assert(!fs.existsSync(out),'Use a fresh evidence folder');fs.mkdirSync(out,{recursive:true})
const sourceDir=process.argv.find(s=>s.startsWith('--source-dir='))?.slice(13)
const renderer=process.argv.find(s=>s.startsWith('--renderer-file='))?.slice(16)
process.argv.push('--piano-audit');process.env.DDIRORI_PIANO_QA_DATA=path.join(out,'profile');fs.mkdirSync(process.env.DDIRORI_PIANO_QA_DATA)
const deadline=setTimeout(()=>{console.error('CURVE_QA_DEADLINE');app.exit(1)},90000)
const pause=ms=>new Promise(r=>setTimeout(r,ms)),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const wait=async(fn,label)=>{const end=Date.now()+15000;while(!await fn()){assert(Date.now()<end,label);await pause(25)}}
let currentFile,currentPdf
const files=[]
async function run(){
 const compiled=path.join(out,'fixture.cjs');require('esbuild').buildSync({stdin:{contents:"export {createStudioCurveFixture} from './src/testing/studio-curve-fixture';export {encodeNativeProject} from './src/project/schema';",resolveDir:root},platform:'node',format:'cjs',bundle:true,outfile:compiled})
 const fixture=require(compiled)
 for(const mode of ['auto','manual','cross']){const file=path.join(out,mode+'.chromatics');if(sourceDir)fs.copyFileSync(path.join(path.resolve(sourceDir),mode+'.chromatics'),file);else fs.writeFileSync(file,fixture.encodeNativeProject(fixture.createStudioCurveFixture(mode)));files.push({mode,file,sha256:sha(file)})}
 dialog.showOpenDialog=async()=>({canceled:false,filePaths:[currentFile]});dialog.showSaveDialog=async()=>({canceled:false,filePath:currentPdf})
 require(path.join(root,'out/main/index.js'));await app.whenReady();await wait(()=>BrowserWindow.getAllWindows().length,'window')
 const window=BrowserWindow.getAllWindows()[0],web=window.webContents
 if(renderer)await window.loadFile(path.resolve(renderer))
 const evaluate=(fn,arg)=>web.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`,true)
 await wait(()=>evaluate(()=>!!document.querySelector('.start-screen')),'welcome')
 const click=async label=>{
  const b=await evaluate(label=>{const n=[...document.querySelectorAll('button,[role=menuitem]')].find(n=>(n.getAttribute('aria-label')===label||n.textContent.trim()===label)&&n.getClientRects().length);if(!n||n.disabled)throw Error('No enabled '+label);n.scrollIntoView({block:'center',behavior:'instant'});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const r=n.getBoundingClientRect(),p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!n.contains(p)&&n!==p)throw Error('Blocked '+label);resolve({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)})})))},label)
  web.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...b});web.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...b});await pause(50)
 }
 const rows=[]
 for(const width of [960,1400])for(const fixture of files){
  currentFile=fixture.file;currentPdf=path.join(out,`${fixture.mode}-${width}.pdf`);window.setContentSize(width,900)
  if(await evaluate(()=>!!document.querySelector('.start-screen')))await click('프로젝트 열기');else{await click('파일');await click('프로젝트 열기')}
  await wait(()=>window.getTitle().includes(`Curve QA ${fixture.mode}`),'open curve source')
  await evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));document.querySelector('.notation-slur')?.scrollIntoView({block:'center',behavior:'instant'})})
  const ink=await evaluate(()=>({slurs:[...document.querySelectorAll('.notation-slur')].map(p=>({d:p.getAttribute('d'),centerline:p.dataset.slurCenterline,fill:getComputedStyle(p).fill,stroke:getComputedStyle(p).stroke,system:p.dataset.systemIndex,hit:p.parentElement.querySelector('.notation-span-hit')?.getAttribute('d')})),ties:[...document.querySelectorAll('.vf-stavetie path')].map(p=>({d:p.getAttribute('d'),fill:getComputedStyle(p).fill,stroke:getComputedStyle(p).stroke}))}))
  assert(ink.slurs.length>0&&ink.ties.length>0,'real slur and tie ink')
  if(!renderer){for(const p of ink.slurs){assert(p.d.endsWith(' Z'));assert.equal(p.hit,p.centerline);assert.equal(p.stroke,'none');assert.equal(p.fill,'rgb(0, 0, 0)')}}
  const image=path.join(out,`${fixture.mode}-${width}.png`);fs.writeFileSync(image,(await web.capturePage()).toPNG())
  await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>fs.existsSync(currentPdf),'actual PDF write')
  assert.equal(sha(fixture.file),fixture.sha256,'native source/manual geometry unchanged')
  rows.push({width,mode:fixture.mode,ink,pdf:path.basename(currentPdf),image:path.basename(image),sourceUnchanged:true})
 }
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({renderer:renderer??'current out/renderer',sources:files,rows,physicalDialogs:false},null,2)+'\n')
 window.destroy();clearTimeout(deadline);app.quit()
}
run().catch(e=>{console.error(e);clearTimeout(deadline);app.exit(1)})
