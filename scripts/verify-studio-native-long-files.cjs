// Owned renderer/profile/file selection; real same-source native IO classes.
// No OS dialog or physical IME claim. No source fixtures are overwritten.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const {buildSync}=require('esbuild')
const {scaleStudioChromeText}=require('./studio-text-scale.cjs')
const out=path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT),source=path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR,'source.chromatics')
assert(!fs.existsSync(out),'Use a fresh output directory');fs.mkdirSync(out,{recursive:true})
const bundle=path.join(out,'owned-native-io.cjs')
buildSync({stdin:{contents:'export {NativeProjectFileSession} from "./src/main/project-files"; export {NativeProjectBackupStore} from "./src/main/project-backups"; export {encodeNativeProject,decodeNativeProject} from "./src/project/schema"; export {toFileName} from "./src/renderer/src/editor/file-lifecycle";',resolveDir:process.cwd(),sourcefile:'owned-native-io-qa.ts'},bundle:true,platform:'node',format:'cjs',target:'node22',outfile:bundle,logLevel:'silent'})
const editorReturnAudit=process.argv.includes('--audit-long-name-editor-return')
const corruptAudit=process.argv.includes('--audit-backup-revalidation')
const failureAudit=process.argv.includes('--audit-backup-write-failure')
const keyboardSave=process.argv.includes('--keyboard-save-space')?'Space':process.argv.includes('--keyboard-save-enter')?'Enter':null
const api=require(bundle),bytes=fs.readFileSync(source),original=api.decodeNativeProject(bytes.toString('utf8'))
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
fs.writeFileSync(path.join(out,'service-sources.json'),JSON.stringify({bundle:{path:bundle,sha256:hash(bundle)},sources:['src/main/project-files.ts','src/main/project-backups.ts','src/project/schema.ts','src/renderer/src/editor/file-lifecycle.ts'].map(p=>({path:p,sha256:hash(p)}))},null,2))
app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-real-native-io-')))
let win,scene,target,openChoice,root,session,store,requests,failedWrites=0,step='start'
const result=file=>({filePath:file,fileName:path.basename(file)})
ipcMain.handle('project:open',async()=>({...result(openChoice),contents:api.encodeNativeProject(await session.open(openChoice))}))
ipcMain.handle('project:save',async(_,input)=>{
 const project=api.decodeNativeProject(input.contents),selected=input.filePath??path.join(root,'recovered.chromatics')
 if(input.filePath)assert([target,path.join(root,'recovered.chromatics')].includes(input.filePath));else session.authorizeSave(selected) // Owned save-dialog choice.
 if(failureAudit)fs.writeFileSync(path.join(scene,'last-request.chromatics'),input.contents)
 try{await session.save(selected,project)}catch(error){failedWrites++;throw error}
 const stored=fs.readFileSync(selected,'utf8');assert.equal(stored,api.encodeNativeProject(project))
 requests.push({requestedPath:input.filePath,selected,contents:stored,sha256:hash(selected)})
 fs.writeFileSync(path.join(scene,`save-${requests.length}.chromatics`),stored)
 fs.writeFileSync(path.join(scene,'save-requests.json'),JSON.stringify(requests,null,2))
 openChoice=selected
 return result(selected)
})
ipcMain.handle('project:list-backups',()=>store.list())
ipcMain.handle('project:read-backup',async(_,id)=>({contents:await store.read(id)}))
for(const channel of ['recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(channel,()=>[])
for(const channel of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(channel,()=>null)
const run=async(fn,arg)=>{
 const r=await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??'undefined'})}}catch(error){return{error:String(error.stack||error)}}})()`)
 if(r.error)throw Error(step+': '+r.error);return r.value
}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))))
const wait=async fn=>{const start=Date.now();while(!await run(fn)){assert(Date.now()-start<10000,step+': timeout '+fn);await settle()}}
const click=async label=>{
 const locate=scroll=>run(({label,scroll})=>{const node=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!node||node.disabled)throw Error('Unavailable public control '+label);if(scroll)node.scrollIntoView({block:'center'});const r=node.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);return{x,y,owned:node.contains(document.elementFromPoint(x,y))}},{label,scroll})
 const start=Date.now();let p
 while(true){const a=await locate(true);win.webContents.sendInputEvent({type:'mouseMove',x:a.x,y:a.y});await settle();p=await locate(false);if(p.owned&&Math.abs(a.x-p.x)<=1&&Math.abs(a.y-p.y)<=1)break;assert(Date.now()-start<3000,'Public pointer target '+label)}
 for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:p.x,y:p.y,button:'left',clickCount:1});await settle()
}
const key=async(code,modifiers=[])=>{win.webContents.sendInputEvent({type:'keyDown',keyCode:code,modifiers});if(code==='Enter'||code==='Space')win.webContents.sendInputEvent({type:'char',keyCode:code==='Enter'?'\r':' ',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode:code,modifiers});await settle()}
const restoreBackup=async id=>{
 const point=await run(id=>{const row=[...document.querySelectorAll('[data-backup-id]')].find(n=>n.dataset.backupId===id),button=row?.querySelector('button[aria-label]');if(!button?.checkVisibility()||button.disabled)throw Error('Listed real backup unavailable');button.scrollIntoView({block:'center'});const r=button.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!button.contains(document.elementFromPoint(x,y)))throw Error('Real backup pointer target blocked');return{x,y}},id)
   for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle()
}
const invokeSave=async()=>{
 await click('파일')
 if(!keyboardSave){await click('프로젝트 저장');return}
 await key('Home');let found=false
 for(let i=0;i<20;i++){if(await run(()=>document.activeElement?.getAttribute('role')==='menuitem'&&document.activeElement?.textContent.trim()==='프로젝트 저장')){found=true;break};await key('Down')}
 assert(found,'Real keyboard traversal must reach enabled project save');await key(keyboardSave)
}
const capture=async name=>{await settle();fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())}
const save=async()=>{const count=requests.length;await invokeSave();await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));assert.equal(requests.length,count+1)}
const snapshot=()=>run(()=>({ink:[...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n=>({text:n.textContent,box:[n.getBBox().x,n.getBBox().y,n.getBBox().width,n.getBBox().height],transform:n.parentElement.getAttribute('transform')})),selection:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>[n.dataset.eventId,n.dataset.measureId]),dirty:document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')}))
const deadline=setTimeout(()=>{console.error('DEADLINE',step);app.exit(124)},180000)
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:960,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 try{
  const rows=[]
  for(const width of [960,1400])for(const kind of ['ascii','unicode']){
   step=`${width}-${kind}`;console.log('START',step);scene=path.join(out,step);root=path.join(scene,'owned-files');fs.mkdirSync(root,{recursive:true});requests=[];failedWrites=0
   const name=api.toFileName((kind==='ascii'?'x':'가').repeat(1000))+'.chromatics';assert.equal(Buffer.byteLength(name),251)
   target=path.join(root,name);openChoice=target;fs.writeFileSync(target,bytes)
   store=new api.NativeProjectBackupStore(()=>path.join(root,'backups'));session=new api.NativeProjectFileSession(file=>store.create(file))
   nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
   await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
   await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
   if(editorReturnAudit){
    await click('악보로 이동');await key('Up',['alt']);await save();const saved=requests[0].contents
    const coarse=width===960;win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
    const font=()=>run(()=>[...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n=>({font:getComputedStyle(n).fontSize,family:getComputedStyle(n).fontFamily,width:n.getBBox().width,height:n.getBBox().height}))),metrics=await font()
    if(coarse){await run(scaleStudioChromeText);await settle()};assert.deepEqual(await font(),metrics)
    await capture('long-save-notice')
    const readTail=()=>run(()=>{
     const footer=document.querySelector('.studio-status'),result=footer.querySelector('.studio-status__result'),walker=document.createTreeWalker(result,NodeFilter.SHOW_TEXT);let n,last
     while(n=walker.nextNode())if(n.textContent.trim())last=n
     const range=document.createRange();range.setStart(last,Math.max(0,last.textContent.length-7));range.setEnd(last,last.textContent.length);const r=range.getBoundingClientRect(),f=footer.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth
     for(let a=last.parentElement;a;a=a.parentElement){const style=getComputedStyle(a),b=a.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)};if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}}
     return{visible:r.top>=top&&r.bottom<=bottom&&r.left>=left&&r.right<=right,tail:last.textContent.slice(-7),y:r.y,height:r.height,scrollTop:footer.scrollTop,scrollHeight:footer.scrollHeight,clientHeight:footer.clientHeight,wheel:{x:Math.round(f.left+20),y:Math.round(f.top+25)}}
    });const tailBefore=await readTail();let tail=tailBefore,wheels=0
    while(!tail.visible&&wheels<12){win.webContents.sendInputEvent({type:'mouseMove',...tail.wheel});win.webContents.sendInputEvent({type:'mouseWheel',...tail.wheel,deltaX:0,deltaY:-220,canScroll:true});await settle();tail=await readTail();wheels++}
    assert(tail.visible,'Entire saved-notice tail must be readable inside all scroll clips');await capture('long-save-notice-tail');await click('악보로 이동')
    const point=await run(()=>{
     const event=document.activeElement?.closest('.notation-event'),glyph=event?.querySelector('.vf-notehead text');if(!glyph)throw Error('Public score return must focus an actual note')
     const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(glyph).font;const b=c.measureText(glyph.textContent),p=glyph.getStartPositionOfChar(0),m=glyph.getScreenCTM(),a=new DOMPoint(p.x-b.actualBoundingBoxLeft,p.y-b.actualBoundingBoxAscent).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m),x=Math.round((a.x+z.x)/2),y=Math.round((a.y+z.y)/2),footer=document.querySelector('.studio-status').getBoundingClientRect()
     return{x,y,eventId:event.dataset.eventId,owner:document.elementFromPoint(x,y)?.closest('.notation-event')?.dataset.eventId,ink:{left:a.x,top:a.y,right:z.x,bottom:z.y},footerTop:footer.top,viewport:{width:innerWidth,height:innerHeight},coarse:matchMedia('(pointer:coarse)').matches,docOverflow:document.documentElement.scrollWidth>innerWidth}
    });fs.writeFileSync(path.join(scene,'target-ink.json'),JSON.stringify(point,null,2));await capture('score-return-target')
    assert.equal(point.coarse,coarse);assert(!point.docOverflow);assert.equal(point.owner,point.eventId);assert(point.ink.top>=0&&point.ink.bottom<=point.footerTop&&point.ink.left>=0&&point.ink.right<=width,'Actual whole note ink must be above the entire footer and inside viewport')
    for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});await settle();assert.equal(await run(()=>document.activeElement?.getAttribute('data-event-id')),point.eventId)
    const before=await snapshot();let footerKeyboard=false,tabCount=0
    for(;tabCount<24;tabCount++){await key('Tab');if(await run(()=>document.activeElement?.closest('.studio-status')&&document.activeElement?.textContent.trim()==='폭 맞춤')){footerKeyboard=true;break}}
    assert(footerKeyboard,'Native Tab traversal must reach the status view control')
    const footerFocus=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=n.closest('.studio-status').getBoundingClientRect();return{visible:r.top>=f.top&&r.bottom<=f.bottom&&r.bottom<=innerHeight,height:r.height,focusVisible:n.matches(':focus-visible')}});assert(footerFocus.visible&&footerFocus.focusVisible);assert(footerFocus.height>=(coarse?47.9:31.9));await capture('footer-keyboard')
    await key('F6');assert.equal(await run(()=>document.activeElement?.getAttribute('data-event-id')),point.eventId);assert.deepEqual(await snapshot(),before)
    await key('Up',['alt']);const edited=await snapshot();assert.notDeepEqual(edited.ink,before.ink);await key('z',['control']);assert.deepEqual(await snapshot(),{...before,dirty:true});await key('z',['control','shift']);assert.deepEqual(await snapshot(),edited);await key('z',['control']);assert.deepEqual(await snapshot(),{...before,dirty:true})
    await save();assert.equal(requests[1].contents,saved);await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'));await save();assert.equal(requests[2].contents,saved)
    assert.equal(path.basename(target),name);assert.deepEqual(fs.readFileSync(source),bytes)
    rows.push({width,kind,coarse,chromeTextPercent:coarse?200:100,target:point,tailBefore,tailAfter:tail,wheels,footerFocus,tabCount,footerF6Return:true,pointerSelected:true,realEditUndoRedo:true,saveAndColdReopenExact:true,sourceUnchanged:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach();continue
   }
   if(corruptAudit){
    await store.create(target);await store.create(target);const entries=await store.list();assert.equal(entries.length,2)
    const bad=entries[0],good=entries[1],badPath=path.join(root,'backups',bad.id),corrupt='{owned invalid backup after listing'
    await click('악보로 이동');await key('Up',['alt']);assert((await snapshot()).dirty)
    await run(()=>{window.__ownedConfirm=[];window.confirm=message=>{window.__ownedConfirm.push(message);return true}})
    const font=()=>run(()=>[...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n=>({font:getComputedStyle(n).fontSize,family:getComputedStyle(n).fontFamily,width:n.getBBox().width,height:n.getBBox().height})))
    const metrics=await font(),coarse=width===960
    win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
    await click('파일');await click('프로젝트 백업');await wait(()=>document.querySelectorAll('dialog[open] [data-backup-id]').length===2)
    if(coarse){await run(scaleStudioChromeText);await settle()};assert.deepEqual(await font(),metrics)
    const before=await snapshot();fs.writeFileSync(badPath,corrupt);let raw
    try{await store.read(bad.id);assert.fail('Corrupted listed backup must be revalidated')}catch(error){raw=error.message;assert(raw.includes('JSON'))}
    await restoreBackup(bad.id);await wait(()=>Boolean(document.querySelector('dialog[open] [role="alert"]')))
    assert.deepEqual(await snapshot(),before);assert.deepEqual(fs.readFileSync(target),bytes);assert.equal(requests.length,0);assert.equal(fs.readFileSync(badPath,'utf8'),corrupt)
    const errorState=await run(()=>{const d=document.querySelector('dialog[open]'),a=d.querySelector('[role="alert"]');return{guidance:a.textContent.includes('백업을 확인하지 못했습니다. 창을 다시 열거나 다른 백업을 선택해 주세요.'),technicalCollapsed:a.querySelector('button')?.getAttribute('aria-expanded')==='false',overflow:d.scrollWidth>d.clientWidth+1,coarse:matchMedia('(pointer:coarse)').matches}})
    assert(errorState.guidance&&errorState.technicalCollapsed&&!errorState.overflow);assert.equal(errorState.coarse,coarse)
    await capture('actual-read-error');await click('기술 정보');if(coarse){await run(scaleStudioChromeText);await settle()}
    assert(await run(raw=>{const d=document.querySelector('dialog[open]'),c=d.querySelector('[role="alert"] .studio-warning-technical__content');return c.checkVisibility()&&c.textContent.includes(raw)},raw));await capture('actual-read-diagnostic')
    await restoreBackup(good.id);await wait(()=>!document.querySelector('dialog[open]'));assert((await snapshot()).dirty)
    await click('악보로 이동');await key('z',['control']);await save();assert.equal(requests[0].contents,api.encodeNativeProject(original));assert.equal(requests[0].requestedPath,undefined)
    await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('recovered.chromatics을 열었습니다.'));await save();assert.equal(requests[1].contents,requests[0].contents)
    assert.deepEqual(fs.readFileSync(target),bytes);assert.deepEqual(fs.readFileSync(source),bytes);assert.equal(fs.readFileSync(badPath,'utf8'),corrupt)
    const confirmations=await run(()=>window.__ownedConfirm);assert(confirmations.length>=2)
    rows.push({width,kind,coarse,chromeTextPercent:coarse?200:100,raw,errorState,realRevalidationRejected:true,documentUnchangedOnError:true,healthyRecoveryExact:true,historyCleared:true,newSavePath:true,coldReopenExact:true,sourceAndCorruptFilePreserved:true,confirmations:'Owned simulated confirmation; not OS dialog QA'})
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach();continue
   }
   if(failureAudit){
    const backupDir=path.join(root,'backups');fs.writeFileSync(backupDir,'Owned directory collision')
    await click('악보로 이동');const initial=await snapshot();await key('Up',['alt']);const edited=await snapshot();assert(edited.dirty);assert.notDeepEqual(edited.ink,initial.ink)
    await invokeSave();await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'))
    assert.equal(requests.length,0);assert.deepEqual(await snapshot(),edited);assert.deepEqual(fs.readFileSync(target),bytes);assert.equal(fs.readFileSync(backupDir,'utf8'),'Owned directory collision');assert(!fs.readdirSync(root).some(n=>n.endsWith('.tmp')))
    const focus=await run(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),visible:document.activeElement?.checkVisibility(),disabled:Boolean(document.activeElement?.disabled)}));await capture('save-failure');assert(focus.tag==='BUTTON'&&focus.label==='파일'&&focus.visible&&!focus.disabled,'Menu-origin error must return to persistent File trigger: '+JSON.stringify(focus))
    await capture('save-failure')
    const failedPayload=fs.readFileSync(path.join(scene,'last-request.chromatics'),'utf8')
    const failedSave=async()=>{const expected=failedWrites+1;await invokeSave();const started=Date.now();while(failedWrites<expected){assert(Date.now()-started<10000,'Owned backend failure completion');await settle()};await settle();await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'));assert.deepEqual(fs.readFileSync(target),bytes);return fs.readFileSync(path.join(scene,'last-request.chromatics'),'utf8')}
    await click('악보로 이동');await key('z',['control']);const undone=await snapshot();assert.deepEqual(undone,{...initial,dirty:true});assert.equal(await failedSave(),api.encodeNativeProject(original))
    await click('악보로 이동');await key('z',['control']);assert.deepEqual(await snapshot(),undone);assert.equal(await failedSave(),api.encodeNativeProject(original))
    await click('악보로 이동');await key('z',['control','shift']);assert.deepEqual(await snapshot(),edited);assert.equal(await failedSave(),failedPayload)

    fs.unlinkSync(backupDir);await save();assert.equal(requests[0].contents,failedPayload);assert.equal(fs.readFileSync(target,'utf8'),failedPayload)
    const previous=await store.list();assert.equal(previous.length,1);assert.equal(await store.read(previous[0].id),bytes.toString('utf8'))
    await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'));await save();assert.equal(requests[1].contents,failedPayload)
    assert.deepEqual(fs.readFileSync(source),bytes);assert(!fs.readdirSync(root).some(n=>n.endsWith('.tmp')));assert(!fs.readdirSync(backupDir).some(n=>n.endsWith('.tmp')))
    await capture('retry-reopen');rows.push({width,kind,menuActivation:keyboardSave??'pointer',failure:'Actual mkdir EEXIST; backup path is an owned regular file',focus,sourcePreservedOnFailure:true,selectionAndInkPreserved:true,oneUndoRedo:true,retryPayloadExact:true,reopenedPayloadExact:true,successfulRequests:requests.length,actualFailedWrites:failedWrites,undoRemainsDirtyUntilSave:true,backupPreviousSnapshotExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));continue
   }
   for(let revision=0;revision<2;revision++){await click('악보로 이동');await key('Up',['alt']);assert(await run(()=>document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')));await save()}
   assert.notEqual(requests[0].contents,requests[1].contents);for(const r of requests)assert.equal(api.decodeNativeProject(r.contents).score.title,original.score.title)
   assert.equal(fs.readFileSync(target,'utf8'),requests[1].contents);assert.equal(path.basename(target),name)
   const entries=await store.list();assert.equal(entries.length,2);let previous
   for(const entry of entries){assert(!entry.error);assert(Buffer.byteLength(entry.fileName)<=251);if(await store.read(entry.id)===requests[0].contents)previous=entry}
   assert(previous,'A real backup must preserve the prior saved snapshot')
   assert(!(fs.readdirSync(root).some(n=>n.endsWith('.tmp'))));assert(!(fs.readdirSync(path.join(root,'backups')).some(n=>n.endsWith('.tmp'))))
   await click('파일');await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('dialog[open] [data-backup-id]')))
   const layout=await run(()=>{const dialog=document.querySelector('dialog[open]');return{scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,horizontalOverflow:dialog.scrollWidth>dialog.clientWidth+1}})
   await capture('real-backups')
   await restoreBackup(previous.id);await wait(()=>!document.querySelector('dialog[open]'))
   assert(await run(()=>document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
   await click('악보로 이동');await key('z',['control']);await save()
   assert.equal(requests[2].contents,requests[0].contents);assert.equal(requests[2].requestedPath,undefined)
   assert.equal(fs.readFileSync(target,'utf8'),requests[1].contents);assert.equal(fs.readFileSync(path.join(root,'recovered.chromatics'),'utf8'),requests[0].contents)
   await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('recovered.chromatics을 열었습니다.'));await save()
   assert.equal(requests[3].contents,requests[0].contents);assert.equal(requests[3].requestedPath,path.join(root,'recovered.chromatics'));assert.equal(fs.readFileSync(target,'utf8'),requests[1].contents)
   assert.deepEqual(await new api.NativeProjectFileSession(async()=>{}).open(path.join(root,'recovered.chromatics')),api.decodeNativeProject(requests[0].contents));assert.deepEqual(fs.readFileSync(source),bytes)
   rows.push({width,kind,sourceNameBytes:Buffer.byteLength(name),sourceNameUnchanged:true,requests:requests.length,backupEntries:entries.map(e=>({id:e.id,bytes:Buffer.byteLength(e.fileName)})),previousSnapshotRecoveredExactly:true,recoveryFreshPath:true,realBackupLayout:layout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))
  }
  clearTimeout(deadline);app.exit(0)
 }catch(error){console.error(step,error);clearTimeout(deadline);app.exit(1)}
})
