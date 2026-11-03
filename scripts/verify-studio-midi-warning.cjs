// Owned mixed-clef fixture, real renderer/native keymap/disk. Not OS dialogs or listening.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const sources = path.resolve(process.env.DDIRORI_MIDI_WARNING_QA_DIR || 'out/ddirori/studio-r3-midi-warning-source')
const out = path.resolve(process.env.DDIRORI_MIDI_WARNING_UI_DIR || 'out/ddirori/studio-r3-midi-warning-ui')
const midiFileName=process.argv.includes('--audit-long-filename')?'studio_'+ 'a'.repeat(180)+'.mid':'warning.mid'
fs.mkdirSync(out,{recursive:true}); app.disableHardwareAcceleration()
// The runner owns several sequential windows;last-window close must not end the matrix.
app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-midi-warning-')))
let win,scene,openFile,step='start',pdfName
const result = f => ({filePath:f,fileName:path.basename(f)})
ipcMain.handle('project:open',()=>({...result(openFile),contents:fs.readFileSync(openFile,'utf8')}))
ipcMain.handle('project:save',(_e,v)=>{const f=path.join(scene,'current.chromatics');fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('midi:save',(_e,v)=>{const f=path.join(scene,midiFileName);fs.writeFileSync(f,Buffer.from(v.contents));return result(f)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(scene,pdfName);fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));return result(f)})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.message}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async fn=>{const t=Date.now();while(!await run(fn)){assert.ok(Date.now()-t<12000,step);await settle()}}
const click=async label=>{if(label==='음표'){await click('도구');await click('선택 속성 열기');return}if(label==='내보내기'){await click('파일');await click('내보내기 설정');return}await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(label);n.focus();n.click()},label);await settle()}
const ensureFocus=async()=>{app.focus({steal:true});win.focus();win.webContents.focus();const t=Date.now();while(!win.isFocused()||!win.webContents.isFocused()||!await run(()=>document.hasFocus())){assert.ok(Date.now()-t<12000,'Owned window/content/document focus required');await settle()}}
const key=async(keyCode,modifiers=[],expectedFocus)=>{
 await ensureFocus()
 if(expectedFocus){
  const focus=await run(selector=>({selector,active:document.activeElement?.tagName,matches:document.activeElement?.matches(selector),visible:document.activeElement?.checkVisibility(),documentFocus:document.hasFocus()}),expectedFocus)
  const file=path.join(scene,'key-focus-preconditions.json'),previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];previous.push({keyCode,modifiers,...focus,windowFocus:win.isFocused(),contentFocus:win.webContents.isFocused()});fs.writeFileSync(file,JSON.stringify(previous,null,2))
  assert.equal(focus.matches,true,'Native disclosure keys require the current live summary,not stale DOM focus');assert.equal(focus.visible,true)
 }
 if(process.argv.includes('--trace-keys'))await run(input=>{
  window.__midiKeys??=[]
  if(!window.__midiTracing){window.__midiTracing=true;for(const type of['keydown','keyup'])window.addEventListener(type,e=>{const info={type,key:e.key,code:e.code,target:e.target?.tagName,targetClass:e.target?.className,summary:e.target===document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion > button')};queueMicrotask(()=>window.__midiKeys.push({...info,prevented:e.defaultPrevented,cancelBubble:e.cancelBubble,active:document.activeElement?.tagName,open:document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion')?.querySelector(':scope > button')?.getAttribute('aria-expanded')==='true'}))},true)}
  window.__midiKeys.push({input,phase:'before',active:document.activeElement?.tagName,class:document.activeElement?.className,summary:document.activeElement===document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion > button'),focused:document.hasFocus(),open:document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion')?.querySelector(':scope > button')?.getAttribute('aria-expanded')==='true'})
 },{keyCode,modifiers})
 win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
 if(process.argv.includes('--trace-keys'))fs.writeFileSync(path.join(scene,'key-trace.json'),JSON.stringify(await run(()=>window.__midiKeys),null,2))
}
const state=()=>run(()=>({status:document.querySelector('.editor-status > span:last-child')?.textContent,document:document.querySelector('.studio-document').textContent,history:document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0],selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({...n.dataset}))}))
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const f=path.join(scene,'current.chromatics'),p=JSON.parse(fs.readFileSync(f));fs.copyFileSync(f,path.join(scene,name+'.chromatics'));return p}
const capture=async name=>fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())
app.whenReady().then(async()=>{
 const records=[]
 const cases=[]
 for(const width of [960,1400]){
  for(const theme of ['light','dark'])for(const scale of [1,2])for(const coarse of [false,true])cases.push({width,theme,scale,coarse,sign:'percussion'})
  cases.push({width,theme:'light',scale:1,coarse:false,sign:'tab'})
 }
 try{
  for(const c of(process.argv.includes('--probe-only')?cases.slice(0,1):process.argv.includes('--focus-probe')?cases.filter(c=>c.width===960&&c.theme==='light'&&c.scale===2&&!c.coarse):process.argv.includes('--audit-pdf')?cases.filter(c=>c.sign==='percussion'&&c.theme==='light'&&c.scale===1&&!c.coarse):cases)){
   // A fresh native window isolates CDP input modality;the owned workspace profile remains shared.
   win=new BrowserWindow({width:c.width,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.webContents.on('will-prevent-unload',e=>e.preventDefault())
   step=`${c.width}-${c.sign}-${c.theme}-${c.scale}-${c.coarse?'coarse':'fine'}`;scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true})
   const deadline=setTimeout(()=>{fs.writeFileSync(path.join(scene,'deadline.json'),JSON.stringify({step}));app.exit(1)},25000)
   console.log(step+':open');openFile=path.join(sources,c.sign,'source.chromatics');const original=JSON.parse(fs.readFileSync(openFile)),warnings=JSON.parse(fs.readFileSync(path.join(sources,c.sign,'warnings.json')))
   nativeTheme.themeSource=c.theme;win.setContentSize(c.width,800);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}})
   if(!win.webContents.debugger.isAttached())win.webContents.debugger.attach('1.3')
   await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:c.coarse});app.focus({steal:true});win.focus();await settle()
   await click('파일');await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.score-canvas .notation-event[data-event-id="supported-note-1"]')))
   await click('음표');await click('악보로 이동');await key('Up',['alt']);await key('Z',['control'])
   const before=await state();assert.match(before.document,/저장하지 않은 변경/)
   if(process.argv.includes('--audit-pdf')){pdfName='before-midi.pdf';await click('내보내기');await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('before-midi.pdf'))}
   await click('내보내기');await click('MIDI 내보내기');await settle()
   assert.deepEqual(fs.readFileSync(path.join(scene,midiFileName)),fs.readFileSync(path.join(sources,c.sign,'expected.mid')),'Exact rest-oracle MIDI must retain the later supported measure')
   fs.writeFileSync(path.join(scene,'result-before-panel.json'),JSON.stringify(await state(),null,2));await capture('result-before-panel')
   await wait(()=>Boolean(document.querySelector('[aria-label="MIDI 경고 상세"]')))
   const after=await state();assert.deepEqual(after.selected,before.selected);assert.equal(after.history,before.history);assert.equal(after.document,before.document);assert.ok(!after.status.includes('part['));assert.ok(!after.status.includes('notation is not interpreted'))
   if(c.scale===2)await run(()=>{const nodes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,span,strong,label,code,h1,h2,h3,p)')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=`${sizes[i]*2}px`)})
   if(process.argv.includes('--audit-filename')||process.argv.includes('--audit-long-filename')){
    const name=await run(()=>{const s=document.querySelector('.editor-status > span:last-child');return{fileName:document.querySelector('[aria-label="MIDI 경고 상세"] header > span').textContent,rendered:s.innerText,content:s.textContent,transform:getComputedStyle(s).textTransform}})
    fs.writeFileSync(path.join(scene,'filename-case.json'),JSON.stringify(name,null,2));await run(()=>document.querySelector('.editor-status').scrollIntoView({block:'center'}));await settle();await capture('filename-case')
    assert.ok(name.rendered.includes(name.fileName),'Rendered completion must preserve the actual saved filename case')
    if(process.argv.includes('--audit-long-filename')){
     assert.ok(Buffer.byteLength(name.fileName)<255);assert.equal(name.fileName,midiFileName)
     const header=await run(()=>{const h=document.querySelector('[aria-label="MIDI 경고 상세"] header'),n=h.querySelector('span'),b=h.getBoundingClientRect(),r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,headerLeft:b.left,headerRight:b.right,text:n.textContent,overflow:document.documentElement.scrollWidth>innerWidth}})
     fs.writeFileSync(path.join(scene,'long-header.json'),JSON.stringify(header,null,2));assert.ok(header.left>=header.headerLeft&&header.right<=header.headerRight,'Full legal filename must wrap inside report header');assert.equal(header.overflow,false)
    }
   }
   if(process.argv.includes('--audit-status')){
    const status=await run(()=>{const root=document.querySelector('.editor-status'),nodes=[...root.children],message=nodes.pop();return{readouts:nodes.map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{text:n.textContent,lines:new Set([...range.getClientRects()].map(r=>Math.round(r.top*100)/100)).size,x:r.x,y:r.y,width:r.width,height:r.height}}),message:message.textContent,contained:nodes.concat(message).every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),overflow:document.documentElement.scrollWidth>innerWidth}})
    fs.writeFileSync(path.join(scene,'status-geometry.json'),JSON.stringify(status,null,2))
    await run(()=>document.querySelector('.editor-status').scrollIntoView({block:'center'}));await settle();await capture('status-readable')
    assert.ok(status.readouts.every(n=>n.lines===1),'Short status readouts must not collapse into vertical characters beside long feedback');assert.equal(status.contained,true);assert.equal(status.overflow,false)
   }
   const scrollDiagnostic=await run(sign=>{const report=document.querySelector('[aria-label="MIDI 경고 상세"]');if(!report.textContent.includes(sign==='tab'?'TAB 표기가 있는 마디':'타악기 표기가 있는 마디'))throw Error('Missing Korean affected-measure guidance');const d=report.querySelector('.dd-accordion');if(d.querySelector(':scope > button').getAttribute('aria-expanded')==='true'||d.querySelector('code').checkVisibility())throw Error('Raw diagnostics must be initially closed');const before=d.outerHTML;report.scrollIntoView({block:'center'});return{before,after:d.outerHTML,oldConnected:d.isConnected,liveSummaryCount:document.querySelectorAll('[aria-label="MIDI 경고 상세"] .dd-accordion > button').length}},c.sign)
   fs.writeFileSync(path.join(scene,'scroll-diagnostic.json'),JSON.stringify(scrollDiagnostic,null,2));await settle()
   await run(()=>{const summary=document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion > button');if(!summary?.checkVisibility())throw Error('Missing live visible technical summary after layout');summary.focus()});await settle();await capture('collapsed')
   await key('Tab');await key('Tab',['shift'])
   const geometry=await run(()=>{const n=document.querySelector('[aria-label="MIDI 경고 상세"]'),s=n.querySelector('.dd-accordion > button');return{theme:n.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,target:s.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,background:getComputedStyle(n).backgroundColor}})
   assert.equal(geometry.theme,c.theme);assert.equal(geometry.coarse,c.coarse);assert.ok(geometry.target>=(c.coarse?48:32));assert.equal(geometry.overflow,false)
   await key('Enter',[],'[aria-label="MIDI 경고 상세"] .dd-accordion > button');await ensureFocus();const technical=await run(()=>{const d=document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion');return{open:d.querySelector(':scope > button').getAttribute('aria-expanded')==='true',visible:d.querySelector('code').checkVisibility(),path:d.querySelector('code').textContent,message:d.querySelector('.studio-warning-technical__content > span:last-child').textContent,code:d.querySelector('.studio-warning-technical__meta').textContent,focus:document.activeElement===d.querySelector(':scope > button'),documentFocus:document.hasFocus(),matchesFocus:d.querySelector(':scope > button').matches(':focus'),keyboardClass:d.querySelector(':scope > button').className,focusColor:getComputedStyle(d.querySelector(':scope > button')).getPropertyValue('--dd-focus'),focusVisible:d.querySelector(':scope > button').matches(':focus-visible'),outline:getComputedStyle(d.querySelector(':scope > button')).outlineStyle,outlineWidth:parseFloat(getComputedStyle(d.querySelector(':scope > button')).outlineWidth),contained:[...d.querySelectorAll('code,span')].every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})}})
   fs.writeFileSync(path.join(scene,'technical-diagnostic.json'),JSON.stringify({...technical,windowFocus:win.isFocused()},null,2))
   assert.equal(technical.open,true);assert.equal(technical.visible,true);assert.equal(technical.focus,true);assert.equal(technical.documentFocus,true);assert.equal(technical.matchesFocus,true);assert.notEqual(technical.outline,'none','Focused keyboard control must retain a painted ring regardless of UA modality heuristic');assert.ok(technical.outlineWidth>=2);assert.equal(technical.contained,true);assert.equal(technical.path,warnings[0].path);assert.equal(technical.message,warnings[0].message);assert.equal(technical.code,warnings[0].code);await capture('expanded')
   await key('Enter',[],'[aria-label="MIDI 경고 상세"] .dd-accordion > button');assert.equal(await run(()=>document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),false)
   await key('Space',[],'[aria-label="MIDI 경고 상세"] .dd-accordion > button');assert.equal(await run(()=>document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),true);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/);await key('Space',[],'[aria-label="MIDI 경고 상세"] .dd-accordion > button');assert.equal(await run(()=>document.querySelector('[aria-label="MIDI 경고 상세"] .dd-accordion').querySelector(':scope > button').getAttribute('aria-expanded')==='true'),false)
   if(process.argv.includes('--audit-navigation')){
    const beforeNavigation=await state();let reverseTabs=0
    while(!await run(()=>document.activeElement?.matches('.studio-score-navigation'))){assert.ok(reverseTabs++<64,'Existing score navigation must be keyboard reachable from result');await key('Tab',['shift'])}
    await key('F6')
    const target=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect();return{inCanvas:Boolean(n.closest('.score-canvas')),eventId:n.dataset.eventId,partId:n.dataset.partId,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight}})
    assert.equal(target.inCanvas,true);assert.equal(target.eventId,beforeNavigation.selected[0].eventId);assert.ok(target.top>=0&&target.bottom<=target.height&&target.left>=0&&target.right<=target.width,'Real selected target must be visible after existing F6 return')
    fs.writeFileSync(path.join(scene,'keyboard-score.png'),(await win.webContents.capturePage()).toPNG())
    await key('F6');assert.equal(await run(()=>document.activeElement?.matches('.studio-score-navigation')),true)
    await key('F6');assert.equal(await run(()=>document.activeElement?.dataset.eventId),target.eventId)
    const afterNavigation=await state();assert.deepEqual(afterNavigation.selected,beforeNavigation.selected);assert.equal(afterNavigation.history,beforeNavigation.history);assert.equal(afterNavigation.document,beforeNavigation.document)
    fs.writeFileSync(path.join(scene,'keyboard-navigation.json'),JSON.stringify({reverseTabs,target,before:beforeNavigation,after:afterNavigation},null,2))
   }
   if(process.argv.includes('--audit-pdf')){pdfName='after-midi.pdf';await click('내보내기');await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('after-midi.pdf'))}
   assert.deepEqual((await save('after-midi')).score,original.score)
   await key('Z',['control','shift']);const edited=structuredClone(original.score);edited.parts[0].staves[0].measures[0].voices[0].events[0].pitch={step:'D',octave:5,alter:0};assert.deepEqual((await save('redo')).score,edited)
   await key('Z',['control']);assert.deepEqual((await save('undo')).score,original.score)
   openFile=path.join(scene,'undo.chromatics');await click('파일');await click('프로젝트 열기');await wait(()=>!document.querySelector('[aria-label="MIDI 경고 상세"]'));assert.deepEqual((await save('reopened')).score,original.score)
   clearTimeout(deadline);records.push({...c,before,after,geometry,technical,exactMidi:true,nativeExact:true,historyPreserved:true,reopenClearsOldReport:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Owned actual renderer/disk,CDP pointer and native-key emulation;not physical touch/IME,OSdialogs,listening or external MIDI consumer'},null,2))
   win.destroy();win=undefined
  }
  console.log(`PASS${records.length} MIDI warning cases:Korean scope/raw details/keyboard/theme/text/density;exact MIDI/native/dirty/history and reopened report isolation`)
 }catch(error){let currentState;try{if(win&&!win.isDestroyed())currentState=await state()}catch(e){currentState={diagnosticError:String(e)}}fs.writeFileSync(path.join(scene||out,'failure.json'),JSON.stringify({step,error:String(error),records,state:currentState},null,2));if(win&&!win.isDestroyed()){try{fs.writeFileSync(path.join(scene||out,'failure-dom.html'),await run(()=>document.querySelector('[aria-label="MIDI 경고 상세"]')?.outerHTML||document.body.innerHTML));await capture('failure')}catch(e){console.error('Capture diagnostic',String(e))}}throw error}
 finally{if(win&&!win.isDestroyed())win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
