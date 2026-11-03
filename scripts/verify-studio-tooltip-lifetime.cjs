// Owned real-renderer pointer/keyboard regression; no OS dialog/physical IME claim.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {scaleStudioChromeText}=require('./studio-text-scale.cjs')
const out=path.resolve(process.env.DDIRORI_TOOLTIP_QA_OUT||'out/ddirori/tooltip-lifetime')
const observe=process.argv.includes('--observe'),quick=process.argv.includes('--quick'),pointerOnly=process.argv.includes('--pointer-only')
const traceScroll=process.argv.includes('--trace-scroll')
assert(!fs.existsSync(out),'Use a fresh evidence directory');fs.mkdirSync(out,{recursive:true})
app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-tooltip-')))
let win,scene,saved,backupResolve,backupEnabled=false,label='start';const rows=[]
for(const channel of ['recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(channel,()=>[])
ipcMain.handle('project:list-backups',()=>backupEnabled?[{id:'tooltip-backup',fileName:'owned.chromatics',title:'QA tooltip backup',updatedAt:''}]:[])
ipcMain.handle('project:read-backup',()=>new Promise(resolve=>{backupResolve=resolve}))
for(const channel of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(channel,()=>null)
ipcMain.handle('project:save',(_,value)=>{saved=JSON.parse(value.contents);fs.writeFileSync(path.join(scene,label+'.chromatics'),value.contents);return{filePath:path.join(scene,'owned.chromatics'),fileName:'owned.chromatics'}})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{error:String(e.stack||e)}}})()`);if(r.error)throw Error(label+':'+r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const key=async(keyCode,modifiers=[])=>{app.focus({steal:true});win.focus();win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const move=async point=>{win.webContents.sendInputEvent({type:'mouseMove',...point});await settle()}
const pointTrace=async(name,stage,force=false)=>{
 if(!traceScroll&&!force)return
 const trace=await run(({name,stage})=>{
  const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===name&&n.checkVisibility())
  const ancestors=[];for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);ancestors.push({tag:p.tagName,className:p.className,rect:p.getBoundingClientRect().toJSON(),scrollTop:p.scrollTop,scrollHeight:p.scrollHeight,clientHeight:p.clientHeight,overflowX:s.overflowX,overflowY:s.overflowY,position:s.position})}
  return{name,stage,at:performance.now(),scrollX,scrollY,scrollingElement:document.scrollingElement?.tagName,focus:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')},ancestors,calls:(window.__tooltipScrollTrace||[]).slice(-12)}
 },{name,stage});fs.appendFileSync(path.join(scene,'point-trace.jsonl'),JSON.stringify(trace)+'\n')
}
const point=async(name,scroll=true)=>{
 await pointTrace(name,'before')
 if(scroll){
  const wheel=await run(name=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===name&&n.checkVisibility());if(!n)return null;const r=n.getBoundingClientRect();return r.top<0||r.bottom>innerHeight?{x:innerWidth-24,y:Math.floor(innerHeight/2),deltaY:r.top<0?Math.max(120,-r.top+100):-Math.max(120,r.bottom-innerHeight+100)}:null},name)
  if(wheel){
   // Native manual navigation transfers viewport intent without blurring the
   // old field or changing selection. API-only scrolling cannot signal it.
   win.webContents.sendInputEvent({type:'mouseMove',x:wheel.x,y:wheel.y});win.webContents.sendInputEvent({type:'mouseWheel',...wheel,deltaX:0,canScroll:true,hasPreciseScrollingDeltas:true});await settle()
   fs.appendFileSync(path.join(scene,'native-scroll.jsonl'),JSON.stringify({name,...wheel})+'\n')
  }
 }
 if(scroll){await run(name=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===name&&n.checkVisibility());if(!n)throw Error('Missing control:'+name);n.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})},name);await settle();
  await pointTrace(name,'after-scrollIntoView')
  for(let attempt=0;attempt<6;attempt++){const adjust=await run(name=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===name&&n.checkVisibility());if(!n)return false;const r=n.getBoundingClientRect();if(r.top<8){window.scrollBy(0,r.top-8);return true}if(r.bottom>innerHeight-8){window.scrollBy(0,r.bottom-innerHeight+8);return true}return false},name);if(!adjust)break;await settle();await pointTrace(name,'adjust-'+attempt)}}
 try{return await run(name=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===name&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable public control:'+name);const r=n.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!n.contains(document.elementFromPoint(x,y)))throw Error('Pointer is not owned by '+name+' at '+x+','+y);return{x,y}},name)}catch(error){await pointTrace(name,'failed',true);throw error}
}
const click=async name=>{const p=await point(name);win.webContents.sendInputEvent({type:'mouseMove',...p});for(const type of['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...p,button:'left',clickCount:1});await settle()}
const sample=()=>run(()=>({tips:[...document.querySelectorAll('[role="tooltip"]')].filter(n=>n.matches(':popover-open')&&n.checkVisibility()).map(n=>({text:n.textContent,id:n.id,rect:n.getBoundingClientRect().toJSON()})),selection:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId),preview:document.querySelectorAll('.notation-event.is-preview').length,overflow:document.documentElement.scrollWidth>innerWidth}))
const capture=async name=>{await settle();await new Promise((resolve,reject)=>{const t=setTimeout(()=>{win.webContents.endFrameSubscription();reject(Error('No presented tooltip frame'))},2500);win.webContents.beginFrameSubscription(false,()=>{clearTimeout(t);win.webContents.endFrameSubscription();resolve()});win.webContents.invalidate()});fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())}
const save=async name=>{label=name;await click('파일');await click('프로젝트 저장');await settle();assert(saved);return structuredClone(saved.score)}
app.whenReady().then(async()=>{
 const deadline=setTimeout(()=>app.exit(124),150000)
 try{
  win=new BrowserWindow({width:960,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
  win.webContents.on('will-prevent-unload',e=>e.preventDefault())
  for(const width of[960,1400])for(const theme of(quick?['light']:['light','dark']))for(const scale of(quick?[1]:[1,2]))for(const coarse of(quick?[false]:[false,true])){
   scene=path.join(out,`${width}-${theme}-${scale}-${coarse?'coarse':'fine'}`);fs.mkdirSync(scene);nativeTheme.themeSource=theme;win.setContentSize(width,800)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle()
   if(traceScroll)await run(()=>{
    window.__tooltipScrollTrace=[]
    const record=(kind,target,args,stack)=>{window.__tooltipScrollTrace.push({kind,target,args,stack,at:performance.now(),scrollY,focus:document.activeElement?.getAttribute('aria-label')});if(window.__tooltipScrollTrace.length>100)window.__tooltipScrollTrace.shift()}
    for(const name of ['scrollTo','scrollBy']){const original=window[name];window[name]=function(...args){record(name,'window',args,new Error().stack);return original.apply(this,args)}}
    const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){record('scrollIntoView',this.getAttribute('aria-label')||this.className,args,new Error().stack);return original.apply(this,args)}
    window.addEventListener('scroll',event=>record('scroll-event',event.target===document?'document':event.target?.className,[],null),true)
   })
   if(!win.webContents.debugger.isAttached())win.webContents.debugger.attach('1.3')
   await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
   await click('팔레트');if(!await run(()=>Boolean(document.querySelector('[aria-label="ff 셈여림 적용"]')?.checkVisibility())))await click('셈여림');
   if(scale===2)await run(scaleStudioChromeText)
   await run(()=>{history.scrollRestoration='manual';document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})});await settle()
   const original=await save('before'),ff=await point('ff 셈여림 적용');await settle();await move(ff)
   let scrolledBetweenTriggers=false,p;try{p=await point('p 셈여림 적용',false)}catch(e){if(!String(e).includes('Pointer is not owned'))throw e;scrolledBetweenTriggers=true;p=await point('p 셈여림 적용')}await settle();const route=[]
   const overlapPoint=await run(()=>{const b=document.querySelector('[aria-label="p 셈여림 적용"]').getBoundingClientRect(),t=[...document.querySelectorAll('[role="tooltip"]:popover-open')].find(n=>n.textContent.startsWith('ff ·'))?.getBoundingClientRect();if(!t)return null;const l=Math.max(b.left,t.left),r=Math.min(b.right,t.right),u=Math.max(b.top,t.top),d=Math.min(b.bottom,t.bottom);return r-l>2&&d-u>2?{x:Math.round((l+r)/2),y:Math.round((u+d)/2)}:null});
   if(overlapPoint){await move(overlapPoint);route.push(await sample())}
   for(let i=1;i<=8;i++){await move({x:Math.round(ff.x+(p.x-ff.x)*i/8),y:Math.round(ff.y+(p.y-ff.y)*i/8)});route.push(await sample())}
   fs.writeFileSync(path.join(scene,'route.json'),JSON.stringify({overlapPoint,scrolledBetweenTriggers,route},null,2));await capture('ff-to-p');const maximum=Math.max(...route.map(s=>s.tips.length));console.log('TOOLTIPS',width,theme,scale,coarse,maximum)
   if(!observe)assert(maximum<=1,'Previous tooltip must not remain above a new trigger')
   const selectionBefore=(await sample()).selection
   await click('p 셈여림 적용');await move({x:width-20,y:400});const afterLeave=await sample();await capture('after-pointer-leave')
   if(!observe)assert.equal(afterLeave.tips.length,0,'Leaving trigger/text must close pointer guidance')
   if(pointerOnly){rows.push({width,theme,scale,coarseEmulated:coarse,maximum,scrolledBetweenTriggers,route,afterLeave,scope:'Actual pointer only;score/history not certified by this mode'});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));continue}
   const edited=await save('edited');assert.notDeepEqual(edited,original,'Actual dynamic action must change the score')
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('undo'),original)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual(await save('redo'),edited)
   // Separate keyboard focus from pointer geometry; native Tab opens the next description.
   await click('팔레트');await move({x:width-20,y:400});label='keyboard-focus';await run(()=>document.querySelector('[aria-label="p 셈여림 적용"]').focus());await key('Tab')
   let focused,keyboard;const focusDeadline=Date.now()+1000;do{focused=await run(()=>({name:document.activeElement.getAttribute('aria-label'),id:document.activeElement.getAttribute('aria-describedby'),tag:document.activeElement.tagName,documentFocus:document.hasFocus()}));keyboard=await sample();if(focused.id&&keyboard.tips.some(t=>t.id===focused.id))break;await new Promise(r=>setTimeout(r,25))}while(Date.now()<focusDeadline);fs.writeFileSync(path.join(scene,'keyboard-state.json'),JSON.stringify({focused,keyboard,windowFocus:win.isFocused()},null,2));assert(focused.id&&keyboard.tips.some(t=>t.id===focused.id))
   const beforeEscape=keyboard.selection;await key('Escape');const escaped=await sample();if(!observe)assert.equal(escaped.tips.length,0);assert.deepEqual(escaped.selection,beforeEscape)
   const actualFocus=await run(()=>document.activeElement.getAttribute('aria-label'));assert.equal(actualFocus,focused.name)
   // Native window blur and actual accordion disclosure are lifetime boundaries.
   await move(await point('ff 셈여림 적용'));label='native-window-blur';fs.writeFileSync(path.join(scene,'phase.json'),JSON.stringify({label}));win.blur();await new Promise(r=>setTimeout(r,50));const blurred=await sample();if(!observe)assert.equal(blurred.tips.length,0,'Window blur must dismiss transient tooltip');win.focus();await settle()
   await move(await point('ff 셈여림 적용'));await click('셈여림');const collapsed=await sample();if(!observe)assert.equal(collapsed.tips.length,0,'Collapsed palette must not leave top-layer guidance')
   // Actual additional consumers: note-entry toggle and disabled playback guidance.
   const inputLabel='음표 입력 전환, 단축키 N',inputBefore=await run(l=>document.querySelector('[aria-label="'+l+'"]').getAttribute('aria-pressed'),inputLabel)
   await click(inputLabel);const inputToggled=await run(l=>document.querySelector('[aria-label="'+l+'"]').getAttribute('aria-pressed'),inputLabel);assert.notEqual(inputToggled,inputBefore)
   await run(l=>document.querySelector('[aria-label="'+l+'"]').focus(),inputLabel);await settle();assert((await sample()).tips.length===1);await key('Escape')
   assert.equal(await run(l=>document.querySelector('[aria-label="'+l+'"]').getAttribute('aria-pressed'),inputLabel),inputToggled,'Tooltip Escape must preserve the active input mode')
   await click(inputLabel);assert.equal(await run(l=>document.querySelector('[aria-label="'+l+'"]').getAttribute('aria-pressed'),inputLabel),inputBefore)
   await run(()=>document.querySelector('[aria-label="일시정지"]').scrollIntoView({block:'center'}));await settle()
   const disabledPoint=await run(()=>{const n=document.querySelector('[aria-label="일시정지"]');if(!n.disabled)throw Error('Disabled-state hover requires stopped playback');const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})
   await move(disabledPoint);let disabledGuidance=await sample();const hoverDeadline=Date.now()+1000;while(!disabledGuidance.tips.some(t=>t.text.includes('일시정지'))&&Date.now()<hoverDeadline){await new Promise(r=>setTimeout(r,25));disabledGuidance=await sample()}assert(disabledGuidance.tips.some(t=>t.text.includes('일시정지')))
   await move({x:width-20,y:400});assert.equal((await sample()).tips.length,0)
   assert.deepEqual(await save('after-other-consumers'),edited)
   let backupCancellation=false
   if(width===960&&theme==='light'&&scale===1&&!coarse){
    backupEnabled=true;await click('파일');await click('파일 작업 열기');await click('프로젝트 백업');await click('QA tooltip backup 복구')
    assert.equal(typeof backupResolve,'function');await key('Escape')
    assert.equal(await run(()=>document.querySelector('dialog[open]')),null,'Modal Escape must cancel pending restore in one key')
    const stale=structuredClone(saved);stale.score.title='Discarded tooltip backup';backupResolve({contents:JSON.stringify(stale)});backupResolve=undefined;await settle();await new Promise(r=>setTimeout(r,50))
    assert.deepEqual(await save('after-canceled-backup'),edited,'Canceled late backup must not replace the document')
    await click('프로젝트 백업');await key('Escape');assert.equal(await run(()=>document.querySelector('dialog[open]')),null,'Same backup dialog can reopen and close')
    backupEnabled=false;backupCancellation=true
   }

   const row={otherConsumers:{inputToggleAndEscape:true,disabledPlaybackHover:true,backupCancellation},width,theme,scale,coarseEmulated:coarse,maximum,route,afterLeave,keyboard,escaped,blurred,collapsed,selectionBefore,oneUndoExact:true,redoExact:true};rows.push(row);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))
  }
  console.log('PASS',rows.length,pointerOnly?'actual pointer-only workflows':'actual pointer/keyboard/dynamic/history workflows',';observe mode is not clearance approval',observe)
 }catch(error){if(win){await capture('failure').catch(()=>{});fs.writeFileSync(path.join(scene||out,'failure.txt'),String(error));}throw error}
 finally{clearTimeout(deadline);win?.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
