// Production renderer/preload with isolated, disk-backed QA IPC destinations.
const {app,BrowserWindow,ipcMain,nativeTheme} = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_STUDIO_FIRST_USE_OUT || 'out/ddirori/studio-r3-renderer')
const keyboardRetry=process.argv.includes('--keyboard-retry')
const publicResults=process.argv.includes('--public-results')
const publicWizard=process.argv.includes('--public-wizard')
const wizardScenes=[]
const publicHelp=process.argv.includes('--public-help')
const projectOpenFeedback=process.argv.includes('--project-open-feedback')
const recoveryFeedback=process.argv.includes('--recovery-feedback')
const helpScenes=[]
const resultScenes=[]
const taskViewport=Number(process.env.DDIRORI_STUDIO_FIRST_USE_WIDTH || 960)
assert.ok([960,1400].includes(taskViewport),'First-use task viewport must be 960 or 1400')
const taskHeight=Number(process.env.DDIRORI_STUDIO_FIRST_USE_HEIGHT || 1000)
assert.ok([750,800,1000].includes(taskHeight),'First-use task height must be 750, 800 or 1000')
const auditFirstInputVisibility=process.argv.includes('--audit-first-input-visibility')
const firstInputVisibility=[]
const auditContinuousInputVisibility=process.argv.includes('--audit-continuous-input-visibility')
const continuousInputVisibility=[]
const auditTupletPreviewVisibility=process.argv.includes('--audit-tuplet-preview-visibility')
const tupletPreviewVisibility=[]
const taskMeasures=Number(process.env.DDIRORI_STUDIO_FIRST_USE_MEASURES || 8)
const taskPdfPages=process.env.DDIRORI_STUDIO_FIRST_USE_PDF_PAGES ? Number(process.env.DDIRORI_STUDIO_FIRST_USE_PDF_PAGES) : undefined
assert.ok(Number.isInteger(taskMeasures) && taskMeasures>=1 && taskMeasures<=64)
assert.ok(taskPdfPages===undefined || Number.isInteger(taskPdfPages) && taskPdfPages>=1 && taskPdfPages<=64)
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'studio-r3-'))
app.setPath('userData',profile)
app.disableHardwareAcceleration()
const deadline=setTimeout(()=>{console.error('First-use verifier exceeded 240s deadline');app.exit(1)},240000)
fs.mkdirSync(out,{recursive:true})
fs.rmSync(path.join(out,'results.json'),{force:true})
const projectPath=path.join(profile,'first.chromatics')
let saveMode='success',pdfMode='success',recent=[],recovery=null,win,releaseSave,rejectNextProjectOpen=false
let startupReadMode='normal',rejectStartupRecent,rejectNextAutosaveWrite=false
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
ipcMain.handle('project:open',()=>{if(rejectNextProjectOpen){rejectNextProjectOpen=false;throw Error('QA welcome read denied')}return{...result(projectPath),contents:fs.readFileSync(projectPath,'utf8')}})
ipcMain.handle('project:list-backups',()=>[])
ipcMain.handle('recent-musicxml:list',()=>{if(startupReadMode==='recent-error')throw Error('QA startup list denied');if(startupReadMode==='recent-pending')return new Promise((_resolve,reject)=>{rejectStartupRecent=reject});return recent})
ipcMain.handle('recent-musicxml:add',(_e,input)=>(recent=[{...input,openedAt:new Date().toISOString()}]))
ipcMain.handle('autosave:read',()=>{if(startupReadMode==='recovery-error')throw Error('QA recovery read denied');return recovery})
ipcMain.handle('autosave:write',(_e,input)=>{
  if(rejectNextAutosaveWrite){rejectNextAutosaveWrite=false;throw Error('QA recovery write denied')}
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
const run=(fn,arg)=>win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg)??''})`).catch(error=>{console.error('Renderer action failed:',fn.toString().slice(0,500),JSON.stringify(arg)?.slice(0,300));throw error})
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))))
const wait=async(fn,arg)=>{
  const start=Date.now()
  while(!await run(fn,arg)) {assert.ok(Date.now()-start<5000,`UI condition timed out: ${fn}`);await settle()}
}
const click=async label=>{
  if(label==='내보내기') {await click('파일');label='내보내기 설정'}
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
  console.log('Capture:',name)
  await settle()
  fs.writeFileSync(path.join(out,`${name}.png`),(await win.webContents.capturePage()).toPNG())
}
app.whenReady().then(async()=>{
  win=new BrowserWindow({width:1400,height:1000,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,nodeIntegration:false,sandbox:false,backgroundThrottling:false}})
  try {
    await win.loadFile(path.resolve('out/renderer/index.html'))
    app.focus({steal:true});win.focus();await wait(()=>document.hasFocus())
    if(recoveryFeedback){
      const observations=[]
      const inspectOperation=async(operation,diagnostic,surface)=>{
        await wait(({operation,diagnostic,surface})=>document.querySelector(surface)?.querySelector(`[aria-label="${operation} 기술 정보"]`)?.textContent.includes(diagnostic),{operation,diagnostic,surface})
        const before=await run(({operation,surface})=>{
          const host=document.querySelector(surface),root=host.querySelector(`[aria-label="${operation} 기술 정보"]`),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content'),primary=host.querySelector('.dd-banner,.editor-status')
          return{primary:primary.textContent,expanded:button.getAttribute('aria-expanded'),visible:content.checkVisibility(),outside:!primary.contains(root),overflow:document.documentElement.scrollWidth>innerWidth,theme:host.dataset.theme,width:innerWidth}
        },{operation,surface})
        assert.equal(before.expanded,'false');assert.equal(before.visible,false);assert.equal(before.outside,true);assert.equal(before.overflow,false);assert.doesNotMatch(before.primary,/QA recovery|QA startup/)
        await capture(`recovery-summary-${observations.length}`)
        await run(({operation,surface})=>{const n=document.querySelector(surface).querySelector(`[aria-label="${operation} 기술 정보"] button`);n.scrollIntoView({block:'nearest'});n.focus()},{operation,surface});await key('Enter')
        const opened=await run(({operation,surface})=>{const root=document.querySelector(surface).querySelector(`[aria-label="${operation} 기술 정보"]`),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content');content.scrollIntoView({block:'nearest'});return{expanded:button.getAttribute('aria-expanded'),visible:content.checkVisibility(),text:content.textContent,box:button.getBoundingClientRect().toJSON(),minimum:matchMedia('(pointer:coarse)').matches?48:32,overflow:document.documentElement.scrollWidth>innerWidth}},{operation,surface})
        assert.equal(opened.expanded,'true');assert.equal(opened.visible,true);assert.ok(opened.text.includes(diagnostic));assert.ok(opened.box.width>=opened.minimum&&opened.box.height>=opened.minimum);assert.equal(opened.overflow,false)
        await capture(`recovery-technical-${observations.length}`)
        await run(({operation,surface})=>document.querySelector(surface).querySelector(`[aria-label="${operation} 기술 정보"] button`).scrollIntoView({block:'nearest'}),{operation,surface});await key('Space')
        assert.equal(await run(({operation,surface})=>document.querySelector(surface).querySelector(`[aria-label="${operation} 기술 정보"] button`).getAttribute('aria-expanded'),{operation,surface}),'false')
        observations.push({operation,before,opened});fs.writeFileSync(path.join(out,'recovery-feedback.json'),JSON.stringify(observations,null,2))
      }
      for(const mode of ['recovery-error','recent-error'])for(const c of [{width:960,theme:'light',scale:1,coarse:false},{width:1400,theme:'dark',scale:1,coarse:false},{width:960,theme:'dark',scale:2,coarse:true},{width:1400,theme:'light',scale:2,coarse:true}]){
        startupReadMode=mode;nativeTheme.themeSource=c.theme;win.setContentSize(c.width,1000)
        win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:c.coarse})
        await win.loadFile(path.resolve('out/renderer/index.html'));await wait(()=>!!document.querySelector('.studio-start .dd-banner'))
        await run(scale=>{if(scale===1)return;const root=document.querySelector('.studio-start'),nodes=[...root.querySelectorAll('.dd-text,button,input,label')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=`${sizes[i]*scale}px`)},c.scale)
        await inspectOperation(mode==='recovery-error'?'자동저장 복구':'최근 악보 목록',mode==='recovery-error'?'QA recovery read denied':'QA startup list denied','.studio-start')
        await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()
      }
      startupReadMode='recent-pending';nativeTheme.themeSource='light';win.setContentSize(taskViewport,taskHeight);await win.loadFile(path.resolve('out/renderer/index.html'));await wait(()=>!!document.querySelector('.studio-start'))
      const started=Date.now();while(typeof rejectStartupRecent!=='function'){assert.ok(Date.now()-started<12000,'Owned startup list request must be pending');await settle()}
      await click('새 악보 만들기');await run(()=>[...document.querySelectorAll('dialog button')].find(n=>n.textContent.trim()==='만들기').click());await wait(()=>!!document.querySelector('.editor-status'))
      const current=await run(()=>({status:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)}))
      rejectStartupRecent(Error('QA obsolete startup response'));await settle();await settle()
      assert.deepEqual(await run(()=>({status:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)})),current)
      assert.equal(await run(()=>document.body.textContent.includes('QA obsolete startup response')),false);assert.equal(projectSaveRequests.length,0)
      fs.writeFileSync(path.join(out,'recovery-late-error.json'),JSON.stringify(current,null,2));await capture('recovery-late-error-preserved')
      startupReadMode='normal';recovery=null;recent=[]
      win.webContents.once('will-prevent-unload',event=>event.preventDefault());await win.loadFile(path.resolve('out/renderer/index.html'));await wait(()=>!!document.querySelector('.studio-start'))
      // The remaining existing first-use task now covers a fresh owned document.
      win.__inspectRecoveryOperation=inspectOperation
    }
    const layout=[]
    for(const theme of ['light','dark']) for(const viewport of [1400,960]) {
      nativeTheme.themeSource=theme;win.setContentSize(viewport,1000);await settle()
      assert.equal(await run(()=>document.documentElement.scrollWidth>innerWidth+1),false)
      assert.equal(await run(()=>getComputedStyle(document.querySelector('#start-screen-title')).color===getComputedStyle(document.querySelector('.studio-start')).color),true,'Welcome heading must use the actual theme foreground')
      await capture(`start-${theme}-${viewport}`)
      if(projectOpenFeedback){
        rejectNextProjectOpen=true;await click('프로젝트 열기')
        await wait(()=>document.querySelector('.studio-start')?.textContent.includes('프로젝트를 열지 못했습니다.'))
        const before=await run(()=>{const root=document.querySelector('.studio-start [aria-label="프로젝트 열기 기술 정보"]'),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content'),banner=document.querySelector('.studio-start .dd-banner');return{summary:banner.textContent,expanded:button.getAttribute('aria-expanded'),visible:content.checkVisibility(),outside:!banner.contains(root)}})
        assert.equal(before.expanded,'false');assert.equal(before.visible,false);assert.equal(before.outside,true);assert.doesNotMatch(before.summary,/QA welcome read denied/)
        await run(()=>{const n=document.querySelector('.studio-start [aria-label="프로젝트 열기 기술 정보"] button');n.scrollIntoView({block:'nearest'});n.focus()});await key('Enter')
        const opened=await run(()=>{const root=document.querySelector('.studio-start [aria-label="프로젝트 열기 기술 정보"]'),content=root.querySelector('.studio-warning-technical__content');content.scrollIntoView({block:'nearest'});return{expanded:root.querySelector('button').getAttribute('aria-expanded'),visible:content.checkVisibility(),text:content.textContent,overflow:document.documentElement.scrollWidth>innerWidth}})
        assert.equal(opened.expanded,'true');assert.equal(opened.visible,true);assert.equal(opened.overflow,false);assert.match(opened.text,/QA welcome read denied/);assert.equal(fs.existsSync(projectPath),false)
        await capture(`welcome-open-error-${theme}-${viewport}`)
        await run(()=>document.querySelector('.studio-start [aria-label="프로젝트 열기 기술 정보"] button').scrollIntoView({block:'nearest'}));await key('Space')
        assert.equal(await run(()=>document.querySelector('.studio-start [aria-label="프로젝트 열기 기술 정보"] button').getAttribute('aria-expanded')),'false')
        fs.writeFileSync(path.join(out,`welcome-open-error-${theme}-${viewport}.json`),JSON.stringify({before,opened},null,2))
      }
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
    if(publicWizard) for(const theme of ['light','dark']) for(const viewport of [960,1400]) for(const scale of [1,2]) for(const coarse of [false,true]) {
      nativeTheme.themeSource=theme;win.setContentSize(viewport,800);await settle()
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
      await click('새 악보 만들기')
      await run(scale=>{
        const nodes=[...document.querySelectorAll('.studio-first-use,.studio-first-use *')]
        const sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize))
        if(scale!==1) nodes.forEach((node,i)=>{node.style.fontSize=`${sizes[i]*scale}px`})
      },scale)
      await settle()
      const row=await run(({theme,viewport,scale,coarse})=>{
        const dialog=document.querySelector('dialog'),box=dialog.getBoundingClientRect()
        const controls=[...dialog.querySelectorAll('input,button')].map(node=>{const r=node.getBoundingClientRect();return {name:node.getAttribute('aria-label')||node.textContent.trim(),height:r.height,width:r.width,inside:r.left>=box.left&&r.right<=box.right}})
        return {theme,viewport,scale,coarse,dialogWidth:box.width,dialogHeight:box.height,
          viewportContained:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight,
          legacy:Boolean(dialog.closest('.studio-chrome')),nativeSelects:dialog.querySelectorAll('select').length,
          inputs:dialog.querySelectorAll('.dd-input-row input').length,selects:dialog.querySelectorAll('.dd-select').length,
          templates:dialog.querySelectorAll('button[aria-label$=" 템플릿"]').length,
          headingTheme:getComputedStyle(dialog.querySelector('h2')).color===getComputedStyle(dialog).color,
          inputFont:parseFloat(getComputedStyle(dialog.querySelector('input')).fontSize),
          pointerCoarse:matchMedia('(pointer:coarse)').matches,
          overflow:dialog.scrollWidth>dialog.clientWidth+1,controls}
      },{theme,viewport,scale,coarse})
      assert.equal(row.legacy,false);assert.equal(row.nativeSelects,0);assert.equal(row.inputs,4);assert.equal(row.selects,3);assert.equal(row.templates,4)
      assert.equal(row.headingTheme,true);assert.equal(row.overflow,false);assert.equal(row.viewportContained,true);assert.equal(row.pointerCoarse,coarse)
      assert.ok(row.controls.every(control=>control.inside&&control.height>=(coarse?48:32)))
      assert.ok(row.inputFont>=(scale===2?28:14))
      await capture(`public-wizard-${theme}-${viewport}-${scale}-${coarse?'coarse':'fine'}`)
      // Open/commit the real Select with native keyboard. This changes only the draft.
      await run(()=>{const node=[...document.querySelectorAll('dialog label')].find(label=>label.textContent==='악보 구성')?.control;if(!node||node.getAttribute('role')!=='combobox') throw Error('Missing labelled public structure Select');node.focus();node.click()})
      await settle()
      await wait(()=>document.activeElement?.getAttribute('role')==='combobox'&&document.activeElement?.getAttribute('aria-expanded')==='true')
      await run(()=>{window.wizardKeys=[];if(!window.wizardKeyTracing){window.wizardKeyTracing=true;for(const type of ['keydown','keyup']) document.addEventListener(type,event=>window.wizardKeys.push({type,key:event.key,focus:document.activeElement?.outerHTML.slice(0,300)}),{capture:true})}})
      await key('Down')
      fs.writeFileSync(path.join(out,`wizard-keys-${theme}-${viewport}-${scale}-${coarse}.json`),JSON.stringify(await run(()=>({keys:window.wizardKeys,active:document.getElementById(document.activeElement?.getAttribute('aria-activedescendant'))?.textContent,hasFocus:document.hasFocus()})),null,2))
      assert.equal(await run(()=>document.getElementById(document.activeElement?.getAttribute('aria-activedescendant'))?.textContent),'피아노 grand staff')
      await key('Enter')
      assert.equal(await run(()=>Boolean(document.querySelector('dialog')?.open)),true,'Select Enter must not submit the wizard')
      assert.equal(await run(()=>document.querySelector('[aria-label="피아노 grand staff 템플릿"]').getAttribute('aria-pressed')),'true')
      await run(()=>[...document.querySelectorAll('dialog button')].find(node=>node.textContent.trim()==='만들기').focus())
      await key('Tab')
      assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'닫기')
      await key('Escape');await wait(()=>!document.querySelector('dialog'))
      assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'새 악보 만들기')
      wizardScenes.push(row);win.webContents.debugger.detach()
    }
    nativeTheme.themeSource='light';win.setContentSize(taskViewport,taskHeight);await settle()
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
    if(auditTupletPreviewVisibility) {
      await key('N');await key('3',['control']);await key('D')
      const row=await run(()=>{
        const event=document.querySelector('.notation-event.is-preview'),text=event?.querySelector('.vf-notehead text')
        if(!text)throw Error('Pending tuplet must render its first actual preview note')
        const s=getComputedStyle(text),context=document.createElement('canvas').getContext('2d')
        context.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
        const m=context.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM()
        return {viewport:[innerWidth,innerHeight],scrollY,eventId:event.dataset.eventId,
          ink:{top:new DOMPoint(p.x,p.y-m.actualBoundingBoxAscent).matrixTransform(matrix).y,
            bottom:new DOMPoint(p.x,p.y+m.actualBoundingBoxDescent).matrixTransform(matrix).y},
          footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,
          tabIndex:event.getAttribute('tabindex'),status:document.querySelector('.editor-status').textContent,
          owner:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}}
      })
      tupletPreviewVisibility.push(row)
      fs.writeFileSync(path.join(out,'tuplet-preview-visibility.json'),JSON.stringify(tupletPreviewVisibility,null,2))
      await capture('tuplet-preview-entered')
      assert.ok(row.ink.top>=8&&row.ink.bottom<=row.footerTop-8,`Pending tuplet note must clear footer without F6: ${JSON.stringify(row)}`)
      assert.equal(row.tabIndex,null,'Readonly tuplet preview must not become a keyboard-editable score event')
      assert.ok(row.status.includes('0회 수정')&&row.status.includes('셋잇단음표 1/3'))
      assert.equal(row.owner.label,'음표 입력 전환, 단축키 N')
      assert.equal(await run(()=>Boolean(document.querySelector('[role="tooltip"]'))),true)
      await key('Escape')
      assert.equal(await run(()=>Boolean(document.querySelector('[role="tooltip"]'))),false,'First Escape dismisses the public tooltip')
      assert.equal(await run(()=>Boolean(document.querySelector('.notation-event.is-preview'))),true,'Tooltip dismissal must preserve the pending input')
      await key('Escape')
      await wait(()=>!document.querySelector('.notation-event.is-preview'))
      assert.equal(await run(()=>document.querySelector('.studio-input-context').dataset.inputActive),'false')
      await key('N')
      await key('5')
      await key('N')
      assert.equal(await run(()=>document.querySelector('.studio-input-context').dataset.inputActive),'false')
      assert.equal(await run(()=>document.querySelector('.editor-status').textContent.includes('0회 수정')),true)
    }
    await key('N')
    const inputOwner=await run(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}))
    if(recoveryFeedback)rejectNextAutosaveWrite=true
    await key('C')
    await wait(()=>!document.querySelector('[aria-label="첫 입력 안내"]'))
    if(recoveryFeedback){
      const selection=await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId))
      await win.__inspectRecoveryOperation('자동저장','QA recovery write denied','.studio-status')
      assert.equal(await run(()=>Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)?.[1])),1)
      assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/)
      assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection)
      assert.equal(fs.existsSync(projectPath),false)
      await run(label=>document.querySelector(`[aria-label="${label}"]`).focus(),inputOwner.label)
    }
    if(auditFirstInputVisibility) {
      const row=await run(()=>{
        const event=document.querySelector('.notation-event.is-selected')
        const text=event?.querySelector('.vf-notehead text')
        if(!text) throw Error('First input must produce a selected engraved note')
        const style=getComputedStyle(text),context=document.createElement('canvas').getContext('2d')
        context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const metrics=context.measureText(text.textContent),point=text.getStartPositionOfChar(0),matrix=text.getScreenCTM()
        return {viewport:[innerWidth,innerHeight],scrollY,eventId:event.dataset.eventId,
          ink:{top:new DOMPoint(point.x,point.y-metrics.actualBoundingBoxAscent).matrixTransform(matrix).y,
            bottom:new DOMPoint(point.x,point.y+metrics.actualBoundingBoxDescent).matrixTransform(matrix).y},
          footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,
          active:document.activeElement?.outerHTML.slice(0,400),
          owner:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')},
          status:document.querySelector('.editor-status')?.textContent}
      })
      firstInputVisibility.push(row)
      fs.writeFileSync(path.join(out,'first-input-visibility.json'),JSON.stringify(firstInputVisibility,null,2))
      await capture('first-input-entered')
      assert.ok(row.ink.top>=8&&row.ink.bottom<=row.footerTop-8,`Entered note must clear the sticky footer without F6: ${JSON.stringify(row)}`)
      assert.deepEqual(row.owner,inputOwner,'Input scrolling must preserve the keyboard owner')
    }
    if(auditContinuousInputVisibility) {
      for(let index=0;index<24;index++) {
        const entered=index===11||index===23?'R':'D'
        await key(entered)
        const row=await run(()=>{
          const event=document.querySelector('.notation-event.is-selected')
          if(!event)throw Error('Sequential input must keep a real selected event')
          const glyphs=[...event.querySelectorAll('text')].map(text=>{
            const s=getComputedStyle(text),context=document.createElement('canvas').getContext('2d')
            context.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
            const m=context.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM()
            return {top:new DOMPoint(p.x,p.y-m.actualBoundingBoxAscent).matrixTransform(matrix).y,
              bottom:new DOMPoint(p.x,p.y+m.actualBoundingBoxDescent).matrixTransform(matrix).y}
          }).filter(ink=>ink.bottom>ink.top)
          return {eventId:event.dataset.eventId,measureId:event.dataset.measureId,scrollY,
            ink:glyphs.length?{top:Math.min(...glyphs.map(g=>g.top)),bottom:Math.max(...glyphs.map(g=>g.bottom))}:null,
            footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,
            edits:Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)?.[1]),
            owner:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}}
        })
        continuousInputVisibility.push({index,entered,...row})
        fs.writeFileSync(path.join(out,'continuous-input-visibility.json'),JSON.stringify(continuousInputVisibility,null,2))
        assert.ok(row.ink&&row.ink.top>=8&&row.ink.bottom<=row.footerTop-8,`Sequential ${entered} must remain visible: ${JSON.stringify(row)}`)
        assert.deepEqual(row.owner,inputOwner,'Sequential input must preserve the toolbar keyboard owner')
        assert.equal(row.edits,index+2,'Each sequential input must add exactly one command')
      }
      const levels=continuousInputVisibility.map(row=>row.ink.top+row.scrollY)
      assert.ok(Math.max(...levels)-Math.min(...levels)>60,'The fixture must actually reach another engraved system')
      await capture('continuous-input-entered')
      for(let index=0;index<24;index++)await key('Z',['control'])
      assert.equal(await run(()=>Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)?.[1])),1)
      for(let index=0;index<24;index++)await key('Z',['control','shift'])
      assert.equal(await run(()=>Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)?.[1])),25)
      for(let index=0;index<24;index++)await key('Z',['control'])
      assert.equal(await run(()=>Number(document.querySelector('.editor-status').textContent.match(/(\d+)회 수정/)?.[1])),1)
    }
    await key('Z',['control'])
    await wait(()=>Boolean(document.querySelector('[aria-label="첫 입력 안내"]')))
    await key('Z',['control','shift'])
    await wait(()=>!document.querySelector('[aria-label="첫 입력 안내"]'))
    const readySaveHeight=await run(()=>document.querySelector('.studio-first-save').getBoundingClientRect().height)
    saveMode='cancel'
    await saveAction('프로젝트 파일 저장')
    await wait(()=>document.querySelector('[aria-label="프로젝트 파일 저장"]')?.getAttribute('aria-busy')!=='true')
    if(keyboardRetry) await wait(()=>document.activeElement?.getAttribute('aria-label')==='프로젝트 파일 저장' && !document.activeElement.disabled)
    assert.equal(fs.existsSync(projectPath),false)
    assert.equal(await run(()=>document.body.textContent.includes('첫 악보를 파일로 저장했어요.')),false)
    await capture('save-cancel')
    saveMode='fail';await saveAction('프로젝트 파일 저장')
    await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'))
    const saveDiagnostic=await run(()=>{
      const status=document.querySelector('.editor-status'),root=document.querySelector('.studio-status__technical'),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content')
      return{summary:status.textContent,diagnostic:content.textContent,visible:content.checkVisibility(),expanded:button.getAttribute('aria-expanded'),outside:!status.contains(root)}
    })
    assert.doesNotMatch(saveDiagnostic.summary,/R3 disk unavailable/)
    assert.match(saveDiagnostic.diagnostic,/R3 disk unavailable/)
    assert.equal(saveDiagnostic.visible,false);assert.equal(saveDiagnostic.expanded,'false');assert.equal(saveDiagnostic.outside,true)
    if(keyboardRetry) await wait(()=>document.activeElement?.getAttribute('aria-label')==='프로젝트 파일 저장' && !document.activeElement.disabled)
    await capture('save-failure')
    saveMode='pending';await saveAction('프로젝트 파일 저장')
    await wait(()=>document.querySelector('[aria-label="프로젝트 파일 저장"]')?.getAttribute('aria-busy')==='true')
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
    if(publicResults) {
      await inspectResults('achievement','.studio-result')
      await run(()=>document.querySelector('[aria-label="첫 저장 알림 닫기"]').focus())
      await key('Space');await wait(()=>!document.body.textContent.includes('첫 악보를 파일로 저장했어요.'))
      assert.equal(await run(()=>document.querySelector('[aria-label="재생"]').disabled),false)
    }
    const saved=JSON.parse(fs.readFileSync(projectPath,'utf8'))
    assert.equal(projectSaveRequests.length,3)
    assert.ok(projectSaveRequests.every(contents=>contents===projectSaveRequests[0]),'Cancel/failure/retry must serialize the same score')
    const notes=saved.score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events.filter(e=>e.type==='note')))))
    assert.equal(notes.length,1)
    assert.equal(notes[0].pitch.step,'C')
    fs.copyFileSync(projectPath,path.join(out,'first.chromatics'))
    await click('파일');await click('프로젝트 열기')
    await wait(()=>document.querySelector('.studio-document')?.textContent.includes('변경 없음'))
    if(publicHelp) for(const theme of ['light','dark']) for(const viewport of [960,1400]) for(const scale of [1,2]) for(const coarse of [false,true]) {
      nativeTheme.themeSource=theme;win.setContentSize(viewport,800);await settle()
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
      await click('파일');await click('파일 작업 열기')
      const before=await run(()=>({scoreInk:document.querySelector('.score-canvas .notation-preview')?.innerHTML,document:document.querySelector('.studio-document')?.textContent}))
      await click('단축키 도움말')
      await run(scale=>{const nodes=[...document.querySelectorAll('.studio-shortcut-help,.studio-shortcut-help *')];const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));if(scale!==1)nodes.forEach((n,i)=>{n.style.fontSize=`${sizes[i]*scale}px`})},scale)
      const row=await run(({theme,viewport,scale,coarse})=>{
        const dialog=document.querySelector('dialog'),box=dialog.getBoundingClientRect()
        return {theme,viewport,scale,coarse,publicDialog:dialog.classList.contains('dd-dialog'),legacy:Boolean(dialog.closest('.studio-chrome')),
          contained:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight,
          overflow:dialog.scrollWidth>dialog.clientWidth+1,rows:dialog.querySelectorAll('dt').length,
          headingTheme:getComputedStyle(dialog.querySelector('h2')).color===getComputedStyle(dialog).color,
          bodyFont:parseFloat(getComputedStyle(dialog.querySelector('dd span')).fontSize),
          controls:[...dialog.querySelectorAll('button')].map(n=>({public:n.classList.contains('dd-button'),height:n.getBoundingClientRect().height}))}
      },{theme,viewport,scale,coarse})
      assert.equal(row.publicDialog,true);assert.equal(row.legacy,false);assert.equal(row.contained,true);assert.equal(row.overflow,false);assert.equal(row.rows,15)
      assert.equal(row.headingTheme,true);assert.equal(row.bodyFont,16*scale);assert.ok(row.controls.every(n=>n.public&&n.height>=(coarse?48:32)))
      await capture(`public-help-${theme}-${viewport}-${scale}-${coarse?'coarse':'fine'}`)
      await run(()=>[...document.querySelectorAll('dialog button')].find(n=>n.textContent.trim()==='확인').focus())
      await key('N');await key('C');await key('Z',['control']);await key('S',['control'])
      const after=await run(()=>({scoreInk:document.querySelector('.score-canvas .notation-preview')?.innerHTML,document:document.querySelector('.studio-document')?.textContent}))
      assert.deepEqual(after,before,'Help key input must not mutate selection, score, history or document state')
      assert.equal(projectSaveRequests.length,3,'Help Ctrl+S must not save the editor')
      await key('Tab');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'닫기')
      await key('Escape');await wait(()=>!document.querySelector('dialog'))
      assert.equal(await run(()=>(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent.trim())),'단축키 도움말','Help must restore its visible trigger')
      await click('단축키 도움말')
      await run(()=>[...document.querySelectorAll('dialog button')].find(n=>n.textContent.trim()==='확인').focus())
      await key('Space');await wait(()=>!document.querySelector('dialog'))
      assert.equal(await run(()=>document.querySelector('[aria-label="재생"]').disabled),false,'Space must close help without starting playback')
      helpScenes.push(row);win.webContents.debugger.detach()
    }
    nativeTheme.themeSource='light';win.setContentSize(taskViewport,1000);await settle()
    await click('악보로 이동')
    await key('N');await key('D')
    await wait(()=>document.querySelector('.studio-document')?.textContent.includes('저장하지 않은 변경'))
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
    if(publicResults) await inspectResults('pdf','[aria-label="PDF 출력 결과"]')
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
    await click('파일');await click('새 악보 만들기')
    const normalText=await run(()=>parseFloat(getComputedStyle(document.querySelector('.studio-new-score-form input')).fontSize))
    await run(()=>{
      const nodes=[...document.querySelectorAll('.studio-first-use,.studio-first-use *')]
      const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))
      nodes.forEach((n,i)=>{n.style.fontSize=`${sizes[i]*2}px`})
    })
    await capture('wizard-text-200')
    const enlargedText=await run(()=>parseFloat(getComputedStyle(document.querySelector('.studio-new-score-form input')).fontSize))
    assert.equal(enlargedText,normalText*2,'Text200 must double actual computed control font size')
    assert.equal(await run(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth+1),false)
    await run(()=>document.querySelectorAll('.studio-first-use,.studio-first-use *').forEach(node=>node.style.removeProperty('font-size')))
    await win.webContents.debugger.attach('1.3')
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true})
    await settle()
    const coarse=await run(()=>({pointer:matchMedia('(pointer:coarse)').matches,
      height:document.querySelector('.studio-new-score-form input').getBoundingClientRect().height}))
    assert.equal(coarse.pointer,true);assert.ok(coarse.height>=48)
    win.webContents.debugger.detach()
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),runtime:process.versions,layout,coarse,normalText,enlargedText,
      resultScenes,publicResults,wizardScenes,publicWizard,helpScenes,publicHelp,firstNote:{count:notes.length,pitch:notes[0].pitch},undoRedo:true,projectReopen:true,recoveryVerified:true,pdfKeepsProjectDirty:true,
      keyboardTrace,keyboardRetry,keyboardActions,taskViewport,taskHeight,auditFirstInputVisibility,firstInputVisibility,auditContinuousInputVisibility,continuousInputVisibility,auditTupletPreviewVisibility,tupletPreviewVisibility,taskMeasures,taskPdfPages,projectSaveRequests:projectSaveRequests.length,readySaveHeight,pendingSaveHeight,
      scope:'Production renderer/preload and real disk outputs; QA IPC replaces OS dialogs and I/O policy. No physical IME, mobile transfer or Score receipt.',scoreReceiptVerified:false},null,2))
    console.log('R3 actual first-use, disk project, undo/reopen and PDF/manual guide passed')
  } catch(error) {
    await capture('failure-state')
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await run(()=>({focus:document.activeElement?.outerHTML,
      trace:window.r3KeyTrace,dialog:document.querySelector('dialog')?.outerHTML})),null,2))
    throw error
  } finally {clearTimeout(deadline);win.destroy();app.quit()}
}).catch(error=>{console.error(error);app.exit(1)})

async function inspectResults(kind,selector) {
  const originalSize=win.getContentBounds()
  const originalTheme=nativeTheme.themeSource
  win.webContents.debugger.attach('1.3')
  try {
    for(const width of [960,1400]) for(const theme of ['light','dark']) for(const scale of [1,2]) for(const coarse of [false,true]) {
      win.setContentSize(width,1000);nativeTheme.themeSource=theme
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
      await settle()
      const fonts=await run(({selector,scale})=>{
        const root=document.querySelector(selector)
        if(!root || root.closest('.studio-chrome')) throw Error('Result must use public components without legacy ancestors')
        const nodes=[root,...root.querySelectorAll('*')]
        const styles=nodes.map(n=>[n.style.fontSize,parseFloat(getComputedStyle(n).fontSize)])
        nodes.forEach((n,i)=>{if(scale===2)n.style.fontSize=styles[i][1]*2+'px'})
        root.scrollIntoView({block:'center'})
        return styles.map(row=>row[0])
      },{selector,scale})
      await settle()
      const metrics=await run(({selector,coarse,scale})=>{
        const root=document.querySelector(selector),buttons=[...root.querySelectorAll('button')]
        return {viewport:[innerWidth,innerHeight],theme:root.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,scale,
          legacy:!!root.closest('.studio-chrome'),overflow:document.documentElement.scrollWidth>innerWidth+1,
          buttons:buttons.map(b=>({name:b.getAttribute('aria-label')||b.textContent.trim(),height:b.getBoundingClientRect().height,
            radius:getComputedStyle(b).borderRadius,common:b.classList.contains('dd-button')})),
          heading:root.querySelector('h2')?.className}
      },{selector,coarse,scale})
      assert.equal(metrics.legacy,false);assert.equal(metrics.overflow,false);assert.equal(metrics.coarse,coarse)
      assert.ok(metrics.buttons.length>0)
      for(const button of metrics.buttons) {assert.ok(button.common);assert.ok(button.height>=(coarse?48:32));assert.notEqual(button.radius,'6px')}
      if(kind==='pdf') assert.ok(metrics.heading.includes('dd-text--item-title'))
      await capture(`${kind}-${width}-${theme}-${scale}-${coarse?'coarse':'fine'}`)
      if(kind==='pdf') {
        await run(()=>{const b=[...document.querySelectorAll('[aria-label="PDF 출력 결과"] button')].find(n=>n.textContent.trim()==='가져오는 방법');b.focus()})
        await key('Space')
        await wait(()=>!!document.querySelector('dialog'))
        assert.equal(await run(()=>document.querySelector('[aria-label="재생"]').disabled),false,'Space on result must not start playback')
        assert.equal(await run(()=>!!document.querySelector('dialog').closest('.studio-chrome')),false)
        await run(scale=>{
          const root=document.querySelector('dialog'),nodes=[root,...root.querySelectorAll('*')]
          const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))
          if(scale===2) nodes.forEach((n,i)=>{n.style.fontSize=sizes[i]*2+'px'})
        },scale)
        await settle()
        assert.equal(await run(()=>{const d=document.querySelector('dialog');return d.scrollWidth>d.clientWidth+1}),false)
        await capture(`guide-${width}-${theme}-${scale}-${coarse?'coarse':'fine'}`)
        await key('Escape')
        await wait(()=>!document.querySelector('dialog'))
        assert.equal(await run(()=>document.activeElement?.textContent.trim()),'가져오는 방법')
      }
      await run(({selector,fonts})=>{
        const root=document.querySelector(selector),nodes=[root,...root.querySelectorAll('*')]
        nodes.forEach((n,i)=>{n.style.fontSize=fonts[i]||''})
      },{selector,fonts})
      resultScenes.push({kind,...metrics})
    }
  } finally {
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false})
    win.webContents.debugger.detach();win.setContentSize(originalSize.width,originalSize.height);nativeTheme.themeSource=originalTheme
    await settle()
  }
}
