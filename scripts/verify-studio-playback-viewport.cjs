// Real renderer and native Space; owned disk-backed IPC, not OS dialogs/hearing.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const width=Number(process.env.DDIRORI_PLAYBACK_WIDTH||960),height=Number(process.env.DDIRORI_PLAYBACK_HEIGHT||750),partView=process.argv.includes('--part-view')
const out=path.resolve(process.env.DDIRORI_PLAYBACK_QA_OUT||'out/ddirori/studio-playback-viewport')
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-playback-viewport-')))
app.disableHardwareAcceleration();fs.mkdirSync(out,{recursive:true})
let win,step='start',failNextSave=false,failedContents,openCurrent=false,pdfCount=0
ipcMain.handle('project:open',()=>{const filePath=path.join(out,openCurrent?'current.chromatics':'fixture.chromatics');return{filePath,fileName:path.basename(filePath),contents:fs.readFileSync(filePath,'utf8')}})
ipcMain.handle('project:save',(_e,v)=>{if(failNextSave){failNextSave=false;failedContents=v.contents;throw Error('QA disk unavailable')}const filePath=path.join(out,'current.chromatics');fs.writeFileSync(filePath,v.contents);return{filePath,fileName:path.basename(filePath)}})
ipcMain.handle('pdf:save',async()=>{
 if(process.argv.includes('--lyric-ties'))fs.writeFileSync(path.join(out,'print-tie-ink.json'),JSON.stringify(await tieInk(true),null,2))
 const ink=await run(()=>[...document.querySelectorAll('.studio-pdf-snapshot .notation-lyric')].map(n=>{const r=n.getBBox();return{text:n.textContent,eventId:n.dataset.eventId,x:r.x,y:r.y,width:r.width,height:r.height,limit:Number(n.ownerSVGElement.getAttribute('width'))}}))
 fs.writeFileSync(path.join(out,'print-lyric-ink.json'),JSON.stringify(ink,null,2))
 const filePath=path.join(out,'journey.pdf');fs.writeFileSync(filePath,await win.webContents.printToPDF({preferCSSPageSize:true}));pdfCount++;return{filePath,fileName:path.basename(filePath)}
})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>null)
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.stack}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,arg)=>{for(let i=0;i<600;i++){if(await run(fn,arg))return;await new Promise(r=>setTimeout(r,25))}throw Error('Timeout: '+step)}
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable public button: '+label);n.click()},label);await settle()}
const key=async(keyCode,modifiers=[])=>{await wait(()=>document.hasFocus());win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Space'||keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:keyCode==='Space'?' ':'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const read=()=>run(()=>{const n=document.querySelector('.score-canvas .notation-playhead'),r=n?.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{cursor:r?.toJSON(),scrollY,limit:Math.min(innerHeight,footer.top),viewport:[innerWidth,innerHeight],edits:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent.endsWith('회 수정'))?.textContent,following:document.querySelector('[aria-label="재생 위치 따라가기"]')?.getAttribute('aria-pressed'),playing:document.querySelector('.studio-playback [aria-label="재생"]').disabled,selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),overflow:document.documentElement.scrollWidth>innerWidth+1,focus:document.activeElement?.getAttribute('aria-label')}})
const capture=async name=>{const s=await read();fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(s,null,2));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());return s}
const fileTools=async()=>{await click('파일');await click('파일 작업 열기')}
const save=async name=>{await fileTools();await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const v=JSON.parse(fs.readFileSync(path.join(out,'current.chromatics'),'utf8'));fs.writeFileSync(path.join(out,name+'.chromatics'),JSON.stringify(v));return v}
const select=async id=>{await run(id=>{const n=document.querySelector(`.notation-event[data-event-id="${id}"]`);if(!n)throw Error('Missing actual note: '+id);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},id);await key('Enter')}
const tieInk=print=>run(print=>{
 const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('svg')
 const paths=[...root.querySelectorAll('.vf-stavetie path')].map(n=>{const r=n.getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height,d:n.getAttribute('d')}})
 const systems=['upper-bar-0','upper-bar-1'].map(id=>Number(root.querySelector(`.notation-measure[data-measure-id="${id}"]`).dataset.systemIndex))
 return{paths,systems,width:Number(svg.getAttribute('width')),height:Number(svg.getAttribute('height'))}
},print)
async function auditSharedLyrics(native){
 step='shared-lyric-ink';await settle()
 const impossible=process.argv.includes('--lyric-impossible'),rhythms=process.argv.includes('--lyric-rhythms')
 const ink=await run(()=>[...document.querySelectorAll('.score-canvas .notation-lyric')].map(n=>{const r=n.getBBox();return{text:n.textContent,eventId:n.dataset.eventId,x:r.x,y:r.y,width:r.width,height:r.height,limit:Number(n.ownerSVGElement.getAttribute('width'))}}))
 assert.ok(ink.length>=2,'Both actual SVG lyrics, including a lower staff, must be drawn')
 const collisions=[]
 for(let i=0;i<ink.length;i++)for(let j=i+1;j<ink.length;j++){const a=ink[i],b=ink[j];if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)collisions.push([i,j])}
 const clipped=ink.filter(n=>n.x<0||n.x+n.width>n.limit)
 if(impossible)assert.ok(clipped.length||collisions.length,'Oversized words remain intact and honestly detectable')
 else{assert.equal(collisions.length,0,'Actual lyric ink overlap');assert.equal(clipped.length,0,'Actual lyric ink clipping')}
 const staves=native.score.parts.flatMap(p=>p.staves)
 const pairs=partView?[]:rhythms?[['top-dotted','bottom-zero'],['top-half','bottom-half-onset'],['mixed-zero','regular-0'],['mixed-second','regular-1'],['mixed-next','regular-next']]:staves[0].measures.map((m,i)=>[m.voices[0].events[0].id,staves[1].measures[i].voices[0].events[0].id])
 const positions=await run(pairs=>pairs.map(pair=>pair.map(id=>{const event=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`),head=event?.querySelector('.vf-notehead');if(!head)throw Error('Missing actual notehead '+id);const r=head.getBBox();return{id,x:r.x,y:r.y,width:r.width,height:r.height}})),pairs)
 for(const pair of positions)assert.ok(Math.abs(pair[0].x-pair[1].x)<.1,'Actual simultaneous noteheads: '+JSON.stringify(pair))
 let ties
 if(process.argv.includes('--lyric-ties')){
  ties=await tieInk(false);fs.writeFileSync(path.join(out,'screen-tie-ink.json'),JSON.stringify(ties,null,2))
  const chord=native.score.title.includes('ties-chord'),cross=native.score.title.endsWith('-cross')
  assert.equal(ties.systems[0]!==ties.systems[1],cross,'Actual lyric/tie system placement')
  assert.equal(ties.paths.length,(chord?2:1)*(cross?2:1),'Every tied member and system piece must be drawn')
  for(const p of ties.paths)assert.ok(p.width>0&&p.height>0&&p.x>=0&&p.y>=0&&p.x+p.width<=ties.width+.1&&p.y+p.height<=ties.height+.1,'Actual tie ink containment')
 }
 if(rhythms){
  const sequences=staves.flatMap(s=>s.measures.flatMap(m=>m.voices.map(v=>v.events.filter(e=>e.type==='note').map(e=>e.id))))
  const rows=await run(sequences=>sequences.map(ids=>ids.map(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"] .vf-notehead`);return n.getBBox().x})),sequences)
  for(const xs of rows)for(let i=1;i<xs.length;i++)assert.ok(xs[i]>xs[i-1],'Actual chronological noteheads must not reverse')
 }
 const id=ink.at(-1).eventId
 await run(id=>document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"]`).scrollIntoView({block:'center'}),id);await settle()
 await capture('shared-lyric-visible')
 const pointer=await run(id=>{const r=document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"]`).getBoundingClientRect();return{x:Math.round(Math.max(1,Math.min(innerWidth-1,r.x+r.width/2))),y:Math.round(r.y+r.height/2)}},id)
 for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...pointer,button:'left',clickCount:1})
 await settle()
 await wait(()=>Boolean(document.querySelector('[aria-label="선택 음표 가사"]')))
 const editor=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');return{value:n.value,focus:document.activeElement===n}})
 assert.equal(editor.value,ink.at(-1).text);assert.ok(editor.focus);await key('Escape')
 assert.deepEqual((await save('shared-before-print')).score,native.score)
 step='shared-lyric-pdf';await click('파일');await click('내보내기 설정')
 await run(()=>{const n=document.querySelector('[aria-label="PDF 목표 장수"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'2');n.dispatchEvent(new Event('input',{bubbles:true}))});await settle()
 await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
 assert.equal(pdfCount,1);const printed=JSON.parse(fs.readFileSync(path.join(out,'print-lyric-ink.json')))
 assert.equal(printed.length,ink.length)
 if(ties){const pdf=JSON.parse(fs.readFileSync(path.join(out,'print-tie-ink.json')));assert.equal(pdf.paths.length,ties.paths.length);for(const p of pdf.paths)assert.ok(p.width>0&&p.height>0&&p.x>=0&&p.y>=0&&p.x+p.width<=pdf.width+.1&&p.y+p.height<=pdf.height+.1,'PDF tie ink containment')}
 if(!impossible){
  for(const n of printed)assert.ok(n.x>=0&&n.x+n.width<=n.limit,'Actual PDF lyric ink horizontal containment')
  for(let i=0;i<printed.length;i++)for(let j=i+1;j<printed.length;j++){const a=printed[i],b=printed[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'Actual PDF lyric ink must not overlap')}
 }
 const report=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent)
 if(impossible)assert.match(report,/가사/)
 assert.deepEqual((await save('shared-after-print')).score,native.score)
 openCurrent=true;await fileTools();await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
 assert.deepEqual((await save('shared-reopened')).score,native.score)
 await capture('shared-layout');fs.writeFileSync(path.join(out,'shared-layout.json'),JSON.stringify({width,height,partView,ink,positions,printed,report,impossible,collisions,clipped,editor,nativeExact:true,manualGeometryExact:true},null,2));console.log('PASS shared lyric actual ink/onsets/editor/PDF/native')
 if(process.argv.includes('--lyric-retry'))await auditLyricRepair(native,ink)
}
async function auditLyricRepair(native,ink){
 step='oversized-lyric-repair';fs.copyFileSync(path.join(out,'journey.pdf'),path.join(out,'oversized-original.pdf'))
 fs.copyFileSync(path.join(out,'print-lyric-ink.json'),path.join(out,'oversized-original-ink.json'))
 const expected=structuredClone(native.score)
 for(const [index,word] of ink.entries()){
  await run(id=>{const n=document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus()},word.eventId);await key('Enter')
  await wait(()=>Boolean(document.querySelector('[aria-label="선택 음표 가사"]')))
  // Select an actual editable field, then await native text insertion before
  // committing. InsertText is asynchronous; an unawaited call can race Enter.
  await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');n.focus();n.select()})
  const before=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');return{focused:document.activeElement===n,start:n.selectionStart,end:n.selectionEnd,length:n.value.length}})
  assert.ok(before.focused&&before.start===0&&before.end===before.length)
  await win.webContents.insertText('고친 가사 '+(index+1));await settle()
  assert.equal(await run(()=>document.querySelector('[aria-label="선택 음표 가사"]').value),'고친 가사 '+(index+1))
  await key('Enter');await key('Escape')
  const event=expected.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.id===word.eventId)
  event.lyrics=[{number:1,syllabic:'single',text:'고친 가사 '+(index+1)}]
 }
 const changed=await save('repaired');assert.deepEqual(changed.score,expected)
 await click('악보로 이동');await key('Z',['control']);await key('Z',['control'])
 assert.deepEqual((await save('repair-undo')).score,native.score)
 await click('악보로 이동');await key('Z',['control','shift']);await key('Z',['control','shift'])
 assert.deepEqual((await save('repair-redo')).score,expected)
 await click('파일');await click('내보내기 설정');await click('PDF 변환')
 for(let i=0;i<600&&pdfCount<2;i++)await new Promise(r=>setTimeout(r,25))
 assert.equal(pdfCount,2);await settle()
 const report=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent)
 assert.doesNotMatch(report,/가사.*(겹|잘|확인)/)
 const printed=JSON.parse(fs.readFileSync(path.join(out,'print-lyric-ink.json')))
 for(const n of printed)assert.ok(n.x>=0&&n.x+n.width<=n.limit,'Repaired actual PDF ink must fit')
 for(let i=0;i<printed.length;i++)for(let j=i+1;j<printed.length;j++){const a=printed[i],b=printed[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'Repaired actual PDF lyrics must not overlap')}
 assert.deepEqual(changed.score.slurs,native.score.slurs)
 openCurrent=true;await fileTools();await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
 assert.deepEqual((await save('repair-reopened')).score,expected)
 fs.writeFileSync(path.join(out,'repair-results.json'),JSON.stringify({width,height,report,printed,exactUndoRedo:true,exactReopen:true,manualGeometryUnchanged:true,actualNativeTextEntry:true},null,2));console.log('PASS oversized lyric edit/undo/redo/PDF retry/native reopen')
}
async function auditLiveView(native){
 const records=[]
 for(const mode of ['part','score']){
  step='live-view-'+mode
  const before=await run(()=>parseFloat(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent))
  await click('형식');await click('악보 설정')
  for(const [label,value] of [['악보 보기',mode],...(mode==='part'?[['파트보 선택','second-part']]:[])]){
   await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Unavailable live view Select');n.focus();n.click()},label);await settle()
   await run(value=>{const n=[...document.querySelectorAll('[role=option]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n)throw Error('Missing live view option');n.click()},value);await settle()
  }
  await click('악보로 이동');await settle()
  const current=await capture('live-'+mode),projection=await run(()=>({part:document.querySelector('.notation-event.is-selected')?.dataset.partId,mode:document.querySelector('[aria-label="악보 페이지"]').dataset.viewMode,beat:parseFloat(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent)}))
  assert.equal(projection.mode,mode);assert.equal(projection.part,mode==='part'?'second-part':native.score.parts[0].id)
  assert.ok(current.playing&&projection.beat>=before,'Changing the view must not restart ensemble playback')
  assert.ok(current.cursor.top>=0&&current.cursor.bottom<=current.limit);assert.equal(current.edits,'0회 수정');records.push({before,current,projection})
 }
 step='live-mixer';await click('믹서 표시');assert.equal(await run(()=>document.querySelector('.studio-part-mixer').hidden),false);await settle();const mixer=await capture('live-mixer')
 const field=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{isMixer:n.matches('.studio-part-mixer input[type=range]'),value:Number(n.value),box:r.toJSON(),limit:Math.min(innerHeight,f.top)}})
 assert.ok(mixer.playing&&field.isMixer&&field.box.top>=0&&field.box.bottom<=field.limit,'Focused mixer control owns the viewport while being edited')
 await key('Right');assert.equal(await run(()=>Number(document.activeElement.value)),field.value+5);assert.equal((await read()).edits,'0회 수정')
 await click('악보로 이동');await settle();const returned=await capture('mixer-return-score');assert.ok(returned.playing&&returned.cursor.top>=0&&returned.cursor.bottom<=returned.limit,'Leaving the mixer must restore cursor visibility');assert.equal(await run(()=>document.querySelector('.studio-part-mixer').hidden),false)
 records.push({mixerField:field,returned,mixerRemainedOpen:true})
 await click('정지');const saved=await save('after-live-view');assert.deepEqual(saved.score,native.score);assert.deepEqual(saved.partLayouts,native.partLayouts)
 fs.writeFileSync(path.join(out,'live-view-results.json'),JSON.stringify({width,height,records,mixer,nativeScoreExact:true,ensembleTimelineContinued:true,controlsKeepFocusUntilScoreNavigation:true,scope:'Public view controls during actual playback, then explicit score navigation;not hearing or OS dialogs.'},null,2));console.log('PASS live score/part/mixer view switch with uninterrupted ensemble timeline')
}
async function auditEditingOwnership(native){
 step='inline-editor-playing';await run(()=>{const n=document.querySelector('.notation-lyric');if(!n?.checkVisibility())throw Error('Actual lyric text required');n.scrollIntoView({block:'center'})});await settle()
 const focusFrames=[];let stable=0
 for(let i=0;i<30&&stable<4;i++){
  await run(()=>{const n=document.querySelector('.notation-lyric');n.focus({preventScroll:true});globalThis.__lyricFocusTarget=n});await settle()
  const frame=await run(()=>({focused:document.activeElement===globalThis.__lyricFocusTarget,connected:globalThis.__lyricFocusTarget.isConnected,same:document.querySelector('.notation-lyric')===globalThis.__lyricFocusTarget,window:document.hasFocus()}));focusFrames.push(frame);stable=frame.focused&&frame.connected&&frame.same&&frame.window?stable+1:0
 }
 fs.writeFileSync(path.join(out,'lyric-entry-focus.json'),JSON.stringify(focusFrames,null,2));assert.equal(stable,4,'Actual lyric focus must settle before native Enter');await key('Enter')
 fs.writeFileSync(path.join(out,'after-lyric-enter.json'),JSON.stringify(await run(()=>({focus:document.activeElement?.outerHTML,input:document.querySelector('[aria-label="선택 음표 가사"]')?.outerHTML,inputs:[...document.querySelectorAll('input')].filter(n=>n.checkVisibility()).map(n=>n.getAttribute('aria-label')),status:document.querySelector('.editor-status').textContent})),null,2))
 await wait(()=>Boolean(document.querySelector('[aria-label="선택 음표 가사"]')))
 const before=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]');n.focus();globalThis.__followEditor=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ㅎ'}));return {value:n.value,focused:document.activeElement===n}})
 assert.ok(before.focused);await key('Home')
 const currentWidth=width===960?980:1380;win.setContentSize(currentWidth,height);await settle()
 const after=await run(()=>{const n=document.querySelector('[aria-label="선택 음표 가사"]'),r=n?.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{sameNode:n===globalThis.__followEditor,value:n?.value,focused:document.activeElement===n,box:r?.toJSON(),limit:Math.min(innerHeight,footer.top),following:document.querySelector('[aria-label="재생 위치 따라가기"]').getAttribute('aria-pressed')}})
 assert.ok(after.sameNode&&after.focused);assert.equal(after.value,before.value);assert.equal(after.following,'true');assert.ok(after.box.top>=0&&after.box.bottom<=after.limit)
 fs.writeFileSync(path.join(out,'inline-editing-active.png'),(await win.webContents.capturePage()).toPNG())
 await run(()=>document.querySelector('[aria-label="선택 음표 가사"]').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})));await key('Escape');await click('정지')
 assert.deepEqual((await save('after-inline-editing')).score,native.score);assert.equal((await read()).edits,'0회 수정');await capture('inline-editing-return')
 fs.writeFileSync(path.join(out,'editing-ownership.json'),JSON.stringify({width,height,before,after,scoreExact:true,historyUnchanged:true,nativeHomeEscape:true,syntheticComposition:true,physicalIme:false},null,2));console.log('PASS inline composition/Home/resize/Escape/follow ownership')
}
async function auditJourney(native){
 step='journey-rewind';await run(()=>document.querySelector('.score-canvas').focus({preventScroll:true}));await key('Space');await wait(()=>Boolean(document.querySelector('.notation-playhead')))
 assert.ok((await read()).selected.includes('viewport-note-0'),'Stop must retain its next-play-from-start contract');await click('정지')
 await select('viewport-note-12');await click('처음으로');await run(()=>document.querySelector('.score-canvas').focus({preventScroll:true}));await key('Space');assert.ok((await read()).selected.includes('viewport-note-0'),'Explicit Rewind must override the retained selection');await click('정지')
 if((await read()).following==='true')await click('재생 위치 따라가기')
 step='journey-input';await select('viewport-note-12');await key('R');await key('N');await key('C');await key('N')
 const input=await save('input');assert.deepEqual(input.score.parts[1],native.score.parts[1]);assert.deepEqual(input.score.slurs,native.score.slurs)
 const note=input.score.parts[0].staves[0].measures[12].voices[0].events[0];assert.equal(note.type,'note');assert.equal(note.pitch.step,'C')
 step='journey-properties';await select(note.id);await click('도구');await click('선택 속성 열기');await click('음높이 한 칸 올리기')
 const changed=structuredClone(input.score);changed.parts[0].staves[0].measures[12].voices[0].events[0].pitch.step='D'
 const edited=await read();await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,input.score)
 await click('악보로 이동');await key('Z',['control','shift']);assert.equal((await read()).edits,edited.edits)
 step='journey-save-failure';const persisted=fs.readFileSync(path.join(out,'current.chromatics'));const selection=(await read()).selected
 failNextSave=true;await fileTools();await click('프로젝트 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다'))
 assert.deepEqual(JSON.parse(failedContents).score,changed);assert.deepEqual(fs.readFileSync(path.join(out,'current.chromatics')),persisted)
 assert.deepEqual((await read()).selected,selection);assert.equal((await read()).edits,edited.edits)
 assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/);await capture('save-failed')
 step='journey-retry';const retried=await save('retry');assert.deepEqual(retried.score,changed);assert.equal((await read()).edits,edited.edits);assert.equal((await read()).following,'false')
 step='journey-pdf';await click('파일');await click('내보내기 설정');await run(count=>{const n=document.querySelector('[aria-label="PDF 목표 장수"]');if(!n?.checkVisibility()||n.disabled)throw Error('Missing actual PDF count');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,count);n.dispatchEvent(new Event('input',{bubbles:true}))},process.argv.includes('--page-boundary')?'4':'3');await settle();await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfCount,1)
 const printed=JSON.parse(fs.readFileSync(path.join(out,'print-lyric-ink.json')));assert.equal(printed.length,2)
 const [a,b]=printed;const overlaps=a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y
 assert.ok(!overlaps,'Shared staff lyrics must not overlap');assert.ok(printed.every(n=>n.x>=0),'Actual lyric ink must not clip at the left edge');assert.doesNotMatch(await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent),/가사.*(겹|잘|확인)/)
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'current.chromatics'))).score,changed);assert.deepEqual(changed.slurs,native.score.slurs)
 step='journey-reopen';openCurrent=true;await fileTools();await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,changed)
 await capture('reopened');fs.writeFileSync(path.join(out,'journey-results.json'),JSON.stringify({width,height,sourceExplicitPageBreak:process.argv.includes('--page-boundary'),actualNoteInput:true,propertyEdit:true,undoRedo:true,failedWritePreservedDisk:true,retryExact:true,nativeReopenExact:true,followingRemainedOff:true,manualGeometryPreserved:true,lyricOverlap:overlaps,pdf:'journey.pdf',scope:'Actual native keys/public fields, injected disk failure, real PDF. No OS dialogs/physical IME/hearing;shared staff lyrics checked with actual ink.'},null,2));console.log('PASS editing/save failure/retry/PDF/reopen journey;shared staff lyric clearance verified')
}
app.whenReady().then(async()=>{
 const deadline=setTimeout(()=>{console.error('Deadline:'+step);app.exit(1)},45000)
 win=new BrowserWindow({width,height,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 try{
  win.setContentSize(width,height)
  await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle()
  step='generated-fixture';await click('파일');await click('파일 작업 열기');await click('프로젝트 저장')
  const native=JSON.parse(fs.readFileSync(path.join(out,'current.chromatics'),'utf8')),part=native.score.parts[0],staff=part.staves[0],measure=staff.measures[0]
  const measures=Array.from({length:24},(_,i)=>({id:'viewport-measure-'+i,number:i+1,timing:{type:'regular'},timeSignature:{beats:4,beatType:4},keySignature:{fifths:0},clef:{sign:'G',line:2},voices:[{id:'voice-1',tuplets:[],events:[{id:'viewport-note-'+i,type:'note',position:{tick:0},duration:{value:'whole',dots:0},pitch:{step:'C',octave:4}}]}]}))
  native.score={id:native.score.id,title:'Playback viewport QA',tempo:{bpm:240,beatUnit:'quarter'},parts:[{...part,staves:[{...staff,measures}]}],layout:{systemBreakBeforeMeasureIds:measures.filter((_,i)=>i>0&&i%4===0).map(m=>m.id)}}
  const secondMeasures=measures.map((m,i)=>({...structuredClone(m),id:'second-measure-'+i,voices:[{...structuredClone(m.voices[0]),events:[{...structuredClone(m.voices[0].events[0]),id:'second-note-'+i,pitch:{step:'E',octave:4}}]}]}))
  native.score.parts.push({...structuredClone(part),id:'second-part',name:'Second part',staves:[{...structuredClone(staff),id:'second-staff',measures:secondMeasures}]})
  if(process.argv.includes('--editing-journey')||process.argv.includes('--editing-ownership')){
   const words=process.argv.includes('--editing-ownership')?['가사','계속']:['가'.repeat(48),'나'.repeat(48)]
   for(const [i,text] of words.entries())measures[i].voices[0].events[0].lyrics=[{text,number:1}]
   native.score.slurs=[{id:'journey-manual-slur',startEventId:'viewport-note-0',endEventId:'viewport-note-1',engraving:{offsetX:0,height:3}}]
  }
  if(process.argv.includes('--editing-ownership')||process.argv.includes('--live-view-switch'))native.score.tempo.bpm=40
  if(process.argv.includes('--rest-start'))for(const list of [measures,secondMeasures]){const event=list[12].voices[0].events[0];event.type='rest';delete event.pitch}
  if(process.argv.includes('--tie-start'))for(const list of [measures,secondMeasures]){list[11].voices[0].events[0].ties={start:true};list[12].voices[0].events[0].ties={stop:true}}
  if(process.argv.includes('--page-boundary'))native.score.layout.pageBreakBeforeMeasureIds=[measures[12].id]
  native.partLayouts=[{partId:'second-part',layout:{systemBreakBeforeMeasureIds:secondMeasures.filter((_,i)=>i>0&&i%4===0).map(m=>m.id)}}];native.view={mode:'score'};if(process.argv.includes('--page-boundary'))native.partLayouts[0].layout.pageBreakBeforeMeasureIds=[secondMeasures[12].id];fs.writeFileSync(path.join(out,'fixture.chromatics'),JSON.stringify(native))
  if(process.env.DDIRORI_SHARED_LYRIC_SOURCE){Object.assign(native,JSON.parse(fs.readFileSync(process.env.DDIRORI_SHARED_LYRIC_SOURCE,'utf8')));fs.writeFileSync(path.join(out,'fixture.chromatics'),JSON.stringify(native))}
  await click('프로젝트 열기');await wait(title=>document.querySelector('.score-title')?.textContent.includes(title),native.score.title);await settle()
  if(partView){
   await click('형식');await click('악보 설정')
   for(const [label,value] of [['악보 보기','part'],['파트보 선택','second-part']]){
    await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility())throw Error('Missing actual view Select');n.click()},label);await settle()
    await run(value=>{const n=[...document.querySelectorAll('[role=option]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n)throw Error('Missing actual view option');n.click()},value);await settle()
   }
  }
  if(process.argv.includes('--lyric-layout')){await auditSharedLyrics(native);return}
  if(process.argv.includes('--selected-start')){
   await run(id=>{const n=document.querySelector(`.notation-event[data-event-id="${id}"]`);if(!n)throw Error('Missing actual starting note');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},(partView?'second-note-':'viewport-note-')+(process.argv.includes('--page-boundary')?'11':'12'));await key('Enter')
  }
  step='offscreen-start';await run(()=>{const canvas=document.querySelector('.score-canvas');canvas.focus({preventScroll:true});window.scrollTo(0,document.documentElement.scrollHeight)});await settle();await capture('before')
  await key('Space');await wait(()=>Boolean(document.querySelector('.notation-playhead')));await settle();const started=await capture('started')
  assert.ok(started.playing);assert.ok(started.cursor.top>=0&&started.cursor.bottom<=started.limit,'Actual playback ink must clear the viewport and fixed status surface')
  if(process.argv.includes('--selected-start')){
   const index=process.argv.includes('--tie-start')||process.argv.includes('--page-boundary')?11:12
   assert.ok(started.selected.includes((partView?'second-note-':'viewport-note-')+index),'Playback must begin at the selected note/tie chain, not the first note')
   const beat=await run(()=>parseFloat(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent));assert.ok(beat>=index*4&&beat<index*4+1,'Audio clock must start at the selected performed beat')
   if(process.argv.includes('--page-boundary')){
    step='explicit-page-boundary';await wait(id=>document.querySelector('.notation-event.is-selected')?.dataset.eventId===id,(partView?'second-note-':'viewport-note-')+'12');await settle();const page=await capture('page-boundary');assert.ok(page.cursor.top>=0&&page.cursor.bottom<=page.limit,'Explicit page-break transition must remain visible')
   }
  }
  assert.equal(started.overflow,false);assert.equal(started.focus,'악보 캔버스','Following must not move keyboard focus')
  if(process.argv.includes('--live-view-switch')){await auditLiveView(native);return}
  if(process.argv.includes('--editing-ownership')){await auditEditingOwnership(native);return}
  if(!process.argv.includes('--initial-only')){
   step='manual-wheel';win.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(started.cursor.x+30),y:Math.round(started.cursor.top+30),deltaY:300,deltaX:0,canScroll:true})
   await wait(()=>document.querySelector('[aria-label="재생 위치 따라가기"]').getAttribute('aria-pressed')==='false');await new Promise(r=>setTimeout(r,200));await settle();const manual=await capture('manual')
   assert.notEqual(manual.scrollY,started.scrollY,'Real wheel input must scroll the document')
   const expectedNote=(partView?'second-note-':'viewport-note-')+'2'
   await wait(id=>document.querySelector('.notation-event.is-selected')?.dataset.eventId===id,expectedNote);await settle();const held=await capture('manual-held')
   assert.ok(Math.abs(held.scrollY-manual.scrollY)<1,'Playback must not undo manual scroll')
   step='follow-again';await click('재생 위치 따라가기');await settle();const resumed=await capture('resumed')
   assert.ok(resumed.cursor.top>=0&&resumed.cursor.bottom<=resumed.limit)
   step='system-boundary';await wait(id=>document.querySelector('.notation-event.is-selected')?.dataset.eventId===id,(partView?'second-note-':'viewport-note-')+'4');await settle();const boundary=await capture('boundary')
   assert.ok(boundary.cursor.top>=0&&boundary.cursor.bottom<=boundary.limit,'Next-system ink must remain visible')
   step='pause';await click('일시정지');await run(()=>window.scrollBy(0,200));await settle();const paused=await capture('paused');await new Promise(r=>setTimeout(r,120));assert.equal((await read()).scrollY,paused.scrollY)
   await run(()=>document.querySelector('.score-canvas').focus({preventScroll:true}));await key('Space');await settle();const playingAgain=await capture('playing-again');assert.ok(playingAgain.cursor.top>=0&&playingAgain.cursor.bottom<=playingAgain.limit)
  }
  await click('정지');assert.equal((await read()).edits,'0회 수정');if(process.argv.includes('--editing-journey')){await auditJourney(native);return}await click('파일');await click('파일 작업 열기');await click('프로젝트 저장');const after=JSON.parse(fs.readFileSync(path.join(out,'current.chromatics'),'utf8'));assert.deepEqual(after.score,native.score);assert.deepEqual(after.partLayouts,native.partLayouts)
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({width,height,partView,nativeScoreExact:true,partLayoutsExact:true,historyUnchanged:true,scope:'Actual Electron Space/mouse wheel, public buttons/Select, generated fixture and disk-backed QA IPC;not OS dialogs or hearing.'},null,2));console.log('PASS playback viewport/manual wheel/system/pause/native contracts')
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(e)},null,2));await capture('failure').catch(()=>{});throw e}finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
