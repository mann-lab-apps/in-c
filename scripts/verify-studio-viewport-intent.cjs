// Native focus/wheel with an owned RAF gate; not physical timing/OS scrollbar proof.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {scaleStudioChromeText}=require('./studio-text-scale.cjs')
const root=path.resolve(process.env.DDIRORI_VIEWPORT_APP_ROOT||'.'),out=path.resolve(process.env.DDIRORI_VIEWPORT_INTENT_OUT||'out/ddirori/viewport-intent')
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-viewport-intent-')))
for(const name of ['recent-musicxml:list','recent-musicxml:add','project:list-backups'])ipcMain.handle(name,()=>[])
for(const name of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(name,()=>null)
let win;const rows=[];const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>new Promise(r=>window.__nativeRAF(()=>window.__nativeRAF(r))))
const read=()=>run(()=>{const n=document.activeElement,r=n.getBoundingClientRect();return{scrollY,focus:{tag:n.tagName,label:n.getAttribute('aria-label'),id:n.id,rect:r.toJSON()},value:document.querySelector('[aria-label="표기 기호 검색"]')?.value,document:document.querySelector('.studio-document').textContent,selection:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),held:window.__heldFrames.size,innerWidth,clientWidth:document.documentElement.clientWidth}})
app.whenReady().then(async()=>{const deadline=setTimeout(()=>app.exit(124),45000)
try{for(const width of [960,1400])for(const scale of [1,2]){
 win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.setContentSize(width,800)
 await win.loadFile(path.join(root,'out/renderer/index.html'),{query:{fixture:'release-test'}});await run(()=>document.fonts.ready);if(scale===2)await run(scaleStudioChromeText);app.focus({steal:true});win.focus()
 await run(()=>{
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);window.__nativeRAF=request;window.__heldFrames=new Map();window.__rafGate=false;let id=0
  window.requestAnimationFrame=cb=>{if(!window.__rafGate)return request(cb);const key=--id;window.__heldFrames.set(key,cb);return key}
  window.cancelAnimationFrame=key=>{if(key<0)window.__heldFrames.delete(key);else cancel(key)}
  window.__intentEvents=[];for(const type of ['wheel','pointerdown','focusin'])window.addEventListener(type,e=>window.__intentEvents.push({type:e.type,trusted:e.isTrusted,deltaY:e.deltaY,target:e.target?.getAttribute?.('aria-label'),id:e.target?.id}),true)
 })
 await settle();win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['shift']});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['shift']});await settle()
 const setup=await read();assert.notEqual(setup.focus.id,await run(()=>document.querySelector('input[type="search"]').id),'Setup must focus another real control before the search click')
 const point=await run(()=>{const n=document.querySelector('input[type="search"]');if(!n)throw Error('Palette search missing');n.scrollIntoView({block:'center',behavior:'instant'});const r=n.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!n.contains(document.elementFromPoint(x,y)))throw Error('Search pointer not owned');return{x,y}})
 await settle();await run(()=>{window.__rafGate=true})
 win.webContents.sendInputEvent({type:'mouseMove',...point});for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1})
 await settle();const before=await read();assert.equal(before.focus.tag,'INPUT');assert(before.held>0,'Focus reveal must be queued')
 const wheel={x:width-24,y:450};win.webContents.sendInputEvent({type:'mouseMove',...wheel});win.webContents.sendInputEvent({type:'mouseWheel',...wheel,deltaX:0,deltaY:scale===2?1200:-1200,canScroll:true,hasPreciseScrollingDeltas:true})
 await new Promise(r=>setTimeout(r,120));await settle();const manual=await read();assert.notEqual(manual.scrollY,before.scrollY,'Real wheel must move the document')
 const released=await run(()=>{window.__rafGate=false;const callbacks=[...window.__heldFrames.values()];window.__heldFrames.clear();callbacks.forEach(cb=>cb(performance.now()));return callbacks.length})
 await new Promise(r=>setTimeout(r,120));await settle();const after=await read(),events=await run(()=>window.__intentEvents)
 const row={width,scale,setup,before,manual,after,released,events,scrollbar:{gutter:after.innerWidth-after.clientWidth,scope:'Geometry only; no OS preference change or fake CSS scrollbar; direct OS thumb drag not claimed'}}
 rows.push(row);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,width+'-'+scale+'.png'),(await win.webContents.capturePage()).toPNG())
 assert(events.some(e=>e.type==='wheel'&&e.trusted));assert(Math.abs(after.scrollY-manual.scrollY)<=1,'Queued focus must yield to the later real wheel')
 assert.equal(after.focus.id,before.focus.id);assert.deepEqual(after.selection,before.selection);assert.equal(after.document,before.document)
 // Native Tab explicitly requests a fresh focus destination; the old search draft is unchanged.
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});await settle();await new Promise(r=>setTimeout(r,80));const returned=await read()
 assert.notEqual(returned.focus.id,after.focus.id);assert(returned.focus.rect.top>=0&&returned.focus.rect.bottom<=800,'Explicit keyboard focus must be exposed');assert.equal(returned.document,before.document)
 row.returned=returned;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
}console.log('PASS native queued viewport ownership',rows.length)}
finally{clearTimeout(deadline);win?.destroy();app.quit()}}).catch(e=>{console.error(e);app.exit(1)})
