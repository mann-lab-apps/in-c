// Real renderer/preload/commands. QA IPC writes owned temporary files; no OS dialog claim.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_PART_QA_OUT||'out/ddirori/studio-part-selection')
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-part-selection-')));app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,step='start',openFile,holdOpen=false,releaseOpen,pdfName='piano.pdf'
const current=path.join(out,'current.chromatics'),result=f=>({filePath:f,fileName:path.basename(f)})
const xml=path.resolve('src/musicxml/fixtures/expanded-v1-part-export.musicxml')
ipcMain.handle('musicxml:open',()=>({...result(xml),contents:fs.readFileSync(xml,'utf8')}))
ipcMain.handle('project:open',()=>{const opened={...result(openFile||current),contents:fs.readFileSync(openFile||current,'utf8')};return holdOpen?new Promise(resolve=>{releaseOpen=()=>resolve(opened)}):opened})
ipcMain.handle('project:save',(_e,v)=>{fs.writeFileSync(current,v.contents);return result(current)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(out,pdfName);fs.writeFileSync(path.join(out,'pdf-layout.json'),JSON.stringify(await run(()=>{const root=document.querySelector('.studio-pdf-snapshot');if(!root)throw Error('Missing real PDF snapshot');return {svgs:[...root.querySelectorAll('.notation-preview svg')].map(n=>({width:n.getAttribute('width'),height:n.getAttribute('height'),staffOffsets:n.dataset.staffOffsets,scale:n.dataset.printScale})),staves:[...root.querySelectorAll('.vf-stave')].map(n=>{const r=n.getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height}}),noteheadGlyphCount:root.querySelectorAll('.vf-notehead').length,spanPieces:[...root.querySelectorAll('.notation-span-target')].map(n=>({...n.dataset}))}}),null,2));fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));return result(f)})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.stack}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const clickButton=async label=>{console.log(step+':'+label);await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(`Unavailable ${label}`);n.scrollIntoView({block:'nearest'});n.focus();n.click()},label);await settle()}
const workspaceEntries={'파일':['파일','파일 작업 열기'],'악보':['형식','악보 설정'],'음표':['도구','선택 속성 열기'],'표기 객체':['추가','표기 팔레트 열기'],'가사':['추가','가사 및 코드'],'내보내기':['파일','내보내기 설정'],'재생':['도구','재생 도구']}
const click=async label=>{const entry=workspaceEntries[label];if(entry){await clickButton(entry[0]);await clickButton(entry[1])}else await clickButton(label)}
const change=async(label,value)=>{
 const kind=await run(label=>{const n=document.querySelector(`input[aria-label="${label}"]`)??[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Unavailable actual field: '+label);n.scrollIntoView({block:'nearest'});n.focus();if(n.getAttribute('role')==='combobox')n.click();return n.getAttribute('role')},label);await settle()
 if(kind==='combobox')await run(value=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n||n.getAttribute('aria-disabled')==='true')throw Error('Unavailable actual option: '+value);n.scrollIntoView({block:'nearest'});n.click()},value)
 else await run(({label,value})=>{const n=document.querySelector(`input[aria-label="${label}"]`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}))},{label,value})
 await settle()
}
const openGeometry=async()=>{await run(()=>{const n=[...document.querySelectorAll('.studio-span-properties__geometry button')].find(n=>n.textContent.trim()==='배치 · 형상');if(!n?.checkVisibility()||n.disabled)throw Error('Actual geometry disclosure unavailable');n.scrollIntoView({block:'nearest'});n.focus();if(n.getAttribute('aria-expanded')!=='true')n.click()});await settle()}
const spanInk=async id=>{const paths=await run(id=>[...document.querySelectorAll('.score-canvas .notation-span-target')].filter(n=>n.dataset.spanId===id).flatMap(n=>[...n.querySelectorAll('.notation-slur')].map(path=>path.getAttribute('d'))),id);assert.ok(paths.length&&paths.every(Boolean),'Actual slur ink must be present');return paths}
const key=async(keyCode,modifiers=[])=>{
 app.focus({steal:true});win.focus();win.webContents.focus();const started=Date.now()
 while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-started<12000,'Owned native window/content/document focus:'+step);await settle()}
 win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
}
const wait=async(fn,arg)=>{const t=Date.now();while(!await run(fn,arg)){assert.ok(Date.now()-t<10000,step);await settle()}}
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));fs.copyFileSync(current,path.join(out,`${name}.chromatics`));return JSON.parse(fs.readFileSync(current))}
const state=()=>run(()=>{const n=document.querySelector('.notation-event.is-selected'),p=document.querySelector('.notation-playhead');return {playhead:p?{x:p.getAttribute('x1'),y:p.getAttribute('y1'),sameSvg:p.ownerSVGElement===n?.ownerSVGElement}:undefined,event:n?.dataset.eventId,part:n?.dataset.partId,staff:n?.dataset.staffId,voice:n?.dataset.voiceId,mode:document.querySelector('[aria-label="악보 페이지"]')?.dataset.viewMode,inspector:document.querySelector('[aria-label="현재 파트와 보표"]')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1}})
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:1400,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 const records=[]
 const deadline=setTimeout(()=>{console.error('Deadline:'+step);app.exit(1)},180000)
 try{
 await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle()
 await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.score-title').textContent.includes('Expanded Part Export'));const original=await save('imported')
 for(const width of [960,1400]){
  win.setContentSize(width,800);await settle();await click('악보');await change('악보 보기','part');await change('파트보 선택','P2')
  step=`${width}:visible-part`;const selection=await state();records.push({width,selection});fs.writeFileSync(path.join(out,'selection.json'),JSON.stringify(records,null,2));fs.writeFileSync(path.join(out,`${width}-piano.png`),(await win.webContents.capturePage()).toPNG());assert.equal(selection.part,'P2','Selected object must belong to the visible Piano, not hidden Clarinet');assert.equal(selection.overflow,false)
  await click('악보로 이동');assert.equal((await state()).part,'P2');assert.equal(await run(()=>document.activeElement?.dataset.partId),'P2');fs.writeFileSync(path.join(out,`${width}-selected-note.png`),(await win.webContents.capturePage()).toPNG())
  if(process.argv.includes('--audit-playback')){
   step=`${width}:ensemble-playback`;await click('재생');await clickButton('재생');await wait(()=>document.querySelector('[aria-label="재생 컨트롤"] [aria-label="재생"]')?.disabled===true)
   const playing=await state();fs.writeFileSync(path.join(out,`${width}-playing.json`),JSON.stringify(playing,null,2));assert.equal(playing.part,'P2','Ensemble playback must not move the editor into hidden P1');assert.equal(playing.playhead?.sameSvg,true,'Visible part must have an actual SVG playback cursor');fs.writeFileSync(path.join(out,`${width}-playing.png`),(await win.webContents.capturePage()).toPNG());await click('일시정지');assert.equal((await state()).part,'P2');assert.equal((await state()).playhead?.sameSvg,true);await click('정지');assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-playback-unchanged`)).score,original.score)
  }
  await click('음표');await click('음높이 한 칸 올리기');const edited=await save(`${width}-edited`)
  assert.deepEqual(edited.score.parts[0],original.score.parts[0]);assert.notDeepEqual(edited.score.parts[1],original.score.parts[1]);assert.deepEqual(edited.view,{mode:'part',partId:'P2'})
  await key('Z',['control']);const undone=await save(`${width}-undo`);assert.deepEqual(undone.score,original.score)
  step=`${width}:native-reopen`;await click('프로젝트 열기');await settle();assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-reopened`)).score,original.score)
  // Returning to a previously chosen part after selecting a different visible score part.
  step=`${width}:return-score`;await click('악보');await change('악보 보기','score');await wait(()=>Boolean(document.querySelector('.notation-event[data-part-id="P1"]')));await run(()=>{const n=document.querySelector('.notation-event[data-part-id="P1"]');n.focus();n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))});await settle();assert.equal((await state()).part,'P1');await click('악보');await change('악보 보기','part');assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-returned`)).score,original.score)
  if(process.argv.includes('--audit-commands')){
   step=`${width}:add-part`;await click('악보');await click('파트 추가');const addedSelection=await state();fs.writeFileSync(path.join(out,`${width}-added-selection.json`),JSON.stringify(addedSelection,null,2));assert.equal(addedSelection.part,'violin','New part must be displayed with its editing selection');const added=await save(`${width}-added`);assert.equal(added.score.parts.length,3);assert.deepEqual(added.score.parts.slice(0,2),original.score.parts);assert.deepEqual(added.view,{mode:'part',partId:'violin'})
   await key('Z',['control']);assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-added-undo`)).score,original.score);await key('Z',['control','shift']);assert.equal((await state()).part,'violin');assert.deepEqual((await save(`${width}-added-redo`)).score,added.score);await key('Z',['control']);assert.deepEqual((await save(`${width}-added-reundo`)).score,original.score)
   step=`${width}:vertical`;await click('악보로 이동');await key('Up');assert.equal((await state()).part,'P2');await key('Down');assert.equal((await state()).voice,'voice-2');await key('Down');assert.equal((await state()).staff,'P2-staff-2');await key('Up');assert.equal((await state()).staff,'P2-staff-1');await key('Up');assert.equal((await state()).voice,'voice-1')
   step=`${width}:explicit-staff`;await click('음표');await click('악보로 이동');await key('N');await change('입력 보표','P1:P1-staff-1');assert.equal((await state()).part,'P1');assert.equal(await run(()=>document.querySelector('.studio-input-context').dataset.inputActive),'true');await click('악보로 이동');await key('Escape');assert.deepEqual((await save(`${width}-staff-changed`)).score,original.score)
   step=`${width}:history`;await click('악보');await change('파트보 선택','P2');await click('음표');await click('음높이 한 칸 올리기');await click('악보');await change('파트보 선택','P1');await click('악보로 이동');await key('Z',['control']);assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-history`)).score,original.score);await key('Z',['control','shift']);assert.equal((await state()).part,'P1');const redone=await save(`${width}-history-redo`);assert.deepEqual(redone.score.parts[0],original.score.parts[0]);assert.notDeepEqual(redone.score.parts[1],original.score.parts[1]);await key('Z',['control']);assert.equal((await state()).part,'P2');assert.deepEqual((await save(`${width}-history-reundo`)).score,original.score)
  }
 }
 if(process.argv.includes('--audit-metadata'))for(const [action,label] of [['악보 제목 수정','악보 제목'],['작곡가 수정','작곡가'],['파트보 제목 수정','파트보 제목 입력']]){
  step=`metadata:${label}`;const baseline=await save(`before-${label}`);holdOpen=true;await click('프로젝트 열기');assert.equal(typeof releaseOpen,'function');await click(action)
  await run(label=>{const n=document.querySelector(`[aria-label="${label}"]`);globalThis.__metadataOldQA=n;n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'이전 문서의 미확정 초안');n.dispatchEvent(new Event('input',{bubbles:true}))},label);await settle();releaseOpen();holdOpen=false;await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
  const draft=await run(label=>({exists:Boolean(document.querySelector(`[aria-label="${label}"]`)),value:document.querySelector(`[aria-label="${label}"]`)?.value,status:document.querySelector('.editor-status').textContent}),label);fs.writeFileSync(path.join(out,`${label}-replacement.json`),JSON.stringify(draft,null,2));assert.equal(draft.exists,false,'Old document metadata draft must not survive native replacement')
  await run(()=>{globalThis.__metadataOldQA.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));globalThis.__metadataOldQA.dispatchEvent(new Event('blur'))});await settle();const after=await save(`after-${label}`);assert.deepEqual(after.score,baseline.score);assert.deepEqual(after.partLayouts,baseline.partLayouts)
  step=`metadata-commit:${label}`;await click(action);await run(label=>{const n=document.querySelector(`[aria-label="${label}"]`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'한 번만 확정할 이름');n.dispatchEvent(new Event('input',{bubbles:true}))},label);await settle()
  await run(label=>{const n=document.querySelector(`[aria-label="${label}"]`);n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));n.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))},label);await settle();assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/);await key('Z',['control']);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/0회 수정/);const undone=await save(`commit-undo-${label}`);assert.deepEqual(undone.score,baseline.score);assert.deepEqual(undone.partLayouts,baseline.partLayouts)
 }
 if(process.argv.includes('--audit-part-system-break')){
  step='part-system-break';const measure=original.score.parts[1].staves[0].measures[1].id;await run(id=>{const n=document.querySelector(`.notation-measure[data-measure-id="${id}"]`);if(!n)throw Error('Missing real part measure');n.dispatchEvent(new MouseEvent('click',{bubbles:true}))},measure);await settle();await click('악보');await click('시스템 나누기 추가');const broken=await save('part-system-broken');assert.deepEqual(broken.score,original.score);assert.ok(broken.partLayouts.find(p=>p.partId==='P2').layout.systemBreakBeforeMeasureIds.includes(measure));assert.equal(await run(id=>document.querySelectorAll(`.notation-span-target[data-span-id="${id}"]`).length,original.score.slurs[0].id),2,'Cross-system slur must retain both selectable pieces')
 }
 if(process.argv.includes('--audit-manual-span')){
  step='manual-span';const span=original.score.slurs[0];assert.ok(span)
  const automaticInk=await spanInk(span.id)
  await run(id=>{const n=document.querySelector(`.notation-span-target[data-span-id="${id}"]`);if(!n)throw Error('Missing actual slur target');n.focus();n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))},span.id);await settle();await openGeometry()
  await run(()=>{const n=[...document.querySelectorAll('.studio-span-properties__identity .dd-text')].find(n=>n.textContent==='총보·해당 파트보 공통');if(!n?.checkVisibility())throw Error('Missing current span application scope');n.scrollIntoView({block:'center'})});await settle()
  const scope=await run(()=>{const n=[...document.querySelectorAll('.studio-span-properties__identity .dd-text')].find(n=>n.textContent==='총보·해당 파트보 공통'),r=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return {text:n.textContent,box:r.toJSON(),view:document.querySelector('[aria-label="악보 페이지"]').dataset.viewMode,footerTop:footer.top,viewport:[innerWidth,innerHeight]}})
  assert.equal(scope.view,'part');assert.ok(scope.box.top>=0&&scope.box.bottom<=scope.footerTop);fs.writeFileSync(path.join(out,'span-scope.json'),JSON.stringify(scope,null,2));fs.writeFileSync(path.join(out,'span-scope.png'),(await win.webContents.capturePage()).toPNG())
  for(const [label,value] of [['표기 세로 이동','0'],['표기 높이','3']]){
   await run(({label,value})=>{const n=document.querySelector(`[aria-label="${label}"]`);if(!n?.checkVisibility()||n.disabled)throw Error(label);n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}))},{label,value});await settle();await key('Enter')
  }
  const manual=await save('manual-span');assert.deepEqual(manual.score.slurs[0].engraving,{offsetY:0,height:3});const expected=structuredClone(original.score);expected.slurs[0].engraving={offsetY:0,height:3};assert.deepEqual(manual.score,expected)
  assert.deepEqual(manual.partLayouts,original.partLayouts,'Shared span edits must not silently create a part-only layout override')
  const manualInk=await spanInk(span.id);assert.notDeepEqual(manualInk,automaticInk,'Committed height must change actual slur ink');fs.writeFileSync(path.join(out,'manual-geometry.png'),(await win.webContents.capturePage()).toPNG())
  await key('Z',['control']);const once=await save('manual-height-undo');assert.deepEqual(once.score.slurs[0].engraving,{offsetY:0});await key('Z',['control']);assert.deepEqual((await save('manual-offset-undo')).score,original.score)
  await key('Z',['control','shift']);await key('Z',['control','shift']);assert.deepEqual((await save('manual-redo')).score,expected);await click('프로젝트 열기');await settle();assert.deepEqual((await save('manual-reopened')).score,expected)
  assert.deepEqual(await spanInk(span.id),manualInk,'Native reopen must restore actual manual geometry')
  // Leave the source fixture exact for the pre-existing final-PDF equality gate.
  await run(id=>{const n=document.querySelector(`.notation-span-target[data-span-id="${id}"]`);n.focus();n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))},span.id);await settle();await openGeometry();await click('표기 자동 배치 복원');assert.deepEqual((await save('manual-reset')).score,original.score)
  const resetInk=await spanInk(span.id);assert.deepEqual(resetInk,automaticInk,'Reset must restore the real automatic curve');fs.writeFileSync(path.join(out,'slur-ink.json'),JSON.stringify({automaticInk,manualInk,resetInk},null,2))
 }
 if(process.argv.includes('--audit-page-settings'))for(const width of [960,1400]){
  win.setContentSize(width,800);await settle();const savePage=name=>save(`${width}-${name}`)
  step=`${width}:part-page-settings`;const baseline=await savePage('part-page-baseline');assert.deepEqual(baseline.view,{mode:'part',partId:'P2'})
  await click('내보내기')
  assert.match(await run(()=>document.querySelector('.studio-page-setup').textContent),/Piano 파트보에 적용/)
  await run(()=>{const label=[...document.querySelectorAll('.studio-page-setup label')].find(n=>n.textContent==='PDF 설정 프리셋');const n=label?.control;if(!n?.checkVisibility()||n.disabled||n.getAttribute('role')!=='combobox')throw Error('Unavailable common PDF preset');n.focus();n.click()});await settle()
  await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.textContent.trim()==='컴팩트 파트보'&&n.checkVisibility());if(!n)throw Error('Missing actual preset option');n.click()});await settle()
  const compact=await savePage('part-page-compact');assert.deepEqual(compact.score,baseline.score)
  const previous=baseline.partLayouts.find(p=>p.partId==='P2')
  const expectedLayouts=[...baseline.partLayouts.filter(p=>p.partId!=='P2'),{...previous,partId:'P2',layout:{...previous?.layout,pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:6,staffSizePercent:90,systemSpacingPercent:90}}}]
  assert.deepEqual(compact.partLayouts,expectedLayouts);assert.deepEqual(compact.partLayouts.filter(p=>p.partId!=='P2'),baseline.partLayouts.filter(p=>p.partId!=='P2'))
  assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/)
  await key('Z',['control']);const undone=await savePage('part-page-undo');assert.deepEqual(undone.score,baseline.score);assert.deepEqual(undone.partLayouts,baseline.partLayouts)
  await key('Z',['control','shift']);assert.deepEqual((await savePage('part-page-redo')).partLayouts,compact.partLayouts)
  await click('프로젝트 열기');await settle();assert.deepEqual((await savePage('part-page-reopened')).partLayouts,compact.partLayouts)
  await click('내보내기');assert.equal(await run(()=>document.querySelector('.studio-page-setup [role="combobox"]').textContent),'컴팩트 파트보')
  await run(()=>document.querySelector('.studio-page-setup').scrollIntoView({block:'center'}));await settle();fs.writeFileSync(path.join(out,`${width}-part-page-settings.png`),(await win.webContents.capturePage()).toPNG())
  await click('파트보 조판 초기화');const reset=await savePage('part-page-reset');assert.deepEqual(reset.score,baseline.score);assert.deepEqual(reset.partLayouts,baseline.partLayouts.filter(p=>p.partId!=='P2'))
  await key('Z',['control']);assert.deepEqual((await savePage('part-page-reset-undo')).partLayouts,compact.partLayouts)
  await key('Z',['control','shift']);assert.deepEqual((await savePage('part-page-reset-redo')).partLayouts,reset.partLayouts)
  await click('프로젝트 열기');await settle();assert.deepEqual((await savePage('part-page-inherited-reopened')).partLayouts,reset.partLayouts);assert.deepEqual((await state()).part,'P2')
  pdfName=`${width}-part-page.pdf`;await click('내보내기');await click('PDF 변환');await wait(name=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes(name)&&document.querySelector('.studio-pdf-snapshot')===null,pdfName)
  assert.ok(fs.statSync(path.join(out,pdfName)).size>1000)
 }
 pdfName='piano.pdf'
 step='part-pdf';await click('내보내기');if(process.argv.includes('--audit-part-system-break')){await run(()=>{const n=document.querySelector('[aria-label="PDF 목표 장수"]');if(!n)throw Error('Missing PDF target control');n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'2');n.dispatchEvent(new Event('input',{bubbles:true}))});await settle()}await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.ok(fs.statSync(path.join(out,'piano.pdf')).size>1000);assert.deepEqual((await save('after-pdf')).score,original.score)
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,partPageSettingsChecked:process.argv.includes('--audit-page-settings'),ensemblePlayPauseStopChecked:process.argv.includes('--audit-playback'),metadataReplacementChecked:process.argv.includes('--audit-metadata'),structuralCommandsChecked:process.argv.includes('--audit-commands'),manualSpanChecked:process.argv.includes('--audit-manual-span'),partSystemBreakChecked:process.argv.includes('--audit-part-system-break'),viewEntryAndNativeReopen:true,editsVisiblePartOnly:true,oneUndoExact:true,nativeScoreExact:true,pdf:'piano.pdf',scope:'Actual renderer; QA disk-backed IPC, not native OS dialogs; no physical IME or screen-reader verification'},null,2));console.log('PASS visible part selection, native edit/undo/reopen and PDF')
 }catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(error),records,dom:await run(()=>({view:document.querySelector('[aria-label="악보 페이지"]')?.dataset.viewMode,events:[...document.querySelectorAll('.notation-event')].map(n=>({...n.dataset})),status:document.querySelector('.editor-status')?.textContent}))},null,2));throw error}finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})
