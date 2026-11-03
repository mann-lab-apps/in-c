// Open the native file produced by the real musical journey; inspect real SVG ink/PDF.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_OUTPUT_QA_OUT||'out/ddirori/studio-output-ink')
const source=path.resolve(process.env.DDIRORI_OUTPUT_QA_SOURCE||'out/ddirori/studio-musical-workflow/manual.chromatics')
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-output-')));app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,pdfCount=0,step='start',printedLyrics=[],printedStaffInk,holdOpen=false,releaseOpen,openSource=source
const deadline=setTimeout(()=>{console.error('Output ink deadline at '+step);app.exit(1)},90000)
const result=filePath=>({filePath,fileName:path.basename(filePath)})
ipcMain.handle('project:open',()=>{const opened={...result(openSource),contents:fs.readFileSync(openSource,'utf8')};return holdOpen?new Promise(resolve=>{releaseOpen=()=>resolve(opened)}):opened})
ipcMain.handle('project:save',(_e,v)=>{const f=path.join(out,'reopened.chromatics');fs.writeFileSync(f,v.contents);return result(f)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(out,['output.pdf','retry.pdf','restored.pdf'][pdfCount]||`output-${pdfCount}.pdf`);printedLyrics=await lyricInk();if(process.argv.includes('--audit-staff-ink')||process.argv.includes('--require-staff-ink-clearance')){printedStaffInk=await staffInk();fs.writeFileSync(path.join(out,`print-staff-ink-${pdfCount}.json`),JSON.stringify(printedStaffInk,null,2))}fs.writeFileSync(path.join(out,`print-lyric-ink-${pdfCount}.json`),JSON.stringify(printedLyrics,null,2));if(process.argv.includes('--audit-manual-slur'))fs.writeFileSync(path.join(out,`print-manual-slur-${pdfCount}.json`),JSON.stringify(await manualSlurInk(),null,2));fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));pdfCount++;return result(f)})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const nativeReady=async()=>{const start=Date.now();while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-start<10000,'Native focus unavailable at '+step);await settle()}}
const key=async(keyCode,modifiers=[])=>{await nativeReady();win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const clickButton=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(label);n.focus();n.click()},label);await settle()}
const click=async label=>{
 const entries={'파일':['파일','파일 작업 열기'],'악보':['형식','악보 설정'],'내보내기':['파일','내보내기 설정'],'가사':['추가','가사 및 코드']}
 if(entries[label]){for(const command of entries[label])await clickButton(command)}else await clickButton(label)
}
const choose=async(label,value)=>{
 await run(label=>{const n=[...document.querySelectorAll('[role="combobox"]')].find(n=>n.checkVisibility()&&[...document.querySelectorAll('label')].some(l=>l.htmlFor===n.id&&l.textContent.trim()===label));if(!n||n.disabled)throw Error('Unavailable Select '+label);n.focus();n.click()},label);await settle()
 await run(value=>{const n=[...document.querySelectorAll('[role="listbox"] [role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n||n.getAttribute('aria-disabled')==='true')throw Error('Unavailable option '+value);n.click()},value);await settle()
}
const wait=async(fn,arg)=>{const start=Date.now();while(!await run(fn,arg)){assert.ok(Date.now()-start<10000,step);await settle()}}
const ink=()=>run(()=>[...(document.querySelector('.studio-pdf-snapshot')||document).querySelectorAll('.notation-harmony-mark')].map(n=>{const r=n.getBBox(),s=n.ownerSVGElement;return {text:n.textContent,x:r.x,width:r.width,y:r.y,height:r.height,svgWidth:Number(s.getAttribute('width'))}}))
const staffInk=()=>run(()=>{const root=document.querySelector('.studio-pdf-snapshot')||document;const box=n=>{const r=n.getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {texts:[...root.querySelectorAll('.notation-staff-label,.notation-staff-text')].map(n=>({text:n.textContent,kind:n.getAttribute('class'),part:n.dataset.partId,staff:n.dataset.staffId,measure:n.dataset.measureId,...box(n)})),staves:[...root.querySelectorAll('.vf-stave')].map(n=>({bbox:box(n),paths:[...n.querySelectorAll('path')].map(p=>({...box(p),d:p.getAttribute('d')}))}))}})
const lyricInk=()=>run(()=>[...(document.querySelector('.studio-pdf-snapshot')||document).querySelectorAll('.notation-lyric')].map(n=>{const r=n.getBBox();return {eventId:n.dataset.eventId,verse:n.dataset.lyricNumber,text:n.textContent,x:r.x,y:r.y,width:r.width,height:r.height}}))
const manualSlurInk=()=>run(()=>{
 const root=document.querySelector('.studio-pdf-snapshot')||document,path=root.querySelector('.notation-slur'),box=path.getBBox(),half=(parseFloat(getComputedStyle(path).strokeWidth)||0)/2
 const lyrics=[...root.querySelectorAll('.notation-lyric')].map(n=>{const r=n.getBBox();return {text:n.textContent,x:r.x,y:r.y,width:r.width,height:r.height}})
 return {path:path.getAttribute('d'),slur:{x:box.x,y:box.y,width:box.width,height:box.height,halfStroke:half},lyrics,clearance:Math.min(...lyrics.map(n=>n.y))-(box.y+box.height+half)}
})
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const f=path.join(out,'reopened.chromatics');fs.copyFileSync(f,path.join(out,`${name}.chromatics`));return JSON.parse(fs.readFileSync(f)).score}
const waitPrinted=async expected=>{const start=Date.now();while(pdfCount<expected){assert.ok(Date.now()-start<15000,'Actual PDF write did not finish: '+step);await settle()}assert.equal(pdfCount,expected);await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))}
const pdf=async()=>{const expected=pdfCount+1;await click('내보내기');await click('PDF 변환');await waitPrinted(expected);return run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent.includes('PDF에 겹치는 가사가 있습니다'))}
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:960,height:750,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false}})
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error('renderer:',event.message)})
 const records=[]
 try{
 await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});win.focus();win.webContents.focus();await nativeReady();await settle();step='initial-file-menu';await click('파일');step='initial-project-open';await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.notation-harmony-mark')))
 if(process.argv.includes('--audit-lyric-draft')){
  step='lyric-draft-reflow';await run(()=>{const n=document.querySelector('.notation-lyric');n.scrollIntoView({block:'center'});n.focus()});await key('Enter')
  await wait(()=>Boolean(document.querySelector('[aria-label="선택 음표 가사"]')))
  await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');n.focus();n.value='작성 중인 가사 초안';n.dispatchEvent(new Event('input',{bubbles:true}));n.setSelectionRange(2,5)})
  win.setContentSize(1400,750);await settle()
  const draft=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');return {value:n?.value,start:n?.selectionStart,end:n?.selectionEnd,focused:document.activeElement===n,status:document.querySelector('.editor-status').textContent}})
  fs.writeFileSync(path.join(out,'draft-reflow.json'),JSON.stringify(draft,null,2));assert.equal(draft.value,'작성 중인 가사 초안');assert.equal(draft.start,2);assert.equal(draft.end,5);assert.equal(draft.focused,true);assert.match(draft.status,/0회 수정/)
  step='lyric-ime-reflow';const imeStart=await run(async()=>{
   const frames=[];let stable=0,previous='',n
   for(let attempt=0;attempt<120&&stable<4;attempt++){
    await new Promise(resolve=>requestAnimationFrame(resolve));n=document.querySelector('[aria-label="선택 음표 가사"]')
    const state=n?{box:n.getBoundingClientRect().toJSON(),value:n.value,start:n.selectionStart,end:n.selectionEnd,focused:document.activeElement===n}:null
    const key=JSON.stringify(state);stable=state&&key===previous?stable+1:0;previous=key;frames.push(state)
   }
   if(stable<4||!n||n.value!=='작성 중인 가사 초안'||n.selectionStart!==2||n.selectionEnd!==5||document.activeElement!==n)throw Error('Stable draft before composition missing: '+JSON.stringify(frames))
   globalThis.__studioInlineQA=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ㅎ'}));n.value='한글 조합 초안';n.dispatchEvent(new Event('input',{bubbles:true}));n.setSelectionRange(1,3);n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true}));return frames
  });fs.writeFileSync(path.join(out,'ime-start-frames.json'),JSON.stringify(imeStart,null,2))
  win.setContentSize(960,750);await settle();const composing=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');return {same:n===globalThis.__studioInlineQA,value:n?.value,status:document.querySelector('.editor-status').textContent}})
  assert.equal(composing.same,true);assert.equal(composing.value,'한글 조합 초안');assert.match(composing.status,/0회 수정/)
  await run(()=>document.querySelector('[aria-label="선택 음표 가사"]').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'})));await settle();await settle()
  const resumed=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');return {value:n?.value,start:n?.selectionStart,end:n?.selectionEnd,status:document.querySelector('.editor-status').textContent}})
  assert.equal(resumed.value,'한글 조합 초안');assert.equal(resumed.start,1);assert.equal(resumed.end,3);assert.match(resumed.status,/0회 수정/)
  await key('Escape')
  assert.deepEqual(await save('draft-cancelled'),JSON.parse(fs.readFileSync(source)).score)
  step='lyric-tab-commit';await click('가사');await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');n.focus();n.value='키보드로 남기는 가사';n.dispatchEvent(new Event('input',{bubbles:true}))})
  await key('Tab')
  assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사'),false,'Tab must leave the committed editor')
  assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/)
  const original=JSON.parse(fs.readFileSync(source)).score,expected=structuredClone(original);expected.parts[0].staves[0].measures[0].voices[0].events[0].lyrics[0].text='키보드로 남기는 가사'
  assert.deepEqual(await save('tab-committed'),expected)
  await key('Z',['control']);assert.deepEqual(await save('tab-undo'),original)
  step='lyric-late-document';holdOpen=true;await click('프로젝트 열기');assert.equal(typeof releaseOpen,'function');await click('가사')
  const oldDocument=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');globalThis.__studioLateLyricQA=n;n.focus();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ㅎ'}));n.value='새 문서에 넘기지 않을 초안';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('blur'));return n.dataset.documentKey})
  releaseOpen();holdOpen=false;await wait(oldDocument=>document.querySelector('[aria-label="선택 음표 가사"]')?.dataset.documentKey!==undefined&&document.querySelector('[aria-label="선택 음표 가사"]').dataset.documentKey!==oldDocument,oldDocument)
  assert.equal(await run(()=>document.querySelector('[aria-label="선택 음표 가사"]').value),original.parts[0].staves[0].measures[0].voices[0].events[0].lyrics[0].text)
  await run(()=>globalThis.__studioLateLyricQA.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'})));await settle();assert.match(await run(()=>document.querySelector('.editor-status').textContent),/0회 수정/)
  assert.deepEqual(await save('late-open'),original)
  fs.writeFileSync(path.join(out,'draft-contract.json'),JSON.stringify({draft,composing,resumed,nativeExact:true,tabCommitOneUndo:true,lateDocumentDraftDiscarded:true,physicalIme:false},null,2))
 }
 for(const width of [960,1400]){step=`ink-${width}`;win.setContentSize(width,750);await settle();const harmonies=await ink(),lyrics=await lyricInk();const staffInkRecord=process.argv.includes('--audit-staff-ink')?await staffInk():undefined;records.push({width,harmonies,lyrics,staffInk:staffInkRecord});fs.writeFileSync(path.join(out,'ink.json'),JSON.stringify(records,null,2));fs.writeFileSync(path.join(out,`${width}.png`),(await win.webContents.capturePage()).toPNG())}
 step='pdf';await click('내보내기');await run(()=>{const n=document.querySelector('[aria-label="PDF 목표 장수"]');n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'3');n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}))});await settle();await click('PDF 변환');await waitPrinted(1)
 if(process.argv.includes('--audit-staff-ink'))fs.writeFileSync(path.join(out,'post-pdf-staff-ink.json'),JSON.stringify(await staffInk(),null,2));const printInk=await ink();fs.writeFileSync(path.join(out,'print-ink.json'),JSON.stringify(printInk,null,2))
 await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'reopened.chromatics'))).score,JSON.parse(fs.readFileSync(source)).score)
 for(const r of records)for(const h of r.harmonies){assert.ok(h.x>=0,`Left chord ink clipped at ${r.width}: ${JSON.stringify(h)}`);assert.ok(h.x+h.width<=h.svgWidth,`Right chord ink clipped: ${JSON.stringify(h)}`)}
 if(process.argv.includes('--require-auto-lyric-clearance')){
  const words=await lyricInk();fs.writeFileSync(path.join(out,'automatic-lyric-ink.json'),JSON.stringify(words,null,2))
  for(const pair of [...records.map(r=>r.lyrics),words,printedLyrics]){
   assert.ok(pair.length>=2);assert.ok(pair[0].x+pair[0].width<=pair[1].x,`Automatic adjacent lyric ink overlaps: ${JSON.stringify(pair.slice(0,2))}`)
  }
 }
 if(process.argv.includes('--require-staff-ink-clearance')){
  const audited=[...records.map(r=>({stage:String(r.width),ink:r.staffInk})).filter(r=>r.ink),{stage:'print-before-native-pdf',ink:printedStaffInk}]
  for(const {stage,ink} of audited){assert.ok(ink,'Actual print-stage ink must be captured before native printing');const collisions=[];for(const text of ink.texts)for(const stave of ink.staves)for(const line of stave.paths){if(line.height===0&&line.width>100&&text.x<line.x+line.width&&text.x+text.width>line.x&&text.y<line.y+0.5&&text.y+text.height>line.y-0.5)collisions.push({text,line})}fs.writeFileSync(path.join(out,`staff-ink-collisions-${stage}.json`),JSON.stringify(collisions,null,2));assert.equal(collisions.length,0,'Staff name/text actual bounds must not cross staff line ink')}
 }
 const partViews=[]
 if(process.argv.includes('--audit-part-view')){
  const original=JSON.parse(fs.readFileSync(source)).score
  for(const mode of ['part','score']){
   step=`lyric-view-${mode}`;await click('악보');await choose('악보 보기',mode)
   // Export tools are now mounted only in their actual menu-opened workspace.
   await click('내보내기');await wait(()=>document.querySelector('[aria-label="PDF 변환"]')?.checkVisibility()&&document.querySelector('[aria-label="PDF 변환"]').disabled===false)
   for(const width of [960,1400]){
    win.setContentSize(width,750);await settle();const words=await lyricInk();assert.ok(words[0].x+words[0].width<=words[1].x)
    const selection=await run(()=>{const n=document.querySelector('.notation-event.is-selected');return {id:n?.dataset.eventId,part:n?.dataset.partId,staff:n?.dataset.staffId,measure:n?.dataset.measureId,voice:n?.dataset.voiceId,mode:document.querySelector('[aria-label="악보 페이지"]').dataset.viewMode}})
    assert.equal(selection.id,original.parts[0].staves[0].measures[0].voices[0].events[0].id);assert.equal(selection.mode,mode);assert.equal(selection.part,original.parts[0].id)
    partViews.push({mode,width,selection,words})
   }
   assert.deepEqual(await save(`view-${mode}`),original);const envelope=JSON.parse(fs.readFileSync(path.join(out,'reopened.chromatics')));assert.equal(envelope.view.mode,mode)
   if(mode==='part'){assert.equal(await pdf(),false);fs.copyFileSync(path.join(out,'retry.pdf'),path.join(out,'part-view.pdf'))}
  }
  fs.writeFileSync(path.join(out,'part-view.json'),JSON.stringify({records:partViews,nativeScoreExact:true,partPdf:'part-view.pdf'},null,2))
 }
 let retry
 if(process.argv.includes('--retry-lyric-layout')){
  const original=JSON.parse(fs.readFileSync(source)).score,measure2=original.parts[0].staves[0].measures[1].id
  const before=await lyricInk();assert.match(await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent),/PDF에 겹치는 가사가 있습니다/)
  await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').scrollIntoView({block:'center'}));await settle();fs.writeFileSync(path.join(out,'lyric-warning.png'),(await win.webContents.capturePage()).toPNG())
  step='lyric-layout-retry';await run(id=>document.querySelector(`.notation-measure[data-measure-id="${id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true})),measure2);await settle();await click('악보');await click('시스템 나누기 추가')
  const changed=await save('layout-change'),withoutLayout=score=>{const {layout,...music}=score;return music}
  assert.deepEqual(withoutLayout(changed),withoutLayout(original));assert.deepEqual(changed.slurs,original.slurs)
  assert.equal(await pdf(),false,'Explicit existing layout command should remove the measured lyric collision in this fixture')
  const after=await lyricInk();await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').scrollIntoView({block:'center'}));await settle();fs.writeFileSync(path.join(out,'lyric-retry.png'),(await win.webContents.capturePage()).toPNG())
  await click('파일');await key('Z',['control']);assert.deepEqual(await save('layout-undo'),original)
  assert.equal(await pdf(),true,'Undo must restore the actual warning, not leave a stale cleared result')
  retry={before,after,warnings:[true,false,true],explicitUserLayoutCommand:true,musicLyricsAndManualGeometryUnchanged:true,exactLayoutUndo:true,automaticLyricSpacingFixed:false}
  fs.writeFileSync(path.join(out,'lyric-retry.json'),JSON.stringify(retry,null,2))
 }
 let manualSlur
 if(process.argv.includes('--audit-manual-slur')){
  step='manual-slur-original';const original=JSON.parse(fs.readFileSync(source)).score
  assert.equal(original.slurs.length,1);const slur=original.slurs[0],before=await manualSlurInk();assert.ok(before.clearance<0,'This authored manual-slur fixture must retain the observed overlap')
  assert.deepEqual(slur.engraving,{offsetX:0,height:3})
  step='manual-slur-properties';await clickButton('도구');await clickButton('범위 표기 찾기');await choose('표기 객체 선택','slur:'+slur.id);await clickButton('배치 · 형상');await choose('표기 배치','above')
  assert.match(await run(()=>document.querySelector('.editor-status').textContent),/1회 수정/)
  const expected=structuredClone(original);expected.slurs[0].engraving.placement='above'
  const changed=await save('manual-slur-above');assert.deepEqual(changed,expected)
  const above=await manualSlurInk();assert.ok(above.clearance>=4,'Above manual slur must clear the conservative lyric bounds')
  step='manual-slur-above-pdf';const aboveIndex=pdfCount;await pdf();const abovePrint=JSON.parse(fs.readFileSync(path.join(out,`print-manual-slur-${aboveIndex}.json`)));assert.ok(abovePrint.clearance>=4)
  const abovePdf=['output.pdf','retry.pdf','restored.pdf'][aboveIndex]||`output-${aboveIndex}.pdf`;fs.copyFileSync(path.join(out,abovePdf),path.join(out,'manual-slur-above.pdf'))
  step='manual-slur-undo';await click('파일');await key('Z',['control']);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/0회 수정/);assert.deepEqual(await save('manual-slur-undo'),original)
  const undo=await manualSlurInk();assert.deepEqual(undo,before)
  const undoIndex=pdfCount;await pdf();const undoPrint=JSON.parse(fs.readFileSync(path.join(out,`print-manual-slur-${undoIndex}.json`)));assert.ok(undoPrint.clearance<0)
  const undoPdf=['output.pdf','retry.pdf','restored.pdf'][undoIndex]||`output-${undoIndex}.pdf`;fs.copyFileSync(path.join(out,undoPdf),path.join(out,'manual-slur-undo.pdf'))
  step='manual-slur-redo-reopen';await click('파일');await key('Z',['control','shift']);assert.deepEqual(await save('manual-slur-redo'),expected)
  openSource=path.join(out,'manual-slur-redo.chromatics');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('manual-slur-redo.chromatics을 열었습니다.'));assert.deepEqual(await save('manual-slur-reopened'),expected);assert.deepEqual(await manualSlurInk(),above)
  assert.equal(await run(()=>Boolean(document.querySelector('.notation-span-target.is-selected'))),false,'Reopen must clear stale span selection')
  openSource=source;await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('fixture.chromatics을 열었습니다.'));assert.deepEqual(await save('manual-slur-source-restored'),original)
  manualSlur={before,above,abovePrint,undo,undoPrint,nativeScoreExact:true,oneCommandUndo:true,redoAndReopen:true,automaticGeometryMutation:false,conservativeTextBounds:true}
  fs.writeFileSync(path.join(out,'manual-slur.json'),JSON.stringify(manualSlur,null,2))
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,partViews,pdfCount,retry,printedLyrics,manualSlur,nativeScoreUnchanged:true,automaticLyricClearanceChecked:process.argv.includes('--require-auto-lyric-clearance'),scope:'Actual chord/lyric ink and optional draft/view/warning checks; physical OS dialogs and general manual slur/lyric clearance remain unverified.'},null,2));console.log('PASS actual chord ink, PDF/native and optional lyric draft/view/warning checks')
 }catch(error){const focus=await run(()=>({documentFocused:document.hasFocus(),active:document.activeElement?.outerHTML,editor:document.querySelector('[aria-label="선택 음표 가사"]')?.outerHTML})).catch(()=>null);fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(error),records,nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused(),focus},null,2));fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());throw error}
 finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})
