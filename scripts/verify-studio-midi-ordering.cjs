// Actual renderer/preload/disk with owned deferred save responses. Not OS dialog concurrency.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), crypto = require('node:crypto')
const sources = path.resolve(process.env.DDIRORI_MIDI_WARNING_QA_DIR || 'out/ddirori/studio-r3-midi-warning-source')
const out = path.resolve(process.env.DDIRORI_MIDI_ORDERING_UI_DIR || 'out/ddirori/studio-r3-midi-ordering')
const source = path.join(sources, 'percussion', 'source.chromatics'), original = JSON.parse(fs.readFileSync(source))
const oracle = fs.readFileSync(path.join(sources, 'percussion', 'expected.mid'))
const orders = ['newer-success-older-success', 'newer-success-older-error', 'newer-error-older-success', 'newer-cancel-older-success', 'older-success-newer-error', 'older-error-newer-success']
const auditErrors=process.argv.includes('--audit-errors')
const midiFailureMessage='MIDI 내보내기를 완료하지 못했습니다. 다시 시도하거나 기술 정보를 확인해 주세요.'
fs.mkdirSync(out, {recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-midi-ordering-')))
let win, scene, step='start', pending=[], deadline
const result=f=>({filePath:f,fileName:path.basename(f)})
ipcMain.handle('project:open',()=>({...result(source),contents:fs.readFileSync(source,'utf8')}))
ipcMain.handle('project:save',(_e,v)=>{const f=path.join(scene,'current.chromatics');fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(scene,'error-visible.pdf');fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));return result(f)})
ipcMain.handle('midi:save',(_e,v)=>{
 const index=pending.length, bytes=Buffer.from(v.contents)
 assert.deepEqual(bytes,oracle,'Each request must retain mixed-clef rest-oracle MIDI')
 fs.writeFileSync(path.join(scene,`requested-${index}.mid`),bytes)
 return new Promise((resolve,reject)=>pending.push({bytes,finish(outcome){
  if(outcome==='error'){reject(new Error((auditErrors?"EACCES: write '/owned-qa/Private-case.mid'; ":'')+(index===1?'Older MIDI failed':'Newer MIDI failed')));return}
  if(outcome==='cancel'){resolve(null);return}
  const f=path.join(scene,index===0?'prior.mid':index===1?'older.mid':'newer.mid');fs.writeFileSync(f,bytes);resolve(result(f))
 }}))
})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,label)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<10000,`${step}:${label}`);await settle()}}
const click=async label=>{if(label==='음표'){await click('도구');await click('선택 속성 열기');return}if(label==='내보내기'){await click('파일');await click('내보내기 설정');return}await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(label);n.focus();n.click()},label);await settle()}
const key=async(keyCode,modifiers=[])=>{app.focus({steal:true});win.focus();win.webContents.focus();await wait(()=>run(()=>document.hasFocus()),'native focus');win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const state=()=>run(()=>({status:document.querySelector('.editor-status > span:last-child')?.textContent,document:document.querySelector('.studio-document').textContent,history:document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0],report:document.querySelector('[aria-label="MIDI 경고 상세"]')?.textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset})),overflow:document.documentElement.scrollWidth>innerWidth}))
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>run(()=>document.querySelector('.studio-document').textContent.includes('변경 없음')),'project saved');const f=path.join(scene,'current.chromatics');fs.copyFileSync(f,path.join(scene,name+'.chromatics'));return JSON.parse(fs.readFileSync(f))}
app.whenReady().then(async()=>{
 const records=[]
 try{
  const cases=[]
  for(const width of[960,1400]){
   if(auditErrors){for(const theme of['light','dark'])for(const scale of[1,2])for(const coarse of[false,true])cases.push({width,theme,scale,coarse,order:'newer-error-older-success'})}
   else for(const order of orders)cases.push({width,theme:'light',scale:1,coarse:false,order})
  }
  for(const c of(process.argv.includes('--contrast-probe')?cases.filter(c=>c.width===960&&c.theme==='dark'&&c.scale===1&&!c.coarse):process.argv.includes('--probe-only')?cases.slice(0,1):process.argv.includes('--audit-pdf')?cases.filter(c=>c.theme==='light'&&c.scale===1&&!c.coarse):cases)){
   const {width,order}=c
   step=`${width}-${order}${auditErrors?`-${c.theme}-${c.scale}-${c.coarse?'coarse':'fine'}`:''}`;console.log('START '+step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});pending=[]
   deadline=setTimeout(()=>{fs.writeFileSync(path.join(scene,'deadline.json'),JSON.stringify({step}));app.exit(1)},25000)
   win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.webContents.on('will-prevent-unload',e=>e.preventDefault())
   nativeTheme.themeSource=c.theme;await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});await settle()
   if(auditErrors){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:c.coarse})}
   await click('파일');await click('프로젝트 열기');await wait(()=>run(()=>Boolean(document.querySelector('.notation-event[data-event-id="supported-note-1"]'))),'open source')
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>pending.length===1,'prior request');pending[0].finish('success');await settle()
   await wait(()=>run(()=>document.querySelector('[aria-label="MIDI 경고 상세"]')?.textContent.includes('prior.mid')),'prior report')
   // Restore original music with a dirty history and a pending redo,then test exports.
   await click('음표');await click('악보로 이동');await key('Up',['alt']);await key('Z',['control'])
   await click('내보내기');await click('MIDI 내보내기');await click('MIDI 내보내기');await wait(()=>pending.length===3,'two pending requests')
   const before=await state();assert.match(before.document,/저장하지 않은 변경/)
   const [first,firstResult,,lastResult]=order.split('-'),firstIndex=first==='older'?1:2,lastIndex=first==='older'?2:1
   pending[firstIndex].finish(firstResult);await settle();const middle=await state()
   pending[lastIndex].finish(lastResult);await settle();const after=await state()
   fs.writeFileSync(path.join(scene,'ordering.json'),JSON.stringify({before,middle,after},null,2))
   if(first==='older'){assert.equal(middle.status,before.status,'Older completion must not take the latest in-flight request UI');assert.equal(middle.report,before.report)}
   else{assert.equal(after.status,middle.status,'Older result must not replace newer result');assert.equal(after.report,middle.report)}
   const latest=first==='newer'?firstResult:lastResult
   assert.ok(after.report.includes(latest==='success'?'newer.mid':'prior.mid'))
   if(latest==='error'){
    assert.equal(after.status,midiFailureMessage);assert.ok(!after.status.includes('owned-qa'))
    const technical=await run(()=>{const root=document.querySelector('.midi-failure'),d=root?.querySelector('.dd-accordion');return{message:root?.textContent,open:d?.querySelector(':scope > button')?.getAttribute('aria-expanded')==='true',rawVisible:d?.querySelector('.studio-warning-technical__content > span:last-child')?.checkVisibility()}})
    assert.equal(technical.open,false);assert.equal(technical.rawVisible,false);assert.ok(technical.message.includes('Newer MIDI failed'))
   }
   if(latest==='cancel')assert.equal(after.status,before.status)
   assert.equal(after.document,before.document);assert.equal(after.history,before.history);assert.deepEqual(after.selected,before.selected);assert.equal(after.overflow,false)
   if(auditErrors){
    if(c.scale===2)await run(()=>{const nodes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,span,strong,label,code,h1,h2,h3,p)')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=`${sizes[i]*2}px`)})
    await run(()=>{const s=document.querySelector('.midi-failure .dd-accordion > button');s.scrollIntoView({block:'center'});s.focus()});await settle()
    fs.writeFileSync(path.join(scene,'collapsed-error.png'),(await win.webContents.capturePage()).toPNG())
    await key('Enter')
    const detail=await run(()=>{const root=document.querySelector('.midi-failure'),s=root.querySelector('.dd-accordion > button'),d=s.parentElement,raw=d.querySelector('.studio-warning-technical__content > span:last-child'),r=s.getBoundingClientRect();return{theme:root.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,height:r.height,open:s.getAttribute('aria-expanded')==='true',visible:raw.checkVisibility(),raw:raw.textContent,focus:document.hasFocus()&&document.activeElement===s,outline:getComputedStyle(s).outlineStyle,outlineWidth:parseFloat(getComputedStyle(s).outlineWidth),contained:[...root.querySelectorAll('span,button')].every(n=>{const b=n.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}),overflow:document.documentElement.scrollWidth>innerWidth}})
    assert.equal(detail.theme,c.theme);assert.equal(detail.coarse,c.coarse);assert.ok(detail.height>=(c.coarse?48:32));assert.equal(detail.open,true);assert.equal(detail.visible,true);assert.ok(detail.raw.includes("EACCES: write '/owned-qa/Private-case.mid'; Newer MIDI failed"));assert.equal(detail.focus,true);assert.notEqual(detail.outline,'none');assert.ok(detail.outlineWidth>=2);assert.equal(detail.contained,true);assert.equal(detail.overflow,false)
    fs.writeFileSync(path.join(scene,'technical.json'),JSON.stringify(detail,null,2));fs.writeFileSync(path.join(scene,'expanded-error.png'),(await win.webContents.capturePage()).toPNG())
    const contrast=await run(()=>{
     const luminance=v=>{const c=v.slice(0,3).map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722}
     return['.editor-status .is-error','.midi-failure .studio-warning-technical__meta'].map(selector=>{const n=document.querySelector(selector),color=getComputedStyle(n).color;let parent=n,background;while(parent){const value=getComputedStyle(parent).backgroundColor,parts=value.match(/[\d.]+/g)?.map(Number);if(parts&&(parts.length===3||parts[3]>0)){background=value;break}parent=parent.parentElement}const a=luminance(color.match(/[\d.]+/g).map(Number)),b=luminance(background.match(/[\d.]+/g).map(Number));return{selector,color,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)}})
    })
    fs.writeFileSync(path.join(scene,'contrast.json'),JSON.stringify(contrast,null,2));assert.ok(contrast.every(v=>v.ratio>=4.5),'Failure status and technical label must use readable theme tokens')
    await key('Space');assert.equal(await run(()=>document.querySelector('.midi-failure .dd-accordion > button').getAttribute('aria-expanded')==='true'),false);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
    await click('MIDI 내보내기');await wait(()=>pending.length===4,'cancel retry');pending[3].finish('cancel');await settle();assert.equal((await state()).status,midiFailureMessage);assert.equal(await run(()=>Boolean(document.querySelector('.midi-failure'))),true)
    if(process.argv.includes('--audit-pdf')){
     await click('내보내기');await click('PDF 변환');await wait(()=>run(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('error-visible.pdf')),'PDF with existing MIDI error');assert.equal(await run(()=>Boolean(document.querySelector('.midi-failure'))),true)
    }
    await click('MIDI 내보내기');await wait(()=>pending.length===5,'successful retry');pending[4].finish('success');await settle();assert.equal(await run(()=>Boolean(document.querySelector('.midi-failure'))),false);assert.match((await state()).status,/newer.mid/)
   }
   await run(()=>document.querySelector('.editor-status').scrollIntoView({block:'center'}));await settle();fs.writeFileSync(path.join(scene,'status.png'),(await win.webContents.capturePage()).toPNG())
   await run(()=>document.querySelector('[aria-label="MIDI 경고 상세"]').scrollIntoView({block:'center'}));await settle();fs.writeFileSync(path.join(scene,'report.png'),(await win.webContents.capturePage()).toPNG())
   assert.deepEqual((await save('after-exports')).score,original.score)
   await key('Z',['control','shift']);const edited=structuredClone(original.score);edited.parts[0].staves[0].measures[0].voices[0].events[0].pitch={step:'D',octave:5,alter:0};assert.deepEqual((await save('redo')).score,edited)
   await key('Z',['control']);assert.deepEqual((await save('undo')).score,original.score)
   await click('파일');await click('프로젝트 열기');await wait(()=>run(()=>!document.querySelector('[aria-label="MIDI 경고 상세"]')),'report cleared on reopen');assert.deepEqual((await save('reopened')).score,original.score)
   records.push({...c,before,middle,after,nativeExact:true,historyPreserved:true,reopen:true,requestHashes:pending.map(v=>crypto.createHash('sha256').update(v.bytes).digest('hex')),scope:'Actual renderer/preload/disk,deferred QA IPC,not OSdialog concurrency/listening'})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));clearTimeout(deadline);win.destroy();win=undefined
  }
  assert.equal(records.length,process.argv.includes('--probe-only')||process.argv.includes('--contrast-probe')?1:process.argv.includes('--audit-pdf')?2:auditErrors?16:12);console.log(`PASS${records.length} MIDI ordering workflows;errors=${auditErrors}`)
 }catch(error){fs.writeFileSync(path.join(scene||out,'failure.json'),JSON.stringify({step,error:String(error),records,state:win&&!win.isDestroyed()?await state():undefined},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(path.join(scene,'failure.png'),(await win.webContents.capturePage()).toPNG());throw error}
 finally{clearTimeout(deadline);if(win&&!win.isDestroyed())win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
