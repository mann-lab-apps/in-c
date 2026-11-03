// Actual welcome controls, owned deferred startup errors and disk-backed retry.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const source=path.resolve(process.env.DDIRORI_STARTUP_FEEDBACK_INPUT),out=path.resolve(process.env.DDIRORI_STARTUP_FEEDBACK_OUT),root=path.resolve(process.env.DDIRORI_STARTUP_FEEDBACK_APP_ROOT||'.')
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-startup-feedback-')))
let win,scene,background,format,rejectBackground,attempts
const file=p=>({filePath:p,fileName:path.basename(p),contents:fs.readFileSync(p,'utf8')})
ipcMain.handle('recent-musicxml:list',()=>background==='recent-list'?new Promise((_resolve,reject)=>{rejectBackground=reject}):[])
ipcMain.handle('autosave:read',()=>background==='recovery'?new Promise((_resolve,reject)=>{rejectBackground=reject}):null)
for(const n of['recent-musicxml:add','project:list-backups'])ipcMain.handle(n,()=>[])
for(const n of['autosave:clear','autosave:write'])ipcMain.handle(n,()=>null)
for(const [channel,name]of[['project:open','incoming.chromatics'],['musicxml:open','incoming.musicxml']])ipcMain.handle(channel,()=>{if(++attempts===1)throw Error('Newest owned file failure');return file(path.join(source,name))})
ipcMain.handle('project:save',(_,v)=>{const p=path.join(scene,'retry.chromatics');fs.writeFileSync(p,v.contents);return{filePath:p,fileName:path.basename(p)}})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{error:String(e.stack||e)}}})()`);if(r.error)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,arg)=>{const end=Date.now()+12000;while(!await run(fn,arg)){assert(Date.now()<end,'Finite startup feedback deadline');await settle()}}
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n||n.disabled)throw Error('Unavailable public control '+label);n.scrollIntoView({block:'nearest'});n.focus();n.click()},label);await settle()}
const read=()=>run(()=>({text:document.querySelector('.studio-start')?.textContent,active:document.activeElement?.getAttribute('aria-label'),newestDiagnostic:[...document.querySelectorAll('.studio-start *')].some(n=>n.childElementCount===0&&n.textContent.includes('Newest owned file failure')&&!n.checkVisibility())}))
app.whenReady().then(async()=>{const timer=setTimeout(()=>app.exit(124),120000),rows=[]
try{for(const width of[960,1400])for(background of['recovery','recent-list'])for(format of['native','xml']){
 console.log('START',width,background,format);scene=path.join(out,`${width}-${background}-${format}`);fs.mkdirSync(scene,{recursive:true});rejectBackground=undefined;attempts=0;nativeTheme.themeSource=width===960?'dark':'light'
 win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.setContentSize(width,800);await win.loadFile(path.join(root,'out/renderer/index.html'));await settle();assert(rejectBackground)
 const label=format==='native'?'프로젝트 열기':'MusicXML 가져오기';await click(label);await wait(()=>document.querySelector('.studio-start')?.textContent.includes('Newest owned file failure'));const before=await read();assert(before.newestDiagnostic)
 rejectBackground(Error('Obsolete background startup failure'));await settle();const after=await read();fs.writeFileSync(path.join(scene,'transition.json'),JSON.stringify({before,after},null,2));assert.equal(after.text,before.text,'Older startup error must not replace latest explicit read diagnostic');assert(after.newestDiagnostic)
 fs.writeFileSync(path.join(scene,'failure.png'),(await win.webContents.capturePage()).toPNG());await click(label);await wait(()=>Boolean(document.querySelector('.studio-document')));await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'))
 const saved=JSON.parse(fs.readFileSync(path.join(scene,'retry.chromatics')));assert.equal(saved.score.title,'Older pending response');if(format==='native')assert.deepEqual(saved,JSON.parse(fs.readFileSync(path.join(source,'incoming.chromatics'))))
 rows.push({width,background,format,before,after,retrySaved:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
}console.log('PASS latest startup feedback',rows.length)}finally{clearTimeout(timer);win?.destroy();app.quit()}}).catch(e=>{console.error(e);app.exit(1)})
