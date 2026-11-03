// Existing wizard/input/selection/inspector commands only. QA IPC writes real files.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_MUSICAL_QA_OUT||'out/ddirori/studio-musical-workflow')
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-musical-')));app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,step='start',pdfCount=0,printedNoteInk,runFailed=false,lastLoggedStep
const trace=()=>{if(lastLoggedStep!==step){console.log('stage: '+step);lastLoggedStep=step}}
const deadline=setTimeout(()=>{console.error('Musical workflow deadline at '+step);app.exit(1)},180000)
const file=ext=>path.join(out,`current.${ext}`),result=ext=>({filePath:file(ext),fileName:path.basename(file(ext))})
ipcMain.handle('project:save',(_e,v)=>{fs.writeFileSync(file('chromatics'),v.contents);return result('chromatics')})
ipcMain.handle('project:open',()=>({...result('chromatics'),contents:fs.readFileSync(file('chromatics'),'utf8')}))
ipcMain.handle('musicxml:open',()=>({...result('musicxml'),contents:fs.readFileSync(file('musicxml'),'utf8')}))
for(const c of ['musicxml:save','musicxml:export'])ipcMain.handle(c,(_e,v)=>{fs.writeFileSync(file('musicxml'),v.contents);return result('musicxml')})
ipcMain.handle('pdf:save',async()=>{printedNoteInk=await run(()=>{const svg=document.querySelector('.studio-pdf-snapshot .notation-preview svg');if(!svg)throw Error('Actual PDF snapshot notation missing');const bounds=svg.getBoundingClientRect(),heads=[...svg.querySelectorAll('.notation-event .vf-notehead')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}});return {heads:heads.length,violations:heads.filter(r=>r.width>0&&(r.left<bounds.left-1||r.right>bounds.right+1)),svg:{left:bounds.left,right:bounds.right}}});fs.writeFileSync(file('pdf'),await win.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));pdfCount++;return result('pdf')})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async fn=>{const start=Date.now();while(!await run(fn)){assert.ok(Date.now()-start<10000,step);await settle()}}
const nativeReady=async()=>{const start=Date.now();while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-start<10000,'Native focus unavailable at '+step);await settle()}}
const key=async(keyCode,modifiers=[])=>{trace();await nativeReady();win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const clickButton=async label=>{trace();await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(`Unavailable ${label}`);n.focus();n.click()},label);await settle()}
const click=async label=>{
 const entries={'파일':['파일','파일 작업 열기'],'악보':['형식','악보 설정'],'음표':['도구','선택 속성 열기'],'가사':['추가','가사 및 코드'],'내보내기':['파일','내보내기 설정']}
 if(entries[label]){for(const command of entries[label])await clickButton(command);return}
 if(label==='표기 객체'){
  await clickButton('추가');await clickButton('표기 팔레트 열기')
  if(!await run(()=>[...document.querySelectorAll('.studio-notation-palette button')].find(n=>n.textContent.trim()==='범위 기호 설정 열기')?.checkVisibility()))await clickButton('범위 기호')
  await clickButton('범위 기호 설정 열기');return
 }
 await clickButton(label)
}
const choose=async(label,value)=>{await run(label=>{const n=[...document.querySelectorAll('[role="combobox"]')].find(n=>n.checkVisibility()&&[...document.querySelectorAll('label')].some(l=>l.htmlFor===n.id&&l.textContent.trim()===label));if(!n||n.disabled)throw Error('Unavailable Select '+label);n.focus();n.click()},label);await settle();await run(value=>{const n=[...document.querySelectorAll('[role="listbox"] [role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n||n.getAttribute('aria-disabled')==='true')throw Error('Unavailable option '+value);n.click()},value);await settle()}
const change=async(selector,value)=>{if(selector==='[aria-label="코드 심벌"]'){await clickButton('코드 심벌 편집');selector='[aria-label="선택 요약 코드"]'}await run(({selector,value})=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error(`Unavailable ${selector}`);n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}))},{selector,value});await settle()}
const tabs=async(fn,arg)=>{let count=0;while(!await run(fn,arg)){assert.ok(count++<700,`Keyboard target unavailable ${step}`);await key('Tab')}}
const select=async(id,range=false)=>{await run(id=>{const n=[...document.querySelectorAll('.notation-event[tabindex="0"]')].find(n=>n.dataset.eventId===id);if(!n)throw Error(`Missing ${id}`);n.focus();n.scrollIntoView({block:'center',inline:'nearest'})},id);await key('Enter',range?['shift']:[])}
const navigate=async()=>{await tabs(()=>document.activeElement?.getAttribute('aria-label')==='악보로 이동');await key('F6')}
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));fs.copyFileSync(file('chromatics'),path.join(out,`${name}.chromatics`));return JSON.parse(fs.readFileSync(file('chromatics'))).score}
const capture=async name=>fs.writeFileSync(path.join(out,`${name}.png`),(await win.webContents.capturePage()).toPNG())
// QA text enlargement only; never change paper, music glyphs or output metrics.
const textScale=async scale=>{await run(scale=>{
 window.__musicalTextScale=scale
 if(!window.__musicalApplyTextScale){
  const originals=new Map()
  window.__musicalApplyTextScale=()=>{
   for(const [node,size] of originals){if(node.isConnected)node.style.fontSize=size;else originals.delete(node)}
   if(window.__musicalTextScale!==2)return
   const nodes=[...document.querySelectorAll('.ddirori :is(button,input,summary,label,span,output,h1,h2,h3,h4,p,dt,dd,.dd-text)')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot')||n.closest('.studio-metadata-editor,.studio-inline-lyric-editor'))
   const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))
   nodes.forEach((n,i)=>{if(!originals.has(n))originals.set(n,n.style.fontSize);n.style.fontSize=(sizes[i]*2)+'px'})
  }
  const observer=new MutationObserver(()=>window.__musicalApplyTextScale())
  observer.observe(document.body,{childList:true,subtree:true});window.__musicalTextObserver=observer
 }
 window.__musicalApplyTextScale()
 },scale);await settle()}
