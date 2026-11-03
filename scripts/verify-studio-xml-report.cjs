// Actual native/renderer warning UI, keyboard disclosures and print source; QA IPC only.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const source=path.resolve(process.env.DDIRORI_XML_REPORT_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const original=JSON.parse(fs.readFileSync(source)),out=path.resolve(process.env.DDIRORI_XML_REPORT_OUT || 'out/ddirori/studio-xml-report')
const xmlFileName=process.argv.includes('--audit-long-filename')?'studio_'+ 'a'.repeat(180)+'.musicxml':'copy.musicxml'
fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-xml-report-')))
const auditLifetime=process.argv.includes('--audit-lifetime')
let win,scene,step='start';const result=f=>({filePath:f,fileName:path.basename(f)})
ipcMain.handle('musicxml:open',()=>({filePath:'/owned-qa/warned.musicxml',fileName:'warned.musicxml',contents:fs.readFileSync('src/musicxml/fixtures/single-part-treble.musicxml','utf8').replace('<type>quarter</type>','<type>quarter</type><notations><technical><up-bow/></technical></notations>')}))
ipcMain.handle('project:open',()=>{console.log(step+':project-read');return{...result(source),contents:fs.readFileSync(source,'utf8')}})
ipcMain.handle('project:save',(_e,v)=>{const f=path.join(scene,'current.chromatics');fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('musicxml:export',(_e,v)=>{const f=path.join(scene,xmlFileName);fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(scene,'report.pdf');fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));return result(f)})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.message,stack:e.stack}}})()`);if(!r.ok)throw Error(r.error+'\n'+r.stack);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async fn=>{const start=Date.now();while(!await run(fn)){assert.ok(Date.now()-start<12000,step);await settle()}}
const click=async label=>{if(label==='음표'){await click('도구');await click('선택 속성 열기');return}if(label==='내보내기'){await click('파일');await click('내보내기 설정');return}await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(label);n.focus();n.click()},label);await settle()}
const key=async(keyCode,modifiers=[])=>{app.focus({steal:true});win.focus();win.webContents.focus();const start=Date.now();while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-start<5000,'XML report native focus precondition: '+step);await settle()}win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const capture=async name=>fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:960,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 win.webContents.on('will-prevent-unload',e=>e.preventDefault())
 const records=[]
 try{
  if(auditLifetime){
   for(const width of(process.argv.includes('--probe-only')?[960]:[960,1400]))for(const action of(process.argv.includes('--probe-only')?['create']:['create','cancel','reject-dirty'])){
    step=`${width}-${action}`;console.log('START '+step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true})
    const deadline=setTimeout(()=>{fs.writeFileSync(path.join(scene,'deadline.json'),JSON.stringify({step}));app.exit(1)},25000)
    win.setContentSize(width,800);await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();win.webContents.focus();await settle()
    await run(()=>{window.confirm=()=>true})
    await click('MusicXML 가져오기');await wait(()=>Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]')))
    await click('음표');await click('악보로 이동');await key('Up',['alt','shift'])
    const before=await run(()=>({report:document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent,document:document.querySelector('.studio-document').textContent,status:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset}))}))
    assert.match(before.document,/저장하지 않은 변경/)
    await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const prior=JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics')));fs.copyFileSync(path.join(scene,'current.chromatics'),path.join(scene,'before-wizard.chromatics'))
    // A second edit provides a real dirty-replacement confirmation boundary.
    await click('음표');await click('악보로 이동');await key('Up',['alt','shift'])
    await run(action=>{window.confirm=()=>action!=='reject-dirty'},action)
    const dirty=await run(()=>({document:document.querySelector('.studio-document').textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset}))}))
    await click('파일');await click('새 악보 만들기')
    if(action==='reject-dirty')assert.equal(await run(()=>Boolean(document.querySelector('dialog[open] form[aria-label="새 악보 만들기"]'))),false)
    else{
     await wait(()=>Boolean(document.querySelector('dialog[open] form[aria-label="새 악보 만들기"]')?.checkVisibility()))
     await click(action==='create'?'만들기':'취소')
    }
    const after=await run(()=>({report:document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent,document:document.querySelector('.studio-document').textContent,status:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset})),overflow:document.documentElement.scrollWidth>innerWidth}))
    fs.writeFileSync(path.join(scene,'lifetime.json'),JSON.stringify({before,dirty,after},null,2))
    if(action==='create'){assert.equal(after.report,undefined,'Accepted new score must not show previous XML warnings');assert.match(after.status,/0회 수정/)}
    else{assert.equal(after.report,before.report);assert.deepEqual(after.selected,dirty.selected);assert.equal(after.document,dirty.document)}
    assert.equal(after.overflow,false);await run(()=>document.querySelector('.editor-status').scrollIntoView({block:'center'}));await settle();await capture('after-wizard')
    await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const saved=JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics')))
    if(action==='create'){assert.notEqual(saved.score.title,prior.score.title);assert.ok(saved.score.parts.every(p=>p.staves.every(s=>s.measures.every(m=>m.voices.every(v=>v.events.every(e=>e.type==='rest'))))))}
    else{
     const expected=structuredClone(prior.score),note=expected.parts[0].staves[0].measures[0].voices[0].events[0];note.pitch.step='E';assert.deepEqual(saved.score,expected)
    }
    clearTimeout(deadline);records.push({width,action,before,dirty,after,nativeVerified:true,scope:'Actual renderer/disk;owned confirm adapter,not native OSdialog'});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2))
   }
   assert.equal(records.length,process.argv.includes('--probe-only')?1:6);console.log(`PASS${records.length} XML warning lifetime workflows`);return
  }
  for(const width of [960,1400])for(const theme of ['light','dark'])for(const scale of [1,2])for(const coarse of [false,true]){
   step=`${width}-${theme}-${scale}-${coarse?'coarse':'fine'}`;scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true})
   nativeTheme.themeSource=theme;win.setContentSize(width,800);console.log(step+':load')
   const deadline=setTimeout(()=>{fs.writeFileSync(path.join(scene,'deadline.json'),JSON.stringify({step}));console.error('Case deadline',step);app.exit(1)},25000)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});console.log(step+':emulation');if(!win.webContents.debugger.isAttached())win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse});app.focus({steal:true});win.focus();await settle();console.log(step+':native-open')
   await run(()=>{window.confirm=()=>true});await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.studio-document').textContent.includes('Expanded Part Export'))
   console.log(step+':export');await click('내보내기');await click('MusicXML 내보내기');await wait(()=>Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]')))
   const xml=fs.readFileSync(path.join(scene,xmlFileName),'utf8')
   const before=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset})))
   if(scale===2)await run(()=>{const nodes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,span,strong,label,code,h1,h2,h3,p)')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=`${sizes[i]*2}px`)})
   if(process.argv.includes('--audit-long-filename')){
    const header=await run(()=>{const h=document.querySelector('[aria-label="MusicXML 경고 상세"] header'),n=h.querySelector('span'),b=h.getBoundingClientRect(),r=n.getBoundingClientRect();return{text:n.textContent,left:r.left,right:r.right,headerLeft:b.left,headerRight:b.right,overflow:document.documentElement.scrollWidth>innerWidth}})
    fs.writeFileSync(path.join(scene,'long-header.json'),JSON.stringify(header,null,2));await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]').scrollIntoView({block:'center'}));await settle();await capture('long-filename')
    assert.equal(header.text,xmlFileName);assert.ok(Buffer.byteLength(xmlFileName)<255);assert.ok(header.left>=header.headerLeft&&header.right<=header.headerRight);assert.equal(header.overflow,false)
   }
   fs.writeFileSync(path.join(scene,'visibility-diagnostic.json'),JSON.stringify(await run(()=>{const d=document.querySelector('[aria-label="MusicXML 경고 상세"] .dd-accordion'),n=d?.querySelector('code');return{open:d?.querySelector(':scope > button')?.getAttribute('aria-expanded')==='true',rects:n?.getClientRects().length,checkVisibility:n?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})}}),null,2))
   await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]');if(report.textContent.includes('수동 배치가 포함되지 않습니다.')===false)throw Error('Missing actionable Korean loss guidance');const details=report.querySelector('.dd-accordion');if(!details||details.querySelector(':scope > button').getAttribute('aria-expanded')==='true')throw Error('Technical details must start closed');const raw=details.querySelector('code');if(raw.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))throw Error('Raw path leaked into default view');report.scrollIntoView({block:'center'});details.querySelector(':scope > button').focus()});await settle();await capture('collapsed')
   const collapsed=await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]'),summary=report.querySelector('.dd-accordion > button'),r=summary.getBoundingClientRect();return{theme:report.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,fine:matchMedia('(pointer:fine)').matches,height:r.height,fontSize:parseFloat(getComputedStyle(summary).fontSize),background:getComputedStyle(report).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth}})
   assert.equal(collapsed.theme,theme);assert.equal(collapsed.coarse,coarse);assert.equal(collapsed.fine,!coarse);assert.ok(collapsed.height>=(coarse?48:32));assert.equal(collapsed.overflow,false)
   await run(()=>{window.__reportKeys=[];for(const type of ['keydown','keyup'])window.addEventListener(type,e=>queueMicrotask(()=>window.__reportKeys.push({type,key:e.key,prevented:e.defaultPrevented,target:e.target?.tagName,active:document.activeElement?.outerHTML,open:document.querySelector('[aria-label="MusicXML 경고 상세"] .dd-accordion')?.querySelector(':scope > button')?.getAttribute('aria-expanded')==='true'})))})
   await key('Enter')
   const expanded=await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]'),d=report.querySelector('.dd-accordion'),summary=d.querySelector(':scope > button'),codes=[...d.querySelectorAll('code')];return{open:d.querySelector(':scope > button').getAttribute('aria-expanded')==='true',focus:document.activeElement===summary,path:codes.map(n=>n.textContent),rawVisible:codes.every(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})),contained:[...d.querySelectorAll('code,span')].every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),overflow:document.documentElement.scrollWidth>innerWidth}})
   fs.writeFileSync(path.join(scene,'keyboard-diagnostic.json'),JSON.stringify({collapsed,expanded,trace:await run(()=>window.__reportKeys),hasFocus:await run(()=>document.hasFocus())},null,2))
   assert.equal(expanded.open,true);assert.equal(expanded.focus,true);assert.equal(expanded.rawVisible,true);assert.ok(expanded.path.some(p=>p.includes('.engraving')));assert.equal(expanded.contained,true);assert.equal(expanded.overflow,false);await capture('expanded')
   await key('Enter');assert.equal(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),false)
   await key('Space');assert.equal(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),true);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/);await key('Space');assert.equal(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),false)
   assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset}))),before)
   if(process.argv.includes('--audit-navigation')){
    let reverseTabs=0
    while(!await run(()=>document.activeElement?.matches('.studio-score-navigation'))){assert.ok(reverseTabs++<64,'Score navigation must be reachable through native keyboard traversal');await key('Tab',['shift'])}
    await key('F6')
    const target=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect();return{inCanvas:Boolean(n.closest('.score-canvas')),eventId:n.dataset.eventId,partId:n.dataset.partId,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight}})
    assert.equal(target.inCanvas,true);assert.equal(target.eventId,before[0].eventId);assert.equal(target.partId,original.view.mode==='part'?original.view.partId:original.score.parts[0].id);assert.ok(target.top>=0&&target.bottom<=target.height&&target.left>=0&&target.right<=target.width)
    await capture('keyboard-score');await key('F6');assert.equal(await run(()=>document.activeElement?.matches('.studio-score-navigation')),true);await key('F6');assert.equal(await run(()=>document.activeElement?.dataset.eventId),target.eventId)
    assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset}))),before)
    fs.writeFileSync(path.join(scene,'keyboard-navigation.json'),JSON.stringify({reverseTabs,target,selected:before},null,2))
   }
   await click('내보내기');await click('MusicXML 내보내기');await settle();assert.equal(fs.readFileSync(path.join(scene,xmlFileName),'utf8'),xml)
   if(theme==='light'&&scale===1&&!coarse){await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.ok(fs.statSync(path.join(scene,'report.pdf')).size>1000)}
   await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const saved=JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics')));assert.deepEqual(saved.score,original.score);assert.deepEqual(saved.partLayouts,original.partLayouts)
   clearTimeout(deadline);records.push({width,theme,scale,coarse,collapsed,expanded,nativeUnchanged:true,xmlByteExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual renderer,CDP pointer emulation,native Enter,owned disk/PDF with QA IPC;not physical touch,IME,screenreader or OSdialogs'},null,2))
  }
  console.log('PASS16 conditions:960/1400 light/dark text100/200 fine32/coarse48;Korean guidance/native details/keyboard/native/XML and2PDF outputs')
 }catch(error){fs.writeFileSync(path.join(scene||out,'failure.json'),JSON.stringify({step,error:String(error),records},null,2));await capture('failure');throw error}
 finally{win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
