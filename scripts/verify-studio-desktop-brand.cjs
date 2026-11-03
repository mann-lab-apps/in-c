// Run with Electron, in two processes using the same owned directory:
// electron scripts/verify-studio-desktop-brand.cjs --seed --qa-dir=/absolute/temp
// electron scripts/verify-studio-desktop-brand.cjs --qa-dir=/absolute/temp
// This harness uses real Electron storage/native menus; dialog-free tests are
// separate from physical OS dialog or accessibility approval.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const {app,BrowserWindow,Menu,dialog}=require('electron')
const root=path.resolve(__dirname,'..')
const argument=process.argv.find(arg=>arg.startsWith('--qa-dir='))
assert(argument,'Supply a new, owned --qa-dir')
const output=path.resolve(argument.slice(9));fs.mkdirSync(output,{recursive:true})
const appData=path.join(output,'app-data'),legacy=path.join(appData,'in-C')
fs.mkdirSync(legacy,{recursive:true});app.setPath('appData',appData)
const timeout=setTimeout(()=>{console.error('DESKTOP_BRAND_QA_DEADLINE');app.exit(1)},90000)
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async(fn,label)=>{const until=Date.now()+10000;while(!await fn()){assert(Date.now()<until,label);await pause(30)}}
async function seed(){
  app.setName('in-C');app.setPath('userData',legacy);app.setPath('sessionData',legacy)
  const bundle=path.join(output,'fixture.cjs')
  require('esbuild').buildSync({stdin:{contents:"export {createPartSpanResetFixture} from './src/testing/part-span-reset-fixture'; export {encodeNativeProject} from './src/project/schema'; export {createStudioEditingFixture} from './src/testing/studio-editing-fixture';export {createNewScore} from './src/renderer/src/editor/new-score';export {pitchToMidi,resolveNotePitch} from './src/score-core';export {createNativeProject} from './src/project/schema';",resolveDir:root},bundle:true,platform:'node',format:'cjs',loader:{'.musicxml':'text','.xml':'text'},outfile:bundle})
  const fixture=require(bundle),project=fixture.createPartSpanResetFixture();project.score.title='Legacy brand compatibility'
  const native=path.join(output,'legacy.chromatics');fs.writeFileSync(native,fixture.encodeNativeProject(project))
  fs.writeFileSync(path.join(output,'editing-source.chromatics'),fixture.encodeNativeProject(fixture.createStudioEditingFixture()))
  fs.writeFileSync(path.join(output,'meter-source.chromatics'),fixture.encodeNativeProject(fixture.createNativeProject(fixture.createNewScore({title:'Meter QA',templateId:'string-quartet',measureCount:3,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}}))))
  fs.mkdirSync(path.join(legacy,'autosave'),{recursive:true})
  fs.writeFileSync(path.join(legacy,'autosave/recovery.json'),JSON.stringify({score:project.score,project,metadata:{title:project.score.title,updatedAt:'2026-11-03',version:'0.1.0-alpha.38'}}))
  fs.writeFileSync(path.join(legacy,'recent-musicxml.json'),JSON.stringify([{filePath:native,fileName:'legacy.chromatics',format:'native',openedAt:'2026-11-03'}]))
  fs.mkdirSync(path.join(legacy,'native-project-backups'),{recursive:true});fs.copyFileSync(native,path.join(legacy,'native-project-backups','legacy.chromatics'))
  await app.whenReady();const window=new BrowserWindow({show:false})
  const html=path.join(output,'seed.html');fs.writeFileSync(html,'<!doctype html><title>Owned legacy profile seed</title>')
  await window.loadFile(html)
  await window.webContents.executeJavaScript(`localStorage.setItem('studio-brand-compatibility','legacy-file-origin');localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}));`)
  await window.webContents.session.flushStorageData()
  fs.writeFileSync(path.join(output,'seed.json'),JSON.stringify({appData,legacy,native,nativeSha256:sha(native),recoverySha256:sha(path.join(legacy,'autosave/recovery.json')),recentSha256:sha(path.join(legacy,'recent-musicxml.json'))},null,2))
  window.destroy();clearTimeout(timeout);app.quit()
}
let ownedWindow
async function current(){
  const savedProject=path.join(output,'created.chromatics')
  let pdfIndex=0,currentFile=path.join(output,'editing-source.chromatics')
  dialog.showSaveDialog=async options=>({canceled:false,filePath:options.title==='PDF 변환'?path.join(output,`editing-${++pdfIndex}.pdf`):savedProject})
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[currentFile]})
  require(path.join(root,'out/main/index.js'))
  await app.whenReady();await wait(()=>BrowserWindow.getAllWindows().length,'main window')
  const window=BrowserWindow.getAllWindows()[0],web=window.webContents;ownedWindow=window
  web.on('console-message',(_event,level,message)=>console.log('RENDERER',level,message))
  const evaluate=(fn,arg)=>web.executeJavaScript(`(${fn})(${JSON.stringify(arg)??''})`,true)
  await wait(async()=>evaluate(()=>Boolean(document.querySelector('.start-screen'))),'real welcome screen')
  const seed=JSON.parse(fs.readFileSync(path.join(output,'seed.json')))
  const before=await evaluate(async()=>({name:window.inC.appName,title:document.title,marker:localStorage.getItem('studio-brand-compatibility'),widths:localStorage.getItem('chromatics.dock-widths.v1'),recent:await window.inC.recentMusicXml.list(),recovery:await window.inC.autosave.read(),backups:await window.inC.project.listBackups()}))
  assert.equal(app.getName(),'띠로리 Studio');assert.equal(app.getPath('userData'),legacy);assert.equal(app.getPath('sessionData'),legacy)
  assert.equal(before.name,'띠로리 Studio');assert.equal(before.title,'띠로리 Studio');assert.equal(before.marker,'legacy-file-origin')
  assert.deepEqual(JSON.parse(before.widths),{palette:207,properties:360});assert.equal(before.recent[0].filePath,seed.native);assert.equal(before.recovery.project.score.title,'Legacy brand compatibility');assert.equal(before.backups[0].title,'Legacy brand compatibility')
  assert.equal(sha(seed.native),seed.nativeSha256);assert.equal(sha(path.join(legacy,'autosave/recovery.json')),seed.recoverySha256);assert.equal(sha(path.join(legacy,'recent-musicxml.json')),seed.recentSha256)
  const nativeMenu=Menu.getApplicationMenu()?.items.map(item=>({label:item.label,role:item.role,children:item.submenu?.items.map(child=>({label:child.label,role:child.role}))}))
  assert(nativeMenu?.some(item=>item.label==='띠로리 Studio'),'Native app menu display name')
  const click=async(label)=>{
    console.log('CLICK',label)
    const locate=label=>{const n=[...document.querySelectorAll('button,[role="menuitem"],[role="option"]')].find(n=>(n.getAttribute('aria-label')===label||n.textContent.trim()===label)&&n.checkVisibility());if(!n||n.disabled)throw Error('Missing/enabled '+label);return n}
    const offscreen=await evaluate(({label,source})=>{const r=(new Function('return ('+source+')'))()(label).getBoundingClientRect();return r.top<0||r.bottom>innerHeight},{label,source:locate.toString()})
    if(offscreen){web.sendInputEvent({type:'mouseWheel',x:window.getContentBounds().width-40,y:30,deltaX:0,deltaY:500,canScroll:true});await evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));console.log('NATIVE_WHEEL_TO_REACH',label)}
    const until=Date.now()+3000
    while(Date.now()<until){
      const bounds=await evaluate(({label,source})=>{const node=(new Function('return ('+source+')'))()(label),r=node.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth)node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const r=node.getBoundingClientRect();resolve({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)})})))},{label,source:locate.toString()})
      web.sendInputEvent({type:'mouseMove',...bounds})
      const stable=await evaluate(({label,source,point})=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const node=(new Function('return ('+source+')'))()(label),r=node.getBoundingClientRect(),hit=document.elementFromPoint(point.x,point.y);resolve(Math.abs(r.x+r.width/2-point.x)<=1&&Math.abs(r.y+r.height/2-point.y)<=1&&(hit===node||node.contains(hit)))}))),{label,source:locate.toString(),point:bounds})
      if(!stable){console.log('POINTER_REMEASURE',label);continue}
      web.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...bounds});web.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...bounds});await pause(70);return
    }
    throw Error('Pointer did not settle on '+label)
  }
  const key=async(keyCode,modifiers=[],character)=>{web.sendInputEvent({type:'keyDown',keyCode,modifiers});if(character)web.sendInputEvent({type:'char',keyCode:character,modifiers});web.sendInputEvent({type:'keyUp',keyCode,modifiers});await pause(40)}
  const field=()=>evaluate(()=>{const node=[...document.querySelectorAll('input')].find(n=>n.labels?.[0]?.textContent==='빠르기');if(!node)throw Error('Missing tempo');node.focus();return node.value})
  const typeTempo=async(value)=>{await field();web.selectAll();web.delete();await wait(async()=>await field()==='','native replace-selection cleared the number input');let expected='';for(const character of value){await key(character,[],character);expected+=character;await wait(async()=>await field()===expected,'native tempo draft '+expected)}}
  const screenshots=[]
  for(const width of [960,1400]){
    window.setContentSize(width,900);await click('새 악보 만들기');await typeTempo('999')
    await key('Tab')
    const invalid=await evaluate(()=>{const n=[...document.querySelectorAll('input')].find(n=>n.labels?.[0]?.textContent==='빠르기');return{value:n.value,invalid:n.getAttribute('aria-invalid'),error:document.getElementById(n.getAttribute('aria-describedby'))?.textContent}})
    assert.equal(invalid.value,'999');assert.equal(invalid.invalid,'true');assert(invalid.error.includes('40–240'))
    const file=path.join(output,`tempo-error-${width}.png`);fs.writeFileSync(file,(await web.capturePage()).toPNG());screenshots.push(path.basename(file))
    await field();await key('Escape');assert.equal(await field(),'120')
    await click('취소')
  }
  await click('새 악보 만들기');await typeTempo('80');await click('만들기')
  await wait(async()=>evaluate(()=>!document.querySelector('.studio-new-score-form')),'created score')
  await click('파일');await click('프로젝트 저장')
  await wait(()=>fs.existsSync(savedProject),'actual native project write')
  assert.equal(JSON.parse(fs.readFileSync(savedProject,'utf8')).score.tempo.bpm,80)
  await wait(()=>!window.getTitle().includes(' *'),'clean native title after actual save')
  const editing=[]
  const pitchApi=require(path.join(output,'fixture.cjs')),midiOf=score=>{const m=score.parts[0].staves[0].measures[0],v=m.voices[0];return pitchApi.pitchToMidi(pitchApi.resolveNotePitch(m,v,v.events[0]))}
  const save=async()=>{const ready=()=>evaluate(()=>[...document.querySelectorAll('[role=menuitem]')].some(n=>n.textContent.trim()==='프로젝트 저장'&&!n.disabled&&n.checkVisibility()));await click('파일');await wait(ready,'save command available');await click('프로젝트 저장');await wait(()=>!window.getTitle().includes(' *'),'saved current snapshot');await click('파일');await wait(ready,'save lifecycle settled even when document was already clean');await key('Escape');return JSON.parse(fs.readFileSync(currentFile,'utf8')).score}
  const undo=async()=>{await click('편집');await click('실행 취소')}
  for(const width of [960,1400]){
    window.setContentSize(width,900);currentFile=path.join(output,'editing-source.chromatics')
    // The owned fixture was restored by Undo and saved before reopening it.
    await click('파일');await click('프로젝트 열기')
    await wait(()=>window.getTitle().includes('Studio editing QA'),'opened editing fixture')
    const pitchSource=await save()
    for(const gesture of [{modifiers:[],semitones:1},{modifiers:['meta'],semitones:12},{modifiers:['alt','shift'],semitones:1}]){
      await click('악보로 이동');await wait(()=>evaluate(()=>!!document.activeElement?.closest('.score-canvas')),'actual score focus');await key('Up',gesture.modifiers);const changed=await save();assert.equal(midiOf(changed),midiOf(pitchSource)+gesture.semitones,'actual native pitch after shortcut');await undo();assert.deepEqual(await save(),pitchSource,'each actual pitch gesture undoes exactly')
    }
    await click('꾸밈음으로 변환, 단축키 Alt+Shift+G')
    await click('파일');await click('프로젝트 저장');await wait(()=>!window.getTitle().includes(' *'),'saved converted grace')
    const grace=JSON.parse(fs.readFileSync(path.join(output,'editing-source.chromatics'),'utf8')).score
    assert.equal(grace.parts[0].staves[0].measures[0].voices[0].events[0].graceNotes.length,1)
    const graceImage=path.join(output,`grace-${width}.png`);fs.writeFileSync(graceImage,(await web.capturePage()).toPNG());screenshots.push(path.basename(graceImage))
    await click('파일');await click('내보내기 설정');await click('PDF 변환')
    await wait(()=>fs.existsSync(path.join(output,`editing-${pdfIndex}.pdf`))&&pdfIndex>0,'actual grace PDF')
    await click('편집');await click('실행 취소');await click('파일');await click('프로젝트 저장');await wait(()=>!window.getTitle().includes(' *'),'restored grace command')
    await click('2분음표, 단축키 6');await wait(()=>evaluate(()=>Boolean(document.querySelector('.studio-duration-overwrite'))),'duration overwrite confirmation')
    const dialogImage=path.join(output,`overwrite-${width}.png`);fs.writeFileSync(dialogImage,(await web.capturePage()).toPNG());screenshots.push(path.basename(dialogImage))
    await click('취소')
    await click('2분음표, 단축키 6');await click('덮어쓰고 음가 늘리기')
    await click('파일');await click('프로젝트 저장');await wait(()=>!window.getTitle().includes(' *'),'saved overwritten duration')
    const grown=JSON.parse(fs.readFileSync(path.join(output,'editing-source.chromatics'),'utf8')).score
    assert.equal(grown.parts[0].staves[0].measures[0].voices[0].events[0].duration.value,'half')
    assert(!grown.parts[0].staves[0].measures[0].voices[0].events.some(event=>event.id==='editing-host'))
    await click('편집');await click('실행 취소');await click('파일');await click('프로젝트 저장');await wait(()=>!window.getTitle().includes(' *'),'restored duration command')
    await click('도움말');await click('단축키 도움말')
    assert(await evaluate(()=>document.querySelector('.studio-shortcut-help')?.textContent.includes('한 옥타브 올리기/내리기')))
    assert(await evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no horizontal overflow')
    const helpImage=path.join(output,`help-${width}.png`);fs.writeFileSync(helpImage,(await web.capturePage()).toPNG());screenshots.push(path.basename(helpImage));await click('확인')
    currentFile=path.join(output,'meter-source.chromatics');await click('파일');await click('프로젝트 열기');await wait(()=>window.getTitle().includes('Meter QA'),'meter fixture')
    const meterBefore=JSON.parse(fs.readFileSync(currentFile,'utf8')).score
    const point=await evaluate(id=>{const n=[...document.querySelectorAll('.notation-measure')].find(n=>n.dataset.measureId===id);if(!n)throw Error('No actual bar 2');n.scrollIntoView({block:'center'});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const r=n.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);if(!hit?.closest('.score-canvas'))throw Error('Bar right click blocked');resolve({x:Math.round(x),y:Math.round(y)})})))},meterBefore.parts[0].staves[0].measures[1].id)
    web.sendInputEvent({type:'mouseDown',button:'right',clickCount:1,...point});web.sendInputEvent({type:'mouseUp',button:'right',clickCount:1,...point});await wait(()=>evaluate(()=>!!document.querySelector('[role="menu"][aria-label="마디 작업"]')),'real bar right click')
    await click('박자표 변경…');await wait(()=>evaluate(()=>document.activeElement?.closest('[data-signature="박자표"]')),'meter field focus')
    assert(await evaluate(()=>document.querySelector('.studio-measure-tools').textContent.includes('2마디 · 선택 보표의 이 마디만')))
    const entryImage=path.join(output,`meter-entry-${width}.png`);fs.writeFileSync(entryImage,(await web.capturePage()).toPNG());screenshots.push(path.basename(entryImage))
    await key('Enter',[],'\r');await click('3/4');const meterAfter=await save()
    assert.deepEqual(meterAfter.parts[0].staves[0].measures[1].timeSignature,{beats:3,beatType:4});assert.deepEqual(meterAfter.parts.slice(1),meterBefore.parts.slice(1));assert.deepEqual(meterAfter.parts[0].staves[0].measures[0],meterBefore.parts[0].staves[0].measures[0]);assert.deepEqual(meterAfter.parts[0].staves[0].measures[2],meterBefore.parts[0].staves[0].measures[2])
    const meterImage=path.join(output,`meter-${width}.png`);fs.writeFileSync(meterImage,(await web.capturePage()).toPNG());screenshots.push(path.basename(meterImage))
    await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>fs.existsSync(path.join(output,`editing-${pdfIndex}.pdf`)),'meter actual PDF')
    await undo();assert.deepEqual(await save(),meterBefore);await click('파일');await click('프로젝트 열기');await wait(()=>!window.getTitle().includes(' *'),'native meter reopen')
    editing.push({width,graceNative:true,durationNative:true,undoEach:true,help:true,nativePitchGestures:true,meterRightClickAndScope:true})
  }
  const result={legacyDataAndPreferencesPreserved:true,paths:{userData:app.getPath('userData'),sessionData:app.getPath('sessionData')},name:app.getName(),nativeWindowTitle:window.getTitle(),nativeMenu,editing,tempo:{input:'999',keptWithoutClamping:true,escape:120,created:80,viewports:[960,1400]},screenshots,physicalOsDialogsOrIme:false,actualPackagedProcess:false}
  fs.writeFileSync(path.join(output,'current.json'),JSON.stringify(result,null,2)+'\n')
  window.destroy();clearTimeout(timeout);app.quit()
}
;(process.argv.includes('--seed')?seed():current()).catch(async error=>{console.error(error);if(ownedWindow&&!ownedWindow.isDestroyed()){const web=ownedWindow.webContents;fs.writeFileSync(path.join(output,'failure.png'),(await web.capturePage()).toPNG());fs.writeFileSync(path.join(output,'failure-state.json'),JSON.stringify(await web.executeJavaScript(`({active:document.activeElement?.outerHTML,menus:[...document.querySelectorAll('[aria-haspopup=menu]')].map(n=>({text:n.textContent,expanded:n.getAttribute('aria-expanded')})),items:[...document.querySelectorAll('[role=menuitem]')].map(n=>({text:n.textContent,disabled:n.disabled,visible:n.checkVisibility()})),status:document.querySelector('.editor-status')?.textContent})`),null,2))}clearTimeout(timeout);app.exit(1)})
