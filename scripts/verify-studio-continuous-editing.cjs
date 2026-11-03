// Actual production renderer + preload. Disk-backed QA IPC replaces OS dialogs only.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_CONTINUOUS_QA_OUT||'out/ddirori/studio-r3-continuous')
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'studio-continuous-'))
app.setPath('userData',profile);app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,scene,saveCount=0,xmlCount=0,pdfCount=0,step='startup'
const deadline=setTimeout(()=>{console.error(`Continuous QA deadline at ${step}`);app.exit(1)},240000)
const result=filePath=>({filePath,fileName:path.basename(filePath)})
const file=ext=>path.join(scene,`current.${ext}`)
ipcMain.handle('project:save',(_e,input)=>{fs.writeFileSync(file('chromatics'),input.contents);saveCount++;return result(file('chromatics'))})
ipcMain.handle('project:open',()=>({...result(file('chromatics')),contents:fs.readFileSync(file('chromatics'),'utf8')}))
ipcMain.handle('project:list-backups',()=>[])
ipcMain.handle('musicxml:open',()=>({...result(file('musicxml')),contents:fs.readFileSync(file('musicxml'),'utf8')}))
for(const channel of ['musicxml:save','musicxml:export'])ipcMain.handle(channel,(_e,input)=>{fs.writeFileSync(file('musicxml'),input.contents);xmlCount++;return result(file('musicxml'))})
ipcMain.handle('pdf:save',async()=>{fs.writeFileSync(file('pdf'),await win.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));pdfCount++;return result(file('pdf'))})
ipcMain.handle('recent-musicxml:list',()=>[]);ipcMain.handle('recent-musicxml:add',()=>[])
ipcMain.handle('autosave:read',()=>null);ipcMain.handle('autosave:write',()=>null);ipcMain.handle('autosave:clear',()=>null)
const run=async(fn,arg)=>{const answer=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn.toString()})(${JSON.stringify(arg)??''})}}catch(error){return{ok:false,error:error.stack}}})()`);if(!answer.ok)throw Error(`${step}: ${answer.error}`);return answer.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))))
const wait=async(fn,arg)=>{const start=Date.now();while(!await run(fn,arg)){assert.ok(Date.now()-start<10000,`Timeout at ${step}: ${fn}`);await settle()}}
const capture=async name=>fs.writeFileSync(path.join(scene,`${name}.png`),(await win.webContents.capturePage()).toPNG())
const rawClick=async label=>{
 console.log(`${step}:command:${label}`)
 await run(label=>{const node=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!node||node.disabled)throw Error(`Unavailable real control: ${label}`);node.scrollIntoView({block:'nearest'});node.focus();node.click()},label);await settle()
}
const routes={'파일':['파일','파일 작업 열기'],'음표':['도구','선택 속성 열기'],'표기 객체':['추가','표기 팔레트 열기'],'내보내기':['파일','내보내기 설정']}
const click=async label=>{for(const name of routes[label]??[label])await rawClick(name)}
const key=async(keyCode,modifiers=[])=>{app.focus({steal:true});win.focus();win.webContents.focus();await wait(()=>document.hasFocus());assert.ok(win.isFocused()&&win.webContents.isFocused(),'Owned native window must receive the key');win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const tabTo=async(fn,arg,back=false)=>{let tabs=0;while(!await run(fn,arg)){assert.ok(tabs++<260,`Keyboard route unavailable at ${step}`);await key('Tab',back?['shift']:[])}return tabs}
const navigate=async()=>{const tabs=await tabTo(()=>document.activeElement?.getAttribute('aria-label')==='악보로 이동');await key('Enter');return tabs}
const change=async(selector,value)=>{
 if(selector==='[aria-label="표기 객체 선택"]'){
  await rawClick('도구');await rawClick('범위 표기 찾기')
  await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 객체 선택')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Live span Select unavailable');n.scrollIntoView({block:'nearest'});n.focus();n.click()});await settle()
  await run(value=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n||n.getAttribute('aria-disabled')==='true')throw Error('Live span option unavailable');n.scrollIntoView({block:'nearest'});n.click()},value);await settle();return
 }
 await run(({selector,value})=>{const n=document.querySelector(selector);if(!n||n.disabled||!n.checkVisibility())throw Error(`Unavailable real field: ${selector}`);n.focus();Object.getOwnPropertyDescriptor(n.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}))},{selector,value});await settle()
}
const state=()=>run(()=>{
 const n=document.querySelector('.notation-event.is-selected'),f=document.activeElement,r=f.getBoundingClientRect()
 return {selected:n?.dataset.eventId,address:n&&[n.dataset.partId,n.dataset.staffId,n.dataset.measureId,n.dataset.voiceId],
  input:document.querySelector('.studio-input-context')?.dataset.inputActive,
  edits:Number(document.querySelector('.editor-status')?.textContent.match(/(\d+)회 수정/)?.[1]),
  focus:{event:f.dataset.eventId,span:f.dataset.spanId,label:f.getAttribute('aria-label'),top:r.top,bottom:r.bottom,left:r.left,right:r.right},
  details:document.querySelector('.studio-selected-properties__technical .dd-accordion >button')?.getAttribute('aria-expanded')==='true',overflow:document.documentElement.scrollWidth>innerWidth+1}
})
const focusGeometry=()=>run(()=>{
 const n=document.activeElement,r=n.getBoundingClientRect(),footer=document.querySelector('main > .studio-status').getBoundingClientRect(),style=getComputedStyle(n)
 const ink=[...n.querySelectorAll('.vf-notehead text')].map(text=>{
  const s=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
  const m=ctx.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),a=new DOMPoint(p.x-m.actualBoundingBoxLeft,p.y-m.actualBoundingBoxAscent).matrixTransform(matrix),b=new DOMPoint(p.x+m.actualBoundingBoxRight,p.y+m.actualBoundingBoxDescent).matrixTransform(matrix)
  return{left:a.x,top:a.y,right:b.x,bottom:b.y}
 })
 return{event:n.dataset.eventId,span:n.dataset.spanId,label:n.getAttribute('aria-label'),box:r.toJSON(),ink,footer:footer.toJSON(),limit:Math.min(innerHeight,footer.top),ring:Math.max(0,parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset))}
})
const auditFocus=async name=>{
 let before=await focusGeometry(),stable=0;const start=Date.now()
 while(stable<2){assert.ok(Date.now()-start<3000,'Focus geometry must settle before capture');await settle();const next=await focusGeometry();stable=JSON.stringify(next)===JSON.stringify(before)?stable+1:0;before=next}
 await capture(name);const after=await focusGeometry();fs.writeFileSync(path.join(scene,`${name}.json`),JSON.stringify({before,after},null,2))
 assert.deepEqual(after,before,'Capture and coordinate assertion must describe the same stable focus')
 if(before.event)assert.ok(before.ink.length,'Actual focused note ink must be measured')
 for(const ink of before.ink)assert.ok(ink.top>=8&&ink.bottom<=before.limit-8,`Focused note ink is occluded by the real footer:${JSON.stringify(before)}`)
 assert.ok(before.box.top-before.ring>=8&&before.box.bottom+before.ring<=before.limit-8,`Focused control/ring is occluded by the real footer:${JSON.stringify(before)}`)
}
const save=async label=>{
 const before=saveCount;await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'))
 assert.equal(saveCount,before+1);const saved=JSON.parse(fs.readFileSync(file('chromatics'),'utf8'));fs.copyFileSync(file('chromatics'),path.join(scene,`${label}.chromatics`));return saved.score
}
const ensureInput=async active=>{if(await run(()=>document.querySelector('.studio-input-context').dataset.inputActive==='true')!==active)await click('음표 입력 전환, 단축키 N')}
const load=async fixture=>{
 win.webContents.once('will-prevent-unload',e=>e.preventDefault())
 await win.loadFile(path.resolve('out/renderer/index.html'),fixture?{query:{fixture}}:undefined)
 app.focus({steal:true});win.focus();await wait(()=>document.hasFocus());await settle()
}
const records=[]
const multiOnly=process.argv.includes('--multi-only')
const editingOnly=process.argv.includes('--editing-only')
const auditVisibleFocus=process.argv.includes('--audit-visible-focus')
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:1400,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 try{
  nativeTheme.themeSource='light'
  if(!multiOnly)for(const width of [960,1400])for(const height of [750,800]){
   step=`${width}-${height}:setup`;scene=path.join(out,`${width}-${height}`);fs.mkdirSync(scene,{recursive:true});win.setContentSize(width,height)
   await load('release-test')
   await run(()=>{localStorage.setItem('chromatics.note-details.v1','false');localStorage.setItem('chromatics.dock-visibility.v1','{"palette":true,"properties":true}');localStorage.setItem('chromatics.dock-widths.v1','{"palette":280,"properties":280}');localStorage.setItem('chromatics.notation-view.v1','{"mode":"fit-width","zoom":100}')})
   await load('release-test');const initial=await save('initial');await click('음표')
   // The retired note-detail toolbar no longer exists. Exercise the current inspector disclosure.
   if(height===800){await tabTo(()=>document.activeElement?.matches('.studio-selected-properties__technical .dd-accordion >button'));await key('Enter');assert.equal((await state()).details,true)}
   step=`${width}-${height}:input`;await navigate();await key('N');await key('C');assert.equal((await state()).edits,1)
   const inserted=await save('inserted');assert.notDeepEqual(inserted,initial);await click('음표');await ensureInput(false)
   const lastId=inserted.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note').at(-1).id
   step=`${width}-${height}:late-selection`;const lateTabs=await tabTo(id=>document.activeElement?.dataset.eventId===id,lastId);await key('Enter')
   const selected=await state();assert.equal(selected.selected,lastId);assert.equal(selected.focus.event,lastId);assert.ok(selected.focus.top>=0&&selected.focus.bottom<=height)
   await capture('late-selected')
   if(auditVisibleFocus)await auditFocus('late-selected-footer')
   step=`${width}-${height}:property`;await click('음표');await click('음높이 한 칸 올리기');assert.equal((await state()).edits,2)
   const property=await save('property');assert.notDeepEqual(property,inserted)
   await key('Z',['control']);assert.equal((await state()).edits,1);assert.deepEqual(await save('undo'),inserted)
   await key('Z',['control','shift']);assert.equal((await state()).edits,2);assert.deepEqual(await save('redo'),property)
   await click('음표');await click('속성 도크 설정');await change('[aria-label="속성 도크 폭"]','360');await key('Escape');await click('고정 배율')
   const docking=await state();assert.equal(docking.selected,lastId);assert.deepEqual(docking.address,selected.address)
   await navigate();const anchored=await state();assert.equal(anchored.focus.event,lastId);assert.ok(anchored.focus.top>=0&&anchored.focus.bottom<=height)
   await capture('dock-fixed-anchor')
   step=`${width}-${height}:return-to-tools`;await key('F6');assert.equal((await state()).focus.label,'악보로 이동')
   assert.equal((await state()).edits,2);await key('F6');assert.equal((await state()).focus.event,lastId)
   await key('N');await key('D');assert.equal((await state()).edits,3)
   const again=await save('again');assert.notDeepEqual(again,property)
   await key('Z',['control']);assert.deepEqual(await save('again-undo'),property)
   await key('Z',['control','shift']);assert.deepEqual(await save('again-redo'),again)
   await click('프로젝트 열기');await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'));assert.deepEqual(await save('reopened'),again)
   await capture('continuous-reopened');records.push({width,height,technicalDisclosureInitially:height===800,lateId:lastId,lateTabs,returnKeystrokes:1,returnKey:'F6',selected,anchored,nativeReopenExact:true})
  }
  let multi
  if(!editingOnly){
   step='multi:wizard';scene=path.join(out,'multi-page');fs.mkdirSync(scene,{recursive:true});win.setContentSize(960,750);await load()
   await run(()=>{localStorage.setItem('chromatics.note-details.v1','false');localStorage.setItem('chromatics.dock-visibility.v1','{"palette":true,"properties":true}');localStorage.setItem('chromatics.dock-widths.v1','{"palette":280,"properties":280}');localStorage.setItem('chromatics.notation-view.v1','{"mode":"fit-width","zoom":100}')})
   await load() // Multi-only and aggregate runs must use the same explicit workspace fixture.
   await click('새 악보 만들기');await change('.studio-new-score-form input','Continuous multi-page QA');await change('.studio-new-score-form input[max="64"]','64');await key('Enter')
   await wait(()=>Boolean(document.querySelector('.notation-preview svg')))
   const lastRest=await run(()=>[...document.querySelectorAll('.notation-event[tabindex="0"]')].at(-1).dataset.eventId)
   await navigate();await tabTo(id=>document.activeElement?.dataset.eventId===id,lastRest);await key('Enter')
   step='multi:late-input';await key('N');await key('C');await key('D');await key('N')
   const entered=await save('entered');const notes=entered.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note')
   assert.equal(entered.parts[0].staves[0].measures.length,64);assert.equal(notes.length,2);assert.deepEqual(notes.map(n=>n.pitch.step),['C','D'])
   if(await run(()=>Boolean(document.querySelector('[aria-label="첫 저장 알림 닫기"]'))))await click('첫 저장 알림 닫기')
   await click('음표');await tabTo(id=>document.activeElement?.dataset.eventId===id,notes[0].id);await key('Enter')
   await tabTo(id=>document.activeElement?.dataset.eventId===id,notes[1].id);await key('Enter',['shift'])
   assert.equal(await run(()=>document.querySelectorAll('.notation-event.is-selected').length),2,'Use the actual Shift+Enter range contract')
   await click('표기 객체')
   const rangeOpen=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='범위 기호').getAttribute('aria-expanded'))
   if(rangeOpen==='false')await rawClick('범위 기호')
   await rawClick('범위 기호 설정 열기');await click('슬러 추가 또는 해제, 단축키 S')
   const withSlur=await save('with-slur');assert.equal(withSlur.slurs.length,1);const spanId=withSlur.slurs[0].id
   const spanInspector=async()=>{
    await change('[aria-label="표기 객체 선택"]',`slur:${spanId}`)
    await run(()=>{const n=document.querySelector('.studio-span-properties__geometry .dd-accordion >button');if(!n?.checkVisibility())throw Error('Live geometry disclosure unavailable');if(n.getAttribute('aria-expanded')!=='true'){n.scrollIntoView({block:'nearest'});n.focus();n.click()}});await settle()
   }
   await spanInspector();step='multi:explicit-zero';const beforeZero=(await state()).edits
   await change('[aria-label="표기 가로 이동"]','0');await key('Enter');assert.equal((await state()).edits,beforeZero+1)
   const zero=await save('explicit-zero');assert.equal(zero.slurs[0].engraving.offsetX,0)
   const reviews=[]
   for(const theme of ['light','dark']){
    step=`multi:accessibility-${theme}`;nativeTheme.themeSource=theme;await spanInspector()
    await run(()=>{const saved=window.__continuousFonts??=new Map();for(const[n,size]of saved)if(n.isConnected)n.style.fontSize=size;const nodes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,label,span,output,h1,h2,h3,p,dt,dd)')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot')),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>{if(!saved.has(n))saved.set(n,n.style.fontSize);n.style.fontSize=`${sizes[i]*2}px`})});await settle()
    const beforeError=(await state()).edits
    await change('[aria-label="표기 가로 이동"]','9');await key('Enter');assert.equal((await state()).edits,beforeError)
    assert.equal(await run(()=>document.querySelector('[aria-label="표기 가로 이동"]').getAttribute('aria-invalid')),'true')
    await tabTo(()=>document.activeElement?.getAttribute('aria-label')==='표기 높이')
    const readFocus=()=>run(()=>{
     const n=document.activeElement,r=n.getBoundingClientRect(),p=document.querySelector('#studio-properties').getBoundingClientRect(),s=getComputedStyle(n)
     return {field:{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height},panel:{top:p.top,bottom:p.bottom,left:p.left,right:p.right},
      ring:Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset)),focus:n.getAttribute('aria-label'),overflow:document.documentElement.scrollWidth>innerWidth+1,
      scrollports:[...function*(node){for(let p=node.parentElement;p;p=p.parentElement)yield p}(n)].filter(p=>p.scrollHeight>p.clientHeight).map(p=>({className:p.className,top:p.getBoundingClientRect().top,bottom:p.getBoundingClientRect().bottom,scrollTop:p.scrollTop,clientHeight:p.clientHeight,scrollHeight:p.scrollHeight,overflowY:getComputedStyle(p).overflowY})),scrollY:window.scrollY}
    })
    const fine=await readFocus();assert.equal(fine.focus,'표기 높이');assert.ok(fine.field.top-fine.ring>=Math.max(0,fine.panel.top)-1&&fine.field.bottom+fine.ring<=Math.min(750,fine.panel.bottom)+1,JSON.stringify(fine));assert.equal(fine.overflow,false)
    await capture(`${theme}-text200-error-focus`)
    if(auditVisibleFocus)await auditFocus(`${theme}-text200-error-footer`)
    await win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await settle()
    await tabTo(()=>document.activeElement?.getAttribute('aria-label')==='표기 높이')
    const coarse=await readFocus();assert.ok(coarse.field.height>=48);assert.equal(coarse.overflow,false)
    assert.ok(coarse.field.top-coarse.ring>=Math.max(0,coarse.panel.top)-1&&coarse.field.bottom+coarse.ring<=Math.min(750,coarse.panel.bottom)+1,JSON.stringify(coarse))
    assert.ok(coarse.field.left-coarse.ring>=coarse.panel.left-1&&coarse.field.right+coarse.ring<=coarse.panel.right+1)
    await capture(`${theme}-coarse-text200`)
    if(auditVisibleFocus)await auditFocus(`${theme}-coarse-text200-footer`)
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()
    reviews.push({theme,fine,coarse,errorDidNotCommit:true})
    await run(()=>{for(const[n,size]of window.__continuousFonts??[])if(n.isConnected)n.style.fontSize=size});await settle()
   }
   nativeTheme.themeSource='light';await spanInspector();step='multi:manual-height'
   await change('[aria-label="표기 높이"]','3');const beforeHeight=(await state()).edits;await key('Enter');assert.equal((await state()).edits,beforeHeight+1)
   const manual=await save('manual');assert.equal(manual.slurs[0].engraving.offsetX,0);assert.equal(manual.slurs[0].engraving.height,3);assert.equal(manual.slurs[0].id,spanId)
   await key('Z',['control']);assert.deepEqual(await save('height-undo'),zero)
   await key('Z',['control','shift']);assert.deepEqual(await save('height-redo'),manual)
   await click('프로젝트 열기');await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'));assert.deepEqual(await save('manual-reopened'),manual)
   await spanInspector();await navigate();const spanFocus=await state();assert.equal(spanFocus.focus.span,spanId);assert.ok(spanFocus.focus.top>=0&&spanFocus.focus.bottom<=750);await capture('late-span-reopened')
   await click('파일');await click('MusicXML로 저장');assert.ok(xmlCount>0);fs.copyFileSync(file('musicxml'),path.join(scene,'export.musicxml'))
   await run(()=>{for(const n of document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical .dd-accordion >button'))if(n.checkVisibility()&&n.getAttribute('aria-expanded')!=='true'){n.focus();n.click()}});await settle()
   const xmlWarning=await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent)
   assert.match(xmlWarning,/Manual span placement and shape are preserved in Chromatics projects, not MusicXML export/)
   await capture('xml-manual-layout-warning')
   await click('내보내기');await change('[aria-label="PDF 목표 장수"]','3');const pdfBefore=pdfCount;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfCount,pdfBefore+1)
   fs.copyFileSync(file('pdf'),path.join(scene,'export.pdf'));assert.deepEqual(JSON.parse(fs.readFileSync(file('chromatics'))).score,manual)
   const pdfInfo=require('node:child_process').execFileSync('pdfinfo',[file('pdf')],{encoding:'utf8'});const pages=Number(pdfInfo.match(/Pages:\s+(\d+)/)[1]);assert.ok(pages>=2,'Actual PDF must have multiple pages')
   step='multi:xml-reopen';await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.studio-document')?.textContent.includes('Continuous multi-page QA'))
   const roundtrip=await save('xml-roundtrip'),roundNotes=roundtrip.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note')
   assert.equal(roundtrip.parts[0].staves[0].measures.length,64);assert.deepEqual(roundNotes.map(n=>({pitch:n.pitch,duration:n.duration})),notes.map(n=>({pitch:n.pitch,duration:n.duration})));assert.equal(roundtrip.slurs.length,1)
   assert.equal(roundtrip.slurs[0].engraving,undefined,'Current XML exchange contract warns rather than preserving native-only geometry')
   multi={workspace:{viewport:[960,750],theme:'light',dockWidths:{palette:280,properties:280},mode:'fit-width',zoom:100,detailsInitially:false},measureCount:64,notes:2,spanId,manualGeometry:{offsetX:0,height:3},reviews,spanFocus,requestedPages:3,actualPages:pages,pdfInfo,nativeReopenExact:true,xmlMusicPreserved:true,
    xmlManualGeometryPreserved:false,xmlWarning}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({runtime:process.versions,records,multi,scope:'Actual production commands/native keys and preload; disk-backed QA dialogs, not physical input or native OS dialogs.'},null,2));console.log(`PASS ${records.length} continuous editing journeys${multi?' + multi-page/accessibility/native/XML/PDF':''}`)
 }catch(error){await capture('failure');fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,records,state:await state(),error:String(error)},null,2));throw error}
 finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})
