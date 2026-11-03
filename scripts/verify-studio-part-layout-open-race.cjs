// Real renderer/save/read/menu/key flow; explicit confirm stub, NOT an OS-dialog test.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const source=path.resolve(process.env.DDIRORI_PART_OPEN_RACE_QA_DIR),out=path.resolve(process.env.DDIRORI_PART_OPEN_RACE_OUT),root=path.resolve(process.env.DDIRORI_PART_OPEN_RACE_APP_ROOT||'.')
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-part-open-race-')))
let win,scene,queued,release,opened
const result=p=>({filePath:p,fileName:path.basename(p)}),file=p=>({...result(p),contents:fs.readFileSync(p,'utf8')})
for(const n of ['recent-musicxml:list','recent-musicxml:add','project:list-backups'])ipcMain.handle(n,()=>[])
for(const n of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(n,()=>null)
ipcMain.handle('project:open',()=>queued==='native'?new Promise(resolve=>{release=()=>resolve(file(path.join(source,'incoming.chromatics')))}):file(opened))
ipcMain.handle('musicxml:open',()=>new Promise(resolve=>{release=()=>resolve(file(path.join(source,'incoming.musicxml')))}))
ipcMain.handle('project:save',(_,v)=>{opened=path.join(scene,'current.chromatics');fs.writeFileSync(opened,v.contents);return result(opened)})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{error:String(e.stack||e)}}})()`);if(r.error)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,arg)=>{const until=Date.now()+12000;while(!await run(fn,arg)){assert(Date.now()<until,'Finite native race deadline');await settle()}}
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n||n.disabled)throw Error('Unavailable public control '+label);n.scrollIntoView({block:'nearest'});n.focus();n.click()},label);await settle()}
const key=async(keyCode,modifiers=[])=>{app.focus({steal:true});win.focus();win.webContents.focus();await wait(()=>document.hasFocus());win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const title=async value=>{await click('파트보 제목 수정');await run(value=>{const n=document.querySelector('input[aria-label="파트보 제목 입력"]');if(!n?.checkVisibility()||n.disabled)throw Error('Visible actual part title field required');n.scrollIntoView({block:'nearest'});n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}))},value);await key('Enter')}
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));fs.copyFileSync(opened,path.join(scene,name+'.chromatics'));return JSON.parse(fs.readFileSync(opened))}
const read=()=>run(()=>({title:document.querySelector('.score-title')?.textContent,partTitle:document.querySelector('[aria-label="파트보 제목 수정"]')?.textContent,dirty:document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경'),confirms:window.__confirmRows,selection:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)}))
app.whenReady().then(async()=>{const deadline=setTimeout(()=>app.exit(124),180000),rows=[]
try{for(const width of [960,1400])for(const format of ['native','xml'])for(const outcome of ['refuse','accept','unchanged']){
 console.log('START',width,format,outcome);scene=path.join(out,`${width}-${format}-${outcome}`);fs.mkdirSync(scene,{recursive:true});opened=path.join(source,'source.chromatics');queued=undefined;release=undefined
 nativeTheme.themeSource=width===960?'dark':'light';win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.setContentSize(width,800);await win.loadFile(path.join(root,'out/renderer/index.html'));await settle()
 await run(()=>{window.__confirmRows=[];window.__confirmAnswer=true;window.confirm=message=>{window.__confirmRows.push(message);return window.__confirmAnswer}})
 await click('프로젝트 열기');await wait(()=>document.querySelector('.score-title')?.textContent.includes('Independent part structural layout'))
 if(outcome!=='unchanged')await title('Initial dirty title')
 queued=format;await click('파일');await click(format==='native'?'프로젝트 열기':'MusicXML 가져오기');assert(release,'Owned read must be pending')
 if(outcome!=='unchanged'){await title('Saved intermediate title');const saved=await save('intermediate');assert.equal(saved.partLayouts.find(p=>p.partId==='P2').title,'Saved intermediate title');await title('Latest unsaved title')}
 await run(outcome=>{window.__confirmRows=[];window.__confirmAnswer=outcome==='accept'},outcome)
 const before=await read();release();queued=undefined;await wait(()=>window.__confirmRows.length>0||document.querySelector('.score-title')?.textContent.includes('Older pending response'));const after=await read()
 fs.writeFileSync(path.join(scene,'transition.json'),JSON.stringify({before,after},null,2))
 assert.equal(after.confirms.length,outcome==='unchanged'?0:1,'Only changed pending reads must reconfirm')
 if(outcome==='refuse'){
  assert(after.dirty);assert.equal(after.title,before.title);assert.equal(after.partTitle,'Latest unsaved title');assert.deepEqual(after.selection,before.selection)
  const original=JSON.parse(fs.readFileSync(path.join(source,'source.chromatics'))),latest=await save('latest');assert.deepEqual(latest.score,original.score);assert.deepEqual(latest.partLayouts.filter(p=>p.partId!=='P2'),original.partLayouts.filter(p=>p.partId!=='P2'));assert.equal(latest.partLayouts.find(p=>p.partId==='P2').title,'Latest unsaved title')
  await click('악보로 이동');await key('Z',['control']);const undo=await save('undo');assert.equal(undo.partLayouts.find(p=>p.partId==='P2').title,'Saved intermediate title')
 }else{assert(after.title.includes('Older pending response'));assert(!after.dirty)}
 fs.writeFileSync(path.join(scene,'screen.png'),(await win.webContents.capturePage()).toPNG());rows.push({width,format,outcome,before,after,scope:'Actual renderer/disk save/read/native keys; controlled confirm return, not physical OS modal'});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
}console.log('PASS part layout pending-read protection',rows.length)}finally{clearTimeout(deadline);win?.destroy();app.quit()}}).catch(e=>{console.error(e);app.exit(1)})
