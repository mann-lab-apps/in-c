// Real renderer, owned profile/files/native key events. No OS dialog or physical IME claim.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_SYSTEM_TOOLBAR_UI_DIR||'out/ddirori/studio-system-toolbar')
const commandSearchOnly=process.argv.includes('--command-search')
const selectedPropertiesOnly=process.argv.includes('--selected-properties')
const pdfEntryFocusOnly=process.argv.includes('--pdf-entry-focus')
const mixerViewportOnly=process.argv.includes('--mixer-viewport')
const mixerNavigationOnly=process.argv.includes('--mixer-navigation')
const saveProgressOnly=process.argv.includes('--save-progress')
const saveDocumentOnly=process.argv.includes('--save-document-ownership')
const xmlSaveFeedbackOnly=process.argv.includes('--xml-save-feedback')
const xmlCopyNavigationOnly=process.argv.includes('--xml-copy-navigation')
const xmlCopyProgressOnly=process.argv.includes('--xml-copy-progress')
const xmlCopyFocusOnly=process.argv.includes('--xml-copy-focus-return')
const xmlCopyFeedbackOnly=process.argv.includes('--xml-copy-feedback')||xmlCopyNavigationOnly||xmlCopyProgressOnly||xmlCopyFocusOnly
const mixerSaveOnly=process.argv.includes('--mixer-save')||saveProgressOnly
const mixerEnsembleOnly=process.argv.includes('--mixer-ensemble')||mixerNavigationOnly||mixerSaveOnly
const documentLanguageAudit=process.argv.includes('--document-language')
const geometryErrorVisibilityOnly=process.argv.includes('--geometry-error-visibility')
const visibleSystemAudit=process.argv.includes('--visible-system-audit')||documentLanguageAudit
const noteInputToolsOnly=process.argv.includes('--note-input-tools')
const projectSaveFocusOnly=process.argv.includes('--project-save-focus')
const projectOpenFeedbackOnly=process.argv.includes('--project-open-feedback')
const editorStatusOnly=process.argv.includes('--editor-status')||projectSaveFocusOnly
const eventMarksOnly=process.argv.includes('--event-marks')
const decorationsOnly=process.argv.includes('--note-decorations')
const spanSelectOnly=process.argv.includes('--span-select-history')
const harmonyPropertiesOnly=process.argv.includes('--harmony-properties')
const inlineEditorContextOnly=process.argv.includes('--inline-editor-context')
const inlineEditorZoomOnly=process.argv.includes('--inline-editor-zoom')||inlineEditorContextOnly
const inlineLyricEnter=process.argv.includes('--inline-lyric-enter')
const inlineLyricMigration=process.argv.includes('--inline-lyric-migration')||inlineLyricEnter||inlineEditorZoomOnly
const inlineLyricAudit=process.argv.includes('--inline-lyric-audit')||inlineLyricMigration
const inlineLyricLayerOnly=process.argv.includes('--inline-lyric-layer')
const inlineLyricResize=process.argv.includes('--inline-lyric-resize')
const inlineLyricDraft=process.argv.includes('--inline-lyric-draft')||inlineLyricResize
const lyricToolsOnly=process.argv.includes('--lyric-tools')||inlineLyricAudit||inlineLyricLayerOnly
const notationPropertiesOnly=process.argv.includes('--notation-properties')
const repeatToolsOnly=process.argv.includes('--repeat-tools')
const rangeToolsOnly=process.argv.includes('--range-tools')
const partSetupOnly=process.argv.includes('--part-setup')
const scoreViewOnly=process.argv.includes('--score-view')||partSetupOnly
const structureActionsOnly=process.argv.includes('--structure-actions')||scoreViewOnly
const partLabelsOnly=process.argv.includes('--part-labels')||structureActionsOnly
const tempoEventOnly=process.argv.includes('--tempo-event')
const tempoToolsOnly=process.argv.includes('--tempo-tools')||tempoEventOnly||partLabelsOnly
const measureToolsOnly=process.argv.includes('--measure-tools')
const workspaceSpaceOnly=process.argv.includes('--workspace-space')
const dockSettingsOnly=process.argv.includes('--dock-settings')
const documentViewAccessibility=process.argv.includes('--document-view-accessibility')
const sharedDesktopOnly=process.argv.includes('--desktop-shared-dock')
const inputTargetDensityOnly=process.argv.includes('--input-target-density')
const popoverCompositionOnly=process.argv.includes('--popover-composition')
const selectCompositionOnly=process.argv.includes('--select-composition')
const segmentCompositionOnly=process.argv.includes('--segment-composition')
const disabledStyleOnly=process.argv.includes('--disabled-style')
const spanFocusOnly=process.argv.includes('--span-focus')
const eventFocusOnly=process.argv.includes('--event-focus')
const paletteSearchFocusOnly=process.argv.includes('--palette-search-focus')
const paletteArticulationsOnly=process.argv.includes('--palette-articulations')
const palettePausesOnly=process.argv.includes('--palette-pauses')
const paletteEntryOnly=process.argv.includes('--palette-entry')
const commandCompositionOnly=process.argv.includes('--command-composition')
const viewMenuStateOnly=process.argv.includes('--view-menu-state')
const shortWindowWorkspace=process.argv.includes('--short-window-workspace')
const shortWorkspaceNavigation=process.argv.includes('--short-workspace-navigation')
const statusDensityAudit=process.argv.includes('--status-density-audit')||shortWorkspaceNavigation||shortWindowWorkspace
const statusDensityPreview=process.argv.includes('--status-density-preview')
const paletteSearchActionsOnly=process.argv.includes('--palette-search-actions')
const paletteWorkspaceOnly=process.argv.includes('--palette-workspace')
const unspecifiedKeyModeOnly=process.argv.includes('--unspecified-key-mode')
const keyPresetInventoryOnly=process.argv.includes('--key-preset-inventory')
const paletteOrnamentsOnly=process.argv.includes('--palette-ornaments')
const paletteClefsOnly=process.argv.includes('--palette-clefs')
const clefOctaveStateOnly=process.argv.includes('--clef-octave-state')
const metadataImeBlurOnly=process.argv.includes('--metadata-ime-blur')
const metadataEditActionsOnly=process.argv.includes('--metadata-edit-actions')
const metadataTargetsOnly=process.argv.includes('--metadata-trigger-targets')
const metadataSpaceOnly=process.argv.includes('--metadata-space')||metadataImeBlurOnly
const metadataFocusOnly=process.argv.includes('--metadata-focus')||metadataSpaceOnly||metadataTargetsOnly||metadataEditActionsOnly
const compactDockScrollOnly=process.argv.includes('--compact-dock-scroll')||sharedDesktopOnly
const compactSharedDockOnly=process.argv.includes('--compact-shared-dock')||compactDockScrollOnly
const documentViewOnly=process.argv.includes('--document-view')||documentViewAccessibility||dockSettingsOnly
const selectedPitchOnly=process.argv.includes('--selected-pitch')
const chordPropertiesOnly=process.argv.includes('--chord-properties')||selectedPitchOnly
fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration()
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-system-toolbar-')))
app.on('window-all-closed',()=>{})
let focusSnapshots=[]
let win,scene,step,saveCount=0,xmlSaveCount=0,midiSaveCount=0,pdfSaveCount=0,pdfName='output.pdf',openFile,rejectNextSave=false,rejectNextOpen=false,rejectNextRecentAdd=false
let projectSaveBase='current.chromatics',lastProjectSaveFile,projectWriteCount=0,projectSaveBarrier,failedProjectContents
let documentSaveGate,documentRecentAdds=0,documentRecoveryClears=0
const documentSaveRequests=[]
let rejectXmlStage,cancelNextXmlSave=false
const xmlFeedbackRequests=[]
let rejectCopyExport=false,cancelCopyExport=false,copyRecents=0,copyRecoveryClears=0
let copyExportBarrier
const copyExportRequests=[],copyProjectRequests=[]
const receiveDocumentSave=async(kind,v)=>{
 documentSaveRequests.push({kind,filePath:v.filePath,suggestedName:v.suggestedName,sha256:require('node:crypto').createHash('sha256').update(v.contents).digest('hex')})
 const gate=documentSaveGate
 if(!gate||gate.kind!==kind)return
 documentSaveGate=undefined;gate.contents=v.contents;gate.entered=true
 const outcome=await gate.promise
 if(outcome==='failure')throw Error('QA older '+kind+' save unavailable')
 return outcome
}
const fileResult=f=>({filePath:f,fileName:path.basename(f)})
ipcMain.handle('project:save',async(_e,v)=>{
 saveCount++
 if(xmlCopyFeedbackOnly)copyProjectRequests.push({filePath:v.filePath,contents:v.contents})
 if(saveDocumentOnly&&await receiveDocumentSave('project',v)==='cancel')return null
 if(rejectNextSave){rejectNextSave=false;if(mixerSaveOnly)failedProjectContents=v.contents;throw Error('QA disk unavailable')}
 if(mixerSaveOnly&&projectSaveBarrier){const barrier=projectSaveBarrier;projectSaveBarrier=undefined;await barrier}
 const f=saveDocumentOnly?(v.filePath??path.join(scene,path.basename(v.suggestedName))):mixerSaveOnly?(v.filePath??path.join(scene,projectSaveBase)):path.join(scene,'current.chromatics')
 if(mixerSaveOnly||saveDocumentOnly)assert.equal(path.dirname(f),scene,'Only owned scene files may be written')
 fs.writeFileSync(f,v.contents);lastProjectSaveFile=f;projectWriteCount++;return fileResult(f)
})
ipcMain.handle('project:open',()=>{if(rejectNextOpen){rejectNextOpen=false;throw Error('QA read unavailable')}return{...fileResult(openFile),contents:fs.readFileSync(openFile,'utf8')}})
ipcMain.handle('musicxml:save',async(_e,v)=>{
 if(xmlSaveFeedbackOnly){xmlFeedbackRequests.push(v.contents);if(cancelNextXmlSave){cancelNextXmlSave=false;return null}if(rejectXmlStage==='disk'){rejectXmlStage=undefined;throw Error('QA XML disk unavailable '+path.join(scene,'output.musicxml'))}}
 if(saveDocumentOnly&&await receiveDocumentSave('musicxml',v)==='cancel')return null
 const f=saveDocumentOnly?(v.filePath??path.join(scene,path.basename(v.suggestedName))):path.join(scene,'output.musicxml');if(saveDocumentOnly)assert.equal(path.dirname(f),scene);fs.writeFileSync(f,v.contents);xmlSaveCount++;return fileResult(f)
})
ipcMain.handle('musicxml:export',async(_e,v)=>{
 assert.ok(xmlCopyFeedbackOnly,'The dedicated export-copy adapter requires its own QA mode')
 assert.equal(v.filePath,undefined,'A copy must not reuse the primary file path');copyExportRequests.push(v.contents)
 if(rejectCopyExport){rejectCopyExport=false;throw Error('QA XML copy unavailable '+path.join(scene,'export-copy.musicxml'))}
 if(cancelCopyExport){cancelCopyExport=false;return null}
 if((xmlCopyProgressOnly||xmlCopyFocusOnly)&&copyExportBarrier){const barrier=copyExportBarrier;copyExportBarrier=undefined;await barrier}
 const f=path.join(scene,'export-copy.musicxml');fs.writeFileSync(f,v.contents);return fileResult(f)
})
ipcMain.handle('midi:save',(_e,v)=>{const f=path.join(scene,'output.mid');fs.writeFileSync(f,Buffer.from(v.contents));midiSaveCount++;return fileResult(f)})
ipcMain.handle('pdf:save',async()=>{const f=path.join(scene,pdfName);fs.writeFileSync(f,await win.webContents.printToPDF({preferCSSPageSize:true}));pdfSaveCount++;return fileResult(f)})
for(const c of['project:list-backups','recent-musicxml:list'])ipcMain.handle(c,()=>[])
ipcMain.handle('recent-musicxml:add',()=>{if(saveDocumentOnly)documentRecentAdds++;if(xmlCopyFeedbackOnly)copyRecents++;if(xmlSaveFeedbackOnly&&rejectXmlStage==='recent'){rejectXmlStage=undefined;throw Error('QA recent unavailable '+scene)}if(rejectNextRecentAdd){rejectNextRecentAdd=false;throw Error('QA recent unavailable')}return[]})
for(const c of['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(c,()=>{if(saveDocumentOnly&&c==='autosave:clear')documentRecoveryClears++;if(xmlCopyFeedbackOnly&&c==='autosave:clear')copyRecoveryClears++;if(xmlSaveFeedbackOnly&&c==='autosave:clear'&&rejectXmlStage==='recovery'){rejectXmlStage=undefined;throw Error('QA recovery unavailable '+scene)}return null})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.stack}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=async()=>{
 await run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
 await run(()=>{
  if(window.__systemTextScale!==2)return
  const apply=()=>{
  const originals=window.__systemOriginalFonts??=new Map()
  for(const [node,size] of originals){if(node.isConnected)node.style.fontSize=size;else originals.delete(node)}
  const roleBases=window.__systemRoleBaseFonts??=new WeakMap();for(const n of document.querySelectorAll('.ddirori .dd-text'))if(!n.closest('.score-canvas,.studio-pdf-snapshot')||n.closest('.studio-metadata-editor,.studio-inline-lyric-editor'))roleBases.set(n,parseFloat(getComputedStyle(n).fontSize))
  const headingBases=window.__systemHeadingBaseFonts??=new WeakMap();for(const n of document.querySelectorAll('.ddirori h4'))headingBases.set(n,parseFloat(getComputedStyle(n).fontSize))
  const nodes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,label,span,output,h1,h2,h3,h4,p,dt,dd,.dd-text)')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot')||n.closest('.studio-metadata-editor,.studio-inline-lyric-editor'))
  const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))
  nodes.forEach((n,i)=>{if(!originals.has(n))originals.set(n,n.style.fontSize);n.style.fontSize=`${sizes[i]*2}px`})
  }
  window.__systemApplyTextScale=apply
  // Added controls must have the emulated text size before their focus frame.
  // Scaling only after two frames can manufacture a post-focus occlusion.
  if(!window.__systemScaleObserver){
   const observer=new MutationObserver(()=>window.__systemApplyTextScale?.())
   observer.observe(document.body,{childList:true,subtree:true});window.__systemScaleObserver=observer
  }
  apply()
 })
 await run(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
}
const wait=async(fn,arg)=>{const t=Date.now();while(!await run(fn,arg)){assert.ok(Date.now()-t<12000,step);await settle()}}
const mixerViewport=async route=>run(async route=>{
 const frames=[];let stable=0,previous=''
 for(let index=0;index<90&&stable<3;index++){
  await new Promise(resolve=>requestAnimationFrame(resolve))
  const panel=document.querySelector('.studio-part-mixer'),footer=document.querySelector('.studio-status')
  const p=panel.getBoundingClientRect(),f=footer.getBoundingClientRect(),controls=[...panel.querySelectorAll('input')].filter(n=>n.checkVisibility())
  const state={panel:p.toJSON(),footer:f.toJSON(),fields:controls.map(n=>({name:n.getAttribute('aria-label')||n.labels?.[0]?.textContent.trim(),type:n.type,box:n.getBoundingClientRect().toJSON(),focused:n===document.activeElement})),scrollY,documentHeight:document.documentElement.scrollHeight,dockHeight:document.querySelector('.studio-docks').style.getPropertyValue('--studio-shared-dock-height')}
  const key=JSON.stringify(state);stable=key===previous?stable+1:0;previous=key;frames.push(state)
 }
 const last=frames.at(-1),limit=Math.min(innerHeight,last.footer.top),visible=b=>b.top>=0&&b.bottom<=limit&&b.left>=0&&b.right<=innerWidth
 return{route,stable:stable>=3,frames,limit,viewport:[innerWidth,innerHeight],fieldsVisible:last.fields.length===3&&last.fields.every(n=>visible(n.box)),activeInside:document.querySelector('.studio-part-mixer').contains(document.activeElement),history:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),documentFocused:document.hasFocus()}
},route)
const inspectMixerFocus=async()=>{
 const observation=await run(async()=>{
  let stable=0,previous='',last,frames=0
  while(frames++<90&&stable<3){
   await new Promise(resolve=>requestAnimationFrame(resolve))
   const inputs=[...document.querySelectorAll('.studio-part-mixer input')],active=document.activeElement
   const box=active?.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect()
   const labels=[...active?.labels??[]].map(n=>n.getBoundingClientRect()),boxes=[box,...labels].filter(Boolean)
   const ownerBox={left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))}
   last={index:inputs.indexOf(active),controls:inputs.length,label:active?.getAttribute('aria-label')||active?.labels?.[0]?.textContent.trim(),type:active?.type,
    box:box?.toJSON(),ownerBox,footer:footer.toJSON(),viewport:[innerWidth,innerHeight],focused:document.hasFocus(),value:active?.value,scrollY,
    theme:active?.closest('.ddirori')?.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,labelFont:getComputedStyle(document.querySelector('.studio-part-mixer label')).fontSize}
   const current=JSON.stringify(last);stable=current===previous?stable+1:0;previous=current
  }
  return {...last,stable:stable>=3,frames,visible:last.index>=0&&last.box.top>=0&&last.box.bottom<=Math.min(innerHeight,last.footer.top)&&last.box.left>=0&&last.box.right<=innerWidth,
   ownerVisible:last.index>=0&&last.ownerBox.top>=0&&last.ownerBox.bottom<=Math.min(innerHeight,last.footer.top)&&last.ownerBox.left>=0&&last.ownerBox.right<=innerWidth}
 })
 return {...observation,nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused()}
}
const clickButton=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable '+label);n.focus();n.click()},label);await settle()}
const workspaceEntries={'파일':['파일','파일 작업 열기'],'악보':['형식','악보 설정'],'음표':['도구','선택 속성 열기'],'표기 객체':['추가','표기 팔레트 열기'],'가사':['추가','가사 및 코드'],'내보내기':['파일','내보내기 설정']}
const click=async label=>{const entry=workspaceEntries[label];if(entry){await clickButton(entry[0]);await clickButton(entry[1])}else await clickButton(label)}
const auditVisibleSystem=async name=>{
 const result=await run(name=>{
  const visible=n=>n.checkVisibility()&&n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0
  const content=n=>!n.closest('.score-canvas,.studio-pdf-snapshot,.performance-lab')
  const describe=n=>({tag:n.tagName,label:n.getAttribute('aria-label')||n.textContent.trim().slice(0,80),class:n.getAttribute('class'),box:n.getBoundingClientRect().toJSON()})
  const controls=[...document.querySelectorAll('button,input,select,textarea,[role="combobox"],[role="tab"],[role="radio"]')].filter(n=>visible(n)&&content(n))
  const legacyControl=controls.filter(n=>!n.closest('.ddirori')||(![...n.classList].some(c=>c.startsWith('dd-'))&&!n.closest('.dd-field,.dd-check,.dd-segments,.dd-tab-list,.dd-accordion,.dd-popover,.dd-radio-group'))).map(describe)
  // Compare actual computed paint to the old palette, not CSS text alone.
  // Any matches are audit candidates; shared-role coincidences need inspection.
  const legacyColors=new Set(['#ece8dd','#fffdf8','#faf7f0','#202326','#4a555c','#d4cec1','#c7c0b3','#b43d2f','#47616c','#a33125'].map(value=>{const probe=document.createElement('span');probe.style.color=value;document.body.append(probe);const normalized=getComputedStyle(probe).color;probe.remove();return normalized}))
  const painted=[...document.querySelectorAll('.app-shell *')].filter(n=>visible(n)&&content(n)&&!(n instanceof SVGElement))
  const legacyPaint=painted.flatMap(n=>{
   const s=getComputedStyle(n),hasOwnText=[...n.childNodes].some(child=>child.nodeType===Node.TEXT_NODE&&child.textContent.trim())||n.matches('input,select,textarea')
   const matches=['color','background-color','border-top-color','outline-color'].filter(property=>legacyColors.has(s.getPropertyValue(property))&&(property!=='color'||hasOwnText)&&(!(property==='border-top-color')||parseFloat(s.borderTopWidth)>0)&&(!(property==='outline-color')||s.outlineStyle!=='none'))
   return matches.length?[{...describe(n),paint:Object.fromEntries(matches.map(property=>[property,s.getPropertyValue(property)]))}]:[]
  })
  const icons=[...document.querySelectorAll('svg.lucide')].filter(n=>visible(n)&&content(n)).map(n=>({...describe(n),width:n.getAttribute('width'),height:n.getAttribute('height'),stroke:n.getAttribute('stroke-width')}))
  const surfaces=[...document.querySelectorAll('.studio-document,.studio-application-menu,.studio-command-bars,.studio-note-toolbar,.studio-playback,.studio-part-mixer,.studio-docks,aside,.studio-status,.dd-popover,.dd-dialog')].filter(visible).map(n=>{const s=getComputedStyle(n);return{...describe(n),background:s.backgroundColor,color:s.color,font:s.fontFamily,border:s.borderTopColor}})
  return{name,lang:document.documentElement.lang,viewport:[innerWidth,innerHeight],controls:controls.length,legacyControl,legacyPaint,icons,surfaces,history:document.querySelector('.editor-status')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,notationWrapped:!!document.querySelector('.score-canvas')?.closest('.ddirori')}
 },name)
 fs.writeFileSync(path.join(scene,'system-'+name+'.json'),JSON.stringify(result,null,2));await capture('system-'+name)
 if(documentLanguageAudit)assert.equal(result.lang,'ko','The document language must match the current Korean UI:'+name)
 assert.equal(result.legacyControl.length,0,'Visible UI controls must use public composition:'+name)
 assert.equal(result.legacyPaint.length,0,'Visible UI ink must not retain legacy palette paint:'+name)
 assert.equal(result.overflow,false,'Visible UI surface must not overflow the viewport:'+name)
 assert.equal(result.notationWrapped,false,'The notation canvas remains independent:'+name)
 assert.ok(result.icons.every(n=>n.width==='18'&&n.height==='18'&&n.stroke==='1.75'),'Service Lucide icons use18/1.75:'+name)
 assert.match(result.history,/0회 수정/,'Inspecting UI must not mutate the document:'+name)
 return result
}
const openNotationSettings=async entry=>{
 await click('표기 객체')
 const [family,label]={clef:['음자리표·조표·박자표','음자리표 설정 열기'],range:['범위 기호','범위 기호 설정 열기'],repeat:['반복·볼타','반복·볼타 설정 열기']}[entry]
 const expanded=await run(family=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent===family)?.getAttribute('aria-expanded'),family)
 assert.ok(expanded==='true'||expanded==='false','Live notation family must exist:'+family)
 if(expanded==='false')await clickButton(family)
 await clickButton(label)
}
const recordNativeFocus=async phase=>{
 const snapshot={phase,at:new Date().toISOString(),window:win.isFocused(),webContents:win.webContents.isFocused(),focusedWindow:BrowserWindow.getFocusedWindow()?.id??null,
  renderer:await run(()=>{const n=document.activeElement;return{document:document.hasFocus(),active:{tag:n?.tagName,label:n?.getAttribute('aria-label'),role:n?.getAttribute('role'),visible:n?.checkVisibility()},openPopovers:[...document.querySelectorAll('[popover]:popover-open')].map(n=>({role:n.getAttribute('role'),label:n.getAttribute('aria-label')})),
  staleDisabledTooltips:[...document.querySelectorAll('[role="tooltip"]:popover-open')].flatMap(n=>{const host=n.closest('.dd-tooltip-wrap'),control=host?.querySelector('button,input,select,textarea');return control?.matches(':disabled,[aria-disabled="true"]')&&!host.matches(':hover')?[{text:n.textContent,owner:control.getAttribute('aria-label')||control.textContent,box:n.getBoundingClientRect().toJSON()}]:[]})}})}
 focusSnapshots.push(snapshot);fs.writeFileSync(path.join(scene,'native-focus-phases.json'),JSON.stringify(focusSnapshots,null,2));console.log(step+':'+phase)
 await capture('focus-'+phase)
 if(phase==='before-mixer')assert.equal(snapshot.renderer.staleDisabledTooltips.length,0,'Focus-only tooltips must dismiss when their control becomes disabled')
}
const setDockWidth=async(name,width)=>{
 if(!await run(name=>document.querySelector(name==='팔레트'?'#studio-palette':'#studio-properties').checkVisibility(),name))await clickButton(name+' 표시')
 const dockTrigger=await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===label&&n.checkVisibility());return{secondary:n.matches('.dd-button.dd-button--secondary'),border:getComputedStyle(n).borderTopColor}},name+' 도크 설정')
 assert.equal(dockTrigger.secondary,true,'Dock settings keep the existing secondary Popover default')
 assert.notEqual(dockTrigger.border,'rgba(0, 0, 0, 0)','Dock settings keep the shared secondary border')
 await clickButton(name+' 도크 설정')
 const selector=`input[aria-label="${name} 도크 폭"]`
 assert.equal(await run(selector=>document.activeElement?.matches(selector)&&document.activeElement.checkVisibility(),selector),true)
 // Native editing command avoids relying on a host application's Edit menu accelerator.
 win.webContents.selectAll();await key('Backspace',[],selector)
 assert.equal(await run(selector=>document.querySelector(selector).value,selector),'')
 const invalidPopup=await run(selector=>{const n=document.querySelector(selector),r=n.closest('[popover]').getBoundingClientRect();return{invalid:n.getAttribute('aria-invalid'),top:r.top,bottom:r.bottom,left:r.left,right:r.right,viewport:[innerWidth,innerHeight]}},selector)
 assert.equal(invalidPopup.invalid,'true');assert.ok(invalidPopup.top>=0&&invalidPopup.bottom<=invalidPopup.viewport[1]&&invalidPopup.left>=0&&invalidPopup.right<=invalidPopup.viewport[0],'Invalid draft and error must remain inside the popup viewport')
 if(width===207){fs.writeFileSync(path.join(scene,`dock-${name}-invalid.json`),JSON.stringify(invalidPopup,null,2));await capture('dock-'+name+'-invalid')}
 for(const char of String(width)){await win.webContents.insertText(char);await settle()}

 assert.equal(await run(selector=>document.querySelector(selector).value,selector),String(width))
 await key('Escape',[],selector)
 assert.equal(await run(label=>document.activeElement?.getAttribute('aria-label')===label,name+' 도크 설정'),true)
 assert.equal(await run(selector=>document.querySelector(selector).checkVisibility(),selector),false)
}
const ensureNativeFocus=async()=>{
 app.focus({steal:true});win.focus();win.webContents.focus()
 const started=Date.now()
 while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){
  if(Date.now()-started>=12000){
   const focus={window:win.isFocused(),webContents:win.webContents.isFocused(),document:await run(()=>({focused:document.hasFocus(),active:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}}))}
   fs.writeFileSync(path.join(scene,'native-focus-timeout.json'),JSON.stringify(focus,null,2))
   assert.fail('Native window/content/document must jointly gain focus before sending keys:'+JSON.stringify(focus))
  }
  await settle()
 }
}
const key=async(keyCode,modifiers=[],expectedFocus)=>{
 await ensureNativeFocus()
 if(expectedFocus)assert.equal(await run(selector=>document.activeElement?.matches(selector)&&document.activeElement?.checkVisibility(),expectedFocus),true,'The expected live control must own the key;do not refocus a stale target')
 win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
}
const inspectProjectSaveFailure=async minimum=>{
 await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'))
 const selection=await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),edits=await history()
 const closed=await run(()=>{
  const status=document.querySelector('[role="status"][aria-label="편집 및 파일 상태"]'),root=document.querySelector('.studio-status__technical'),button=root?.querySelector('button'),content=root?.querySelector('.studio-warning-technical__content')
  return{summary:status.textContent,technicalOutsideLive:root&&!status.contains(root),expanded:button?.getAttribute('aria-expanded'),visible:content?.checkVisibility(),diagnostic:content?.textContent,common:button?.closest('.dd-accordion')!==null}
 })
 assert.match(closed.summary,/다시 시도해 주세요/);assert.doesNotMatch(closed.summary,/QA disk unavailable|project:save/);assert.equal(closed.technicalOutsideLive,true);assert.equal(closed.expanded,'false');assert.equal(closed.visible,false);assert.equal(closed.common,true);assert.match(closed.diagnostic,/QA disk unavailable/)
 await capture('project-save-failure-summary')
 const selector='.studio-status__technical button'
 await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()})
 await key('Enter',[],selector)
 const opened=await run(()=>{
  const root=document.querySelector('.studio-status__technical'),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content'),b=button.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect()
  return{expanded:button.getAttribute('aria-expanded'),visible:content.checkVisibility(),diagnostic:content.textContent,button:b.toJSON(),footer:f.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,readoutInteractive:!!document.querySelector('.editor-status button'),stopped:document.querySelector('.editor-status').textContent.includes('정지')}
 })
 assert.equal(opened.expanded,'true');assert.equal(opened.visible,true);assert.match(opened.diagnostic,/QA disk unavailable/);assert.equal(opened.overflow,false);assert.equal(opened.readoutInteractive,false);assert.equal(opened.stopped,true);assert.ok(opened.button.width>=minimum&&opened.button.height>=minimum);assert.ok(opened.button.left>=opened.footer.left&&opened.button.right<=opened.footer.right)
 await run(()=>document.querySelector('.studio-status__technical .studio-warning-technical__content').scrollIntoView({block:'nearest'}));await settle()
 const diagnosticViewport=await run(()=>{
  const n=document.querySelector('.studio-status__technical .studio-warning-technical__content'),r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)
  return{content:r.toJSON(),footer:f.toJSON(),height:innerHeight,pointerInTechnical:!!hit?.closest('.studio-status__technical')}
 })
 assert.ok(diagnosticViewport.content.top>=diagnosticViewport.footer.top-1&&diagnosticViewport.content.bottom<=Math.min(diagnosticViewport.footer.bottom,diagnosticViewport.height)+1,'Expanded diagnostics must actually be readable inside the footer viewport after internal scroll');assert.equal(diagnosticViewport.pointerInTechnical,true)
 await capture('project-save-failure-technical')
 await run(()=>document.querySelector('.studio-status__technical button').scrollIntoView({block:'nearest'}));await settle()
 let scoreFocus
 if(projectSaveFocusOnly){
  const guarded=[]
  for(const variant of [{isComposing:true},{keyCode:229}]){await composeKey(selector,'F6',variant,guarded);assert.equal(await run(()=>document.activeElement.matches('.studio-status__technical button')),true)}
  for(const modifiers of [['control'],['meta'],['alt']]){await key('F6',modifiers,selector);assert.equal(await run(()=>document.activeElement.matches('.studio-status__technical button')),true)}
  await key('F6',[],selector)
  scoreFocus=await run(()=>{
   const target=document.activeElement,text=target?.querySelector('.vf-notehead text'),style=text&&getComputedStyle(text),context=document.createElement('canvas').getContext('2d')
   if(!text||!style)throw Error('F6 must focus the actual selected note,not a toolbar proxy')
   context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
   const ink=context.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),top=new DOMPoint(p.x-ink.actualBoundingBoxLeft,p.y-ink.actualBoundingBoxAscent).matrixTransform(matrix),bottom=new DOMPoint(p.x+ink.actualBoundingBoxRight,p.y+ink.actualBoundingBoxDescent).matrixTransform(matrix),footer=document.querySelector('.studio-status').getBoundingClientRect()
   return{id:target.dataset.eventId,selected:target.classList.contains('is-selected'),top:top.y,bottom:bottom.y,footerTop:footer.top,expanded:document.querySelector('.studio-status__technical button').getAttribute('aria-expanded'),stopped:document.querySelector('.editor-status').textContent.includes('정지')}
  })
  assert.equal(scoreFocus.id,selection.at(-1));assert.equal(scoreFocus.selected,true);assert.equal(scoreFocus.expanded,'true');assert.equal(scoreFocus.stopped,true);assert.ok(scoreFocus.top>=0&&scoreFocus.bottom<=scoreFocus.footerTop,'F6 must expose the actual selected note ink above the sticky error footer');assert.equal(await history(),edits)
  fs.writeFileSync(path.join(scene,'project-save-focus.json'),JSON.stringify({guarded,scoreFocus},null,2));await capture('project-save-focus-score')
  await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()});await settle()
 }
 await key('Space',[],selector)
 assert.equal(await run(()=>document.querySelector('.studio-status__technical button').getAttribute('aria-expanded')),'false')
 assert.equal(await history(),edits);assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection)
 fs.writeFileSync(path.join(scene,'project-save-feedback.json'),JSON.stringify({closed,opened,diagnosticViewport,scoreFocus,selection,edits},null,2))
}
// Synthetic flags test local event ownership; ordinary follow-up keys use key().
const composeKey=async(selector,key,variant,trace)=>{
 const observation=await run(({selector,key,variant})=>{const n=document.querySelector(selector);if(!n||document.activeElement!==n||!n.checkVisibility())throw Error('Composition target must own focus');const event=new KeyboardEvent('keydown',{key,code:key,bubbles:true,cancelable:true,...variant});n.dispatchEvent(event);return{key,isComposing:event.isComposing,keyCode:event.keyCode,prevented:event.defaultPrevented}},{selector,key,variant})
 await settle();trace.push(observation);fs.writeFileSync(path.join(scene,'composition.json'),JSON.stringify(trace,null,2));return observation
}
const selectRenderedMeasure=async id=>{
    await run(id=>document.querySelector(`.notation-measure[data-measure-id="${id}"]`).scrollIntoView({block:'center',inline:'nearest'}),id);await settle();await ensureNativeFocus()
    const point=await run(id=>{const n=document.querySelector(`.notation-measure[data-measure-id="${id}"]`),b=n.getBBox(),probes=[];for(const ratio of [.8,.5,.2])for(const y of [b.y+b.height-2,b.y+2,b.y+b.height/2]){const p=new DOMPoint(b.x+b.width*ratio,y).matrixTransform(n.getScreenCTM()),hit=document.elementFromPoint(p.x,p.y);probes.push({x:p.x,y:p.y,tag:hit?.tagName,cls:hit?.getAttribute('class')});if(hit===n)return{x:p.x,y:p.y}}throw Error('Actual measure target is occluded:'+id+JSON.stringify({bounds:n.getBoundingClientRect().toJSON(),pointer:getComputedStyle(n).pointerEvents,probes}))},id)
    for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle()
    assert.equal(await run(id=>document.querySelector('.notation-measure.is-selected')?.dataset.measureId===id,id),true)
   }
const capture=async name=>fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())
const history=()=>run(()=>document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0])
const save=async name=>{await click('파일');const count=saveCount;await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));assert.equal(saveCount,count+1);const f=mixerSaveOnly||saveDocumentOnly?lastProjectSaveFile:path.join(scene,'current.chromatics');fs.copyFileSync(f,path.join(scene,name+'.chromatics'));return JSON.parse(fs.readFileSync(f)).score}
const musicToolGeometry=selector=>run(selector=>{const root=document.querySelector(selector),r=root.getBoundingClientRect();return{surface:getComputedStyle(root).backgroundColor,parentSurface:getComputedStyle(root.parentElement).backgroundColor,actualRootWidth:r.width,legacy:root.closest('.studio-chrome')!==null,overflow:root.scrollWidth>root.clientWidth,scope:root.textContent,buttons:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect(),svg=n.querySelector('svg'),text=svg?.querySelector('text'),font=text?getComputedStyle(text):null,v=text?svg.viewBox.baseVal:null;
     if(!text)return{label:n.getAttribute('aria-label')??n.textContent,common:n.classList.contains('dd-select'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,inkInside:null,font:null};
     // SVG getBBox includes Bravura's full ascent/descent,not painted glyph ink.
     // Independently rasterize the actual glyph and scan alpha instead.
     const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.font=font.fontSize+' '+font.fontFamily;ctx.fillText(text.textContent,64,128);const data=ctx.getImageData(0,0,256,256).data;let left=256,top=256,right=0,bottom=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1)}const ink={x:left-64,y:top-128,width:right-left,height:bottom-top};
     return{label:n.getAttribute('aria-label'),common:n.classList.contains('dd-icon-button'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,inkInside:ink.width>0&&ink.height>0&&ink.x>=v.x&&ink.y>=v.y&&ink.x+ink.width<=v.x+v.width&&ink.y+ink.height<=v.y+v.height,ink:{x:ink.x,y:ink.y,width:ink.width,height:ink.height},frame:{x:v.x,y:v.y,width:v.width,height:v.height},font:getComputedStyle(svg.querySelector('text')).fontFamily}})}},selector)
app.whenReady().then(async()=>{
 const records=[]
 const allCases=[{width:960,theme:'light',scale:1,coarse:false},{width:1400,theme:'dark',scale:1,coarse:false},{width:960,theme:'dark',scale:2,coarse:true},{width:1400,theme:'light',scale:2,coarse:true}]
 let cases=paletteEntryOnly?[...[960,1400].flatMap(width=>[750,800,1000].map(height=>({width,height,theme:'light',scale:1,coarse:false}))),{width:960,height:800,theme:'dark',scale:2,coarse:true},{width:1400,height:800,theme:'light',scale:2,coarse:true}]:compactSharedDockOnly?[...[960,1400].flatMap(width=>[750,800,1000].map(height=>({width,height,theme:'light',scale:1,coarse:false}))),...(compactDockScrollOnly?[{width:960,height:800,theme:'dark',scale:2,coarse:true},{width:1400,height:800,theme:'light',scale:2,coarse:true}]:[])]:(workspaceSpaceOnly||(documentViewOnly&&!documentViewAccessibility))?[960,1400].flatMap(width=>[750,800,1000].map(height=>({width,height,theme:'light',scale:1,coarse:false}))):process.argv.includes('--probe-native')?allCases.slice(0,1):allCases
 if(statusDensityAudit){cases=[960,1400].flatMap(width=>[1,2].flatMap(scale=>[750,800,1000].map(height=>({width,height,theme:scale===1?'light':'dark',scale,coarse:scale===2}))));if(process.argv.includes('--probe-large-text'))cases=cases.filter(c=>c.scale===2).slice(0,1);if(shortWindowWorkspace&&process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(paletteWorkspaceOnly&&process.argv.includes('--probe-large-text'))cases=cases.filter(c=>c.scale===2).slice(0,1)
 if(paletteEntryOnly&&process.argv.includes('--probe-native'))cases=cases.slice(0,1)
 if(sharedDesktopOnly)cases.sort((a,b)=>b.width-a.width||a.scale-b.scale)
 if(inputTargetDensityOnly)cases.sort((a,b)=>b.scale-a.scale||b.width-a.width)
 if(inlineEditorZoomOnly){cases=[{width:960,theme:'dark',scale:1,coarse:true},{width:1400,theme:'light',scale:1,coarse:true},{width:960,theme:'light',scale:1,coarse:false},{width:1400,theme:'dark',scale:1,coarse:false},{width:960,theme:'dark',scale:2,coarse:false},{width:1400,theme:'light',scale:2,coarse:true}];if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(metadataTargetsOnly||metadataEditActionsOnly){cases=[{width:960,theme:'dark',scale:1,coarse:true},{width:1400,theme:'light',scale:1,coarse:true},{width:960,theme:'light',scale:1,coarse:false},{width:1400,theme:'dark',scale:1,coarse:false},{width:960,theme:'dark',scale:2,coarse:false},{width:1400,theme:'light',scale:2,coarse:true}];if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(mixerViewportOnly||mixerEnsembleOnly){cases=[{width:1280,height:900,theme:'light',scale:1,coarse:false},{width:960,height:750,theme:'light',scale:1,coarse:false},{width:1400,height:800,theme:'dark',scale:1,coarse:false},{width:960,height:800,theme:'dark',scale:2,coarse:true},{width:1400,height:800,theme:'light',scale:2,coarse:true}];if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(saveDocumentOnly){cases=allCases.flatMap(c=>['project','musicxml'].flatMap(operation=>['success','failure','cancel'].map(outcome=>({...c,operation,outcome}))));if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(xmlSaveFeedbackOnly){cases=allCases.flatMap(c=>['disk','recovery','recent'].map(xmlFailureStage=>({...c,xmlFailureStage})));if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 if(xmlCopyFeedbackOnly){cases=allCases.flatMap(c=>['score','part'].map(copyView=>({...c,copyView})));if(process.argv.includes('--probe-native'))cases=cases.slice(0,1)}
 try{for(const c of cases){
  step=`${c.width}-${c.theme}-${c.scale}-${c.coarse?'coarse':'fine'}${c.height?'-'+c.height:''}${c.operation?'-'+c.operation+'-'+c.outcome:''}${c.xmlFailureStage?'-'+c.xmlFailureStage:''}${c.copyView?'-'+c.copyView:''}`;scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});console.log(step+':start')
  focusSnapshots=[]
  const deadline=setTimeout(()=>{console.error('Deadline '+step);app.exit(1)},60000)
  nativeTheme.themeSource=c.theme
  win=new BrowserWindow({width:c.width,height:c.height??800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
  win.webContents.on('will-prevent-unload',e=>e.preventDefault());win.setContentSize(c.width,c.height??800)
  await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:mixerViewportOnly||mixerEnsembleOnly?'single-voice-mvp':'release-test'}})
  await run(scale=>{window.__systemTextScale=scale},c.scale)
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:c.coarse});await settle()
  await run(()=>{window.__systemTrace=[];const describe=n=>({tag:n?.tagName,label:n?.getAttribute?.('aria-label'),role:n?.getAttribute?.('role'),text:n?.textContent?.slice(0,80)});for(const type of['focusin','focusout','keydown','keyup','beforetoggle','toggle'])document.addEventListener(type,e=>{const row={type,key:e.key,code:e.code,keyCode:e.keyCode,ctrl:e.ctrlKey,meta:e.metaKey,shift:e.shiftKey,alt:e.altKey,composing:e.isComposing,target:describe(e.target),active:describe(document.activeElement),oldState:e.oldState,newState:e.newState};window.__systemTrace.push(row);setTimeout(()=>{row.after=describe(document.activeElement);row.prevented=e.defaultPrevented},0)},true)})
  await capture('initial-workspace')
  if(commandSearchOnly){
   const original=await save('command-source'),states=[]
   const field=()=>run(()=>{const n=document.querySelector('.studio-command-search input[type=search]');return{focused:document.activeElement===n,value:n?.value}})
   const open=async()=>{await clickButton('도구');await clickButton('명령 검색');await wait(()=>document.activeElement?.matches('.studio-command-search input[type=search]'));await settle()}
   const query=async text=>{await run(()=>{const n=document.querySelector('.studio-command-search input[type=search]');n.focus();n.select()});await win.webContents.insertText(text);await settle();assert.equal((await field()).value,text)}
   const geometry=async phase=>{
    const g=await run(()=>{const dialog=document.querySelector('.studio-command-search dialog'),r=dialog.getBoundingClientRect(),input=dialog.querySelector('input'),f=input.getBoundingClientRect(),active=document.activeElement,a=active.getBoundingClientRect();return{dialog:r.toJSON(),input:f.toJSON(),focus:a.toJSON(),label:active.getAttribute('aria-label')||active.textContent,font:parseFloat(getComputedStyle(input).fontSize),theme:dialog.closest('.ddirori').dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...dialog.querySelectorAll('button')].map(n=>({label:n.getAttribute('aria-label')||n.textContent,common:n.classList.contains('dd-button'),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,disabled:n.disabled}))}})
    assert.ok(g.dialog.left>=0&&g.dialog.top>=0&&g.dialog.right<=c.width&&g.dialog.bottom<=(c.height??800),'Actual public Dialog containment')
    assert.ok(g.focus.top>=g.dialog.top&&g.focus.bottom<=g.dialog.bottom&&g.focus.left>=g.dialog.left&&g.focus.right<=g.dialog.right,'Focused actual command control is visible')
    assert.equal(g.theme,c.theme);assert.equal(g.coarse,c.coarse);assert.equal(g.overflow,false)
    if(c.scale===2)assert.ok(g.font>=28,'Actual Input text must scale200%')
    assert.ok(g.buttons.every(n=>n.common&&n.height>=(c.coarse?48:32)&&n.width>=(c.coarse?48:32)))
    states.push({phase,...g});fs.writeFileSync(path.join(scene,'command-search-geometry.json'),JSON.stringify(states,null,2));await capture('command-'+phase)
   }
   step+=':command-search-disabled';await open();await query('실행 취소')
   assert.equal(await run(()=>document.querySelector('.studio-command-search button[aria-label="편집 · 실행 취소"]').disabled),true);await geometry('disabled')
   await run(()=>document.querySelector('.studio-command-search input').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'ㅎ'})));await key('Escape');await key('Enter');assert.ok((await field()).focused)
   await run(()=>document.querySelector('.studio-command-search input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''})))
   await query('없는 명령');await key('Enter');assert.ok(await run(()=>Boolean(document.querySelector('.studio-command-search dialog[open]'))));await geometry('empty')
   await query('');await key('Down');const first=await run(()=>document.activeElement.getAttribute('aria-label'));await key('End');assert.notEqual(await run(()=>document.activeElement.getAttribute('aria-label')),first);await geometry('keyboard-last');await key('Home');assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),first)
   await key('Escape');await wait(()=>!document.querySelector('.studio-command-search'));assert.equal(await run(()=>document.activeElement?.textContent.trim()),'도구')
   assert.deepEqual(await save('search-navigation'),original)
   step+=':command-search-undo';await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="m1-c4"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await clickButton('악보로 이동');await key('Up',['alt']);const edited=await save('search-edit');assert.notDeepEqual(edited,original)
   await open();await query('실행 취소');assert.equal(await run(()=>document.querySelector('.studio-command-search button[aria-label="편집 · 실행 취소"]').disabled),false);await key('Enter');await wait(()=>!document.querySelector('.studio-command-search'));assert.deepEqual(await save('search-undo'),original)
   await open();await query('PDF 페이지');await key('Down');await key('Enter');await wait(()=>!document.querySelector('.studio-command-search'));await wait(()=>document.activeElement?.matches('.studio-page-setup [role=combobox]'))
   const focus=await run(()=>({role:document.activeElement.getAttribute('role'),label:document.activeElement.textContent,box:document.activeElement.getBoundingClientRect().toJSON()}));assert.deepEqual(await save('search-workspace'),original)
   step+=':palette-menu-route';await clickButton('추가');await clickButton('음자리표·조표·박자표 팔레트')
   await wait(()=>document.activeElement?.closest('[data-family]')?.dataset.family==='음자리표·조표·박자표')
   assert.equal(await run(()=>document.activeElement.getAttribute('aria-expanded')),'true')
   await clickButton('팔레트 도크 설정')
   const single=await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='한 팔레트씩 열기')?.control;if(!n?.checkVisibility())throw Error('Public single-family checkbox unavailable');n.scrollIntoView({block:'nearest'});n.focus();return n.checked})
   if(single!==c.coarse)await key('Space');await key('Escape')
   await run(()=>{const n=document.querySelector('.studio-notation-palette input[type=search]');n.scrollIntoView({block:'nearest'});n.focus();n.select()});await win.webContents.insertText('찾을 수 없는 글자');await settle()
   assert.equal(await run(()=>document.querySelector('.studio-notation-palette input[type=search]').value),'찾을 수 없는 글자')
   await open();await query('반복');await key('Enter');await wait(()=>!document.querySelector('.studio-command-search'))
   await wait(()=>document.activeElement?.closest('[data-family]')?.dataset.family==='반복·볼타')
   const route=await run(()=>{const n=document.activeElement,b=n.getBoundingClientRect(),root=n.closest('.studio-notation-palette');return{family:n.closest('[data-family]').dataset.family,expanded:n.getAttribute('aria-expanded'),query:root.querySelector('input[type=search]').value,opened:[...root.querySelectorAll('[data-family]')].filter(p=>p.querySelector('button[aria-expanded=true]')).map(p=>p.dataset.family),single:JSON.parse(localStorage.getItem('studio.palette.single-family.v1')),box:b.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1}})
   assert.equal(route.expanded,'true');assert.equal(route.query,'');assert.equal(route.single,c.coarse);assert.ok(route.box.top>=0&&route.box.bottom<=(c.height??800));assert.equal(route.overflow,false)
   if(c.coarse)assert.deepEqual(route.opened,['반복·볼타'])
   fs.writeFileSync(path.join(scene,'command-family-route.json'),JSON.stringify(route,null,2));await capture('command-family-route')
   await key('Tab');await wait(()=>document.activeElement?.textContent.trim()==='반복·볼타 설정 열기')
   const action=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect().top;return{label:n.textContent,disabled:n.disabled,box:r.toJSON(),footer}})
   assert.equal(action.disabled,false);assert.ok(action.box.top>=0&&action.box.bottom<=action.footer,'Tab must reveal the real palette action above the status bar')
   await capture('command-family-action');await key('Enter');await wait(()=>document.activeElement?.matches('.studio-repeat-tools'))
   const guidance=await run(()=>{const root=document.activeElement,description=document.getElementById(root.getAttribute('aria-describedby')),r=description.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect().top;return{text:description.textContent,box:r.toJSON(),footer,repeatDisabled:root.querySelector('[aria-label="반복 횟수"]').disabled,selection:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)}})
   assert.match(guidance.text,/도돌이표와 반복 횟수는 마디를 선택/);assert.match(guidance.text,/볼타는 현재 위치의 마디부터/)
   assert.deepEqual(await run(()=>{const nodes=[...document.querySelectorAll('.studio-repeat-tools [aria-label$="번 볼타"]')];return{count:nodes.length,enabled:nodes.every(n=>!n.disabled)}}),{count:2,enabled:true},'Existing volta scope remains enabled')
   assert.equal(guidance.repeatDisabled,true);assert.ok(guidance.selection.includes('m1-c4'));assert.ok(guidance.box.top>=0&&guidance.box.bottom<=guidance.footer,'Actual disabled-scope guidance must be visible')
   await capture('command-family-guidance')
   await selectRenderedMeasure(original.parts[0].staves[0].measures[0].id);await clickButton('추가');await clickButton('반복·볼타 팔레트')
   await wait(()=>document.activeElement?.closest('[data-family]')?.dataset.family==='반복·볼타');await key('Tab');await wait(()=>document.activeElement?.textContent.trim()==='반복·볼타 설정 열기');await key('Enter')
   await wait(()=>document.activeElement?.matches('input[aria-label="반복 횟수"]'))
   assert.equal(await run(()=>document.activeElement.disabled),false)
   fs.writeFileSync(path.join(scene,'command-family-action.json'),JSON.stringify({action,guidance},null,2));await capture('command-family-editor');assert.deepEqual(await save('search-family'),original)
   records.push({c,commandSearch:true,sourceExact:true,undoOnce:true,disabledMatchesMenu:true,compositionSynthetic:true,nativeKeyboard:true,focus});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));clearTimeout(deadline);win.destroy();continue
  }
  if(geometryErrorVisibilityOnly){
   const source=await save('validation-before'),states=[]
   await clickButton('도구');await clickButton('범위 표기 찾기')
   await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 객체 선택')?.control;if(!n?.checkVisibility())throw Error('Span finder unavailable');n.click()});await settle()
   await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value?.startsWith('hairpin:')&&n.checkVisibility());if(!n)throw Error('Hairpin option unavailable');n.click()});await settle()
   assert.equal(await run(()=>[...document.querySelectorAll('.studio-span-properties__identity .dd-text')].find(n=>n.textContent==='총보·해당 파트보 공통')?.checkVisibility()),true,'The actual scope must be disclosed for a selected score span')
   await clickButton('배치 · 형상')
   for(const width of [207,280,360]){
    await setDockWidth('속성',width)
    const selector='input[aria-label="표기 세로 이동"]'
    await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Geometry field unavailable');n.scrollIntoView({block:'nearest'});n.focus()},selector);await settle()
    await win.webContents.insertText('99');await settle();await key('Enter',[],selector);await settle()
    const geometry=await run(selector=>{
     const input=document.querySelector(selector),error=document.getElementById(input.getAttribute('aria-describedby'))
     const box=node=>node?.getBoundingClientRect().toJSON()
     const visible=node=>{
      if(!node?.checkVisibility())return false
      const r=node.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect()
      if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>Math.min(innerHeight,footer.top))return false
      for(let p=node.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)&&(r.top<b.top||r.bottom>b.bottom))return false}
      return true
     }
     return {input:box(input),error:box(error),inputVisible:visible(input),errorVisible:visible(error),value:input.value,invalid:input.getAttribute('aria-invalid'),description:error?.textContent,fieldFont:getComputedStyle(input).fontSize,errorFont:error?getComputedStyle(error).fontSize:null,focus:document.activeElement.tagName,viewport:[innerWidth,innerHeight],footer:box(document.querySelector('.studio-status')),overflow:document.documentElement.scrollWidth>innerWidth}
    },selector)
    states.push({width,...geometry});fs.writeFileSync(path.join(scene,'validation-geometry.json'),JSON.stringify(states,null,2));await capture('validation-'+width)
    assert.equal(geometry.value,'');assert.equal(geometry.invalid,'true');assert.match(geometry.description,/sp/);assert.equal(await history(),'0회 수정');assert.equal(geometry.overflow,false)
    assert.ok(geometry.inputVisible&&geometry.errorVisible,'The field and linked error must be visible after native Enter: '+JSON.stringify({case:c,width,geometry}))
    if(c.scale===2)assert.ok(parseFloat(geometry.fieldFont)>=28&&parseFloat(geometry.errorFont)>=24,'The error check must actually use enlarged UI text')
   }
   assert.deepEqual(await save('validation-after'),source)
   records.push({...c,scope:'geometry-error-visibility',states,scoreUnchanged:true,zeroCommands:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(saveDocumentOnly){
   await run(()=>{window.confirm=()=>true})
   const baseline=await save('older-baseline'),oldFile=lastProjectSaveFile,oldBytes=fs.readFileSync(oldFile)
   await clickButton('악보로 이동');await key('Up',['alt'],'.notation-event.is-selected');assert.equal(await history(),'1회 수정')
   let release
   const gate={kind:c.operation,promise:new Promise(resolve=>{release=resolve}),entered:false}
   documentSaveGate=gate
   try{
    await click('파일');await clickButton(c.operation==='project'?'프로젝트 저장':'MusicXML로 저장')
    const started=Date.now();while(!gate.entered){assert.ok(Date.now()-started<12000,'Older owned save must reach the deterministic IPC gate');await settle()}
    await wait(()=>document.querySelector('.studio-document__state').textContent==='저장 중')
    const pending=await run(()=>document.querySelector('.editor-status').textContent)
    assert.ok(pending.includes(c.operation==='project'?'프로젝트를 저장하는 중입니다.':'MusicXML을 저장하는 중입니다.'))
    await capture('older-save-pending')
    await clickButton('파일');await clickButton('새 악보 만들기')
    const title='새 악보 '+c.operation+' '+c.outcome
    await run(()=>{const input=[...document.querySelectorAll('.studio-new-score-form input')].find(n=>n.labels?.[0]?.textContent==='제목');if(!input?.checkVisibility()||input.disabled)throw Error('Visible public wizard title required');input.scrollIntoView({block:'nearest'});input.focus();input.select()})
    await ensureNativeFocus();await win.webContents.insertText(title);await settle();await clickButton('만들기')
    const state=()=>run(()=>({header:document.querySelector('.studio-document').textContent,state:document.querySelector('.studio-document__state').textContent,status:document.querySelector('.editor-status').textContent,history:document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0],selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),focus:document.activeElement?.getAttribute('data-event-id'),overflow:document.documentElement.scrollWidth>innerWidth}))
    const created=await state();assert.ok(created.header.includes(title));assert.equal(created.state,'저장하지 않은 변경');assert.ok(!created.status.includes('저장하는 중'));assert.ok(created.status.includes('새 악보를 만들었습니다.'))
    await clickButton('악보로 이동');await key('N');await key('C');await key('N')
    // Expose the real busy File control before returning to the selected score.
    // Observe completion without navigating or refocusing after releasing IPC.
    await click('파일');await clickButton('악보로 이동')
    const before=await state(),counts={requests:documentSaveRequests.length,recent:documentRecentAdds,clears:documentRecoveryClears}
    assert.equal(before.history,'1회 수정');assert.ok(before.selected.includes(before.focus));assert.equal(before.overflow,false)
    await key('S',['control'],'.notation-event.is-selected');assert.equal(documentSaveRequests.length,counts.requests,'The shared write remains busy even though its document has changed')
    await capture('new-document-older-pending')
    release(c.outcome);release=undefined
    // The real File control becomes enabled only after the older operation ends.
    await wait(()=>{const n=document.querySelector('button[aria-label="프로젝트 저장"]');return n?.checkVisibility()&&!n.disabled});await settle()
    const after=await state();assert.equal(after.state,'저장하지 않은 변경');assert.equal(after.history,before.history);assert.deepEqual(after.selected,before.selected);assert.equal(after.status,before.status);assert.ok(after.header.includes(title));assert.equal(after.overflow,false)
    assert.equal(after.focus,before.focus,'Older completion must not steal the new selected score focus')
    assert.equal(documentRecentAdds,counts.recent);assert.equal(documentRecoveryClears,counts.clears)
    assert.equal(documentSaveRequests.length,counts.requests)
    if(c.operation==='project'&&c.outcome==='success'){assert.deepEqual(JSON.parse(fs.readFileSync(oldFile)).score,JSON.parse(gate.contents).score);assert.notDeepEqual(fs.readFileSync(oldFile),oldBytes)}else assert.deepEqual(fs.readFileSync(oldFile),oldBytes)
    if(c.operation==='musicxml'&&c.outcome==='success'){const xml=path.join(scene,documentSaveRequests.at(-1).suggestedName);assert.equal(fs.readFileSync(xml,'utf8'),gate.contents)}
    await capture('new-document-older-completed')
    const requestIndex=documentSaveRequests.length,newScore=await save('new-document')
    assert.equal(newScore.title,title);assert.notEqual(newScore.title,baseline.title)
    const notes=newScore.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note')
    assert.equal(notes.length,1);assert.equal(notes[0].pitch.step,'C');assert.equal(notes[0].pitch.octave,4)
    assert.equal(documentSaveRequests[requestIndex].kind,'project');assert.equal(documentSaveRequests[requestIndex].filePath,undefined,'The old file owner must not be attached to the new document')
    const newFile=lastProjectSaveFile;assert.notEqual(newFile,oldFile);openFile=newFile
    await clickButton('프로젝트 열기');await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음');assert.equal(await history(),'0회 수정')
    assert.deepEqual(await save('new-document-reopened'),newScore)
    const record={...c,created,before,after,requests:documentSaveRequests.slice(requestIndex-1),oldResultIsolated:true,newFile:path.basename(newFile),reopened:true,notes:1}
    fs.writeFileSync(path.join(scene,'save-document.json'),JSON.stringify(record,null,2));records.push(record)
   }finally{release?.('cancel');documentSaveGate=undefined}
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual public menu/wizard/native note input;owned delayed IPC success/failure/cancel;new-document status/history/selection and distinct file/native reopen. Not OS dialogs or physical IME.'},null,2));win.destroy();win=undefined;continue
  }
  if(xmlCopyFeedbackOnly){
   await clickButton('파일');await clickButton('새 악보 만들기')
   await run(()=>{const n=[...document.querySelectorAll('.studio-new-score-form [role="combobox"]')].find(n=>n.labels?.[0]?.textContent==='악보 구성');if(!n?.checkVisibility())throw Error('Visible quartet choice required');n.click()});await settle()
   await run(()=>{const n=document.querySelector('[role="option"][data-value="string-quartet"]');if(!n?.checkVisibility())throw Error('Actual quartet option required');n.click()});await settle()
   await clickButton('만들기');await clickButton('악보로 이동');await key('N');await key('C');await key('N')
   const source=await save('copy-baseline'),primary=path.join(scene,'current.chromatics'),primaryBytes=fs.readFileSync(primary)
   await clickButton('악보로 이동');await key('Up',['alt'],'.notation-event.is-selected')
   const expected=structuredClone(source),note=expected.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='note');assert.equal(note.pitch.step,'C');note.pitch.step='D'
   if(c.copyView==='part'){
    await click('악보')
    const view='.studio-score-view__fields > :first-child [role="combobox"]',part='.studio-score-view__fields > :last-child [role="combobox"]'
    await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Actual view control required');n.scrollIntoView({block:'nearest'});n.focus()},view);await key('Enter',[],view);await key('Down',[],view);await key('Enter',[],view)
    await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Actual part control required');n.scrollIntoView({block:'nearest'});n.focus()},part);await key('Enter',[],part);await key('Home',[],part);await key('Down',[],part);await key('Down',[],part);await key('Enter',[],part)
    assert.equal(await run(selector=>document.querySelector(selector).textContent,part),source.parts[2].name)
   }
   const inspect=()=>run(()=>{const status=document.querySelector('.editor-status'),technical=document.querySelector('.studio-status__technical'),button=technical?.querySelector('button'),content=technical?.querySelector('.studio-warning-technical__content');return{status:status.textContent,state:document.querySelector('.studio-document__state').textContent,history:status.textContent.match(/\d+회 수정/)?.[0],selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),diagnostic:content?.textContent,expanded:button?.getAttribute('aria-expanded'),visible:content?.checkVisibility(),technicalOutsideLive:technical?!status.contains(technical):false,error:!!status.querySelector('.is-error'),button:button?.getBoundingClientRect().toJSON(),footer:document.querySelector('.studio-status').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth}})
   const before=await inspect(),counts={recents:copyRecents,clears:copyRecoveryClears},requestStart=copyExportRequests.length
   const navigation=[]
   const navigateFromReport=async expanded=>{
    if(!xmlCopyNavigationOnly)return
    const selector='.studio-status__technical button',guarded=[]
    for(const variant of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}]){
     await composeKey(selector,'F6',variant,guarded)
     assert.equal(await run(selector=>document.activeElement===document.querySelector(selector),selector),true,'IME/modifier F6 must retain the report control')
    }
    await key('F6',[],selector)
    const returned=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{event:n.getAttribute('data-event-id'),selected:n.matches('.notation-event.is-selected'),box:r.toJSON(),footer:f.toJSON(),viewport:[innerWidth,innerHeight],documentFocused:document.hasFocus()}})
    returned.nativeWindow=win.isFocused();returned.nativeContents=win.webContents.isFocused()
    assert.ok(returned.selected&&before.selected.includes(returned.event)&&returned.documentFocused&&returned.nativeWindow&&returned.nativeContents,'Plain F6 must return from the actual technical control to the selected event')
    assert.ok(returned.box.top>=0&&returned.box.left>=0&&returned.box.right<=returned.viewport[0]&&returned.box.bottom<=Math.min(returned.footer.top,returned.viewport[1]),'Returned score focus must be exposed above the actual error footer')
    const state=await inspect();assert.equal(state.history,before.history);assert.deepEqual(state.selected,before.selected);assert.equal(state.visible,expanded);assert.equal(state.overflow,false);assert.ok(state.status.includes('정지'))
    navigation.push({expanded,guarded,returned});fs.writeFileSync(path.join(scene,'error-navigation.json'),JSON.stringify(navigation,null,2));await capture('error-returned-score-'+(expanded?'expanded':'collapsed'))
    await key('F6',[],'.notation-event.is-selected');assert.equal(await run(()=>document.activeElement.matches('.studio-score-navigation')),true)
    await key('F6',[],'.studio-score-navigation');assert.equal(await run(()=>document.activeElement.matches('.notation-event.is-selected')),true)
    // Start the other report state through its actual visible control. This is
    // not a claim that F6 or Tab navigates back to the report automatically.
    await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()});await settle()
   }
   let failureStart
   rejectCopyExport=true;await click('내보내기')
   if(xmlCopyFocusOnly){
    // The 960px fine score fixture reproduces a growing-footer boundary.
    // Other layouts can naturally place this control too high in the document
    // to scroll it down to that boundary; retain their ordinary visible start.
    const boundary=c.width===960&&c.scale===1&&c.copyView==='score'
    await run(boundary=>{const n=document.querySelector('button[aria-label="MusicXML 내보내기"]');n.scrollIntoView({block:'center'});n.focus({preventScroll:true});if(boundary){const b=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();window.scrollBy(0,b.bottom-f.top+12)}},boundary);await settle()
    failureStart=await run(()=>({box:document.activeElement.getBoundingClientRect().toJSON(),footer:document.querySelector('.studio-status').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]}));failureStart.boundary=boundary
    assert.ok(failureStart.box.top>=0&&failureStart.box.bottom<=failureStart.footer.top-4,'The start control must be fully visible before activation')
    if(boundary)assert.ok(failureStart.box.bottom>=failureStart.footer.top-24,'The mandatory growing-footer fixture must start at its actual boundary')
    await key('Enter',[],'button[aria-label="MusicXML 내보내기"]')
   }else await clickButton('MusicXML 내보내기')
   await wait(()=>!document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled&&((document.querySelector('.editor-status').textContent+document.querySelector('.studio-status__technical')?.textContent).includes('QA XML copy unavailable')))
   if(xmlCopyFocusOnly)await settle()
   const failed=await inspect();fs.writeFileSync(path.join(scene,'xml-copy-current.json'),JSON.stringify(failed,null,2));await capture('xml-copy-failure')
   if(xmlCopyFocusOnly){const owner=await run(()=>({label:document.activeElement.getAttribute('aria-label'),tag:document.activeElement.tagName,restored:document.activeElement===document.querySelector('button[aria-label="MusicXML 내보내기"]'),box:document.activeElement.getBoundingClientRect().toJSON(),footer:document.querySelector('.studio-status').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]}));fs.writeFileSync(path.join(scene,'copy-failure-focus.json'),JSON.stringify({failureStart,owner},null,2));assert.equal(owner.restored,true,'A failed copy must return to its owned enabled control');assert.ok(owner.box.top>=0&&owner.box.bottom<=Math.min(owner.footer.top,owner.viewport[1]),'A restored failure control must remain exposed when its actual footer grows')}
   assert.ok(failed.status.includes('MusicXML 사본 내보내기를 마무리하지 못했습니다.'),'Copy errors need an actionable Korean summary');assert.ok(!failed.status.includes('QA XML copy unavailable')&&!failed.status.includes(scene));assert.equal(failed.expanded,'false');assert.equal(failed.visible,false);assert.equal(failed.technicalOutsideLive,true);assert.ok(failed.diagnostic.includes('QA XML copy unavailable'));assert.equal(failed.state,'저장하지 않은 변경');assert.equal(failed.history,before.history);assert.deepEqual(failed.selected,before.selected);assert.equal(failed.overflow,false);assert.deepEqual(fs.readFileSync(primary),primaryBytes)
   await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()});await key('Enter',[],'.studio-status__technical button')
   const opened=await inspect();assert.equal(opened.visible,true);assert.ok(opened.button.height>=(c.coarse?48:32));assert.ok(opened.button.top>=opened.footer.top&&opened.button.bottom<=Math.min(opened.footer.bottom,opened.viewport[1]));await capture('xml-copy-technical')
   await navigateFromReport(true)
   await key('Space',[],'.studio-status__technical button');assert.equal((await inspect()).visible,false);assert.ok((await inspect()).status.includes('정지'));await navigateFromReport(false)
   cancelCopyExport=true;await clickButton('MusicXML 내보내기');await wait(()=>!document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled)
   const cancelled=await inspect();assert.equal(cancelled.status,failed.status);assert.equal(cancelled.diagnostic,failed.diagnostic);assert.ok(!fs.existsSync(path.join(scene,'export-copy.musicxml')))
   if(xmlCopyFocusOnly)assert.equal(await run(()=>document.activeElement===document.querySelector('button[aria-label="MusicXML 내보내기"]')),true,'A cancelled copy must return to its owned enabled control')
   let releaseCopy,progress,focusReturn
   if(xmlCopyProgressOnly||xmlCopyFocusOnly)copyExportBarrier=new Promise(resolve=>{releaseCopy=resolve})
   try{
    if(xmlCopyFocusOnly){await run(()=>{const n=document.querySelector('button[aria-label="MusicXML 내보내기"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'button[aria-label="MusicXML 내보내기"]')}
    else await clickButton('MusicXML 내보내기')
    if(xmlCopyFocusOnly){
     await wait(()=>document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled)
     const pending=await run(()=>({tag:document.activeElement.tagName,state:document.querySelector('.studio-document__state').textContent,status:document.querySelector('.editor-status').textContent}));assert.equal(pending.tag,'BODY');await capture('copy-keyboard-busy')
     releaseCopy();releaseCopy=undefined
     await wait(()=>!document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled);await settle()
     const returned=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{tag:n.tagName,label:n.getAttribute('aria-label'),restored:n===document.querySelector('button[aria-label="MusicXML 내보내기"]'),box:r.toJSON(),footer:f.toJSON(),viewport:[innerWidth,innerHeight],focused:document.hasFocus()}})
     fs.writeFileSync(path.join(scene,'copy-keyboard-return.json'),JSON.stringify({pending,returned},null,2));await capture('copy-keyboard-completed')
     assert.ok(returned.restored&&returned.focused&&win.isFocused()&&win.webContents.isFocused(),'Completion without a newer owner must restore the original live copy button')
     assert.ok(returned.box.top>=0&&returned.box.left>=0&&returned.box.right<=returned.viewport[0]&&returned.box.bottom<=Math.min(returned.footer.top,returned.viewport[1]),'Restored copy control must be exposed above the footer')
     focusReturn={pending,returned,failureStart,cancelAndFailureReturned:true}
    }
    if(xmlCopyProgressOnly){
     await wait(()=>document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled)
     const pending=await inspect(),focus=await run(()=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label')}))
     fs.writeFileSync(path.join(scene,'copy-progress-current.json'),JSON.stringify({pending,focus},null,2));await capture('copy-retry-pending')
     assert.ok(pending.status.includes('MusicXML 사본을 내보내는 중입니다.'),'Owned copy retry must be distinguishable from its previous failure');assert.ok(!pending.status.includes('마무리하지 못했습니다.'));assert.equal(pending.diagnostic,undefined);assert.equal(pending.error,false);assert.equal(pending.overflow,false);assert.equal(pending.state,'저장하지 않은 변경');assert.equal(pending.history,before.history);assert.deepEqual(pending.selected,before.selected)
     rejectNextSave=true;await click('파일');await clickButton('프로젝트 저장')
     await wait(()=>document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'))
     const newerFailure=await inspect();assert.ok(!newerFailure.status.includes('내보내는 중'));assert.equal(newerFailure.error,true);assert.ok(newerFailure.diagnostic.includes('QA disk unavailable'));assert.deepEqual(fs.readFileSync(primary),primaryBytes);await capture('copy-pending-newer-project-error')
     await clickButton('악보로 이동')
     const nextOwner=await run(()=>document.activeElement.getAttribute('data-event-id'));assert.ok(before.selected.includes(nextOwner))
     progress={pending,focus,newerFailure,nextOwner,newerErrorShown:true}
     releaseCopy();releaseCopy=undefined
    }
    await wait(()=>document.querySelector('.editor-status').textContent.includes('export-copy.musicxml로 MusicXML을 내보냈습니다.'))
    if(progress){const owner=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{event:n.getAttribute('data-event-id'),box:r.toJSON(),footer:f.toJSON(),viewport:[innerWidth,innerHeight]}});assert.equal(owner.event,progress.nextOwner);assert.ok(owner.box.top>=0&&owner.box.bottom<=Math.min(owner.footer.top,owner.viewport[1]));progress.completedOwner=owner;await capture('copy-completed-new-owner')}
   }finally{releaseCopy?.();copyExportBarrier=undefined}
   const completed=await inspect();assert.equal(completed.state,'저장하지 않은 변경');assert.equal(completed.history,before.history);assert.deepEqual(completed.selected,before.selected);assert.equal(completed.diagnostic,undefined);assert.equal(copyRecents,counts.recents);assert.equal(copyRecoveryClears,counts.clears);assert.deepEqual(fs.readFileSync(primary),primaryBytes)
   const requests=copyExportRequests.slice(requestStart);assert.equal(requests.length,3);assert.ok(requests.every(xml=>xml===requests[0]));const xml=fs.readFileSync(path.join(scene,'export-copy.musicxml'),'utf8');assert.equal(xml,requests[0]);assert.equal((xml.match(/<score-part\b/g)||[]).length,c.copyView==='part'?1:4)
   if(c.copyView==='part'){assert.ok(xml.includes('<part-name>Viola</part-name>'));assert.ok(!xml.includes('<part-name>Violin I</part-name>'))}
   const saved=await save('copy-primary-after');assert.deepEqual(saved,expected);assert.equal(copyProjectRequests.at(-1).filePath,primary)
   openFile=path.join(scene,'copy-primary-after.chromatics');await clickButton('프로젝트 열기');await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음');assert.deepEqual(await save('copy-primary-reopened'),expected)
   const record={...c,before,failed,opened,cancelled,completed,navigation,progress,focusReturn,fullSourceParts:saved.parts.length,copyParts:c.copyView==='part'?1:4,primaryAssociationPreserved:true,nativeReopen:true};fs.writeFileSync(path.join(scene,'xml-copy-feedback.json'),JSON.stringify(record,null,2));records.push(record)
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual quartet and native part-view selection/export IPC with injected failure/cancel/retry;primary bytes and dirty/history/selection/source association preserved;native reopen. Not OS dialogs or external app.'},null,2));win.destroy();win=undefined;continue
  }
  if(xmlSaveFeedbackOnly){
   const requestStart=xmlFeedbackRequests.length
   await click('파일');await clickButton('MusicXML로 저장');await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음')
   const originalBytes=fs.readFileSync(path.join(scene,'output.musicxml'))
   await clickButton('악보로 이동');await key('Up',['alt'],'.notation-event.is-selected');assert.equal(await history(),'1회 수정')
   const selected=await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId))
   rejectXmlStage=c.xmlFailureStage
   await click('파일');await run(()=>{const n=document.querySelector('button[aria-label="MusicXML로 저장"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'button[aria-label="MusicXML로 저장"]')
   const diagnostic=c.xmlFailureStage==='disk'?'QA XML disk unavailable':c.xmlFailureStage==='recovery'?'QA recovery unavailable':'QA recent unavailable'
   await wait(needle=>document.querySelector('.studio-document__state').textContent!=='저장 중'&&((document.querySelector('.editor-status').textContent+document.querySelector('.studio-status__technical')?.textContent).includes(needle)),diagnostic)
   const inspect=()=>run(()=>{const status=document.querySelector('.editor-status'),technical=document.querySelector('.studio-status__technical'),button=technical?.querySelector('button'),content=technical?.querySelector('.studio-warning-technical__content');return{state:document.querySelector('.studio-document__state').textContent,status:status.textContent,diagnostic:content?.textContent,expanded:button?.getAttribute('aria-expanded'),visible:content?.checkVisibility(),button:button?.getBoundingClientRect().toJSON(),footer:document.querySelector('.studio-status').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],technicalOutsideLive:technical?!status.contains(technical):false,history:status.textContent.match(/\d+회 수정/)?.[0],selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),overflow:document.documentElement.scrollWidth>innerWidth}})
   const failed=await inspect();fs.writeFileSync(path.join(scene,'xml-failure-current.json'),JSON.stringify(failed,null,2));await capture('xml-save-failure')
   const saveFocus=await run(()=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),restored:document.activeElement===document.querySelector('button[aria-label="MusicXML로 저장"]')}));fs.writeFileSync(path.join(scene,'xml-save-failure-focus.json'),JSON.stringify(saveFocus,null,2));assert.equal(saveFocus.restored,true,'XML save failure must return to its owned enabled control')
   const summary=c.xmlFailureStage==='disk'?'MusicXML 저장을 마무리하지 못했습니다.':c.xmlFailureStage==='recovery'?'MusicXML 파일은 저장했지만 자동저장 복구본을 정리하지 못했습니다.':'MusicXML 파일은 저장했지만 최근 악보 목록을 갱신하지 못했습니다.'
   assert.ok(failed.status.includes(summary),'Visible summary must describe the actual save stage in Korean');assert.ok(!failed.status.includes(diagnostic));assert.ok(!failed.status.includes(scene));assert.equal(failed.expanded,'false');assert.equal(failed.visible,false);assert.equal(failed.technicalOutsideLive,true);assert.ok(failed.diagnostic.includes(diagnostic));assert.ok(failed.diagnostic.includes(scene));assert.equal(failed.history,'1회 수정');assert.deepEqual(failed.selected,selected);assert.equal(failed.state,c.xmlFailureStage==='recent'?'변경 없음':'저장하지 않은 변경');assert.equal(failed.overflow,false)
   const failedBytes=fs.readFileSync(path.join(scene,'output.musicxml'))
   if(c.xmlFailureStage==='disk')assert.deepEqual(failedBytes,originalBytes);else assert.notDeepEqual(failedBytes,originalBytes)
   await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()})
   await key('Enter',[],'.studio-status__technical button');const opened=await inspect();assert.equal(opened.visible,true);assert.equal(opened.overflow,false);assert.ok(opened.button.height>=(c.coarse?48:32));assert.ok(opened.button.top>=opened.footer.top&&opened.button.bottom<=Math.min(opened.footer.bottom,opened.viewport[1]),'Focused technical disclosure must remain inside its actual footer scrollport');await capture('xml-save-technical')
   await key('Space',[],'.studio-status__technical button');assert.equal((await inspect()).visible,false)
   assert.ok((await inspect()).status.includes('정지'));assert.equal(await history(),'1회 수정')
   cancelNextXmlSave=true;await clickButton('MusicXML로 저장');await wait(()=>!document.querySelector('button[aria-label="MusicXML로 저장"]').disabled)
   const cancelled=await inspect();assert.equal(cancelled.status,failed.status);assert.equal(cancelled.diagnostic,failed.diagnostic);assert.equal(cancelled.state,failed.state);assert.deepEqual(fs.readFileSync(path.join(scene,'output.musicxml')),failedBytes)
   await clickButton('MusicXML로 저장');await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음')
   const retried=await inspect();assert.ok(retried.status.includes('output.musicxml'));assert.equal(retried.diagnostic,undefined);assert.equal(retried.history,'1회 수정');assert.deepEqual(retried.selected,selected)
   const requests=xmlFeedbackRequests.slice(requestStart);assert.equal(requests.length,4);for(const contents of requests.slice(1))assert.equal(contents,requests[1],'Failure/cancel/retry must serialize the same score')
   const native=await save('xml-feedback-native');openFile=path.join(scene,'xml-feedback-native.chromatics');await clickButton('프로젝트 열기');await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음');assert.deepEqual(await save('xml-feedback-reopened'),native)
   const record={...c,failed,opened,cancelled,retried,nativeReopen:true,identicalRetryPayload:true};fs.writeFileSync(path.join(scene,'xml-save-feedback.json'),JSON.stringify(record,null,2));records.push(record)
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual owned XML write/recovery/recent failures;localized default and public technical disclosure/native keys/cancel-retry/native reopen. Not OS dialogs or physical IME.'},null,2));win.destroy();win=undefined;continue
  }
  if(mixerEnsembleOnly){
   if(mixerSaveOnly)projectSaveBase='Studio-'+('score-workspace-'.repeat(10))+'practice.chromatics'
   console.log(step+':create-quartet')
   await clickButton('파일');await clickButton('새 악보 만들기')
   await run(()=>{const trigger=[...document.querySelectorAll('.studio-new-score-form [role="combobox"]')].find(n=>n.labels?.[0]?.textContent==='악보 구성');if(!trigger?.checkVisibility())throw Error('Visible score structure Select required');trigger.click()})
   await settle()
   await run(()=>{const option=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value==='string-quartet'&&n.checkVisibility());if(!option)throw Error('Actual quartet option required');option.click()})
   await settle();await clickButton('만들기');await clickButton('악보로 이동');await key('N');await key('C');await key('N')
   let source=await save('ensemble-source'),reopenSource='ensemble-source.chromatics'
   assert.equal(source.parts.length,4);assert.equal(source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note').length,1)
   if(mixerSaveOnly){await clickButton('악보로 이동');await key('Up',['alt'],'.notation-event.is-selected');assert.equal(await history(),'2회 수정');assert.equal(await run(()=>document.querySelector('.studio-document__state').textContent),'저장하지 않은 변경')}
   const original=await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),events:document.querySelectorAll('.notation-event').length,history:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent?.endsWith('회 수정'))?.textContent}))
   await clickButton('도구');await clickButton('재생 도구');await ensureNativeFocus()
   const entry=await inspectMixerFocus();assert.equal(entry.index,2,'Existing entry must focus the first actual volume control');assert.equal(entry.coarse,c.coarse);assert.equal(entry.theme,c.theme)
   assert.ok(entry.stable&&entry.visible&&entry.ownerVisible&&entry.focused&&entry.nativeWindow&&entry.nativeContents,'Opening the mixer must expose the first volume and its label')
   const controls=[],navigation=[]
   await key('Tab',['shift'],'.studio-part-mixer input[type="range"]');await key('Tab',['shift'],'.studio-part-mixer input')
   for(let index=0;index<12;index++){
    const state=await inspectMixerFocus();controls.push(state)
    fs.writeFileSync(path.join(scene,'ensemble-focus.json'),JSON.stringify({entry,controls},null,2))
    assert.equal(state.index,index);assert.equal(state.controls,12);assert.ok(state.stable&&state.visible&&state.ownerVisible&&state.focused&&state.nativeWindow&&state.nativeContents,'Every focused quartet field and its full public label/touch target must be visible above the footer')
    if(state.type==='range'){await key('Left',[],'.studio-part-mixer input:focus');assert.equal(await run(()=>document.activeElement.getAttribute('aria-valuetext')),(Number(state.value)-5)+'%');await key('Right',[],'.studio-part-mixer input:focus');assert.equal(await run(()=>document.activeElement.getAttribute('aria-valuetext')),state.value+'%')}
    else{await key('Space',[],'.studio-part-mixer input:focus');assert.equal(await run(()=>document.activeElement.checked),true);await key('Space',[],'.studio-part-mixer input:focus');assert.equal(await run(()=>document.activeElement.checked),false)}
    if(mixerNavigationOnly&&(index===0||index===2)){
     const guarded=[]
     for(const variant of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}]){
      await composeKey('.studio-part-mixer input:focus','F6',variant,guarded)
      assert.equal((await inspectMixerFocus()).index,index,'IME and modified F6 must retain the current mixer owner')
     }
     await key('F6',[],'.studio-part-mixer input:focus')
     const returned=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{event:n.getAttribute('data-event-id'),selected:n.matches('.notation-event.is-selected'),box:r.toJSON(),footer:footer.toJSON(),documentFocused:document.hasFocus(),viewport:[innerWidth,innerHeight]}})
     navigation.push({index,type:state.type,guarded,returned});fs.writeFileSync(path.join(scene,'mixer-navigation.json'),JSON.stringify(navigation,null,2))
     assert.ok(returned.selected&&original.selected.includes(returned.event)&&returned.documentFocused,'F6 must return from the actual mixer field to the selected score event')
     assert.ok(returned.box.top>=0&&returned.box.bottom<=Math.min(returned.footer.top,returned.viewport[1]),'F6 score target must be visible above the sticky footer')
     await capture('navigation-score-'+state.type)
     await key('F6',[],'.notation-event.is-selected');assert.equal(await run(()=>document.activeElement.matches('.studio-score-navigation')),true)
     await key('F6',[],'.studio-score-navigation');assert.equal(await run(()=>document.activeElement.matches('.notation-event.is-selected')),true)
     await clickButton('도구');await clickButton('재생 도구');await ensureNativeFocus()
     if(index===0){await key('Tab',['shift'],'.studio-part-mixer input[type="range"]');await key('Tab',['shift'],'.studio-part-mixer input')}
     assert.equal((await inspectMixerFocus()).index,index)
    }
    if(index<11)await key('Tab',[],'.studio-part-mixer input:focus')
   }
   assert.deepEqual(await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),events:document.querySelectorAll('.notation-event').length,history:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent?.endsWith('회 수정'))?.textContent})),original)
   await capture('ensemble-last-field')
   // Keep one local volume change through project reopen. It is not score data.
   await key('Left',[],'.studio-part-mixer input[type="range"]:focus')
   const preferences=await run(()=>localStorage.getItem('chromatics.part-mixer.v1'))
   let saving
   if(mixerSaveOnly){
    const documentState=()=>run(()=>({state:document.querySelector('.studio-document__state').textContent,
     history:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent.endsWith('회 수정'))?.textContent,
     selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),
     status:document.querySelector('.editor-status').textContent,footer:document.querySelector('.studio-status').getBoundingClientRect().toJSON(),
     error:!!document.querySelector('.studio-status .is-error'),technical:!!document.querySelector('.studio-status__technical'),
     viewport:[innerWidth,innerHeight],footerClient:document.querySelector('.studio-status').clientHeight,footerScroll:document.querySelector('.studio-status').scrollHeight,
     overflow:document.documentElement.scrollWidth>innerWidth}))
    const before=await documentState(),diskBefore=fs.readFileSync(lastProjectSaveFile),counts={requests:saveCount,writes:projectWriteCount,xml:xmlSaveCount}
    const failure=[]
    for(const kind of ['disk','recent']){
     if(kind==='disk')rejectNextSave=true;else rejectNextRecentAdd=true
     await key('S',['control'],'.studio-part-mixer input:focus')
     if(kind==='recent'){const started=Date.now();while(projectWriteCount===counts.writes){assert.ok(Date.now()-started<12000);await settle()}}
     await wait(()=>document.querySelector('.studio-document__state').textContent!=='저장 중'&&document.querySelector('.editor-status').textContent.includes('프로젝트 저장을 마무리하지 못했습니다.'))
     const state=await documentState(),owner=await inspectMixerFocus()
     assert.equal(state.state,'저장하지 않은 변경');assert.equal(state.history,before.history);assert.deepEqual(state.selected,before.selected)
     assert.equal(owner.index,11);assert.ok(owner.visible&&owner.ownerVisible&&owner.stable&&owner.focused)
     if(kind==='disk'){assert.equal(projectWriteCount,counts.writes);assert.deepEqual(fs.readFileSync(lastProjectSaveFile),diskBefore)}
     else{assert.equal(projectWriteCount,counts.writes+1);assert.deepEqual(JSON.parse(fs.readFileSync(lastProjectSaveFile)).score,JSON.parse(failedProjectContents).score)}
     failure.push({kind,state,owner,writes:projectWriteCount-counts.writes});await capture('save-failure-'+kind)
    }
    const failedScore=JSON.parse(failedProjectContents).score,notes=failedScore.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).filter(e=>e.type==='note')
    assert.equal(notes.length,1);assert.equal(notes[0].pitch.step,'D');assert.equal(notes[0].pitch.octave,4)
    let release
    projectSaveBarrier=new Promise(resolve=>{release=resolve})
    try{
     await key('S',['control'],'.studio-part-mixer input:focus')
     const busy=await documentState();assert.equal(busy.state,'저장 중');assert.equal(saveCount,counts.requests+3);assert.equal(projectWriteCount,counts.writes+1)
     await key('S',['control'],'.studio-part-mixer input:focus');assert.equal(saveCount,counts.requests+3,'Busy keyboard saves must not enqueue another write')
     const busyOwner=await inspectMixerFocus();assert.ok(busyOwner.visible&&busyOwner.ownerVisible&&busyOwner.index===11)
     await capture('save-retry-pending')
     fs.writeFileSync(path.join(scene,'save-progress-current.json'),JSON.stringify({busy,busyOwner},null,2))
     if(saveProgressOnly){assert.ok(busy.status.includes('프로젝트를 저장하는 중입니다.'),'Current viewport must show the owned pending operation');assert.ok(!busy.status.includes('프로젝트 저장을 마무리하지 못했습니다.'),'Previous failure must not masquerade as the current pending state');assert.equal(busy.error,false);assert.equal(busy.technical,false)}
     await key('Left',[],'.studio-part-mixer input:focus');await key('Right',[],'.studio-part-mixer input:focus')
     await key('F6',[],'.studio-part-mixer input:focus')
     const newOwner=await run(()=>document.activeElement.getAttribute('data-event-id'));assert.ok(before.selected.includes(newOwner))
     release();release=undefined
     await wait(()=>document.querySelector('.studio-document__state').textContent==='변경 없음');await settle()
     const completed=await documentState(),completedFocus=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{id:n.getAttribute('data-event-id'),selected:n.matches('.notation-event.is-selected'),box:r.toJSON(),footer:f.toJSON()}})
     assert.equal(completedFocus.id,newOwner);assert.equal(completedFocus.selected,true);assert.ok(completedFocus.box.top>=0&&completedFocus.box.bottom<=completedFocus.footer.top,'Late save result must expose the newer score owner')
     assert.equal(completed.history,before.history);assert.deepEqual(completed.selected,before.selected);assert.equal(completed.overflow,false)
     assert.ok(completed.footer.height<=completed.viewport[1]*.4+1,'Long status must keep its bounded scroll surface')
     assert.ok(completed.status.includes(projectSaveBase));assert.equal(saveCount,counts.requests+3);assert.equal(projectWriteCount,counts.writes+2);assert.equal(xmlSaveCount,counts.xml)
     source=JSON.parse(fs.readFileSync(lastProjectSaveFile)).score;assert.deepEqual(source,failedScore)
     reopenSource='ensemble-key-saved.chromatics';fs.copyFileSync(lastProjectSaveFile,path.join(scene,reopenSource))
     saving={before,failure,busy,busyOwner,completed,completedFocus,nativeRequests:3,nativeWrites:2,duplicateSuppressed:true,filename:projectSaveBase,newOwnerPreserved:true}
     fs.writeFileSync(path.join(scene,'mixer-save.json'),JSON.stringify(saving,null,2));await capture('save-retry-completed')
    }finally{release?.();projectSaveBarrier=undefined}
   }
   await run(()=>{const n=document.querySelector('.studio-playback [aria-label="재생"]');n.scrollIntoView({block:'center'});n.focus()});await key('Space',[],'.studio-playback [aria-label="재생"]')
   await wait(()=>document.querySelector('.studio-playback [aria-label="재생"]').disabled)
   await clickButton('도구');await clickButton('재생 도구')
   const playing=await inspectMixerFocus();assert.ok(playing.visible&&playing.ownerVisible&&playing.stable&&playing.focused)
   await key('Left',[],'.studio-part-mixer input[type="range"]:focus');await key('Right',[],'.studio-part-mixer input[type="range"]:focus')
   await run(()=>{const n=document.querySelector('.studio-playback [aria-label="정지"]');n.scrollIntoView({block:'center'});n.focus()});await key('Space',[],'.studio-playback [aria-label="정지"]')
   assert.deepEqual(await save('ensemble-before-reopen'),source)
   const restoredPreferences=await run(()=>({open:localStorage.getItem('studio.mixer-open.v1'),mixer:localStorage.getItem('chromatics.part-mixer.v1')}))
   assert.equal(restoredPreferences.open,'true');assert.equal(restoredPreferences.mixer,preferences)
   await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.webContents.reload()})
   await run(scale=>{window.__systemTextScale=scale},c.scale);await settle()
   const restoredOpen=await run(()=>({open:document.querySelector('.studio-playback [aria-label="믹서 표시"]').getAttribute('aria-expanded'),visible:document.querySelector('.studio-part-mixer').checkVisibility(),focus:document.activeElement?.tagName}))
   assert.equal(restoredOpen.open,'true');assert.equal(restoredOpen.visible,true)
   openFile=path.join(scene,reopenSource);await click('파일');await click('프로젝트 열기');await settle()
   assert.deepEqual(await save('ensemble-reopened'),source);assert.equal(await history(),'0회 수정')
   assert.deepEqual(await run(()=>({open:localStorage.getItem('studio.mixer-open.v1'),mixer:localStorage.getItem('chromatics.part-mixer.v1')})),restoredPreferences)
   await clickButton('도구');await clickButton('재생 도구');const reopened=await inspectMixerFocus();assert.ok(reopened.visible&&reopened.ownerVisible&&reopened.stable&&reopened.focused&&reopened.controls===12)
   assert.equal(reopened.coarse,c.coarse);assert.equal(reopened.theme,c.theme);assert.equal(reopened.labelFont,entry.labelFont,'Reload must retain the actual text-size test condition')
   await capture('ensemble-reopened')
   records.push({...c,scope:'mixer-ensemble',entry,controls,navigation,saving,playing,restoredOpen,reopened,nativeScorePreserved:true,preferencesPreserved:true,listeningVerified:false})
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(mixerViewportOnly){
   const routes=[]
   const original=await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),events:document.querySelectorAll('.notation-event').length,history:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent?.endsWith('회 수정'))?.textContent}))
   for(const route of ['tools','view','toolbar']){
    if(await run(()=>document.querySelector('.studio-playback [aria-label="믹서 표시"]').getAttribute('aria-expanded')==='true'))await clickButton('믹서 표시')
    if(route==='tools'){await clickButton('도구');await clickButton('재생 도구')}
    else if(route==='view'){await clickButton('보기');await clickButton('믹서')}
    else{
     await run(()=>{const n=document.querySelector('.studio-playback [aria-label="믹서 표시"]');n.scrollIntoView({block:'center'});n.focus()})
     await key('Space',[],'.studio-playback [aria-label="믹서 표시"]')
    }
    await ensureNativeFocus();await settle()
    const observation={...await mixerViewport(route),nativeWindow:win.isFocused(),nativeContents:win.webContents.isFocused()}
    if(observation.fieldsVisible&&observation.frames.at(-1).fields.find(n=>n.type==='range')?.focused){
     await key('Left',[],'.studio-part-mixer input[type="range"]')
     assert.equal(await run(()=>document.querySelector('.studio-part-mixer input[type="range"]').getAttribute('aria-valuetext')),'95%')
     assert.equal(await run(()=>JSON.parse(localStorage.getItem('chromatics.part-mixer.v1'))['part-1'].volume),.95)
     await key('Right',[],'.studio-part-mixer input[type="range"]')
     assert.equal(await run(()=>document.querySelector('.studio-part-mixer input[type="range"]').getAttribute('aria-valuetext')),'100%')
     observation.nativeVolumeKeys=true
     if(route==='toolbar'&&c.width===1280){
      win.setContentSize(960,750);await settle();observation.resized=await mixerViewport('toolbar-resize')
      win.setContentSize(c.width,c.height);await settle()
     }
    }
    routes.push(observation);fs.writeFileSync(path.join(scene,'mixer-viewport.json'),JSON.stringify(routes,null,2));await capture('mixer-'+route)
    assert.deepEqual(await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),events:document.querySelectorAll('.notation-event').length,history:[...document.querySelectorAll('.editor-status span')].find(n=>n.textContent?.endsWith('회 수정'))?.textContent})),original)
   }
   clearTimeout(deadline);records.push({...c,routes});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();continue
  }
  if(pdfEntryFocusOnly){
   const observations=[]
   await run(()=>{window.__pdfEntryFocusEvents=[];document.addEventListener('focusin',event=>{const n=event.target;if(n?.labels?.[0]?.textContent==='PDF 설정 프리셋')window.__pdfEntryFocusEvents.push({font:getComputedStyle(n).fontSize,box:n.getBoundingClientRect().toJSON()})},true)})
   const original=await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),history:document.querySelector('.editor-status').textContent,playing:document.querySelector('.studio-playback').textContent}))
   for(const [menu,command] of [['파일','내보내기 설정'],['형식','PDF 페이지 설정']]){
    await clickButton(menu);await clickButton(command)
    const observation=await run(()=>{
     const n=[...document.querySelectorAll('.studio-page-setup [role="combobox"]')].find(n=>n.labels?.[0]?.textContent==='PDF 설정 프리셋'),b=n?.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect()
     return{focus:n===document.activeElement,visible:n?.checkVisibility(),disabled:n?.disabled,name:n?.labels?.[0]?.textContent,common:n?.matches('.dd-select'),font:n?getComputedStyle(n).fontSize:null,focusEvent:window.__pdfEntryFocusEvents.at(-1),box:b?.toJSON(),limit:Math.min(innerHeight,footer.top),viewport:[innerWidth,innerHeight],active:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent}
    });observations.push({menu,command,...observation});fs.writeFileSync(path.join(scene,'pdf-entry-focus.json'),JSON.stringify(observations,null,2))
    assert.equal(observation.focus,true,'The live public PDF preset must receive focus from '+menu)
    assert.equal(observation.visible,true);assert.equal(observation.disabled,false);assert.equal(observation.common,true)
    assert.equal(observation.focusEvent?.font,observation.font,'Text scale must be applied before the actual focus event')
    assert.ok(observation.box.left>=0&&observation.box.right<=c.width&&observation.box.top>=0&&observation.box.bottom<=observation.limit,'PDF preset focus must remain above the sticky footer')
    await capture('pdf-entry-'+menu)
    const selector='.studio-page-setup [role="combobox"]'
    await key('Down',[],selector);assert.equal(await run(()=>document.querySelector('.studio-page-setup [role="combobox"]').getAttribute('aria-expanded')),'true')
    await key('Escape',[],selector);assert.equal(await run(()=>document.querySelector('.studio-page-setup [role="combobox"]').getAttribute('aria-expanded')),'false')
    assert.deepEqual(await run(()=>({selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),history:document.querySelector('.editor-status').textContent,playing:document.querySelector('.studio-playback').textContent})),original)
   }
   clearTimeout(deadline);records.push({...c,entries:observations.length});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();continue
  }
  if(visibleSystemAudit){
   await auditVisibleSystem('initial')
   for(const menu of ['파일','편집','보기','추가','형식','도구','도움말']){await clickButton(menu);await auditVisibleSystem('menu-'+menu);await clickButton(menu)}
   for(const [name,menu,entry] of [['file','파일','파일 작업 열기'],['export','파일','내보내기 설정'],['score','형식','악보 설정'],['properties','도구','선택 속성 열기'],['palette','추가','표기 팔레트 열기'],['lyrics','추가','가사 및 코드']]){
    await clickButton(menu);await clickButton(entry);await auditVisibleSystem(name)
   }
   await clickButton('보기');await clickButton('믹서');await auditVisibleSystem('mixer')
   await clickButton('악보 정보');await auditVisibleSystem('metadata');await clickButton('악보 정보')
   await clickButton('도움말');await clickButton('단축키 도움말');await auditVisibleSystem('help');await clickButton('닫기')
   await clickButton('파일');await clickButton('새 악보 만들기');await auditVisibleSystem('wizard');await clickButton('취소')
   clearTimeout(deadline);records.push({...c,visibleSurfaceStates:18,mutations:0});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Visible public composition/computed paint audit;not OS,physical input oroutput QA'},null,2));win.destroy();continue
  }
  if(projectOpenFeedbackOnly){
   const source=await save('open-before'),original=path.join(scene,'open-before.chromatics'),savedBytes=fs.readFileSync(path.join(scene,'current.chromatics'))
   await run(()=>{window.confirm=()=>true})
   await click('음표')
   const field='input[aria-label="선택 요약 보표 글자"]'
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual text field required');n.scrollIntoView({block:'nearest'});n.focus();n.select()});await win.webContents.insertText('open kept');await key('Enter',[],field)
   const expected=structuredClone(source);expected.staffTexts.find(n=>n.measureId==='measure-1').text='open kept'
   const selection=await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId))
   assert.equal(await history(),'1회 수정')
   const observations=[]
   const inspect=async(summary,diagnostic)=>{
    await wait(({summary,diagnostic})=>document.querySelector('.editor-status').textContent.includes(summary)&&document.querySelector('.studio-status__technical')?.textContent.includes(diagnostic),{summary,diagnostic})
    assert.doesNotMatch(await run(()=>document.querySelector('.editor-status').textContent),/QA read unavailable|QA recent unavailable|Invalid Chromatics project JSON/)
    const selector='.studio-status__technical button'
    const before=await run(()=>{const root=document.querySelector('.studio-status__technical'),group=root.querySelector('[role="group"]'),button=root.querySelector('button');return{label:group.getAttribute('aria-label'),expanded:button.getAttribute('aria-expanded'),outside:!document.querySelector('.editor-status').contains(root)}})
    assert.equal(before.label,'프로젝트 열기 기술 정보');assert.equal(before.expanded,'false');assert.equal(before.outside,true)
    await run(()=>{const n=document.querySelector('.studio-status__technical button');n.scrollIntoView({block:'nearest'});n.focus()});await key('Enter',[],selector)
    await run(()=>document.querySelector('.studio-status__technical .studio-warning-technical__content').scrollIntoView({block:'nearest'}));await settle()
    const opened=await run(()=>{const root=document.querySelector('.studio-status__technical'),button=root.querySelector('button'),content=root.querySelector('.studio-warning-technical__content'),b=button.getBoundingClientRect(),r=content.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{expanded:button.getAttribute('aria-expanded'),diagnostic:content.textContent,visible:content.checkVisibility(),button:b.toJSON(),content:r.toJSON(),footer:f.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,stopped:document.querySelector('.editor-status').textContent.includes('정지')}})
    assert.equal(opened.expanded,'true');assert.equal(opened.visible,true);assert.ok(opened.diagnostic.includes(diagnostic));assert.equal(opened.overflow,false);assert.equal(opened.stopped,true);assert.ok(opened.button.width>=(c.coarse?48:32)&&opened.button.height>=(c.coarse?48:32));assert.ok(opened.content.top>=opened.footer.top-1&&opened.content.bottom<=opened.footer.bottom+1)
    await capture('project-open-'+observations.length)
    await run(()=>document.querySelector('.studio-status__technical button').scrollIntoView({block:'nearest'}));await key('Space',[],selector);assert.equal(await run(()=>document.querySelector('.studio-status__technical button').getAttribute('aria-expanded')),'false')
    observations.push({summary,before,opened});fs.writeFileSync(path.join(scene,'project-open-feedback.json'),JSON.stringify(observations,null,2))
   }
   rejectNextOpen=true;await click('파일');await click('프로젝트 열기');await inspect('프로젝트를 열지 못했습니다.','QA read unavailable')
   assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/);assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection);assert.deepEqual(fs.readFileSync(path.join(scene,'current.chromatics')),savedBytes)
   openFile=path.join(scene,'invalid.chromatics');fs.writeFileSync(openFile,'{broken');await click('프로젝트 열기');await inspect('프로젝트를 열지 못했습니다.','Invalid Chromatics project JSON')
   assert.equal(await history(),'1회 수정');assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection);assert.deepEqual(await save('open-failed-preserved'),expected)
   await clickButton('실행 취소');assert.equal(await history(),'0회 수정');assert.deepEqual(await save('open-undo'),source)
   const incoming=JSON.parse(fs.readFileSync(original,'utf8'));incoming.score.title='Opened project recent failure';openFile=path.join(scene,'incoming.chromatics');fs.writeFileSync(openFile,JSON.stringify(incoming));rejectNextRecentAdd=true
   await click('프로젝트 열기');await inspect('프로젝트를 열었지만 최근 목록을 갱신하지 못했습니다.','QA recent unavailable')
   assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.studio-document').textContent),/Opened project recent failure.*변경 없음/);await click('파일');assert.deepEqual(await save('open-partial-success'),incoming.score)
   assert.equal(await run(()=>!!document.querySelector('.studio-status__technical')),false)
   openFile=original;await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('open-before.chromatics을 열었습니다.'));assert.deepEqual(await save('open-retried'),source)
   // Continue the ordinary complete toolbar/native/XML/MIDI/PDF regression below.
  }
  if(statusDensityAudit){
   const recordsForCase=[]
   const measure=async phase=>{
    const row=await run(()=>{
     const footer=document.querySelector('.studio-status'),r=footer.getBoundingClientRect(),svg=document.querySelector('.notation-preview'),text=svg.querySelector('.vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const ink=ctx.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),top=new DOMPoint(p.x-ink.actualBoundingBoxLeft,p.y-ink.actualBoundingBoxAscent).matrixTransform(matrix),bottom=new DOMPoint(p.x+ink.actualBoundingBoxRight,p.y+ink.actualBoundingBoxDescent).matrixTransform(matrix)
     const texts=[...footer.querySelectorAll('.dd-text')].filter(n=>n.checkVisibility()).map(n=>({tag:n.tagName,role:n.className,text:n.textContent,actual:parseFloat(getComputedStyle(n).fontSize),base:window.__systemRoleBaseFonts?.get(n)??null,box:n.getBoundingClientRect().toJSON()}))
     const page=document.querySelector('.score-page'),pageBox=page.getBoundingClientRect(),pageStyle=getComputedStyle(page)
     const paperGeometry={width:pageBox.width,height:pageBox.height,padding:[pageStyle.paddingTop,pageStyle.paddingRight,pageStyle.paddingBottom,pageStyle.paddingLeft],svgWidth:svg.getBoundingClientRect().width,svgHeight:svg.getBoundingClientRect().height,font:style.font,relativeInkTop:top.y-pageBox.top,relativeInkBottom:bottom.y-pageBox.top}
     const commandTargets=[...document.querySelectorAll('.studio-command-bars button')].filter(n=>n.checkVisibility()).map(n=>({label:n.getAttribute('aria-label')||n.textContent,box:n.getBoundingClientRect().toJSON()}))
     return{paper:pageBox.toJSON(),paperGeometry,commandTargets,clearance:parseFloat(getComputedStyle(footer).getPropertyValue('--dd-spacing-sm')),inlineContext:footer.dataset.inlineContext==='true',viewport:[innerWidth,innerHeight],scrollY,footer:r.toJSON(),context:footer.querySelector('.studio-status__context').getBoundingClientRect().toJSON(),readout:footer.querySelector('.studio-status__readout').getBoundingClientRect().toJSON(),result:footer.querySelector('.studio-status__result')?{text:footer.querySelector('.studio-status__result').textContent,tone:footer.querySelector('.studio-status__result').classList.contains('is-error')?'error':'other',box:footer.querySelector('.studio-status__result').getBoundingClientRect().toJSON()}:null,needsInternalScroll:footer.scrollHeight>footer.clientHeight+1,texts,rolesText:footer.textContent,note:{top:top.y,bottom:bottom.y},firstInkUnoccluded:top.y>=0&&bottom.y<=Math.min(innerHeight,r.top),controls:[...footer.querySelectorAll('.studio-status__view-tools button')].map(n=>({label:n.getAttribute('aria-label')||n.textContent,common:n.matches('.dd-button,.dd-select,.dd-segments >button[role="radio"]'),box:n.getBoundingClientRect().toJSON()})),selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),overflow:document.documentElement.scrollWidth>innerWidth+1,notWrapped:!document.querySelector('.score-canvas').closest('.ddirori')}
    });row.phase=phase
    if(process.env.DDIRORI_STATUS_DENSITY_REFERENCE_DIR&&phase.endsWith('-baseline')){
     const reference=JSON.parse(fs.readFileSync(path.resolve(process.env.DDIRORI_STATUS_DENSITY_REFERENCE_DIR,step,'status-density.json'))).find(n=>n.phase===phase)
     assert.ok(reference,'Recorded pre-change phase must exist:'+phase)
     assert.equal(row.rolesText,reference.rolesText,'No status, result or view-tool text may disappear')
     assert.deepEqual(row.selected,reference.selected)
     assert.ok(row.footer.height<=reference.footer.height-7.5,'Packing must improve height without enlarged-text regression')
     assert.deepEqual(row.note,reference.note,'The score must not move or shrink to satisfy the status audit')
     if(reference.firstInkUnoccluded)assert.equal(row.firstInkUnoccluded,true)
    }
    recordsForCase.push(row);fs.writeFileSync(path.join(scene,'status-density.json'),JSON.stringify(recordsForCase,null,2));assert.equal(row.overflow,false);assert.equal(row.notWrapped,true);assert.ok(row.controls.every(n=>n.common&&n.box.width>=(c.coarse?48:32)&&n.box.height>=(c.coarse?48:32)));if(c.scale===2)assert.ok(row.texts.every(n=>n.base>0&&Math.abs(n.actual-2*n.base)<.1),'Every public Text including strong must actually scale200%:'+JSON.stringify(row.texts.filter(n=>!n.base||Math.abs(n.actual-2*n.base)>=.1)));await capture(phase)
    if(shortWindowWorkspace&&phase==='initial-baseline'&&c.scale===1){assert.ok(row.note.bottom+row.clearance<=row.footer.top,'Initial actual note ink must clear the footer by the standard spacing token');assert.ok(row.commandTargets.every(n=>n.box.width>=32&&n.box.height>=32))}
    if(process.env.DDIRORI_PAPER_GUTTER_REFERENCE_DIR&&phase==='initial-baseline'){
     const before=JSON.parse(fs.readFileSync(path.resolve(process.env.DDIRORI_PAPER_GUTTER_REFERENCE_DIR,step,'status-density.json'))).find(n=>n.phase===phase)
     assert.deepEqual(row.paperGeometry,before.paperGeometry,'Only outside workspace gutters may change;paper/glyph geometry must remain identical')
     assert.equal(row.rolesText,before.rolesText);assert.deepEqual(row.selected,before.selected)
     if(c.height>800)assert.deepEqual(row.note,before.note)
     else assert.ok(row.note.bottom<before.note.bottom,'Short workspace must actually expose more score without hiding controls')
    }
    return row
   }
   const preview=async name=>{
    const baseline=await measure(name+'-baseline');if(!statusDensityPreview)return{baseline}
    await run(()=>{const root=document.querySelector('.studio-status'),context=root.querySelector('.studio-status__context'),tools=root.querySelector('.studio-status__view-tools'),sum=n=>[...n.children].reduce((w,c)=>w+c.getBoundingClientRect().width,0)+parseFloat(getComputedStyle(n).columnGap)*Math.max(0,n.children.length-1),style=document.createElement('style');style.id='owned-status-layout-preview';const css=getComputedStyle(root),available=root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),fits=sum(context)+sum(tools)+parseFloat(getComputedStyle(root.querySelector('.studio-status__readout')).flexBasis)+2*parseFloat(css.columnGap)<=available;style.textContent='.studio-status{padding-block:var(--dd-spacing-xs)}'+(fits?'.studio-status__context{flex:0 1 auto}.studio-status__result{flex:1 1 auto}.studio-status__result.is-error{flex-basis:100%}':'');document.head.append(style)})
    await settle();const candidate=await measure(name+'-preview');assert.equal(candidate.rolesText,baseline.rolesText);assert.deepEqual(candidate.selected,baseline.selected);await run(()=>document.getElementById('owned-status-layout-preview').remove());await settle();return{baseline,candidate}
   }
   const initial=await preview('initial')
   const directSave=async()=>{await clickButton('파일');const count=saveCount;await clickButton('프로젝트 저장');const started=Date.now();while(saveCount===count){assert.ok(Date.now()-started<12000,'Owned project save must finish');await settle()}await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));return JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics'))).score}
   const source=await directSave(),savedBytes=fs.readFileSync(path.join(scene,'current.chromatics'));await wait(()=>!!document.querySelector('.studio-status__result'));const success=await preview('success')
   rejectNextSave=true;await clickButton('파일');const attempts=saveCount;await clickButton('프로젝트 저장');await inspectProjectSaveFailure(c.coarse?48:32);assert.equal(saveCount,attempts+1);assert.deepEqual(fs.readFileSync(path.join(scene,'current.chromatics')),savedBytes);const error=await preview('error');assert.equal(error.baseline.result.tone,'error')
   assert.deepEqual(await directSave(),source);assert.equal(await history(),'0회 수정')
   if(!statusDensityPreview){
    const reflowWidth=c.width===960?1400:960
    win.setContentSize(reflowWidth,c.height);await settle();await settle()
    const reflow=await measure('resize-after-retry');assert.equal(reflow.inlineContext,reflowWidth===1400&&c.scale===1)
    await clickButton('고정 배율');const fixed=await measure('fixed-zoom');assert.equal(await run(()=>document.querySelector('.studio-status__view-tools [role="combobox"]').checkVisibility()),true)
    await clickButton('폭 맞춤');win.setContentSize(c.width,c.height);await settle();await settle()
    const restored=await measure('resize-restored');assert.equal(restored.inlineContext,c.width===1400&&c.scale===1);assert.deepEqual(restored.selected,initial.baseline.selected)
    assert.deepEqual(await directSave(),source);assert.equal(await history(),'0회 수정')
   }
   await run(()=>{const n=document.querySelector('.studio-status__view-tools button');n.scrollIntoView({block:'nearest'});n.focus()});await settle();await key('F6',[],'.studio-status__view-tools button');assert.equal(await run(()=>document.activeElement?.matches('.notation-event,.score-canvas')),true)
   if(shortWorkspaceNavigation){
    const assertRevealed=async phase=>{
     const actual=await measure(phase)
     assert.equal(await run(()=>document.activeElement?.matches('.notation-event.is-selected')&&document.activeElement.dataset.eventId==='m1-c4'),true,'Actual selected event must own keyboard focus')
     assert.equal(actual.firstInkUnoccluded,true,'After explicit score navigation actual selected ink must clear the sticky footer')
     assert.deepEqual(actual.selected,initial.baseline.selected);assert.equal(await history(),'0회 수정')
     assert.equal(await run(()=>document.querySelector('.studio-status__readout').textContent.includes('정지')),true)
    }
    await assertRevealed('selected-after-f6')
    const selector='button[aria-label="악보로 이동"]'
    const expose=async()=>{await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center',inline:'nearest'});n.focus()},selector);await settle()}
    await expose();await key('Enter',[],selector);await assertRevealed('selected-after-header-enter')
    await expose();const point=await run(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(document.elementFromPoint(x,y)?.closest('button')!==n)throw Error('Real score-navigation pointer target is occluded');return{x,y,width:r.width,height:r.height}},selector)
    assert.ok(point.width>=(c.coarse?48:32)&&point.height>=(c.coarse?48:32))
    for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle();await assertRevealed('selected-after-header-pointer')
    assert.deepEqual(await directSave(),source)
   }
   records.push({...c,initial,success,error});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:statusDensityPreview?'Owned renderer CSS preview experiment,not a production-product PASS':'Actual current production footer/font/readout/error/navigation audit;initial visibility is recorded separately'},null,2));win.destroy();win=undefined;continue
  }
  if(paletteSearchActionsOnly){
   const source=await save('search-actions-source'),states=[],search='.studio-notation-palette input[type="search"]',popup='[role="dialog"][aria-label="팔레트 도크 설정"]'
   const opened=()=>run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')].map(n=>n.textContent))
   const openSettings=async()=>{if(await run(()=>document.querySelector('button[aria-label="팔레트 도크 설정"]').getAttribute('aria-expanded'))!=='true')await click('팔레트 도크 설정');assert.equal(await run(popup=>document.querySelector(popup).matches(':popover-open'),popup),true)}
   await click('표기 객체');await openSettings();await click('팔레트 표시 기본값');await key('Escape')
   for(const [label,count] of [['모든 팔레트 접기',0],['모든 팔레트 펼치기',8],['팔레트 표시 기본값',1]]){
    await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},search);await settle();await ensureNativeFocus();await win.webContents.insertText('기호');await settle();assert.deepEqual(await opened(),['표현 기호','정지 기호','범위 기호']);await openSettings()
    if(label==='팔레트 표시 기본값'){
     const checkbox='.studio-palette-workspace-settings input[type="checkbox"]';await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},checkbox);await settle();await key('Space',[],checkbox);assert.equal(await run(selector=>document.querySelector(selector).value,search),'기호');assert.equal((await opened()).length,3)
    }
    await run(label=>{const n=[...document.querySelectorAll('.studio-palette-workspace-settings button')].find(n=>n.textContent===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Actual view action unavailable');n.scrollIntoView({block:'nearest'});n.focus()},label);await settle();await key('Space',[],'.studio-palette-workspace-settings button');assert.equal(await run(selector=>document.querySelector(selector).value,search),'','Global view action must clear search instead of being masked by forced expansion');assert.equal((await opened()).length,count)
    assert.equal(await run(()=>!!document.querySelector('button[aria-label="표기 기호 검색 지우기"]')),false)
    assert.equal(await run(()=>document.activeElement?.textContent),label,'View actions must keep their live popup focus');assert.equal(await run(()=>document.querySelector('.studio-playback button[aria-label="정지"]').disabled),true,'Space on a view action must not start playback')
    const g=await run(popup=>{const root=document.querySelector(popup),r=root.getBoundingClientRect(),active=document.activeElement,a=active.getBoundingClientRect(),h=root.querySelector('.studio-palette-workspace-settings h4');return{popup:r.toJSON(),active:a.toJSON(),heading:{actual:parseFloat(getComputedStyle(h).fontSize),base:window.__systemHeadingBaseFonts?.get(h)??null},inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,activeInside:a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1}},popup);assert.ok(g.inside&&g.activeInside&&!g.overflow,'Actual search action popup/focus must stay visible:'+JSON.stringify(g));if(c.scale===2)assert.ok(g.heading.base>0&&Math.abs(g.heading.actual-g.heading.base*2)<.1);states.push({label,count,...g});await capture('search-action-'+count)
    await key('Escape');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'팔레트 도크 설정');assert.equal(await history(),'0회 수정');assert.deepEqual(await save('search-action-'+count),source);await click('표기 객체')
   }
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},search);await settle();await ensureNativeFocus();await win.webContents.insertText('trill');await settle();const tile='[aria-label="장식음 팔레트"] button[aria-label="트릴 적용 또는 해제"]';await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Palette must still work after search reset');n.scrollIntoView({block:'center'});n.focus()},tile);await settle();await key('Space',[],tile);assert.equal(await history(),'1회 수정');const edited=await save('search-action-trill');assert.deepEqual(edited.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.id==='m1-c4').ornaments,['trill']);await key('Z',['control']);assert.deepEqual(await save('search-action-undo'),source)
   openFile=path.join(scene,'search-actions-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('search-action-reopened'),source)
   records.push({...c,states,checkboxKeepsSearch:true,globalActionsClearSearch:true,focusRestored:true,scoreAndHistoryPreserved:true,realOrnamentAfterReset:true,nativeReopen:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Explicit global palette view commands clear local search;checkbox retains transient query;actual focus/native/undo preserved'},null,2));win.destroy();win=undefined;continue
  }
  if(paletteWorkspaceOnly){
   const source=await save('palette-workspace-source'),states=[],checkbox='.studio-palette-workspace-settings input[type="checkbox"]',popup='[role="dialog"][aria-label="팔레트 도크 설정"]'
   const opened=()=>run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')].map(n=>n.textContent))
   const openSettings=async()=>{await click('표기 객체');if(await run(()=>document.querySelector('button[aria-label="팔레트 도크 설정"]').getAttribute('aria-expanded'))!=='true')await click('팔레트 도크 설정');assert.equal(await run(popup=>document.querySelector(popup).matches(':popover-open'),popup),true)}
   const popupGeometry=async phase=>{
    const g=await run(({popup,checkbox})=>{const n=document.querySelector(popup),r=n.getBoundingClientRect(),active=document.activeElement,a=active.getBoundingClientRect();return{popup:r.toJSON(),active:{label:active.getAttribute('aria-label')||active.closest('label')?.textContent||active.textContent,box:a.toJSON()},heading:{actual:parseFloat(getComputedStyle(document.querySelector('.studio-palette-workspace-settings h4')).fontSize),base:window.__systemHeadingBaseFonts?.get(document.querySelector('.studio-palette-workspace-settings h4'))??null},checked:document.querySelector(checkbox)?.checked,checkboxTarget:document.querySelector(checkbox).closest('label').getBoundingClientRect().toJSON(),inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,focusInside:a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1}}, {popup,checkbox});states.push({phase,...g});fs.writeFileSync(path.join(scene,'palette-workspace-geometry.json'),JSON.stringify(states,null,2));if(c.scale===2)assert.ok(g.heading.base>0&&Math.abs(g.heading.actual-g.heading.base*2)<.1,'The h4 label must actually receive 200% text scaling:'+JSON.stringify(g.heading));assert.ok(g.checkboxTarget.height>=(c.coarse?48:32));assert.ok(g.inside&&g.focusInside&&!g.overflow,'Actual palette settings popup and active control must remain inside viewport:'+JSON.stringify(g));return g
   }
   await openSettings();assert.equal(await run(selector=>!!document.querySelector(selector),checkbox),true,'Existing dock settings must expose real family workspace controls')
   await click('모든 팔레트 펼치기');assert.equal((await opened()).length,8);await click('모든 팔레트 접기');assert.deepEqual(await opened(),[]);await key('Escape');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'팔레트 도크 설정')
   await click('장식음');assert.deepEqual(await opened(),['장식음']);await click('표현 기호');assert.deepEqual(await opened(),['표현 기호','장식음'])
   await openSettings();await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},checkbox);await settle()
   for(const variant of [{isComposing:true},{keyCode:229},{key:'Process'}]){const event=await composeKey(checkbox,variant.key||' ',variant,[]);assert.equal(event.prevented,true);assert.equal(await run(selector=>document.querySelector(selector).checked,checkbox),false)}
   await key('Space',[],checkbox);assert.deepEqual(await opened(),['표현 기호']);assert.equal(await run(()=>[...document.querySelectorAll('.studio-palette-workspace-settings button')].find(n=>n.textContent==='모든 팔레트 펼치기').disabled),true);await popupGeometry('one-family-enabled');await capture('palette-one-family-settings')
   await key('Tab',[],checkbox);assert.equal(await run(()=>document.activeElement.textContent),'모든 팔레트 접기');await key('Tab');assert.equal(await run(()=>document.activeElement.textContent),'팔레트 표시 기본값');await key('Escape');await click('장식음');assert.deepEqual(await opened(),['장식음'])
   const preference=await run(()=>localStorage.getItem('studio.palette-families.v1'));await run(()=>{const n=document.querySelector('.studio-notation-palette input[type="search"]');n.scrollIntoView({block:'center'});n.focus()});await ensureNativeFocus();await win.webContents.insertText('기호');await settle();assert.deepEqual(await opened(),['표현 기호','정지 기호','범위 기호']);assert.equal(await run(()=>localStorage.getItem('studio.palette-families.v1')),preference);await click('표기 기호 검색 지우기');assert.deepEqual(await opened(),['장식음'])
   for(const width of [207,280,360]){
    await setDockWidth('팔레트',width);assert.deepEqual(await opened(),['장식음']);await openSettings();await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},checkbox);await settle();await popupGeometry('width-'+width);await capture('palette-workspace-'+width);await key('Escape',[],checkbox);assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'팔레트 도크 설정')
   }
   const savedWidths=await run(()=>localStorage.getItem('chromatics.dock-widths.v1'));assert.equal(await history(),'0회 수정');assert.deepEqual(await save('palette-workspace-before-reload'),source)
   await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload()});await run(scale=>{window.__systemTextScale=scale},c.scale);await settle();assert.deepEqual(await opened(),['장식음']);await openSettings();assert.equal(await run(selector=>document.querySelector(selector).checked,checkbox),true);assert.equal(await run(()=>localStorage.getItem('chromatics.dock-widths.v1')),savedWidths)
   await click('팔레트 표시 기본값');assert.deepEqual(await opened(),['셈여림']);assert.equal(await run(selector=>document.querySelector(selector).checked,checkbox),false);assert.equal(await run(()=>localStorage.getItem('chromatics.dock-widths.v1')),savedWidths);assert.equal(await history(),'0회 수정');await key('Escape');assert.deepEqual(await save('palette-workspace-final'),source)
   records.push({...c,states,oneFamilyReplacement:true,searchTransient:true,legacyFamilyMapPreserved:true,collapseExpandReset:true,compositionGuard:true,disabledExpandSkippedByTab:true,nativeReloadPersistence:true,dockWidthsPreserved:true,scoreAndHistoryUnchanged:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Local family workspace via existing dock settings/public controls/native keys/reload;not score data or physical IME'},null,2));win.destroy();win=undefined;continue
  }
  if(unspecifiedKeyModeOnly){
   const source=await save('key-mode-source'),envelope=JSON.parse(fs.readFileSync(path.join(scene,'key-mode-source.chromatics'))),states=[]
   const selector='.studio-measure-tools [data-signature="조표"] [role="combobox"]'
   const openKey=async()=>{await click('악보');await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Key properties must actually open');n.scrollIntoView({block:'center'});n.focus()},selector);await settle()}
   const ownedWrite=async(read,before)=>{const start=Date.now();while(read()===before){assert.ok(Date.now()-start<12000,'Owned output must finish');await settle()}assert.equal(read(),before+1)}
   const output=async prefix=>{await click('파일');let before=xmlSaveCount;await click('MusicXML로 저장');await ownedWrite(()=>xmlSaveCount,before);fs.copyFileSync(path.join(scene,'output.musicxml'),path.join(scene,prefix+'.musicxml'));await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await ownedWrite(()=>midiSaveCount,before);fs.copyFileSync(path.join(scene,'output.mid'),path.join(scene,prefix+'.mid'));pdfName=prefix+'.pdf';before=pdfSaveCount;await click('PDF 변환');await ownedWrite(()=>pdfSaveCount,before);await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))}
   for(const [fifths,id,label,current] of [[-7,'cb-major','내림다장조 (♭ 7개)','플랫 7개'],[0,'c-major','다장조 (조표 없음)','조표 없음'],[4,'e-major','마장조 (♯ 4개)','샤프 4개']]){
    const fixture=structuredClone(envelope);for(const measure of fixture.score.parts[0].staves[0].measures)measure.keySignature={fifths}
    const prefix='key-mode-'+fifths;openFile=path.join(scene,prefix+'-fixture.chromatics');fs.writeFileSync(openFile,JSON.stringify(fixture));await click('파일');await click('프로젝트 열기');await selectRenderedMeasure(fixture.score.parts[0].staves[0].measures[1].id);await openKey()
    const text=await run(selector=>document.querySelector(selector).textContent,selector);assert.equal(text,current+' · 장·단조 미지정 (현재)','Omitted mode must not display an invented C-major preset')
    await key('Enter',[],selector);const list=await run(selector=>{const trigger=document.querySelector(selector),list=document.getElementById(trigger.getAttribute('aria-controls')),current=list.querySelector('[data-value="unspecified-mode"]'),r=list.getBoundingClientRect();return{options:list.querySelectorAll('[role="option"]').length,selected:current?.getAttribute('aria-selected'),disabled:current?.getAttribute('aria-disabled'),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,focus:document.activeElement===trigger}},selector);assert.equal(list.options,31);assert.equal(list.selected,'true');assert.equal(list.disabled,'true');assert.ok(list.inside&&list.focus);await capture(prefix+'-current');await key('Escape',[],selector);assert.equal(await history(),'0회 수정');assert.deepEqual(await save(prefix+'-before'),fixture.score)
    await output(prefix+'-before');assert.ok(!fs.readFileSync(path.join(scene,prefix+'-before.musicxml'),'utf8').includes('<mode>'),'Read-only save/export must preserve omitted mode')
    openFile=path.join(scene,prefix+'-before.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save(prefix+'-reopened'),fixture.score);await selectRenderedMeasure(fixture.score.parts[0].staves[0].measures[1].id);await openKey();assert.equal(await run(selector=>document.querySelector(selector).textContent,selector),text)
    await key('Enter',[],selector);await run(id=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===id&&n.checkVisibility());if(!n)throw Error('Actual major preset missing');n.scrollIntoView({block:'nearest'});n.click()},id);await settle();assert.equal(await run(selector=>document.querySelector(selector).textContent,selector),label);assert.equal(await history(),'1회 수정')
    const converted=await save(prefix+'-converted');assert.deepEqual(converted.parts[0].staves[0].measures[0],fixture.score.parts[0].staves[0].measures[0]);for(const measure of converted.parts[0].staves[0].measures.slice(1))assert.deepEqual(measure.keySignature,{fifths,mode:'major'});assert.deepEqual(converted.parts.slice(1),fixture.score.parts.slice(1));assert.deepEqual(converted.parts[0].staves.slice(1),fixture.score.parts[0].staves.slice(1))
    await key('Z',['control']);assert.deepEqual(await save(prefix+'-undo'),fixture.score);await openKey();assert.equal(await run(selector=>document.querySelector(selector).textContent,selector),text);await key('Z',['control','shift']);assert.deepEqual(await save(prefix+'-redo'),converted)
    await selectRenderedMeasure(converted.parts[0].staves[0].measures[1].id);await openKey();await key('Enter',[],selector);await key('Enter',[],selector);assert.equal(await history(),'1회 수정')
    await output(prefix+'-after');assert.ok(fs.readFileSync(path.join(scene,prefix+'-after.musicxml'),'utf8').includes('<mode>major</mode>'));assert.deepEqual(fs.readFileSync(path.join(scene,prefix+'-after.mid')),fs.readFileSync(path.join(scene,prefix+'-before.mid')),'Explicit same-fifths major selection preserves actual MIDI pitches/time')
    states.push({fifths,id,label,current:text,list,nativeOmissionPreserved:true,xmlOmissionPreserved:true,exactUndoRedo:true,sameValueNoop:true,midiEqual:true,pdf:true})
   }
   records.push({...c,states});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Supported omitted-mode metadata/current label/explicit preset selection/undo/native/XML/MIDI/PDF;not inferred new musical modes or external-app QA'},null,2));win.destroy();win=undefined;continue
  }
  if(paletteOrnamentsOnly){
   const source=await save('ornaments-source'),states=[],geometry=[],trace=[],find=score=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.id==='m1-c4')
   await click('도구');await click('범위 표기 찾기');await run(()=>{const n=document.querySelector('.studio-span-properties [role="combobox"]');n.scrollIntoView({block:'center'});n.focus();n.click()});await settle()
   await run(value=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n)throw Error('Actual span option missing');n.click()},'hairpin:'+source.hairpins[0].id);await settle();await click('표기 객체')
   const expand=async family=>{const state=await run(family=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent===family)?.getAttribute('aria-expanded'),family);assert.ok(state==='true'||state==='false','Live palette family must exist:'+family);if(state==='false')await click(family)}
   for(const [family,label] of [['표현 기호','스타카토 적용 또는 해제'],['정지 기호','페르마타 적용 또는 해제']]){await expand(family);assert.equal(await run(label=>[...document.querySelectorAll('.studio-notation-palette button')].find(n=>n.getAttribute('aria-label')===label).disabled,label),true,'A selected span must not edit its note base')}
   await expand('장식음');const selector='[aria-label="장식음 팔레트"]'
   const tile=label=>selector+' button[aria-label="'+label+' 적용 또는 해제"]'
   assert.equal(await run(selector=>[...document.querySelectorAll(selector+' button')].every(n=>n.disabled),selector),true)
   await click('음표');await click('표기 선택 해제');await click('표기 객체');await expand('장식음')
   const context=()=>run(()=>({selected:document.querySelector('.notation-event.is-selected')?.dataset.eventId,next:document.querySelector('[aria-label="다음 입력 설정"]').textContent,mode:document.querySelector('.studio-input-context').dataset.inputActive}))
   const originalContext=await context();assert.equal(originalContext.selected,'m1-c4')
   const press=async label=>{const target=tile(label);await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Actual ornament tile unavailable');n.scrollIntoView({block:'center'});n.focus()},target);await settle();await key('Space',[],target)}
   for(const [value,label] of [['trill','트릴'],['mordent','모르덴트'],['turn','턴']]){
    const target=tile(label);await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},target);await settle();const composing=await composeKey(target,'Enter',{isComposing:true},trace);assert.equal(composing.prevented,true);assert.equal(await history(),'0회 수정')
    await press(label);const expected=structuredClone(source);find(expected).ornaments=[value];assert.deepEqual(await save('ornament-'+value),expected);assert.equal(await history(),'1회 수정');assert.deepEqual(await context(),originalContext)
    await key('Z',['control']);assert.deepEqual(await save('ornament-'+value+'-undo'),source);await key('Z',['control','shift']);assert.deepEqual(await save('ornament-'+value+'-redo'),expected);await key('Z',['control']);assert.deepEqual(await save('ornament-'+value+'-restored'),source);await click('표기 객체');await expand('장식음');states.push({value,label,exactUndoRedo:true,contextPreserved:true})
   }
   await press('트릴');await press('턴');await press('트릴');assert.deepEqual(find(await save('ornament-layered')).ornaments,['turn']);for(let i=0;i<3;i++)await key('Z',['control']);assert.deepEqual(await save('ornament-layered-undo'),source)
   await click('표기 객체');await expand('장식음')
   for(const width of [207,280,360]){
    await setDockWidth('팔레트',width);await expand('장식음');await run(selector=>{const n=document.querySelector(selector+' button');n.scrollIntoView({block:'center'});n.focus()},selector);await settle();const g=await musicToolGeometry(selector);geometry.push({width,...g});fs.writeFileSync(path.join(scene,'ornament-geometry.json'),JSON.stringify(geometry,null,2));assert.equal(g.buttons.length,3);assert.equal(g.overflow,false);assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.inkInside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.font.includes('Bravura')),'Actual ornament glyph ink/public tiles must fit:'+JSON.stringify(g));await capture('ornament-width-'+width)
   }
   await run(()=>{const n=document.querySelector('.studio-notation-palette input[type="search"]');n.scrollIntoView({block:'center'});n.focus()});await ensureNativeFocus();await win.webContents.insertText('mordent');await settle();assert.equal(await run(selector=>document.querySelectorAll(selector+' button').length,selector),1);assert.equal(await run(selector=>document.querySelector(selector+' button').getAttribute('aria-label'),selector),'모르덴트 적용 또는 해제');await click('표기 기호 검색 지우기')
   for(const id of [source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='rest').id]){await run(id=>document.querySelector('.notation-event[data-event-id="'+id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true})),id);await settle();assert.equal(await run(selector=>[...document.querySelectorAll(selector+' button')].every(n=>n.disabled),selector),true)}
   await selectRenderedMeasure(source.parts[0].staves[0].measures[0].id);assert.equal(await run(selector=>[...document.querySelectorAll(selector+' button')].every(n=>n.disabled),selector),true)
   for(const [id,shiftKey] of [['m1-c4',false],['m1-f-sharp-4',true]]){await run(({id,shiftKey})=>document.querySelector('.notation-event[data-event-id="'+id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey})),{id,shiftKey});await settle()}
   assert.ok(await run(()=>document.querySelectorAll('.notation-event.is-selected').length>=2),'Range setup must actually commit the anchor before extending selection');assert.equal(await run(selector=>[...document.querySelectorAll(selector+' button')].every(n=>n.disabled),selector),true);assert.equal(await history(),'0회 수정')
   await run(()=>document.querySelector('.notation-event[data-event-id="m1-c4"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle();await click('표기 객체');await expand('장식음');await press('모르덴트');const changed=structuredClone(source);find(changed).ornaments=['mordent'];assert.deepEqual(await save('ornament-changed'),changed)
   openFile=path.join(scene,'ornament-changed.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('ornament-reopened'),changed)
   const ownedWrite=async(read,before)=>{const start=Date.now();while(read()===before){assert.ok(Date.now()-start<12000,'Owned output must finish');await settle()}assert.equal(read(),before+1)}
   const output=async prefix=>{await click('파일');let before=xmlSaveCount;await click('MusicXML로 저장');await ownedWrite(()=>xmlSaveCount,before);if(prefix!=='output')fs.copyFileSync(path.join(scene,'output.musicxml'),path.join(scene,prefix+'.musicxml'));await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await ownedWrite(()=>midiSaveCount,before);if(prefix!=='output')fs.copyFileSync(path.join(scene,'output.mid'),path.join(scene,prefix+'.mid'));pdfName=prefix+'.pdf';before=pdfSaveCount;await click('PDF 변환');await ownedWrite(()=>pdfSaveCount,before);await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))}
   await output('ornament-mordent');assert.match(fs.readFileSync(path.join(scene,'ornament-mordent.musicxml'),'utf8'),/<ornaments>[\s\S]*?<mordent(?:\s[^>]*)?\/?>(?:[\s\S]*?<\/mordent>)?[\s\S]*?<\/ornaments>/)
   const paperGlyph=await run(()=>[...document.querySelectorAll('.notation-ornament')].map(n=>({text:n.textContent,codePoints:[...n.textContent].map(c=>c.codePointAt(0)),font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,box:n.getBBox()})));fs.writeFileSync(path.join(scene,'paper-ornament-font-audit.json'),JSON.stringify(paperGlyph,null,2))
   openFile=path.join(scene,'ornaments-source.chromatics');await click('파일');await click('프로젝트 열기');await click('음표');const inspector='.studio-note-decorations button[aria-label="모르덴트"]';await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Existing ornament inspector must actually open');n.scrollIntoView({block:'center'});n.focus()},inspector);await settle();await key('Space',[],inspector);assert.deepEqual(await save('ornament-inspector-same-model'),changed);await output('inspector-mordent');assert.deepEqual(fs.readFileSync(path.join(scene,'inspector-mordent.mid')),fs.readFileSync(path.join(scene,'ornament-mordent.mid')));assert.deepEqual(fs.readFileSync(path.join(scene,'inspector-mordent.musicxml')),fs.readFileSync(path.join(scene,'ornament-mordent.musicxml')))
   openFile=path.join(scene,'ornaments-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('ornament-original-reopened'),source);await output('output')
   records.push({...c,states,geometry,compositionGuard:true,layeredOrnamentsPreserved:true,restMeasureRangeSpanDisabled:true,nativeReopen:true,existingInspectorSameModelAndXmlMidi:true,pdfGlyphVisualDefect:"Existing mordent Unicode/font tofu;not corrected by UI migration",output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Existing single-note ornament toggle commands/public shared glyph/private family preference/native keys/outputs;not multi-selection,interval,trill-line,drag or new ornament audio'},null,2));win.destroy();win=undefined;continue
  }
  if(keyPresetInventoryOnly){
   const source=await save('key-source'),envelope=JSON.parse(fs.readFileSync(path.join(scene,'key-source.chromatics'))),states=[],lists=[]
   const signature='.studio-measure-tools [data-signature="조표"] [role="combobox"]'
   const ownedWrite=async(read,before)=>{const start=Date.now();while(read()===before){assert.ok(Date.now()-start<12000,'Owned output must finish');await settle()}assert.equal(read(),before+1)}
   const output=async prefix=>{
    await click('파일');let before=xmlSaveCount;await click('MusicXML로 저장');await ownedWrite(()=>xmlSaveCount,before);fs.copyFileSync(path.join(scene,'output.musicxml'),path.join(scene,prefix+'.musicxml'))
    await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await ownedWrite(()=>midiSaveCount,before);fs.copyFileSync(path.join(scene,'output.mid'),path.join(scene,prefix+'.mid'))
    pdfName=prefix+'.pdf';before=pdfSaveCount;await click('PDF 변환');await ownedWrite(()=>pdfSaveCount,before);await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   }
   const listGeometry=async(selector,expected)=>{
    const row=await run(selector=>{
     const trigger=document.querySelector(selector),list=document.getElementById(trigger.getAttribute('aria-controls')),active=document.getElementById(trigger.getAttribute('aria-activedescendant')),r=list.getBoundingClientRect(),a=active.getBoundingClientRect(),text=document.createRange();text.selectNodeContents(active);const t=text.getBoundingClientRect(),button=trigger.getBoundingClientRect()
     return{active:active.dataset.value,options:list.querySelectorAll('[role="option"]').length,trigger:button.toJSON(),list:r.toJSON(),option:a.toJSON(),text:t.toJSON(),scroll:list.scrollTop,scrollHeight:list.scrollHeight,clientHeight:list.clientHeight,focus:document.activeElement===trigger,visible:active.checkVisibility(),inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,activeInside:a.top>=r.top-1&&a.bottom<=r.bottom+1&&t.left>=r.left-1&&t.right<=r.right+1,overflow:document.documentElement.scrollWidth>innerWidth+1,common:trigger.classList.contains('dd-select')}
    },selector)
    lists.push(row);fs.writeFileSync(path.join(scene,'key-list-geometry.json'),JSON.stringify(lists,null,2));assert.equal(row.options,30);assert.equal(row.active,expected);assert.ok(row.focus&&row.visible&&row.common&&row.inside&&row.activeInside&&!row.overflow,'Actual focused option/text/list must fit:'+JSON.stringify(row));assert.ok(row.trigger.height>=(c.coarse?48:32));return row
   }
   const openKey=async()=>{await click('표기 객체');const family='음자리표·조표·박자표';if(await run(family=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent===family).getAttribute('aria-expanded'),family)!=='true')await click(family);await click('조표 설정 열기');assert.equal(await run(selector=>document.activeElement===document.querySelector(selector),signature),true)}
   await output('key-original')
   for(const [id,fifths,mode,label] of [['e-major',4,'major','마장조 (♯ 4개)'],['c-sharp-major',7,'major','올림다장조 (♯ 7개)'],['ab-minor',-7,'minor','내림가단조 (♭ 7개)']]){
    openFile=path.join(scene,'key-source.chromatics');await click('파일');await click('프로젝트 열기');await selectRenderedMeasure(source.parts[0].staves[0].measures[1].id);await openKey();await key('Enter',[],signature)
    if(id==='ab-minor'){await key('End',[],signature);await listGeometry(signature,id);await capture('key-end-visible');await key('Enter',[],signature)}
    else{await run(id=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===id&&n.checkVisibility());if(!n)throw Error('Actual key option missing '+id);n.scrollIntoView({block:'nearest'});n.click()},id);await settle()}
    assert.equal(await run(selector=>document.querySelector(selector).textContent,signature),label);assert.equal(await history(),'1회 수정')
    const edited=await save('key-'+id),first=edited.parts[0].staves[0];assert.deepEqual(first.measures[0],source.parts[0].staves[0].measures[0]);for(const measure of first.measures.slice(1))assert.deepEqual(measure.keySignature,{fifths,mode})
    assert.deepEqual(edited.parts.slice(1),source.parts.slice(1));assert.deepEqual(edited.parts[0].staves.slice(1),source.parts[0].staves.slice(1))
    const written=score=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events.filter(e=>e.type==='note').map(e=>({id:e.id,step:e.pitch.step,octave:e.pitch.octave,position:e.position,duration:e.duration}))))))
    assert.deepEqual(written(edited),written(source),'Changing key may add accidentals but preserves written letter/octave/time')
    await key('Z',['control']);assert.deepEqual(await save('key-'+id+'-undo'),source);await key('Z',['control','shift']);assert.deepEqual(await save('key-'+id+'-redo'),edited)
    openFile=path.join(scene,'key-'+id+'.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('key-'+id+'-reopened'),edited)
    await selectRenderedMeasure(edited.parts[0].staves[0].measures[1].id);await openKey();assert.equal(await run(selector=>document.querySelector(selector).textContent,signature),label)
    await key('Enter',[],signature);await key('Enter',[],signature);assert.equal(await history(),'0회 수정')
    await output('key-'+id);assert.deepEqual(fs.readFileSync(path.join(scene,'key-'+id+'.mid')),fs.readFileSync(path.join(scene,'key-original.mid')),'Actual MIDI pitches/start/duration stay equal after measure-onward key change')
    const xml=fs.readFileSync(path.join(scene,'key-'+id+'.musicxml'),'utf8');assert.ok(xml.includes('<fifths>'+fifths+'</fifths>'));assert.ok(xml.includes('<mode>'+mode+'</mode>'))
    await run(()=>document.querySelector('.score-page').scrollIntoView({block:'start'}));await settle();await capture('key-'+id+'-score');states.push({id,fifths,mode,measureOnward:true,sameValueNoop:true,exactUndoRedo:true,nativeReopen:true,midiEqual:true,xml:true,pdf:true})
   }
   openFile=path.join(scene,'key-source.chromatics');await click('파일');await click('프로젝트 열기');await clickButton('파일');await clickButton('새 악보 만들기')
   const wizardKey=await run(()=>{const label=[...document.querySelectorAll('dialog label')].find(n=>n.textContent==='조표');if(!label)throw Error('Actual wizard key label missing');return '#'+CSS.escape(label.htmlFor)})
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},wizardKey);await settle();await key('Enter',[],wizardKey);await key('Home',[],wizardKey);await listGeometry(wizardKey,'c-major');await key('Down',[],wizardKey);await listGeometry(wizardKey,'a-minor');await key('End',[],wizardKey);await listGeometry(wizardKey,'ab-minor');await capture('wizard-key-end-visible');await key('Escape',[],wizardKey)
   assert.equal(await run(selector=>document.querySelector(selector).textContent,wizardKey),'다장조 (조표 없음)')
   await key('Enter',[],wizardKey);await key('Home',[],wizardKey);for(let index=0;index<14;index++)await key('Down',[],wizardKey);await listGeometry(wizardKey,'e-major');await capture('wizard-key-e-major');await key('Enter',[],wizardKey)
   await click('만들기');await wait(()=>!document.querySelector('dialog[aria-label="새 악보 만들기"]')?.open)
   const created=await save('wizard-e-major');for(const part of created.parts)for(const staff of part.staves)for(const measure of staff.measures)assert.deepEqual(measure.keySignature,{fifths:4,mode:'major'})
   await click('악보로 이동');await key('N');await key('C');const entered=await save('wizard-e-first-note'),notes=entered.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events.filter(e=>e.type==='note')))))
   assert.equal(notes.length,1);assert.equal(notes[0].pitch.step,'C');assert.equal(await history(),'1회 수정');await key('Z',['control']);assert.deepEqual(await save('wizard-e-undo'),created);await key('Z',['control','shift']);assert.deepEqual(await save('wizard-e-redo'),entered)
   openFile=path.join(scene,'wizard-e-first-note.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('wizard-e-reopened'),entered);await output('wizard-e');await run(()=>document.querySelector('.score-page').scrollIntoView({block:'start'}));await settle();await capture('wizard-e-score')
   const xml=fs.readFileSync(path.join(scene,'wizard-e.musicxml'),'utf8');assert.ok(xml.includes('<fifths>4</fifths>'));assert.ok(xml.includes('<mode>major</mode>'));assert.ok(xml.includes('<alter>1</alter>'),'E-major C input resolves to C sharp in actual XML')
   records.push({...c,states,lists,wizardE:true,actualFirstNote:true,exactUndoRedo:true,nativeReopen:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual public Select full key inventory/wizard/measure-onward commands/native keyboard/native reopen/XML/MIDI/PDF;not external app or OS dialog'},null,2));win.destroy();win=undefined;continue
  }
  if(clefOctaveStateOnly){
   const source=await save('octave-clef-baseline'),envelope=JSON.parse(fs.readFileSync(path.join(scene,'octave-clef-baseline.chromatics'))),states=[]
   const ownedWrite=async(read,before)=>{const start=Date.now();while(read()===before){assert.ok(Date.now()-start<12000,'Owned output must finish');await settle()}assert.equal(read(),before+1)}
   for(const octaveChange of [-1,0,1]){
    const fixture=structuredClone(envelope);fixture.score.parts[0].staves[0].measures[0].clef={sign:'G',line:2,octaveChange}
    const prefix='octave-clef-'+octaveChange;openFile=path.join(scene,prefix+'-fixture.chromatics');fs.writeFileSync(openFile,JSON.stringify(fixture));await click('파일');await click('프로젝트 열기');await selectRenderedMeasure(fixture.score.parts[0].staves[0].measures[0].id);await openNotationSettings('clef')
    const state=await run(()=>({tiles:[...document.querySelectorAll('[aria-label="음자리표 팔레트"] button')].map(n=>({label:n.getAttribute('aria-label'),pressed:n.getAttribute('aria-pressed')})),scope:document.querySelector('[aria-label="음자리표 팔레트"]').textContent,detail:document.querySelector('.studio-measure-notation [role="combobox"]').textContent}))
    assert.equal(state.tiles.length,4);assert.equal(state.tiles[0].pressed,octaveChange===0?'true':'false','Octave-shifted clefs must not appear as the ordinary treble preset')
    if(octaveChange!==0){assert.ok(state.tiles.every(n=>n.pressed==='false'));assert.ok(state.scope.includes('옥타브 '+(octaveChange>0?'+':'')+octaveChange));assert.ok(state.detail.includes('옥타브 '+(octaveChange>0?'+':'')+octaveChange))}
    await click('악보');const staff=await run(()=>document.querySelector('.studio-part-setup [data-field="현재 보표 음자리표"] [role="combobox"]').textContent)
    if(octaveChange!==0)assert.ok(staff.includes('옥타브 '+(octaveChange>0?'+':'')+octaveChange))
    assert.deepEqual(await save(prefix+'-saved'),fixture.score)
    await click('파일');let before=xmlSaveCount;await click('MusicXML로 저장');await ownedWrite(()=>xmlSaveCount,before);fs.copyFileSync(path.join(scene,'output.musicxml'),path.join(scene,prefix+'.musicxml'))
    assert.ok(fs.readFileSync(path.join(scene,prefix+'.musicxml'),'utf8').includes('<clef-octave-change>'+octaveChange+'</clef-octave-change>'))
    await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await ownedWrite(()=>midiSaveCount,before);const midi=fs.readFileSync(path.join(scene,'output.mid'));fs.writeFileSync(path.join(scene,prefix+'-before.mid'),midi)
    openFile=path.join(scene,prefix+'-saved.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save(prefix+'-reopened'),fixture.score)
    await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await ownedWrite(()=>midiSaveCount,before);assert.deepEqual(fs.readFileSync(path.join(scene,'output.mid')),midi,'Native save/reopen retains the current octave-clef playback data')
    await selectRenderedMeasure(fixture.score.parts[0].staves[0].measures[0].id);await click('표기 객체');const selector='[aria-label="음자리표 팔레트"] button[aria-label="높은음자리표 · 선택 마디에 적용"]'
    await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle();await capture(prefix+'-current');await key('Space',[],selector)
    if(octaveChange===0){assert.equal(await history(),'0회 수정');assert.deepEqual(await save(prefix+'-noop'),fixture.score)}
    else{
     const converted=structuredClone(fixture.score);converted.parts[0].staves[0].measures[0].clef={sign:'G',line:2};assert.equal(await history(),'1회 수정');assert.deepEqual(await save(prefix+'-converted'),converted)
     await key('Z',['control']);assert.deepEqual(await save(prefix+'-undo'),fixture.score);await key('Z',['control','shift']);assert.deepEqual(await save(prefix+'-redo'),converted);await key('Z',['control']);assert.deepEqual(await save(prefix+'-restored'),fixture.score)
    }
    states.push({octaveChange,...state,staff,nativePreserved:true,xmlPreserved:true,nativeReopenMidiEqual:true,explicitConversion:octaveChange!==0})
   }
   openFile=path.join(scene,'octave-clef-baseline.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('octave-clef-original-restored'),source)
   records.push({...c,states});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Octave-clef metadata/current state/explicit conversion/native-XML-MIDI preservation;not new octave engraving or external playback QA'},null,2));win.destroy();win=undefined;continue
  }
  if(paletteClefsOnly){
   const source=await save('clef-source'),measureId=source.parts[0].staves[0].measures[0].id,span=source.hairpins[0],trace=[],states=[],geometry=[],visibility=[]
   await selectRenderedMeasure(measureId)
   await click('도구');await click('범위 표기 찾기')
   await run(()=>{const n=document.querySelector('.studio-span-properties [role="combobox"]');n.scrollIntoView({block:'center'});n.focus();n.click()});await settle()
   await run(value=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n)throw Error('Live span option unavailable');n.click()},`hairpin:${span.id}`);await settle()
   await openNotationSettings('clef')
   assert.equal(await run(()=>document.querySelector('.studio-measure-notation [role="combobox"]').disabled),true,'A selected span must not edit the measure from its base selection')
   const tiles=()=>run(()=>[...document.querySelectorAll('[aria-label="음자리표 팔레트"] button')].map(n=>({label:n.getAttribute('aria-label'),disabled:n.disabled,pressed:n.getAttribute('aria-pressed')})))
   assert.equal((await tiles()).length,4);assert.ok((await tiles()).every(n=>n.disabled));assert.equal(await history(),'0회 수정')
   await click('음표');await click('표기 선택 해제');await selectRenderedMeasure(measureId);await click('표기 객체')
   const expand=async()=>{const value=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='음자리표·조표·박자표').getAttribute('aria-expanded'));if(value!=='true')await click('음자리표·조표·박자표')}
   await expand()
   const read=()=>run(()=>({selected:document.querySelector('.notation-measure.is-selected')?.dataset.measureId,next:document.querySelector('[aria-label="다음 입력 설정"]').textContent,mode:document.querySelector('.studio-input-context').dataset.inputActive}))
   const initial=await read();assert.equal(initial.selected,measureId)
   const press=async(label,keyName='Space')=>{const selector='[aria-label="음자리표 팔레트"] button[aria-label="'+label+' · 선택 마디에 적용"]';await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Live clef tile unavailable');n.scrollIntoView({block:'center'});n.focus()},selector);await settle();await key(keyName,[],selector)}
   await press('높은음자리표');assert.equal(await history(),'0회 수정')
   for(const [label,sign,line] of [['낮은음자리표','F',4],['가온음자리표','C',3],['테너음자리표','C',4]]){
    const selector='[aria-label="음자리표 팔레트"] button[aria-label="'+label+' · 선택 마디에 적용"]'
    await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()
    const composition=await composeKey(selector,'Enter',{isComposing:true},trace);assert.equal(composition.prevented,true);assert.equal(await history(),'0회 수정')
    await press(label);const expected=structuredClone(source);expected.parts[0].staves[0].measures[0].clef={sign,line}
    assert.equal(await history(),'1회 수정');assert.deepEqual(await save('clef-'+sign+line),expected);assert.deepEqual(await read(),initial)
    await key('Z',['control']);assert.deepEqual(await save('clef-'+sign+line+'-undo'),source)
    await key('Z',['control','shift']);assert.deepEqual(await save('clef-'+sign+line+'-redo'),expected)
    await key('Z',['control']);assert.deepEqual(await save('clef-'+sign+line+'-restored'),source)
    await click('표기 객체');await expand();states.push({label,sign,line,exactUndoRedo:true})
   }
   await press('낮은음자리표');await press('높은음자리표','Enter');assert.equal(await history(),'2회 수정');assert.deepEqual(await save('clef-G2'),source)
   await key('Z',['control']);assert.equal((await save('clef-G2-undo')).parts[0].staves[0].measures[0].clef.sign,'F')
   await key('Z',['control']);assert.deepEqual(await save('clef-G2-restored'),source);assert.deepEqual(await read(),initial)
   await click('표기 객체');await expand()
   for(const width of [207,280,360]){
    await setDockWidth('팔레트',width);await expand();await run(()=>document.querySelector('[aria-label="음자리표 팔레트"]').scrollIntoView({block:'center'}));await settle()
    const g=await musicToolGeometry('[aria-label="음자리표 팔레트"]');fs.writeFileSync(path.join(scene,'clef-geometry.json'),JSON.stringify([...geometry,{width,...g}],null,2));assert.equal(g.buttons.length,4);assert.equal(g.overflow,false)
    assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.inkInside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.font.includes('Bravura')),'Actual clef glyph ink and public tile targets must fit:'+JSON.stringify(g));geometry.push({width,...g})
    const visibleTile=()=>run(()=>{
     const n=document.activeElement,p=n.closest('aside'),r=n.getBoundingClientRect(),port=p.getBoundingClientRect(),footer=document.querySelector('main > .studio-status').getBoundingClientRect(),style=getComputedStyle(n),svg=n.querySelector('svg'),ink=svg.getBoundingClientRect(),label=n.querySelector('.studio-notation-palette__clef-content').lastElementChild.getBoundingClientRect()
     const ring=Math.max(0,parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset)),top=Math.max(0,port.top+p.clientTop),bottom=Math.min(innerHeight,footer.top,port.top+p.clientTop+p.clientHeight),hit=document.elementFromPoint(ink.left+ink.width/2,ink.top+ink.height/2)
     return{label:n.getAttribute('aria-label'),box:r.toJSON(),svg:ink.toJSON(),text:label.toJSON(),ring,top,bottom,focusVisible:n.matches(':focus-visible'),unoccluded:!!hit&&(hit===n||n.contains(hit)),fits:r.top-ring>=top-1&&r.bottom+ring<=bottom+1&&r.left-ring>=port.left-1&&r.right+ring<=port.right+1&&label.bottom<=bottom&&ink.top>=top}
    })
    await run(()=>document.querySelector('[aria-label="음자리표 팔레트"] button').focus({preventScroll:true}));await settle()
    for(let index=0;index<4;index++){
     if(index)await key('Tab',[],'[aria-label="음자리표 팔레트"] button')
     let measured=await visibleTile();const started=Date.now()
     while(!measured.fits){assert.ok(Date.now()-started<3000,'The focused clef tile and its whole caption/ring must fit the actual dock/footer:'+JSON.stringify(measured));await settle();measured=await visibleTile()}
     assert.equal(measured.label,g.buttons[index].label);assert.equal(measured.focusVisible,true);assert.equal(measured.unoccluded,true,'Real glyph hit point must not be covered by the status surface or popup')
     await capture('clef-width-'+width+'-focus-'+index);assert.deepEqual(await visibleTile(),measured,'Capture and visibility assertion refer to the same stable focused tile');visibility.push({width,index,...measured});assert.equal(await history(),'0회 수정')
    }
    fs.writeFileSync(path.join(scene,'clef-visible-tiles.json'),JSON.stringify(visibility,null,2))
   }
   await run(()=>{const n=document.querySelector('.studio-notation-palette input[type="search"]');n.scrollIntoView({block:'center'});n.focus()});await ensureNativeFocus();await win.webContents.insertText('tenor');await settle()
   assert.equal(await run(()=>document.querySelectorAll('[aria-label="음자리표 팔레트"] button').length),1);assert.equal(await run(()=>document.querySelector('[aria-label="음자리표 팔레트"] button').getAttribute('aria-label')),'테너음자리표 · 선택 마디에 적용')
   await click('표기 기호 검색 지우기')
   for(const id of ['m1-c4',source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='rest').id]){
    await run(id=>document.querySelector('.notation-event[data-event-id="'+id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true})),id);await settle();await click('표기 객체');await expand();assert.ok((await tiles()).length===4&&(await tiles()).every(n=>n.disabled))
   }
   await run(()=>{for(const [id,shiftKey] of [['m1-c4',false],['m1-f-sharp-4',true]])document.querySelector('.notation-event[data-event-id="'+id+'"]').dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey}))});await settle();assert.ok((await tiles()).every(n=>n.disabled));assert.equal(await history(),'0회 수정')
   await selectRenderedMeasure(measureId);await click('표기 객체');await expand();assert.deepEqual(await save('clef-reopen-source'),source)
   const waitWrite=async(read,before)=>{const started=Date.now();while(read()===before){assert.ok(Date.now()-started<12000,'Owned output IPC must complete');await settle()}assert.equal(read(),before+1)}
   const output=async prefix=>{
    await click('파일');let before=xmlSaveCount;await click('MusicXML로 저장');await waitWrite(()=>xmlSaveCount,before);if(prefix!=='output')fs.copyFileSync(path.join(scene,'output.musicxml'),path.join(scene,prefix+'.musicxml'))
    await click('내보내기');before=midiSaveCount;await click('MIDI 내보내기');await waitWrite(()=>midiSaveCount,before);if(prefix!=='output')fs.copyFileSync(path.join(scene,'output.mid'),path.join(scene,prefix+'.mid'))
    pdfName=prefix+'.pdf';before=pdfSaveCount;await click('PDF 변환');await waitWrite(()=>pdfSaveCount,before);await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   }
   await click('표기 객체');await expand();await press('낮은음자리표');const bass=structuredClone(source);bass.parts[0].staves[0].measures[0].clef={sign:'F',line:4};assert.deepEqual(await save('clef-changed-source'),bass)
   openFile=path.join(scene,'clef-changed-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('clef-changed-reopened'),bass);await capture('clef-changed-reopened');await output('clef-bass')
   assert.match(fs.readFileSync(path.join(scene,'clef-bass.musicxml'),'utf8').match(/<clef(?:\s[^>]*)?>[\s\S]*?<\/clef>/)[0],/<sign>F<\/sign>[\s\S]*<line>4<\/line>/)
   openFile=path.join(scene,'clef-reopen-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('clef-reopened'),source);await output('output');assert.deepEqual(await save('clef-final'),source)
   assert.deepEqual(fs.readFileSync(path.join(scene,'clef-bass.mid')),fs.readFileSync(path.join(scene,'output.mid')),'Written pitches and actual MIDI stay unchanged after a clef-only command')
   records.push({...c,states,geometry,visibility,spanBaseMeasureDisabled:true,eventRestRangeDisabled:true,sameValueNoop:true,sourcePreserved:true,changedNativeReopen:true,changedMidiEqual:true,nativeReopen:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual existing measure-only clef commands/public glyph tiles/native keys and owned outputs;not inline clef,drag,physical IME or OS dialogs'},null,2));win.destroy();win=undefined;continue
  }
  if(viewMenuStateOnly){
   const source=await save('view-menu-source'),states=[]
   await setDockWidth('팔레트',207);await setDockWidth('속성',360)
   const openView=async()=>{await run(()=>{const n=document.querySelector('.studio-application-menu button[aria-label="보기"]');n.scrollIntoView({block:'center'});n.focus()});await key('Down',[],'.studio-application-menu button[aria-label="보기"]')}
   const inspect=()=>run(()=>{
    const menu=document.querySelector('[role="menu"][aria-label="보기"]'),r=menu.getBoundingClientRect()
    const visible=selector=>document.querySelector(selector).checkVisibility()
    const actual=[visible('#studio-palette'),visible('#studio-properties'),visible('#studio-part-mixer'),document.querySelector('.score-page').dataset.showPageMargins==='true']
    return{actual,commandLabels:[...menu.querySelectorAll('button[role^="menuitem"]')].map(n=>({label:n.textContent,left:n.querySelector('.studio-application-menu__label')?.getBoundingClientRect().left??n.lastElementChild.getBoundingClientRect().left,fontWeight:getComputedStyle(n).fontWeight,fontSize:getComputedStyle(n).fontSize})),focus:document.activeElement?.textContent,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,
     items:[...menu.querySelectorAll('[role="menuitemcheckbox"]')].map(n=>{const b=n.getBoundingClientRect(),slot=n.querySelector('[data-menu-check]').getBoundingClientRect(),label=(n.querySelector('.studio-application-menu__label')??n.lastElementChild).getBoundingClientRect(),svg=n.querySelector('[data-menu-check] svg'),check=svg?.getBoundingClientRect(),path=svg?.querySelector('path'),ink=path?.getBBox();return{slotWidth:slot.width,labelLeft:label.left,iconLabelGap:label.left-slot.right,label:n.textContent,checked:n.getAttribute('aria-checked')==='true',pressed:n.getAttribute('aria-pressed'),shared:n.matches('.dd-button.dd-button--quiet'),width:b.width,height:b.height,check:check?.toJSON(),stroke:svg?.getAttribute('stroke-width'),ink:ink&&{x:ink.x,y:ink.y,width:ink.width,height:ink.height},disabled:n.disabled}}),
     widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),visibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1'))}
   })
   const verify=state=>{assert.equal(state.commandLabels.length,5);for(const n of state.commandLabels){assert.equal(n.left,state.commandLabels[0].left,'Ordinary and checked command labels share one column');assert.equal(n.fontWeight,state.commandLabels[0].fontWeight);assert.equal(n.fontSize,state.commandLabels[0].fontSize)}assert.equal(state.items.length,4);assert.deepEqual(state.items.map(n=>n.label),['팔레트','속성','믹서','페이지 여백 가이드']);assert.deepEqual(state.items.map(n=>n.checked),state.actual);assert.ok(state.inside&&!state.overflow)
    for(const item of state.items){assert.equal(item.slotWidth,18,'Every command reserves the shared tool icon slot,including unchecked items');assert.equal(item.labelLeft,state.items[0].labelLeft,'Checked and unchecked labels align');assert.equal(item.iconLabelGap,8,'Use the existing spacing.sm token between icon and label');assert.ok(item.shared&&item.pressed===null&&!item.disabled&&item.height>=(c.coarse?48:32));assert.equal(Boolean(item.check),item.checked);if(item.check){assert.equal(item.check.width,18);assert.equal(item.check.height,18);assert.equal(item.stroke,'1.75');assert.ok(item.ink.width>0&&item.ink.height>0&&item.ink.x>0&&item.ink.y>0&&item.ink.x+item.ink.width<24&&item.ink.y+item.ink.height<24)}}
   }
   await openView();const initial=await inspect();verify(initial);assert.equal(initial.focus,'팔레트');states.push({phase:'initial',...initial});await capture('view-menu-initial')
   const composition=[];const checkSelector='[role="menu"][aria-label="보기"] [role="menuitemcheckbox"]'
   for(const variant of [{isComposing:true},{keyCode:229}])for(const name of ['Enter',' '])assert.equal((await composeKey(checkSelector,name,variant,composition)).prevented,true)
   await composeKey(checkSelector,'Process',{},composition)
   for(const variant of [{isComposing:true},{keyCode:229}])await composeKey(checkSelector,'ArrowDown',variant,composition)
   assert.deepEqual(await inspect(),initial,'Composing keys do not toggle or navigate a checked menu item');assert.equal(await history(),'0회 수정')
   await key('Down');assert.equal(await run(()=>document.activeElement.textContent),'속성');await key('End');assert.equal(await run(()=>document.activeElement.textContent),'악보로 이동');await key('Home');assert.equal(await run(()=>document.activeElement.textContent),'팔레트')
   await key('Left');assert.equal(await run(()=>document.activeElement.textContent),'선택 범위 복사');await key('Right');assert.equal(await run(()=>document.activeElement.textContent),'팔레트');await key('Escape');assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'보기')
   for(const [index,label] of ['팔레트','속성','믹서','페이지 여백 가이드'].entries()){
    await openView();const before=await inspect();for(let n=0;n<index;n++)await key('Down')
    assert.equal(await run(()=>document.activeElement.textContent),label)
    await key('Space',[],'[role="menu"][aria-label="보기"] [role="menuitemcheckbox"]');assert.equal(await run(()=>document.querySelector('.studio-application-menu button[aria-label="보기"]').getAttribute('aria-expanded')),'false')
    assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'보기');assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
    await openView();const after=await inspect();verify(after);assert.equal(after.items[index].checked,!before.items[index].checked);states.push({phase:'toggle-'+label,...after});await capture('view-menu-'+index);await key('Escape')
   }
   // Header changes and the menu share exactly the same live display state.
   await click('속성 도크 닫기');await openView();const closed=await inspect();verify(closed);assert.equal(closed.items[1].checked,false);await key('Escape')
   await click('속성 표시');await openView();const restored=await inspect();verify(restored);assert.equal(restored.items[1].checked,true);await key('Escape')
   assert.deepEqual(await save('view-menu-before-reload'),source)
   const expected=await run(()=>({widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),visibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),active:localStorage.getItem('chromatics.dock-active.v1')}))
   await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload()});await run(scale=>{window.__systemTextScale=scale},c.scale);await settle()
   const persisted=await run(()=>({widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),visibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),active:localStorage.getItem('chromatics.dock-active.v1')}));assert.deepEqual(persisted,expected)
   await openView();const reopened=await inspect();verify(reopened);states.push({phase:'reload',...reopened});await capture('view-menu-reload');await key('Escape')
   assert.deepEqual(await save('view-menu-native-source'),source);openFile=path.join(scene,'view-menu-native-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('view-menu-reopened'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'));assert.deepEqual(await save('view-menu-final'),source)
   records.push({...c,states,composition,headerEquivalent:true,keyboard:true,persisted,nativeReopen:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Actual public menu checked states/native keys/owned files;not physical IME or native OS menus'},null,2));win.destroy();win=undefined;continue
  }
  if(commandCompositionOnly){
   const source=await save('composition-source'),trace=[],surfaces=[]
   const selectNote=async()=>{await run(()=>{const n=document.querySelector('.notation-event[data-event-id="m1-c4"]');n.dispatchEvent(new MouseEvent('click',{bubbles:true}))});await settle()}
   const snapshot=()=>run(()=>({selected:document.querySelector('.notation-event.is-selected')?.dataset.eventId,
    input:document.querySelector('.studio-input-context')?.dataset.inputActive,next:document.querySelector('[aria-label="다음 입력 설정"]')?.textContent,
    voices:[...document.querySelectorAll('.studio-input-target button[aria-pressed="true"]')].map(n=>n.getAttribute('aria-label')),
    expanded:[...document.querySelectorAll('.studio-notation-palette button[aria-expanded],.studio-application-menu [aria-haspopup="menu"]')].map(n=>[n.getAttribute('aria-label')||n.textContent,n.getAttribute('aria-expanded')])}))
   for(const surface of ['note-command','voice','palette-family','palette-tile','selected-mark','menu']){
    step=`${c.width}-${c.theme}:composition:${surface}`
    await selectNote();let selector
    if(surface==='note-command')selector='.studio-note-toolbar button[aria-label="쉼표로 변환"]'
    else if(surface==='voice')selector='.studio-input-target button[aria-label="2성부"]'
    else if(surface==='palette-family'||surface==='palette-tile'){
     await click('표기 객체')
     const header='.studio-notation-palette .dd-accordion >button'
     const expanded=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='정지 기호').getAttribute('aria-expanded'))
     if((surface==='palette-family'&&expanded==='true')||(surface==='palette-tile'&&expanded==='false'))await click('정지 기호')
     selector=surface==='palette-tile'?'.studio-notation-palette button[aria-label="페르마타 적용 또는 해제"]':header+'[data-composition-family]'
     if(surface==='palette-family')await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='정지 기호').setAttribute('data-composition-family',''))
    } else if(surface==='selected-mark'){await click('음표');selector='.studio-event-marks button[aria-label="페르마타"]'}
    else selector='.studio-application-menu button[aria-label="추가"]'
    await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Live command unavailable:'+selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()
    const before=await snapshot();const start=trace.length
    for(const variant of [{isComposing:true},{keyCode:229}])for(const name of ['Enter',' ']){
     const event=await composeKey(selector,name,variant,trace);assert.equal(event.prevented,true,'Composition must cancel native button activation:'+surface)
    }
    for(const variant of [{isComposing:true},{keyCode:229},{}])await composeKey(selector,Object.keys(variant).length?'ArrowRight':'Process',variant,trace)
    assert.deepEqual(await snapshot(),before,'No command, disclosure, target or input preset change during composition')
    assert.equal(await run(selector=>document.activeElement===document.querySelector(selector),selector),true);assert.equal(await history(),'0회 수정')
    await capture('composition-'+surface)
    // Actual unmodified keys must still activate the same public control afterward.
    await key('Space',[],selector)
    if(['note-command','palette-tile','selected-mark'].includes(surface)){
     assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
     const changed=await save('composition-'+surface);assert.notDeepEqual(changed,source)
     await key('Z',['control']);assert.deepEqual(await save('composition-'+surface+'-undo'),source)
     await key('Z',['control','shift']);assert.deepEqual(await save('composition-'+surface+'-redo'),changed)
     await key('Z',['control']);assert.deepEqual(await save('composition-'+surface+'-restored'),source)
    }else if(surface==='voice'){
     assert.equal(await run(()=>document.querySelector('.studio-input-target button[aria-label="2성부"]').getAttribute('aria-pressed')),'true')
     // The existing command creates a missing voice with one undo; it is not a pure view toggle.
     assert.equal(await history(),'1회 수정');const added=await save('composition-voice')
     const measure=added.parts[0].staves[0].measures[0],original=source.parts[0].staves[0].measures[0]
     assert.deepEqual(measure.voices[0],original.voices[0]);assert.equal(measure.voices.length,original.voices.length+1)
     assert.equal(measure.voices.at(-1).id,'voice-2');assert.equal(measure.voices.at(-1).events.length,1);assert.equal(measure.voices.at(-1).events[0].type,'rest')
     await key('Z',['control']);assert.deepEqual(await save('composition-voice-undo'),source)
     await key('Z',['control','shift']);assert.deepEqual(await save('composition-voice-redo'),added)
     await key('Z',['control']);assert.deepEqual(await save('composition-voice-restored'),source)
    }else if(surface==='palette-family'){
     assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),selector),'true');await key('Enter',[],selector);assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),selector),'false')
    }else{assert.equal(await run(()=>document.querySelector('.studio-application-menu button[aria-label="추가"]').getAttribute('aria-expanded')),'true');await key('Escape');assert.equal(await run(()=>document.querySelector('.studio-application-menu button[aria-label="추가"]').getAttribute('aria-expanded')),'false')}
    surfaces.push({surface,syntheticKeys:trace.slice(start),nativeFollowup:true});assert.equal(await history(),'0회 수정')
   }
   await click('표기 객체');await run(()=>document.querySelector('.studio-notation-palette input[type="search"]').focus())
   const candidate=await composeKey('.studio-notation-palette input[type="search"]','Enter',{isComposing:true},trace);assert.equal(candidate.prevented,false,'Editable candidate confirmation retains its default')
   await save('composition-reopen-source');openFile=path.join(scene,'composition-reopen-source.chromatics');await click('파일');await click('프로젝트 열기');assert.deepEqual(await save('composition-reopened'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   assert.deepEqual(await save('composition-final'),source)
   records.push({...c,surfaces,candidateDefaultRetained:true,nativeReopen:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Synthetic composing key ownership and actual ordinary native activation;not physical IME'},null,2));win.destroy();win=undefined;continue
  }
  if(paletteEntryOnly){
   const source=await save('palette-entry-before')
   await openNotationSettings('repeat')
   await setDockWidth('팔레트',207);await setDockWidth('속성',360)
   if(!await run(()=>document.querySelector('#studio-palette').checkVisibility()))await clickButton('팔레트 표시')
   await clickButton('팔레트 도크 닫기')
   await key('N')
   const inspect=()=>run(()=>{
    const palette=document.querySelector('#studio-palette'),search=palette.querySelector('input[type="search"]'),tools=document.querySelector('.studio-notation-tools'),docks=document.querySelector('.studio-docks'),root=document.querySelector('.studio-input-context'),selected=document.querySelector('.notation-event.is-selected'),status=document.querySelector('.studio-status'),canvas=document.querySelector('.score-canvas')
    const staves=[...document.querySelectorAll('.notation-preview .vf-stave')].map(n=>n.getBoundingClientRect().toJSON())
    const readout=[...status.querySelectorAll('.dd-text--numeric')].find(n=>/^M.+틱$/.test(n.textContent.trim()))?.textContent
    const text=document.querySelector('.notation-preview .vf-notehead text'),font=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${font.fontSize} ${font.fontFamily}`
    const ink=ctx.measureText(text.textContent),position=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),start=new DOMPoint(position.x-ink.actualBoundingBoxLeft,position.y-ink.actualBoundingBoxAscent).matrixTransform(matrix),end=new DOMPoint(position.x+ink.actualBoundingBoxRight,position.y+ink.actualBoundingBoxDescent).matrixTransform(matrix)
    const firstInk={left:start.x,top:start.y,right:end.x,bottom:end.y}

    return{firstInk,firstInkUnoccluded:firstInk.top>=0&&firstInk.bottom<=Math.min(innerHeight,status.getBoundingClientRect().top),searchFocusExtent:parseFloat(getComputedStyle(search).outlineWidth)+parseFloat(getComputedStyle(search).outlineOffset),searchBox:search.getBoundingClientRect().toJSON(),paletteVisible:palette.checkVisibility(),focusedSearch:document.activeElement===search,searchVisible:search.checkVisibility(),inputActive:root.dataset.inputActive,position:readout,selected:selected?.dataset.eventId,address:selected?[selected.dataset.partId,selected.dataset.staffId,selected.dataset.measureId,selected.dataset.voiceId]:[],widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),visibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),notationToolsVisible:tools.checkVisibility(),notationToolsHeight:tools.getBoundingClientRect().height,docksDocumentTop:docks.getBoundingClientRect().top+scrollY,canvasSizing:canvas.dataset.notationSizing,zoom:canvas.style.getPropertyValue('--studio-notation-zoom'),overflow:document.documentElement.scrollWidth>innerWidth,footer:status.getBoundingClientRect().top,viewport:[innerWidth,innerHeight],staves}
   })
   const before=await inspect();assert.equal(before.inputActive,'true');assert.ok(before.position);assert.equal(before.notationToolsVisible,true);await capture('palette-entry-before')
   await clickButton('추가');await run(()=>{const n=[...document.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent==='표기 팔레트 열기'&&n.checkVisibility());n.focus()})
   await key('Enter',[],'[role="menuitem"]')
   const after=await inspect();fs.writeFileSync(path.join(scene,'palette-entry.json'),JSON.stringify({before,after},null,2));await capture('palette-entry-after')
   assert.equal(after.focusedSearch,true,'Palette discovery focuses the actual search field')
   assert.equal(after.notationToolsVisible,false,'Palette discovery must not expand unrelated notation settings')
   assert.equal(after.paletteVisible,true);assert.equal(after.searchVisible,true);assert.ok(after.searchBox.top-after.searchFocusExtent>=0&&after.searchBox.bottom+after.searchFocusExtent<=after.footer,'Search focus stays clear of the fixed status bar');assert.equal(after.inputActive,before.inputActive);assert.equal(after.position,before.position);assert.equal(after.selected,before.selected);assert.deepEqual(after.address,before.address);assert.deepEqual(after.widths,{palette:207,properties:360});assert.equal(after.visibility.properties,true);assert.equal(after.overflow,false);assert.equal(after.canvasSizing,before.canvasSizing);assert.equal(after.zoom,before.zoom);assert.ok(after.docksDocumentTop<before.docksDocumentTop,'Explicit palette entry recovers the detail toolbar area')
   await ensureNativeFocus();await win.webContents.insertText('fermata');await settle();assert.equal(await history(),'0회 수정')
   await key('Tab',[],'.studio-notation-palette input[type="search"]');await key('Enter',[],'[aria-label="표기 기호 검색 지우기"]');assert.equal((await inspect()).focusedSearch,true)
   if(!await run(()=>document.querySelector('[aria-label="페르마타 적용 또는 해제"]').checkVisibility())){
    const open=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='정지 기호').getAttribute('aria-expanded'));if(open==='false')await clickButton('정지 기호')
   }
   await run(()=>document.querySelector('[aria-label="페르마타 적용 또는 해제"]').focus())
   await key('Space',[],'[aria-label="페르마타 적용 또는 해제"]');assert.equal(await history(),'1회 수정');await key('Z',['control']);assert.deepEqual(await save('palette-input-undo'),source)
   const inputAfterUndo=await inspect();assert.equal(inputAfterUndo.inputActive,'true');assert.equal(inputAfterUndo.position,before.position)
   await selectRenderedMeasure(source.parts[0].staves[0].measures[0].id)
   const entries=[]
   for(const [entry,selector] of [['clef','.studio-measure-notation [role="combobox"]'],['repeat','.studio-repeat-tools input'],['range','.studio-range-tools [aria-label="슬러 추가 또는 해제, 단축키 S"]']]){
    if(entry==='range'){await run(()=>document.querySelector('.notation-event[data-event-id="m1-c4"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle()}
    await openNotationSettings(entry)
    const state=await run(selector=>{const n=document.querySelector(selector);return{visible:n.checkVisibility(),focused:document.activeElement===n,tools:document.querySelector('.studio-notation-tools').checkVisibility(),label:n.getAttribute('aria-label')||n.labels?.[0]?.textContent}},selector)
    assert.ok(state.visible&&state.focused&&state.tools,'Explicit setting entry retains the visible existing field:'+entry);entries.push({entry,...state});assert.equal(await history(),'0회 수정')
   }
   await clickButton('도구');await clickButton('범위 표기 찾기')
   assert.equal(await run(()=>document.querySelector('.studio-notation-tools').checkVisibility()),false)
   await run(()=>document.querySelector('.studio-span-properties [role="combobox"]').click());await settle();await run(()=>[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value.startsWith('hairpin:')&&n.checkVisibility()).click());await settle()
   assert.equal(await run(()=>document.querySelector('.studio-notation-tools').checkVisibility()),false)
   assert.equal(await run(()=>document.querySelector('.studio-span-properties').checkVisibility()),true)
   assert.equal(await run(()=>document.querySelector('.studio-note-toolbar [aria-label="샤프"]').disabled),true)
   await save('palette-reopen-source');openFile=path.join(scene,'palette-reopen-source.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('palette-reopened'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'));assert.deepEqual(await save('palette-entry-final'),source)
   records.push({...c,scope:'palette-entry',before,after,inputAfterUndo,entries,nativeMenuEnter:true,caretReadoutPreserved:true,exactUndo:true,propertiesOnlySpan:true,nativeReopen:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(paletteSearchFocusOnly){
   const source=await save('palette-search-before'),states=[]
   await click('표기 객체')
   for(const query of ['셈여림','일치하지않는표기']){
    step+=query;console.log(step+':search')
    await run(()=>document.querySelector('.studio-notation-palette input[type="search"]').focus())
    await ensureNativeFocus();await win.webContents.insertText(query);await settle()
    assert.equal(await run(()=>document.querySelector('.studio-notation-palette input[type="search"]').value),query)
    await key('Tab',[],'.studio-notation-palette input[type="search"]')
    await key('Enter',[],'[aria-label="표기 기호 검색 지우기"]')
    const state=await run(()=>{const input=document.querySelector('.studio-notation-palette input[type="search"]');return{value:input.value,focused:document.activeElement===input,active:document.activeElement?.tagName,clearPresent:!!document.querySelector('[aria-label="표기 기호 검색 지우기"]'),visible:input.checkVisibility(),box:input.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,families:[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].map(n=>({name:n.textContent,open:n.getAttribute('aria-expanded')}))}})
    states.push({query,...state});fs.writeFileSync(path.join(scene,'palette-search-focus.json'),JSON.stringify(states,null,2));await capture('cleared-'+states.length)
    assert.equal(state.focused,true,'Clearing search must restore focus to the existing public Input')
    assert.equal(state.value,'');assert.equal(state.visible,true);assert.equal(state.clearPresent,false);assert.equal(state.overflow,false);assert.equal(await history(),'0회 수정')
   }
   await ensureNativeFocus();await win.webContents.insertText('ff');await settle()
   await run(()=>document.querySelector('[aria-label="ff 셈여림 적용"]').focus())
   await key('Enter',[],'[aria-label="ff 셈여림 적용"]');assert.equal(await history(),'1회 수정')
   await key('Z',['control']);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('palette-search-after'),source)
   records.push({...c,scope:'palette-search-focus',states,nativeKeys:true,exactUndo:true,nativePreserved:true,commonApiChanged:false});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(paletteArticulationsOnly){
   const source=await save('articulations-before'),states=[]
   const find=score=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.id==='m1-c4')
   await click('표기 객체')
   const familyOpen=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent==='표현 기호')?.getAttribute('aria-expanded'))
   assert.ok(familyOpen==='true'||familyOpen==='false','Actual family header must exist')
   if(familyOpen==='false')await click('표현 기호')
   const nextInput=await run(()=>document.querySelector('[aria-label="다음 입력 설정"]').textContent)
   for(const [label,value] of [['스타카토','staccato'],['악센트','accent'],['테누토','tenuto'],['마르카토','marcato']]){
    console.log(step+':'+value)
    const selector='.studio-notation-palette button[aria-label="'+label+' 적용 또는 해제"]'
    const pressed=await run(selector=>document.querySelector(selector).getAttribute('aria-pressed'),selector)
    assert.equal(pressed,String(find(source).articulations?.includes(value)??false))
    await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector)
    await key('Space',[],selector);assert.equal(await history(),'1회 수정')
    const expected=structuredClone(source),note=find(expected),marks=new Set(note.articulations??[])
    if(marks.has(value))marks.delete(value);else marks.add(value)
    if(marks.size)note.articulations=[...marks];else delete note.articulations
    assert.deepEqual(await save('articulation-'+value),expected)
    assert.equal(await run(()=>document.querySelector('[aria-label="다음 입력 설정"]').textContent),nextInput)
    assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),'m1-c4')
    await key('Z',['control']);assert.deepEqual(await save('undo-'+value),source)
    await key('Z',['control','shift']);assert.deepEqual(await save('redo-'+value),expected)
    await key('Z',['control']);assert.deepEqual(await save('restored-'+value),source)
    states.push({value,pressedBefore:pressed,oneCommand:true,exactUndoRedo:true})
   }
   const rest=source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='rest')
   assert.ok(rest)
   await run(id=>{const n=document.querySelector('.notation-event[data-event-id="'+id+'"]');if(!n)throw Error('Missing rest');n.dispatchEvent(new MouseEvent('click',{bubbles:true}))},rest.id);await settle()
   const restArticulations=await run(()=>[...document.querySelectorAll('[aria-label="표현 기호 팔레트"] [data-mark-glyph]')].map(n=>n.closest('button').disabled))
   assert.equal(restArticulations.length,4);assert.ok(restArticulations.every(Boolean),'All four articulation tiles remain disabled for rests;pause tiles have a separate policy')
   await run(()=>document.querySelector('.notation-event[data-event-id="m1-c4"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle()
   await run(()=>{const n=document.querySelector('.studio-notation-palette input[type="search"]');n.focus()});await ensureNativeFocus();await win.webContents.insertText('마르카토');await settle()
   assert.equal(await run(()=>document.querySelectorAll('.studio-notation-palette [data-mark-glyph]').length),1)
   await click('표기 기호 검색 지우기')
   const geometry=[]
   for(const width of [207,280,360]){
    await setDockWidth('팔레트',width)
    await run(()=>document.querySelector('[aria-label="표현 기호 팔레트"]').scrollIntoView({block:'center'}));await settle()
    const measured=await musicToolGeometry('[aria-label="표현 기호 팔레트"]');geometry.push({width,...measured})
    fs.writeFileSync(path.join(scene,'palette-articulations-geometry.json'),JSON.stringify(geometry,null,2))
    assert.equal(measured.legacy,false);assert.equal(measured.overflow,false);assert.equal(measured.buttons.length,4)
    assert.ok(measured.buttons.every(n=>n.common&&n.inside&&n.inkInside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.font.includes('Bravura')),'Actual shared tiles and measured glyph ink fit the dock')
    await capture('articulations-'+width)
   }
   assert.equal(await run(()=>JSON.parse(localStorage.getItem('studio.palette-families.v1'))['표현 기호']),true)
   await save('articulation-reopen-source');openFile=path.join(scene,'articulation-reopen-source.chromatics');await click('파일');await click('프로젝트 열기');await settle()
   assert.deepEqual(await save('articulations-reopened'),source)
   await click('표기 객체');assert.equal(await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent==='표현 기호').getAttribute('aria-expanded')),'true')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   assert.deepEqual(await save('articulations-final'),source)
   records.push({...c,scope:'palette-articulations',states,geometry,search:true,restDisabled:true,nextInputPreserved:true,nativeReopen:true,preferencePreserved:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(palettePausesOnly){
   const source=await save('pauses-before'),states=[]
   const events=score=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events))))
   const find=(score,id)=>events(score).find(e=>e.id===id)
   await click('표기 객체')
   const expanded=await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent==='정지 기호')?.getAttribute('aria-expanded'))
   assert.ok(expanded==='true'||expanded==='false','The real pause family header must exist')
   if(expanded==='false')await click('정지 기호')
   const press=async label=>{const selector='.studio-notation-palette button[aria-label="'+label+' 적용 또는 해제"]';await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Pause tile unavailable');n.scrollIntoView({block:'center'});n.focus()},selector);await key('Space',[],selector)}
   for(const type of ['note','rest']){
    console.log(step+':pauses-'+type)
    const target=events(source).find(e=>e.type===type);assert.ok(target)
    await run(id=>{const n=document.querySelector('.notation-event[data-event-id="'+id+'"]');n.dispatchEvent(new MouseEvent('click',{bubbles:true}))},target.id);await settle()
    const nextInput=await run(()=>document.querySelector('[aria-label="다음 입력 설정"]').textContent)
    await press('페르마타');assert.equal(await history(),'1회 수정')
    const fermata=structuredClone(source),event=find(fermata,target.id)
    if(event.fermata)delete event.fermata;else event.fermata=true
    assert.deepEqual(await save('pause-'+type+'-fermata'),fermata)
    await key('Z',['control']);assert.deepEqual(await save('pause-'+type+'-undo'),source)
    await key('Z',['control','shift']);assert.deepEqual(await save('pause-'+type+'-redo'),fermata)
    await key('Z',['control']);assert.deepEqual(await save('pause-'+type+'-restored'),source)
    await press('숨표');assert.equal(await history(),'1회 수정')
    const breath=structuredClone(source),first=find(breath,target.id)
    if(first.breathMark==='breath')delete first.breathMark;else first.breathMark='breath'
    assert.deepEqual(await save('pause-'+type+'-breath'),breath)
    await press('중지표');assert.equal(await history(),'2회 수정')
    const caesura=structuredClone(breath);find(caesura,target.id).breathMark='caesura'
    assert.deepEqual(await save('pause-'+type+'-caesura'),caesura)
    assert.equal(await run(()=>document.querySelector('.studio-notation-palette [aria-label="중지표 적용 또는 해제"]').getAttribute('aria-pressed')),'true')
    assert.equal(await run(()=>document.querySelector('.studio-notation-palette [aria-label="숨표 적용 또는 해제"]').getAttribute('aria-pressed')),'false')
    await key('Z',['control']);assert.deepEqual(await save('pause-'+type+'-previous-breath'),breath)
    await key('Z',['control']);assert.deepEqual(await save('pause-'+type+'-source'),source)
    assert.equal(await run(()=>document.querySelector('[aria-label="다음 입력 설정"]').textContent),nextInput)
    assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),target.id)
    states.push({type,eventId:target.id,oneCommitOneUndo:true,exactUndoRedo:true,breathReplacement:true,nextInputPreserved:true})
   }
   await selectRenderedMeasure(source.parts[0].staves[0].measures[1].id)
   const disabled=await run(()=>[...document.querySelectorAll('[aria-label="정지 기호 팔레트"] button')].map(n=>n.disabled));assert.equal(disabled.length,3);assert.ok(disabled.every(Boolean))
   await click('도구');await click('범위 표기 찾기')
   await run(()=>document.querySelector('.studio-span-properties [role="combobox"]').click());await settle()
   await run(()=>[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value.startsWith('hairpin:')&&n.checkVisibility()).click());await settle()
   await click('표기 객체');assert.equal(await run(()=>[...document.querySelectorAll('[aria-label="정지 기호 팔레트"] button')].every(n=>n.disabled)),true)
   await run(()=>document.querySelector('.notation-event[data-event-id="m1-c4"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));await settle()
   await run(()=>document.querySelector('.studio-notation-palette input[type="search"]').focus());await ensureNativeFocus();await win.webContents.insertText('caesura');await settle()
   assert.equal(await run(()=>document.querySelectorAll('.studio-notation-palette [data-mark-glyph]').length),1)
   await click('표기 기호 검색 지우기')
   const geometry=[]
   for(const width of [207,280,360]){
    await setDockWidth('팔레트',width);await run(()=>document.querySelector('[aria-label="정지 기호 팔레트"]').scrollIntoView({block:'center'}));await settle()
    const g=await musicToolGeometry('[aria-label="정지 기호 팔레트"]');geometry.push({width,...g});fs.writeFileSync(path.join(scene,'palette-pauses-geometry.json'),JSON.stringify(geometry,null,2))
    assert.equal(g.overflow,false);assert.equal(g.buttons.length,3);assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.inkInside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.font.includes('Bravura')))
    await capture('palette-pauses-'+width)
   }
   assert.equal(await run(()=>JSON.parse(localStorage.getItem('studio.palette-families.v1'))['정지 기호']),true)
   await save('pauses-reopen-source');openFile=path.join(scene,'pauses-reopen-source.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('pauses-reopened'),source)
   await click('표기 객체');assert.equal(await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent==='정지 기호').getAttribute('aria-expanded')),'true')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'));assert.deepEqual(await save('pauses-final'),source)
   records.push({...c,scope:'palette-pauses',states,geometry,nativeReopen:true,measureAndSpanDisabled:true,search:true,preferencePreserved:true,output:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(metadataFocusOnly){
   const source=await save('metadata-focus-before'),states=[]
   const beforeEnvelope=JSON.parse(fs.readFileSync(path.join(scene,'metadata-focus-before.chromatics')))
   const tokens=JSON.parse(fs.readFileSync('docs/brand/ddirori-design-system/generated/tokens.resolved.json','utf8'))
   for(const [kind,label,inputLabel] of [['title','악보 제목 수정','악보 제목'],['composer','작곡가 수정','작곡가'],['partTitle','파트보 제목 수정','파트보 제목 입력']]){
    console.log(step+':metadata-'+kind)
    if(kind==='partTitle'){
     await click('악보');const view='.studio-score-view__fields > :first-child [role="combobox"]'
     await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},view)
     await key('Enter',[],view);await key('End',[],view);await key('Enter',[],view)
     assert.equal(await run(()=>document.querySelector('.score-page').dataset.viewMode),'part')
    }
    const selector='button[aria-label="'+label+'"]',input='input[aria-label="'+inputLabel+'"]'
    const inspect=()=>run(selector=>{const n=document.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect(),page=n.closest('.score-page').getBoundingClientRect(),canvas=document.createElement('canvas').getContext('2d');const color=c=>{canvas.fillStyle=c;return canvas.fillStyle};return{text:n.textContent,font:s.font,color:color(s.color),background:color(s.backgroundColor),border:color(s.borderColor),outline:{style:s.outlineStyle,color:color(s.outlineColor),width:parseFloat(s.outlineWidth),offset:parseFloat(s.outlineOffset)},focused:n===document.activeElement,focusVisible:n.matches(':focus-visible'),geometry:{x:r.x-page.x,y:r.y-page.y,width:r.width,height:r.height},box:r.toJSON(),footer:document.querySelector('.studio-status').getBoundingClientRect().top}},selector)
    await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()
    await key('Tab',['shift'],selector);await key('Tab')
    const focused=await inspect();states.push({kind,focused});fs.writeFileSync(path.join(scene,'metadata-focus.json'),JSON.stringify(states,null,2));await capture('metadata-focus-'+kind)
    if(metadataEditActionsOnly){
     const actionLabel={title:'악보 제목 편집',composer:'작곡가 편집',partTitle:'파트보 제목 편집'}[kind]
     const actionSelector='.studio-metadata-actions [role="dialog"] button[aria-label="'+actionLabel+'"]'
     const workspaceTrigger='.studio-metadata-actions > .dd-popover-anchor >button'
     const paper=()=>run(()=>{const p=document.querySelector('.score-page'),r=p.getBoundingClientRect(),style=getComputedStyle(p);return{width:r.width,height:r.height,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],text:[...p.querySelectorAll('button.metadata-display')].map(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{label:n.getAttribute('aria-label'),text:n.textContent,font:s.font,color:s.color,x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height}})}})
     const routes=[]
     for(const zoom of [75,100,200]){
      await clickButton('고정 배율');const select='.studio-status__view-tools [role="combobox"]'
      await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},select);await key('Enter',[],select)
      await run(zoom=>{const n=[...document.querySelectorAll('[role="listbox"] [role="option"]')].find(n=>n.checkVisibility()&&n.textContent.trim()===zoom+'%');if(!n)throw Error('Missing actual zoom');n.click()},zoom);await settle()
      const beforePaper=await paper()
      await clickButton('악보 정보')
      const controls=await run(()=>{const root=document.querySelector('.studio-metadata-actions [role="dialog"]'),r=root.getBoundingClientRect();return{box:r.toJSON(),width:innerWidth,comfortable:!!root.querySelector('[data-density="comfortable"]'),buttons:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect(),center=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{label:n.getAttribute('aria-label'),common:n.classList.contains('dd-button'),disabled:n.disabled,box:b.toJSON(),stroke:n.querySelector('svg')?.getAttribute('stroke-width'),hit:!n.disabled&&center?.closest('button')===n}})}})
      assert.equal(controls.comfortable,true);assert.ok(controls.box.left>=0&&controls.box.right<=controls.width);assert.equal(controls.buttons.length,3)
      for(const b of controls.buttons){assert.equal(b.common,true);assert.ok(b.box.width>=48&&b.box.height>=48);assert.equal(b.stroke,'1.75');assert.ok(b.box.left>=controls.box.left&&b.box.right<=controls.box.right)}
      assert.equal(controls.buttons.find(b=>b.label==='파트보 제목 편집').disabled,kind!=='partTitle')
      const action=controls.buttons.find(b=>b.label===actionLabel);assert.equal(action.hit,true)
      await capture('metadata-actions-'+kind+'-'+zoom)
      for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:Math.round(action.box.left+action.box.width/2),y:Math.round(action.box.top+action.box.height/2),...(type==='mouseMove'?{}:{button:'left',clickCount:1})})
      await settle();assert.equal(await run(input=>document.activeElement?.matches(input),input),true)
      const editor=await run(input=>{const n=document.querySelector(input);return{common:!!n.closest('.dd-input-row'),box:n.getBoundingClientRect().toJSON()}},input)
      assert.equal(editor.common,true);assert.ok(editor.box.width>=(c.coarse?48:32)&&editor.box.height>=(c.coarse?48:32))
      await key('Escape',[],input);assert.equal(await run(()=>document.activeElement?.matches('.studio-metadata-actions > .dd-popover-anchor >button')),true)
      assert.deepEqual(await paper(),beforePaper,'Dedicated UI must preserve all paper text geometry and metrics after cancellation');assert.equal(await history(),'0회 수정')
      routes.push({zoom,controls,editor,paperPreserved:true});fs.writeFileSync(path.join(scene,'metadata-actions-'+kind+'.json'),JSON.stringify(routes,null,2))
     }
     await clickButton('폭 맞춤');await clickButton('형식');await clickButton('악보 정보 편집')
     for(let tab=0;tab<({title:0,composer:1,partTitle:2}[kind]);tab++)await key('Tab')
     const trace=[]
     for(const variant of [{isComposing:true},{keyCode:229}])for(const k of ['Enter',' ']){assert.equal((await composeKey(actionSelector,k,variant,trace)).prevented,true);assert.equal(await run(input=>!!document.querySelector(input),input),false)}
     await key('Enter',[],actionSelector);await win.webContents.insertText('공통 편집 확정');await key('Enter',[],input)
     assert.equal(await history(),'1회 수정');assert.equal(await run(()=>document.activeElement?.matches('.studio-metadata-actions > .dd-popover-anchor >button')),true)
     await key('Z',['control'],workspaceTrigger);assert.equal(await history(),'0회 수정');assert.equal((await inspect()).text,focused.text)
     await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()
    }
    if(metadataTargetsOnly){
     const targets=[]
     for(const zoom of [75,100,200]){
      await clickButton('고정 배율')
      const zoomSelect='.studio-status__view-tools [role="combobox"]'
      await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},zoomSelect);await key('Enter',[],zoomSelect)
      await run(zoom=>{const n=[...document.querySelectorAll('[role="listbox"] [role="option"]')].find(n=>n.checkVisibility()&&n.textContent.trim()===zoom+'%');if(!n)throw Error('Missing actual supported zoom '+zoom);n.click()},zoom);await settle()
      await run(selector=>document.querySelector(selector).scrollIntoView({block:'center',inline:'nearest'}),selector);await settle()
      const target=await run(({selector,minimum})=>{const n=document.querySelector(selector),r=n.getBoundingClientRect(),all=[...document.querySelectorAll('button.metadata-display')],x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;return{box:r.toJSON(),minimum,meetsUiTarget:r.width>=minimum&&r.height>=minimum,pointerOwnsCenter:document.elementFromPoint(x,y)===n,adjacent:all.filter(a=>a!==n).map(a=>{const b=a.getBoundingClientRect();return{label:a.getAttribute('aria-label'),verticalGap:Math.max(b.top-r.bottom,r.top-b.bottom),overlapX:Math.min(b.right,r.right)-Math.max(b.left,r.left)}})}},{selector,minimum:c.coarse?48:32})
      target.zoom=zoom;targets.push(target);fs.writeFileSync(path.join(scene,'metadata-target-'+kind+'.json'),JSON.stringify(targets,null,2));assert.equal(target.pointerOwnsCenter,true,'Actual printed metadata target must receive its own pointer')
      for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:Math.round(target.box.left+target.box.width/2),y:Math.round(target.box.top+target.box.height/2),...(type==='mouseMove'?{}:{button:'left',clickCount:1})})
      await settle();assert.equal(await run(input=>document.activeElement?.matches(input),input),true,'Actual pointer must open the intended public editor')
      target.editor=await run(input=>{const n=document.querySelector(input),r=n.getBoundingClientRect(),label=n.labels?.[0];return{publicInput:!!n.closest('.dd-input-row'),label:label?.textContent,srOnly:label?.classList.contains('dd-input-label--sr-only'),box:r.toJSON()}},input)
      assert.equal(target.editor.publicInput,true);assert.equal(target.editor.label,inputLabel);assert.equal(target.editor.srOnly,true);assert.ok(target.editor.box.width>=(c.coarse?48:32)&&target.editor.box.height>=(c.coarse?48:32),'The actual editor UI must retain its32/48 target at every document zoom')
      fs.writeFileSync(path.join(scene,'metadata-target-'+kind+'.json'),JSON.stringify(targets,null,2))
      await key('Escape',[],input);assert.equal(await history(),'0회 수정');assert.equal(await run(selector=>document.activeElement?.matches(selector),selector),true)
     }
     await clickButton('폭 맞춤');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()
    }
    assert.equal(focused.focused,true);assert.equal(focused.focusVisible,true)
    assert.equal(focused.outline.style,'solid');assert.equal(focused.outline.color.toLowerCase(),tokens.themes.light.focus.toLowerCase(),'Paper metadata uses shared light focus role')
    assert.equal(focused.outline.width,tokens.control.focusWidth);assert.equal(focused.outline.offset,tokens.control.focusOffset)
    assert.ok(focused.box.top-focused.outline.width-focused.outline.offset>=0&&focused.box.bottom+focused.outline.width+focused.outline.offset<=focused.footer)
    const hoverAnchor=metadataTargetsOnly||metadataEditActionsOnly?await inspect():focused
    const point={x:Math.round((hoverAnchor.box.left+hoverAnchor.box.right)/2),y:Math.round((hoverAnchor.box.top+hoverAnchor.box.bottom)/2)}
    win.webContents.sendInputEvent({type:'mouseMove',...point});await settle()
    const hovered=await inspect();assert.equal(hovered.background.toLowerCase(),tokens.themes.light.interactionHover.toLowerCase());assert.equal(hovered.border.toLowerCase(),tokens.themes.light.controlBorder.toLowerCase());assert.deepEqual(hovered.geometry,focused.geometry)
    await capture('metadata-hover-'+kind)
    fs.writeFileSync(path.join(scene,'focused-'+kind+'.pdf'),await win.webContents.printToPDF({preferCSSPageSize:true}))
    win.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await settle()
    if(metadataSpaceOnly){
     const trace=[]
     for(const variant of [{isComposing:true},{keyCode:229}])for(const composingKey of ['Enter',' ']){
      assert.equal((await composeKey(selector,composingKey,variant,trace)).prevented,true)
      assert.equal(await run(input=>Boolean(document.querySelector(input)),input),false)
      assert.equal(await history(),'0회 수정')
     }
     assert.equal((await composeKey(selector,'Process',{},trace)).prevented,true)
     fs.writeFileSync(path.join(scene,'metadata-composition-'+kind+'.json'),JSON.stringify(trace,null,2))
     assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
    }
    await key(metadataSpaceOnly?'Space':'Enter',[],selector);assert.equal(await run(input=>document.activeElement?.matches(input),input),true,'Metadata activation opens its input instead of global playback')
    const inputAudit=await run(input=>{const n=document.querySelector(input),s=getComputedStyle(n),r=n.getBoundingClientRect(),label=n.labels?.[0];return{publicInput:!!n.closest('.dd-input-row'),label:label?.textContent,hiddenLabel:label?.classList.contains('dd-input-label--sr-only'),labelBox:label?.getBoundingClientRect().toJSON(),fontSize:parseFloat(s.fontSize),radius:s.borderRadius,outline:s.outlineColor,box:r.toJSON(),uiOnly:!!n.closest('.studio-metadata-editor.ddirori'),paperNotWrapped:!document.querySelector('.score-canvas').closest('.ddirori')}},input)
    assert.equal(inputAudit.publicInput,true);assert.equal(inputAudit.hiddenLabel,true);assert.equal(inputAudit.label,inputLabel);assert.equal(inputAudit.uiOnly,true);assert.equal(inputAudit.paperNotWrapped,true);assert.ok(inputAudit.box.width>=(c.coarse?48:32)&&inputAudit.box.height>=(c.coarse?48:32));assert.equal(inputAudit.radius,'10px');if(c.scale===2)assert.ok(inputAudit.fontSize>=28)
    fs.writeFileSync(path.join(scene,'metadata-input-'+kind+'.json'),JSON.stringify(inputAudit,null,2));await capture('metadata-input-'+kind)
;assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
    await win.webContents.insertText('취소할 초안');await key('Escape',[],input)
    const cancelled=await inspect();assert.equal(cancelled.focused,true,'Escape returns to the same metadata trigger');assert.equal(cancelled.text,focused.text);assert.equal(await history(),'0회 수정')
    if(metadataSpaceOnly){
     const previousSaves=saveCount
     await key('S',['control'],selector);assert.equal(saveCount,previousSaves+1,'Metadata trigger preserves the document save shortcut')
     await key('F6',[],selector);assert.equal(await run(()=>document.activeElement.matches('.studio-score-navigation')),true)
     await key('F6',[],'.studio-score-navigation');assert.equal(await run(()=>document.activeElement.matches('.notation-event.is-selected')),true)
     await run(selector=>document.querySelector(selector).focus(),selector)
    }
    if(metadataImeBlurOnly){
     await key('Enter',[],selector);await run(input=>{window.__metadataComposingInput=document.querySelector(input);window.__metadataComposingInput.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))},input)
     await win.webContents.insertText('조합 중 제목');await key('Enter',[],input);await key('Escape',[],input);assert.equal(await history(),'0회 수정')
     await run(()=>document.querySelector('.studio-score-navigation').focus());await settle();assert.equal(await history(),'0회 수정','Blur during composition cannot confirm metadata')
     assert.equal(await run(input=>document.querySelector(input)===window.__metadataComposingInput&&window.__metadataComposingInput.isConnected,input),true)
     await run(()=>window.__metadataComposingInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await wait(()=>!document.querySelector('.studio-metadata-editor input'))
     assert.equal(await history(),'1회 수정');assert.equal((await inspect()).text,'조합 중 제목');assert.equal(await run(()=>document.activeElement?.matches('.studio-score-navigation')),true)
     await key('Z',['control']);assert.equal(await history(),'0회 수정');assert.equal((await inspect()).text,focused.text)
     fs.writeFileSync(path.join(scene,'metadata-ime-blur-'+kind+'.json'),JSON.stringify({syntheticComposition:true,physicalIme:false,plainEnterEscapeBlocked:true,blurDeferred:true,oneCommandAfterEnd:true,nextFocusPreserved:true,exactUndo:true},null,2))
     await run(selector=>document.querySelector(selector).focus(),selector)
    }
    await key('Enter',[],selector);await win.webContents.insertText('다른 도구로 이동하며 확정')
    await run(()=>document.querySelector('.studio-score-navigation').focus());await settle()
    assert.equal(await run(()=>document.activeElement?.matches('.studio-score-navigation')),true,'Blur commit must preserve the chosen next control')
    assert.equal(await history(),'1회 수정');await key('Z',['control']);assert.equal(await history(),'0회 수정')
    await run(selector=>document.querySelector(selector).focus(),selector)
    await key('Enter',[],selector);await win.webContents.insertText('키보드 확정');await key('Enter',[],input)
    const committed=await inspect();assert.equal(committed.focused,true,'Enter returns to the same metadata trigger');assert.equal(committed.text,'키보드 확정');assert.equal(await history(),'1회 수정')
    await key('Z',['control']);assert.equal(await history(),'0회 수정');assert.equal((await inspect()).text,focused.text)
    await run(selector=>document.querySelector(selector).blur(),selector);await settle()
    const blurred=await inspect();assert.equal(blurred.focused,false);assert.deepEqual(blurred.geometry,focused.geometry);assert.equal(blurred.font,focused.font);assert.equal(blurred.color,focused.color)
    fs.writeFileSync(path.join(scene,'blurred-'+kind+'.pdf'),await win.webContents.printToPDF({preferCSSPageSize:true}))
    states[states.length-1]={kind,focused,hovered,cancelled,committed,blurred,oneCommitOneUndo:true};fs.writeFileSync(path.join(scene,'metadata-focus.json'),JSON.stringify(states,null,2))
   }
   assert.deepEqual(await save('metadata-focus-after'),source)
   const afterEnvelope=JSON.parse(fs.readFileSync(path.join(scene,'metadata-focus-after.chromatics')))
   assert.deepEqual(afterEnvelope.partLayouts,beforeEnvelope.partLayouts,'Undo must preserve independent part geometry as well as score')
   await click('악보');const view='.studio-score-view__fields > :first-child [role="combobox"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},view)
   await key('Enter',[],view);await key('Home',[],view);await key('Enter',[],view)
   assert.equal(await run(()=>document.querySelector('.score-page').dataset.viewMode),'score')
   assert.deepEqual(await save('metadata-restored-view'),source)
   openFile=path.join(scene,'metadata-restored-view.chromatics');await click('파일');await click('프로젝트 열기');await settle()
   assert.deepEqual(await save('metadata-reopened'),source)
   const reopened=JSON.parse(fs.readFileSync(path.join(scene,'metadata-reopened.chromatics')))
   assert.deepEqual(reopened.partLayouts,beforeEnvelope.partLayouts);assert.deepEqual(reopened.view,beforeEnvelope.view)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   assert.deepEqual(await save('metadata-final'),source)
   records.push({...c,scope:'metadata-focus',states,nativeKeys:true,spaceActivation:metadataSpaceOnly,shortcutSaveAndF6:metadataSpaceOnly,nativeScorePreserved:true,nativeReopen:true,actualOutput:true,publicInputMigration:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(spanFocusOnly||eventFocusOnly){
   const tokens=JSON.parse(fs.readFileSync('docs/brand/ddirori-design-system/generated/tokens.resolved.json','utf8'))
   const before=await save('span-focus-before'),states=[]
   for(const kind of eventFocusOnly?['note','rest']:['hairpin','slur']){
    if(eventFocusOnly){
     const event=before.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type===kind)
     assert.ok(event,'Actual fixture must contain '+kind)
     await run(id=>{const n=[...document.querySelectorAll('.notation-event')].find(n=>n.dataset.eventId===id);if(!n)throw Error('Missing real event');n.dispatchEvent(new MouseEvent('click',{bubbles:true}))},event.id);await settle()
    }else{
     await click('도구');await click('범위 표기 찾기')
     const selector='.studio-span-properties [role="combobox"]'
     await run(selector=>document.querySelector(selector).click(),selector);await settle()
     await run(kind=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value.startsWith(kind+':')&&n.checkVisibility());if(!n)throw Error('Missing real '+kind);n.click()},kind);await settle()
    }
    const state=()=>run(eventFocus=>{
     const n=document.querySelector(eventFocus?'.notation-event.is-selected':'.notation-span-target.is-selected')
     const surface=eventFocus?(n.querySelector(':scope > rect[opacity="0"][pointer-events="auto"]')??n):n
     const style=getComputedStyle(surface),box=surface.getBoundingClientRect()
     const canvas=document.createElement('canvas').getContext('2d');canvas.fillStyle=style.outlineColor
     const normalized=n.cloneNode(true)
     // VexFlow allocates fresh internal IDs on redraw; retain every geometry/style/semantic attribute.
     for(const node of normalized.querySelectorAll('[id]'))if(/^vf-auto\d+$/.test(node.id))node.removeAttribute('id')
     return {id:n.dataset.spanId??n.dataset.eventId,kind:n.dataset.spanKind,pressed:n.getAttribute('aria-pressed'),focused:document.activeElement===n,visible:n.matches(':focus-visible'),
      outline:{style:style.outlineStyle,width:parseFloat(style.outlineWidth),offset:parseFloat(style.outlineOffset),color:canvas.fillStyle},
      box:box.toJSON(),parentBox:n.getBoundingClientRect().toJSON(),usesExistingHitSurface:surface!==n,footer:document.querySelector('.studio-status').getBoundingClientRect().top,viewport:{width:innerWidth,height:innerHeight},
      rawInk:eventFocus?n.innerHTML:undefined,
      ink:eventFocus?[normalized.innerHTML]:[...n.querySelectorAll('.notation-slur,.notation-hairpin')].map(n=>n.outerHTML)}
    },eventFocusOnly)
    const selected=await state();assert.equal(selected.focused,false)
    await run(()=>document.querySelector('.studio-score-navigation').focus())
    await key('F6',[],'.studio-score-navigation')
    const focused=await state();states.push({selected,focused})
    fs.writeFileSync(path.join(scene,(eventFocusOnly?'event-focus':'span-focus')+'.json'),JSON.stringify(states,null,2));await capture((eventFocusOnly?'event-focus-':'span-focus-')+kind)
    assert.equal(focused.focused,true);assert.equal(focused.visible,true);if(!eventFocusOnly)assert.equal(focused.pressed,'true')
    assert.equal(focused.id,selected.id);assert.deepEqual(focused.ink,selected.ink,'Focus must not change engraving or hit paths')
    assert.equal(selected.outline.style,'none','Selection alone must not acquire keyboard focus decoration')
    assert.equal(focused.outline.style,'solid','Selected score target needs an independent shared keyboard focus ring')
    assert.equal(focused.outline.width,tokens.control.focusWidth);assert.equal(focused.outline.offset,tokens.control.focusOffset)
    assert.equal(focused.outline.color.toLowerCase(),tokens.themes.light.focus.toLowerCase(),'Always-light paper uses the shared light focus role')
    const extent=focused.outline.width+focused.outline.offset
    assert.ok(focused.box.top-extent>=0&&focused.box.bottom+extent<=Math.min(focused.footer,focused.viewport.height),'Focus ring must clear the fixed footer')
    assert.ok(focused.box.left-extent>=0&&focused.box.right+extent<=focused.viewport.width,'Focus ring must remain in the viewport')
    fs.writeFileSync(path.join(scene,'focused-'+kind+'.pdf'),await win.webContents.printToPDF({preferCSSPageSize:true}))
    await click('도구');await click('범위 표기 찾기')
    const blurred=await state();assert.equal(blurred.focused,false);assert.equal(blurred.outline.style,'none');assert.deepEqual(blurred.ink,selected.ink)
    fs.writeFileSync(path.join(scene,'blurred-'+kind+'.pdf'),await win.webContents.printToPDF({preferCSSPageSize:true}))
   }
   assert.equal(await history(),'0회 수정');assert.deepEqual(await save('span-focus-after'),before)
   records.push({...c,scope:eventFocusOnly?'event-focus':'span-focus',states,nativePreserved:true,historyUnchanged:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(disabledStyleOnly){
   const inspectDisabled=async()=>{
    await run(()=>Promise.all(document.getAnimations().filter(animation=>
      animation instanceof CSSTransition&&animation.effect?.target?.closest('.ddirori')
    ).map(animation=>animation.finished.catch(()=>{}))))
    return run(()=>{
    const context=document.createElement('canvas').getContext('2d')
    const normalize=color=>{context.fillStyle=color;return context.fillStyle}
    return [...document.querySelectorAll('.ddirori button:disabled')].filter(node=>node.checkVisibility()).map(node=>{
      const style=getComputedStyle(node),box=node.getBoundingClientRect()
      const voice=Boolean(node.closest('.studio-input-target__voices'))
      if(!style.getPropertyValue('--dd-disabled').trim()||!style.getPropertyValue('--dd-on-disabled').trim())throw Error('Missing shared disabled tokens')
      return {label:node.getAttribute('aria-label')||node.textContent.trim(),className:node.className,voice,
        opacity:style.opacity,color:normalize(style.color),background:normalize(style.backgroundColor),
        expectedColor:normalize(style.getPropertyValue('--dd-on-disabled').trim()),
        expectedBackground:normalize(style.getPropertyValue('--dd-disabled').trim()),
        cursor:style.cursor,height:box.height,disabled:node.disabled}
    })
   })}
   const assertDisabled=styles=>{for(const row of styles){
    assert.equal(row.opacity,'1',`Public disabled control must not inherit legacy product fading: ${row.label}`)
    assert.equal(row.color,row.expectedColor);assert.equal(row.background,row.expectedBackground)
    assert.equal(row.cursor,'default');assert.ok(row.height>=(c.coarse?48:32));assert.equal(row.disabled,true)
   }}
   const styles=await inspectDisabled()
   fs.writeFileSync(path.join(scene,'disabled-style.json'),JSON.stringify(styles,null,2));await capture('disabled-style')
   assert.ok(styles.length>=4,'Exercise actual disabled toolbar/transport controls');assertDisabled(styles)
   const before=await save('disabled-before')
   await click('도구');await click('범위 표기 찾기')
   await run(()=>document.querySelector('.studio-span-properties [role="combobox"]').click());await settle()
   await run(()=>{const option=[...document.querySelectorAll('[role="option"]')].find(node=>node.dataset.value.startsWith('hairpin:')&&node.checkVisibility());if(!option)throw Error('Missing actual hairpin option');option.click()});await settle()
   const spanStyles=await inspectDisabled()
   fs.writeFileSync(path.join(scene,'disabled-span-style.json'),JSON.stringify(spanStyles,null,2));await capture('disabled-span-style')
   assert.equal(spanStyles.filter(row=>row.voice).length,4,'Exercise all four actual disabled voice IconButtons');assertDisabled(spanStyles)
   const selectedId=await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').textContent)
   await run(()=>document.querySelectorAll('.studio-note-toolbar button:disabled').forEach(node=>node.click()));await settle()
   assert.equal(await history(),'0회 수정')
   assert.equal(await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').textContent),selectedId)
   assert.deepEqual(await save('disabled-after'),before)
   records.push({...c,scope:'disabled-style',styles,spanStyles,disabledNoCommand:true,nativePreserved:true});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(segmentCompositionOnly){
   const before=await save('segment-composition-before'),trace=[]
   const compose=(selector,key,variant)=>composeKey(selector,key,variant,trace)
   const fixed='.studio-status [role="radio"]:last-child',fit='.studio-status [role="radio"]:first-child'
   await clickButton('고정 배율')
   await run(()=>document.querySelector('.studio-status [role="combobox"]').click());await settle()
   await run(()=>{const n=document.querySelector('[role="option"][data-value="150"]');if(!n?.checkVisibility())throw Error('Visible zoom150 option required');n.click()});await settle()
   await run(selector=>document.querySelector(selector).focus(),fixed)
   const state=()=>run(()=>({mode:document.querySelector('.score-canvas').dataset.notationSizing,zoom:document.querySelector('.score-canvas').style.getPropertyValue('--studio-notation-zoom'),preference:localStorage.getItem('chromatics.notation-view.v1'),selection:document.querySelector('.notation-event.is-selected')?.dataset.eventId,active:document.activeElement?.textContent}))
   const initial=await state();assert.equal(initial.mode,'fixed');assert.equal(initial.zoom,'1.5')
   for(const variant of[{isComposing:true},{keyCode:229}])for(const composingKey of['ArrowLeft','Home','ArrowRight','End']){
    assert.equal((await compose(fixed,composingKey,variant)).prevented,false)
    assert.deepEqual(await state(),initial,'IME must not change view,preferred zoom,selection orroving focus')
   }
   await capture('fixed-pending-composition')
   await key('Left',[],fixed);assert.equal((await state()).mode,'fit-width')
   await key('Right',[],fit);assert.deepEqual(await state(),initial,'Normal view keys restorefixed zoom withoutscore changes')
   await key('F6',[],fixed);assert.equal(await run(id=>document.activeElement.matches('.score-canvas .notation-event.is-selected')&&document.activeElement.dataset.eventId===id,initial.selection),true)
   const palette='.studio-dock-switcher [role="radio"]:first-child',properties='.studio-dock-switcher [role="radio"]:last-child'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},palette);await settle()
   const dockState=()=>run(()=>({active:localStorage.getItem('chromatics.dock-active.v1'),palette:document.querySelector('#studio-palette').checkVisibility(),properties:document.querySelector('#studio-properties').checkVisibility(),focus:document.activeElement?.textContent}))
   const originalDock=await dockState();assert.equal(originalDock.palette,true)
   for(const variant of[{isComposing:true},{keyCode:229}]){
    assert.equal((await compose(palette,'ArrowRight',variant)).prevented,false)
    assert.deepEqual(await dockState(),originalDock,'Existing capture-protected dock control remains unchanged')
   }
   await key('Right',[],palette);assert.equal((await dockState()).properties,true)
   await key('Left',[],properties);assert.deepEqual(await dockState(),originalDock)
   const targets=await run(selectors=>selectors.map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return{label:n.textContent,width:r.width,height:r.height,minimum:matchMedia('(pointer:coarse)').matches?48:32}}),[fixed,fit,palette,properties])
   assert.ok(targets.every(n=>n.width>=n.minimum&&n.height>=n.minimum),'View anddock segments retainpublic fine32/coarse48 targets')
   assert.equal(await history(),'0회 수정');assert.equal((await state()).selection,initial.selection)
   assert.deepEqual(await save('segment-composition-after'),before)
   fs.writeFileSync(path.join(scene,'segment-state.json'),JSON.stringify({initial,originalDock,targets,normalKeysRestore:true},null,2))
   clearTimeout(deadline);records.push({...c,scope:'segment-composition',syntheticImeFlags:true,normalNativeAfter:true,viewZoomDockSelectionNativePreserved:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(selectCompositionOnly){
   const before=await save('select-composition-before'),trace=[]
   const compose=(selector,key,variant)=>composeKey(selector,key,variant,trace)
   const focus=async selector=>{await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()}
   const state=selector=>run(selector=>{const n=document.querySelector(selector);return{open:n.getAttribute('aria-expanded'),active:n.getAttribute('aria-activedescendant'),focused:n===document.activeElement,mode:document.querySelector('.score-page').dataset.viewMode}},selector)
   await click('악보')
   const view='.studio-score-view__fields > :first-child [role="combobox"]'
   await focus(view)
   for(const variant of[{isComposing:true},{keyCode:229}]){
    assert.equal((await compose(view,'ArrowDown',variant)).prevented,false)
    assert.equal((await state(view)).open,'false')
   }
   await key('Enter',[],view);await key('End',[],view)
   const pending=await state(view)
   for(const variant of[{isComposing:true},{keyCode:229}])for(const composingKey of['Home','Enter','Tab','Escape']){
    assert.equal((await compose(view,composingKey,variant)).prevented,false)
    assert.deepEqual(await state(view),pending,'IME must not change pending view or commit it')
   }
   await capture('view-pending-composition')
   await key('Enter',[],view);assert.equal((await state(view)).mode,'part')
   await key('Enter',[],view);await key('Home',[],view);await key('Enter',[],view);assert.equal((await state(view)).mode,'score');assert.equal(await history(),'0회 수정')
   await click('도구');await click('범위 표기 찾기')
   await run(()=>document.querySelector('.studio-span-properties [role="combobox"]').click());await settle()
   await run(()=>{const n=document.querySelector('[role="option"][data-value^="hairpin:"]');if(!n?.checkVisibility())throw Error('Actual hairpin option must be visible');n.click()});await settle()
   await clickButton('배치 · 형상')
   const placement=await run(()=>'[id="'+[...document.querySelectorAll('.studio-span-properties label')].find(n=>n.textContent==='표기 배치').control.id+'"]')
   await focus(placement);await key('Enter',[],placement);await key('End',[],placement)
   const geometryPending=await state(placement)
   for(const variant of[{isComposing:true},{keyCode:229}])for(const composingKey of['Home','Enter','Escape']){
    // Existing StudioPropertyDisclosure suppresses native button Enter activation
    // during composition. Keep that adapter barrier as well as Select's no-command contract.
    assert.equal((await compose(placement,composingKey,variant)).prevented,composingKey==='Enter')
    assert.deepEqual(await state(placement),geometryPending,'IME must not commit or cancel pending placement')
    assert.equal(await history(),'0회 수정')
   }
   await capture('placement-pending-composition')
   await key('Enter',[],placement);assert.equal(await history(),'1회 수정')
   const changed=await save('placement-committed'),expected=structuredClone(before)
   expected.hairpins[0].engraving={...expected.hairpins[0].engraving,placement:'below'}
   assert.deepEqual(changed,expected)
   await click('도구');await click('범위 표기 찾기');await focus(placement);await key('Z',['control'],placement)
   assert.equal(await history(),'0회 수정');assert.deepEqual(await save('placement-undo'),before)
   await click('도구');await click('범위 표기 찾기');await focus(placement);await key('Z',['control','shift'],placement)
   assert.equal(await history(),'1회 수정');assert.deepEqual(await save('placement-redo'),expected)
   openFile=path.join(scene,'placement-redo.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('placement-reopened'),expected)
   clearTimeout(deadline);records.push({...c,scope:'select-composition',syntheticImeFlags:true,normalNativeAfter:true,viewRestored:true,oneCommandUndoRedoNativeReopen:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(popoverCompositionOnly){
   const before=await save('composition-before'),selection=await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId)
   const trace=[]
   // Synthetic flags model local command ownership only,not a physical IME session.
   const compose=(selector,key,variant)=>composeKey(selector,key,variant,trace)
   const menuTrigger='.studio-application-menu button[aria-label="파일"]'
   await run(selector=>document.querySelector(selector).focus(),menuTrigger)
   for(const variant of[{isComposing:true},{keyCode:229}]){
    const event=await compose(menuTrigger,'ArrowDown',variant)
    assert.equal(event.prevented,false,'IME direction must not be consumed as an open command')
    assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),menuTrigger),'false')
   }
   await key('Down',[],menuTrigger)
   const firstItem='[role="menu"][aria-label="파일"] [role="menuitem"]'
   for(const variant of[{isComposing:true},{keyCode:229}]){
    assert.equal((await compose(firstItem,'Escape',variant)).prevented,false)
    assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),menuTrigger),'true')
   }
   await key('Escape',[],firstItem)
   assert.equal(await run(selector=>document.activeElement===document.querySelector(selector),menuTrigger),true)
   const preferences=await run(()=>localStorage.getItem('chromatics.dock-widths.v1'))
   for(const name of['팔레트','속성']){
    if(!await run(name=>document.querySelector(name==='팔레트'?'#studio-palette':'#studio-properties').checkVisibility(),name))await clickButton(name+' 표시')
    await clickButton(name+' 도크 설정')
    const selector=`input[aria-label="${name} 도크 폭"]`
    win.webContents.selectAll();await key('Backspace',[],selector)
    for(const variant of[{isComposing:true},{keyCode:229}])for(const composingKey of['Enter','Escape']){
     const event=await compose(selector,composingKey,variant)
     assert.equal(event.prevented,false)
     const state=await run(selector=>{const n=document.querySelector(selector);return{value:n.value,focused:n===document.activeElement,open:n.closest('[popover]').matches(':popover-open'),invalid:n.getAttribute('aria-invalid')}},selector)
     assert.deepEqual(state,{value:'',focused:true,open:true,invalid:'true'},'Composition must not restore the draft or close its settings')
    }
    await capture('composition-'+name)
    await key('Enter',[],selector);assert.equal(await run(selector=>document.querySelector(selector).value,selector),'280')
    await key('Escape',[],selector)
    assert.equal(await run(label=>document.activeElement?.getAttribute('aria-label')===label,name+' 도크 설정'),true)
   }
   assert.equal(await run(()=>localStorage.getItem('chromatics.dock-widths.v1')),preferences)
   assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),selection)
   assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   assert.deepEqual(await save('composition-after'),before)
   clearTimeout(deadline);records.push({...c,scope:'popover-composition',syntheticImeFlags:true,normalNativeAfter:true,scoreSelectionPreferencesUnchanged:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(inputTargetDensityOnly){
   const staffText=await run(()=>{
    const root=document.querySelector('.studio-input-target'),button=root.querySelector('output[aria-label="입력 보표"], [role="combobox"]'),walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT),characters=[]
    let node
    while(node=walker.nextNode())for(let i=0;i<node.textContent.length;i++){
     if(!node.textContent[i].trim())continue
     const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1)
     for(const r of range.getClientRects())if(r.width&&r.height)characters.push({text:node.textContent[i],left:r.left,right:r.right,top:r.top,bottom:r.bottom})
    }
    const box=button.getBoundingClientRect(),wrap=root.getBoundingClientRect()
    return{kind:button.tagName,label:button.textContent.trim(),lines:[...new Set(characters.map(c=>Math.round(c.top)))],characters,box:box.toJSON(),wrapper:wrap.toJSON(),voices:root.querySelector('.studio-input-target__voices').getBoundingClientRect().toJSON(),font:getComputedStyle(button).fontSize,viewport:innerWidth}
   })
   fs.writeFileSync(path.join(scene,'input-staff-text.json'),JSON.stringify(staffText,null,2))
   assert.equal(staffText.kind,'OUTPUT','A sole staff is readable status, not a disabled selection control')
   assert.equal(staffText.label,'Melody','Use the real fixture staff name,not a shortened label')
   assert.equal(staffText.lines.length,1,'The short input staff name must fit on one line at the actual text scale')
   assert.ok(staffText.box.left>=0&&staffText.box.right<=staffText.viewport,'Current staff status stays inside the viewport')
   assert.ok(staffText.characters.every(r=>r.left>=staffText.box.left&&r.right<=staffText.box.right),'Full staff text remains inside its visible status')
   assert.ok(Math.abs(staffText.box.bottom-staffText.voices.bottom)<=1,'Short staff and four voices fit together without adding an unnecessary toolbar row')
  }
  const initialVisibility=await run(()=>{
    const text=document.querySelector('.notation-preview .vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const m=ctx.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),top=new DOMPoint(p.x-m.actualBoundingBoxLeft,p.y-m.actualBoundingBoxAscent).matrixTransform(matrix),bottom=new DOMPoint(p.x+m.actualBoundingBoxRight,p.y+m.actualBoundingBoxDescent).matrixTransform(matrix),footer=document.querySelector('.studio-status').getBoundingClientRect(),limit=Math.min(innerHeight,footer.top)
    return{scope:'Fresh release-test renderer before view/file/menu tasks',viewport:[innerWidth,innerHeight],note:{top:top.y,bottom:bottom.y},visibleScoreBottom:limit,firstInkInViewport:top.y>=0&&bottom.y<=innerHeight,firstInkUnoccluded:top.y>=0&&bottom.y<=limit}
  })
  fs.writeFileSync(path.join(scene,'initial-visibility.json'),JSON.stringify(initialVisibility,null,2))
  if(c.width===1400&&c.height===800&&c.scale===1&&!c.coarse)assert.equal(initialVisibility.firstInkUnoccluded,true,'1400x800 basic first ink remains above the lower status area')
  const workspaceSurface=await run(()=>({actual:getComputedStyle(document.querySelector('.studio-docks')).backgroundColor,expected:getComputedStyle(document.querySelector('.studio-document')).backgroundColor,notationWrapped:!!document.querySelector('.score-canvas').closest('.ddirori')}))
  fs.writeFileSync(path.join(scene,'workspace-surface.json'),JSON.stringify(workspaceSurface,null,2));assert.equal(workspaceSurface.actual,workspaceSurface.expected,'Unused workspace uses the current public neutral surface');assert.equal(workspaceSurface.notationWrapped,false)
  if(sharedDesktopOnly&&c.width>=1024)assert.equal(await run(()=>document.querySelector('.studio-dock-switcher').checkVisibility()),true,'Wide desktop uses the same shared sidebar')
  if(compactDockScrollOnly&&c.width>=761){
   const dockSpace=await run(()=>{const pane=document.querySelector('.studio-docks >aside:not([hidden])'),b=pane.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{pane:b.toJSON(),footer:footer.toJSON(),expected:Math.max(160,Math.floor(innerHeight-footer.height-Math.max(0,b.top))),client:pane.clientHeight,scroll:pane.scrollHeight}})
   fs.writeFileSync(path.join(scene,'dock-space.json'),JSON.stringify(dockSpace,null,2));assert.ok(Math.abs(dockSpace.pane.height-dockSpace.expected)<=1,'Compact sidebar uses measured viewport space instead of the retired10rem top-surface cap')
   await run(()=>{const n=[...document.querySelectorAll('#studio-palette .dd-accordion >button')].at(-1);n.scrollIntoView({block:'nearest'});n.focus()});await key('Home',[],'#studio-palette .dd-accordion >button');await key('End',[],'#studio-palette .dd-accordion >button')
   const focused=await run(()=>{const n=document.activeElement,b=n.getBoundingClientRect(),pane=n.closest('aside'),r=pane.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{text:n.textContent,top:b.top,bottom:b.bottom,pane:r.toJSON(),limit:Math.min(innerHeight,footer.top),scroll:pane.scrollTop}})
   fs.writeFileSync(path.join(scene,'dock-focus.json'),JSON.stringify(focused,null,2));assert.equal(focused.text,'반복·볼타');assert.ok(focused.top>=Math.max(0,focused.pane.top)+2&&focused.bottom<=Math.min(focused.limit,focused.pane.bottom)-2,'Real family focus stays inside the dock and above the footer');assert.equal(await history(),'0회 수정');await capture('dock-scroll-focus')
  }
  if(compactSharedDockOnly){
   const source=await save('before'), shared=c.width>=761
   const snapshot=()=>run(()=>({
    switcher:document.querySelector('.studio-dock-switcher')?.checkVisibility()??false,
    palette:document.querySelector('#studio-palette').checkVisibility(),properties:document.querySelector('#studio-properties').checkVisibility(),
    active:document.querySelector('.studio-dock-switcher [aria-checked="true"]')?.textContent,
    widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),visibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),
    canvas:document.querySelector('.score-canvas').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth
   }))
   let state=await snapshot();assert.equal(state.switcher,shared);assert.equal(state.palette,true);assert.equal(state.properties,!shared);assert.equal(state.overflow,false)
   const widths=[]
   for(const name of ['팔레트','속성'])for(const width of [207,280,360]){
    await setDockWidth(name,width);state=await snapshot();assert.equal(state.widths[name==='팔레트'?'palette':'properties'],width);assert.equal(state.overflow,false)
    const geometry=await run(name=>{const n=document.querySelector(name==='팔레트'?'#studio-palette':'#studio-properties'),b=n.getBoundingClientRect(),canvas=document.querySelector('.score-canvas').getBoundingClientRect();return{visible:n.checkVisibility(),width:b.width,left:b.left,right:b.right,canvasLeft:canvas.left,canvasRight:canvas.right}},name)
    assert.equal(geometry.visible,true);assert.ok(Math.abs(geometry.width-width)<=1);if(shared)assert.ok(geometry.right<=geometry.canvasLeft)
    widths.push({name,width,...geometry});await capture('width-'+name+'-'+width)
   }
   await click('음표')
   const field='input[aria-label="선택 요약 보표 글자"]'
   const checkDraftFocus=async stage=>{
    if(!compactDockScrollOnly)return
    const g=await run(()=>{const n=document.activeElement,b=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{top:b.top,bottom:b.bottom,limit:Math.min(innerHeight,footer.top),label:n.getAttribute('aria-label')}})
    fs.writeFileSync(path.join(scene,'draft-focus-'+stage+'.json'),JSON.stringify(g,null,2));assert.ok(g.top>=0&&g.bottom<=g.limit,'Viewport changes keep the focused draft above the sticky footer')
   }
   const original=await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();window.__dockDraftNode=n;return n.value},field)
   win.webContents.selectAll();await win.webContents.insertText('도크 초안');await settle()
   win.setContentSize(c.width<1024?1400:960,c.height);await settle();await checkDraftFocus('other-width')
   assert.equal(await run(()=>document.activeElement===window.__dockDraftNode&&window.__dockDraftNode.checkVisibility()&&window.__dockDraftNode.value==='도크 초안'),true,'Viewport changes must retain the live focused draft')
   win.setContentSize(c.width,c.height);await settle();await checkDraftFocus('original-width')
   assert.equal(await run(()=>document.activeElement===window.__dockDraftNode&&window.__dockDraftNode.checkVisibility()),true)
   await key('Escape',[],field);assert.equal(await run(selector=>document.querySelector(selector).value,field),original);assert.equal(await history(),'0회 수정')
   if(shared){
    await click('팔레트');await run(()=>document.querySelector('.studio-dock-switcher [role="radio"]').focus());await key('Right',[],'.studio-dock-switcher [role="radio"]')
    state=await snapshot();assert.equal(state.properties,true);assert.equal(state.palette,false);assert.equal(state.active,'속성');assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   }
   for(const name of ['속성','팔레트']){
    if(!await run(name=>document.querySelector(name==='팔레트'?'#studio-palette':'#studio-properties').checkVisibility(),name))await click(name+' 표시')
    await click(name+' 도크 닫기');assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),name+' 표시')
   }
   state=await snapshot();assert.equal(state.palette,false);assert.equal(state.properties,false);assert.equal(state.switcher,false);assert.equal(state.overflow,false)
   await capture('both-closed')
   await win.reload();await wait(()=>!!document.querySelector('.studio-docks'));await run(scale=>{window.__systemTextScale=scale},c.scale);await settle()
   state=await snapshot();assert.deepEqual(state.visibility,{palette:false,properties:false});assert.equal(state.palette,false);assert.equal(state.properties,false)
   await click('속성 표시');state=await snapshot();assert.equal(state.properties,true);assert.equal(state.palette,false);assert.equal(state.switcher,shared)
   await click('팔레트 표시');state=await snapshot();assert.equal(state.palette,true);assert.equal(state.properties,!shared);assert.deepEqual(state.widths,{palette:360,properties:360})
   await click('도구');await click('범위 표기 찾기')
   assert.equal(await run(()=>document.activeElement.matches('.studio-span-properties [role="combobox"]')&&document.activeElement.checkVisibility()),true)
   await run(()=>document.activeElement.click());await settle();await run(()=>[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value.startsWith('hairpin:')&&n.checkVisibility()).click());await settle()
   await click('배치 · 형상')
   const offset='input[aria-label="표기 세로 이동"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},offset);win.webContents.selectAll();await win.webContents.insertText('0');await key('Enter',[],offset);await key('Tab')
   assert.equal(await history(),'1회 수정');await run(()=>{const n=document.querySelector('.studio-span-properties__geometry .dd-accordion >button');n.scrollIntoView({block:'center'});n.focus()});await key('Z',['control'],'.studio-span-properties__geometry .dd-accordion >button');assert.equal(await history(),'0회 수정');assert.deepEqual(await save('undo'),source)
   openFile=path.join(scene,'undo.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('reopened'),source)
   await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   await click('표기 객체');await run(()=>window.scrollTo(0,0));await settle();await capture('shared-dock-final')
   fs.writeFileSync(path.join(scene,'dock-contract.json'),JSON.stringify({widths,final:await snapshot(),initialVisibility,draftSurvivesResize:true,explicitZeroOneUndo:true,nativeReopen:true},null,2))
   clearTimeout(deadline);records.push({...c,scope:'compact-shared-dock',initialVisibility});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  const summary=await run(()=>{const root=document.querySelector('.studio-note-toolbar__context'),target=root.querySelector('[aria-label="도구 적용 대상"]'),next=root.querySelector('[aria-label="다음 입력"]'),output=next.querySelector('output'),label=next.querySelector('h2');return{height:root.getBoundingClientRect().height,targetHeight:target.getBoundingClientRect().height,nextHeight:next.getBoundingClientRect().height,distinct:!target.contains(next)&&!next.contains(target),outsideCommands:!root.closest('.studio-note-toolbar__commands'),overflow:root.scrollWidth>root.clientWidth,label:label.className,output:output.className,state:next.querySelector('.studio-input-context__state').className,scope:target.textContent,nextValue:output.textContent}})
  assert.equal(summary.distinct,true);assert.equal(summary.outsideCommands,true);assert.equal(summary.overflow,false);assert.match(summary.label,/dd-text--label/);assert.match(summary.output,/dd-text--description/);assert.match(summary.state,/dd-text--description/)
  if(c.scale===1)assert.ok(summary.height<=Math.max(summary.targetHeight,summary.nextHeight)+1,'Command target and next-input summary share one row when the desktop width permits')
  fs.writeFileSync(path.join(scene,'input-summary.json'),JSON.stringify(summary,null,2))
  const header=await run(()=>{const root=document.querySelector('.studio-document');return{title:getComputedStyle(root.querySelector('h1')).color,text:getComputedStyle(root).color}})
  fs.writeFileSync(path.join(scene,'header.json'),JSON.stringify(header,null,2));assert.equal(header.title,header.text,'Document title must inherit its themed text role,not legacy h1 ink')
  const originalSelection=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
  await run(()=>[...document.querySelectorAll('.studio-status [role="radio"]')].find(n=>n.textContent==='폭 맞춤').focus());await key('Right',[],'[role=radio]')
  assert.equal(await run(()=>document.querySelector('.score-canvas').dataset.notationSizing),'fixed')
  await key('Space',[],'[role=radio]');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
  await key('Left',[],'[role=radio]');assert.equal(await run(()=>document.querySelector('.score-canvas').dataset.notationSizing),'fit-width')
  assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)),originalSelection)
  await clickButton('파일')
  await capture('file-menu')
  const menu=await run(()=>{const n=document.querySelector('[role="menu"][aria-label="파일"]'),r=n.getBoundingClientRect();return{open:n.matches(':popover-open'),theme:getComputedStyle(n).getPropertyValue('--dd-action'),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,focus:document.activeElement?.textContent,
   triggers:[...document.querySelectorAll('.studio-application-menu [aria-haspopup="menu"]')].map(trigger=>({label:trigger.getAttribute('aria-label'),quiet:trigger.matches('.dd-button.dd-button--quiet'),border:getComputedStyle(trigger).borderTopColor,height:trigger.getBoundingClientRect().height})),
   items:[...n.querySelectorAll('[role="menuitem"]')].map(item=>({label:item.textContent,shared:item.matches('.dd-button.dd-button--quiet'),height:item.getBoundingClientRect().height,tabIndex:item.tabIndex,disabled:item.disabled})),minimum:matchMedia('(pointer:coarse)').matches?48:32}})
  assert.equal(menu.open,true);assert.ok(menu.left>=0&&menu.right<=menu.width&&menu.top>=0&&menu.bottom<=menu.height);assert.equal(menu.focus,'새 악보 만들기')
  assert.ok(menu.items.length>0&&menu.items.every(item=>item.shared&&item.tabIndex===-1&&item.height>=menu.minimum),'Actual menu commands must use public Button withmenu semantics andfine/coarse minimum targets')
  assert.ok(menu.triggers.length>0&&menu.triggers.every(trigger=>trigger.quiet&&trigger.border==='rgba(0, 0, 0, 0)'&&trigger.height>=menu.minimum),'Approved quiet menu triggers use the shared transparent border and fine/coarse targets')
  await key('End');assert.equal(await run(()=>document.activeElement.textContent),'파일 작업 열기')
  await key('Right');assert.equal(await run(()=>document.activeElement.textContent),'선택 범위 복사')
  await key('Escape');assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'편집')
  fs.writeFileSync(path.join(scene,'menu.json'),JSON.stringify(menu,null,2))
  if(workspaceSpaceOnly||documentViewOnly){
   if(documentViewOnly){
    const before=await save('document-view-before'),selection=await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId))
    if(dockSettingsOnly||documentViewAccessibility){
      const settings=[]
      for(const name of ['팔레트','속성']){
        assert.equal(await run(name=>document.querySelector(`input[aria-label="${name} 도크 폭"]`).checkVisibility(),name),false,'Width setting is secondary by default')
        for(const width of [207,280,360]){
          await setDockWidth(name,width)
          const geometry=await run(name=>{const n=[...document.querySelectorAll('.studio-dock-header button')].find(n=>n.getAttribute('aria-label')===name+' 도크 설정'),r=n.closest('aside').getBoundingClientRect(),header=n.closest('.studio-dock-header').getBoundingClientRect();return{dock:r.toJSON(),header:header.toJSON(),expanded:n.getAttribute('aria-expanded'),preferences:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),overflow:document.documentElement.scrollWidth>innerWidth}},name)
          assert.equal(geometry.preferences[name==='팔레트'?'palette':'properties'],width);assert.equal(geometry.expanded,'false');assert.equal(geometry.overflow,false)
          settings.push({name,width,...geometry})
        }
        await click(name+' 도크 닫기')
        assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),name+' 표시')
        await click(name+' 표시')
        assert.equal(await run(label=>[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===label).getAttribute('aria-expanded'),name+' 도크 설정'),'false')
        await setDockWidth(name,280)
      }
      assert.equal(await history(),'0회 수정')
      assert.deepEqual(await save('dock-settings-after'),before)
      fs.writeFileSync(path.join(scene,'dock-settings.json'),JSON.stringify(settings,null,2))
    }

    await run(()=>document.querySelector('.studio-status [role="radio"][aria-checked="true"]').focus())
    await key('Right',[],'.studio-status [role="radio"]')
    assert.equal(await run(()=>document.activeElement.textContent),'고정 배율')
    assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection,'Consumed view arrows must not navigate the score')
    await key('Left',[],'.studio-status [role="radio"]')
    assert.equal(await run(()=>document.activeElement.textContent),'폭 맞춤')
    assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection)
    assert.equal(await run(()=>document.querySelector('[aria-label="확대율 상태"]')?.textContent),'폭에 맞춰 자동 조절')
    assert.equal(await run(()=>[...document.querySelectorAll('label')].some(n=>n.textContent==='고정 확대율')),false)
    await click('고정 배율');await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='고정 확대율').control;n.focus();n.click()});await settle();await key('Home',[],'[role=combobox]');await key('Down',[],'[role=combobox]');await key('Down',[],'[role=combobox]');await key('Down',[],'[role=combobox]');await key('Enter',[],'[role=combobox]')
    assert.equal(await run(()=>document.querySelector('.score-canvas').style.getPropertyValue('--studio-notation-zoom')),'1.5')
    await click('폭 맞춤');await click('고정 배율')
    assert.equal(await run(()=>[...document.querySelectorAll('label')].find(n=>n.textContent==='고정 확대율').control.textContent.includes('150%')),true)
    // Extend the existing score-return key only from readonly lower view controls.
    // Open Select owns navigation; do not reinterpret it as a global F6 keymap.
    await run(()=>document.querySelector('.studio-status [role="combobox"]').focus())
    await key('F6',[],'.studio-status [role="combobox"]')
    assert.equal(await run(()=>document.activeElement.matches('.notation-event')),true)
    const returnId=await run(()=>document.activeElement.dataset.eventId)
    await key('F6',[],'.notation-event')
    assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'악보로 이동')
    await key('F6',[],'button[aria-label="악보로 이동"]')
    assert.equal(await run(()=>document.activeElement.dataset.eventId),returnId)
    await run(()=>document.querySelector('.studio-status [role="combobox"]').focus())
    await key('Enter',[],'.studio-status [role="combobox"]')
    await key('F6',[],'.studio-status [role="combobox"]')
    assert.equal(await run(()=>document.activeElement.getAttribute('aria-expanded')),'true')
    await key('Escape',[],'.studio-status [role="combobox"]')
    await run(()=>document.querySelector('.studio-status [role="radio"]').focus())
    await key('F6',[],'.studio-status [role="radio"]')
    assert.equal(await run(()=>document.activeElement.dataset.eventId),returnId)
    assert.equal(await history(),'0회 수정')
    fs.writeFileSync(path.join(scene,'status-f6.json'),JSON.stringify({closedSelectReturn:true,radioReturn:true,openSelectProtected:true,existingScoreCycle:true,returnId,history:await history()},null,2))
    await click('폭 맞춤');assert.deepEqual(await save('document-view-after'),before)
    assert.deepEqual(await run(()=>[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)),selection)
    const hierarchy=await run(()=>{const header=document.querySelector('.studio-document'),actions=document.querySelector('.studio-workspace-tools'),context=document.querySelector('.studio-status__context');return{inlineContext:document.querySelector('.studio-status').dataset.inlineContext==='true',contextBox:context.getBoundingClientRect().toJSON(),readoutBox:document.querySelector('.studio-status__readout').getBoundingClientRect().toJSON(),viewBox:document.querySelector('.studio-status__view-tools').getBoundingClientRect().toJSON(),contextBottom:context.getBoundingClientRect().bottom,readoutTop:document.querySelector('.studio-status__readout').getBoundingClientRect().top,viewTop:document.querySelector('.studio-status__view-tools').getBoundingClientRect().top,actionsInHeader:header.contains(actions),topReadouts:actions.querySelectorAll('.studio-workspace-tools__readout').length,lowerReadouts:context.querySelectorAll('.studio-workspace-tools__readout').length,context:context.textContent,labels:[...actions.querySelectorAll('button')].filter(n=>n.checkVisibility()).map(n=>({label:n.getAttribute('aria-label')||n.textContent,common:n.classList.contains('dd-button'),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})),headerOverflow:header.scrollWidth>header.clientWidth,contextOverflow:context.scrollWidth>context.clientWidth}})
    fs.writeFileSync(path.join(scene,'workspace-hierarchy.json'),JSON.stringify(hierarchy,null,2))
    if(hierarchy.inlineContext){
     const boxes=[hierarchy.contextBox,hierarchy.readoutBox,hierarchy.viewBox]
     assert.ok(boxes[0].left<=boxes[1].left&&boxes[1].left<=boxes[2].left,'Fitting context/readout/view must retain their horizontal reading order')
     assert.ok(Math.max(...boxes.map(b=>b.top))<Math.min(...boxes.map(b=>b.bottom)),'Inline status groups must actually share a row')
    }else assert.ok(hierarchy.contextBottom<=Math.min(hierarchy.readoutTop,hierarchy.viewTop),'Non-fitting context occupies its own first information row');assert.equal(hierarchy.actionsInHeader,true);assert.equal(hierarchy.topReadouts,0);assert.equal(hierarchy.lowerReadouts,4);assert.deepEqual(hierarchy.labels.map(n=>n.label),['악보 정보','악보로 이동','팔레트 표시','속성 표시']);assert.ok(hierarchy.labels.every(n=>n.common&&n.height>=(c.coarse?48:32)&&n.width>=(c.coarse?48:32)));assert.equal(hierarchy.headerOverflow,false);assert.equal(hierarchy.contextOverflow,false)
    fs.writeFileSync(path.join(scene,'workspace-hierarchy.json'),JSON.stringify(hierarchy,null,2))
    const status=await run(()=>{const root=document.querySelector('.studio-status'),live=root.querySelector('[role=status]'),group=root.querySelector('[role=radiogroup]'),r=root.getBoundingClientRect();return{afterScore:!!(document.querySelector('.studio-docks').compareDocumentPosition(root)&Node.DOCUMENT_POSITION_FOLLOWING),liveContainsControls:live.contains(group),bottom:r.bottom,top:r.top,height:r.height,viewport:innerHeight,overflow:root.scrollWidth>root.clientWidth,scrollHeight:root.scrollHeight,clientHeight:root.clientHeight,position:getComputedStyle(root).position}})
    assert.equal(status.afterScore,true);assert.equal(status.liveContainsControls,false);assert.equal(status.position,'sticky');assert.ok(status.top>=0&&Math.abs(status.bottom-status.viewport)<=1);assert.equal(status.overflow,false)
    fs.writeFileSync(path.join(scene,'status-view.json'),JSON.stringify(status,null,2))
    await capture('status-view-native')
    await click('악보로 이동')
    const keyboardAnchor=await run(()=>{const n=document.activeElement,b=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{event:n.classList.contains('notation-event'),id:n.dataset.eventId,top:b.top,bottom:b.bottom,visibleBottom:Math.min(innerHeight,footer.top)}})
    assert.equal(keyboardAnchor.event,true);assert.ok(keyboardAnchor.top>=0&&keyboardAnchor.bottom<=keyboardAnchor.visibleBottom,'Score return must reveal the selected event above the lower status area')
    await key('Right',[],'.notation-event');await key('Left',[],'.notation-event')
    const restoredAnchor=await run(()=>{const n=document.activeElement,b=n.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{id:n.dataset.eventId,top:b.top,bottom:b.bottom,visibleBottom:Math.min(innerHeight,footer.top)}})
    assert.equal(restoredAnchor.id,keyboardAnchor.id);assert.ok(restoredAnchor.top>=0&&restoredAnchor.bottom<=restoredAnchor.visibleBottom);assert.equal(await history(),'0회 수정')
    fs.writeFileSync(path.join(scene,'status-score-focus.json'),JSON.stringify({keyboardAnchor,restoredAnchor},null,2))
    await capture('status-score-focus')
    assert.equal(await history(),'0회 수정');await click('음표')
   }
   await run(()=>window.scrollTo(0,0));await settle()
   const metrics=await run(()=>{
    const box=n=>{if(!n?.checkVisibility())return null;const b=n.getBoundingClientRect();return{top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height}}
    const text=document.querySelector('.notation-preview .vf-notehead text'),ctx=document.createElement('canvas').getContext('2d'),style=getComputedStyle(text);ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const m=ctx.measureText(text.textContent),start=text.getStartPositionOfChar(0),matrix=text.getScreenCTM(),top=new DOMPoint(start.x-m.actualBoundingBoxLeft,start.y-m.actualBoundingBoxAscent).matrixTransform(matrix),bottom=new DOMPoint(start.x+m.actualBoundingBoxRight,start.y+m.actualBoundingBoxDescent).matrixTransform(matrix)
    const selectors={document:'.studio-document',menu:'.studio-application-menu',input:'.studio-note-toolbar',target:'.studio-input-target',context:'.studio-workspace-tools',legacy:'header.toolbar',status:'.studio-status',docks:'.studio-docks',palette:'#studio-palette',properties:'#studio-properties',canvas:'.score-canvas',staff:'.notation-preview .vf-stave'}
    const header=document.querySelector('.studio-document'),hs=getComputedStyle(header),contentHeight=Math.max(...[...header.children].map(n=>n.getBoundingClientRect().height));const expectedHeaderHeight=contentHeight+parseFloat(hs.paddingTop)+parseFloat(hs.paddingBottom)+parseFloat(hs.borderTopWidth)+parseFloat(hs.borderBottomWidth)
    return{expectedHeaderHeight,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,boxes:Object.fromEntries(Object.entries(selectors).map(([k,v])=>[k,box(document.querySelector(v))])),note:{top:top.y,bottom:bottom.y,left:top.x,right:bottom.x},selection:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),widths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1'))}
   })
   fs.writeFileSync(path.join(scene,'space-measured.json'),JSON.stringify(metrics,null,2))
   if(documentViewOnly){if(c.scale===1&&!c.coarse)assert.ok(Math.abs(metrics.boxes.document.height-metrics.expectedHeaderHeight)<=1,'Document header stays one title/state row plus system padding');assert.equal(metrics.overflow,false);const controls=await run(()=>[...document.querySelectorAll('.studio-status__view-tools button')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.ok(controls.every(n=>n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)));metrics.viewControls=controls;metrics.firstInkInViewport=metrics.note.top>=0&&metrics.note.bottom<=metrics.viewport[1];metrics.visibleScoreBottom=Math.min(metrics.viewport[1],metrics.boxes.status.top);metrics.firstInkFits=metrics.note.top>=0&&metrics.note.bottom<=metrics.visibleScoreBottom;metrics.scope='document header/status view contract; unoccluded first ink separately reported';if(c.width===1400&&c.height===800&&c.scale===1&&!c.coarse)assert.equal(metrics.firstInkFits,true,'1400x800 first ink stays unoccluded after view/file tasks')}
   await capture('workspace-default');fs.writeFileSync(path.join(scene,'space.json'),JSON.stringify(metrics,null,2));records.push({...c,metrics})
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  const source=await save('source')
  if(harmonyPropertiesOnly){
   console.log(step+':harmony-properties')
   const field='input[aria-label="선택 요약 코드"]'
   const openChord=async()=>{await click('가사');await click('코드 심벌 편집');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 코드'&&document.activeElement.checkVisibility())}
   const enterText=async text=>{await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select()},field);await win.webContents.insertText(text);await key('Enter',[],field)}
   await click('속성 도크 닫기');await click('가사');assert.equal(await run(()=>document.querySelector('.studio-harmony-entry input')),null);await run(()=>{const n=document.querySelector('.studio-harmony-entry button');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-harmony-entry button')
   await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 코드'&&document.activeElement.checkVisibility());assert.equal(await history(),'0회 수정')
   await enterText('H13');assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/지원하는 코드 심벌 형식/)
   await enterText('C7/G');assert.equal(await history(),'1회 수정')
   const edited=await save('harmony-edited'),harmony=edited.harmonies[0],expected=structuredClone(source);expected.harmonies=[harmony];assert.deepEqual(edited,expected);assert.equal(harmony.text,'C7/G');assert.equal(harmony.measureId,source.parts[0].staves[0].measures[0].id);assert.equal(harmony.tick,0)
   await openChord();await run(selector=>{const n=document.querySelector(selector);n.select()},field);await win.webContents.insertText('Dm7');await key('F6',[],field);assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'선택 요약 코드');await key('Escape',[],field);assert.deepEqual(await save('harmony-escape'),expected)
   await openChord();await run(selector=>{const n=document.querySelector(selector);window.__oldHarmonyField=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'Am7');n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true}));n.blur()},field);assert.equal(await history(),'1회 수정')
   await selectRenderedMeasure(source.parts[0].staves[0].measures[1].id);await run(()=>{const n=window.__oldHarmonyField;n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));n.dispatchEvent(new FocusEvent('blur',{bubbles:true}))});assert.deepEqual(await save('harmony-stale-isolated'),expected)
   await openChord();assert.equal(await run(selector=>document.querySelector(selector).value,field),'');await enterText('Fmaj7');assert.equal(await history(),'2회 수정');const second=await save('harmony-measure');assert.equal(second.harmonies.find(n=>n.measureId===source.parts[0].staves[0].measures[1].id).tick,0);assert.equal(second.harmonies.find(n=>n.measureId===source.parts[0].staves[0].measures[1].id).text,'Fmaj7');assert.deepEqual(second.harmonies.find(n=>n.id===harmony.id),harmony);const without=structuredClone(second);without.harmonies=[harmony];assert.deepEqual(without,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('harmony-measure-undo'),expected);await key('Z',['control']);assert.deepEqual(await save('harmony-undo'),source);await key('Z',['control','shift']);assert.deepEqual(await save('harmony-redo'),expected)
   openFile=path.join(scene,'harmony-edited.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('harmony-reopened'),expected);openFile=path.join(scene,'source.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('harmony-final'),source)
   await openChord();await run(selector=>document.querySelector(selector).scrollIntoView({block:'center'}),field);await settle();const geometry=await run(()=>{const root=document.querySelector('.studio-selected-properties'),field=document.querySelector('input[aria-label="선택 요약 코드"]'),b=field.getBoundingClientRect(),r=root.getBoundingClientRect();return{legacy:field.closest('.studio-chrome')!==null,common:!!field.closest('.dd-input-row'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,overflow:document.documentElement.scrollWidth>innerWidth}});assert.equal(geometry.legacy,false);assert.equal(geometry.common,true);assert.equal(geometry.overflow,false);assert.ok(geometry.inside&&geometry.width>=(c.coarse?48:32)&&geometry.height>=(c.coarse?48:32));fs.writeFileSync(path.join(scene,'harmony-properties.json'),JSON.stringify(geometry,null,2));await capture('harmony-properties');await click('가사');await run(()=>document.querySelector('.studio-harmony-entry').scrollIntoView({block:'center'}));await capture('harmony-entry')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   clearTimeout(deadline);records.push({...c,scope:'harmony-properties',singleInspector:true,invalidRetry:true,escapeAndIme:true,staleSelectionIsolated:true,measureTickZero:true,exactUndoRedo:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(lyricToolsOnly){
   console.log(step+':lyric-tools')
   await click('가사')
   const verse='.studio-lyric-tools [role="combobox"]',input='input[aria-label="선택 음표 가사"]'
   await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사')
   assert.equal(await history(),'0회 수정')
   if(inlineLyricLayerOnly){
    const layer=await run(()=>{
     const input=document.querySelector('input[aria-label="선택 음표 가사"]'),host=input.closest('foreignObject'),box=input.getBoundingClientRect()
     const context=document.createElement('canvas').getContext('2d')
     const marks=[...host.ownerSVGElement.querySelectorAll('text.notation-dynamic-mark')].map(mark=>{
      const style=getComputedStyle(mark);context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      context.textAlign=style.textAnchor==='middle'?'center':style.textAnchor==='end'?'right':'left'
      const ink=context.measureText(mark.textContent),x=mark.x.baseVal[0].value,y=mark.y.baseVal[0].value,matrix=mark.getScreenCTM()
      const a=new DOMPoint(x-ink.actualBoundingBoxLeft,y-ink.actualBoundingBoxAscent).matrixTransform(matrix),b=new DOMPoint(x+ink.actualBoundingBoxRight,y+ink.actualBoundingBoxDescent).matrixTransform(matrix)
      return {text:mark.textContent,ink:{left:a.x,top:a.y,right:b.x,bottom:b.y},overlaps:a.x<box.right&&b.x>box.left&&a.y<box.bottom&&b.y>box.top,
       paintsAfterEditor:Boolean(host.compareDocumentPosition(mark)&Node.DOCUMENT_POSITION_FOLLOWING)}
     })
     return {box:box.toJSON(),marks,focused:document.activeElement===input,hostLast:host===host.ownerSVGElement.lastElementChild}
    })
    fs.writeFileSync(path.join(scene,'inline-lyric-layer.json'),JSON.stringify(layer,null,2));await capture('inline-lyric-layer')
    assert.equal(layer.focused,true);assert.ok(layer.marks.some(mark=>mark.overlaps),'Exercise actual dynamic ink intersecting the editor')
    assert.ok(layer.marks.filter(mark=>mark.overlaps).every(mark=>!mark.paintsAfterEditor),'Notation ink must paint behind the active text editor')
    assert.equal(layer.hostLast,true,'The editor must be appended after notation/playback overlays before focus restoration')
   }
   if(inlineLyricDraft){
    const previousSvgWidth=await run(()=>document.querySelector('.notation-preview > svg').viewBox.baseVal.width)
    const draftTrace=[]
    const recordDraft=async phase=>{draftTrace.push(await run(phase=>{
     const old=window.__lyricDraftInput,n=document.querySelector('input[aria-label="선택 음표 가사"]')
     const state=n=>n?{connected:n.isConnected,value:n.value,start:n.selectionStart,end:n.selectionEnd,direction:n.selectionDirection,data:{...n.dataset},focused:n===document.activeElement}:null
     return {phase,old:state(old),current:state(n),same:old===n,active:{tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}}
    },phase));fs.writeFileSync(path.join(scene,'inline-lyric-draft-trace.json'),JSON.stringify(draftTrace,null,2))}
    await run(()=>{const n=document.querySelector('input[aria-label="선택 음표 가사"]');window.__lyricDraftInput=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))})
    await win.webContents.insertText('한글초안')
    await run(()=>document.querySelector('input[aria-label="선택 음표 가사"]').setSelectionRange(1,3,'backward'))
    const resizeTargetWidth=c.width===1400?960:c.width+400
    if(inlineLyricResize)win.setContentSize(resizeTargetWidth,c.height??800)
    else await run(()=>document.fonts.dispatchEvent(new Event('loadingdone')))
    await settle()
    assert.equal(await run(()=>{const n=window.__lyricDraftInput;return n.isConnected&&n===document.activeElement&&n.dataset.editorComposing==='true'&&n.value==='한글초안'}),true,'Font refresh during composition must retain the live input/draft')
    await recordDraft('composing-after-refresh')
    for(const keyCode of ['Enter','Escape']){await key(keyCode,[],input);assert.equal(await history(),'0회 수정');await recordDraft('composing-after-'+keyCode)}
    await run(()=>window.__lyricDraftInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})))
    await settle();await recordDraft('after-composition-end')
    try{await wait(()=>{const n=document.querySelector('input[aria-label="선택 음표 가사"]');return n&&n!==window.__lyricDraftInput&&n===document.activeElement&&n.value==='한글초안'})}catch(error){await recordDraft('wait-timeout');throw error}
    const draft=await run(()=>{const n=document.activeElement;return {value:n.value,start:n.selectionStart,end:n.selectionEnd,direction:n.selectionDirection,oldReplacing:window.__lyricDraftInput.dataset.editorReplacing}})
    assert.deepEqual(draft,{value:'한글초안',start:1,end:3,direction:'backward',oldReplacing:'true'});assert.equal(await history(),'0회 수정')
    const currentSvgWidth=await run(()=>document.querySelector('.notation-preview > svg').viewBox.baseVal.width)
    if(inlineLyricResize)assert.notEqual(currentSvgWidth,previousSvgWidth,'Resize fixture must actually change the rendered layout width')
    fs.writeFileSync(path.join(scene,'inline-lyric-draft.json'),JSON.stringify({syntheticComposition:true,physicalImeVerified:false,syntheticFontRefresh:!inlineLyricResize,actualFontDownloadVerified:false,resize:inlineLyricResize?{from:c.width,to:resizeTargetWidth,previousSvgWidth,currentSvgWidth}:null,draft,history:0},null,2))
    await key('Escape',[],input);assert.equal(await history(),'0회 수정')
    if(inlineLyricResize){win.setContentSize(c.width,c.height??800);await settle()}
    await click('가사')
    await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사')
    assert.equal(await run(()=>document.activeElement.value),'')
   }
   if(inlineLyricAudit){
    const audit=await run(()=>{
     const n=document.querySelector('input[aria-label="선택 음표 가사"]'),style=getComputedStyle(n),box=n.getBoundingClientRect(),host=n.closest('foreignObject')
     return {label:n.getAttribute('aria-label'),tag:n.tagName,publicInput:Boolean(n.closest('.dd-input-row')),focused:document.activeElement===n,
      box:box.toJSON(),host:{width:host.getAttribute('width'),height:host.getAttribute('height')},font:style.font,fontSize:style.fontSize,borderColor:style.borderTopColor,background:style.backgroundColor,radius:style.borderRadius,
      eventId:n.dataset.eventId,verse:n.dataset.lyricNumber,documentKey:n.dataset.documentKey,sourceValue:n.dataset.sourceValue,
      viewport:[innerWidth,innerHeight],footer:document.querySelector('.studio-status').getBoundingClientRect().top,coarse:matchMedia('(pointer:coarse)').matches}
    })
    audit.requiredMinimum=c.coarse?48:32;audit.targetConforms=audit.box.width>=audit.requiredMinimum&&audit.box.height>=audit.requiredMinimum
    audit.designMigrationPassed=audit.publicInput&&audit.targetConforms
    fs.writeFileSync(path.join(scene,'inline-lyric-audit.json'),JSON.stringify(audit,null,2));await capture('inline-lyric-audit')
    assert.equal(audit.label,'선택 음표 가사');assert.equal(audit.focused,true);assert.ok(audit.box.width>0&&audit.box.height>0)
    if(inlineLyricMigration){assert.equal(audit.designMigrationPassed,true,'Approved inline editor must use the real public Input and meet target size');assert.equal(audit.radius,'10px');if(c.scale===2)assert.ok(parseFloat(audit.fontSize)>=28,'Inline editor itself must actually enlarge,not just surrounding chrome')}
    // Audit alone records existing violations;the opt-in migration gate asserts the approved contract.
   }
   if(inlineEditorZoomOnly){
    const zoomRows=[],zoomSelector='.studio-status__view-tools [role="combobox"]'
    const inspectEditor=async(kind,selector,zoom)=>{
     await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center',inline:'nearest'});n.focus()},selector);await settle()
     const row=await run(({kind,selector,zoom})=>{const n=document.querySelector(selector),r=n.getBoundingClientRect(),style=getComputedStyle(n),label=n.labels?.[0],x=r.x+r.width/2,y=r.y+r.height/2;return{kind,zoom,box:r.toJSON(),fontSize:style.fontSize,pageZoom:getComputedStyle(n.closest('.score-page')).zoom,publicInput:!!n.closest('.dd-input-row'),label:label?.textContent,labelLinked:label?.htmlFor===n.id,hiddenLabel:label?.classList.contains('dd-input-label--sr-only'),hit:document.elementFromPoint(x,y)===n,pointerEvents:style.pointerEvents,hitTag:document.elementFromPoint(x,y)?.tagName,overflow:document.documentElement.scrollWidth>innerWidth+1,x,y}}, {kind,selector,zoom})
     zoomRows.push(row);fs.writeFileSync(path.join(scene,'inline-editor-zoom.json'),JSON.stringify(zoomRows,null,2));await capture('zoom-'+zoom+'-'+kind)
     assert.equal(row.overflow,false);assert.equal(row.publicInput,true);assert.equal(row.labelLinked,true);assert.equal(row.hiddenLabel,true);assert.ok(row.box.width>=(c.coarse?48:32)&&row.box.height>=(c.coarse?48:32),'Each real editor must retain the shared pointer target at score zoom:'+JSON.stringify(row));assert.equal(row.hit,true,'Actual pointer must reach the public input')
     for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:row.x,y:row.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle()
     assert.equal(await run(selector=>document.activeElement?.matches(selector),selector),true)
     if(inlineEditorContextOnly){
      await run(selector=>document.querySelector(selector).select(),selector);await win.webContents.insertText('우클릭 전 초안');await run(selector=>document.querySelector(selector).setSelectionRange(1,3,'backward'),selector)
      const context=await run(selector=>{const n=document.querySelector(selector),box=n.getBoundingClientRect(),before={value:n.value,start:n.selectionStart,end:n.selectionEnd,direction:n.selectionDirection,selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)},event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:box.x+box.width/2,clientY:box.top+1,button:2});n.dispatchEvent(event);return{before,prevented:event.defaultPrevented,point:{x:box.x+box.width/2,y:box.top+1}}},selector)
      await settle();context.after=await run(selector=>{const n=document.querySelector(selector);return{exists:!!n,focused:n===document.activeElement,value:n?.value,start:n?.selectionStart,end:n?.selectionEnd,direction:n?.selectionDirection,menu:!!document.querySelector('.studio-measure-context-menu'),selected:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId)}},selector)
      row.context=context;fs.writeFileSync(path.join(scene,'inline-editor-zoom.json'),JSON.stringify(zoomRows,null,2));await capture('context-'+zoom+'-'+kind)
      assert.equal(context.prevented,false,'Text editor context must not be consumed by the score background menu');assert.equal(context.after.menu,false);assert.equal(context.after.focused,true);assert.equal(context.after.value,context.before.value);assert.equal(context.after.start,context.before.start);assert.equal(context.after.end,context.before.end);assert.equal(context.after.direction,context.before.direction);assert.deepEqual(context.after.selected,context.before.selected)
     }
    }
    for(const zoom of [75,100,200]){
     await clickButton('고정 배율');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'nearest'});n.focus()},zoomSelector)
     await key('Enter',[],zoomSelector);await key('Home',[],zoomSelector);for(let i=0;i<[75,100,125,150,200].indexOf(zoom);i++)await key('Down',[],zoomSelector);await key('Enter',[],zoomSelector)
     await click('가사');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사')
     await inspectEditor('lyric',input,zoom);await win.webContents.insertText('취소할 배율 초안');await key('Escape',[],input);assert.equal(await history(),'0회 수정')
     const title='button[aria-label="악보 제목 수정"]';await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},title);await key('Enter',[],title)
     const field='input[aria-label="악보 제목"]';await inspectEditor('title',field,zoom);await win.webContents.insertText('취소할 제목');await key('Escape',[],field);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('zoom-'+zoom+'-preserved'),source)
    }
    await clickButton('폭 맞춤');await click('가사');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사')
    if(inlineEditorContextOnly){
     const background=await run(()=>{const n=document.querySelector('.notation-measure'),r=n.getBoundingClientRect(),event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+2,clientY:r.top+2,button:2});n.dispatchEvent(event);return{prevented:event.defaultPrevented}});await settle()
     assert.equal(background.prevented,true);assert.equal(await run(()=>!!document.querySelector('.studio-measure-context-menu')),true,'The real score background keeps its measure menu')
     assert.equal(await run(()=>!!document.activeElement.closest('.studio-measure-context-menu')),true);await key('Escape')
     await run(()=>document.querySelector('.notation-event[data-event-id="m1-c4"]').scrollIntoView({block:'center',inline:'nearest'}));await settle()
     const point=await run(()=>{const n=document.querySelector('.notation-event[data-event-id="m1-c4"]'),r=n.querySelector('rect').getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(document.elementFromPoint(x,y)?.closest('.notation-event')!==n)throw Error('Restored note must be an actual pointer target');return{x,y}})
     for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle();await click('가사');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사'&&document.activeElement.dataset.eventId==='m1-c4');assert.equal(await history(),'0회 수정')
     fs.writeFileSync(path.join(scene,'background-context-control.json'),JSON.stringify({syntheticContextAtActualCoordinates:true,measureMenuPreserved:true,escapeRestores:true,actualNotePointerAndSelection:true,historyZero:true},null,2))
    }
   }
   if(inlineLyricEnter){
    await run(selector=>document.querySelector(selector).select(),input);await win.webContents.insertText('첫 음절');await key('Enter',[],input)
    await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사'&&document.activeElement.dataset.eventId==='m1-d4')
    assert.equal(await history(),'1회 수정')
    const withEnter=structuredClone(source);withEnter.parts[0].staves[0].measures[0].voices[0].events[0].lyrics=[{number:1,syllabic:'single',text:'첫 음절'}]
    assert.deepEqual(await save('lyric-enter'),withEnter);assert.equal(await history(),'1회 수정','Enter plus the real following blur must remain one command')
    await key('Z',['control']);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('lyric-enter-undo'),source)
    await click('가사');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사'&&document.activeElement.dataset.eventId==='m1-c4')
    fs.writeFileSync(path.join(scene,'inline-enter-contract.json'),JSON.stringify({nativeEnter:true,selectedNextEvent:'m1-d4',oneCommandAfterFollowingBlur:true,exactUndo:true,selectionRestored:'m1-c4',physicalIme:false},null,2))
   }
   await run(()=>{const n=[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent.trim()==='텍스트');if(!n?.checkVisibility())throw Error('Missing actual text family');if(n.getAttribute('aria-expanded')==='false')n.click()});await settle()
   await click('가사·코드 편집 열기');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사');assert.equal(await history(),'0회 수정')
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},verse)
   await key('Enter',[],verse);await key('Down',[],verse);await key('Escape',[],verse);assert.equal(await history(),'0회 수정')
   await key('Enter',[],verse);await key('Down',[],verse);await key('Enter',[],verse);assert.equal(await history(),'0회 수정')
   await wait(()=>document.querySelector('input[aria-label="선택 음표 가사"]')?.dataset.lyricNumber==='2')
   await run(()=>{const n=[...document.querySelectorAll('.studio-lyric-tools button')].find(n=>n.textContent.trim()==='가사 글자 입력');if(!n?.checkVisibility())throw Error('Missing actual lyric entry command');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-lyric-tools button:focus')
   await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사'&&document.activeElement.dataset.lyricNumber==='2')
   await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Actual inline lyric editor must be visible');n.select()},input);await win.webContents.insertText('노래');await key('Tab',[],input);assert.equal(await history(),'1회 수정')
   const withText=await save('lyric-text'),expectedText=structuredClone(source);expectedText.parts[0].staves[0].measures[0].voices[0].events[0].lyrics=[{number:2,syllabic:'single',text:'노래'}];assert.deepEqual(withText,expectedText)
   await click('가사')
   // Resolve the labelled public control instead of depending on field order.
   const focusSyllable=async()=>{await run(()=>{const root=document.querySelector('.studio-lyric-tools'),label=[...root.querySelectorAll('label')].find(n=>n.textContent==='가사 음절'),n=document.getElementById(label.htmlFor);n.scrollIntoView({block:'center'});n.focus()});await settle()}
   await focusSyllable();await key('Enter',[],'.studio-lyric-tools [role="combobox"]:focus');await key('Down',[],'.studio-lyric-tools [role="combobox"]:focus');await key('Enter',[],'.studio-lyric-tools [role="combobox"]:focus');assert.equal(await history(),'2회 수정')
   await run(()=>{const n=document.querySelector('.studio-lyric-tools input[type="checkbox"]');n.scrollIntoView({block:'center'});n.focus()});await key('Space',[],'.studio-lyric-tools input[type="checkbox"]');assert.equal(await history(),'3회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const edited=await save('lyric-edited'),expected=structuredClone(expectedText);Object.assign(expected.parts[0].staves[0].measures[0].voices[0].events[0].lyrics[0],{syllabic:'begin',extend:true});assert.deepEqual(edited,expected)
   openFile=path.join(scene,'lyric-edited.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('lyric-edited-reopened'),expected)
   // Reopen is a history boundary. Restore the owned source, then exercise exact undo separately.
   openFile=path.join(scene,'source.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('lyric-source-reopened'),source)
   await click('가사');await wait(()=>document.querySelector('input[aria-label="선택 음표 가사"]'))
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select()},input);await win.webContents.insertText('노래');await key('Tab',[],input);assert.equal(await history(),'1회 수정');await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('lyric-undo'),source);await key('Z',['control','shift']);assert.deepEqual(await save('lyric-redo'),expectedText);await key('Z',['control']);assert.deepEqual(await save('lyric-final'),source)
   await selectRenderedMeasure(source.parts[0].staves[0].measures[1].id);await click('가사')
   await wait(()=>document.activeElement?.getAttribute('aria-label')==='가사 속성')
   assert.equal(await run(()=>!!document.querySelector('input[aria-label="선택 음표 가사"]')),false)
   assert.deepEqual(await save('lyric-no-note'),source)
   openFile=path.join(scene,'source.chromatics');await click('프로젝트 열기');await settle()
   await click('가사');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 음표 가사')
   await run(()=>document.querySelector('.studio-lyric-tools').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-lyric-tools'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('.dd-select,.dd-check')].map(n=>{const b=n.getBoundingClientRect();return{label:n.textContent,width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right}})}})
   assert.equal(geometry.legacy,false);assert.equal(geometry.overflow,false);assert.equal(geometry.controls.length,3);assert.ok(geometry.controls.every(b=>b.inside&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)));fs.writeFileSync(path.join(scene,'lyric-tools.json'),JSON.stringify(geometry,null,2));await capture('lyric-tools')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   clearTimeout(deadline);records.push({...c,scope:'lyric-tools',menuPaletteAndButtonFocus:true,noNoteGuidanceFocus:true,inlineInput:true,verseNoHistory:true,exactNativeScore:true,exactUndoRedo:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(notationPropertiesOnly){
   console.log(step+':notation-properties')
   const closeProperties=async()=>{if(!await run(()=>document.querySelector('#studio-properties').checkVisibility()))await clickButton('속성 표시');await clickButton('속성 도크 닫기')}
   await openNotationSettings('clef')
   assert.equal(await run(()=>document.querySelector('.studio-notation-tools .studio-chrome')),null)
   assert.equal(await run(()=>document.querySelectorAll('.studio-notation-tools input,.studio-notation-tools select').length),1,'Only the repeat count remains an input;no duplicate text or dynamic editor')
   assert.equal(await run(()=>document.querySelector('.studio-measure-notation [role="combobox"]').disabled),true,'Measure clef retains its measure-only edit scope')
   await closeProperties()
   await run(()=>{const n=[...document.querySelectorAll('.studio-measure-notation button')].find(n=>n.textContent==='텍스트 표기 편집');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-measure-notation button:focus')
   const field='input[aria-label="선택 요약 보표 글자"]'
   await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 보표 글자'&&document.activeElement.checkVisibility());assert.equal(await history(),'0회 수정')
   await run(selector=>{const n=document.querySelector(selector);n.select()},field);await win.webContents.insertText('cantabile');await key('Enter',[],field);assert.equal(await history(),'1회 수정')
   const textScore=await save('notation-text'),expectedText=structuredClone(source);expectedText.staffTexts[0].text='cantabile';assert.deepEqual(textScore,expectedText)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('notation-text-undo'),source)
   await openNotationSettings('clef');await run(()=>{const n=[...document.querySelectorAll('.studio-measure-notation button')].find(n=>n.textContent==='셈여림 편집');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-measure-notation button:focus')
   const dynamic='.studio-selected-properties [aria-label="작업 마디의 표기"] [role="combobox"]'
   await wait(()=>document.activeElement?.matches('.studio-selected-properties [aria-label="작업 마디의 표기"] [role="combobox"]')&&document.activeElement.checkVisibility());await key('Enter',[],dynamic);await key('Down',[],dynamic);await key('Down',[],dynamic);await key('Enter',[],dynamic);assert.equal(await history(),'1회 수정')
   const dynamicScore=await save('notation-dynamic'),expectedDynamic=structuredClone(source);expectedDynamic.dynamics[0].value='ff';assert.deepEqual(dynamicScore,expectedDynamic)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('notation-dynamic-undo'),source)
   await selectRenderedMeasure(source.parts[0].staves[0].measures[0].id);await openNotationSettings('clef')
   const clef='.studio-measure-notation [role="combobox"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},clef);await key('Enter',[],clef);await key('Down',[],clef);await key('Escape',[],clef);assert.equal(await history(),'0회 수정')
   await key('Enter',[],clef);await key('Down',[],clef);await key('Enter',[],clef);assert.equal(await history(),'1회 수정');const clefScore=await save('notation-clef'),expectedClef=structuredClone(source);expectedClef.parts[0].staves[0].measures[0].clef={sign:'F',line:4};assert.deepEqual(clefScore,expectedClef)
   await openNotationSettings('clef');await run(selector=>document.querySelector(selector).focus(),clef);await key('Z',['control'],clef);assert.deepEqual(await save('notation-clef-undo'),source)
   await closeProperties();if(!await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion > button')].find(n=>n.textContent==='텍스트')?.getAttribute('aria-expanded')==='true'))await click('텍스트');await click('텍스트 표기 설정 열기');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 보표 글자'&&document.activeElement.checkVisibility());assert.equal(await history(),'0회 수정')
   await capture('notation-inspector-route')
   await openNotationSettings('clef');await run(()=>document.querySelector('.studio-measure-notation').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-measure-notation'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.textContent,width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,common:n.classList.contains('dd-button')||n.classList.contains('dd-select')}})}})
   assert.equal(geometry.legacy,false);assert.equal(geometry.overflow,false);assert.ok(geometry.controls.every(b=>b.common&&b.inside&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)));fs.writeFileSync(path.join(scene,'notation-properties.json'),JSON.stringify(geometry,null,2));await capture('notation-properties')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'notation-clef-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('notation-reopened'),source)
   clearTimeout(deadline);records.push({...c,scope:'notation-properties',realInspectorFocus:true,noDuplicateEditors:true,exactUndo:true,clefScopeAndCancel:true,paletteRoute:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(repeatToolsOnly){
   console.log(step+':repeat-tools')
   await selectRenderedMeasure(source.parts[0].staves[0].measures[0].id)
   const field='.studio-repeat-tools input[aria-label="반복 횟수"]'
   const edit=async text=>{await openNotationSettings('repeat');await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility()||n.disabled)throw Error('Repeat count unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()},field);if(text)await win.webContents.insertText(text);else await key('Backspace',[],field);await settle()}
   const focus=async label=>{await openNotationSettings('repeat');await run(label=>{const n=document.querySelector(`.studio-repeat-tools button[aria-label="${label}"]`);if(!n?.checkVisibility()||n.disabled)throw Error('Unavailable repeat button:'+label);n.scrollIntoView({block:'center'});n.focus()},label)}
   const undo=async name=>{await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save(name),source)}
   await focus('도돌이표 시작');await key('Space',[],'.studio-repeat-tools button[aria-label="도돌이표 시작"]');assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const start=await save('repeat-start'),expected=structuredClone(source);expected.parts[0].staves[0].measures[0].repeat={start:true};assert.deepEqual(start,expected);await undo('repeat-start-undo')
   await edit('4');assert.equal(await history(),'0회 수정');await key('Escape',[],field);assert.equal(await run(selector=>document.querySelector(selector).value,field),'2');assert.equal(await history(),'0회 수정')
   await edit('3');await key('Enter',[],field);assert.equal(await history(),'1회 수정');const times=await save('repeat-times'),expectedTimes=structuredClone(source);expectedTimes.parts[0].staves[0].measures[0].repeat={end:true,times:3};assert.deepEqual(times,expectedTimes);await undo('repeat-times-undo');await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual(await save('repeat-times-redo'),expectedTimes);await undo('repeat-times-restored')
   await edit('');await key('Tab',[],field);assert.equal(await history(),'0회 수정');assert.equal(await run(selector=>document.querySelector(selector).value,field),'2')
   await edit('12');await key('Enter',[],field);assert.equal((await save('repeat-clamp')).parts[0].staves[0].measures[0].repeat.times,8);await undo('repeat-clamp-undo')
   await openNotationSettings('repeat');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))},field);await win.webContents.insertText('7');await run(selector=>{const n=document.querySelector(selector);window.__staleRepeat=n;n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}));n.blur();n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))},field);await settle();assert.equal(await history(),'0회 수정')
   await run(()=>document.querySelector('.notation-event[data-event-id="m2-1"]').scrollIntoView({block:'center'}));await settle();await ensureNativeFocus()
   const hit=await run(()=>{const host=document.querySelector('.notation-event[data-event-id="m2-1"]'),text=host.querySelector('.vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontSize} ${style.fontFamily}`;const b=ctx.measureText(text.textContent),p=new DOMPoint(text.x.baseVal[0].value+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,text.y.baseVal[0].value+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(text.getScreenCTM());if(!host.contains(document.elementFromPoint(p.x,p.y)))throw Error('Repeat stale-selection ink occluded');return{x:p.x,y:p.y}})
   for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:hit.x,y:hit.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle();assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),'m2-1');await run(()=>window.__staleRepeat.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));assert.deepEqual(await save('repeat-stale-isolation'),source)
   await selectRenderedMeasure(source.parts[0].staves[0].measures[1].id);await openNotationSettings('repeat');assert.equal(await run(selector=>document.querySelector(selector).value,field),'2');await focus('도돌이표 끝');await key('Enter',[],'.studio-repeat-tools button:focus');const end=await save('repeat-end');assert.deepEqual(end.parts[0].staves[0].measures[1].repeat,{end:true,times:2});assert.deepEqual(end.parts[0].staves[0].measures[0],source.parts[0].staves[0].measures[0]);await undo('repeat-end-undo')
   await focus('1번 볼타');await key('Enter',[],'.studio-repeat-tools button:focus');const volta=await save('repeat-volta');assert.equal(volta.parts[0].staves[0].measures[1].volta.number,1);assert.deepEqual(volta.parts.map(p=>p.staves.map(s=>s.measures.map(m=>m.voices))),source.parts.map(p=>p.staves.map(s=>s.measures.map(m=>m.voices))));await undo('repeat-volta-undo')
   await openNotationSettings('repeat');await run(()=>document.querySelector('.studio-repeat-tools').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-repeat-tools'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button,input')].map(n=>{const b=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,common:n.matches('.dd-button')||!!n.closest('.dd-input-row')}})}})
   assert.equal(geometry.legacy,false);assert.equal(geometry.overflow,false);assert.ok(geometry.controls.every(b=>b.common&&b.inside&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)));fs.writeFileSync(path.join(scene,'repeat-tools.json'),JSON.stringify(geometry,null,2));await capture('repeat-tools')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'repeat-volta-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('repeat-reopened'),source)
   clearTimeout(deadline);records.push({...c,scope:'repeat-tools',spaceNoPlayback:true,oneCommitOneUndo:true,exactUndoRedo:true,compositionAndStaleIsolation:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(rangeToolsOnly){
   console.log(step+':range-tools')
   const selectRange=async()=>{
    await openNotationSettings('range')
    for(const [id,shift] of [['m1-c4',false],['m1-f-sharp-4',true]]){
     await run(id=>document.querySelector(`.notation-event[data-event-id="${id}"]`).scrollIntoView({block:'center',inline:'nearest'}),id);await settle();await ensureNativeFocus()
     const hit=await run(id=>{const host=document.querySelector(`.notation-event[data-event-id="${id}"]`),text=host.querySelector('.vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontSize} ${style.fontFamily}`;const b=ctx.measureText(text.textContent),p=new DOMPoint(text.x.baseVal[0].value+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,text.y.baseVal[0].value+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(text.getScreenCTM());if(!host.contains(document.elementFromPoint(p.x,p.y)))throw Error('Range note ink occluded:'+id);return{x:p.x,y:p.y}},id)
     for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:hit.x,y:hit.y,modifiers:shift?['shift']:[],...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle()
    }
    assert.equal(await run(()=>document.querySelector('.studio-range-tools [aria-label="크레셴도 헤어핀"]').disabled),false)
   }
   const focus=label=>run(label=>{const n=[...document.querySelectorAll('.studio-range-tools button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n?.checkVisibility()||n.disabled)throw Error('Unavailable range tool:'+label);n.scrollIntoView({block:'center'});n.focus()},label)
   const undo=async name=>{await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save(name),source)}
   await selectRange();await focus('디미누엔도 헤어핀');await key('Space',[],'.studio-range-tools button[aria-label="디미누엔도 헤어핀"]');assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const changed=await save('range-diminuendo'),expected=structuredClone(source);expected.hairpins.find(s=>s.id==='release-hairpin').type='diminuendo';assert.deepEqual(changed,expected)
   await undo('range-diminuendo-undo');await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual(await save('range-diminuendo-redo'),expected);await undo('range-diminuendo-restored')
   await selectRange();await focus('8va');await key('Enter',[],'.studio-range-tools button:focus');assert.equal(await history(),'1회 수정');const octave=await save('range-octave');assert.equal(octave.octaveShifts.length,1);assert.deepEqual(octave.octaveShifts[0],{id:octave.octaveShifts[0].id,type:'8va',startEventId:'m1-c4',endEventId:'m1-f-sharp-4'});const without=structuredClone(octave);delete without.octaveShifts;assert.deepEqual(without,source);await undo('range-octave-undo')
   await selectRange();await focus('슬러 추가 또는 해제, 단축키 S');await key('Enter',[],'.studio-range-tools button:focus');assert.equal(await history(),'1회 수정');const slur=await save('range-slur'),expectedSlur=structuredClone(source);expectedSlur.slurs=expectedSlur.slurs.filter(s=>s.id!=='release-slur');assert.deepEqual(slur,expectedSlur);await undo('range-slur-undo')
   await selectRange();await run(()=>document.querySelector('.studio-range-tools').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-range-tools'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect(),svg=n.querySelector('svg');return{label:n.getAttribute('aria-label')||n.textContent,common:n.classList.contains('dd-button'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,stroke:svg?.getAttribute('stroke-width'),icon:svg?{width:svg.getBoundingClientRect().width,height:svg.getBoundingClientRect().height}:null}})}})
   assert.equal(geometry.legacy,false);assert.equal(geometry.overflow,false);assert.ok(geometry.buttons.every(b=>b.common&&b.inside&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)));assert.ok(geometry.buttons.filter(b=>b.icon).every(b=>b.stroke==='1.75'&&b.icon.width===18&&b.icon.height===18));fs.writeFileSync(path.join(scene,'range-tools.json'),JSON.stringify(geometry,null,2));await capture('range-tools')
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'range-slur-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('range-reopened'),source)
   clearTimeout(deadline);records.push({...c,scope:'range-tools',realInkPointerRange:true,spaceNoPlayback:true,exactUndoRedo:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(tempoToolsOnly){
   await click('악보')
   const slider='.studio-tempo-tools input[type="range"]',beat='.studio-tempo-tools [role="combobox"]'
   assert.equal(await run(()=>document.querySelector('.studio-tempo-tools').closest('.studio-chrome')),null)
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},slider)
   await key('Right',[],slider);assert.equal(await history(),'1회 수정');await key('Space',[],slider);assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const changed=await save('tempo-bpm');assert.equal(changed.tempo.bpm,source.tempo.bpm+1);assert.deepEqual(changed.parts,source.parts)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('tempo-bpm-undo'),source)
   await click('악보');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},beat)
   await key('Enter',[],beat);for(let n=0;n<3;n++)await key('Down',[],beat);await key('Escape',[],beat);assert.equal(await history(),'0회 수정')
   await key('Enter',[],beat);for(let n=0;n<3;n++)await key('Down',[],beat);await key('Enter',[],beat);assert.equal(await history(),'1회 수정')
   const beatChanged=await save('tempo-beat');assert.equal(beatChanged.tempo.beatUnit,'eighth');assert.equal(beatChanged.tempo.dots??0,0);assert.deepEqual(beatChanged.parts,source.parts)
   await click('악보');await run(selector=>document.querySelector(selector).focus(),beat);await key('Z',['control'],beat);assert.deepEqual(await save('tempo-beat-undo'),source)
   await click('악보');const visible='.studio-tempo-tools input[type="checkbox"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},visible);await key('Space',[],visible);assert.equal(await history(),'1회 수정')
   assert.equal((await save('tempo-hidden')).tempo.transparent,true)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('tempo-hidden-undo'),source)
   await click('악보');const rhythm='.studio-tempo-tools__field:last-child [role="combobox"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},rhythm);await key('Enter',[],rhythm);await key('Down',[],rhythm);await key('Enter',[],rhythm);assert.equal(await history(),'1회 수정')
   assert.equal((await save('tempo-rhythm')).rhythmFeel.unit,'eighth')
   await click('악보');await run(selector=>document.querySelector(selector).focus(),rhythm);await key('Z',['control'],rhythm);assert.deepEqual(await save('tempo-rhythm-undo'),source)
   if(tempoEventOnly){
    const field='input[aria-label="위치별 빠르기 BPM"]'
    const edit=async text=>{await click('악보');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select()},field);if(text)await win.webContents.insertText(text);else await key('Backspace',[],field);await settle()}
    await edit('97');await key('Escape',[],field);assert.equal(await run(selector=>document.querySelector(selector).value,field),'');assert.equal(await history(),'0회 수정')
    await edit('96');await key('Enter',[],field);assert.equal(await history(),'1회 수정');const local=await save('tempo-local');assert.equal(local.tempoEvents[0].bpm,96);assert.deepEqual(local.parts,source.parts)
    await edit('');await key('Enter',[],field);assert.equal(await history(),'2회 수정');assert.deepEqual(await save('tempo-local-clear'),source)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('tempo-local-clear-undo'),local)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual(await save('tempo-local-clear-redo'),source)
    await click('악보로 이동');await key('Z',['control']);await key('Z',['control']);assert.deepEqual(await save('tempo-local-create-undo'),source)
    await edit('0');await key('Enter',[],field);assert.equal((await save('tempo-local-clamp')).tempoEvents[0].bpm,40)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('tempo-local-clamp-undo'),source)
    await click('악보');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'1'}))},field);await win.webContents.insertText('110');await run(selector=>{const n=document.querySelector(selector);window.__staleTempo=n;n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}));n.blur();n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'110'}))},field);await settle();assert.equal(await history(),'0회 수정')
    await run(()=>document.querySelector('.notation-event[data-event-id="m2-1"]').scrollIntoView({block:'center',inline:'nearest'}));await settle();await ensureNativeFocus()
    const hit=await run(()=>{const host=document.querySelector('.notation-event[data-event-id="m2-1"]'),text=host.querySelector('.vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontSize} ${style.fontFamily}`;const b=ctx.measureText(text.textContent),p=new DOMPoint(text.x.baseVal[0].value+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,text.y.baseVal[0].value+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(text.getScreenCTM());if(!host.contains(document.elementFromPoint(p.x,p.y)))throw Error('Local tempo pointer target occluded');return{x:p.x,y:p.y}})
    for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:hit.x,y:hit.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle()
    assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),'m2-1');await run(()=>window.__staleTempo.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));assert.equal(await history(),'0회 수정');assert.deepEqual(await save('tempo-local-stale-isolation'),source)
    await click('악보');await run(selector=>document.querySelector(selector).scrollIntoView({block:'center'}),field);await settle()
    const geometry=await run(selector=>{const n=document.querySelector(selector),root=n.closest('.studio-tempo-event'),b=n.getBoundingClientRect(),r=root.getBoundingClientRect(),s=getComputedStyle(n),ctx=document.createElement('canvas').getContext('2d');ctx.font=s.font;return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,placeholderInside:ctx.measureText(n.placeholder).width<=n.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth}},field)
    assert.ok(geometry.inside&&geometry.placeholderInside&&!geometry.legacy&&!geometry.overflow&&geometry.width>=(c.coarse?48:32)&&geometry.height>=(c.coarse?48:32));fs.writeFileSync(path.join(scene,'tempo-event.json'),JSON.stringify(geometry,null,2));await capture('tempo-event')
   }
   if(partLabelsOnly){
    const name='input[aria-label="현재 파트 이름"]',abbr='input[aria-label="현재 파트 약어"]'
    const edit=async(selector,text)=>{await click('악보');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select()},selector);if(text)await win.webContents.insertText(text);else await key('Backspace',[],selector);await settle()}
    await edit(name,'취소할 이름');await key('Escape',[],name);assert.equal(await run(selector=>document.querySelector(selector).value,name),source.parts[0].name);assert.equal(await history(),'0회 수정')
    await edit(name,'  임시 선율  ');await key('Enter',[],name);assert.equal(await history(),'1회 수정');const renamed=await save('part-renamed');assert.equal(renamed.parts[0].name,'임시 선율');assert.deepEqual(renamed.parts[0].staves,source.parts[0].staves);assert.equal(renamed.parts[0].abbreviation,source.parts[0].abbreviation)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('part-renamed-undo'),source)
    await edit(name,'');await key('Enter',[],name);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('part-empty-name'),source)
    await edit(abbr,'임시.');await key('Enter',[],abbr);assert.equal(await history(),'1회 수정');const abbreviated=await save('part-abbreviation');assert.equal(abbreviated.parts[0].abbreviation,'임시.');assert.deepEqual(abbreviated.parts[0].staves,source.parts[0].staves)
    await edit(abbr,'');await key('Enter',[],abbr);assert.equal(await history(),'2회 수정');assert.equal((await save('part-abbreviation-clear')).parts[0].abbreviation,undefined)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('part-abbreviation-clear-undo'),abbreviated)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('part-abbreviation-undo'),source)
    await click('악보');await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'조'}))},name);await win.webContents.insertText('조합 중');await run(selector=>{const n=document.querySelector(selector);window.__stalePartLabel=n;n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}));n.blur();n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'조합 중'}))},name);await settle();assert.equal(await history(),'0회 수정')
    await click('파트 추가');assert.equal(await history(),'1회 수정');await click('악보');await run(()=>window.__stalePartLabel.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));const added=await save('part-added-stale-isolation');assert.equal(added.parts.length,source.parts.length+1);assert.deepEqual(added.parts[0],source.parts[0]);assert.notEqual(added.parts.at(-1).name,'조합 중')
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('part-added-undo'),source)
    await click('악보');await run(()=>document.querySelector('.studio-part-labels').scrollIntoView({block:'center'}));await settle()
    const geometry=await run(()=>{const root=document.querySelector('.studio-part-labels'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('input')].map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,publicField:!!n.closest('.dd-field'),maxLength:n.maxLength}})}})
    assert.equal(geometry.legacy,false);assert.equal(geometry.overflow,false);assert.deepEqual(geometry.fields.map(f=>f.maxLength),[80,24]);assert.ok(geometry.fields.every(f=>f.inside&&f.publicField&&f.height>=(c.coarse?48:32)))
    fs.writeFileSync(path.join(scene,'part-labels.json'),JSON.stringify(geometry,null,2));await capture('part-labels')
   }
   if(structureActionsOnly){
    await click('악보')
    const focusAction=async label=>{await run(label=>{const n=[...document.querySelectorAll('.studio-structure-actions button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n)throw Error('Missing structure action:'+label);n.scrollIntoView({block:'center'});n.focus()},label);await settle()}
    const policies=await run(()=>[...document.querySelectorAll('.studio-structure-actions button')].map(n=>({label:n.getAttribute('aria-label')||n.textContent.trim(),disabled:n.disabled,public:n.classList.contains('dd-button'),legacy:!!n.closest('.studio-chrome')})))
    assert.equal(policies.length,6);assert.ok(policies.every(p=>p.public&&!p.legacy));for(const label of ['파트 삭제','파트 위로 이동','파트 아래로 이동','보표 삭제'])assert.ok(policies.find(p=>p.label===label).disabled)
    await focusAction('파트 추가');await key('Enter');assert.equal(await history(),'1회 수정');const added=await save('structure-added');assert.equal(added.parts.length,source.parts.length+1);assert.deepEqual(added.parts[0],source.parts[0]);const addedId=added.parts.at(-1).id
    await click('악보');await focusAction('파트 위로 이동');await key('Enter');assert.equal(await history(),'2회 수정');const moved=await save('structure-moved');assert.equal(moved.parts[0].id,addedId);assert.deepEqual(moved.parts[1],source.parts[0])
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('structure-moved-undo'),added)
    await click('악보');await focusAction('보표 추가');await key('Enter');assert.equal(await history(),'2회 수정');const twoStaves=await save('structure-staff-added');assert.equal(twoStaves.parts.at(-1).staves.length,2);assert.deepEqual(twoStaves.parts[0],source.parts[0])
    await click('악보');await focusAction('보표 삭제');await key('Enter');assert.equal(await history(),'3회 수정');assert.deepEqual(await save('structure-staff-removed'),added)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('structure-staff-removed-undo'),twoStaves)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('structure-staff-added-undo'),added)
    await click('악보');await focusAction('파트 삭제');await key('Enter');assert.equal(await history(),'2회 수정');assert.deepEqual(await save('structure-part-removed'),source)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('structure-part-removed-undo'),added)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('structure-added-undo'),source)
    await click('악보');await run(()=>document.querySelector('.studio-structure-actions').scrollIntoView({block:'center'}));await settle()
    const geometry=await run(()=>{const root=document.querySelector('.studio-structure-actions'),r=root.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,stroke:[...n.querySelectorAll('svg')].map(s=>s.getAttribute('stroke-width'))}})}})
    assert.equal(geometry.overflow,false);assert.ok(geometry.fields.every(f=>f.inside&&f.width>=(c.coarse?48:32)&&f.height>=(c.coarse?48:32)&&f.stroke.every(s=>s==='1.75')));fs.writeFileSync(path.join(scene,'structure-actions.json'),JSON.stringify({policies,geometry},null,2));await capture('structure-actions')
   }
   if(scoreViewOnly){
    await click('악보')
    const view='.studio-score-view__fields > :first-child [role="combobox"]',part='.studio-score-view__fields > :last-child [role="combobox"]'
    const focus=async selector=>{await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},selector);await settle()}
    assert.equal(await run(selector=>document.querySelector(selector).disabled,part),true)
    await focus(view);await key('Enter',[],view);await key('Down',[],view);await key('Escape',[],view);assert.match(await run(selector=>document.querySelector(selector).textContent,view),/총보/);assert.equal(await history(),'0회 수정')
    await click('파트 추가');const added=await save('view-added-part');assert.equal(added.parts.length,2)
    await click('악보');await focus(view);await key('Enter',[],view);await key('Down',[],view);await key('Enter',[],view);assert.equal(await history(),'1회 수정');assert.equal(await run(selector=>document.querySelector(selector).disabled,part),false)
    await focus(part);await key('Enter',[],part);await key('Home',[],part);await key('Enter',[],part);assert.equal(await history(),'1회 수정');assert.equal(await run(selector=>document.querySelector(selector).textContent,part),source.parts[0].name)
    assert.deepEqual(await save('view-selected-part'),added);const persisted=JSON.parse(fs.readFileSync(path.join(scene,'view-selected-part.chromatics')));assert.deepEqual(persisted.view,{mode:'part',partId:source.parts[0].id})
    openFile=path.join(scene,'view-selected-part.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),new RegExp('파트보: '+source.parts[0].name));assert.deepEqual(await save('view-part-reopened'),added)
    openFile=path.join(scene,'tempo-rhythm-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('view-source-restored'),source)
    await click('악보');await run(()=>document.querySelector('.studio-score-view').scrollIntoView({block:'center'}));await settle()
    const geometry=await run(()=>{const root=document.querySelector('.studio-score-view'),r=root.getBoundingClientRect();return{legacy:!!root.closest('.studio-chrome'),overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('[role="combobox"]')].map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,common:n.classList.contains('dd-select'),disabled:n.disabled}})}})
    assert.ok(!geometry.legacy&&!geometry.overflow&&geometry.fields.every(f=>f.common&&f.inside&&f.height>=(c.coarse?48:32)));assert.equal(geometry.fields[1].disabled,true);fs.writeFileSync(path.join(scene,'score-view.json'),JSON.stringify(geometry,null,2));await capture('score-view')
   }
   if(partSetupOnly){
    const selector=label=>`.studio-part-setup [data-field="${label}"] [role="combobox"]`
    const focus=async label=>{await click('악보');const q=selector(label);await run(q=>{const n=document.querySelector(q);n.scrollIntoView({block:'center'});n.focus()},q);await settle();return q}
    let q=await focus('현재 보표 음자리표');await key('Enter',[],q);await key('Down',[],q);await key('Escape',[],q);assert.equal(await history(),'0회 수정')
    await key('Enter',[],q);await key('Home',[],q);await key('Down',[],q);await key('Enter',[],q);assert.equal(await history(),'1회 수정');const bass=await save('setup-clef');assert.ok(bass.parts[0].staves[0].measures.every(m=>m.clef.sign==='F'&&m.clef.line===4));assert.deepEqual(bass.parts[0].staves[0].measures.map(m=>m.voices),source.parts[0].staves[0].measures.map(m=>m.voices))
    q=await focus('현재 보표 음자리표');await key('Z',['control'],q);assert.deepEqual(await save('setup-clef-undo'),source)
    q=await focus('추가할 악기');await key('Enter',[],q);await key('Home',[],q);for(let n=0;n<3;n++)await key('Down',[],q);await key('Enter',[],q);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('setup-next-instrument'),source)
    await click('악보');await click('파트 추가');assert.equal(await history(),'1회 수정');const cello=await save('setup-cello');assert.equal(cello.parts.at(-1).name,'첼로');assert.equal(cello.parts.at(-1).staves[0].measures[0].clef.sign,'F');assert.deepEqual(cello.parts[0],source.parts[0]);await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('setup-cello-undo'),source)
    q=await focus('현재 파트 이조');await key('Enter',[],q);await key('Home',[],q);await key('Down',[],q);await key('Enter',[],q);assert.equal(await history(),'1회 수정');const transposed=await save('setup-transposition');assert.ok(transposed.parts[0].staves[0].measures.every(m=>m.transposition.diatonic===-1&&m.transposition.chromatic===-2));assert.deepEqual(transposed.parts[0].staves[0].measures.map(m=>m.voices),source.parts[0].staves[0].measures.map(m=>m.voices));q=await focus('현재 파트 이조');await key('Z',['control'],q);assert.deepEqual(await save('setup-transposition-undo'),source)
    for(const sign of ['percussion','tab']){
     const fixture=JSON.parse(fs.readFileSync(path.join(scene,'source.chromatics')));fixture.score.parts[0].staves[0].measures[0].clef={sign,line:sign==='tab'?5:2};const f=path.join(scene,`setup-${sign}-source.chromatics`);fs.writeFileSync(f,JSON.stringify(fixture));openFile=f;await click('파일');await click('프로젝트 열기');await settle()
     q=await focus('현재 보표 음자리표');const label=sign==='tab'?'TAB 표기 (현재)':'타악기 표기 (현재)';assert.equal(await run(q=>document.querySelector(q).textContent,q),label);await key('Enter',[],q)
     const current=await run(label=>[...document.querySelectorAll('[role="option"]')].find(n=>n.textContent===label)?.getAttribute('aria-disabled'),label);assert.equal(current,'true');await key('Home',[],q);await key('Enter',[],q);assert.equal(await history(),'1회 수정');assert.deepEqual(await save(`setup-${sign}-converted`),source)
     q=await focus('현재 보표 음자리표');await key('Z',['control'],q);assert.deepEqual(await save(`setup-${sign}-undo`),fixture.score);assert.equal(await history(),'0회 수정')
    }
    openFile=path.join(scene,'tempo-rhythm-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('setup-source-restored'),source)
    await click('악보');await run(()=>document.querySelector('.studio-part-setup').scrollIntoView({block:'center'}));await settle()
    const geometry=await run(()=>{const root=document.querySelector('.studio-part-setup'),r=root.getBoundingClientRect();return{legacy:!!document.querySelector('.studio-score-settings .studio-chrome'),overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('[role="combobox"]')].map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,common:n.classList.contains('dd-select')}})}})
    assert.ok(!geometry.legacy&&!geometry.overflow&&geometry.fields.every(f=>f.common&&f.inside&&f.height>=(c.coarse?48:32)));fs.writeFileSync(path.join(scene,'part-setup.json'),JSON.stringify(geometry,null,2));await capture('part-setup')
   }
   await click('악보');await run(()=>document.querySelector('.studio-tempo-tools').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-tempo-tools'),r=root.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,overflowNodes:[...document.querySelectorAll('.studio-score-settings *')].filter(n=>n.checkVisibility()&&n.getBoundingClientRect().right>innerWidth).slice(0,12).map(n=>({tag:n.tagName,class:n.className,right:n.getBoundingClientRect().right,text:n.textContent.slice(0,60),wrap:getComputedStyle(n).flexWrap})),fields:[...root.querySelectorAll('button,input[type="range"],label.dd-check')].map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right}})}})
   fs.writeFileSync(path.join(scene,'tempo-geometry.json'),JSON.stringify(geometry,null,2))
   assert.equal(geometry.overflow,false);assert.ok(geometry.fields.every(f=>f.inside&&f.width>=(c.coarse?48:32)&&f.height>=(c.coarse?48:32)))
   await capture('tempo-tools');fs.writeFileSync(path.join(scene,'tempo-tools.json'),JSON.stringify(geometry,null,2))
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'tempo-rhythm-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('tempo-reopened'),source)
   clearTimeout(deadline);records.push({...c,scope:partSetupOnly?'part-setup':scoreViewOnly?'score-view':structureActionsOnly?'structure-actions':partLabelsOnly?'part-labels':tempoEventOnly?'tempo-event':'tempo-tools',geometry,sliderOneUndo:true,beatAndRhythmCancelCommitUndo:true,visibleUndo:true,nativeReopen:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(measureToolsOnly){
   await click('악보')
   assert.equal(await run(()=>document.querySelector('.studio-measure-tools').closest('.studio-chrome')),null)
   const signature='.studio-measure-tools [data-signature="조표"] [role="combobox"]',time='.studio-measure-tools [data-signature="박자표"] [role="combobox"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},signature)
   await key('Enter',[],signature);await key('Home',[],signature);await key('Escape',[],signature);assert.equal(await history(),'0회 수정')
   await key('Enter',[],signature);await key('Home',[],signature);await key('Enter',[],signature);assert.equal(await history(),'1회 수정')
   const changed=await save('measure-key');assert.equal(changed.parts[0].staves[0].measures[0].keySignature.fifths,0)
   await click('악보');await run(selector=>document.querySelector(selector).focus(),signature);await key('Z',['control'],signature);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('measure-key-undo'),source)
   await click('악보');await run(()=>document.querySelector('.score-canvas .notation-event[data-event-id="m3-d5"]').scrollIntoView({block:'center',inline:'nearest'}));await settle();await ensureNativeFocus()
   const hit=await run(()=>{const host=document.querySelector('.score-canvas .notation-event[data-event-id="m3-d5"]'),text=host.querySelector('.vf-notehead text'),style=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontSize} ${style.fontFamily}`;const m=ctx.measureText(text.textContent),p=new DOMPoint(text.x.baseVal[0].value+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,text.y.baseVal[0].value+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2).matrixTransform(text.getScreenCTM());const hit=host.contains(document.elementFromPoint(p.x,p.y));if(!hit)throw Error('Actual measure note ink is occluded');return{x:p.x,y:p.y}})
   for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:hit.x,y:hit.y,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle()
   assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),'m3-d5')
   await click('악보')
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},time)
   await key('Enter',[],time);await key('Home',[],time);await key('Down',[],time);await key('Enter',[],time);assert.equal(await history(),'1회 수정')
   const timed=await save('measure-time');assert.deepEqual(timed.parts[0].staves[0].measures[2].timeSignature,{beats:3,beatType:4});assert.deepEqual(timed.parts[0].staves[0].measures[0],source.parts[0].staves[0].measures[0])
   await click('악보');await run(selector=>document.querySelector(selector).focus(),time);await key('Z',['control'],time);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('measure-time-undo'),source)
   await click('악보');await run(()=>{const n=document.querySelector('.studio-measure-tools button[aria-label="시스템 나누기 추가"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-measure-tools button[aria-label="시스템 나누기 추가"]');assert.equal(await history(),'1회 수정')
   assert.equal(await run(()=>document.querySelector('.studio-measure-tools button[aria-label="시스템 나누기 해제"]').getAttribute('aria-pressed')),'true')
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual(await save('measure-break-undo'),source)
   await click('악보');await run(()=>document.querySelector('.studio-measure-tools').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const root=document.querySelector('.studio-measure-tools'),r=root.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.labels?.[0]?.textContent,width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,common:n.classList.contains('dd-icon-button')||n.classList.contains('dd-select')}})}})
   assert.equal(geometry.overflow,false);assert.ok(geometry.fields.every(f=>f.inside&&f.common&&f.width>=(c.coarse?48:32)&&f.height>=(c.coarse?48:32)))
   await capture('measure-tools');fs.writeFileSync(path.join(scene,'measure-tools.json'),JSON.stringify(geometry,null,2))
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'measure-break-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('measure-reopened'),source)
   clearTimeout(deadline);records.push({...c,scope:'measure-tools',keyCancelNoEdit:true,keyAndTimeOneUndo:true,breakOneUndo:true,nativeReopen:true,geometry});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(chordPropertiesOnly){
   console.log(step+':chord-properties')
   assert.equal(await run(()=>document.querySelector('.studio-note-details')),null,'Retired detail surface must not remain as a hidden compatibility control')
   await click('속성 도크 닫기');await click('음표')
   assert.equal(await run(()=>document.querySelector('.studio-properties-dock').checkVisibility()),true)
   assert.equal(await run(()=>document.activeElement?.closest('.studio-selected-properties')!==null),true,'Menu must focus actual selected controls after reopening the dock')
   const focus=label=>run(label=>{const n=[...document.querySelectorAll('.studio-chord-properties button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n||n.disabled)throw Error('Unavailable chord control '+label);n.scrollIntoView({block:'center'});n.focus()},label)
   if(selectedPitchOnly){
    assert.equal(await run(()=>document.querySelector('header.toolbar').checkVisibility()),false,'No empty legacy pitch row may consume editor space')
    const event=score=>score.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id==='m1-c4')
    for(const [label,stepName,octave] of[['음높이 한 칸 올리기','D',4],['음높이 한 칸 내리기','B',3],['한 옥타브 올리기','C',5],['한 옥타브 내리기','C',3]]){
     await focus(label);await key('Enter');assert.equal(await history(),'1회 수정');const changed=await save('pitch-'+label)
     assert.equal(event(changed).pitch.step,stepName);assert.equal(event(changed).pitch.octave,octave);assert.equal(event(changed).pitch.alter??0,0)
     const expected=structuredClone(source);event(expected).pitch=event(changed).pitch;assert.deepEqual(changed,expected,'Only the selected note pitch may change')
     await focus(label);await key('Z',['control']);assert.deepEqual(await save('pitch-undo-'+label),source)
    }
    await focus('이명동음으로 바꾸기');await key('Space');assert.equal(await history(),'1회 수정');const respelled=await save('respelled')
    const before=event(source).pitch,after=event(respelled).pitch,midi=p=>({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+12*(p.octave+1)+(p.alter??0));assert.equal(midi(after),midi(before));assert.notDeepEqual(after,before)
    const expected=structuredClone(source);event(expected).pitch=after;assert.deepEqual(respelled,expected)
    await focus('이명동음으로 바꾸기');await key('Z',['control']);assert.deepEqual(await save('respell-undo'),source)
   }
   const expected=structuredClone(source),note=expected.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id==='m1-c4')
   await focus('3도 추가');await key('Space',[],'.studio-chord-properties button');assert.equal(await history(),'1회 수정')
   note.pitches=[note.pitch,{step:'E',octave:4}];assert.deepEqual(await save('third'),expected)
   await focus('3도 추가');await key('Enter');assert.equal(await history(),'1회 수정');assert.equal(await run(()=>document.querySelector('.studio-document').textContent.includes('변경 없음')),true);assert.deepEqual(await save('duplicate-no-command'),expected)
   await focus('5도 추가');await key('Enter');assert.equal(await history(),'2회 수정');note.pitches.push({step:'G',octave:4});assert.deepEqual(await save('triad'),expected)
   await focus('E4 구성음 제거');await key('Space');assert.equal(await history(),'3회 수정')
   const removed=structuredClone(expected);removed.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id==='m1-c4').pitches.splice(1,1);assert.deepEqual(await save('remove-member'),removed)
   await focus('5도 추가');await key('Z',['control']);assert.deepEqual(await save('remove-undo'),expected)
   await focus('5도 추가');await key('Z',['control','shift']);assert.deepEqual(await save('remove-redo'),removed)
   await focus('5도 추가');await key('Z',['control']);assert.deepEqual(await save('triad-restored'),expected)
   const geometry=[]
   for(const width of[207,280,360]){
    await setDockWidth('속성',width)
    const g=await run(()=>{const root=document.querySelector('.studio-chord-properties'),r=root.getBoundingClientRect();return{actualRootWidth:r.width,overflow:root.scrollWidth>root.clientWidth,documentOverflow:document.documentElement.scrollWidth>innerWidth,surface:getComputedStyle(root).backgroundColor,parentSurface:getComputedStyle(root.parentElement).backgroundColor,legacy:root.closest('.studio-chrome')!==null,buttons:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.textContent,common:n.classList.contains('dd-button')||n.classList.contains('dd-icon-button'),inside:b.left>=r.left&&b.right<=r.right,width:b.width,height:b.height}})}})
    assert.equal(g.overflow,false);assert.equal(g.documentOverflow,false);assert.equal(g.legacy,false);assert.equal(g.surface,g.parentSurface);assert.equal(g.buttons.length,9);assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)))
    geometry.push({storedWidth:width,...g});await run(()=>document.querySelector('.studio-chord-properties').scrollIntoView({block:'center'}));await settle();await capture('chord-'+width)
   }
   fs.writeFileSync(path.join(scene,'chord-geometry.json'),JSON.stringify(geometry,null,2))
   openFile=path.join(scene,'triad.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('native-reopen'),expected)
   await click('음표');await focus('E4 구성음 제거');await key('Enter');await focus('G4 구성음 제거');await key('Enter');assert.deepEqual(await save('back-to-single'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   records.push({...c,scope:'chord-properties',menuReopensAndFocuses:true,duplicateNoCommand:true,exactUndoRedo:true,nativeReopen:true,widths:[207,280,360]});clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(spanSelectOnly){
   console.log(step+':span-select-history')
   await click('도구');await click('범위 표기 찾기')
   await run(()=>{const root=document.querySelector('.studio-span-properties');root.scrollIntoView({block:'center'});root.querySelector('[role="combobox"]').click()});await settle()
   await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>/크레셴도|디미누엔도/.test(n.textContent));if(!n)throw Error('Missing real hairpin');n.click()});await settle()
   const spanId=await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').textContent)
   const geometryTrigger='.studio-span-properties__geometry .dd-accordion > button'
   const technicalTrigger='.studio-span-properties__technical .dd-accordion > button'
   const focusDisclosure=selector=>run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Missing live property disclosure');n.scrollIntoView({block:'center'});n.focus()},selector)
   assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),geometryTrigger),'false')
   await focusDisclosure(geometryTrigger);await key('Space',[],geometryTrigger)
   assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),geometryTrigger),'true')
   await key('Enter',[],geometryTrigger)
   assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-expanded'),geometryTrigger),'false')
   await key('Space',[],geometryTrigger)
   await focusDisclosure(technicalTrigger);await key('Enter',[],technicalTrigger)
   assert.equal(await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').checkVisibility()),true)
   await key('Space',[],technicalTrigger)
   assert.equal(await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').checkVisibility()),false)
   assert.equal(await history(),'0회 수정')
   assert.equal(await run(()=>document.querySelector('.editor-status').textContent.includes('정지')),true,'Disclosure keys must not start playback')
   const disclosures=[]
   for(const width of[207,280,360]){
    await setDockWidth('속성',width)
    const g=await run(()=>{const root=document.querySelector('.studio-span-properties'),r=root.getBoundingClientRect();return{overflow:root.scrollWidth>root.clientWidth,documentOverflow:document.documentElement.scrollWidth>innerWidth,buttons:[...root.querySelectorAll('.dd-accordion > button')].map(n=>{const b=n.getBoundingClientRect(),svg=n.querySelector('svg');return{title:n.textContent,width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right,icon:svg?.getAttribute('width'),stroke:svg?.querySelector('path')?.getAttribute('stroke-width')}})}})
    assert.equal(g.overflow,false);assert.equal(g.documentOverflow,false);assert.equal(g.buttons.length,2);assert.ok(g.buttons.every(n=>n.inside&&n.height>=(c.coarse?48:32)&&n.icon==='16'&&n.stroke==='1.75'))
    disclosures.push({storedWidth:width,...g});await focusDisclosure(geometryTrigger);await capture('disclosure-'+width)
   }
   fs.writeFileSync(path.join(scene,'property-disclosures.json'),JSON.stringify(disclosures,null,2))
   const placement=await run(()=>'[id="'+[...document.querySelectorAll('.studio-span-properties label')].find(n=>n.textContent==='표기 배치').control.id+'"]')
   const focusPlacement=()=>run(()=>{const n=[...document.querySelectorAll('.studio-span-properties label')].find(n=>n.textContent==='표기 배치').control;n.scrollIntoView({block:'center'});n.focus()})
   await focusPlacement();await key('Enter',[],placement);await key('Down');await key('Enter')
   const expected=structuredClone(source);expected.hairpins.find(n=>n.id===spanId).engraving={placement:'above'}
   assert.equal(await history(),'1회 수정');assert.deepEqual(await save('span-placement'),expected)
   await focusPlacement();await key('Enter');await key('Z',['control']);assert.equal(await history(),'1회 수정');await key('Escape')
   await key('Z',['control'],placement);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('closed-undo'),source)
   await focusPlacement();await key('Z',['meta','shift']);assert.equal(await history(),'1회 수정');assert.deepEqual(await save('closed-redo'),expected)
   openFile=path.join(scene,'closed-redo.chromatics');await click('프로젝트 열기');await settle();assert.deepEqual(await save('native-reopen'),expected)
   await click('도구');await click('범위 표기 찾기');await run(()=>{document.querySelector('.studio-span-properties [role="combobox"]').click()});await settle()
   await run(()=>[...document.querySelectorAll('[role="option"]')].find(n=>/크레셴도|디미누엔도/.test(n.textContent)).click());await settle()
   await run(()=>document.querySelector('.studio-span-properties__geometry .dd-accordion > button').click());await settle()
   const offset='input[aria-label="표기 세로 이동"]'
   await run(()=>{const n=document.querySelector('input[aria-label="표기 세로 이동"]');n.scrollIntoView({block:'center'});n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'0');n.dispatchEvent(new Event('input',{bubbles:true}))});await key('Enter',[],offset);assert.equal(await history(),'1회 수정')
   const zero=structuredClone(expected);zero.hairpins.find(n=>n.id===spanId).engraving.offsetY=0;assert.deepEqual(await save('explicit-zero'),zero)
   await focusPlacement();await key('Z',['control']);assert.deepEqual(await save('zero-undo'),expected)
   await focusPlacement();await key('Z',['control','shift']);assert.deepEqual(await save('zero-redo'),zero)
   await run(()=>{const n=document.querySelector('input[aria-label="표기 세로 이동"]');n.scrollIntoView({block:'center'});n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'3');n.dispatchEvent(new Event('input',{bubbles:true}))});await key('Escape',[],offset);assert.equal(await run(()=>document.querySelector('input[aria-label="표기 세로 이동"]').value),'0');assert.equal(await history(),'1회 수정')
   await capture('span-inspector');await click('표기 자동 배치 복원');assert.equal(await history(),'2회 수정')
   const cleared=structuredClone(source);assert.deepEqual(await save('automatic'),cleared)
   await focusPlacement();await key('Z',['control']);assert.deepEqual(await save('reset-undo'),zero)
   await focusPlacement();await key('Z',['control','shift']);assert.deepEqual(await save('reset-redo'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'));assert.ok(fs.readFileSync(path.join(scene,'output.pdf')).subarray(0,4).toString()==='%PDF')
   fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2))
   records.push({...c,scope:'span-select-history',spanId,closedUndoRedo:true,openListProtected:true,explicitZero:true,draftEscape:true,resetUndoRedo:true,nativeReopen:true})
   clearTimeout(deadline);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records},null,2));win.destroy();win=undefined;continue
  }
  if(decorationsOnly){
   console.log(step+':note-decorations')
   const selected='m1-c4',findEvent=score=>score.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id===selected)
   const select='.studio-note-decorations [role="combobox"]'
   await click('음표');await run(()=>{const n=document.querySelector('.studio-note-decorations [role="combobox"]');n.scrollIntoView({block:'center'});n.focus()})
   await key('Enter',[],select);await key('End',[],select);await key('Escape',[],select);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('decorations-cancel'),source)
   await click('음표');await run(()=>document.querySelector('.studio-note-decorations [role="combobox"]').focus());await key('Enter',[],select);await key('End',[],select);await key('Enter',[],select)
   assert.equal(await history(),'1회 수정');const tremolo=structuredClone(source);findEvent(tremolo).tremolo={type:'single',marks:3}
   await key('Enter',[],select);await key('Z',['control'],select);assert.equal(await history(),'1회 수정');await key('Escape',[],select)
   assert.deepEqual(await save('decorations-tremolo'),tremolo);await click('음표');await run(()=>document.querySelector('.studio-note-decorations [role="combobox"]').focus());await key('Z',['control'],select);assert.deepEqual(await save('decorations-undo'),source);await click('음표');await run(()=>document.querySelector('.studio-note-decorations [role="combobox"]').focus());await key('Z',['control','shift'],select);assert.deepEqual(await save('decorations-redo'),tremolo)
   openFile=path.join(scene,'decorations-redo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('decorations-reopened'),tremolo)
   await click('음표');await run(()=>{const n=document.querySelector('.studio-note-decorations [role="combobox"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],select);await key('Home',[],select);await key('Enter',[],select);assert.deepEqual(await save('decorations-restored'),source)
   for(const [label,value]of[['트릴','trill'],['모르덴트','mordent'],['턴','turn']]){
    await click('음표');await run(label=>{const n=document.querySelector(`.studio-note-decorations button[aria-label="${label}"]`);n.scrollIntoView({block:'center'});n.focus()},label);await key('Space',[],'.studio-note-decorations button')
    const current=await save('decorations-'+value);assert.ok(findEvent(current).ornaments.includes(value))
   }
   const decorated=structuredClone(source);findEvent(decorated).ornaments=['trill','mordent','turn'];assert.deepEqual(await save('decorations-all'),decorated)
   for(let i=0;i<3;i++)await key('Z',['control']);assert.deepEqual(await save('decorations-ornaments-undo'),source)
   await click('음표');await run(()=>{const n=document.querySelector('.studio-note-decorations button[aria-label="부착 꾸밈음"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-note-decorations button[aria-label="부착 꾸밈음"]')
   const grace=structuredClone(source);findEvent(grace).graceNotes=[{pitch:{step:'B',octave:3},slash:true}]
   assert.deepEqual(await save('decorations-grace'),grace);await key('Z',['control']);assert.deepEqual(await save('decorations-grace-undo'),source)
   const geometry=[]
   for(const width of[207,280,360]){
    await setDockWidth('속성',width)
    const g=await musicToolGeometry('.studio-note-decorations');fs.writeFileSync(path.join(scene,`decorations-${width}.json`),JSON.stringify(g,null,2))
    assert.equal(g.surface,g.parentSurface,'Embedded note properties must share the panel surface');assert.equal(g.legacy,false);assert.equal(g.overflow,false);assert.equal(g.buttons.length,5);assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.inkInside!==false&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)))
    geometry.push({width,...g});await click('음표');await run(()=>document.querySelector('.studio-note-decorations').scrollIntoView({block:'center'}));await settle();await capture('decorations-'+width)
   }
   fs.writeFileSync(path.join(scene,'decorations-geometry.json'),JSON.stringify(geometry,null,2))
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   assert.deepEqual(await save('decorations-final'),source)
   fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2));clearTimeout(deadline)
   records.push({...c,scope:'note-decorations',cancelNoUndo:true,exactUndoRedo:true,nativeReopen:true,multipleOrnaments:true,attachedGrace:true,widths:[207,280,360]})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Shared note decorations and existing commands;owned files/native keys,not physical IME or OS dialog'},null,2));win.destroy();win=undefined;continue
  }
  if(eventMarksOnly){
   console.log(step+':event-marks');await click('음표')
   assert.equal(await run(()=>{const root=document.querySelector('.studio-selected-properties'),marks=root.querySelector('.studio-event-marks'),field=root.querySelector('input[aria-label="선택 요약 코드"]');return Boolean(marks.compareDocumentPosition(field)&Node.DOCUMENT_POSITION_FOLLOWING)}),true,'Selected event controls must precede ancillary text')
   const selected=await run(()=>document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId)
   assert.equal(selected,'m1-c4')
   const findEvent=score=>score.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id===selected)
   const selectedBefore=findEvent(source)
   assert.ok(selectedBefore.articulations.includes('staccato'))
   await click('음표');await run(()=>{const n=document.querySelector('.studio-event-marks button[aria-label="스타카토"]');n.scrollIntoView({block:'center'});n.focus()})
   await key('Space',[],'.studio-event-marks button[aria-label="스타카토"]');assert.equal(await history(),'1회 수정')
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const removed=structuredClone(source);delete findEvent(removed).articulations
   assert.deepEqual(await save('marks-staccato'),removed)
   await key('Z',['control']);assert.deepEqual(await save('marks-undo'),source)
   await key('Z',['control','shift']);assert.deepEqual(await save('marks-redo'),removed)
   openFile=path.join(scene,'marks-redo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('marks-reopened'),removed)
   // Restore via the same real shared control after native reopen resets history.
   await click('음표');await run(()=>{const n=document.querySelector('.studio-event-marks button[aria-label="스타카토"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-event-marks button[aria-label="스타카토"]')
   assert.deepEqual(await save('marks-restored'),source)
   for(const [label,value]of[['숨표','breath'],['중지표','caesura']]){
    await click('음표');await run(label=>{const n=[...document.querySelectorAll('.studio-event-marks button')].find(n=>n.getAttribute('aria-label')===label);n.scrollIntoView({block:'center'});n.focus()},label)
    await key('Space',[],'.studio-event-marks button');const expected=structuredClone(source);findEvent(expected).breathMark=value
    assert.deepEqual(await save('marks-'+value),expected)
   }
   await key('Z',['control']);await key('Z',['control']);assert.deepEqual(await save('marks-breath-undo'),source)
   const geometry=[]
   for(const width of[207,280,360]){
    await setDockWidth('속성',width)
    await run(()=>document.querySelector('.studio-event-marks').scrollIntoView({block:'center'}));await settle()
    const g=await musicToolGeometry('.studio-event-marks')
    fs.writeFileSync(path.join(scene,`event-marks-${width}.json`),JSON.stringify(g,null,2))
    assert.equal(g.legacy,false);assert.equal(g.overflow,false);assert.match(g.scope,/다음 입력 설정을 바꾸지 않습니다/);assert.equal(g.buttons.length,7)
    assert.ok(g.buttons.every(n=>n.common&&n.inside&&n.inkInside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.font.includes('Bravura')),'Actual common controls and music ink must fit the dock')
    geometry.push({width,...g});await capture('event-marks-'+width)
   }
   fs.writeFileSync(path.join(scene,'event-marks-geometry.json'),JSON.stringify(geometry,null,2))
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   assert.deepEqual(await save('marks-final'),source)
   fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2))
   clearTimeout(deadline);records.push({...c,scope:'event-marks',oneUndo:true,exactUndoRedo:true,nativeReopen:true,breathReplacement:true,widths:[207,280,360],actualMusicInk:true})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Selected event marks;owned native files/keys,not physical IME or OS dialog'},null,2));win.destroy();win=undefined;continue
  }
  if(editorStatusOnly){
   await click('파일')
   const fileSelection=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
   const eventFilter='.studio-file-tools [role="combobox"]'
   await run(()=>{const n=[...document.querySelectorAll('.studio-file-tools [role="combobox"]')].find(n=>n.labels?.[0]?.textContent==='선택 필터');if(!n)throw Error('Missing actual shared selection filter');n.scrollIntoView({block:'center'});n.focus()})
   await key('Enter',[],eventFilter);await key('End',[],eventFilter);await key('Escape',[],eventFilter)
   assert.equal(await run(()=>document.activeElement.textContent),'전체');assert.equal(await history(),'0회 수정')
   await key('Enter',[],eventFilter);await key('End',[],eventFilter);await key('Enter',[],eventFilter)
   assert.equal(await run(()=>document.activeElement.textContent),'쉼표만');assert.equal(await history(),'0회 수정')
   assert.equal(await run(()=>document.querySelector('.studio-file-tools button[aria-label="음표 지우기"]').disabled),true)
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   await key('Enter',[],eventFilter);await key('Home',[],eventFilter);await key('Enter',[],eventFilter)
   assert.equal(await run(()=>document.activeElement.textContent),'전체')
   const fileTools=await run(()=>{const root=document.querySelector('.studio-file-tools'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n),svg=n.querySelector('svg'),walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let text;while(walker.nextNode())if(walker.currentNode.textContent.trim()){text=walker.currentNode;break}const range=document.createRange();if(text)range.selectNodeContents(text);const iconLabelGap=n.getAttribute('role')!=='combobox'&&text&&svg?range.getBoundingClientRect().left-svg.getBoundingClientRect().right:null;return{iconLabelGap,label:n.getAttribute('aria-label')??n.labels?.[0]?.textContent,common:n.classList.contains('dd-button')||n.classList.contains('dd-select'),width:b.width,height:b.height,radius:s.borderRadius,inside:b.left>=r.left&&b.right<=r.right,iconStroke:n.querySelector('svg')?.getAttribute('stroke-width')}})}})
   assert.equal(fileTools.legacy,false);assert.equal(fileTools.overflow,false);assert.ok(fileTools.buttons.every(b=>b.iconLabelGap===null||b.iconLabelGap>=6),'Actual icon/label ink must retain the approved6px gap');assert.ok(fileTools.buttons.every(b=>b.common&&b.inside&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)&&['8px','10px'].includes(b.radius)&&(!b.iconStroke||b.iconStroke==='1.75')))
   fs.writeFileSync(path.join(scene,'file-tools-geometry.json'),JSON.stringify(fileTools,null,2));await run(()=>document.querySelector('.studio-file-tools').scrollIntoView({block:'center'}));await settle();await capture('file-tools')
   assert.deepEqual(await save('file-filter-no-edit'),source)
   assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)),fileSelection)

   await click('음표')
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');const accessible=n&&n.checkVisibility()&&!n.disabled;if(!accessible)throw Error('Actual text properties must be visible and enabled');n.scrollIntoView({block:'nearest'});n.focus();n.select()});await win.webContents.insertText('status retry');await settle()
   await key('Enter',[],'input[aria-label="선택 요약 보표 글자"]');assert.equal(await history(),'1회 수정')
   const expected=structuredClone(source);expected.staffTexts.find(n=>n.measureId==='measure-1').text='status retry'
   const selection=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
   const savedBytes=fs.readFileSync(path.join(scene,'current.chromatics'))
   rejectNextSave=true;await click('파일');await click('프로젝트 저장');await inspectProjectSaveFailure(c.coarse?48:32)
   assert.deepEqual(fs.readFileSync(path.join(scene,'current.chromatics')),savedBytes);assert.equal(await history(),'1회 수정')
   assert.match(await run(()=>document.querySelector('.studio-document').textContent),/저장하지 않은 변경/)
   assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)),selection)
   await run(()=>document.querySelector('.editor-status').scrollIntoView({block:'center'}));await settle()
   const geometry=await run(()=>{const n=document.querySelector('[role="status"][aria-label="편집 및 파일 상태"]'),r=n.getBoundingClientRect(),s=getComputedStyle(n),error=n.querySelector('.is-error'),probe=document.createElement('span');probe.style.color='var(--dd-error)';n.append(probe);const errorToken=getComputedStyle(probe).color;probe.remove();return{legacy:n.classList.contains('studio-chrome'),polite:n.getAttribute('aria-live'),background:s.backgroundColor,expectedSurface:s.getPropertyValue('--dd-surface-muted').trim(),error:getComputedStyle(error).color,errorToken,left:r.left,right:r.right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,fields:[...n.children].map(t=>{const b=t.getBoundingClientRect();return{common:t.classList.contains('dd-text'),text:t.textContent,left:b.left,right:b.right,top:b.top,bottom:b.bottom,within:b.left>=r.left&&b.right<=r.right}})}})
   assert.equal(geometry.legacy,false);assert.equal(geometry.polite,'polite');assert.equal(geometry.error,geometry.errorToken);assert.equal(geometry.overflow,false);assert.ok(geometry.fields.every(f=>f.common&&f.within));assert.ok(geometry.left>=0&&geometry.right<=geometry.width)
   fs.writeFileSync(path.join(scene,'status-error-geometry.json'),JSON.stringify(geometry,null,2));await capture('status-error')
   assert.deepEqual(await save('status-retry'),expected);assert.equal(await history(),'1회 수정')
   await run(()=>{const n=document.querySelector('.studio-file-tools button[aria-label="실행 취소"]');n.scrollIntoView({block:'center'});n.focus()});await key('Space',[],'.studio-file-tools button[aria-label="실행 취소"]')
   assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/);assert.deepEqual(await save('status-undo'),source)
   await run(()=>{const n=document.querySelector('.studio-file-tools button[aria-label="다시 실행"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.studio-file-tools button[aria-label="다시 실행"]')
   assert.equal(await history(),'1회 수정');assert.deepEqual(await save('status-redo'),expected)
   openFile=path.join(scene,'status-redo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('status-reopened'),expected)
   openFile=path.join(scene,'source.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('status-source-reopened'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기')
   const pagePreset='.studio-page-setup [role="combobox"]'
   await run(()=>{const n=document.querySelector('.studio-page-setup [role="combobox"]');n.scrollIntoView({block:'center'});n.focus()})
   await key('Enter',[],pagePreset);await key('End',[],pagePreset);await key('Escape',[],pagePreset)
   assert.equal(await history(),'0회 수정');assert.equal(await run(()=>document.activeElement.textContent),'기본 A4')
   await key('Enter',[],pagePreset);await key('End',[],pagePreset);await key('Enter',[],pagePreset)
   const compactSetup={...source,layout:{...source.layout,pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:6,staffSizePercent:90,systemSpacingPercent:90}}}
   assert.equal(await history(),'1회 수정');assert.deepEqual(await save('page-preset-compact'),compactSetup)
   await run(()=>document.querySelector('.studio-file-tools button[aria-label="실행 취소"]').focus());await key('Space',[],'.studio-file-tools button[aria-label="실행 취소"]');assert.deepEqual(await save('page-preset-undo'),source)
   await run(()=>document.querySelector('.studio-file-tools button[aria-label="다시 실행"]').focus());await key('Enter',[],'.studio-file-tools button[aria-label="다시 실행"]');assert.deepEqual(await save('page-preset-redo'),compactSetup)
   await run(()=>document.querySelector('.studio-file-tools button[aria-label="실행 취소"]').focus());await key('Space',[],'.studio-file-tools button[aria-label="실행 취소"]');assert.deepEqual(await save('page-preset-restored'),source)
   await click('내보내기')
   const staffSlider='.studio-page-setup input[type="range"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},staffSlider);await key('Right',[],staffSlider)
   assert.equal(await history(),'1회 수정')
   assert.deepEqual(await save('page-slider-step'),{...source,layout:{...source.layout,pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:8,staffSizePercent:105,systemSpacingPercent:100}}})
   await run(()=>document.querySelector('.studio-file-tools button[aria-label="실행 취소"]').focus());await key('Space',[],'.studio-file-tools button[aria-label="실행 취소"]');assert.deepEqual(await save('page-slider-restored'),source)
   await click('내보내기')
   const guide='.studio-page-setup input[aria-label="PDF 여백 가이드 표시"]'
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},guide);await key('Space',[],guide)
   assert.equal(await run(selector=>document.querySelector(selector).checked,guide),true);assert.equal(await history(),'0회 수정')
   assert.deepEqual(await save('page-guide-local'),source)
   await click('내보내기')
   const pageGeometry=await run(()=>{const root=document.querySelector('.studio-page-setup'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button,input')].map(n=>{const target=n.type==='checkbox'?n.closest('label'):n,b=target.getBoundingClientRect();return{common:n.classList.contains('dd-select')||n.closest('.dd-field,.dd-check')!==null,type:n.type,width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right}})}})
   assert.equal(pageGeometry.legacy,false);assert.equal(pageGeometry.overflow,false);assert.equal(pageGeometry.controls.length,7);assert.ok(pageGeometry.controls.every(n=>n.common&&n.inside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)))
   fs.writeFileSync(path.join(scene,'page-setup-geometry.json'),JSON.stringify(pageGeometry,null,2));await run(()=>document.querySelector('.studio-page-setup').scrollIntoView({block:'center'}));await settle();await capture('page-setup')
   const pageInput='.studio-export-tools input[aria-label="PDF 목표 장수"]'
   await run(selector=>{const n=document.querySelector(selector);if(!n?.checkVisibility())throw Error('Missing live shared PDF page input');n.scrollIntoView({block:'center'});n.focus()},pageInput)
   assert.equal(await run(selector=>document.querySelector(selector).value,pageInput),'2')
   await key('End',[],pageInput);await key('Backspace',[],pageInput);await win.webContents.insertText('0');await settle();await key('Enter',[],pageInput)
   assert.equal(await run(selector=>document.querySelector(selector).value,pageInput),'0')
   assert.equal(await run(()=>document.querySelector('.studio-export-tools button[aria-label="PDF 변환"]').disabled),true)
   assert.equal(await run(selector=>document.querySelector(selector).getAttribute('aria-invalid'),pageInput),'true')
   assert.equal(fs.existsSync(path.join(scene,'output.pdf')),false)
   await capture('export-invalid')
   await key('Backspace',[],pageInput)
   assert.equal(await run(selector=>document.querySelector(selector).value,pageInput),'')
   assert.equal(await run(()=>document.querySelector('.studio-export-tools button[aria-label="PDF 변환"]').disabled),true)
   await win.webContents.insertText('2');await settle();await key('Enter',[],pageInput)
   assert.equal(await run(()=>document.querySelector('.studio-export-tools button[aria-label="PDF 변환"]').disabled),false)
   assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const exportTools=await run(()=>{const root=document.querySelector('.studio-export-tools'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button,input')].map(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{label:n.getAttribute('aria-label'),common:n.classList.contains('dd-button')||n.closest('.dd-field')!==null,width:b.width,height:b.height,radius:s.borderRadius,inside:b.left>=r.left&&b.right<=r.right,stroke:n.querySelector('svg')?.getAttribute('stroke-width')}})}})
   assert.equal(exportTools.legacy,false);assert.equal(exportTools.overflow,false);assert.equal(exportTools.controls.length,4);assert.ok(exportTools.controls.every(n=>n.common&&n.inside&&n.width>=(c.coarse?48:32)&&n.height>=(c.coarse?48:32)&&n.radius==='10px'&&(!n.stroke||n.stroke==='1.75')))
   fs.writeFileSync(path.join(scene,'export-tools-geometry.json'),JSON.stringify(exportTools,null,2));await capture('export-tools')
   await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   clearTimeout(deadline);records.push({...c,scope:'editor-status-file-export-page-tools',fileTools,exportTools,pageGeometry,presetCancelCommitExactUndoRedo:true,sliderOneStepOneUndo:true,guideLocalNotPrinted:true,filterCancelCommitNoEdit:true,pdfInvalidEmptyRepairNoEdit:true,geometry,saveFailurePreservesFileDirtySelectionUndo:true,retryExactUndoRedoNativeReopen:true})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Current editor/file status with actual renderer and owned IPC files;not OS dialog or screen-reader verification'},null,2));win.destroy();win=undefined;continue
  }
  if(noteInputToolsOnly){
   const helpSelector='.studio-input-target button[aria-label="1성부"]'
   await run(selector=>{const n=document.querySelector(selector);const visible=n?.checkVisibility();if(!visible)throw Error('Missing actual scope help');n.scrollIntoView({block:'center'});n.focus()},helpSelector);await settle()
   assert.match(await run(()=>document.querySelector('[role="tooltip"]').textContent),/입력 위치를 이동합니다/)
   const helpGeometry=await run(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect(),tip=document.querySelector('[role="tooltip"]'),b=tip.getBoundingClientRect();return{width:r.width,height:r.height,common:n.classList.contains('dd-icon-button'),describedBy:n.getAttribute('aria-describedby')===tip.id,tipInside:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight}},helpSelector)
   assert.ok(helpGeometry.common&&helpGeometry.describedBy&&helpGeometry.tipInside&&helpGeometry.width>=(c.coarse?48:32)&&helpGeometry.height>=(c.coarse?48:32))
   await key('Space',[],helpSelector);assert.equal(await history(),'0회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   await capture('scope-help');await key('Escape',[],helpSelector);assert.equal(await run(()=>document.querySelector('[role="tooltip"]')),null)
   fs.writeFileSync(path.join(scene,'scope-help.json'),JSON.stringify(helpGeometry,null,2))
   await run(()=>{const n=document.querySelector('.studio-note-toolbar button[aria-label="쉼표로 변환"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual shared rest command unavailable');n.scrollIntoView({block:'center'});n.focus()});await settle()
   await key('Space',[],'.studio-note-toolbar button[aria-label="쉼표로 변환"]');assert.equal(await history(),'1회 수정')
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const restExpected=structuredClone(source),originalNote=source.parts[0].staves[0].measures[0].voices[0].events[0]
   restExpected.parts[0].staves[0].measures[0].voices[0].events[0]={type:'rest',id:originalNote.id,position:originalNote.position,duration:originalNote.duration}
   if(restExpected.slurs)restExpected.slurs=restExpected.slurs.filter(span=>span.startEventId!==originalNote.id&&span.endEventId!==originalNote.id)
   assert.deepEqual(await save('rest-selected'),restExpected)
   assert.equal(await run(()=>document.querySelector('.studio-note-toolbar button[aria-label="쉼표로 변환"]').disabled),true)
   await key('Z',['control']);assert.deepEqual(await save('rest-selected-undo'),source)
   await click('음표 입력 전환, 단축키 N');assert.equal(await history(),'0회 수정')
   await run(()=>{const n=document.querySelector('.studio-note-toolbar button[aria-label="쉼표 넣기"]');n.scrollIntoView({block:'center'});n.focus()});await key('Space',[],'.studio-note-toolbar button[aria-label="쉼표 넣기"]')
   assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const nextRest=(await save('rest-input')).parts[0].staves[0].measures[0].voices[0].events[0]
   assert.equal(nextRest.type,'rest');assert.deepEqual(nextRest.position,originalNote.position);assert.deepEqual(nextRest.duration,originalNote.duration)
   await click('악보로 이동');await key('Escape',[],'.score-canvas, .score-canvas [role="button"]');await key('Z',['control']);assert.deepEqual(await save('rest-input-undo'),source)
   // Undo restores the prior input mode too;leave it through the real Escape path before selected-note edits.
   assert.equal(await run(()=>document.querySelector('.studio-note-toolbar button[aria-label="쉼표 넣기"]').checkVisibility()),true)
   await click('악보로 이동');await key('Escape',[],'.score-canvas, .score-canvas [role="button"]');assert.equal(await history(),'0회 수정');assert.equal(await run(()=>document.querySelector('.studio-note-toolbar button[aria-label="음표 입력 전환, 단축키 N"]').getAttribute('aria-pressed')),'false')

   await run(()=>{const n=document.querySelector('.studio-note-toolbar button[aria-label="샤프"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual shared accidental unavailable');n.scrollIntoView({block:'center'});n.focus()});await settle()
   await key('Space',[],'.studio-note-toolbar button[aria-label="샤프"]');assert.equal(await history(),'1회 수정')
   assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
   const expected=structuredClone(source);expected.parts[0].staves[0].measures[0].voices[0].events[0].pitch.alter=1
   assert.deepEqual(await save('accidental-selected'),expected)
   await key('Z',['control']);assert.deepEqual(await save('accidental-undo'),source)
   await click('음표 입력 전환, 단축키 N');await click('플랫');assert.equal(await history(),'0회 수정')
   assert.match(await run(()=>document.querySelector('[aria-label="다음 입력 설정"]').textContent),/플랫/)
   assert.deepEqual(await save('accidental-input-setting'),source)
   await click('악보로 이동');await key('C');assert.equal(await history(),'1회 수정')
   const inserted=await save('accidental-input-note');assert.ok(inserted.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).some(e=>e.type==='note'&&e.pitch.step==='C'&&e.pitch.alter===-1))
   await click('악보로 이동');await key('Escape',[],'.score-canvas, .score-canvas [role="button"]');await key('Z',['control']);assert.deepEqual(await save('accidental-input-undo'),source)
   const tools=await run(()=>{const root=document.querySelector('.studio-note-toolbar'),buttons=[...root.querySelectorAll('[aria-label="임시표"] button,button[aria-label="쉼표로 변환"],button[aria-label="쉼표 넣기"]')];return{count:buttons.length,overflow:document.documentElement.scrollWidth>innerWidth,buttons:buttons.map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),svg=n.querySelector('[data-music-glyph]'),t=svg.querySelector('text'),style=getComputedStyle(t),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontSize} ${style.fontFamily}`;const b=ctx.measureText(t.textContent),v=svg.viewBox.baseVal;return{label:n.getAttribute('aria-label'),common:n.classList.contains('dd-icon-button'),width:r.width,height:r.height,radius:s.borderRadius,font:style.fontFamily,inkContained:-b.actualBoundingBoxLeft>=v.x&&-b.actualBoundingBoxAscent>=v.y&&b.actualBoundingBoxRight<=v.x+v.width&&b.actualBoundingBoxDescent<=v.y+v.height}})}})
   assert.equal(tools.count,4);assert.equal(tools.overflow,false);assert.ok(tools.buttons.every(b=>b.common&&b.width>=(c.coarse?48:32)&&b.height>=(c.coarse?48:32)&&b.radius==='8px'&&b.inkContained))
   fs.writeFileSync(path.join(scene,'note-tools.json'),JSON.stringify(tools,null,2));await run(()=>document.querySelector('.studio-note-toolbar').scrollIntoView({block:'start'}));await settle();await capture('note-tools')
   await click('도구');await click('범위 표기 찾기');await run(()=>document.querySelector('.studio-span-properties [role="combobox"]').click());await settle();await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>/크레셴도|디미누엔도/.test(n.textContent));if(!n)throw Error('Missing actual span option');n.click()});await settle()
   assert.equal(await run(()=>document.querySelector('.studio-note-toolbar button[aria-label="샤프"]').disabled),true)
   assert.equal(await run(()=>document.querySelector('.studio-note-toolbar button[aria-label="쉼표로 변환"]').disabled),true)
   assert.deepEqual(await save('accidental-span-guard'),source)
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'accidental-input-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('note-tools-reopened'),source)
   const staffControl='.studio-input-target [role="combobox"]'
   assert.deepEqual(await run(selector=>({select:!!document.querySelector(selector),status:document.querySelector('.studio-input-target output[aria-label="입력 보표"]')?.textContent,visible:document.querySelector('.studio-input-target output[aria-label="입력 보표"]')?.checkVisibility()}),staffControl),{select:false,status:source.parts[0].name,visible:true},'A sole staff remains readable without a non-actionable selector')
   // Owned two-part project, opened through the real file lifecycle; no injected renderer state.
   const ensemble=JSON.parse(fs.readFileSync(path.join(scene,'note-tools-reopened.chromatics')))
   const originalPart=ensemble.score.parts[0],ids=new Map([[originalPart.id,'qa-part-2']])
   for(const staff of originalPart.staves){ids.set(staff.id,'qa-'+staff.id);for(const measure of staff.measures){ids.set(measure.id,'qa-'+measure.id);for(const voice of measure.voices)for(const event of voice.events)ids.set(event.id,'qa-'+event.id)}}
   const second=JSON.parse(JSON.stringify(originalPart,(_key,value)=>typeof value==='string'&&ids.has(value)?ids.get(value):value));second.name='QA 두 번째 파트';ensemble.score.parts.push(second)
   openFile=path.join(scene,'target-source.chromatics');fs.writeFileSync(openFile,JSON.stringify(ensemble));await click('파일');await click('프로젝트 열기');await settle()
   const targetSource=await save('target-source-opened');assert.deepEqual(targetSource,ensemble.score)
   await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus()},staffControl);await key('Enter',[],staffControl);await key('End',[],staffControl);await key('Escape',[],staffControl)
   assert.equal(await history(),'0회 수정');assert.equal(await run(selector=>document.querySelector(selector).textContent,staffControl),originalPart.name)
   await key('Enter',[],staffControl);await key('End',[],staffControl);await key('Enter',[],staffControl)
   assert.equal(await run(selector=>document.querySelector(selector).textContent,staffControl),second.name);assert.equal(await history(),'0회 수정');assert.deepEqual(await save('target-navigation'),targetSource)
   await run(()=>document.querySelector('.studio-input-target button[aria-label="1성부"]').focus());await key('Right',[],'.studio-input-target button[aria-label="1성부"]')
   assert.equal(await run(()=>document.activeElement.getAttribute('aria-label')),'2성부');assert.equal(await history(),'0회 수정');assert.equal(await run(()=>document.querySelector('.studio-input-target button[aria-label="1성부"]').getAttribute('aria-pressed')),'true')
   await key('Enter',[],'.studio-input-target button[aria-label="2성부"]');assert.equal(await history(),'1회 수정')
   const voiceCreated=await save('target-voice-created');assert.deepEqual(voiceCreated.parts[0],targetSource.parts[0]);assert.equal(voiceCreated.parts[1].staves[0].measures[0].voices.find(v=>v.id==='voice-2').events[0].type,'rest')
   await click('음표 입력 전환, 단축키 N');await click('샤프');assert.equal(await history(),'1회 수정');await click('악보로 이동');await key('D');assert.equal(await history(),'2회 수정')
   const targetNote=await save('target-note');assert.deepEqual(targetNote.parts[0],targetSource.parts[0]);assert.ok(targetNote.parts[1].staves[0].measures[0].voices.find(v=>v.id==='voice-2').events.some(e=>e.type==='note'&&e.pitch.step==='D'&&e.pitch.alter===1))
   await click('악보로 이동');await key('Escape',[],'.score-canvas, .score-canvas [role="button"]');await key('Z',['control']);assert.deepEqual(await save('target-note-undo'),voiceCreated);await key('Z',['control']);assert.deepEqual(await save('target-voice-undo'),targetSource)
   await key('Z',['control','shift']);assert.deepEqual(await save('target-voice-redo'),voiceCreated)
   openFile=path.join(scene,'target-voice-redo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('target-reopened'),voiceCreated)
   const targetGeometry=await run(()=>{const root=document.querySelector('.studio-input-target'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:document.documentElement.scrollWidth>innerWidth,fields:[...root.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),role:n.getAttribute('role'),width:b.width,height:b.height,inside:b.left>=r.left&&b.right<=r.right}})}})
   assert.equal(targetGeometry.legacy,false);assert.equal(targetGeometry.overflow,false);assert.ok(targetGeometry.fields.every(f=>f.inside&&f.width>=(c.coarse?48:32)&&f.height>=(c.coarse?48:32)))
   fs.writeFileSync(path.join(scene,'target-tools.json'),JSON.stringify(targetGeometry,null,2));await run(()=>document.querySelector('.studio-input-target').scrollIntoView({block:'center'}));await settle();await capture('target-tools')
   fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2))
   clearTimeout(deadline);records.push({...c,scope:'note-input-tools',restSelectionAndInputOneUndo:true,restUndoExact:true,restSpanGuard:true,tools,targetGeometry,selectedOneUndo:true,nextInputNoUndo:true,realNoteOneUndo:true,spanDisabled:true,nativeReopen:true,staffCancelAndNavigationNoEdit:true,voiceFocusNoEdit:true,voiceCreationOneUndo:true,targetNoteAndReopen:true})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Current note input tools with native keys and owned files;not physical IME,OS dialogs or whole UI certification'},null,2));win.destroy();win=undefined;continue
  }
  // Existing single-location properties:real input,one commit/undo,and stale draft isolation.
  await click('음표') // Open the actual selected-properties pane before focusing its field.
  await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');n.focus();n.select()});await win.webContents.insertText('cantabile');await settle()
  const fieldFocus=await run(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),dock=n.closest('#studio-properties').getBoundingClientRect(),s=getComputedStyle(n);return{label:n.getAttribute('aria-label'),left:r.left,right:r.right,top:r.top,bottom:r.bottom,dockTop:dock.top,dockBottom:dock.bottom,viewportHeight:innerHeight,font:s.fontSize,outline:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),contained:r.top>=Math.max(0,dock.top)+4&&r.bottom<=Math.min(innerHeight,dock.bottom)-4}})
  fs.writeFileSync(path.join(scene,'overview-field-focus.json'),JSON.stringify(fieldFocus,null,2));assert.equal(fieldFocus.contained,true,'Text editing and its focus ring must remain in the actual visible dock scroll surface');assert.notEqual(fieldFocus.outline,'none');assert.ok(fieldFocus.outlineWidth>=2)
  await key('Enter',[],'input[aria-label="선택 요약 보표 글자"]');assert.equal(await history(),'1회 수정')
  const overviewExpected=structuredClone(source);overviewExpected.staffTexts.find(n=>n.measureId==='measure-1').text='cantabile';assert.deepEqual(await save('overview-edit'),overviewExpected)
  await key('Z',['control']);assert.deepEqual(await save('overview-undo'),source)
  await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'취소할 한글');n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new CompositionEvent('compositionstart',{data:'한',bubbles:true}));n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true}))});await settle();assert.equal(await history(),'0회 수정')
  await run(()=>document.querySelector('input[aria-label="선택 요약 보표 글자"]').dispatchEvent(new CompositionEvent('compositionend',{data:'한',bubbles:true})));await key('Escape',[],'input[aria-label="선택 요약 보표 글자"]')
  assert.equal(await run(()=>document.querySelector('input[aria-label="선택 요약 보표 글자"]').value),'dolce');assert.equal(await history(),'0회 수정')
  await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');window.__previousOverviewInput=n;n.focus();n.select()});await win.webContents.insertText('must-not-leak');await settle()
  await run(()=>document.querySelector('.score-canvas .notation-event[data-event-id="m2-1"]').scrollIntoView({block:'center',inline:'nearest'}));await settle();await ensureNativeFocus()
  const hit=await run(()=>{
   const host=document.querySelector('.score-canvas .notation-event[data-event-id="m2-1"]'),text=host.querySelector('.vf-notehead text'),style=getComputedStyle(text),context=document.createElement('canvas').getContext('2d');context.font=`${style.fontSize} ${style.fontFamily}`
   const m=context.measureText(text.textContent),x=text.x.baseVal[0].value+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,y=text.y.baseVal[0].value+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2,p=new DOMPoint(x,y).matrixTransform(text.getScreenCTM()),target=document.elementFromPoint(p.x,p.y)
   if(!host.contains(target))throw Error('Real notehead ink is occluded;do not replace the pointer path with a callback')
   return{x:p.x,y:p.y,eventId:host.dataset.eventId,hit:target.tagName}
  })
  fs.writeFileSync(path.join(scene,'overview-pointer.json'),JSON.stringify(hit,null,2))
  win.webContents.sendInputEvent({type:'mouseMove',x:hit.x,y:hit.y});win.webContents.sendInputEvent({type:'mouseDown',x:hit.x,y:hit.y,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:hit.x,y:hit.y,button:'left',clickCount:1});await settle()
  assert.equal(await run(()=>document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId),'m2-1')
  await run(()=>window.__previousOverviewInput.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));assert.equal(await history(),'0회 수정');assert.deepEqual(await save('overview-pointer-isolation'),source)
  await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="m1-c4"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter',[],'.score-canvas .notation-event[data-event-id="m1-c4"]')
  for(const width of[207,280,360]){
   await setDockWidth('속성',width)
   const overview=await run(()=>{const root=document.querySelector('.studio-selected-properties'),r=root.getBoundingClientRect();return{legacy:root.closest('.studio-chrome')!==null,overflow:root.scrollWidth>root.clientWidth,fields:[...root.querySelectorAll('input,[role="combobox"]')].map(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{inside:b.left>=r.left&&b.right<=r.right,height:b.height,radius:s.borderRadius}})}})
   fs.writeFileSync(path.join(scene,`overview-${width}.json`),JSON.stringify(overview,null,2));assert.equal(overview.legacy,false);assert.equal(overview.overflow,false);assert.ok(overview.fields.every(n=>n.inside&&n.height>=(c.coarse?48:32)&&n.radius==='10px'))
   await run(()=>document.querySelector('.studio-selected-properties').scrollIntoView({block:'center'}));await settle();await capture('overview-'+width)
  }

  if(selectedPropertiesOnly){
   await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
   await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
   await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
   openFile=path.join(scene,'overview-pointer-isolation.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('overview-reopened'),source)
   fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2))
   clearTimeout(deadline);records.push({...c,scope:'selected-properties',exactNative:true,oneCommitOneUndo:true,compositionEscape:true,pointerStaleIsolation:true,inspectorWidths:[207,280,360]})
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Selected properties with real renderer and owned files/native keys;not full transport/mixer coverage,OS dialogs or physical IME'},null,2))
   win.destroy();win=undefined;continue
  }
  // Real notation palette discovery,not a duplicate category navigation.
  await click('표기 객체')
  await run(()=>document.querySelector('#studio-palette .studio-notation-palette .dd-accordion > button').focus());await key('Down',[],'#studio-palette .studio-notation-palette .dd-accordion > button')
  assert.equal(await run(()=>document.activeElement.textContent),'셈여림');assert.equal(await history(),'0회 수정')
  await run(()=>{const input=[...document.querySelectorAll('#studio-palette label')].find(n=>n.textContent==='표기 기호 검색').control;input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'셈여림');input.dispatchEvent(new Event('input',{bubbles:true}))});await settle()
  const palette=await run(()=>{const root=document.querySelector('#studio-palette');return{legacy:root.closest('.studio-chrome')!==null,background:getComputedStyle(root).backgroundColor,bodyBackground:getComputedStyle(root.querySelector('.studio-notation-palette')).getPropertyValue('--dd-surface'),symbols:root.querySelectorAll('[data-dynamic-glyph]').length,categoryButtons:[...root.querySelectorAll('button')].filter(n=>/팔레트 열기$/.test(n.getAttribute('aria-label')??'')).length,overflow:document.documentElement.scrollWidth>innerWidth}})
  assert.equal(palette.legacy,false);assert.equal(palette.symbols,9);assert.equal(palette.categoryButtons,0);assert.equal(palette.overflow,false)
  await click('ff 셈여림 적용');assert.equal(await history(),'1회 수정');await key('Z',['control']);assert.deepEqual(await save('palette-undo'),source)
  await click('표기 객체')
  await run(()=>{const input=[...document.querySelectorAll('#studio-palette label')].find(n=>n.textContent==='표기 기호 검색').control;input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'박자표');input.dispatchEvent(new Event('input',{bubbles:true}))});await settle()
  await click('박자표 설정 열기');await wait(()=>document.activeElement?.matches('.studio-measure-tools [data-signature="박자표"] [role="combobox"]')&&document.activeElement.checkVisibility());assert.equal(await history(),'0회 수정')
  await click('표기 기호 검색 지우기');fs.writeFileSync(path.join(scene,'palette.json'),JSON.stringify(palette,null,2));await capture('notation-palette')

  await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'))
  const xml=fs.readFileSync(path.join(scene,'output.musicxml'))
  await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'))
  const midi=fs.readFileSync(path.join(scene,'output.mid'))
  await click('PDF 변환');await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('output.pdf'))
  // Returns and details above the toolbar are real product UI. Test the current visible surface.
  await click('표기 객체');await run(()=>document.querySelector('.studio-note-toolbar').scrollIntoView({block:'start'}));await settle()
  const geometry=await run(()=>{const root=document.querySelector('.studio-note-toolbar'),buttons=[...root.querySelectorAll('button')],glyphs=[...root.querySelectorAll('[data-music-glyph]')];return{theme:root.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,overflow:document.documentElement.scrollWidth>innerWidth,buttons:buttons.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),width:r.width,height:r.height,radius:s.borderRadius,action:s.getPropertyValue('--dd-action'),outline:s.outlineStyle}}),glyphs:glyphs.map(n=>{const text=n.querySelector('text'),style=getComputedStyle(text),fontBox=text.getBBox(),v=n.viewBox.baseVal,context=document.createElement('canvas').getContext('2d');context.font=`${style.fontSize} ${style.fontFamily}`;const m=context.measureText(text.textContent),box={x:-m.actualBoundingBoxLeft,y:-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};return{kind:n.dataset.musicGlyph,font:style.fontFamily,fontBox:{x:fontBox.x,y:fontBox.y,width:fontBox.width,height:fontBox.height},ink:box,plane:{x:v.x,y:v.y,width:v.width,height:v.height},contained:box.x>=v.x&&box.y>=v.y&&box.x+box.width<=v.x+v.width&&box.y+box.height<=v.y+v.height}})}})
  fs.writeFileSync(path.join(scene,'geometry.json'),JSON.stringify(geometry,null,2));await capture('toolbar')
  assert.equal(geometry.theme,c.theme);assert.equal(geometry.coarse,c.coarse);assert.equal(geometry.overflow,false)
  assert.ok(geometry.buttons.every(b=>b.height>=(c.coarse?48:32)&&b.width>=(c.coarse?48:32)))
  if(!c.coarse&&c.scale===1)assert.ok(geometry.buttons.filter(b=>b.label?.includes('단축키')).every(b=>b.height===32),'Compact fine-pointer SVG controls must fit the32px system height')
  assert.ok(geometry.buttons.filter(b=>b.label?.includes('단축키')).every(b=>b.radius==='8px'))
  assert.ok(geometry.glyphs.every(g=>g.contained&&g.ink.width>0&&g.ink.height>0),'Actual loaded music ink must fit its common plane')
  await click('8분음표, 단축키 4');assert.equal(await history(),'1회 수정')
  // Focus common Tooltip+IconButton;native Space must trigger the command once,not playback.
  await key('Z',['control']);assert.equal(await history(),'0회 수정')
  await key('Space');assert.equal(await history(),'1회 수정');assert.match(await run(()=>document.querySelector('.editor-status').textContent),/정지/)
  await key('Z',['control']);assert.deepEqual(await save('selected-undo'),source)
  await click('음표 입력 전환, 단축키 N');await click('8분음표, 단축키 4');await click('점 추가');assert.equal(await history(),'0회 수정')
  await click('악보로 이동');await key('C');assert.equal(await history(),'1회 수정')
  await key('Escape');await key('Z',['control']);assert.deepEqual(await save('input-undo'),source)
  await click('파일');await click('MusicXML로 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.musicxml'));assert.deepEqual(fs.readFileSync(path.join(scene,'output.musicxml')),xml)
  await click('내보내기');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('output.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'output.mid')),midi)
  openFile=path.join(scene,'input-undo.chromatics');await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual(await save('reopened'),source)
  // The real inspector is independent of the legacy chrome host.
  await click('도구');await click('범위 표기 찾기')
  await run(()=>{const root=document.querySelector('.studio-span-properties');root.scrollIntoView({block:'center'});root.querySelector('[role="combobox"]').click()});await settle()
  await run(()=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>/크레셴도|디미누엔도/.test(n.textContent));if(!n)throw Error('Missing real hairpin');n.click()});await settle()
  const spanId=await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').textContent)
  assert.equal(await run(()=>document.querySelector('.studio-note-toolbar [aria-label="8분음표, 단축키 4"]').disabled),true)
  await run(()=>{const root=document.querySelector('.studio-span-properties');const end=[...root.querySelectorAll('label')].find(n=>n.textContent==='표기 끝점').control;end.focus();end.click()});await settle()
  await key('Up');await key('Escape');assert.equal(await history(),'0회 수정');assert.equal(await run(()=>document.querySelector('[aria-label="선택 표기 ID"]').textContent),spanId)
  await run(()=>document.querySelector('.studio-span-properties__geometry .dd-accordion > button').click());await settle()
  // This value is explicit zero,not the automatic/empty geometry.
  await run(()=>{const n=document.querySelector('input[aria-label="표기 세로 이동"]');n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'0');n.dispatchEvent(new Event('input',{bubbles:true}))});await key('Enter');assert.equal(await history(),'1회 수정')
  const edited=await save('span-zero');const expected=structuredClone(source);expected.hairpins.find(n=>n.id===spanId).engraving={offsetY:0};assert.deepEqual(edited,expected)
  await key('Z',['control']);assert.deepEqual(await save('span-undo'),source)
  await key('Z',['control','shift']);assert.deepEqual(await save('span-redo'),expected)
  await key('Z',['control']);assert.deepEqual(await save('span-restored'),source)
  for(const width of[207,280,360]){
   await setDockWidth('속성',width)
   const properties=await run(()=>{const root=document.querySelector('.studio-span-properties'),r=root.getBoundingClientRect();return{dockBackground:getComputedStyle(root.closest('.studio-properties-dock')).backgroundColor,panelBackground:getComputedStyle(root).backgroundColor,width:r.width,overflow:root.scrollWidth>root.clientWidth,fields:[...root.querySelectorAll('input,[role="combobox"]')].map(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{left:b.left,right:b.right,height:b.height,radius:s.borderRadius,inside:b.left>=r.left&&b.right<=r.right,min:r.left,max:r.right}}),legacy:root.closest('.studio-chrome')!==null,idVisible:root.querySelector('[aria-label="선택 표기 ID"]').checkVisibility()}})
   fs.writeFileSync(path.join(scene,`span-${width}.json`),JSON.stringify(properties,null,2));assert.equal(properties.dockBackground,properties.panelBackground,'Dock/header must retain the same neutral themed surface as the inspector');assert.equal(properties.legacy,false);assert.equal(properties.overflow,false);assert.equal(properties.idVisible,false);assert.ok(properties.fields.filter(n=>n.height>0).every(n=>n.inside&&n.height>=(c.coarse?48:32)&&n.radius==='10px'))
   await run(()=>document.querySelector('.studio-span-properties').scrollIntoView({block:'center'}));await settle();await capture('span-'+width)
  }
  await recordNativeFocus('before-transport')
  await run(()=>{const n=document.querySelector('.studio-playback [aria-label="재생"]');if(!n?.checkVisibility()||n.disabled)throw Error('Persistent transport is unavailable');n.focus()})
  await recordNativeFocus('transport-target')
  await key('Enter',[],'.studio-playback [aria-label="재생"]')
  await wait(()=>document.querySelector('.editor-status').textContent.includes('재생 중'))
  await click('일시정지');await wait(()=>document.querySelector('.editor-status').textContent.includes('일시정지'))
  await click('정지');await wait(()=>document.querySelector('.editor-status').textContent.includes('정지'))
  await recordNativeFocus('before-mixer')
  await run(()=>document.querySelector('.studio-playback [aria-label="일시정지"]').scrollIntoView({block:'nearest'}));await settle()
  const disabledTipPoint=await run(()=>{const n=document.querySelector('.studio-playback [aria-label="일시정지"]');if(!n.disabled)throw Error('Paused guidance requires the real disabled state');const r=n.closest('.dd-tooltip-wrap').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})
  win.webContents.sendInputEvent({type:'mouseMove',...disabledTipPoint});await settle()
  assert.equal(await run(()=>document.querySelector('.dd-tooltip-wrap:hover [role="tooltip"]:popover-open')?.textContent.includes('일시정지')),true,'Native pointer hover must retain disabled-state guidance')
  await capture('disabled-hover-guidance')
  const hoverTipBox=await run(()=>{const n=document.querySelector('.dd-tooltip-wrap:hover [role="tooltip"]:popover-open'),r=n.getBoundingClientRect();return{box:r.toJSON(),viewport:[innerWidth,innerHeight]}})
  fs.writeFileSync(path.join(scene,'disabled-hover-bounds.json'),JSON.stringify(hoverTipBox,null,2))
  assert.ok(hoverTipBox.box.left>=8&&hoverTipBox.box.right<=hoverTipBox.viewport[0]-8&&hoverTipBox.box.top>=0&&hoverTipBox.box.bottom<=hoverTipBox.viewport[1],'Open tooltip must follow its actual resized bounds inside the viewport')
  win.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await settle()
  assert.equal(await run(()=>[...document.querySelectorAll('[role="tooltip"]:popover-open')].filter(n=>n.closest('.dd-tooltip-wrap').querySelector(':disabled')).length),0,'Leaving the disabled control must dismiss its guidance')
  await click('믹서 표시')
  await run(()=>{const input=document.querySelector('.studio-part-mixer input[type="range"]');if(!input?.checkVisibility())throw Error('Real mixer slider unavailable');input.focus()});await key('Left',[],'input[type=range]')
  await recordNativeFocus('mixer-left-key')
  const volume=await run(()=>JSON.parse(localStorage.getItem('chromatics.part-mixer.v1'))['part-1'].volume);assert.equal(volume,.95)
  await key('Right');await run(()=>document.querySelector('.studio-playback [aria-label="믹서 표시"]').focus());await key('Space')
  assert.equal(await run(()=>document.querySelector('.studio-part-mixer').checkVisibility()),false)
  await recordNativeFocus('mixer-closed')
  assert.deepEqual(await save('transport-final'),source)
  fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2))
  clearTimeout(deadline);records.push({...c,geometry,exactNative:true,exactXml:true,exactMidi:true,selectedOneUndo:true,nextInputNoUndo:true,realNoteOneUndo:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,scope:'Native Electron renderer with owned files/profile and automated native keys;not OSdialogs,physical IME,touch or listening'},null,2));win.destroy();win=undefined
 }
 if(geometryErrorVisibilityOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.scoreUnchanged&&record.zeroCommands&&record.states.length===3&&record.states.every(state=>state.inputVisible&&state.errorVisible)));console.log(`PASS geometry error visibility:${records.length*3} viewport/theme/text/dock cases/native Enter/zero commands/native score preserved; no XML/MIDI/PDF export in this mode`);return}
 if(xmlCopyFocusOnly){assert.equal(records.length,cases.length);assert.ok(records.some(record=>record.focusReturn.failureStart.boundary));assert.ok(records.every(record=>record.nativeReopen&&record.primaryAssociationPreserved&&record.fullSourceParts===4&&record.focusReturn.returned.restored&&record.focusReturn.cancelAndFailureReturned));console.log(`PASS copy focus return:${records.length} cases/actual failure-cancel/held native Enter retry/body blur/owned visible control restoration/preserved copy and native data`);return}
 if(xmlCopyProgressOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.nativeReopen&&record.primaryAssociationPreserved&&record.fullSourceParts===4&&record.progress.newerErrorShown&&record.progress.completedOwner.event===record.progress.nextOwner));console.log(`PASS owned copy progress:${records.length} cases/held retry/neutral pending/newer project failure exposed/new owner retained/copy and native data preserved`);return}
 if(xmlCopyNavigationOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.nativeReopen&&record.primaryAssociationPreserved&&record.fullSourceParts===4&&record.navigation.length===2&&record.navigation.every(route=>route.guarded.length===5&&route.returned.selected)));console.log(`PASS error report navigation:${records.length} cases/expanded and collapsed technical control/native F6 score-header-score/IME and modifier guards/preserved copy and native workflow`);return}
 if(xmlCopyFeedbackOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.nativeReopen&&record.primaryAssociationPreserved&&record.fullSourceParts===4));console.log(`PASS XML copy feedback:${records.length} cases/quartet score and selected part/owned export IPC/localized summary/technical/cancel-retry/primary preserved/native reopen`);return}
 if(xmlSaveFeedbackOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.nativeReopen&&record.identicalRetryPayload));console.log(`PASS XML save feedback:${records.length} cases/owned write and post-write failures/localized summary/technical/native keys/cancel-retry/native reopen`);return}
 if(saveDocumentOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.oldResultIsolated&&record.reopened&&record.notes===1));console.log(`PASS save document ownership:${records.length} cases/project and XML/delayed success-failure-cancel/new document/native note and distinct file/reopen`);return}
 if(mixerSaveOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.saving?.duplicateSuppressed&&record.saving.newOwnerPreserved&&record.saving.nativeWrites===2));console.log(`PASS mixer keyboard save:${records.length} cases/native dirty edit/disk and post-write failure/held retry/duplicate guard/newer focus/long filename/native reopen`);return}
 if(mixerNavigationOnly){assert.equal(records.length,cases.length);assert.ok(records.every(record=>record.navigation.length===2&&record.navigation.every(route=>route.guarded.length===5&&route.returned.selected)),'Both mixer control kinds must complete guarded native F6 navigation');console.log(`PASS mixer navigation:${records.length} cases/checkbox and volume/native score-header-score F6/synthetic IME and modifier guards/preserved quartet workflow`);return}
 if(mixerEnsembleOnly){assert.equal(records.length,cases.length);console.log(`PASS mixer ensemble:${records.length} cases/native traversal of all12 fields/playback/reload/local preferences/native score`);return}
 if(mixerViewportOnly){assert.equal(records.length,cases.length);assert.ok(records.every(c=>c.routes.every(r=>r.stable&&r.fieldsVisible&&r.nativeVolumeKeys&&r.nativeWindow&&r.nativeContents&&r.documentFocused&&(!r.resized||(r.resized.stable&&r.resized.fieldsVisible)))),'Opened mixer controls must remain visible above the footer after layout settles');console.log(`PASS mixer viewport:${records.length} cases/three entry paths;shown native window/stable bounds/volume keys/resize`);return}
 if(pdfEntryFocusOnly){assert.equal(records.length,cases.length);console.log(`PASS PDF entry focus:${records.length} cases/two menu paths;actual native keys/public preset/no edits`);return}
 if(visibleSystemAudit){assert.equal(records.length,cases.length);console.log(`PASS visible system audit:${records.length} cases/18 surface states each;public controls/icons/computed paint/history;not physical input oroutput QA`);return}
 if(workspaceSpaceOnly){assert.ok(records.every(r=>!r.metrics.overflow),'Workspace must stay inside viewport');assert.ok(records.every(r=>r.metrics.note.top>=0&&r.metrics.note.bottom<=r.height),'Actual first note ink must be visible at750/800/1000px heights')}
 assert.equal(records.length,cases.length);console.log(commandSearchOnly ? `PASS command search:${records.length} cases;live menu enablement/native keyboard/composition/undo/focus/source exact` : statusDensityAudit?`RECORDED status density:${records.length} cases;current renderer/private preview/font contracts;not automatic first-ink approval`:paletteSearchActionsOnly?`PASS palette search actions:${records.length} cases;search reset/global view/focus/command scope/native`:paletteWorkspaceOnly?`PASS palette workspace:${records.length} cases;single/collapse/expand/reset/search/keys/reload/score preserved`:unspecifiedKeyModeOnly?`PASS unspecified key mode:${records.length} cases;current value/native/XML/no-op/undo/MIDI/PDF`:paletteOrnamentsOnly?`PASS ornament palette:${records.length} cases;glyphs/single-note/scope/undo/native/XML/MIDI/PDF`:keyPresetInventoryOnly?`PASS key preset inventory:${records.length} cases;wizard/measure-onward/keys/undo/native/XML/MIDI/PDF`:clefOctaveStateOnly?`PASS clef octave state:${records.length} cases;minus-one/zero/plus-one/current labels/no-op/explicit conversion/native/XML/MIDI`:paletteClefsOnly?`PASS clef palette:${records.length} cases;four glyph presets/measure scope/span guard/no-op/undo/native/actual XML-MIDI-PDF`:viewMenuStateOnly?`PASS View menu state:${records.length} cases;four checked items/keyboard/header equivalence/preferences/reload/native/output`:commandCompositionOnly?`PASS command composition:${records.length} cases;six live command surfaces/synthetic flags/native follow-up/undo/native/output`:paletteEntryOnly?`PASS palette entry:${records.length} cases;search focus/input and selection preserved/explicit detail routes/properties-only spans/undo/reopen/output`:palettePausesOnly?`PASS pause palette:${records.length} cases;note/rest commands/replacement/exact undo/native reopen/public glyphs and density/actual XML-MIDI-PDF`:metadataSpaceOnly?`PASS metadata Space:${records.length} cases;native activation instead of playback/synthetic IME/exact undo/native reopen/actual output`:metadataFocusOnly?`PASS metadata focus:${records.length} cases;paper role/native Enter-Escape/same trigger/exact undo/score preserved;Input migration remains separate`:paletteArticulationsOnly?`PASS palette articulations:${records.length} cases;four actual commands/exact undo-redo/public glyph density/search/native reopen/XML/MIDI/PDF`:paletteSearchFocusOnly?`PASS palette search focus:${records.length} cases;native Tab/Enter/continuing search/exact command and undo/native preservation`:inlineLyricMigration?`PASS approved inline Input:${records.length} cases;public label/actual32-48 targets/inline200/composition-draft/native/output`:inlineLyricLayerOnly?`PASS inline lyric paint:${records.length} cases;actual overlapping ink behind active editor;draft/undo/native/output checks preserved;design size migration remains separate`:inlineLyricAudit?`RECORDED inline lyric audit:${records.length} functional cases;design migration gaps remain,not a design PASS`:lyricToolsOnly?`PASS lyric tools:${records.length} functional cases;inline design migration is separate`:(spanFocusOnly||eventFocusOnly)?`PASS score target focus:${records.length} cases;independent shared screen-only focus ring/native score preserved;PDF pairs recorded`:disabledStyleOnly?`PASS public disabled style:${records.length} cases;shared colors/density without legacy opacity`:segmentCompositionOnly?`PASS Segment composition:${records.length} cases;synthetic IME/native follow-up view anddock keys/fixed zoom/F6/selection/native score;not physical IME oroutput QA`:selectCompositionOnly?`PASS Select composition:${records.length} cases;synthetic IME flags/native after-composition view andplacement/one command/undo-redo/native reopen;not physical IME oroutput QA`:popoverCompositionOnly?`PASS Popover composition:${records.length} cases;synthetic IME flags/native after-composition keys/draft/focus/selection/preferences/native score;not physical IME oroutput QA`:documentViewOnly?`PASS document view header:${records.length};automatic/fixed retained zoom/native/selection;first-ink visibility is a separate recorded result`:notationPropertiesOnly?`PASS notation properties:${records.length} cases;single inspector/menu/palette/focus/undo/native/XML/MIDI/PDF`:repeatToolsOnly?`PASS repeat tools:${records.length} cases;draft/cancel/IME/stale selection/undo/native/XML/MIDI/PDF`:rangeToolsOnly?`PASS range tools:${records.length} cases;real pointer range/common controls/undo/native/XML/MIDI/PDF`:partSetupOnly?`PASS part setup:${records.length} cases;instrument/staff clef/transposition/unsupported/undo/native/XML/MIDI/PDF`:scoreViewOnly?`PASS score view:${records.length} cases;cancel/selection/history/native view reopen/XML/MIDI/PDF`:structureActionsOnly?`PASS structure actions:${records.length} cases;enablement/order/staves/undo/native/XML/MIDI/PDF`:partLabelsOnly?`PASS part labels:${records.length} cases;draft/IME/part isolation/one undo/native/XML/MIDI/PDF`:tempoEventOnly?`PASS location tempo:${records.length} cases;draft/IME/selection isolation/one undo/native/XML/MIDI/PDF`:tempoToolsOnly?`PASS tempo tools:${records.length} cases;global BPM/beat/visibility/rhythm/undo/native/XML/MIDI/PDF`:measureToolsOnly?`PASS measure tools:${records.length} cases;signatures/breaks/undo/native/XML/MIDI/PDF`:chordPropertiesOnly?`PASS chord properties:${records.length} cases;menu focus/chord members/no-op/undo/native/XML/MIDI/PDF`:spanSelectOnly?`PASS span Select history:${records.length} cases;closed undo/open list/draft/reset/native/XML/MIDI/PDF`:decorationsOnly?`PASS note decorations:${records.length} cases;Select/SMuFL/exact undo/native/XML/MIDI/PDF`:eventMarksOnly?`PASS event marks:${records.length} cases;shared properties/native keys/exact undo/native/XML/MIDI/PDF`:editorStatusOnly?`PASS editor status:${records.length} cases;actual failure/dirty/selection/undo/retry/native/XML/MIDI/PDF`:noteInputToolsOnly?`PASS note input tools:${records.length} cases;selection/next-input/native keys/undo/SMuFL/native/XML/MIDI/PDF`:selectedPropertiesOnly?`PASS selected properties:${records.length} cases;shared fields/IME simulation/pointer isolation/undo/native/XML/MIDI/PDF`:`PASS persistent system toolbar:${records.length} cases;glyphs/density/keyboard/undo/native/XML/MIDI/PDF`)
 }catch(e){if(win&&!win.isDestroyed()){await capture('failure');fs.writeFileSync(path.join(scene,'focus-key-trace.json'),JSON.stringify(await run(()=>window.__systemTrace??[]),null,2));fs.writeFileSync(path.join(scene,'failure-dom.html'),await run(()=>document.body.innerHTML))}fs.writeFileSync(path.join(scene||out,'failure.json'),JSON.stringify({step,error:String(e)},null,2));throw e}
 finally{if(win&&!win.isDestroyed())win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
