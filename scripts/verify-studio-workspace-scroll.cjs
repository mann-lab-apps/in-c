// Real manual wheel ownership; preserves existing keyboard focus and score.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_WORKSPACE_SCROLL_OUT||'out/ddirori/workspace-scroll')
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-scroll-intent-')))
for(const name of ['recent-musicxml:list','recent-musicxml:add','project:list-backups'])ipcMain.handle(name,()=>[])
for(const name of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(name,()=>null)
let win;const rows=[];const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
const read=()=>run(()=>({scrollY,focus:document.activeElement?.getAttribute('data-event-id'),document:document.querySelector('.studio-document').textContent,file:[...document.querySelectorAll('button')].find(n=>n.textContent.trim()==='파일').getBoundingClientRect().toJSON()}))
app.whenReady().then(async()=>{const deadline=setTimeout(()=>app.exit(124),30000)
try{for(const width of [960,1400]){
 win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.setContentSize(width,800)
 await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});await run(()=>document.fonts.ready);await settle();app.focus({steal:true});win.focus()
 const at=await run(()=>{const n=document.querySelector('[aria-label="악보로 이동"]'),r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})
 win.webContents.sendInputEvent({type:'mouseMove',...at});for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...at,button:'left',clickCount:1})
 await new Promise(r=>setTimeout(r,120));await settle();const before=await read();assert(before.focus,'Existing score navigation must focus a real event')
 await run(()=>{window.__manualWheel=[];addEventListener('wheel',e=>window.__manualWheel.push({deltaY:e.deltaY,trusted:e.isTrusted}),{capture:true})})
 const wheel={x:width-24,y:400};win.webContents.sendInputEvent({type:'mouseMove',...wheel});win.webContents.sendInputEvent({type:'mouseWheel',...wheel,deltaX:0,deltaY:1500,canScroll:true,hasPreciseScrollingDeltas:true})
 const samples=[];for(let i=0;i<5;i++){await new Promise(r=>setTimeout(r,60));await settle();samples.push(await read())}
 const last=samples.at(-1),events=await run(()=>window.__manualWheel);rows.push({width,before,samples,events});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,width+'.png'),(await win.webContents.capturePage()).toPNG())
 assert(events.some(e=>e.trusted&&e.deltaY<0),'Native upward wheel must reach the renderer')
 assert(last.file.top>=0&&last.file.bottom<=800,'Manual upward scrolling must expose File instead of snapping back to the focused score')
 assert.equal(last.focus,before.focus);assert.equal(last.document,before.document)
 win.destroy();win=undefined
}console.log('PASS actual wheel ownership',rows.length)}
finally{clearTimeout(deadline);win?.destroy();app.quit()}}).catch(e=>{console.error(e);app.exit(1)})