const edits=()=>run(()=>Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)[1]))
const notes=score=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note')
const extremeLyrics=process.argv.includes('--extreme-lyrics')
const achievementLifecycle=process.argv.includes('--first-achievement-lifecycle')
const achievementRecords=[]
const observeAchievement=async(phase,visible)=>{
 await nativeReady()
 const state=await run(async()=>{
  let previous='',stable=0,state
  for(let frame=0;frame<90&&stable<3;frame++){
   await new Promise(resolve=>requestAnimationFrame(resolve))
   const notice=document.querySelector('[aria-label="첫 저장 알림 닫기"]')?.closest('.studio-result'),selected=document.querySelector('.notation-event.is-selected'),active=document.activeElement,box=selected?.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect()
   state={notice:!!notice,noticeHeight:notice?.getBoundingClientRect().height||0,selected:selected?.dataset.eventId,box:box?.toJSON(),footerTop:footer.top,viewport:[innerWidth,innerHeight],inputActive:document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]')?.getAttribute('aria-pressed'),activeTag:active?.tagName,activeEvent:active?.getAttribute('data-event-id'),documentFocused:document.hasFocus(),status:document.querySelector('.editor-status').textContent}
   const key=JSON.stringify(state);stable=key===previous?stable+1:0;previous=key
  }
  return{...state,stable:stable>=3}
 })
 const record={phase,...state,nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused()};achievementRecords.push(record);fs.writeFileSync(path.join(out,'first-achievement.json'),JSON.stringify(achievementRecords,null,2));assert.equal(state.stable,true);assert.equal(state.notice,visible,phase)
 if(phase==='committed-pitch'){
  assert.equal(state.inputActive,'true');assert.ok(state.selected);assert.ok(state.documentFocused&&record.nativeWindow&&record.nativeContents)
  assert.ok(state.box&&state.box.top>=0&&state.box.bottom<=Math.min(state.viewport[1],state.footerTop)&&state.box.left>=0&&state.box.right<=state.viewport[0],JSON.stringify(record))
 }
 await capture('achievement-'+phase)
}
const lyricA=extremeLyrics?'가'.repeat(48):'봄날의 바람이',lyricB=extremeLyrics?'나'.repeat(48):'띠로리와 함께'
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:960,height:750,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 try{
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error('renderer:',event.message)})
 nativeTheme.themeSource='light';await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();win.webContents.focus();await nativeReady();await settle()
 step='wizard';const title='띠로리 Studio 봄날의 작은 합주 — 긴 한글 제목과 첫 사용 편집 흐름 검증'
 await click('새 악보 만들기');await change('.studio-new-score-form input',title);await change('.studio-new-score-form input[max="64"]','64');await key('Enter');await wait(()=>Boolean(document.querySelector('.notation-preview svg')))
 let score=await save('blank');assert.equal(score.title,title)
 step='phrase-input'
 for(const start of [0,16,32,60]){
  const target=score.parts[0].staves[0].measures[start].voices[0].events[0].id
  await select(target);await key('N')
  if(achievementLifecycle&&start===16)await observeAchievement('selection-and-input-mode',true)
  for(let bar=0;bar<4;bar++){
   for(const [duration,pitch] of [['5','C'],['4','D'],['4','E'],['5','F'],['5','E']].slice(0,start===60&&bar===3?4:5)){
    await key(duration)
    if(achievementLifecycle&&start===16&&bar===0&&pitch==='C')await observeAchievement('next-duration-setting',true)
    await key(pitch)
    if(achievementLifecycle&&start===16&&bar===0&&pitch==='C')await observeAchievement('committed-pitch',false)
   }
  }
  await key('N');score=await save(`phrase-${start+1}`)
  if(achievementLifecycle&&start===0)await observeAchievement('actual-first-save',true)
 }
 assert.equal(notes(score).length,79);assert.equal(score.parts[0].staves[0].measures.length,64)
 assert.deepEqual([...new Set(notes(score).map(n=>n.duration.value))].sort(),['eighth','quarter'])
 const first=notes(score)[0],second=notes(score)[1],last=notes(score).at(-1)
 step='lyrics-chord';await select(first.id);await click('가사')
 await change('[aria-label="선택 음표 가사"]',lyricA);const lyricBefore=await edits();await key('F6');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 음표 가사');assert.equal(await edits(),lyricBefore);await key('Enter')
 await change('[aria-label="선택 음표 가사"]',lyricB);await key('Enter')
 await select(first.id);await click('가사');await change('[aria-label="코드 심벌"]','Cmaj7/G');const chordBefore=await edits();await key('F6');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드');assert.equal(await edits(),chordBefore);await key('Enter');assert.equal(await edits(),chordBefore+1)
 score=await save('music-and-text');assert.equal(notes(score)[0].lyrics[0].text,lyricA);assert.equal(notes(score)[1].lyrics[0].text,lyricB);assert.equal(score.harmonies[0].text,'Cmaj7/G')
 step='long-part-name';await click('악보');const longPart='봄날의 합주를 함께 연주하는 플루트와 현악 파트 이름 접근성 확인'
 await change('[aria-label="현재 파트 이름"]',longPart);await key('Tab');const named=await save('long-part');assert.equal(named.parts[0].name,longPart)
 await click('악보');await change('[aria-label="현재 파트 이름"]',longPart);await capture('long-part-field');assert.equal(await run(()=>document.documentElement.scrollWidth>innerWidth+1),false)
 await key('Tab');await click('파일');await key('Z',['control']);assert.deepEqual(await save('long-part-undo'),score)
 step='slur';await click('음표');await select(first.id);await select(second.id,true);await click('표기 객체');await click('슬러 추가 또는 해제, 단축키 S');score=await save('slur');assert.equal(score.slurs.length,1);const spanId=score.slurs[0].id
 const inspector=async()=>{await clickButton('도구');await clickButton('범위 표기 찾기');await choose('표기 객체 선택',`slur:${spanId}`);if(await run(()=>document.querySelector('.studio-span-properties__geometry button[aria-expanded]').getAttribute('aria-expanded'))!=='true')await clickButton('배치 · 형상');await settle()}
 await inspector();await change('[aria-label="표기 가로 이동"]','0');await key('Enter');const zero=await save('zero');assert.equal(zero.slurs[0].engraving.offsetX,0)
 await inspector();await change('[aria-label="표기 높이"]','3');const before=await edits();await key('F6');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'표기 높이');assert.equal(await edits(),before);await key('Enter');assert.equal(await edits(),before+1)
 const manual=await save('manual');await key('Z',['control']);assert.deepEqual(await save('undo'),zero);await key('Z',['control','shift']);assert.deepEqual(await save('redo'),manual)
 const reviews=[]
 for(const width of [960,1400])for(const theme of ['light','dark']){
  step=`accessibility-${width}-${theme}`;win.setContentSize(width,750);nativeTheme.themeSource=theme;await inspector()
  const baseFont=await run(()=>parseFloat(getComputedStyle(document.querySelector('[aria-label="표기 가로 이동"]')).fontSize))
  await textScale(2)
  const enlargedFont=await run(()=>parseFloat(getComputedStyle(document.querySelector('[aria-label="표기 가로 이동"]')).fontSize))
  assert.ok(baseFont>0);assert.equal(enlargedFont,baseFont*2,'Geometry input must actually use200% of its current public font')
  await change('[aria-label="표기 가로 이동"]','9');const beforeInvalid=await edits();await key('Enter');assert.equal(await edits(),beforeInvalid);assert.equal(await run(()=>document.querySelector('[aria-label="표기 가로 이동"]').getAttribute('aria-invalid')),'true')
  const targets=['표기 높이','표기 자동 배치 복원']
  const conditions=[]
  for(const coarse of [false,true]){
   if(coarse){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await settle()}
   for(const label of targets){await tabs(label=>document.activeElement?.getAttribute('aria-label')===label,label)
    const geometry=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),p=document.querySelector('#studio-properties').getBoundingClientRect(),s=getComputedStyle(n);return {field:{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height},panel:{top:p.top,bottom:p.bottom,left:p.left,right:p.right},footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,ring:Math.max(0,parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset)),overflow:document.documentElement.scrollWidth>innerWidth+1}})
    assert.equal(geometry.overflow,false);assert.ok(geometry.field.top-geometry.ring>=Math.max(0,geometry.panel.top)-1&&geometry.field.bottom+geometry.ring<=Math.min(750,geometry.panel.bottom,geometry.footerTop)+1,JSON.stringify({label,geometry}));assert.ok(geometry.field.left-geometry.ring>=geometry.panel.left-1&&geometry.field.right+geometry.ring<=geometry.panel.right+1)
    if(coarse)assert.ok(geometry.field.height>=48);conditions.push({label,coarse,geometry});await capture(`${width}-${theme}-${coarse?'coarse':'fine'}-${label==='표기 높이'?'height':'reset'}`)
   }
   if(coarse){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}
  }
  reviews.push({width,theme,textPercent:200,baseFont,enlargedFont,conditions})
  await textScale(1)
 }
 step='save-reopen';nativeTheme.themeSource='light';await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('reopened'),manual)
 for(const width of [960,1400]){win.setContentSize(width,750);await click('음표');await select(last.id);await navigate();await capture(`${width}-late-music`)}
 step='outputs';await click('파일');await click('MusicXML로 저장');assert.match(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent),/슬러·헤어핀의 수동 배치/)
 await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]'),button=[...report.querySelectorAll('button')].find(n=>n.textContent.trim()==='기술 정보');if(!button?.checkVisibility())throw Error('Warning technical disclosure unavailable');button.focus();button.click()});await settle();assert.match(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent),/Manual span placement/);fs.copyFileSync(file('musicxml'),path.join(out,'export.musicxml'))
 await click('내보내기');await change('[aria-label="PDF 목표 장수"]','3');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfCount,1)
 const pdfInfo=require('node:child_process').execFileSync('pdfinfo',[file('pdf')],{encoding:'utf8'}),pages=Number(pdfInfo.match(/Pages:\s+(\d+)/)[1]);assert.ok(pages>=2);assert.deepEqual(JSON.parse(fs.readFileSync(file('chromatics'))).score,manual)
 const pdfWarning=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent)
 assert.equal(pdfWarning.includes('PDF에 겹치는 가사가 있습니다'),extremeLyrics)
 assert.ok(printedNoteInk.heads>=79);assert.equal(printedNoteInk.violations.length,0,'Lyric reservation must not push actual notehead ink outside SVG')
 await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').scrollIntoView({block:'center'}));await settle();await capture('pdf-lyric-overlap-warning')
 step='xml-reopen';await click('파일');await click('MusicXML 가져오기');await settle();const reopened=await save('xml-roundtrip')
 assert.deepEqual(notes(reopened).map(n=>({pitch:n.pitch,duration:n.duration,lyrics:n.lyrics})),notes(manual).map(n=>({pitch:n.pitch,duration:n.duration,lyrics:n.lyrics})));assert.equal(reopened.slurs.length,1);assert.equal(reopened.slurs[0].engraving,undefined)
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({title,measures:64,noteCount:79,durations:['quarter','eighth'],lyricCount:2,lyrics:[lyricA,lyricB],extremeLyrics,pdfWarning,printedNoteInk,chord:'Cmaj7/G',spanId,reviews,pages,pdfInfo,nativeExact:true,xmlMusicPreserved:true,xmlManualGeometryPreserved:false,runtime:process.versions,scope:'Actual renderer commands/native keys; programmed field text and focus setup; disk-backed QA dialogs; emulated coarse/text200, no physical IME or OS dialog.'},null,2));console.log('PASS musical workflow: 79 notes/64 measures, lyrics/chord/slur, native/undo/PDF/XML and inspector access')
 }catch(error){runFailed=true;console.error(error);await capture('failure');const state=await run(()=>({status:document.querySelector('.editor-status')?.textContent,document:document.querySelector('.studio-document')?.textContent,report:document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent,focus:document.activeElement?.getAttribute('aria-label')}));fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(error),state},null,2));throw error}
 finally{clearTimeout(deadline);win.destroy();app.exit(runFailed?1:0)}
}).catch(error=>{console.error(error);app.exit(1)})
