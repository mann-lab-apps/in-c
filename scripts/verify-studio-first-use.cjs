// Production renderer/preload with isolated, disk-backed QA IPC destinations.
const {app,BrowserWindow,ipcMain,nativeTheme} = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_STUDIO_FIRST_USE_OUT || 'out/ddirori/studio-r3-renderer')
const keyboardRetry=process.argv.includes('--keyboard-retry')
const taskViewport=Number(process.env.DDIRORI_STUDIO_FIRST_USE_WIDTH || 960)
assert.ok([960,1400].includes(taskViewport),'First-use task viewport must be 960 or 1400')
const taskMeasures=Number(process.env.DDIRORI_STUDIO_FIRST_USE_MEASURES || 8)
const taskPdfPages=process.env.DDIRORI_STUDIO_FIRST_USE_PDF_PAGES ? Number(process.env.DDIRORI_STUDIO_FIRST_USE_PDF_PAGES) : undefined
assert.ok(Number.isInteger(taskMeasures) && taskMeasures>=1 && taskMeasures<=64)
assert.ok(taskPdfPages===undefined || Number.isInteger(taskPdfPages) && taskPdfPages>=1 && taskPdfPages<=64)
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'studio-r3-'))
app.setPath('userData',profile)
app.disableHardwareAcceleration()
fs.mkdirSync(out,{recursive:true})
fs.rmSync(path.join(out,'results.json'),{force:true})
const projectPath=path.join(profile,'first.chromatics')
let saveMode='success',pdfMode='success',recent=[],recovery=null,win,releaseSave
const projectSaveRequests=[],keyboardActions=[]
const result=filePath=>({filePath,fileName:path.basename(filePath)})
ipcMain.handle('project:save',async(_event,input)=>{
  projectSaveRequests.push(input.contents)
  if(saveMode==='cancel') return null
  if(saveMode==='fail') throw Error('R3 disk unavailable')
  if(saveMode==='pending') await new Promise(resolve=>{releaseSave=resolve})
  fs.writeFileSync(projectPath,input.contents)
  return result(projectPath)
})
ipcMain.handle('project:open',()=>({...result(projectPath),contents:fs.readFileSync(projectPath,'utf8')}))
ipcMain.handle('project:list-backups',()=>[])
ipcMain.handle('recent-musicxml:list',()=>recent)
ipcMain.handle('recent-musicxml:add',(_e,input)=>(recent=[{...input,openedAt:new Date().toISOString()}]))
ipcMain.handle('autosave:read',()=>recovery)
ipcMain.handle('autosave:write',(_e,input)=>{
  recovery={...input,metadata:{title:input.title,updatedAt:new Date().toISOString(),version:'qa'}}
  fs.writeFileSync(path.join(out,'recovery.json'),JSON.stringify(recovery,null,2))
  return recovery.metadata
})
ipcMain.handle('autosave:clear',()=>{recovery=null})
ipcMain.handle('musicxml:open',()=>null)
for(const channel of ['musicxml:save','musicxml:export']) ipcMain.handle(channel,(_e,input)=>{
  const file=path.join(out,'first.musicxml');fs.writeFileSync(file,input.contents);return result(file)
})
ipcMain.handle('pdf:save',async()=>{
  if(pdfMode==='cancel') return null
  if(pdfMode==='fail') throw Error('R3 PDF unavailable')
  const file=path.join(out,'practice.pdf')
  fs.writeFileSync(file,await win.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
  return result(file)
})
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg)??''})`)
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))))
const wait=async(fn,arg)=>{
  const start=Date.now()
  while(!await run(fn,arg)) {assert.ok(Date.now()-start<5000,`UI condition timed out: ${fn}`);await settle()}
}
const click=async label=>{
  await run(label=>{
    const node=[...document.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||node.textContent.trim())===label && node.checkVisibility())
    if(!node||node.disabled) throw Error(`Unavailable: ${label}`)
    node.focus();node.click()
  },label)
  await settle()
}
const key=async(keyCode,modifiers=[])=>{
  win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers})
  if(keyCode==='Enter') win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers})
  win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers})
  await settle()
}
const keyboardActivate=async label=>{
  let tabs=0
  while(!await run(label=>{
    const node=document.activeElement
    return node?.tagName==='BUTTON' && !node.disabled && node.checkVisibility() &&
      (node.getAttribute('aria-label')||node.textContent.trim())===label
  },label)) {
    assert.ok(tabs++<160,`Keyboard could not reach ${label}`)
    await key('Tab')
  }
  keyboardActions.push({label,tabs})
  await key('Enter')
}
const saveAction=label=>keyboardRetry?keyboardActivate(label):click(label)
const change=async(selector,value)=>{
  await run(({selector,value})=>{
    const node=document.querySelector(selector)
    if(!node||!node.checkVisibility()||node.disabled) throw Error(`Unavailable field: ${selector}`)
    node.focus()
    Object.getOwnPropertyDescriptor(node.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(node,value)
    node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}))
  },{selector,value})
  await settle()
}
const capture=async name=>{
  await settle()
  fs.writeFileSync(path.join(out,`${name}.png`),(await win.webContents.capturePage()).toPNG())
}
app.whenReady().then(async()=>{
  win=new BrowserWindow({width:1400,height:1000,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,nodeIntegration:false,sandbox:false,backgroundThrottling:false}})
  try {
    await win.loadFile(path.resolve('out/renderer/index.html'))
    app.focus({steal:true});win.focus();await wait(()=>document.hasFocus())
    const layout=[]
    for(const theme of ['light','dark']) for(const viewport of [1400,960]) {
      nativeTheme.themeSource=theme;win.setContentSize(viewport,1000);await settle()
      assert.equal(await run(()=>document.documentElement.scrollWidth>innerWidth+1),false)
      assert.equal(await run(()=>getComputedStyle(document.querySelector('#start-screen-title')).color===getComputedStyle(document.querySelector('.studio-start')).color),true,'Welcome heading must use the actual theme foreground')
      await capture(`start-${theme}-${viewport}`)
      await click('새 악보 만들기')
      assert.equal(await run(()=>document.querySelector('dialog').open),true)
      await capture(`wizard-${theme}-${viewport}`)
      layout.push(await run(({theme,viewport})=>{
        const dialog=document.querySelector('dialog'),box=dialog.getBoundingClientRect()
        return {theme,viewport,dpr:devicePixelRatio,dialogWidth:box.width,overflow:dialog.scrollWidth>dialog.clientWidth+1,
          inputHeight:dialog.querySelector('input').getBoundingClientRect().height}
      },{theme,viewport}))
      assert.equal(layout.at(-1).overflow,false)
      await run(()=>[...document.querySelectorAll('dialog button')].find(node=>node.textContent.trim()==='만들기').focus())
      await key('Tab')
      assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'닫기','Wizard Tab must wrap to its first control')
      await key('Escape')
      await wait(()=>!document.querySelector('dialog'))
      assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'새 악보 만들기')
    }
    nativeTheme.themeSource='light';win.setContentSize(taskViewport,1000);await settle()
    await saveAction('새 악보 만들기')
    await change('.studio-new-score-form input','R3 First Score')
    if(taskMeasures!==8) await change('.studio-new-score-form input[max="64"]',String(taskMeasures))
    await run(()=>{
      window.r3KeyTrace=[]
      for(const type of ['keydown','keypress','keyup','submit','invalid','focusin','focusout']) document.addEventListener(type,event=>window.r3KeyTrace.push({type,key:event.key,target:event.target.outerHTML?.slice(0,180),prevented:event.defaultPrevented}),true)
    })
    await key('Enter')
    await wait(()=>Boolean(document.querySelector('[aria-label="첫 입력 안내"]')))
    await capture('first-input')
    await key('N');await key('C')
    await wait(()=>!document.querySelector('[aria-label="첫 입력 안내"]'))
    await key('Z',['control'])
    await wait(()=>Boolean(document.querySelector('[aria-label="첫 입력 안내"]')))
    await key('Z',['control','shift'])
    await wait(()=>!document.querySelector('[aria-label="첫 입력 안내"]'))
    const readySaveHeight=await run(()=>document.querySelector('.studio-first-save').getBoundingClientRect().height)
    saveMode='cancel'
    await saveAction('프로젝트 파일 저장')
    await wait(()=>!document.body.textContent.includes('프로젝트 파일 저장 중'))
    if(keyboardRetry) await wait(()=>document.activeElement?.getAttribute('aria-label')==='프로젝트 파일 저장' && !document.activeElement.disabled)
    assert.equal(fs.existsSync(projectPath),false)
    assert.equal(await run(()=>document.body.textContent.includes('첫 악보를 파일로 저장했어요.')),false)
    await capture('save-cancel')
    saveMode='fail';await saveAction('프로젝트 파일 저장')
    await wait(()=>document.body.textContent.includes('R3 disk unavailable'))
    if(keyboardRetry) await wait(()=>document.activeElement?.getAttribute('aria-label')==='프로젝트 파일 저장' && !document.activeElement.disabled)
    await capture('save-failure')
    saveMode='pending';await saveAction('프로젝트 파일 저장')
    await wait(()=>document.body.textContent.includes('프로젝트 파일 저장 중'))
    const pendingSaveHeight=await run(()=>document.querySelector('.studio-first-save').getBoundingClientRect().height)
    assert.ok(pendingSaveHeight<=readySaveHeight+1,`Busy save must not expand its command row: ${readySaveHeight} -> ${pendingSaveHeight}`)
    if(keyboardRetry) {
      await key('Enter')
      assert.equal(projectSaveRequests.length,3,'Busy Enter must not create a duplicate save')
    }
    await capture('save-pending')
    releaseSave()
    await wait(()=>document.body.textContent.includes('첫 악보를 파일로 저장했어요.'))
    await capture('first-save-success')
    const saved=JSON.parse(fs.readFileSync(projectPath,'utf8'))
    assert.equal(projectSaveRequests.length,3)
    assert.ok(projectSaveRequests.every(contents=>contents===projectSaveRequests[0]),'Cancel/failure/retry must serialize the same score')
    const notes=saved.score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events.filter(e=>e.type==='note')))))
    assert.equal(notes.length,1)
    assert.equal(notes[0].pitch.step,'C')
    fs.copyFileSync(projectPath,path.join(out,'first.chromatics'))
    await click('파일');await click('프로젝트 열기')
    await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'))
    await key('N');await key('D')
    await click('내보내기')
    if(taskPdfPages) await change('[aria-label="PDF 목표 장수"]',String(taskPdfPages))
    pdfMode='cancel';await click('PDF 변환')
    await wait(()=>!document.querySelector('.app-shell--pdf-export'))
    assert.equal(await run(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]'))),false)
    pdfMode='fail';await click('PDF 변환')
    await wait(()=>document.body.textContent.includes('R3 PDF unavailable'))
    await capture('pdf-failure')
    pdfMode='success';await click('PDF 변환')
    await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    assert.ok(await run(()=>document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
    assert.deepEqual(JSON.parse(fs.readFileSync(projectPath,'utf8')).score,saved.score)
    await capture('pdf-success-project-dirty')
    await click('가져오는 방법')
    await capture('score-manual-guide')
    assert.equal(await run(()=>document.querySelector('dialog').textContent.includes('모바일 기기')),true)
    await key('Escape')
    assert.equal(await run(()=>document.activeElement?.textContent.trim()),'가져오는 방법')
    const keyboardTrace=await run(()=>window.r3KeyTrace)
    const recoveryStart=Date.now()
    while(!recovery?.project) {assert.ok(Date.now()-recoveryStart<5000,'Dirty native recovery must be written');await settle()}
    win.webContents.once('will-prevent-unload',event=>event.preventDefault())
    await win.loadFile(path.resolve('out/renderer/index.html'))
    await wait(()=>[...document.querySelectorAll('.start-actions button')].some(node=>node.textContent.includes('복구본 열기')))
    await capture('returning-recovery')
    await run(()=>{
      const node=[...document.querySelectorAll('.start-actions button')].find(node=>node.textContent.includes('복구본 열기'))
      node.focus();node.click()
    })
    await wait(()=>document.querySelector('.studio-document')?.textContent.includes('저장하지 않은 변경'))
    assert.equal(await run(()=>document.body.textContent.includes('첫 악보를 파일로 저장했어요.')),false)
    await capture('recovered-dirty')
    await click('파일');await click('MusicXML로 저장')
    assert.match(fs.readFileSync(path.join(out,'first.musicxml'),'utf8'),/<step>D<\/step>/)
    await run(()=>{window.confirm=()=>true})
    await click('새 악보 만들기')
    const normalText=await run(()=>parseFloat(getComputedStyle(document.querySelector('.studio-new-score-form input')).fontSize))
    await run(()=>{
      const nodes=[...document.querySelectorAll('.studio-chrome,.studio-chrome *')]
      const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))
      nodes.forEach((n,i)=>{n.style.fontSize=`${sizes[i]*2}px`})
    })
    await capture('wizard-text-200')
    const enlargedText=await run(()=>parseFloat(getComputedStyle(document.querySelector('.studio-new-score-form input')).fontSize))
    assert.equal(enlargedText,normalText*2,'Text200 must double actual computed control font size')
    assert.equal(await run(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth+1),false)
    await run(()=>document.querySelectorAll('.studio-chrome,.studio-chrome *').forEach(node=>node.style.removeProperty('font-size')))
    await win.webContents.debugger.attach('1.3')
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true})
    await settle()
    const coarse=await run(()=>({pointer:matchMedia('(pointer:coarse)').matches,
      height:document.querySelector('.studio-new-score-form input').getBoundingClientRect().height}))
    assert.equal(coarse.pointer,true);assert.ok(coarse.height>=48)
    win.webContents.debugger.detach()
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),runtime:process.versions,layout,coarse,normalText,enlargedText,
      firstNote:{count:notes.length,pitch:notes[0].pitch},undoRedo:true,projectReopen:true,recoveryVerified:true,pdfKeepsProjectDirty:true,
      keyboardTrace,keyboardRetry,keyboardActions,taskViewport,taskMeasures,taskPdfPages,projectSaveRequests:projectSaveRequests.length,readySaveHeight,pendingSaveHeight,
      scope:'Production renderer/preload and real disk outputs; QA IPC replaces OS dialogs and I/O policy. No physical IME, mobile transfer or Score receipt.',scoreReceiptVerified:false},null,2))
    console.log('R3 actual first-use, disk project, undo/reopen and PDF/manual guide passed')
  } catch(error) {
    await capture('failure-state')
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await run(()=>({focus:document.activeElement?.outerHTML,
      trace:window.r3KeyTrace,dialog:document.querySelector('dialog')?.outerHTML})),null,2))
    throw error
  } finally {win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})
