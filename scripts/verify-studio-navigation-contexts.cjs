// Production renderer/preload; real commands and native keys, disk-backed QA dialogs.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_CONTEXT_QA_OUT||'out/ddirori/studio-navigation-contexts')
const inputMetersOnly=process.argv.includes('--input-position-meters')
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-contexts-')));app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,scene,step='start',trace=[],runFailed=false,lastLoggedStep
const deadline=setTimeout(()=>{console.error('Navigation context deadline at '+step);app.exit(1)},120000)
const logStep=()=>{if(lastLoggedStep!==step){console.log('stage: '+step);lastLoggedStep=step}}
const current=()=>path.join(scene,'current.chromatics'),result=()=>({filePath:current(),fileName:'current.chromatics'})
ipcMain.handle('project:save',(_e,v)=>{fs.writeFileSync(current(),v.contents);return result()})
ipcMain.handle('project:open',()=>({...result(),contents:fs.readFileSync(current(),'utf8')}))
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const nativeReady=async()=>{const start=Date.now();while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-start<10000,'Native focus unavailable at '+step);await settle()}}
const key=async(keyCode,modifiers=[])=>{logStep();await nativeReady();win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const clickButton=async label=>{logStep();await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error(`Unavailable ${label}`);n.focus();n.click()},label);await settle()}
const click=async label=>{
 const routes={'파일':['파일','파일 작업 열기'],'음표':['도구','선택 속성 열기'],'가사':['추가','가사 및 코드'],'악보 제목 수정':['악보 정보','악보 제목 편집']}
 if(routes[label]){for(const command of routes[label])await clickButton(command)}else await clickButton(label)
}
const wait=async fn=>{const start=Date.now();while(!await run(fn)){assert.ok(Date.now()-start<10000,step);await settle()}}
const tabs=async(fn,arg)=>{let count=0;while(!await run(fn,arg)){assert.ok(count++<300,`No keyboard route ${step}`);await key('Tab')}return count}
const capture=async name=>fs.writeFileSync(path.join(scene,`${name}.png`),(await win.webContents.capturePage()).toPNG())
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'));fs.copyFileSync(current(),path.join(scene,`${name}.chromatics`));return JSON.parse(fs.readFileSync(current())).score}
const state=()=>run(()=>{const f=document.activeElement,r=f.getBoundingClientRect(),toggle=document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]');if(!toggle)throw Error('Actual note input toggle unavailable');return {selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),measure:document.querySelector('.notation-measure.is-selected')?.dataset.measureId,input:toggle.getAttribute('aria-pressed')||'false',status:document.querySelector('.editor-status').textContent,edits:document.querySelector('.editor-status').textContent.match(/\d+회 수정/)[0],focus:{id:f.dataset.eventId,measure:f.dataset.measureId,label:f.getAttribute('aria-label'),top:r.top,bottom:r.bottom},documentFocused:document.hasFocus(),footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth+1}})
const navigate=async()=>{await tabs(()=>document.activeElement?.getAttribute('aria-label')==='악보로 이동');await key('F6')}
const select=async(id,range=false)=>{await navigate();await tabs(id=>document.activeElement?.dataset.eventId===id,id);await key('Enter',range?['shift']:[])}
const roundtrip=async(expected,field)=>{const before=await state();await key('F6');assert.equal((await state()).focus.label,'악보로 이동');await key('F6');const after=await state();assert.equal(after.focus[field],expected);assert.deepEqual(after.selected,before.selected);assert.equal(after.measure,before.measure);assert.equal(after.edits,before.edits);assert.equal(after.input,before.input);assert.ok(after.focus.top>=0&&after.focus.bottom<=Math.min(750,after.footerTop));assert.equal(after.overflow,false);return after}
const auditInputMeters=async()=>{
 const records=[]
 const cases=[
  {name:'six-eight',beats:6,beatType:8,key:'4',start:'1마디 · 1박 (8분음표 기준)',next:'1마디 · 2박 (8분음표 기준)'},
  {name:'cut-time',beats:2,beatType:2,key:'5',start:'1마디 · 1박 (2분음표 기준)',next:'1마디 · 1+1/2박 (2분음표 기준)'},
  {name:'pickup',beats:4,beatType:4,key:'4',pickup:true,start:'못갖춘 1마디 · 1박 (4분음표 기준)',next:'못갖춘 1마디 · 1+1/2박 (4분음표 기준)'}
 ]
 for(const width of [960,1400])for(const c of cases){
  step=`${width}:${c.name}:fixture`;logStep();scene=path.join(out,`${width}-${c.name}`);fs.mkdirSync(scene,{recursive:true});win.setContentSize(width,750)
  win.webContents.once('will-prevent-unload',e=>e.preventDefault());await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await nativeReady();await settle()
  await click('새 악보 만들기');await click('만들기');await settle();await save('blank-from-wizard')
  // Generated temporary native fixture, derived from the real blank wizard.
  // This is not a claim that meter changes were performed by the UI.
  const fixture=JSON.parse(fs.readFileSync(current(),'utf8'))
  for(const p of fixture.score.parts)for(const s of p.staves)for(const [i,m] of s.measures.entries()){
   m.timeSignature={beats:c.beats,beatType:c.beatType}
   if(c.pickup&&i===0)m.timing={type:'pickup',durationTicks:13440}
  }
  fs.writeFileSync(current(),JSON.stringify(fixture));fs.copyFileSync(current(),path.join(scene,'input-fixture.chromatics'))
  await click('프로젝트 열기');await settle();assert.deepEqual(await save('opened-fixture'),fixture.score)
  const first=fixture.score.parts[0].staves[0].measures[0].voices[0].events[0]
  await select(first.id);await key('N');await key(c.key)
  const position=()=>run(()=>{const n=document.querySelector('[aria-label="입력 위치"]');if(!n)throw Error('Input position missing');const r=n.getBoundingClientRect();return{text:n.textContent,visible:n.checkVisibility(),left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:{width:innerWidth,height:innerHeight},footerTop:document.querySelector('.studio-status').getBoundingClientRect().top}})
  const before=await position();assert.equal(before.text,c.start);assert.equal((await state()).edits,'0회 수정')
  step=`${width}:${c.name}:input`;await key('C');const after=await position();assert.equal(after.text,c.next);assert.equal((await state()).edits,'1회 수정');assert.doesNotMatch((await state()).status,/틱|tick/)
  for(const r of [before,after]){assert.ok(r.visible&&r.left>=0&&r.right<=width&&r.top>=r.footerTop&&r.bottom<=750,'Readable position must be inside the visible status bar')}
  await capture('input-position');const edited=await save('after-input');assert.notDeepEqual(edited,fixture.score)
  await key('Z',['control']);assert.equal((await state()).edits,'0회 수정');assert.equal((await position()).text,c.start);assert.deepEqual(await save('undo-input'),fixture.score)
  await key('Z',['control','shift']);assert.equal((await position()).text,c.next);assert.deepEqual(await save('redo-input'),edited)
  await click('프로젝트 열기');await settle();assert.deepEqual(await save('reopened-input'),edited)
  records.push({width,height:750,meter:`${c.beats}/${c.beatType}`,pickup:Boolean(c.pickup),before,after,oneCommandOneUndo:true,undoRedoExact:true,nativeReopenExact:true})
 }
 fs.writeFileSync(path.join(out,'input-meter-results.json'),JSON.stringify({records,runtime:process.versions,scope:'Temporary generated native fixtures opened through real menus; actual note keys and disk-backed QA bridge. No physical IME/touch or OS dialog.'},null,2))
 console.log('PASS input position:6 meter/viewport cases, real entry/undo/redo/native reopen')
}
app.whenReady().then(async()=>{
 win=new BrowserWindow({width:1400,height:750,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 const records=[],ime=[],tuplets=[]
 try{if(inputMetersOnly){await auditInputMeters();return}
 if(!process.argv.includes('--pitch-only'))for(const width of [960,1400]){
  scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});win.setContentSize(width,750)
  win.webContents.once('will-prevent-unload',e=>e.preventDefault());await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await wait(()=>document.hasFocus());await settle()
  const initial=await save('initial'),events=initial.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))),notes=events.filter(e=>e.type==='note'),rest=events.filter(e=>e.type==='rest').at(-1)
  // Range editing is currently scoped to the anchor measure/voice.
  const rangeEnd=initial.parts[0].staves[0].measures[0].voices[0].events.filter(e=>e.type==='note').at(-1).id
  step=`${width}:range`;await select(notes[0].id);await select(rangeEnd,true)
  const rangeBefore=await state();assert.ok(rangeBefore.selected.length>1);assert.ok(rangeBefore.selected.includes(rangeEnd));const range=await roundtrip(rangeEnd,'id');await capture('range-focus')
  step=`${width}:rest`;assert.ok(rest);await select(rest.id);const restFocus=await roundtrip(rest.id,'id')
  step=`${width}:measure`;const measure=initial.parts[0].staves[0].measures.at(-1).id
  await run(id=>document.querySelector(`.notation-measure[data-measure-id="${id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true})),measure);await settle();await navigate();assert.equal((await state()).focus.measure,measure);const measureFocus=await roundtrip(measure,'measure');await capture('measure-focus')
  step=`${width}:input`;await select(rest.id);await key('N');assert.equal((await state()).input,'true');const input=await roundtrip(rest.id,'id');
  const inputPosition=await run(()=>document.querySelector('[aria-label="입력 위치"]')?.textContent)
  assert.equal(inputPosition,'8마디 · 3박 (4분음표 기준)');assert.doesNotMatch(input.status,/틱|tick/);await capture('input-position');await key('N')
  step=`${width}:metadata-draft`;await click('악보 제목 수정');await run(()=>{const n=document.querySelector('[aria-label="악보 제목"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'한글 제목 draft');n.dispatchEvent(new Event('input',{bubbles:true}))});await settle()
  const draftBefore=await state();await key('F6');assert.equal((await state()).focus.label,'악보 제목');assert.equal((await state()).edits,draftBefore.edits);await key('Escape');assert.equal(await run(()=>Boolean(document.querySelector('[aria-label="악보 제목"]'))),false)
  assert.deepEqual(await save('after-navigation'),initial)
  step=`${width}:replacement`;await click('프로젝트 열기');await settle();await navigate();const replacement=await state();assert.ok(events.some(e=>e.id===replacement.focus.id));assert.deepEqual(await save('reopened'),initial)
  records.push({width,height:750,range,rest:restFocus,measure:measureFocus,input,inputPosition,metadataF6RetainsDraft:true,replacement,nativeUnchanged:true})
  step=`${width}:tuplet-preview`;await select(rest.id);await click('음표');await navigate();await key('N');await key('3',['control']);await key('C')
  assert.ok(await run(()=>Boolean(document.querySelector('.notation-event.is-preview'))),'Actual pending tuplet preview required')
  const beforeTuplet=await state();assert.equal(await run(()=>document.querySelector('[aria-label="입력 위치"]')?.textContent),'8마디 · 묶음 시작 3박 (4분음표 기준)');assert.doesNotMatch(beforeTuplet.status,/틱|tick/);trace.push({stage:'before-f6',state:beforeTuplet});await key('F6');assert.equal((await state()).focus.label,'악보로 이동');await key('F6');trace.push({stage:'after-f6',state:await state()})
  const preview=await run(()=>{const n=document.querySelectorAll('.notation-event.is-preview')[1],r=n.getBoundingClientRect();return {focus:document.activeElement?.getAttribute('aria-label'),top:r.top,bottom:r.bottom,footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,measure:n.dataset.measureId,editable:n.hasAttribute('tabindex')}})
  assert.equal(preview.focus,'악보 캔버스');assert.equal(preview.measure,measure);assert.equal(preview.editable,false);assert.ok(preview.top>=0&&preview.bottom<=Math.min(750,preview.footerTop));assert.equal((await state()).edits,beforeTuplet.edits);await capture('tuplet-preview-focus');tuplets.push({width,preview,historyUnchanged:true})
  for(const letter of ['D','E','N']){await key(letter);trace.push({stage:letter,state:await state()})}const completed=await save('tuplet-completed');assert.equal(completed.parts[0].staves[0].measures.at(-1).voices[0].tuplets.length,1)
  // Undo restores the pre-command 2/3 draft, which is intentionally unsavable.
  // The focused public save button may own an open Tooltip's first Escape.
  // Return to the editor before cancelling its draft; do not bypass either layer.
  await key('Z',['control']);assert.match((await state()).status,/셋잇단음표 2\/3/);assert.equal((await state()).edits,'0회 수정');await key('F6');assert.equal((await state()).focus.label,'악보 캔버스');await key('Escape');assert.equal(await run(()=>Boolean(document.querySelector('.notation-event.is-preview'))),false);assert.deepEqual(await save('tuplet-undo'),initial);await click('프로젝트 열기');await settle()
 }
 if(!process.argv.includes('--pitch-only')){
  const base=await save('ime-base'),first=base.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.type==='note').id
  for(const field of ['title','chord']){
   step=`ime:${field}`;if(field==='title')await click('악보 제목 수정');else{await select(first);await click('가사');await clickButton('코드 심벌 편집')}
   const label=field==='title'?'악보 제목':'선택 요약 코드',value=field==='title'?'한글 조합 검증':'Dm7'
   await run(({label,value})=>{const n=document.querySelector(`[aria-label="${label}"]`);n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,value);n.dispatchEvent(new Event('input',{bubbles:true}))},{label,value});await settle();const before=await state()
   for(const event of [{key:'Enter',code:'Enter',keyCode:229},{key:'Escape',code:'Escape',isComposing:true}]){
    await run(event=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{...event,bubbles:true,cancelable:true})),event);await settle();assert.equal((await state()).focus.label,label);assert.equal(await run(()=>document.activeElement.value),value);assert.equal((await state()).edits,before.edits)
   }
   await key('F6');assert.equal((await state()).focus.label,label);await capture(`ime-${field}-draft`);await key('Enter');assert.equal((await state()).edits,'1회 수정')
   const committed=await save(`ime-${field}-commit`);if(field==='title')assert.equal(committed.title,value);else assert.equal(committed.harmonies[0].text,value)
   await key('Z',['control']);assert.deepEqual(await save(`ime-${field}-undo`),base);ime.push({field,syntheticIme229AndEscape:true,nativeF6Ignored:true,normalEnterOneUndo:true})
  }
 }
 step='pitch-limit:wizard';scene=path.join(out,'pitch-limit');fs.mkdirSync(scene,{recursive:true});win.setContentSize(960,750)
 win.webContents.once('will-prevent-unload',e=>e.preventDefault());await win.loadFile(path.resolve('out/renderer/index.html'));await settle();await click('새 악보 만들기');await click('만들기');await settle();await navigate();await key('N');await key('5')
 step='pitch-limit:ascending-entry';for(let phrase=0;phrase<6;phrase++)for(const pitch of ['C','D','E','F','G'])await key(pitch)
 const boundary=await save('at-limit'),boundaryNotes=boundary.parts[0].staves[0].measures.flatMap(m=>m.voices.flatMap(v=>v.events)).filter(e=>e.type==='note');assert.equal(boundaryNotes.length,30);assert.equal(Math.max(...boundaryNotes.map(n=>n.pitch.octave)),9)
 await navigate();const beforeReject=await state();await key('C');const rejected=await state();assert.equal(rejected.edits,beforeReject.edits);assert.deepEqual(rejected.selected,beforeReject.selected);assert.equal(rejected.input,beforeReject.input)
 assert.match(await run(()=>document.body.textContent),/남은 박자와 음높이 범위/);await capture('rejected-input');assert.deepEqual(await save('after-rejection'),boundary)
 await key('Z',['control']);const undone=await save('undo-after-rejection');assert.equal(undone.parts[0].staves[0].measures.flatMap(m=>m.voices.flatMap(v=>v.events)).filter(e=>e.type==='note').length,29)
 await key('Z',['control','shift']);assert.deepEqual(await save('redo-after-rejection'),boundary)
 await click('프로젝트 열기');await settle();assert.deepEqual(await save('reopened-after-rejection'),boundary)
 const pitchLimit={notes:30,maxOctave:9,rejected:1,beforeReject,afterReject:rejected,exactUndoRedo:true,nativeReopenExact:true}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,ime,tuplets,pitchLimit,runtime:process.versions,scope:'Actual renderer keys/commands; scripted metadata text and synthetic IME signals; disk-backed QA bridge, no physical IME or OS dialog.'},null,2));console.log('PASS F6 contexts, tuplet previews, IME drafts and out-of-range rejection/save/undo/native reopen')
 }catch(error){runFailed=true;console.error(error);await capture('failure');fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(error),trace,nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused(),state:await state().catch(()=>null)},null,2));throw error}
 finally{clearTimeout(deadline);win.destroy();app.exit(runFailed?1:0)}
}).catch(error=>{console.error(error);app.exit(1)})
