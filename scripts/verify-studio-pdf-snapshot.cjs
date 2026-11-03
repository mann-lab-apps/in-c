// Delay the real PDF bridge boundary, as a native save dialog can; owned fixtures only.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_PDF_SNAPSHOT_OUT||'out/ddirori/studio-pdf-snapshot')
const source=path.resolve(process.env.DDIRORI_PDF_SNAPSHOT_SOURCE||'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const replacement=path.resolve(process.env.DDIRORI_PDF_SNAPSHOT_REPLACEMENT||'out/ddirori/studio-r3-lyric-qualified-music/manual.chromatics')
const original=JSON.parse(fs.readFileSync(source)),other=JSON.parse(fs.readFileSync(replacement)),eventId=original.score.parts[1].staves[0].measures[1].voices[0].events[0].id
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-pdf-snapshot-')));app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,scene,openFile=source,step='start',finishPdf,requestedInk
const result=filePath=>({filePath,fileName:path.basename(filePath)})
ipcMain.handle('project:open',()=>({...result(openFile),contents:fs.readFileSync(openFile,'utf8')}))
ipcMain.handle('project:save',(_e,v)=>{const f=path.join(scene,'current.chromatics');fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('pdf:save',(_e,request)=>{return new Promise(resolve=>{finishPdf=async()=>{const printed=await ink();assert.deepEqual(printed,requestedInk,'The actual print boundary must still use the original ink, text and paper');fs.writeFileSync(path.join(scene,'print-stage.json'),JSON.stringify({request,requestedInk,printed},null,2));const f=path.join(scene,'requested.pdf');fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));resolve(result(f))}})})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.stack}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,arg)=>{const start=Date.now();while(!await run(fn,arg)){assert.ok(Date.now()-start<10000,step);await settle()}}
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable public button: '+label);n.focus();n.click()},label);await settle()}
const key=async(keyCode,modifiers=[])=>{await wait(()=>document.hasFocus());win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const ink=()=>run(id=>{const snapshot=document.querySelector('.studio-pdf-snapshot'),root=snapshot||document,n=root.querySelector(`.notation-event[data-event-id="${id}"]`);return {paperCss:document.querySelector('main.app-shell > style')?.textContent,title:root.querySelector('.score-title')?.textContent.trim(),heads:[...n?.querySelectorAll('.vf-notehead')||[]].map(g=>{const r=g.getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}}),snapshot:Boolean(snapshot),inert:snapshot?.inert,harmonies:[...root.querySelectorAll('.notation-harmony-mark')].map(n=>{const b=n.getBBox();return{text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height}})}},eventId)
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const f=path.join(scene,'current.chromatics');fs.copyFileSync(f,path.join(scene,`${name}.chromatics`));return JSON.parse(fs.readFileSync(f))}
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:960,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 const deadline=setTimeout(()=>{console.error('PDF snapshot deadline '+step);app.exit(1)},90000)
 const records=[]
 try{for(const width of [960,1400])for(const action of ['edit','harmony','replace','view','page-setup']){
  step=`${width}:${action}`;console.log('START '+step);scene=path.join(out,`${width}-${action}`);fs.mkdirSync(scene,{recursive:true});openFile=source;finishPdf=undefined;win.setContentSize(width,800);win.webContents.once('will-prevent-unload',e=>e.preventDefault());await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(title=>document.querySelector('.studio-document').textContent.includes(title),original.score.title);await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus()},eventId);await key('Enter')
  await click('파일');await click('내보내기 설정');await click('PDF 변환');const requestedAt=Date.now();while(!finishPdf){assert.ok(Date.now()-requestedAt<10000,'Native PDF boundary not reached');await settle()}assert.equal(typeof finishPdf,'function');requestedInk=await ink();assert.ok(requestedInk.heads.length>0)
  if(action==='edit'){const liveBefore=await run(id=>{const r=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"] .vf-notehead`).getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}},eventId);await click('도구');await click('선택 속성 열기');await click('악보로 이동');assert.equal(await run(()=>Boolean(document.activeElement?.closest('.score-canvas'))),true,'Native keys must focus the live editor, not the inert snapshot');await key('Up',['alt']);const liveAfter=await run(id=>{const r=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"] .vf-notehead`).getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}},eventId);assert.notDeepEqual(liveAfter,liveBefore,'The actual editable note ink must respond to the native pitch shortcut');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/)}
  else if(action==='harmony'){
   await click('추가');await click('가사 및 코드');await click('코드 심벌 편집');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 코드')
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 코드"]');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('C7');await key('Enter')
   assert(await run(()=>[...document.querySelectorAll('.score-canvas .notation-harmony-mark')].some(n=>n.textContent==='C7')),'Live harmony ink must respond while the snapshot is pending')
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/)
  }
  else if(action==='replace'){openFile=replacement;await click('파일');await click('프로젝트 열기');await wait(title=>document.querySelector('.studio-document').textContent.includes(title),other.score.title)}
  else if(action==='view'){
   await click('형식');await click('악보 설정')
   await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='파트보 선택')?.control;if(!n?.checkVisibility()||n.disabled||n.getAttribute('role')!=='combobox')throw Error('Public part selector unavailable');n.scrollIntoView({block:'center'});n.focus();n.click()});await settle()
   await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value==='P1'&&n.checkVisibility());if(!n)throw Error('Actual P1 option unavailable');n.click()});await settle()
  }
  else{
   await run(()=>{const n=document.querySelector('input[aria-label="PDF 여백 mm"]');if(!n?.checkVisibility()||n.disabled)throw Error('PDF margin unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('17');await key('Enter');assert.equal(await run(()=>document.querySelector('input[aria-label="PDF 여백 mm"]').value),'17')
  }

  const whilePending=await ink();fs.writeFileSync(path.join(scene,'pending.json'),JSON.stringify({requestedInk,whilePending},null,2));assert.deepEqual(whilePending.harmonies,requestedInk.harmonies,'Pending harmony text and coordinates belong to the original snapshot');assert.deepEqual(whilePending.heads,requestedInk.heads,'A pending PDF must keep the requested note ink, not later edits/new documents');assert.equal(whilePending.title,requestedInk.title);assert.equal(whilePending.paperCss,requestedInk.paperCss);assert.equal(whilePending.snapshot,true);assert.equal(whilePending.inert,true)
  await finishPdf();await wait(()=>!document.querySelector('.studio-pdf-snapshot'))
  if(action==='edit'){
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/출력 시작 이후의 수정 내용은 포함되지 않았습니다/);assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/)
   const edited=await save('edited');assert.deepEqual(edited.score.parts[0],original.score.parts[0]);assert.notDeepEqual(edited.score.parts[1],original.score.parts[1]);assert.deepEqual(edited.score.slurs,original.score.slurs)
   await key('Z',['control']);const undone=await save('undo');assert.deepEqual(undone.score,original.score);assert.deepEqual(undone.partLayouts,original.partLayouts)
  }else if(action==='harmony'){
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/출력 시작 이후의 수정 내용은 포함되지 않았습니다/);assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/)
   const edited=await save('harmony-edited');assert.deepEqual({...edited.score,harmonies:original.score.harmonies},original.score)
   const ids=new Set((original.score.harmonies||[]).map(h=>h.id)),added=edited.score.harmonies.filter(h=>!ids.has(h.id));assert.equal(added.length,1);assert.deepEqual({...added[0],id:undefined},{id:undefined,measureId:original.score.parts[1].staves[0].measures[1].id,tick:original.score.parts[1].staves[0].measures[1].voices[0].events[0].position.tick,text:'C7',root:{step:'C'},kind:'dominant'});assert.deepEqual(edited.score.harmonies.filter(h=>ids.has(h.id)),original.score.harmonies)
   await click('악보로 이동');await key('Z',['control']);const undone=await save('harmony-undo');assert.deepEqual(undone.score,original.score);assert.deepEqual(undone.partLayouts,original.partLayouts)
  }else if(action==='replace'){assert.equal(await run(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]'))),false);assert.deepEqual((await save('new-document')).score,other.score)}
  else if(action==='view'){const changed=await save('current-view');assert.deepEqual(changed.score,original.score);assert.deepEqual(changed.view,{mode:'part',partId:'P1'});assert.deepEqual(changed.partLayouts,original.partLayouts)}
  else{const changed=await save('current-page');assert.deepEqual(changed.score,original.score);assert.equal(changed.partLayouts.find(p=>p.partId==='P2').layout.pageSetup.pageMarginMm,17);assert.notDeepEqual(changed.partLayouts,original.partLayouts,'The page action must exercise a real layout change');await key('Z',['control']);const undone=await save('page-undo');assert.deepEqual(undone.score,original.score);assert.deepEqual(undone.partLayouts,original.partLayouts)}

  records.push({width,action,requestedInk,whilePending,pdf:'requested.pdf',nativeCurrentDocumentPreserved:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Real renderer/disk/PDF; delayed QA dialog boundary, not actual OS dialog automation'},null,2))
 }
 console.log('PASS immutable PDF ink/paper with concurrent edit/replacement/view/page changes at960/1400; native/undo preserved')
 }catch(error){if(win&&!win.isDestroyed())fs.writeFileSync(path.join(scene||out,'failure.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(scene||out,'failure.json'),JSON.stringify({step,error:String(error),records},null,2));throw error}finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})
