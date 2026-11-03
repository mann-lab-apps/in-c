// Actual public controls/native pointer+keys and disk-backed IPC. No OS dialogs.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const {spawnSync}=require('node:child_process')
const {createHash}=require('node:crypto')
const source=path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR||'out/ddirori/continuous-marking-source')
const out=path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT||'out/ddirori/studio-object-filters')
const longExistingPartAudit=process.argv.includes('--audit-empty-long-existing-part')
const longExistingSystemAudit=longExistingPartAudit||process.argv.includes('--audit-empty-long-existing-system')
const longMeterVoiceAudit=process.argv.includes('--audit-empty-long-meter-voices')
const longCompoundInputAudit=longExistingSystemAudit||longMeterVoiceAudit||process.argv.includes('--audit-empty-long-compound')
const longEmptyInputAudit=longCompoundInputAudit||process.argv.includes('--audit-empty-long-note')
const geometryPointerAudit=process.argv.includes('--audit-geometry-note-pointer')
const boundaryInputPartAudit=process.argv.includes('--audit-boundary-input-part-view')
const boundaryInputAudit=boundaryInputPartAudit||process.argv.includes('--audit-boundary-input-exchange')
let boundaryExpectedPartId
const emptyMultipleVoicesAudit=process.argv.includes('--audit-empty-multiple-voices')
const emptyAppendAudit=process.argv.includes('--audit-input-append-sync')
const emptyInputAudit=process.argv.includes('--audit-empty-input-cursor')
const emptyExportScopeAudit=process.argv.includes('--audit-empty-export-scope')
const emptyExportRetryAudit=emptyAppendAudit||emptyInputAudit||emptyExportScopeAudit||process.argv.includes('--audit-empty-export-retry')
const emptyExportFeedbackAudit=process.argv.includes('--audit-empty-export-feedback')
const dynamicEmptyVoiceFocusAudit=emptyExportFeedbackAudit||process.argv.includes('--audit-empty-voice-marking-focus')
const dynamicInspectorFocusAudit=process.argv.includes('--audit-dynamic-inspector-focus')
const dynamicConditionsAudit=process.argv.includes('--audit-dynamic-conditions')
const dynamicDocumentAudit=process.argv.includes('--audit-dynamic-document')
const dynamicHistoryFocusAudit=process.argv.includes('--audit-dynamic-history-focus')
const individualDynamicAudit=dynamicDocumentAudit||dynamicConditionsAudit||dynamicInspectorFocusAudit||dynamicHistoryFocusAudit||process.argv.includes('--audit-single-dynamic')
const dynamicClearanceReference=process.argv.find(value=>value.startsWith('--dynamic-clearance-reference='))?.slice('--dynamic-clearance-reference='.length)
const dynamicClearanceAudit=process.argv.includes('--audit-dynamic-notehead-clearance')
const dynamicPolicyAudit=dynamicClearanceAudit||process.argv.includes('--audit-measure-dynamics-policy')
const singleHarmonyGuidance=process.argv.includes('--audit-single-harmony-guidance')
const singleHarmonyStructure=process.argv.includes('--audit-single-harmony-structure')
const singleHarmonyEmpty=process.argv.includes('--audit-single-harmony-empty')
const singleHarmonyDestinations=process.argv.includes('--audit-single-harmony-destinations')
const singleHarmonyConditions=process.argv.includes('--audit-single-harmony-conditions')
const singleHarmonyAudit=singleHarmonyGuidance||singleHarmonyStructure||singleHarmonyEmpty||singleHarmonyDestinations||singleHarmonyConditions||process.argv.includes('--audit-single-harmony')
const unequal=process.argv.includes('--unequal-staff')
const partViewIdentity=process.argv.includes('--audit-part-view-identity')
const inputPartIdentity=process.argv.includes('--audit-input-part-identity')
const inputVisibilityAudit=process.argv.includes('--audit-input-visibility')
const livePartLabelsAudit=process.argv.includes('--audit-live-part-labels')
const mixerPartIdentity=process.argv.includes('--audit-mixer-part-identity')
const staffRehearsalClearanceAudit=process.argv.includes('--audit-staff-rehearsal-clearance')
const staffTextPointerAudit=process.argv.includes('--audit-staff-text-properties')
const systemTextPointerAudit=process.argv.includes('--audit-system-text-properties')
const inputMarkerViewportAudit=process.argv.includes('--audit-input-marker-viewport')
const canvasFocusTokenAudit=process.argv.includes('--audit-canvas-focus-token')
const liveInputViewportAudit=process.argv.includes('--audit-live-input-viewport')
const manualInputViewportAudit=process.argv.includes('--audit-manual-input-viewport')
const inputPlaybackOwnershipAudit=process.argv.includes('--audit-input-playback-ownership')
const manualInputControl=process.argv.includes('--audit-manual-input-control')
const manualInputControlRoot=process.argv.find(value=>value.startsWith('--manual-input-control-root='))?.slice('--manual-input-control-root='.length)
const expressionPickerDensityAudit=process.argv.includes('--audit-expression-picker-density')
const expressionBrowserAudit=expressionPickerDensityAudit||process.argv.includes('--audit-expression-browser')
const partCopySnapshotCase=process.argv.find(value=>value.startsWith('--part-copy-snapshot-case='))?.split('=')[1]
const partCopySnapshotAudit=process.argv.includes('--audit-part-copy-report-snapshot')
const repeatConflictAudit=process.argv.includes('--audit-repeat-conflict-feedback')
const sharedRepeatBarlinesAudit=process.argv.includes('--audit-shared-repeat-barlines')
const repeatCountAudit=sharedRepeatBarlinesAudit||process.argv.includes('--audit-repeat-count-label')
const partRepeatWarningAudit=process.argv.includes('--audit-part-repeat-copy-warning')
const repeatScopeContext=process.argv.includes('--repeat-scope-context')
const repeatScopeAudit=process.argv.includes('--audit-repeat-edit-scope')
const partRepeatAudit=partRepeatWarningAudit||repeatScopeAudit||process.argv.includes('--audit-part-repeat-inheritance')
const partRepeatCase=process.argv.find(value=>value.startsWith('--part-repeat-case='))?.split('=')[1]
const secondaryVoltaAudit=process.argv.includes('--audit-secondary-volta-visible')
const secondaryContextAudit=secondaryVoltaAudit||process.argv.includes('--audit-secondary-repeat-context')
const expressionDestinationAudit=process.argv.includes('--audit-expression-destinations')
const expressionClipboardAudit=process.argv.includes('--audit-expression-clipboard')
const expressionObjectAudit=expressionBrowserAudit||process.argv.includes('--audit-expression-object')||expressionClipboardAudit||expressionDestinationAudit
let expressionPrintExpected
const prepareTupletPlaybackAudit=process.argv.includes('--audit-prepare-tuplet-playback')
const prepareTupletFromRest=process.argv.includes('--prepare-tuplet-from-rest')
const pendingTupletPlaybackAudit=process.argv.includes('--audit-pending-tuplet-playback')
const pendingPlayCount=process.argv.find(value=>value.startsWith('--pending-play-count='))?.split('=')[1]
const pendingInputMarkerAudit=pendingTupletPlaybackAudit||process.argv.includes('--audit-pending-input-marker')
const visibleInputPositionAudit=process.argv.includes('--audit-visible-input-position')
const inputClipboardCaretAudit=process.argv.includes('--audit-input-caret-clipboard')
const paperImeKind=process.argv.includes('--audit-paper-ime-span')?'span':process.argv.includes('--audit-paper-ime-lyric')?'lyric':undefined
const keyboardObjectCopyAudit=process.argv.includes('--audit-keyboard-object-copy')
const singleTextClipboardAudit=process.argv.includes('--audit-single-text-clipboard')
const measureTextEmptyAudit=process.argv.includes('--audit-measure-text-empty')
const measureTextImeAudit=process.argv.includes('--audit-measure-text-ime')
const rehearsalVisualAudit=staffTextPointerAudit||systemTextPointerAudit||process.argv.includes('--audit-rehearsal-visual-scope')
const rehearsalKeyboardAudit=rehearsalVisualAudit||process.argv.includes('--audit-rehearsal-keyboard-reflow')
const rehearsalDeleteAudit=rehearsalKeyboardAudit||process.argv.includes('--audit-rehearsal-delete-scope')
const rehearsalLabelAudit=rehearsalDeleteAudit||process.argv.includes('--audit-rehearsal-label-visibility')
const rehearsalPointerAudit=rehearsalLabelAudit||process.argv.includes('--audit-rehearsal-pointer')
let rehearsalPointerPdfMarks
const textInkAudit=process.argv.includes('--audit-text-ink')
const allTextInkAudit=process.argv.includes('--audit-all-text-ink')
const wordSpaceAudit=process.argv.includes('--audit-word-space')
const harmonyBounds=process.argv.includes('--harmony-bounds')
const systemText=process.argv.includes('--system-texts'),rehearsalClipboard=process.argv.includes('--rehearsal-marks')
const globalClipboard=systemText||rehearsalClipboard
const expression=process.argv.includes('--expression-texts'),harmony=process.argv.includes('--harmonies'),dynamic=process.argv.includes('--dynamics')
const family=rehearsalClipboard?'rehearsalMarks':systemText?'systemTexts':expression?'expressionTexts':harmony?'harmonies':dynamic?'dynamics':'staffTexts'
const objectFilter=rehearsalClipboard?'rehearsal-marks':systemText?'system-texts':expression?'expression-texts':harmony?'harmonies':dynamic?'dynamics':'staff-texts'
const familyLabel=rehearsalClipboard?'연습표':systemText?'시스템 텍스트':expression?'표현 텍스트':harmony?'코드':dynamic?'셈여림':'보표 글자'
const pageRoundtrip=process.argv.includes('--page-layout-roundtrip')
const meterHeader=process.argv.includes('--meter-header-roundtrip')
const printHeader=process.argv.includes('--print-header-roundtrip')
const partLabel=process.argv.includes('--part-label-roundtrip')
const harmonyTiming=process.argv.includes('--harmony-timing-roundtrip')
const harmonyAnchorAudit=process.argv.includes('--audit-harmony-anchors')
const harmonyRowsAudit=process.argv.includes('--audit-harmony-rows')
const harmonyOverflow=process.argv.includes('--harmony-overflow')
let pdfMode='save',pdfAttempts=0,headerAttempts=0
const harmonyEdit=process.argv.includes('--audit-harmony-edit')
const harmonyDisplay=process.argv.includes('--harmony-display-roundtrip')
const harmonySystemAudit=process.argv.includes('--audit-harmony-system-clearance')
const harmonySpanAudit=process.argv.includes('--audit-harmony-span-clearance')
const noteAnnotationAudit=process.argv.includes('--audit-note-annotation-clearance')
const harmonyPaged=process.argv.includes('--harmony-paged-roundtrip')
const harmonyPickup=process.argv.includes('--harmony-pickup-roundtrip')
const harmonyRest=process.argv.includes('--harmony-rest-roundtrip')
const harmonyVoices=process.argv.includes('--harmony-voice-roundtrip')
const ambiguousLyricAudit=process.argv.includes('--audit-ambiguous-lyrics')
const tempoSaveAudit=process.argv.includes('--audit-tempo-save-guard')
const tempoWarningAudit=process.argv.includes('--audit-tempo-import-warning')
const tempoLabelAudit=process.argv.includes('--audit-tempo-label-edit')
let activeTempoLabelMeta
const tempoOffsetAudit=process.argv.includes('--audit-tempo-offset-playback')
const tempoSoundAudit=tempoOffsetAudit||process.argv.includes('--audit-tempo-sound-import')
const tempoPositionAudit=tempoSoundAudit||process.argv.includes('--audit-tempo-position-import')
let activeTempoPositionScore
const rehearsalFirstAudit=process.argv.includes('--audit-rehearsal-text-edit'),rehearsalChoiceAudit=process.argv.includes('--audit-rehearsal-text-choice')
const rehearsalAudit=rehearsalFirstAudit||rehearsalChoiceAudit
const rehearsalInkAudit=process.argv.includes('--audit-rehearsal-text-ink')
let activeRehearsalScore
const textObjectConditionAudit=process.argv.includes('--audit-text-object-conditions')
const staffTextFirstAudit=process.argv.includes('--audit-staff-text-edit'),staffTextChoiceAudit=process.argv.includes('--audit-staff-text-choice')
const staffTextInkAudit=process.argv.includes('--audit-staff-text-ink')
const staffTextLowerAudit=process.argv.includes('--staff-text-lower')
let activeStaffTextScore
const textObjectChoiceAudit=rehearsalChoiceAudit||staffTextChoiceAudit||textObjectConditionAudit||process.argv.includes('--audit-text-object-choice')
const inputCaretTempo=process.argv.includes('--audit-input-caret-tempo')
const inputCaretAudit=inputCaretTempo||process.argv.includes('--audit-input-caret-properties')
const coincidentTextAudit=rehearsalAudit||staffTextFirstAudit||inputCaretAudit||textObjectChoiceAudit||process.argv.includes('--audit-coincident-text-edit')
const voiceLyricAudit=process.argv.includes('--audit-voice-lyric-clearance')
let voiceLyricAuditCount=0
let activeVoiceScore
const harmonyHeld=harmonyPaged||harmonyPickup||process.argv.includes('--harmony-held-roundtrip')
const harmonyDense=harmonyHeld||harmonyRest||harmonyVoices||process.argv.includes('--dense-harmony-roundtrip')
let activeRestScore,activeRestKind,activeRestPhase
const restReferences=new Map()
let expectedHarmonyCount=8
const xmlRoundtrip=process.argv.includes('--xml-schema-roundtrip')||pageRoundtrip||harmonyTiming||harmonyDense||harmonyDisplay||meterHeader||partLabel||printHeader
let expectedMeterHeaders=0
let expectedPartLabels=[]
let expectedPartDrawing={events:0,staves:0,clefs:0}
const partLabelExpectations=score=>score.parts.flatMap(p=>[[p.id,p.staves[0].id,p.name],...(p.abbreviation?.trim()?Array.from({length:2},()=>[p.id,p.staves[0].id,p.abbreviation]):[])])
fs.mkdirSync(out,{recursive:true});app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-object-filter-')));app.disableHardwareAcceleration()
let win,scene,step='start',openCurrent=false,sourceFile=path.join(source,'source.chromatics'),xmlOpenFile,xmlSaves=0,midiSaves=0,pdfSaves=0,xmlOpens=0
let pendingPartCopyRelease,partCopyRecoveryWrites=[]
let nativeXmlSaves=0,projectSaves=0
const result=p=>({filePath:p,fileName:path.basename(p)})
function recordSuggestedFile(input,contents,extension){
 if(!process.argv.includes('--audit-suggested-filenames'))return
 const name=input.suggestedName
 assert.equal(typeof name,'string');assert.equal(path.basename(name),name);assert.equal(path.extname(name),extension)
 assert(!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(path.parse(name).name),'Windows-reserved renderer suggestion: '+name)
 assert(Buffer.byteLength(name,'utf8')<=255,'The actual renderer suggestion must fit the owned filesystem filename limit')
 const manifest=path.join(scene,'suggested-filenames.json'),rows=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):[]
 const dir=path.join(scene,'suggested-files',String(rows.length));fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,name),bytes=Buffer.from(contents)
 fs.writeFileSync(file,bytes);assert.deepEqual(fs.readFileSync(file),bytes)
 rows.push({name,destinationProvided:Boolean(input.filePath),bytes:Buffer.byteLength(name),extension,path:file,payloadSha256:createHash('sha256').update(bytes).digest('hex')});fs.writeFileSync(manifest,JSON.stringify(rows,null,2))
}
ipcMain.handle('project:open',()=>{const p=openCurrent?path.join(scene,'current.chromatics'):sourceFile;return{...result(p),contents:fs.readFileSync(p,'utf8')}})
ipcMain.handle('project:save',(_e,v)=>{projectSaves++;recordSuggestedFile(v,v.contents,'.chromatics');const p=path.join(scene,'current.chromatics');fs.writeFileSync(p,v.contents);return result(p)})
ipcMain.handle('musicxml:open',()=>{const p=xmlOpenFile||path.join(scene,'filtered.musicxml');xmlOpens++;return{...result(p),contents:fs.readFileSync(p,'utf8')}})
ipcMain.handle('musicxml:export',(_e,v)=>{recordSuggestedFile(v,v.contents,'.musicxml');const p=path.join(scene,partCopySnapshotAudit?'older-piano.musicxml':'filtered.musicxml');fs.writeFileSync(p,v.contents);xmlSaves++;if(partCopySnapshotAudit){assert.equal(pendingPartCopyRelease,undefined);return new Promise(resolve=>{pendingPartCopyRelease=()=>{pendingPartCopyRelease=undefined;resolve(result(p))}})}return result(p)})
ipcMain.handle('musicxml:save',(_e,v)=>{nativeXmlSaves++;const p=path.join(scene,'saved.musicxml');fs.writeFileSync(p,v.contents);return result(p)})
ipcMain.handle('midi:save',(_e,v)=>{recordSuggestedFile(v,Buffer.from(v.contents),'.mid');const p=path.join(scene,'filtered.mid');fs.writeFileSync(p,Buffer.from(v.contents));midiSaves++;return result(p)})
ipcMain.handle('pdf:save',async(_event,input)=>{
 if(longExistingSystemAudit)await auditExistingSystemTies(true)
 if(longExistingPartAudit){const ids=await run(()=>[...new Set([...document.querySelectorAll('.studio-pdf-snapshot .notation-event')].map(n=>n.dataset.partId))]);assert.deepEqual(ids,[boundaryExpectedPartId]);fs.writeFileSync(path.join(scene,'part-print.json'),JSON.stringify({partIds:ids},null,2))}
 if(boundaryInputPartAudit){const ids=await run(()=>[...new Set([...document.querySelectorAll('.studio-pdf-snapshot .notation-event')].map(n=>n.dataset.partId))]);assert.deepEqual(ids,[boundaryExpectedPartId]);fs.writeFileSync(path.join(scene,'part-print.json'),JSON.stringify({partIds:ids},null,2))}
 if(emptyInputAudit){const state=await run(()=>({cursors:document.querySelectorAll('.studio-pdf-snapshot .notation-note-input-cursor').length,targets:document.querySelectorAll('.studio-pdf-snapshot .notation-dynamic-target').length}));assert.deepEqual(state,{cursors:0,targets:0});fs.writeFileSync(path.join(scene,'input-print.json'),JSON.stringify(state,null,2))}
 if(dynamicEmptyVoiceFocusAudit){const root=await run(()=>{const n=document.querySelector('.studio-pdf-snapshot');if(!n)throw Error('Actual print snapshot missing during PDF save');return{emptyEvents:n.querySelectorAll('.notation-event[data-measure-id="primary-bar-1"],.notation-event[data-measure-id="lower-bar-4"]').length,peerEvents:n.querySelectorAll('.notation-event[data-measure-id="other-bar-1"]').length,targets:n.querySelectorAll('.notation-dynamic-target').length}});assert.equal(root.emptyEvents,0);assert.equal(root.peerEvents,2);assert.equal(root.targets,0);fs.writeFileSync(path.join(scene,'empty-voice-print.json'),JSON.stringify(root,null,2))}
 if(partRepeatWarningAudit){const state=await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]'),snapshot=document.querySelector('.studio-pdf-snapshot');return{activeReport:report?.checkVisibility()??false,snapshotReady:Boolean(snapshot),reportsInSnapshot:snapshot?.querySelectorAll('[aria-label="MusicXML 경고 상세"]').length??-1}});fs.writeFileSync(path.join(scene,'warning-print-state.json'),JSON.stringify(state,null,2));assert.equal(state.activeReport,['repeat','volta'].includes(path.basename(scene)));assert(state.snapshotReady);assert.equal(state.reportsInSnapshot,0,'Private warning UI must stay outside the actual print snapshot')}

 if(individualDynamicAudit){const targets=await run(()=>document.querySelectorAll('.studio-pdf-snapshot .notation-dynamic-target').length);assert.equal(targets,0);const measured=await readDynamicClearance(true);assert(measured.gap>=7.9);fs.writeFileSync(path.join(scene,'individual-print-clearance.json'),JSON.stringify(measured,null,2));const labels=await run(()=>[...document.querySelectorAll('.studio-pdf-snapshot .notation-dynamic-mark')].map(n=>n.textContent));assert.deepEqual(labels.slice().sort(),(dynamicDocumentAudit?['f','f','p']:['mp','f','p']).sort())}
 if(dynamicClearanceAudit){const measured=await readDynamicClearance(true);fs.writeFileSync(path.join(scene,'dynamic-print-clearance.json'),JSON.stringify(measured,null,2));assert(measured.overlapX>0&&measured.gap>=7.9,'Actual PDF dynamic/notehead clearance: '+JSON.stringify(measured));assert.equal(measured.unresolved,'false')}
 if(dynamicPolicyAudit){const state=await run(()=>[...document.querySelectorAll('.studio-pdf-snapshot .notation-dynamic-mark')].map(n=>({measureId:n.dataset.measureId,text:n.textContent})));assert.deepEqual(state.map(n=>n.text).sort(),['mf','f','mf'].sort());fs.writeFileSync(path.join(scene,'dynamic-print.json'),JSON.stringify(state,null,2))}
 if(singleHarmonyAudit){const state=await run(()=>({targets:document.querySelectorAll('.studio-pdf-snapshot .notation-harmony-target').length,labels:[...document.querySelectorAll('.studio-pdf-snapshot .notation-harmony-mark')].map(n=>({text:n.textContent,role:n.getAttribute('role'),tab:n.getAttribute('tabindex')}))}));assert.equal(state.targets,0);assert(state.labels.every(n=>n.role===null&&n.tab===null));fs.writeFileSync(path.join(scene,'harmony-print.json'),JSON.stringify(state,null,2))}
 if(expressionObjectAudit){
  const print=await run(()=>({targets:document.querySelectorAll('.studio-pdf-snapshot .notation-expression-text-target').length,texts:[...document.querySelectorAll('.studio-pdf-snapshot .notation-expression-text')].map(n=>({text:n.textContent,role:n.getAttribute('role'),tab:n.getAttribute('tabindex')}))}));assert.equal(print.targets,0);assert.deepEqual(print.texts.map(n=>n.text).sort(),expressionPrintExpected.slice().sort());assert(print.texts.every(n=>n.role===null&&n.tab===null));fs.writeFileSync(path.join(scene,'expression-print.json'),JSON.stringify(print,null,2))
 }
 if(visibleInputPositionAudit){const state=await run(()=>({printed:document.querySelectorAll('.studio-pdf-snapshot .notation-note-input-cursor').length,screen:document.querySelectorAll('.score-canvas .notation-note-input-cursor').length,input:document.querySelector('.studio-input-context').dataset.inputActive}));assert.equal(state.printed,0,'Input marker must never enter print geometry');fs.writeFileSync(path.join(scene,'cursor-print-'+pdfSaves+'.json'),JSON.stringify(state,null,2))}
 if(rehearsalPointerAudit){
  rehearsalPointerPdfMarks=await run(selector=>[...document.querySelectorAll(selector)].map(n=>({text:n.textContent,role:n.getAttribute('role'),tabindex:n.getAttribute('tabindex')})),staffTextPointerAudit?'.studio-pdf-snapshot .notation-staff-text':systemTextPointerAudit?'.studio-pdf-snapshot .notation-system-text':'.studio-pdf-snapshot .notation-rehearsal-mark')
  fs.writeFileSync(path.join(scene,'pdf-marks.json'),JSON.stringify(rehearsalPointerPdfMarks,null,2))
 }
 if(tempoLabelAudit){
  win.webContents.debugger.attach('1.3')
  try{
   await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:'print'});await settle()
   const label=await run(meta=>{const root=document.querySelector('.studio-pdf-snapshot'),node=root.querySelector(meta.scope==='global'?'.notation-tempo-marking:not(.notation-tempo-marking--positioned)':'.notation-tempo-marking--positioned');return{text:node.textContent,opacity:Number(getComputedStyle(node).opacity),hidden:node.classList.contains('notation-tempo-marking--transparent')}},activeTempoLabelMeta)
   assert.equal(label.text,activeTempoLabelMeta.text);assert.equal(label.hidden,activeTempoLabelMeta.hidden);assert(activeTempoLabelMeta.hidden?label.opacity===0:label.opacity>0)
   fs.writeFileSync(path.join(scene,'print-label.json'),JSON.stringify(label,null,2))
  }finally{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:''});win.webContents.debugger.detach();await settle()}
 }
 if(tempoPositionAudit)await auditTempoPositions(true,activeTempoPositionScore)
 if(staffTextInkAudit||staffRehearsalClearanceAudit)await auditCoincidentStaffText(true,activeStaffTextScore,'print')
 if(rehearsalInkAudit)await auditCoincidentRehearsalMarks(true,activeRehearsalScore,'print')
 if(harmonyOverflow){
  pdfAttempts++
  const ink=await run(()=>[...document.querySelectorAll('.studio-pdf-snapshot .notation-harmony-mark')].map(n=>{const b=n.getBBox(),svg=n.ownerSVGElement,v=svg.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number),left=v?.length===4?v[0]:0,width=v?.length===4?v[2]:Number(svg.getAttribute('width'));return{text:n.textContent,x:b.x,width:b.width,height:b.height,left,viewportWidth:width,clipped:b.x<left||b.x+b.width>left+width}}))
  fs.writeFileSync(path.join(scene,`pdf-attempt-${pdfAttempts}.json`),JSON.stringify({mode:pdfMode,ink},null,2))
  if(pdfMode==='cancel')return undefined
  if(pdfMode==='fail')throw Error('임시 PDF 저장 실패')
 }
if(textInkAudit||allTextInkAudit)await auditTextInk(true);if(wordSpaceAudit)await auditWordSpacing(true);if(harmonyDense)await auditHarmonySpacing(true);if(harmonySystemAudit)await auditHarmonySystemClearance(true);if(meterHeader)await auditMeterHeaders(true);if(partLabel)await auditPartLabels(true);
if(partLabel&&process.argv.includes('--probe-print-media')&&pdfSaves===0){
 win.webContents.debugger.attach('1.3')
 try{
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:'print'});await settle()
  const actual=await run(()=>{const root=document.querySelector('.studio-pdf-snapshot'),box=n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{tag:n.tagName,class:n.getAttribute('class'),x:b.x,y:b.y,width:b.width,height:b.height,background:s.backgroundColor,fill:s.fill,stroke:s.stroke,opacity:s.opacity,position:s.position,overflow:s.overflow}};return{media:matchMedia('print').matches,title:box(root.querySelector('.score-title')),paper:box(root.querySelector('.score-page')),svg:box(root.querySelector('svg')),staves:[...root.querySelectorAll('.vf-stave')].map(box),rectangles:[...root.querySelectorAll('svg rect')].map(box)}})
  fs.writeFileSync(path.join(scene,'print-media-probe.json'),JSON.stringify(actual,null,2));fs.writeFileSync(path.join(scene,'print-media-probe.png'),(await win.webContents.capturePage()).toPNG())
 }finally{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:''});win.webContents.debugger.detach();await settle()}
}
if(printHeader||process.argv.includes('--audit-print-header-clearance'))await auditPrintHeader()
if(harmonyRest)await auditMeasureRests(true)
if(voiceLyricAudit)await auditVoiceLyricClearance(true)
const p=path.join(scene,'filtered.pdf'),bytes=await win.webContents.printToPDF({preferCSSPageSize:true});recordSuggestedFile(input,bytes,'.pdf');fs.writeFileSync(p,bytes);pdfSaves++;return result(p)})
for(const c of ['project:list-backups','recent-musicxml:list','recent-musicxml:add'])ipcMain.handle(c,()=>[])
for(const c of ['autosave:read','autosave:clear'])ipcMain.handle(c,()=>null)
ipcMain.handle('autosave:write',(_e,v)=>{if(partCopySnapshotAudit){const value=JSON.parse(JSON.stringify(v));partCopyRecoveryWrites.push(value);fs.writeFileSync(path.join(scene,'recovery-write-'+partCopyRecoveryWrites.length+'.json'),JSON.stringify(value,null,2))}return null})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{ok:false,error:e.stack}}})()`);if(!r.ok)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const readDynamicClearance=async print=>run(print=>{
 const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('svg'),context=document.createElement('canvas').getContext('2d')
 const bounds=(node,box)=>{const m=svg.getCTM().inverse().multiply(node.getCTM()),points=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})),x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y}}
 const ink=node=>{if(!node)throw Error('Actual glyph missing');const style=getComputedStyle(node);context.font=style.font;context.textBaseline='alphabetic';context.textAlign='start';const m=context.measureText(node.textContent),p=node.getStartPositionOfChar(0);return bounds(node,{x:p.x-m.actualBoundingBoxLeft,y:p.y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent})}
 const dynamic=ink(root.querySelector('.notation-dynamic-mark[data-measure-id="lower-bar-1"]')),note=ink(root.querySelector('.notation-event[data-event-id="lower-bar-1-a"] .vf-notehead text')),manual=root.querySelector('.notation-hairpin'),box=manual?bounds(manual,manual.getBBox()):null
 return{print,note,dynamic,gap:dynamic.y-note.y-note.height,overlapX:Math.min(dynamic.x+dynamic.width,note.x+note.width)-Math.max(dynamic.x,note.x),manualRelativeY:box?box.y-note.y:null,manualHeight:box?.height,staffUnresolved:svg.dataset.staffInkUnresolved,systemUnresolved:svg.dataset.systemInkUnresolved,unresolved:svg.dataset.dynamicInkUnresolved??'missing',offsets:svg.dataset.dynamicOffsets??'missing'}
},print)
const capturePresented=async()=>{
 await settle()
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{win.webContents.endFrameSubscription();reject(Error('No presented frame '+step))},2000)
  win.webContents.beginFrameSubscription(false,()=>{clearTimeout(timer);win.webContents.endFrameSubscription();resolve()})
  win.webContents.invalidate()
 })
 await settle();return win.webContents.capturePage()
}
// Owned-window UI text emulation. Never scale score paper, SVG or print snapshots.
async function scaleTextChoiceChrome(){
 return run(()=>{
  const state=window.__textChoiceScale??={nodes:new Map(),roots:new Map()}
  for(const [n,value]of state.nodes)if(n.isConnected)n.style.fontSize=value
  for(const [n,values]of state.roots)if(n.isConnected)for(const [key,value]of values)n.style.setProperty(key,value)
  const roots=[...document.querySelectorAll('.ddirori')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot'))
  const tokens=['--dd-type-body','--dd-type-label','--dd-control-font']
  const rootSizes=roots.map(n=>{
   if(!state.roots.has(n))state.roots.set(n,tokens.map(key=>[key,n.style.getPropertyValue(key)]))
   return[n,tokens.map(key=>{const probe=document.createElement('span');probe.style.fontSize=`var(${key})`;n.append(probe);const px=parseFloat(getComputedStyle(probe).fontSize);probe.remove();return[key,px]})]
  })
  const sizes=[...document.querySelectorAll('.ddirori :is(button,input,select,summary,label,span,strong,output,h1,h2,h3,h4,p,dt,dd,code)')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot')).map(n=>{if(!state.nodes.has(n))state.nodes.set(n,n.style.fontSize);return[n,parseFloat(getComputedStyle(n).fontSize)]})
  for(const [n,values]of rootSizes)for(const [key,px]of values)n.style.setProperty(key,`${px*2}px`)
  for(const [n,px]of sizes)n.style.fontSize=`${px*2}px`
  return{roots:roots.length,nodes:sizes.length}
 })
}
async function prepareTextChoiceConditions(width,label,choiceLabel){
 const config={dock:width===960?207:360,theme:width===960?'dark':'light',coarse:width===1400,textScale:2}
 await click('속성 도크 설정')
 await run(()=>{const n=document.querySelector('input[aria-label="속성 도크 폭"]');if(!n?.checkVisibility())throw Error('Dock width control unavailable');n.focus();n.select()})
 await win.webContents.insertText(String(config.dock));await key('Enter');await key('Escape');await settle()
 if(config.coarse){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await settle()}
 const baseline=await sampleTextChoiceConditions(label,choiceLabel)
 assert.equal(baseline.coarse,config.coarse);assert.equal(baseline.theme,config.theme);assert.equal(baseline.savedWidth,config.dock);assert(Math.abs(baseline.dockWidth-config.dock)<1)
 for(const item of [baseline.input,baseline.choice])assert(item.height>=(config.coarse?47.9:31.9),'Unscaled pointer target must meet density contract')
 await scaleTextChoiceChrome();await settle()
 const enlarged=await sampleTextChoiceConditions(label,choiceLabel)
 assert(Math.abs(enlarged.input.font-baseline.input.font*2)<.1);assert(Math.abs(enlarged.choice.font-baseline.choice.font*2)<.1)
 assert.deepEqual(enlarged.glyph,baseline.glyph,'UI text emulation must preserve engraving font and local ink size')
 return{config,baseline,enlarged}
}
async function sampleTextChoiceConditions(label,choiceLabel){
 return run(({label,choiceLabel})=>{
  const input=document.querySelector(`input[aria-label="${label}"]`),choice=[...document.querySelectorAll('label')].find(n=>n.textContent===choiceLabel)?.control,dock=document.querySelector('.studio-properties-dock'),root=document.querySelector('.studio-selected-properties')
  const sample=n=>({font:parseFloat(getComputedStyle(n).fontSize),height:n.getBoundingClientRect().height})
  const glyph=document.querySelector('.score-canvas .vf-notehead text'),b=glyph?.getBBox(),s=glyph&&getComputedStyle(glyph)
  return{input:sample(input),choice:sample(choice),dockWidth:dock.getBoundingClientRect().width,savedWidth:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')).properties,theme:root.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,glyph:glyph?{font:s.fontFamily,size:s.fontSize,width:b.width,height:b.height}:null}
 },{label,choiceLabel})
}
async function auditEnteredNoteVisibility(expectedEdits=1){
    const visible=await run(()=>{
     const selected=document.querySelector('.score-canvas .notation-event.is-selected'),glyph=selected?.querySelector('.vf-notehead text'),canvas=document.querySelector('.score-canvas'),footer=document.querySelector('.studio-status')
     if(!selected||!glyph)throw Error('Selected entered note glyph missing')
     const d=glyph.getBoundingClientRect(),c=canvas.getBoundingClientRect(),f=footer.getBoundingClientRect(),context=document.createElement('canvas').getContext('2d'),style=getComputedStyle(glyph)
     if(!context)throw Error('Actual entered-note font measurement unavailable')
     context.font=style.font;context.textAlign='left';context.textBaseline='alphabetic'
     const metrics=context.measureText(glyph.textContent),point=glyph.getStartPositionOfChar(0),matrix=glyph.getScreenCTM(),a=new DOMPoint(point.x-metrics.actualBoundingBoxLeft,point.y-metrics.actualBoundingBoxAscent).matrixTransform(matrix),z=new DOMPoint(point.x+metrics.actualBoundingBoxRight,point.y+metrics.actualBoundingBoxDescent).matrixTransform(matrix),g={left:a.x,right:z.x,top:a.y,bottom:z.y}
     return{eventId:selected.dataset.eventId,partId:selected.dataset.partId,glyph:{left:g.left,right:g.right,top:g.top,bottom:g.bottom},glyphDomBounds:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},font:style.font,viewport:{left:Math.max(0,c.left),right:Math.min(innerWidth,c.right),top:Math.max(0,c.top),bottom:Math.min(innerHeight,c.bottom,f.top)},position:document.querySelector('[aria-label="입력 위치"]')?.textContent,activeEvent:document.activeElement?.dataset.eventId,documentScroll:document.scrollingElement.scrollTop,canvasScroll:canvas.scrollTop,history:document.querySelector('.editor-status').textContent,stopped:document.querySelector('.studio-playback button[aria-label="정지"]').disabled}
    })
    fs.writeFileSync(path.join(scene,'input-visible.json'),JSON.stringify(visible,null,2));fs.writeFileSync(path.join(scene,'entered-note.png'),(await capturePresented()).toPNG())
    const {glyph:g,viewport:v}=visible;assert.equal(visible.partId,'second-part');assert(g.right>g.left&&g.bottom>g.top);assert(g.left>=v.left-1&&g.right<=v.right+1&&g.top>=v.top-1&&g.bottom<=v.bottom+1,'Entered note must be exposed without QA scrolling')
    assert(visible.position.includes('1마디')&&visible.position.includes('2박')&&visible.history.includes(`${expectedEdits}회 수정`)&&visible.stopped,'Selected note tick0 and next input beat2 must remain distinct')
}
async function readUpperAnnotationInk(print){
 return run(print=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),canvas=document.createElement('canvas'),context=canvas.getContext('2d')
  if(!context)throw Error('Actual text metrics unavailable')
  return[...root.querySelectorAll('.notation-staff-text,.notation-system-text,.notation-harmony-mark,.notation-expression-text,.notation-rehearsal-mark')].map(group=>{
   const n=group.matches('.notation-rehearsal-mark')?group.querySelector('text'):group
   const style=getComputedStyle(n),svg=n.ownerSVGElement,point=n.getStartPositionOfChar(0),matrix=svg.getCTM().inverse().multiply(n.getCTM())
   // SVG's first-character start already includes text-anchor alignment.
   // Measure from that resolved origin once; reapplying center/end doubles it.
   context.font=style.font;context.textBaseline='alphabetic';context.textAlign='left'
   const b=context.measureText(n.textContent),a=new DOMPoint(point.x-b.actualBoundingBoxLeft,point.y-b.actualBoundingBoxAscent).matrixTransform(matrix),z=new DOMPoint(point.x+b.actualBoundingBoxRight,point.y+b.actualBoundingBoxDescent).matrixTransform(matrix)
   const frame=group.querySelector('rect'),r=frame?.getBBox(),stroke=frame?parseFloat(getComputedStyle(frame).strokeWidth)/2:0
   const logical=n.getBBox();if(style.textAnchor!=='start')assertAnchorOrigin()
   function assertAnchorOrigin(){if(Math.abs(point.x-logical.x)>Math.max(4,parseFloat(style.fontSize)))throw Error('Unverified SVG character origin '+n.textContent)}
   return{text:n.textContent,kind:group.getAttribute('class'),measureId:group.dataset.measureId,left:Math.min(a.x,r?r.x-stroke:Infinity),right:Math.max(z.x,r?r.x+r.width+stroke:-Infinity),top:Math.min(a.y,r?r.y-stroke:Infinity),bottom:Math.max(z.y,r?r.y+r.height+stroke:-Infinity),svgHeight:svg.viewBox.baseVal.height,svgWidth:svg.viewBox.baseVal.width}
  })
 },print)
}
async function auditCoincidentStaffText(print,score,phase){
 const ink=await readUpperAnnotationInk(print)
 fs.writeFileSync(path.join(scene,`staff-text-ink-${phase}.json`),JSON.stringify({print,expected:score.staffTexts.map(item=>item.text),ink},null,2))
 assert.deepEqual(ink.filter(item=>item.kind==='notation-staff-text').map(item=>item.text).sort(),score.staffTexts.map(item=>item.text).sort(),'Every authored staff text must be visible, not only the final same-measure entry')
 for(const item of ink){assert(item.right>item.left&&item.bottom>item.top);assert(item.left>=-.5&&item.right<=item.svgWidth+.5&&item.top>=-.5&&item.bottom<=item.svgHeight+.5)}
 for(let i=0;i<ink.length;i++)for(let j=i+1;j<ink.length;j++){
  const a=ink[i],b=ink[j],x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)
  assert(!(x>.5&&y>.5),'Actual upper text ink overlaps: '+a.text+' / '+b.text)
 }
}
async function auditCoincidentRehearsalMarks(print,score,phase){
 const ink=await readUpperAnnotationInk(print)
 fs.writeFileSync(path.join(scene,`rehearsal-ink-${phase}.json`),JSON.stringify({print,expected:score.rehearsalMarks.map(item=>item.text),ink},null,2))
 assert.deepEqual(ink.filter(item=>item.kind==='notation-rehearsal-mark').map(item=>item.text).sort(),score.rehearsalMarks.map(item=>item.text).sort(),'Every authored rehearsal mark must be visible, not only the final same-measure entry')
 for(const item of ink){assert(item.right>item.left&&item.bottom>item.top);assert(item.left>=-.5&&item.right<=item.svgWidth+.5&&item.top>=-.5&&item.bottom<=item.svgHeight+.5)}
 for(let i=0;i<ink.length;i++)for(let j=i+1;j<ink.length;j++){
  const a=ink[i],b=ink[j],x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)
  assert(!(x>.5&&y>.5),'Actual rehearsal/upper annotation ink overlaps: '+a.text+' / '+b.text)
 }
}
async function auditTempoPositions(print,score){
 const rows=await run(({print,score})=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas')
  return score.tempoEvents.map(event=>{
   const measure=score.parts[0].staves[0].measures.find(m=>m.id===event.measureId||`measure-${m.number}`===event.measureId),note=measure.voices[0].events.find(n=>n.position.tick===event.tick)
   const mark=[...root.querySelectorAll('.notation-tempo-marking--positioned')].find(n=>n.dataset.measureId===measure.id&&n.textContent===event.text),glyph=root.querySelector(`.notation-event[data-event-id="${note.id}"] .vf-notehead text`)
   if(!mark||!glyph)throw Error('Actual tempo or note anchor missing')
   const point=glyph.getStartPositionOfChar(0),matrix=glyph.ownerSVGElement.getCTM().inverse().multiply(glyph.getCTM()),p=new DOMPoint(point.x,point.y).matrixTransform(matrix)
   return{text:event.text,tick:event.tick,noteId:note.id,tempoX:Number(mark.getAttribute('x')),noteX:p.x}
  })
 },{print,score})
 fs.writeFileSync(path.join(scene,print?'tempo-position-print.json':'tempo-position-screen.json'),JSON.stringify(rows,null,2))
 for(const row of rows)assert(Math.abs(row.tempoX-row.noteX)<1,'Tempo must follow its real formatted note column: '+JSON.stringify(row))
}
async function auditExistingSystemTies(print){
 const ink=await run(print=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('svg')
  const pieces=[...root.querySelectorAll('.vf-stavetie')].flatMap(g=>[...g.querySelectorAll('path')].map(n=>{const b=n.getBBox();return{x:b.x,y:b.y,width:b.width,height:b.height,system:g.getAttribute('data-system-index')}}))
  const box=svg.viewBox.baseVal
  return{pieces,width:box.width||svg.width.baseVal.value,height:box.height||svg.height.baseVal.value}
 },print)
 fs.writeFileSync(path.join(scene,print?'existing-system-print.json':'existing-system-screen.json'),JSON.stringify(ink,null,2))
 assert.equal(ink.pieces.length,longExistingPartAudit?2:3,'Part independent wrapping keeps two complete ties; score wrapping has two partial ties and one complete tie')
 assert.equal(new Set(ink.pieces.map(p=>p.system)).size,longExistingPartAudit?1:2)
 assert(ink.pieces.every(p=>p.width>0&&p.height>0&&p.x>=0&&p.y>=0&&p.x+p.width<=ink.width+.1&&p.y+p.height<=ink.height+.1))
}
async function auditPrintHeader(){
 const prepared=await run(()=>{const root=document.querySelector('.studio-pdf-snapshot'),svg=root.querySelector('svg');return{width:svg.getBoundingClientRect().width,headerHeight:root.querySelector('.score-title').getBoundingClientRect().height,offset:svg.dataset.printHeaderOffset,unresolved:svg.dataset.printHeaderUnresolved,viewBox:svg.getAttribute('viewBox')}})
 win.webContents.debugger.attach('1.3')
 try{
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:'print'});await settle()
  const ink=await run(()=>{
   const root=document.querySelector('.studio-pdf-snapshot'),title=root.querySelector('.score-title'),svg=root.querySelector('svg'),rect=title.getBoundingClientRect(),matrix=svg.getScreenCTM(),context=document.createElement('canvas').getContext('2d')
   const glyphs=[...svg.querySelectorAll('text')].flatMap(n=>{
    const s=getComputedStyle(n);if(s.opacity==='0'||s.display==='none'||s.visibility==='hidden'||s.fill==='none'||s.fill==='transparent')return[]
    context.font=s.font||`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;context.textAlign='start';context.textBaseline='alphabetic'
    const b=context.measureText(n.textContent),p=n.getStartPositionOfChar(0),m=n.getScreenCTM(),x=p.x-b.actualBoundingBoxLeft,y=p.y-b.actualBoundingBoxAscent
    const a=new DOMPoint(x,y).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m)
    return z.x>a.x&&z.y>a.y?[{text:n.textContent,kind:n.getAttribute('class'),x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y}]:[]
   })
   const paper=root.querySelector('.score-page').getBoundingClientRect()
   const headerInk=[...title.querySelectorAll('.metadata-display')].flatMap(node=>{
    const style=getComputedStyle(node);context.font=style.font;context.textAlign='left';context.textBaseline='alphabetic'
    const text=node.firstChild;if(!text||text.nodeType!==Node.TEXT_NODE)return[]
    const positions=[];let i=0
    for(const char of text.textContent){
     const range=document.createRange();range.setStart(text,i);i+=char.length;range.setEnd(text,i)
     const b=range.getBoundingClientRect(),m=context.measureText(char)
     if(m.actualBoundingBoxLeft+m.actualBoundingBoxRight>0)positions.push({left:b.left-m.actualBoundingBoxLeft,right:b.left+m.actualBoundingBoxRight})
    }
    return positions.length?[{text:text.textContent,left:Math.min(...positions.map(p=>p.left)),right:Math.max(...positions.map(p=>p.right)),characters:positions.length}]:[]
   })
   return{title:title.textContent,header:{top:rect.top,bottom:rect.bottom,height:rect.height},paper:{left:paper.left,right:paper.right},headerInk,svg:{width:svg.getBoundingClientRect().width,matrixScale:matrix.a,offset:svg.dataset.printHeaderOffset,unresolved:svg.dataset.printHeaderUnresolved,viewBox:svg.getAttribute('viewBox')},firstInk:Math.min(...glyphs.map(n=>n.y)),glyphs}
  })
  const attempt=++headerAttempts;fs.writeFileSync(path.join(scene,`print-header-${attempt}.json`),JSON.stringify({prepared,...ink},null,2));fs.writeFileSync(path.join(scene,`print-header-${attempt}.png`),(await win.webContents.capturePage()).toPNG())
  // Preserve the real failed PDF for direct review, not only a DOM assertion.
  fs.writeFileSync(path.join(scene,`print-header-${attempt}.pdf`),await win.webContents.printToPDF({preferCSSPageSize:true}))
  assert(ink.glyphs.length>0&&ink.header.height>0,'Actual fonts and header layout must be measurable')
  assert(Math.abs(prepared.width-ink.svg.width)<0.1&&Math.abs(prepared.headerHeight-ink.header.height)<0.1,'The prepared immutable snapshot must have the actual print width and header wrapping before native save')
  assert.equal(prepared.viewBox,ink.svg.viewBox,'Starting print media must not change prepared engraving')
  assert.equal(prepared.unresolved,'false','Header clearance must settle before requesting native save')
  assert(ink.firstInk>=ink.header.bottom+7.5,`Printed header overlaps first notation: header bottom ${ink.header.bottom}, first actual glyph ${ink.firstInk}`)
  if(process.argv.includes('--audit-print-header-horizontal')){
   assert(ink.headerInk.length>0,'Actual HTML header characters must have measured ink')
   assert(ink.headerInk.every(n=>n.left>=ink.paper.left-.5&&n.right<=ink.paper.right+.5),'Printed title/composer glyph ink must stay within the page without truncating the source')
  }
 }finally{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:''});win.webContents.debugger.detach();await settle()}
}
async function auditTextInk(print){
 const ink=await run(({print,all})=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas');return[...root.querySelectorAll(all?'.notation-preview svg text':'.notation-staff-label,.notation-staff-text,.notation-system-text,.notation-expression-text')].filter(n=>n.textContent.trim()).map(n=>{const b=n.getBBox(),style=getComputedStyle(n);return{text:n.textContent,kind:n.getAttribute('class'),measureId:n.dataset.measureId,box:{x:b.x,y:b.y,width:b.width,height:b.height},fontFamily:style.fontFamily,fontSize:style.fontSize,fontStyle:style.fontStyle,fontWeight:style.fontWeight,stroke:style.stroke,strokeWidth:style.strokeWidth,strokeOpacity:style.strokeOpacity}})},{print,all:allTextInkAudit})
 fs.writeFileSync(path.join(scene,print?'print-text-ink.json':'screen-text-ink.json'),JSON.stringify(ink,null,2))
 assert.equal(ink.filter(n=>n.kind==='notation-staff-text').length,3,'Exactly one staff label per saved annotation')
 if(systemText)assert.deepEqual(ink.filter(n=>n.kind==='notation-system-text').map(n=>n.text).sort(),['Source system','Source system second','Source system','Source system second','Neighbor system'].sort(),'Every copied and neighboring system-text glyph must be present')
 else assert.ok(ink.some(n=>n.text==='Keep system'))
 assert.ok(ink.some(n=>n.text==='Keep expression'))
 if(allTextInkAudit)for(const kind of ['notation-lyric','notation-harmony-mark','notation-dynamic-mark'])assert.ok(ink.some(n=>n.kind===kind),'Fixture must exercise '+kind)
 for(const n of ink){assert.ok(n.box.width>0&&n.box.height>0);assert.ok(n.stroke==='none'||Number(n.strokeOpacity)===0||parseFloat(n.strokeWidth)===0,`Text must not inherit the VexFlow outline:${n.kind}:${n.text}:${n.stroke}`)}
}
async function auditMeasureRests(print){
 const geometry=await run(({print,score})=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('svg'),context=document.createElement('canvas').getContext('2d')
  const owner=score.parts[0].staves.at(-1)
  return{width:svg.getAttribute('viewBox')?.trim().split(/[ ,]+/)[2],events:root.querySelectorAll('.notation-event').length,
   expectedEvents:score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).length,rests:owner.measures.map(bar=>{
   const event=bar.voices[0].events[0],node=root.querySelector(`.notation-event[data-event-id="${event.id}"]`),text=node.querySelector('.vf-notehead text')
   if(!event.fullMeasure||!text)throw Error('Actual full-measure rest glyph missing')
   const style=getComputedStyle(text);context.font=style.font;context.textAlign='start';context.textBaseline='alphabetic'
   const b=context.measureText(text.textContent),p=text.getStartPositionOfChar(0),m=svg.getCTM().inverse().multiply(text.getCTM())
   const a=new DOMPoint(p.x-b.actualBoundingBoxLeft,p.y-b.actualBoundingBoxAscent).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m)
   const target=[...root.querySelectorAll('.notation-measure')].find(n=>n.dataset.measureId===bar.id)
   const start=Number(target?.dataset.fullMeasureRestStartX),end=Number(target?.dataset.fullMeasureRestEndX)
   return{id:event.id,center:(a.x+z.x)/2,inkWidth:z.x-a.x,inkHeight:z.y-a.y,expected:Number.isFinite(start)&&Number.isFinite(end)?(start+end)/2:undefined,transform:node.getAttribute('transform')}
  })}
 },{print,score:activeRestScore})
 fs.writeFileSync(path.join(scene,activeRestPhase+(print?'-print':'-screen')+'-rest-geometry.json'),JSON.stringify(geometry,null,2))
 assert.equal(geometry.events,geometry.expectedEvents,'Annotation-only formatter voices must not add selectable score events')
 assert.equal(geometry.rests.length,2);assert(geometry.rests.every(r=>r.inkWidth>0&&r.inkHeight>0),'Rest centering needs actual glyph ink after the existing transform')
 if(activeRestKind==='rest-solo')assert(geometry.rests.every(r=>Number.isFinite(r.expected)&&Math.abs(r.center-r.expected)<1.5),'Full rests must stay centered in the existing notation area, not a chord time column')
 const key=JSON.stringify([path.basename(path.dirname(scene)),print,activeRestPhase,geometry.width])
 if(activeRestKind==='rest-grand')restReferences.set(key,geometry.rests.map(r=>r.center))
 if(activeRestKind==='rest-grand-reference'){
  const expected=restReferences.get(key);assert(expected,'Compare lower-staff rest centers at the same viewport and engraving width')
  assert(geometry.rests.every((r,i)=>Math.abs(r.center-expected[i])<.5),'Chord annotations must not shift the lower-staff full rest compared with the chord-free control')
 }
}
async function auditVoiceLyricClearance(print){
 const expectationFile=path.join(path.dirname(sourceFile),'expectations.json')
 const expected=fs.existsSync(expectationFile)?JSON.parse(fs.readFileSync(expectationFile,'utf8')):undefined
 const result=await run(({print,score,expected})=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('.notation-preview svg'),context=document.createElement('canvas').getContext('2d')
  const events=[...root.querySelectorAll('.notation-event')],systems=new Map([...root.querySelectorAll('.notation-measure')].map(n=>[n.dataset.measureId,Number(n.dataset.systemIndex)]))
  // Passive staves share primary measure ordinals, not primary measure IDs.
  const primary=score.parts[0].staves[0].measures
  for(const part of score.parts)for(const staff of part.staves)staff.measures.forEach((bar,index)=>{
   const system=systems.get(primary[index]?.id);if(system===undefined)throw Error('Missing primary system for lyric measure ordinal')
   if(systems.has(bar.id)&&systems.get(bar.id)!==system)throw Error('Ambiguous lyric measure system')
   systems.set(bar.id,system)
  })
  const owner=event=>{const system=systems.get(event.dataset.measureId);if(system===undefined)throw Error('Unmapped lyric event system');return{id:event.dataset.eventId,staff:JSON.stringify([event.dataset.partId,event.dataset.staffId]),system}}
  const toRoot=(node,b)=>{const m=svg.getCTM().inverse().multiply(node.getCTM()),a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);return{x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y}}
  const stems=events.filter(n=>n.dataset.voiceStemDirection==='down').flatMap(event=>[...event.querySelectorAll('.vf-stem path')].map(node=>{
   const b=node.getBBox(),s=getComputedStyle(node),pad=(parseFloat(s.strokeWidth)||0)/2
   return{...owner(event),...toRoot(node,{x:b.x-pad,y:b.y-pad,width:b.width+2*pad,height:b.height+2*pad}),path:node.getAttribute('d')}
  }))
  const lyrics=[...root.querySelectorAll('.notation-lyric')].map(node=>{
   const matching=events.filter(n=>n.dataset.eventId===node.dataset.eventId);if(matching.length!==1)throw Error('Unambiguous lyric owner required')
   const s=getComputedStyle(node);context.font=s.font;context.textAlign='start';context.textBaseline='alphabetic';const b=context.measureText(node.textContent),p=node.getStartPositionOfChar(0)
   return{...owner(matching[0]),verse:node.dataset.lyricNumber,text:node.textContent,...toRoot(node,{x:p.x-b.actualBoundingBoxLeft,y:p.y-b.actualBoundingBoxAscent,width:b.actualBoundingBoxLeft+b.actualBoundingBoxRight,height:b.actualBoundingBoxAscent+b.actualBoundingBoxDescent})}
  })
  const collisions=[],gaps=[]
  for(const stem of stems)for(const lyric of lyrics){
   if(stem.staff!==lyric.staff||stem.system!==lyric.system)continue
   const x=Math.min(stem.x+stem.width,lyric.x+lyric.width)-Math.max(stem.x,lyric.x)
   if(x<=.05)continue
   const y=Math.min(stem.y+stem.height,lyric.y+lyric.height)-Math.max(stem.y,lyric.y);if(y>.05)collisions.push({stem,lyric,x,y})
   gaps.push(lyric.y-stem.y-stem.height)
  }
  const lowerMarks=[]
  if(expected){
   const marks=[...root.querySelectorAll('.notation-hairpin')]
   if(score.hairpins?.length!==1||marks.length!==1)throw Error('This lower-mark fixture requires one unambiguous rendered span')
   const span=score.hairpins[0],event=events.find(n=>n.dataset.eventId===span.startEventId),text=event.querySelector('.vf-notehead text'),p=text.getStartPositionOfChar(0)
   const m=svg.getCTM().inverse().multiply(text.getCTM()),origin=new DOMPoint(p.x,p.y).matrixTransform(m).y-expected.anchorNoteYOffset
   const lines=[...marks[0].querySelectorAll('line')];if(lines.length!==2)throw Error('Actual hairpin lines missing')
   const center=(Number(lines[0].getAttribute('y1'))+Number(lines[1].getAttribute('y1')))/2
   const lyricOffset=new Map(JSON.parse(svg.dataset.lyricOffsets||'[]')).get(0)||0
   const pinnedY=span.engraving?.offsetY!==undefined
   lowerMarks.push({center,expected:origin+expected.hairpinDefaultOffset+(pinnedY?0:lyricOffset)+(span.engraving?.offsetY||0)*10,pinnedY,engraving:span.engraving,lyricOffset})
  }
  return{stems,lyrics,collisions,gaps,lowerMarks,unresolved:svg.dataset.lyricInkUnresolved,svg:svg.outerHTML}
 },{print,score:activeVoiceScore,expected})
 const name=(print?'print':'screen')+'-voice-lyric-'+(++voiceLyricAuditCount)
 fs.writeFileSync(path.join(scene,name+'.svg'),result.svg);fs.writeFileSync(path.join(scene,name+'.json'),JSON.stringify({...result,svg:undefined,step},null,2));fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())
 assert(result.stems.length>0&&result.lyrics.length>0&&result.gaps.length>0,'Actual down stems and related lyric glyph ink must be present')
 assert.deepEqual(result.collisions,[],'Down stems must not cross actual lyric glyph ink')
 assert(result.gaps.every(g=>g>=7.9),'Automatic lyric rows must clear down-stem ink by the existing eight-unit annotation gap')
 assert.equal(result.unresolved,'false','The private lyric clearance must settle before publishing the renderer')
 assert(result.lowerMarks.every(mark=>Math.abs(mark.center-mark.expected)<.05),'Undefined hairpin Y stays automatic while explicit zero keeps its previous manual lane')
}
async function auditWordSpacing(print){
 const measured=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas')
  const words=[...root.querySelectorAll('.notation-staff-label,.notation-staff-text,.notation-system-text,.notation-expression-text,.notation-lyric,.notation-rehearsal-mark text')].filter(n=>n.textContent.includes(' ')).map(n=>({text:n.textContent,kind:n.getAttribute('class'),font:getComputedStyle(n).fontFamily,fontSize:getComputedStyle(n).fontSize,spaces:[...n.textContent].flatMap((c,i)=>c===' '?[{index:i,width:n.getSubStringLength(i,1)}]:[])}))
  const glyphs=[...root.querySelectorAll('.vf-notehead text,.vf-clef text,.vf-timesignature text')].map(n=>{const b=n.getBBox(),s=getComputedStyle(n);return{text:n.textContent,font:s.fontFamily,size:s.fontSize,width:b.width,height:b.height}})
  return{words,glyphs}
 },print)
 fs.writeFileSync(path.join(scene,print?'print-word-spacing.json':'screen-word-spacing.json'),JSON.stringify(measured,null,2));assert.ok(measured.words.length>=2,'Actual source words with spaces must be present');assert.ok(measured.glyphs.length>0,'Music glyph controls must be present')
 for(const word of measured.words)for(const space of word.spaces)assert.ok(space.width>0,`Saved word space must have visible advance:${word.text}:${space.index}:${space.width}`)
}
async function auditHarmonySpacing(print){
 const ink=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas');return [...root.querySelectorAll('.notation-harmony-mark')].map(n=>{const b=n.getBBox();return{text:n.textContent,measureId:n.dataset.measureId,x:b.x,y:b.y,width:b.width,height:b.height}})},print)
 const overlaps=[]
 for(let i=0;i<ink.length;i++)for(let j=i+1;j<ink.length;j++){
  const a=ink[i],b=ink[j]
  if(Math.abs(a.y-b.y)<.5){const amount=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);if(amount>.5)overlaps.push({a,b,amount})}
 }
 fs.writeFileSync(path.join(scene,print?'print-harmony-spacing.json':'screen-harmony-spacing.json'),JSON.stringify({ink,overlaps},null,2))
 fs.writeFileSync(path.join(scene,print?'print-harmony-spacing.png':'screen-harmony-spacing.png'),(await win.webContents.capturePage()).toPNG())
 assert.equal(ink.length,expectedHarmonyCount,'Every dense source chord must remain visible')
 assert(ink.every(n=>n.width>0&&n.height>0),'Actual text ink, not transparent selection boxes')
 assert.deepEqual(overlaps,[],'Consecutive chord ink must not overlap on the same row')
}
async function auditMeterHeaders(print){
 const headers=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas');return{times:[...root.querySelectorAll('.vf-timesignature')].map(n=>{const b=n.getBBox();return{text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height}}),clefs:root.querySelectorAll('.vf-clef').length,systems:new Set([...root.querySelectorAll('.notation-measure')].map(n=>n.dataset.systemIndex)).size}},print)
 fs.writeFileSync(path.join(scene,print?'print-meter-headers.json':'screen-meter-headers.json'),JSON.stringify({expected:expectedMeterHeaders,...headers},null,2))
 assert.equal(headers.times.length,expectedMeterHeaders,'Time signatures belong to the first and changed measures, not every system')
 assert.equal(headers.clefs,6,'Clefs must still appear on both staves in all three systems')
 assert.equal(headers.systems,3,'All three explicit systems must remain present')
 assert(headers.times.every(n=>n.width>0&&n.height>0),'Visible time signatures need actual music glyph ink')
}
async function auditPartLabels(print){
 const labels=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas');return[...root.querySelectorAll('.notation-staff-label')].map(n=>{const b=n.getBBox();return{text:n.textContent,partId:n.dataset.partId,staffId:n.dataset.staffId,x:b.x,y:b.y,width:b.width,height:b.height}})},print)
 fs.writeFileSync(path.join(scene,print?'print-part-labels.json':'screen-part-labels.json'),JSON.stringify({expected:expectedPartLabels,actual:labels},null,2))
 assert.deepEqual(labels.map(n=>[n.partId,n.staffId,n.text]),expectedPartLabels,'Use the first-system part name and explicit subsequent abbreviation, never generic lower-staff names')
 assert(labels.every(n=>n.width>0&&n.height>0),'Every displayed label must have actual text ink')
 const drawing=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('.notation-preview svg');return{svg:svg.outerHTML,events:svg.querySelectorAll('.notation-event').length,clefs:svg.querySelectorAll('.vf-clef').length,staves:[...svg.querySelectorAll('.vf-stave')].map(n=>{const b=n.getBBox();return{x:b.x,y:b.y,width:b.width,height:b.height,fill:getComputedStyle(n).fill,stroke:getComputedStyle(n).stroke}})}},print)
 fs.writeFileSync(path.join(scene,print?'print-part-label-drawing.svg':'screen-part-label-drawing.svg'),drawing.svg)
 fs.writeFileSync(path.join(scene,print?'print-part-label-drawing.json':'screen-part-label-drawing.json'),JSON.stringify({...drawing,svg:undefined},null,2))
 assert.equal(drawing.events,expectedPartDrawing.events,'Part labels must not remove any rendered musical events')
 assert.equal(drawing.staves.length,expectedPartDrawing.staves,'Each real staff measure must retain its stave')
 assert.equal(drawing.clefs,expectedPartDrawing.clefs,'Every explicit system must retain each staff clef')
}
async function auditHarmonySystemClearance(print){
 const result=await run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas')
  const box=n=>{const b=n.getBBox();return{text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height}}
  const chords=[...root.querySelectorAll('.notation-harmony-mark')].map(box),lyrics=[...root.querySelectorAll('.notation-lyric')].map(box),collisions=[]
  for(const chord of chords)for(const lyric of lyrics){const x=Math.min(chord.x+chord.width,lyric.x+lyric.width)-Math.max(chord.x,lyric.x),y=Math.min(chord.y+chord.height,lyric.y+lyric.height)-Math.max(chord.y,lyric.y);if(x>.5&&y>.5)collisions.push({chord,lyric,x,y})}
  return {chords,lyrics,collisions}
 },print)
 fs.writeFileSync(path.join(scene,print?'print-harmony-system-clearance.json':'screen-harmony-system-clearance.json'),JSON.stringify(result,null,2))
 assert.deepEqual(result.collisions,[],'Following system chord ink must clear preceding lyric ink')
 if(harmonySpanAudit)await auditHarmonySpanClearance(print)
 if(noteAnnotationAudit)await auditNoteAnnotationClearance(print)
}
async function auditNoteAnnotationClearance(print){
 const measured=await run(print=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),ctx=document.createElement('canvas').getContext('2d')
  if(!ctx)throw Error('Actual canvas glyph ink is required')
  const nodes=[...root.querySelectorAll('.notation-event')],staffKeys=[...new Set(nodes.map(n=>JSON.stringify([n.dataset.partId,n.dataset.staffId])))],staff=n=>staffKeys.indexOf(JSON.stringify([n.dataset.partId,n.dataset.staffId]))
  const system=id=>{const n=[...root.querySelectorAll('.notation-measure')].find(n=>n.dataset.measureId===id);return n?Number(n.dataset.systemIndex):undefined}
  const box=n=>{const s=getComputedStyle(n);ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const m=ctx.measureText(n.textContent),p=n.getStartPositionOfChar(0);return{x:p.x-m.actualBoundingBoxLeft,y:p.y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,text:n.textContent,font:ctx.font}}
  const heads=nodes.flatMap(n=>[...n.querySelectorAll('.vf-notehead text')].map(t=>({...box(t),staffIndex:staff(n),systemIndex:system(n.dataset.measureId)})))
  for(const text of root.querySelectorAll('.vf-clef[data-measure-id] text,.vf-keysignature[data-measure-id] text,.vf-timesignature[data-measure-id] text')){
   const measureId=text.closest('[data-measure-id]').dataset.measureId,event=nodes.find(n=>n.dataset.measureId===measureId)
   if(event)heads.push({...box(text),staffIndex:staff(event),systemIndex:system(measureId),kind:'header'})
  }
  const chords=[...root.querySelectorAll('.notation-harmony-mark')].map(n=>{const event=nodes.find(e=>e.dataset.measureId===n.dataset.measureId);return{...box(n),staffIndex:event?staff(event):-1,systemIndex:Number(n.dataset.systemIndex)}}),collisions=[],gaps=[]
  for(const head of heads)for(const chord of chords){if(head.systemIndex!==chord.systemIndex||head.staffIndex>=chord.staffIndex)continue;const x=Math.min(head.x+head.width,chord.x+chord.width)-Math.max(head.x,chord.x),y=Math.min(head.y+head.height,chord.y+chord.height)-Math.max(head.y,chord.y);if(x>.1){gaps.push(chord.y-head.y-head.height);if(y>.1)collisions.push({head,chord,x,y})}}
  return{heads,chords,collisions,gaps,staffCount:staffKeys.length,unresolved:root.querySelector('.notation-preview svg').dataset.staffInkUnresolved}
 },print)
 fs.writeFileSync(path.join(scene,print?'print-note-annotation-clearance.json':'screen-note-annotation-clearance.json'),JSON.stringify(measured,null,2))
 assert(measured.heads.every(h=>h.width>0&&h.height>0),'Use actual font glyph ink, not the large music-font em box')
 assert.deepEqual(measured.collisions,[],'Lower-staff chord text must not collide with upper-staff noteheads')
 assert(measured.gaps.every(gap=>gap>=7.9),'Lower-staff text must retain measured notehead clearance')
 assert.notEqual(measured.unresolved,'true','Measured staff layout must settle before publication')
}
async function auditHarmonySpanClearance(print){
 const measured=await run(print=>{
  const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas')
  const box=n=>{const b=n.getBBox(),s=getComputedStyle(n),pad=s.stroke!=='none'&&Number(s.strokeOpacity)!==0?(parseFloat(s.strokeWidth)||0)/2:0
   return{x:b.x-pad,y:b.y-pad,width:b.width+2*pad,height:b.height+2*pad,kind:n.getAttribute('class'),path:n.getAttribute('d')}}
  const system=n=>{const value=(n.closest('.vf-stavetie')||n).dataset.systemIndex;return value===undefined?undefined:Number(value)}
  const chords=[...root.querySelectorAll('.notation-harmony-mark')].map(n=>({...box(n),text:n.textContent,measureId:n.dataset.measureId,systemIndex:n.dataset.systemIndex===undefined?undefined:Number(n.dataset.systemIndex)}))
  const spans=[...root.querySelectorAll('.vf-stavetie path,.notation-slur')].map(n=>({...box(n),systemIndex:system(n)})),collisions=[],gaps=[]
  for(const chord of chords)for(const span of spans){const x=Math.min(chord.x+chord.width,span.x+span.width)-Math.max(chord.x,span.x),y=Math.min(chord.y+chord.height,span.y+span.height)-Math.max(chord.y,span.y);if(x>.5&&y>.5)collisions.push({chord,span,x,y})}
  for(const chord of chords)for(const span of spans)if(chord.systemIndex===span.systemIndex+1&&Math.min(chord.x+chord.width,span.x+span.width)>Math.max(chord.x,span.x))gaps.push(chord.y-span.y-span.height)
  const svg=root.querySelector('.notation-preview svg')
  return{chords,spans,collisions,gaps,passes:svg.dataset.systemInkPasses,unresolved:svg.dataset.systemInkUnresolved}
 },print)
 fs.writeFileSync(path.join(scene,print?'print-harmony-span-clearance.json':'screen-harmony-span-clearance.json'),JSON.stringify(measured,null,2))
 fs.writeFileSync(path.join(scene,print?'print-harmony-span-clearance.png':'screen-harmony-span-clearance.png'),(await win.webContents.capturePage()).toPNG())
 assert(measured.spans.length>0,'Actual visible tie/slur ink must be exercised')
 assert.deepEqual(measured.collisions,[],'Following system chord ink must clear visible tie/slur ink')
 assert(measured.spans.every(s=>Number.isInteger(s.systemIndex)),'Every visible curve needs a logical system owner')
 assert(measured.chords.every(s=>Number.isInteger(s.systemIndex)),'Primary and passive-staff chord ink need logical system owners')
 assert.notEqual(measured.unresolved,'true','Bounded measured layout must settle before publishing the SVG')
 assert(measured.gaps.every(gap=>gap>=7.9),'Adjacent-system actual curve and chord ink must retain measured clearance')
}
const wait=async(fn,arg)=>{for(let i=0;i<600;i++){if(await run(fn,arg))return;await new Promise(r=>setTimeout(r,25))}throw Error('Timeout '+step)}
const click=async label=>{
 if(!manualInputViewportAudit){await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable '+label);n.click()},label);await settle();return}
 // The renewed manual-scroll audit uses actual hit-tested pointer commands.
 // Prefer the visible menu item over an identically named underlying toolbar.
 const locate=scroll=>run(({label,scroll})=>{const matches=[...document.querySelectorAll('button')].filter(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility()),n=matches.find(n=>n.matches('[role="menuitem"],[role="menuitemcheckbox"]'))??matches[0];if(!n||n.disabled)throw Error('Unavailable '+label);if(scroll)n.scrollIntoView({block:'center',inline:'nearest'});const b=n.getBoundingClientRect(),x=Math.round(b.left+b.width/2),y=Math.round(b.top+b.height/2);return{x,y,owns:n.contains(document.elementFromPoint(x,y))}},{label,scroll})
 let point;const start=Date.now();while(true){const a=await locate(true);await settle();point=await locate(false);if(point.owns&&Math.abs(a.x-point.x)<1&&Math.abs(a.y-point.y)<1)break;assert(Date.now()-start<3000,'Actual pointer must reach '+label)}
 for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});await settle()
}
const key=async(keyCode,modifiers=[])=>{await wait(()=>document.hasFocus());win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()}
const file=async()=>{await click('파일');await click('파일 작업 열기')}
const filter=async value=>{await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 필터')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual labeled filter unavailable');n.click()});await settle();await run(value=>{const n=[...document.querySelectorAll('[role=option]')].find(n=>n.dataset.value===value&&n.checkVisibility());if(!n)throw Error('Missing actual filter option');n.click()},value);await settle()}
const save=async name=>{await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'));const value=JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics')));fs.writeFileSync(path.join(scene,name+'.chromatics'),JSON.stringify(value,null,2));return value}
const measure=async id=>{
 await run(id=>document.querySelector(`.score-canvas .notation-measure[data-measure-id="${id}"]`).scrollIntoView({block:'center'}),id);await settle()
 const point=await run(id=>{const n=document.querySelector(`.score-canvas .notation-measure[data-measure-id="${id}"]`),r=n.getBoundingClientRect();for(const fy of [.1,.9,.5])for(const fx of [.5,.8,.2]){const x=Math.round(r.x+r.width*fx),y=Math.round(r.y+r.height*fy);if(y>0&&y<innerHeight&&document.elementFromPoint(x,y)===n)return{x,y}}throw Error('No exposed actual measure pointer surface')},id)
 for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle();return point
}
async function probeShiftedLyricDraft(original,width,height){
 const owner=original.harmonies[0].measureId,bar=original.parts.flatMap(p=>p.staves.flatMap(s=>s.measures)).find(m=>m.id===owner)
 const note=bar.voices.find(v=>v.id==='voice-2').events[0],id=note.id,source=note.lyrics[0].text
 await run(id=>document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"][data-lyric-number="1"]`).scrollIntoView({block:'center'}),id);await settle()
 const point=await run(id=>{const n=document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"][data-lyric-number="1"]`),context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(n).font;const b=context.measureText(n.textContent),p=n.getStartPositionOfChar(0),q=new DOMPoint(p.x+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,p.y+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(n.getScreenCTM());const hit=document.elementFromPoint(q.x,q.y),box=n.getBBox();return{x:q.x,y:q.y,intendedVerse:n.dataset.lyricNumber,hitTag:hit?.tagName,hitClass:hit?.getAttribute('class'),hitVerse:hit?.getAttribute('data-lyric-number'),startY:p.y,ascent:b.actualBoundingBoxAscent,descent:b.actualBoundingBoxDescent,svgTextBox:{x:box.x,y:box.y,width:box.width,height:box.height}}},id)
 for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1})
 await wait(id=>document.activeElement?.matches('.notation-lyric-editor input')&&document.activeElement.dataset.eventId===id,id)
 const state=()=>run(()=>{const input=document.querySelector('.notation-lyric-editor input'),f=input.closest('foreignObject'),svg=f.ownerSVGElement,m=svg.getScreenCTM(),scale=Math.hypot(m.a,m.b),lyric=[...svg.querySelectorAll('.notation-lyric')].find(n=>n.dataset.eventId===input.dataset.eventId&&n.dataset.lyricNumber===input.dataset.lyricNumber),b=input.getBoundingClientRect();return{value:input.value,start:input.selectionStart,end:input.selectionEnd,active:document.activeElement===input,composing:input.dataset.editorComposing==='true',eventId:input.dataset.eventId,verse:input.dataset.lyricNumber,anchorDelta:Number(f.getAttribute('y'))+22/scale-lyric.getStartPositionOfChar(0).y,top:b.top,bottom:b.bottom,height:b.height,footer:document.querySelector('.editor-status').getBoundingClientRect().top,stopDisabled:document.querySelector('.studio-playback button[aria-label="정지"]').disabled,edits:document.querySelector('.editor-status').textContent}})
 const assertAnchor=(s,verse='1')=>{assert.equal(s.eventId,id);assert.equal(s.verse,verse);assert(Math.abs(s.anchorDelta)<.05,'The live editor must use the shifted lyric SVG baseline');assert(s.height>=31.9&&s.top>=0&&s.bottom<=s.footer+1,'The public editor target must remain visible above the sticky footer')}
 const initial=await state();fs.writeFileSync(path.join(scene,'shifted-lyric-initial.json'),JSON.stringify({point,initial,expectedSource:source},null,2));assertAnchor(initial);assert.equal(initial.value,source)
 await run(()=>document.querySelector('.notation-lyric-editor input').select());await win.webContents.insertText('임시가사');await run(()=>document.querySelector('.notation-lyric-editor input').setSelectionRange(1,3))
 const records=[]
 for(const nextWidth of [width===960?1400:960,width]){
  await run(()=>{const n=document.querySelector('.notation-lyric-editor input');n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'가'}))})
  win.setContentSize(nextWidth,height);await settle()
  await run(()=>{const n=document.querySelector('.notation-lyric-editor input');for(const [key,code] of [['Escape','Escape'],[' ','Space']])n.dispatchEvent(new KeyboardEvent('keydown',{key,code,isComposing:true,bubbles:true,cancelable:true}))})
  const composing=await state();assert.equal(composing.value,'임시가사');assert(composing.active&&composing.composing&&composing.stopDisabled);assert(composing.edits.includes('0회 수정'))
  await run(()=>document.querySelector('.notation-lyric-editor input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'가'})))
  await settle();await wait(()=>document.activeElement?.matches('.notation-lyric-editor input')&&document.activeElement.value==='임시가사'&&document.activeElement.dataset.editorComposing!=='true')
  const restored=await state();assertAnchor(restored);assert.deepEqual([restored.start,restored.end],[1,3]);assert(restored.active&&restored.stopDisabled);assert(restored.edits.includes('0회 수정'));records.push({width:nextWidth,composing,restored})
 }
 await key('Escape');const cancelled=await state();assert.equal(cancelled.value,source);assert(cancelled.edits.includes('0회 수정'));assert(cancelled.stopDisabled)
 await click('악보로 이동');assert.deepEqual((await save('lyric-draft-cancelled')).score,original)
 await run(id=>document.querySelector(`.score-canvas .notation-lyric[data-event-id="${id}"][data-lyric-number="2"]`).focus(),id);await key('Enter');await wait(()=>document.activeElement?.matches('.notation-lyric-editor input')&&document.activeElement.dataset.lyricNumber==='2')
 const second=await state();assertAnchor(second,'2');assert.equal(second.value,note.lyrics.find(l=>l.number===2).text);await key('Escape');await click('악보로 이동');assert.deepEqual((await save('keyboard-verse-preserved')).score,original)
 fs.writeFileSync(path.join(scene,'shifted-lyric-draft.json'),JSON.stringify({initial,records,cancelled,second,nativeOriginalExact:true,syntheticCompositionOnly:true},null,2));fs.writeFileSync(path.join(scene,'shifted-lyric-draft.png'),(await win.webContents.capturePage()).toPNG())
}

async function editDenseHarmonies(original,width){
 const harmonies=original.harmonies,owner=harmonies[0].measureId
 const measure=original.parts.flatMap(p=>p.staves.flatMap(s=>s.measures)).find(m=>m.id===owner),events=(harmonyVoices?measure.voices.find(v=>v.id==='voice-2'):measure.voices[0]).events
 const field='input[aria-label="선택 요약 코드"]',snapshots=[original],records=[]
 const selection=()=>run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
 const systems=()=>run(()=>[...new Set([...document.querySelectorAll('.score-canvas .notation-measure')].map(n=>n.dataset.systemIndex))].length)
 const beforeSystems=await systems()
 for(let i=0;i<4;i++){
  step=`harmony-edit-${width}-${i}`
  await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus()},events[i].id);await key('Enter')
  assert.deepEqual(await selection(),[events[i].id])
  if(harmonyVoices){
   const address=await run(()=>{const n=document.querySelector('.score-canvas .notation-event.is-selected');return{voice:n.dataset.voiceId,lane:n.dataset.voiceLane,stem:n.dataset.voiceStemDirection}})
   assert.deepEqual(address,{voice:'voice-2',lane:'lower',stem:'down'},'The real selected object must be the second voice, distinct from next-input settings')
  }
  await click('추가');await click('가사 및 코드');await click('코드 심벌 편집')
  await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 코드'&&document.activeElement.checkVisibility())
  const text=['C','Dm','G7','F'][i]
  await run(selector=>{const n=document.querySelector(selector);n.scrollIntoView({block:'center'});n.focus();n.select()},field)
  await win.webContents.insertText(text);await key('Enter');await settle()
  const focusAfterEnter=await run(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label')}))
  assert.notEqual(focusAfterEnter.label,'선택 요약 코드','The existing text adapter intentionally commits by blur on Enter')
  await click('악보로 이동');await wait(id=>document.activeElement?.dataset.eventId===id,events[i].id)
  assert.equal(await run(selector=>document.querySelector(selector).value,field),text)
  const afterSystems=await systems()
  if(voiceLyricAudit)await auditVoiceLyricClearance(false)
  const current=(await save('harmony-edited-'+i)).score,previous=snapshots.at(-1),old=previous.harmonies.find(h=>h.measureId===owner&&h.tick===events[i].position.tick),edited=current.harmonies.find(h=>h.id===old.id)
  assert.deepEqual({...current,harmonies:previous.harmonies},previous,'Only the selected harmony family may change')
  assert.deepEqual(current.harmonies.filter(h=>h.id!==old.id),previous.harmonies.filter(h=>h.id!==old.id),'Neighbor IDs, owners, ticks and order stay exact')
  assert.equal(edited.text,text);assert.equal(edited.measureId,owner);assert.equal(edited.tick,old.tick)
  assert.deepEqual(edited.root,{step:['C','D','G','F'][i]});assert.equal(edited.kind,['major','minor','dominant','major'][i]);assert.equal(edited.bass,undefined)
  assert(await run(count=>document.querySelector('.editor-status').textContent.includes(`${count}회 수정`),i+1),'Enter plus actual file-menu blur makes exactly one undo entry')
  assert.deepEqual(await selection(),[events[i].id])
  snapshots.push(current);records.push({eventId:events[i].id,text,afterSystems,focusAfterEnter,scoreFocusReturned:true})
 }
 const final=snapshots.at(-1),afterSystems=await systems()
 assert(afterSystems<=beforeSystems,'Shorter labels must not create extra systems')
 if(width===1400)assert(afterSystems<beforeSystems,'The wide fixture must exercise a real line-break change')
 await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
 const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),xml=path.join(scene,'edited-reflow.musicxml');fs.copyFileSync(path.join(scene,'filtered.musicxml'),xml)
 const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xml],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}})
 fs.writeFileSync(path.join(scene,'edited-xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
 assert.deepEqual((await save('edited-after-xml')).score,final)
 await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'))
 assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(path.dirname(sourceFile),'source.mid')))
 let count=pdfSaves;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfSaves,count+1);fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'edited-reflow.pdf'))
 assert.deepEqual((await save('edited-after-pdf')).score,final)
 const redoSelections=new Map(),historySelections=[]
 for(let i=3;i>=0;i--){
  redoSelections.set(i+1,await selection())
  await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('harmony-undo-'+i)).score,snapshots[i])
  const selected=await selection();assert.deepEqual(selected,[events[i].id],'Undo restores the selection captured at that command, not the last edit forever');historySelections.push({action:'undo',index:i,selected})
 }
 for(let i=1;i<=4;i++){
  await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('harmony-redo-'+i)).score,snapshots[i])
  const selected=await selection();assert.deepEqual(selected,redoSelections.get(i),'Redo restores the selection captured when that state was undone');historySelections.push({action:'redo',index:i,selected})
 }
 openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('edited-native-reopened')).score,final)
 fs.writeFileSync(path.join(scene,'harmony-edit.json'),JSON.stringify({width,beforeSystems,afterSystems,records,historySelections,exactFourUndoRedo:true,nativeReopenExact:true,sourceAndManualGeometryPreserved:true,midiExact:true},null,2))
 fs.writeFileSync(path.join(scene,'edited-native-reopened.png'),(await win.webContents.capturePage()).toPNG())
 openCurrent=false;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.chromatics을 열었습니다.'));assert.deepEqual((await save('original-restored')).score,original)
}
app.whenReady().then(async()=>{
 const deadline=setTimeout(()=>{console.error('Deadline '+step);app.exit(1)},90000)
 const original=longEmptyInputAudit||boundaryInputAudit||partCopySnapshotAudit||repeatConflictAudit||repeatCountAudit||partRepeatAudit||secondaryContextAudit||expressionObjectAudit||rehearsalPointerAudit||inputPartIdentity||tempoLabelAudit||tempoWarningAudit||tempoPositionAudit||unequal||xmlRoundtrip||ambiguousLyricAudit||coincidentTextAudit?undefined:JSON.parse(fs.readFileSync(sourceFile)),first=original?.score.parts[0].staves[0].measures[0].id
 const rows=[];win=new BrowserWindow({width:960,height:750,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
 try{
 if(longEmptyInputAudit){
  for(const kind of (longExistingSystemAudit?['short-multi-existing']:longMeterVoiceAudit?['short-meter','compound-meter','odd','short-multi']:longCompoundInputAudit?['compound','odd']:['meter','pickup','dotted']))for(const width of [960,1400]){
   sourceFile=path.join(source,kind,longExistingPartAudit?'source-independent.chromatics':'source.chromatics');const bytes=fs.readFileSync(sourceFile),sourceProject=JSON.parse(bytes),sourceScore=sourceProject.score,goldenMidi=fs.readFileSync(path.join(source,kind,longExistingPartAudit?'expected-part.mid':'expected.mid')),descriptor=JSON.parse(fs.readFileSync(path.join(source,kind,'expected-target.json')))
   scene=path.join(out,kind,String(width));fs.mkdirSync(scene,{recursive:true});step='empty-long-'+kind+'-'+width;console.log('START '+step);openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,1000)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
   if(longExistingPartAudit){
    boundaryExpectedPartId=sourceScore.parts[0].id
    const choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Part view choice unavailable');n.scrollIntoView({block:'center'});n.focus()},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
    await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',0)
    assert.equal(await run(()=>document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId),boundaryExpectedPartId)
   }
   const count=nativeXmlSaves;await click('파일');await click('파일 작업 열기');await click('MusicXML로 저장');assert.equal(nativeXmlSaves,count);assert(await run(message=>document.querySelector('.editor-status').textContent.includes(message),descriptor.voiceId==='voice-2'?'빈 성부가 있어':'빈 마디가 있어'))
   await measure('lower-short');if(descriptor.voiceId==='voice-2')await key('2',['control','alt']);await key('N');await key(kind==='pickup'?'6':'7');if(kind==='pickup'||kind==='dotted')await key('.');const duration=await run(()=>document.querySelector('.studio-input-context').textContent);assert(duration.includes('점 '+(kind==='pickup'||kind==='dotted'?'1':'0')));fs.writeFileSync(path.join(scene,'requested-duration.json'),JSON.stringify({kind,duration},null,2));await key('C');await key('Escape')
   const enteredProject=await save('entered'),entered=enteredProject.score;if(longExistingPartAudit){assert.deepEqual(enteredProject.partLayouts,sourceProject.partLayouts);assert.deepEqual(enteredProject.view,{mode:'part',partId:boundaryExpectedPartId})};assert.deepEqual(entered.parts.flatMap(p=>p.staves.map(s=>s.measures.length)),Array(3).fill(descriptor.measureCount));const lower=entered.parts[0].staves[1].measures
   const voiceIndex=descriptor.voiceId==='voice-2'?1:0
   assert.deepEqual(lower.map(m=>({timing:m.timing,timeSignature:m.timeSignature,events:m.voices[voiceIndex].events.map(({id,...event})=>event)})),descriptor.measures,'Independent full-rest control retains every target event field except generated IDs')
   assert.deepEqual({...lower[0],voices:[]},{...sourceScore.parts[0].staves[1].measures[0],voices:[]});assert.deepEqual(lower[0].voices.filter(v=>v.id!==descriptor.voiceId),sourceScore.parts[0].staves[1].measures[0].voices.filter(v=>v.id!==descriptor.voiceId))
   const first=lower[0].voices[voiceIndex].events,second=lower[1].voices[voiceIndex].events;assert.equal(first.length,1);assert.equal(first[0].type,'note');assert.equal(first[0].ties.start,true);assert.deepEqual(first[0].pitch,{step:'C',alter:0,octave:4});assert.equal(second[0].ties.stop,true);assert.deepEqual(second[0].pitch,first[0].pitch)
   if(!longCompoundInputAudit){assert.deepEqual(first[0].duration,{value:kind==='meter'?'half':kind==='pickup'?'quarter':'whole',dots:kind==='meter'?1:0});assert.deepEqual(second[0].duration,{value:kind==='meter'?'quarter':'half',dots:0})};assert.equal(lower[1].timing.type,'regular')
   for(const [pi,part]of sourceScore.parts.entries())for(const [si,staff]of part.staves.entries())if(pi!==0||si!==1)assert.deepEqual(entered.parts[pi].staves[si].measures[0],staff.measures[0])
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,sourceScore);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,entered)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));const reopened=await save('reopened');assert.deepEqual(reopened.score,entered);if(longExistingPartAudit){assert.deepEqual(reopened.partLayouts,sourceProject.partLayouts);assert.deepEqual(reopened.view,{mode:'part',partId:boundaryExpectedPartId})}
   if(longExistingSystemAudit){
    assert.deepEqual(entered.layout,sourceScore.layout)
    for(const [pi,part]of sourceScore.parts.entries())for(const [si,staff]of part.staves.entries())for(const [mi,bar]of staff.measures.entries()){
     const actual=entered.parts[pi].staves[si].measures[mi]
     if(pi===0&&si===1)assert.deepEqual(actual.voices[0],bar.voices[0]);else assert.deepEqual(actual,bar)
    }
    await auditExistingSystemTies(false)
   }
   await click('악보로 이동');fs.writeFileSync(path.join(scene,'entered.png'),(await capturePresented()).toPNG());await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),goldenMidi)
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),goldenMidi)
   await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-after-xml')).score,entered);await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));const pdf=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(pdf.status,0,pdf.stderr);assert.match(pdf.stdout,/Pages:\s+1/)
   assert.deepEqual(fs.readFileSync(sourceFile),bytes);rows.push({kind,width,height:1000,oneUndoRedo:true,peerAndSourcePreserved:true,alignedAppend:true,nativeExact:true,normalRestControlMidi:true,xmlRoundtripMidi:true,xsd:true,pdf:pdf.stdout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS '+step)
  }
  return
 }
 if(geometryPointerAudit){
  const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score
  for(const width of [960,1400])for(const scenario of ['valid','escape','invalid','composition']){
   scene=path.join(out,String(width),scenario);fs.mkdirSync(scene,{recursive:true});step='geometry-pointer-'+width+'-'+scenario;console.log('START '+step);openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,1000)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.chromatics을 열었습니다.'))
   const chooseSpan=async prefix=>{
    await click('도구');await click('범위 표기 찾기');await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 객체 선택')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual span choice missing');n.scrollIntoView({block:'center'});n.focus()});await key('Space')
    await run(prefix=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.checkVisibility()&&n.dataset.value?.startsWith(prefix));if(!n||n.getAttribute('aria-disabled')==='true')throw Error('Actual span option missing');n.click()},prefix);await settle()
    await run(()=>{const n=[...document.querySelectorAll('.studio-span-properties__geometry button')].find(n=>n.textContent.trim()==='배치 · 형상');if(!n?.checkVisibility()||n.disabled)throw Error('Geometry disclosure unavailable');if(n.getAttribute('aria-expanded')!=='true')n.click()});await settle()
   }
   await chooseSpan('hairpin:manual-dynamic-control');const beforeInk=await readDynamicClearance(false)
   await run(()=>{const n=document.querySelector('input[aria-label="표기 세로 이동"]');if(!n?.checkVisibility()||n.disabled||n.value!=='0')throw Error('Owned geometry input not at explicit zero');n.scrollIntoView({block:'center'});n.focus();n.select();window.__oldGeometryInput=n})
   await win.webContents.insertText(scenario==='invalid'?'99':'2');await settle()
   const draft=await run(()=>({value:window.__oldGeometryInput.value,valid:window.__oldGeometryInput.validity.valid,focused:document.activeElement===window.__oldGeometryInput,history:document.querySelector('.editor-status').textContent}));assert.equal(draft.value,scenario==='invalid'?'99':'2');assert(draft.focused&&draft.history.includes('0회 수정'));assert.equal(draft.valid,scenario!=='invalid')
   if(scenario==='escape')await key('Escape')
   if(scenario==='composition')await run(()=>window.__oldGeometryInput.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'한'})))
   const id=width===960?'primary-bar-2-b':'lower-bar-4-b'
   await run(id=>document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]').scrollIntoView({block:'center'}),id);await settle()
   const point=await run(id=>{const event=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]'),n=event.querySelector('.vf-notehead text'),context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(n).font;const b=context.measureText(n.textContent),p=n.getStartPositionOfChar(0),q=new DOMPoint(p.x+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,p.y+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(n.getScreenCTM()),x=Math.round(q.x),y=Math.round(q.y);if(!event.contains(document.elementFromPoint(x,y)))throw Error('Geometry target note is not reachable');return{x,y}},id)
   for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle()
   const selected=await run(()=>({focus:document.activeElement?.getAttribute('data-event-id'),tag:document.activeElement?.tagName,selected:document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId,history:document.querySelector('.editor-status').textContent,spanField:document.querySelector('input[aria-label="표기 세로 이동"]')?.value}));fs.writeFileSync(path.join(scene,'pointer-state.json'),JSON.stringify({draft,selected,point},null,2));fs.writeFileSync(path.join(scene,'pointer.png'),(await capturePresented()).toPNG())
   assert.equal(selected.selected,id);assert.equal(selected.focus,id,'A geometry blur commit must retain focus on the explicitly clicked note');assert(selected.history.includes((scenario==='valid'?'1':'0')+'회 수정'))
   await key('N');assert(await run(()=>document.querySelector('.studio-input-context').textContent.includes('음표 입력')));await key('Escape')
   if(scenario==='composition'){
    await chooseSpan('slur:manual-slur-control');await run(()=>window.__oldGeometryInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'})));await settle();assert.equal(await run(()=>document.querySelector('input[aria-label="표기 세로 이동"]').value),'','A previous composing draft must not enter another span')
   }
   const expected=structuredClone(sourceScore);if(scenario==='valid')expected.hairpins.find(n=>n.id==='manual-dynamic-control').engraving.offsetY=2
   assert.deepEqual((await save('after-pointer')).score,expected)
   const afterInk=await readDynamicClearance(false);assert(Math.abs(afterInk.manualRelativeY-beforeInk.manualRelativeY-(scenario==='valid'?20:0))<.15);assert(Math.abs(afterInk.manualHeight-beforeInk.manualHeight)<.15)
   if(scenario==='valid'){await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,sourceScore);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,expected)}
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,expected)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));const pdf=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(pdf.status,0,pdf.stderr);assert.match(pdf.stdout,/Pages:\s+1/)
   assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes);rows.push({width,height:1000,scenario,draft,selected,beforeInk,afterInk,oneBlurCommit:scenario==='valid',nativeExact:true,syntheticIme:scenario==='composition',midiExact:true,pdf:pdf.stdout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS '+step)
  }
  return
 }
 if(boundaryInputAudit){
  for(const kind of ['tie','tuplet'])for(const width of [960,1400]){
   sourceFile=path.join(source,kind,'source.chromatics');const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score,goldenMidi=fs.readFileSync(path.join(source,kind,boundaryInputPartAudit?'expected-part.mid':'expected.mid'));boundaryExpectedPartId=sourceScore.parts[0].id
   scene=path.join(out,kind,String(width));fs.mkdirSync(scene,{recursive:true});step='boundary-'+kind+'-'+width;console.log('START '+step);openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,1000)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.chromatics을 열었습니다.'))
   if(boundaryInputPartAudit){
    const choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Part view choice unavailable');n.scrollIntoView({block:'center'});n.focus()},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
    await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',0);assert.equal(await run(()=>document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId),boundaryExpectedPartId)
   }
   const pointerSelect=async id=>{await run(id=>document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]').scrollIntoView({block:'center'}),id);await settle()
   const point=await run(id=>{const event=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]'),n=event.querySelector('.vf-notehead text')||event.querySelector('text');if(!n?.checkVisibility())throw Error('Actual note/rest ink unavailable');const context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(n).font;const b=context.measureText(n.textContent),p=n.getStartPositionOfChar(0),q=new DOMPoint(p.x+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,p.y+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(n.getScreenCTM()),x=Math.round(q.x),y=Math.round(q.y);if(!event.contains(document.elementFromPoint(x,y)))throw Error('Pointer does not reach actual note/rest');return{x,y}},id)
   for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle();assert.equal(await run(()=>document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId),id);assert.equal(await run(()=>document.activeElement?.getAttribute('data-event-id')),id,'Explicit pointer selection must move focus from the menubar/previous note');return point}
   await pointerSelect('primary-bar-1-a');const id=kind==='tie'?'lower-bar-4-b':'lower-bar-4-c',point=await pointerSelect(id)
   await run(()=>{window.__boundaryKeys=[];window.addEventListener('keydown',event=>{const row={key:event.key,code:event.code,composing:event.isComposing,tag:event.target.tagName,role:event.target.getAttribute?.('role'),label:event.target.getAttribute?.('aria-label'),active:document.activeElement?.tagName};window.__boundaryKeys.push(row);setTimeout(()=>row.prevented=event.defaultPrevented,0)},true)})
   const trace=async phase=>{const state=await run(()=>({keys:window.__boundaryKeys,input:document.querySelector('.studio-input-context').textContent,status:document.querySelector('.editor-status').textContent,active:{tag:document.activeElement?.tagName,role:document.activeElement?.getAttribute('role'),label:document.activeElement?.getAttribute('aria-label')}}));fs.writeFileSync(path.join(scene,'trace-'+phase+'.json'),JSON.stringify(state,null,2))}
   await trace('before');await key('N');await trace('N')
   if(kind==='tie'){await key('7');await trace('7');await key('C');await trace('C')}else{await key('3',['control']);await key('C');await key('D');assert(await run(()=>document.querySelector('.editor-status').textContent.includes('0회 수정')));await key('E');await trace('E')}
   await key('Escape');assert(await run(()=>document.querySelector('.editor-status').textContent.includes('1회 수정')))
   const entered=(await save('entered')).score;assert.deepEqual(entered.parts.flatMap(p=>p.staves.map(s=>s.measures.length)),[5,5,5]);assert.deepEqual(entered.slurs,sourceScore.slurs);assert.deepEqual(entered.hairpins,sourceScore.hairpins)
   for(const [pi,part]of sourceScore.parts.entries())for(const [si,staff]of part.staves.entries()){
    const actual=entered.parts[pi].staves[si]
    if(pi===0&&si===1){assert.deepEqual(actual.measures.slice(0,3),staff.measures.slice(0,3));assert.deepEqual(actual.measures[3].voices[0].events.slice(0,staff.measures[3].voices[0].events.length-1),staff.measures[3].voices[0].events.slice(0,-1))}
    else assert.deepEqual(actual.measures.slice(0,4),staff.measures)
   }
   const lower=entered.parts[0].staves[1].measures
   if(kind==='tie'){assert.equal(lower[3].voices[0].events.at(-1).ties.start,true);assert.equal(lower[4].voices[0].events[0].ties.stop,true);assert.deepEqual(lower[3].voices[0].events.at(-1).pitch,lower[4].voices[0].events[0].pitch)}
   else{const voice=lower[3].voices[0],group=voice.tuplets[0];assert.equal(group.actualNotes,3);assert.equal(group.normalNotes,2);assert.deepEqual(group.eventIds,voice.events.filter(e=>e.duration.tuplet).map(e=>e.id))}
   await click('악보로 이동');await key('Z',['control'])
   if(kind==='tuplet'){
    const restored=await run(()=>({input:document.querySelector('.studio-input-context').textContent,status:document.querySelector('.editor-status').textContent}));assert(restored.status.includes('2/3')&&restored.status.includes('0회 수정'));fs.writeFileSync(path.join(scene,'undo-pending-draft.json'),JSON.stringify(restored,null,2))
    const count=projectSaves;await click('파일');await click('프로젝트 저장');assert.equal(projectSaves,count);assert(await run(()=>document.querySelector('.editor-status').textContent.includes('셋잇단음표 입력을 완료하거나 취소한 뒤 저장해 주세요.')))
    await click('악보로 이동');await key('Escape');await key('Escape')
   }
   assert.deepEqual((await save('undo')).score,sourceScore);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,entered)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,entered)
   if(boundaryInputPartAudit)assert.equal(await run(()=>document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId),boundaryExpectedPartId)
   await click('악보로 이동');fs.writeFileSync(path.join(scene,'entered.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),goldenMidi)
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),goldenMidi)
   await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-after-xml')).score,entered)
   await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));const pdf=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(pdf.status,0,pdf.stderr);assert.match(pdf.stdout,/Pages:\s+1/)
   assert.deepEqual(fs.readFileSync(sourceFile),bytes);rows.push({kind,width,height:1000,pointer:point,alignedMeasures:true,oneUndoRedo:true,nativeExact:true,independentFixtureMidi:true,xmlRoundtripMidi:true,xsd:true,pdf:pdf.stdout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS '+step)
  }
  return
 }
 if(emptyMultipleVoicesAudit){
  const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score
  for(const width of [960,1400]){
   scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='empty-multiple-'+width;console.log('START '+step);openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,1000)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.chromatics을 열었습니다.'))
   const copy=async()=>{await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');return run(()=>document.querySelector('.editor-status__result').textContent)}
   const start=xmlSaves;const initial=await copy();assert(initial.includes('빈 마디'));assert.equal(xmlSaves,start)
   await measure('measure-1');await key('N');await key('7');await key('C');await key('Escape');const firstFilled=(await save('first-voice')).score
   const firstEvents=firstFilled.parts[0].staves[0].measures[0].voices[0].events;assert.equal(firstEvents.length,1);assert.equal(firstEvents[0].type,'note');assert.deepEqual(firstEvents[0].pitch,{step:'C',alter:0,octave:4});assert.deepEqual(firstEvents[0].duration,{value:'whole',dots:0});assert.deepEqual(firstEvents[0].position,{tick:0})
   const firstExpected=structuredClone(sourceScore);firstExpected.parts[0].staves[0].measures[0].voices[0].events=firstEvents;assert.deepEqual(firstFilled,firstExpected)
   const partial=await copy();assert(partial.includes('빈 성부가 있어'));assert(partial.includes('2성부'));assert(!partial.includes(': gap'));assert.equal(xmlSaves,start,'A still-empty peer voice must retain strict XML rejection');fs.writeFileSync(path.join(scene,'remaining-empty-voice.png'),(await capturePresented()).toPNG())
   await measure('measure-1');await key('2',['control','alt']);await key('N');await key('7');await key('0');await key('Escape');const filled=(await save('second-voice')).score
   const rest=filled.parts[0].staves[0].measures[0].voices[1].events;assert.equal(rest.length,1);assert.equal(rest[0].type,'rest');assert.deepEqual(rest[0].duration,{value:'whole',dots:0});assert.deepEqual(rest[0].position,{tick:0})
   const expected=structuredClone(firstFilled);expected.parts[0].staves[0].measures[0].voices[1].events=rest;assert.deepEqual(filled,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-second')).score,firstFilled);await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-first')).score,sourceScore)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo-first')).score,firstFilled);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo-second')).score,filled)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,filled)
   const success=await copy();assert(success.includes('filtered.musicxml'));assert.equal(xmlSaves,start+1)
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));const midi=fs.readFileSync(path.join(scene,'filtered.mid'));fs.writeFileSync(path.join(scene,'native.mid'),midi)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),midi)
   await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-after-xml')).score,filled);await click('악보로 이동');fs.writeFileSync(path.join(scene,'filled.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));const pdf=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(pdf.status,0,pdf.stderr);assert.match(pdf.stdout,/Pages:\s+1/)
   assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes);rows.push({width,height:1000,initial,partial,success,twoExplicitEntries:true,noPeerAutoFill:true,twoUndoRedo:true,nativeExact:true,xsd:true,midiRoundtrip:true,pdf:pdf.stdout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS '+step)
  }
  return
 }
 if(emptyExportRetryAudit){
  sourceFile=path.join(source,'empty-voice.chromatics');const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score
  for(const width of [960,1400]){
   const height=1000;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='empty-retry-'+width;console.log('START '+step);openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.score-title').textContent.includes('Generated dynamic empty'))
   const exportXml=async channel=>{
    await click('파일');await click(channel==='save'?'파일 작업 열기':'내보내기 설정');const label=channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'
    await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&!n.disabled&&(n.getAttribute('aria-label')||n.textContent).trim()===label);if(!n)throw Error('Actual retry trigger missing');n.scrollIntoView({block:'center'});n.focus()},label);await key('Enter')
    return run(()=>({message:document.querySelector('.editor-status__result').textContent,focus:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim(),dirty:document.querySelector('.studio-document__state').textContent}))
   }
   const inputStates=[],auditInput=async(name,owner,tick,{empty=false,ime=false}={})=>{
    if(!emptyInputAudit)return
    const read=()=>run(()=>{const n=document.querySelector('.score-canvas .notation-note-input-cursor');if(!n)throw Error('Actual input cursor missing');const r=n.getBoundingClientRect(),footer=document.querySelector('.editor-status').getBoundingClientRect();return{address:{...n.dataset},rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight,bottom:footer.top},input:document.querySelector('.studio-input-context').textContent,history:document.querySelector('.editor-status').textContent,focus:document.activeElement?.className?.baseVal??document.activeElement?.className,events:document.querySelectorAll('.score-canvas .notation-event[data-measure-id="'+n.dataset.measureId+'"]').length}})
    const state=await read();assert.equal(state.address.measureId,owner);assert.equal(Number(state.address.tick),tick);assert(state.rect.left>=-1&&state.rect.right<=state.viewport.width+1&&state.rect.top>=-1&&state.rect.bottom<=state.viewport.bottom+1,'Input cursor must be exposed without extra QA scrolling: '+JSON.stringify(state));if(empty)assert.equal(state.events,0)
    if(ime){for(const spec of [{key:'c',code:'KeyC',isComposing:true},{key:'Process',code:'KeyC'},{key:'c',code:'KeyC',keyCode:229}])await run(spec=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{...spec,bubbles:true})),spec);const after=await read();assert.deepEqual(after.address,state.address);assert.equal(after.events,state.events);assert.equal(after.history,state.history)}
    inputStates.push({name,...state,syntheticIme:ime});fs.writeFileSync(path.join(scene,'input-states.json'),JSON.stringify(inputStates,null,2));fs.writeFileSync(path.join(scene,name+'.png'),(await capturePresented()).toPNG())
   }
   const notices=[];let initialCounts=[nativeXmlSaves,xmlSaves]
   notices.push(await exportXml('save'));assert(notices[0].message.includes('Piano · 보표 1 · 1마디'));assert.deepEqual([nativeXmlSaves,xmlSaves],initialCounts)
   if(emptyExportScopeAudit){
    const scoped=[],choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual scope control unavailable');n.scrollIntoView({block:'center'});n.focus()},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
    scoped.push(await exportXml('copy'));assert(scoped[0].message.includes('Piano · 보표 1 · 1마디'));assert.deepEqual([nativeXmlSaves,xmlSaves],initialCounts)
    await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',1)
    scoped.push(await exportXml('copy'));assert.equal(xmlSaves,initialCounts[1]+1);assert(scoped[1].message.includes('filtered.musicxml'));assert(!scoped[1].message.includes('빈 마디'))
    assert(await run(()=>!document.querySelector('[aria-label="MusicXML 내보내기 기술 정보"]')))
    const partXml=fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8');assert(partXml.includes('<part-name>Violin</part-name>'));assert(!partXml.includes('<part-name>Piano</part-name>'));fs.writeFileSync(path.join(scene,'violin.musicxml'),partXml)
    const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'violin.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr);fs.writeFileSync(path.join(scene,'violin-xsd.log'),validation.stderr||'')
    fs.writeFileSync(path.join(scene,'part-success.png'),(await capturePresented()).toPNG())
    await click('형식');await click('악보 설정');await choose('파트보 선택',0);scoped.push(await exportXml('copy'));assert(scoped[2].message.includes('Piano · 보표 1 · 1마디'));assert.equal(xmlSaves,initialCounts[1]+1)
    await click('형식');await click('악보 설정');await choose('악보 보기',0);scoped.push(await exportXml('copy'));assert(scoped[3].message.includes('Piano · 보표 1 · 1마디'));assert.equal(xmlSaves,initialCounts[1]+1)
    assert.deepEqual((await save('scope-native-preserved')).score,sourceScore);fs.writeFileSync(path.join(scene,'scope-feedback.json'),JSON.stringify(scoped,null,2));initialCounts=[nativeXmlSaves,xmlSaves]
   }
   await measure('primary-bar-1');await key('N');await auditInput('empty-primary-cursor','primary-bar-1',0,{empty:true,ime:true});await key('7');await key('C');await auditInput('entered-primary-cursor','primary-bar-2',0);await key('Escape');const firstFilled=(await save('first-filled')).score
   const firstEvents=firstFilled.parts[0].staves[0].measures[0].voices[0].events;assert.equal(firstEvents.length,1);assert.equal(firstEvents[0].type,'note');assert.equal(firstEvents[0].pitch.step,'C');assert.deepEqual(firstEvents[0].duration,{value:'whole',dots:0});assert.deepEqual(firstEvents[0].position,{tick:0})
   const firstExpected=structuredClone(sourceScore);firstExpected.parts[0].staves[0].measures[0].voices[0].events=firstEvents;assert.deepEqual(firstFilled,firstExpected)
   notices.push(await exportXml('copy'));assert(notices[1].message.includes('Piano · 보표 2 · 4마디'));assert.deepEqual([nativeXmlSaves,xmlSaves],initialCounts)
   // Half-rest entry uses the existing automatic remainder-rest rule and stays
   // inside the final bar; completing a whole note there intentionally appends a bar.
   await measure('lower-bar-4');await key('N');await auditInput('empty-passive-cursor','lower-bar-4',0,{empty:true,ime:true});await key(emptyAppendAudit?'7':'6');await key('0');await auditInput('entered-passive-cursor','lower-bar-4',2*13440);await key('Escape');const filled=(await save('both-filled')).score
   const lowerEvents=filled.parts[0].staves[1].measures[3].voices[0].events;assert.equal(lowerEvents.length,emptyAppendAudit?1:2);for(const [i,event]of lowerEvents.entries()){assert.equal(event.type,'rest');assert.deepEqual(event.duration,{value:emptyAppendAudit?'whole':'half',dots:0});assert.deepEqual(event.position,{tick:i*2*13440})}
   const expected=structuredClone(firstFilled);expected.parts[0].staves[1].measures[3].voices[0].events=lowerEvents
   if(emptyAppendAudit){
    assert.deepEqual(filled.parts.flatMap(p=>p.staves.map(s=>s.measures.length)),[5,5,5],'Final-bar input must append a synchronized score column')
    for(const [pi,part]of expected.parts.entries())for(const [si,staff]of part.staves.entries()){
     const previous=staff.measures.at(-1),actual=filled.parts[pi].staves[si].measures.at(-1)
     const next={id:actual.id,number:5,timing:{type:'regular'},clef:structuredClone(previous.clef),keySignature:structuredClone(previous.keySignature),timeSignature:structuredClone(previous.timeSignature),...(previous.transposition?{transposition:structuredClone(previous.transposition)}:{}),voices:previous.voices.map((voice,i)=>({id:voice.id,events:[{id:actual.voices[i].events[0].id,position:{tick:0},duration:{value:'whole',dots:0},type:'rest',fullMeasure:true}]}))}
     assert.deepEqual(actual,next);staff.measures.push(next)
    }
   }
   assert.deepEqual(filled,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-rest')).score,firstFilled)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-note')).score,sourceScore)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo-note')).score,firstFilled)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo-rest')).score,filled)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,filled)
   notices.push(await exportXml('copy'));assert.equal(xmlSaves,initialCounts[1]+1);assert(notices[2].message.includes('filtered.musicxml'));assert(!notices[2].message.includes('빈 마디'))
   notices.push(await exportXml('save'));assert.equal(nativeXmlSaves,initialCounts[0]+1);assert(notices[3].message.includes('saved.musicxml'));assert(!notices[3].message.includes('빈 마디'))
   assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.musicxml')),fs.readFileSync(path.join(scene,'saved.musicxml')))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0');for(const name of ['filtered','saved']){const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,name+'.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,name+'-xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)}
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));const expectedMidi=fs.readFileSync(path.join(scene,'filtered.mid'));fs.writeFileSync(path.join(scene,'native.mid'),expectedMidi)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),expectedMidi)
   // Reopen the independently saved native snapshot before checking screen/PDF.
   await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('after-xml-reopened')).score,filled)
   const ink=await run(()=>({first:document.querySelectorAll('.score-canvas .notation-event[data-measure-id="primary-bar-1"]').length,lower:document.querySelectorAll('.score-canvas .notation-event[data-measure-id="lower-bar-4"]').length,overflow:document.documentElement.scrollWidth>innerWidth}));assert.deepEqual(ink,{first:1,lower:emptyAppendAudit?1:2,overflow:false});fs.writeFileSync(path.join(scene,'filled.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));const pdf=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(pdf.status,0,pdf.stderr);assert.match(pdf.stdout,/Pages:\s+1/)
   assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes);rows.push({width,height,notices,ink,nativeExact:true,twoUndoRedo:true,xmlRetry:true,xsd:2,midiRoundtrip:true,pdf:pdf.stdout});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS '+step)
  }
  return
 }
 if(dynamicEmptyVoiceFocusAudit){
  sourceFile=path.join(source,'empty-voice.chromatics');const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score
  for(const width of [960,1400]){
   const height=1000;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='empty-voice-focus-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await run(()=>{window.__emptyVoiceErrors=[];window.addEventListener('error',event=>window.__emptyVoiceErrors.push({message:event.message,stack:event.error?.stack}));window.addEventListener('unhandledrejection',event=>window.__emptyVoiceErrors.push({message:String(event.reason),stack:event.reason?.stack}))});await click('프로젝트 열기');const errors=await run(()=>window.__emptyVoiceErrors);fs.writeFileSync(path.join(scene,'renderer-errors.json'),JSON.stringify(errors,null,2));if(errors.length)throw Error('Actual empty-voice renderer error: '+JSON.stringify(errors));await click('도구');await click('선택 속성 열기')
   assert.equal(await run(()=>document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind),'measure')
   await run(()=>document.querySelector('.notation-dynamic-target[data-dynamic-id="primary-first"] rect').scrollIntoView({block:'center'}));await settle()
   const point=await run(()=>{const n=document.querySelector('.notation-dynamic-target[data-dynamic-id="primary-first"]'),r=n.querySelector('rect').getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!n.contains(document.elementFromPoint(x,y)))throw Error('Actual dynamic pointer unavailable');return{x,y}})
   for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle();await key('Delete')
   const state=()=>run(()=>({tag:document.activeElement?.tagName,canvas:document.activeElement?.classList.contains('score-canvas'),dynamic:document.activeElement?.getAttribute('data-dynamic-id'),kind:document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind}))
   const deleted=await state();await key('Z',['control']);const undone=await state();fs.writeFileSync(path.join(scene,'empty-voice-focus.json'),JSON.stringify({deleted,undone},null,2));assert.equal(deleted.kind,'measure');assert.equal(deleted.canvas,true,'Empty-measure marking deletion must retain the actual score region');assert.equal(undone.dynamic,'primary-first','Undo from score region must restore marking focus')
   assert.deepEqual((await save('restored')).score,sourceScore)
   await click('악보로 이동');await key('Z',['control','shift']);const removed=structuredClone(sourceScore);removed.dynamics=removed.dynamics.filter(mark=>mark.id!=='primary-first');assert.deepEqual((await save('redo')).score,removed)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-again')).score,sourceScore)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,sourceScore)
   const ink=async print=>run(print=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas');return{emptyEvents:root.querySelectorAll('.notation-event[data-measure-id="primary-bar-1"],.notation-event[data-measure-id="lower-bar-4"]').length,peerEvents:root.querySelectorAll('.notation-event[data-measure-id="other-bar-1"]').length,targets:root.querySelectorAll('.notation-dynamic-target').length}},print)
   const screenInk=await ink(false);assert.equal(screenInk.emptyEvents,0);assert.equal(screenInk.peerEvents,2)
   await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   const printInk=JSON.parse(fs.readFileSync(path.join(scene,'empty-voice-print.json')));assert.equal((await run(()=>window.__emptyVoiceErrors)).length,0)
   if(emptyExportFeedbackAudit){
    const feedback=[]
    for(const channel of ['save','copy']){
     const counts=[nativeXmlSaves,xmlSaves];await click('파일');await click(channel==='save'?'파일 작업 열기':'내보내기 설정');const label=channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'
     await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&!n.disabled&&(n.getAttribute('aria-label')||n.textContent).trim()===label);if(!n)throw Error('Actual empty XML export trigger unavailable');n.scrollIntoView({block:'center'});n.focus()},label);await key('Enter')
     const state=await run(()=>({message:document.querySelector('.editor-status__result').textContent,history:document.querySelector('.editor-status').textContent,focus:(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim()}));assert(state.message.includes('빈 마디가 있어 MusicXML로 내보낼 수 없습니다.'));assert(state.message.includes('Piano · 보표 1 · 1마디'));assert(!state.message.includes(': empty'));assert.equal(state.focus,label);assert.deepEqual([nativeXmlSaves,xmlSaves],counts)
     const groupLabel=channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보',technical=()=>run(label=>{const n=document.querySelector('[role="group"][aria-label="'+label+'"] .studio-warning-technical__content');return{visible:n?.checkVisibility()??false,text:n?.textContent}},groupLabel)
     assert(!(await technical()).visible);fs.writeFileSync(path.join(scene,'empty-'+channel+'.png'),(await capturePresented()).toPNG());await run(label=>{const button=document.querySelector('[role="group"][aria-label="'+label+'"] button');if(!button?.checkVisibility()||button.disabled)throw Error('Actual technical disclosure unavailable');button.scrollIntoView({block:'center'});button.focus()},groupLabel);await key('Enter');const opened=await technical();assert(opened.visible&&opened.text.includes(': empty')&&opened.text.includes('parts[0].staves[0].measures[0]'));await key('Space');assert(!(await technical()).visible);assert(await run(()=>document.querySelector('.editor-status').textContent.includes('정지')));feedback.push({channel,...state,technicalKeyboard:true,xmlWrites:0})
    }
    fs.writeFileSync(path.join(scene,'empty-feedback.json'),JSON.stringify(feedback,null,2));assert.deepEqual((await save('empty-export-preserved')).score,sourceScore)
   }
   const info=spawnSync('pdfinfo',[path.join(scene,'filtered.pdf')],{encoding:'utf8'});assert.equal(info.status,0,info.stderr);assert.match(info.stdout,/Pages:\s+1/)
   fs.writeFileSync(path.join(scene,'empty-voice-ink.json'),JSON.stringify({screenInk,printInk,pdfInfo:info.stdout},null,2));assert.deepEqual(fs.readFileSync(sourceFile),bytes);fs.writeFileSync(path.join(scene,'reviewed.png'),(await capturePresented()).toPNG());rows.push({width,height,deleted,undone,nativeExact:true,nativeReopen:true,noInventedNotes:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS empty-voice focus '+width)
  }
  return
 }
 if(individualDynamicAudit){
  const originalSourceFile=sourceFile
  const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score,edited=JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score,golden=JSON.parse(fs.readFileSync(path.join(source,'pasted.chromatics'))).score
  const destinationFile=dynamicDocumentAudit?path.join(source,'destination.chromatics'):undefined,destinationBytes=destinationFile&&fs.readFileSync(destinationFile),pasteBase=destinationBytes?JSON.parse(destinationBytes).score:edited
  for(const width of [960,1400]){
   sourceFile=originalSourceFile
   const height=1000;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='individual-dynamic-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const pick=async(id,double=false)=>{
    await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-dynamic-target')].find(n=>n.dataset.dynamicId===id);if(!n)throw Error('Rendered effective dynamic unavailable');n.querySelector('rect').scrollIntoView({block:'center'})},id);await settle()
    const point=await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-dynamic-target')].find(n=>n.dataset.dynamicId===id),r=n.querySelector('rect').getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!n.contains(document.elementFromPoint(x,y)))throw Error('Dynamic ink pointer occluded');return{x,y}},id)
    for(let count=1;count<=(double?2:1);count++)for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:count});await settle()
   }
   await pick('primary-first')
   assert.equal(await run(()=>document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind),'dynamic');assert.equal(await run(()=>document.activeElement?.getAttribute('data-dynamic-id')),'primary-first')
   await key('C',['control']);assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('마디 전체 셈여림을 교체'))
   await pick('primary-first',true)
   if(dynamicConditionsAudit){
    const conditions=await prepareTextChoiceConditions(width,'선택 요약 보표 글자','선택 셈여림')
    await pick('primary-first',true);await scaleTextChoiceChrome();await settle()
    const geometry=await run(()=>{
     const field=[...document.querySelectorAll('label')].find(n=>n.textContent==='선택 셈여림')?.control,help=field&&document.getElementById(field.getAttribute('aria-describedby')),dock=document.querySelector('.studio-properties-dock')
     if(!field?.checkVisibility()||field.disabled||!help?.checkVisibility())throw Error('Actual dynamic scope and field must be visible')
     const bounds=n=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,width:b.width,height:b.height}}
     return{field:bounds(field),help:bounds(help),dock:bounds(dock),scope:help.textContent,font:parseFloat(getComputedStyle(field).fontSize),focus:field===document.activeElement,helpClient:help.clientWidth,helpScroll:help.scrollWidth,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}
    })
    fs.writeFileSync(path.join(scene,'dynamic-conditions.json'),JSON.stringify({conditions,geometry},null,2));assert(geometry.focus);assert(geometry.scope.includes('1마디 전체'));assert(geometry.scope.includes('다른 표기는 유지'))
    for(const box of [geometry.field,geometry.help])assert(box.left>=geometry.dock.left&&box.right<=geometry.dock.right,'Dynamic field/scope must fit the actual narrow dock')
    assert(geometry.helpScroll<=geometry.helpClient+1);assert(geometry.documentWidth<=geometry.viewport+1);assert(Math.abs(geometry.font-conditions.baseline.choice.font*2)<.1)
    fs.writeFileSync(path.join(scene,'dynamic-conditions.png'),(await capturePresented()).toPNG())
   }
   const control=()=>run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='선택 셈여림')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Selected dynamic field unavailable');return{focus:n===document.activeElement,label:n.labels?.[0]?.textContent,value:n.textContent.trim(),help:document.getElementById(n.getAttribute('aria-describedby'))?.textContent}})
   const selected=await control();assert(selected.focus);assert.equal(selected.value,'p');assert(selected.help.includes('마디 전체'));await key('Space');const index=await run(()=>[...document.querySelectorAll('[role="listbox"] [role="option"]')].findIndex(n=>n.dataset.value==='mp'));assert(index>=0);await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter');assert.deepEqual((await save('individual-edited')).score,edited)
   if(dynamicDocumentAudit){sourceFile=destinationFile;openCurrent=false;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('destination.chromatics을 열었습니다.'));assert.deepEqual((await save('destination-opened')).score,pasteBase)}
   await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="other-bar-2-b"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await click('편집');await click('복사한 셈여림으로 마디 설정')
   const actual=(await save('individual-pasted')).score,expected=structuredClone(golden);expected.dynamics.at(-1).id=actual.dynamics.at(-1).id;assert.match(actual.dynamics.at(-1).id,/^dynamic-/);assert.deepEqual(actual,expected);assert.equal('tick' in actual.dynamics.at(-1),false)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('paste-undo')).score,pasteBase);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('paste-redo')).score,actual)
   await pick('primary-first')
   if(dynamicInspectorFocusAudit){await key('Enter');assert((await control()).focus);await key('Space');await key('Home');await key('Enter')}
   else await key('Delete')
   const removed=structuredClone(actual);removed.dynamics=removed.dynamics.filter(mark=>mark.id!=='primary-first')
   if(dynamicInspectorFocusAudit){
    const deleted=await run(()=>{const n=document.querySelector('.studio-selected-properties__group[aria-label="작업 마디의 표기"] button[role="combobox"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual replacement dynamic field unavailable');return{focus:n===document.activeElement,label:n.labels?.[0]?.textContent,value:n.textContent.trim(),tag:document.activeElement?.tagName}})
    fs.writeFileSync(path.join(scene,'inspector-delete-focus.json'),JSON.stringify(deleted,null,2));assert(deleted.focus,'Inspector None deletion must retain its replacement field focus');assert.equal(deleted.label,'선택 마디 셈여림');assert.equal(deleted.value,'p')
    await key('Z',['control']);assert((await control()).focus,'Native undo from Inspector must restore selected dynamic field focus')
    const inputFocus=()=>run(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,local:Boolean(document.activeElement?.closest('.studio-selected-properties')),label:document.activeElement?.getAttribute('aria-label')}))
    let tabbed;for(let i=0;i<20;i++){await key('Tab');tabbed=await inputFocus();if(tabbed.tag==='INPUT'&&tabbed.local)break}
    assert(tabbed?.id&&tabbed.tag==='INPUT'&&tabbed.local,'Actual Tab must reach another Inspector field')
    win.setContentSize(width===960?1400:960,height);await settle();const resized=await inputFocus();assert.deepEqual(resized,tabbed,'Consumed delete-focus request must not steal another field on resize')
    win.setContentSize(width,height);await settle();assert.deepEqual(await inputFocus(),tabbed);fs.writeFileSync(path.join(scene,'inspector-tab-focus.json'),JSON.stringify({tabbed,resized},null,2))
    assert.deepEqual((await save('inspector-undo')).score,actual)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('inspector-redo')).score,removed)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('inspector-restored')).score,actual)
   }else if(dynamicHistoryFocusAudit){
    const focus=()=>run(()=>({dynamic:document.activeElement?.getAttribute('data-dynamic-id'),event:document.activeElement?.getAttribute('data-event-id'),tag:document.activeElement?.tagName,selected:document.querySelector('.notation-dynamic-target.is-selected')?.dataset.dynamicId,kind:document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind}))
    const deleted=await focus();await key('Z',['control']);const undone=await focus();fs.writeFileSync(path.join(scene,'history-focus.json'),JSON.stringify({deleted,undone},null,2))
    assert.equal(deleted.event,'other-bar-2-b','Deleting a score marking must focus the restored logical event')
    assert.equal(undone.dynamic,'primary-first','Undo must restore the selected marking keyboard focus without an extra click')
    let tabbed
    for(let i=0;i<20;i++){await key('Tab');tabbed=await focus();if(tabbed.event)break}
    assert(tabbed?.event,'Actual Tab must reach a separately focused note without activating it')
    assert.equal(tabbed.selected,'primary-first')
    win.setContentSize(width===960?1400:960,height);await settle();const resized=await focus();assert.equal(resized.event,tabbed.event,'Unchanged selected marking must not steal Tab focus during a real resize');assert.equal(resized.selected,'primary-first')
    win.setContentSize(width,height);await settle();const returned=await focus();assert.equal(returned.event,tabbed.event)
    fs.writeFileSync(path.join(scene,'tab-resize-focus.json'),JSON.stringify({tabbed,resized,returned},null,2))
    assert.deepEqual((await save('selected-delete-undo')).score,actual)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('selected-delete-redo')).score,removed)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('selected-delete-restored')).score,actual)
   }else{
    assert.deepEqual((await save('selected-delete')).score,removed)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('selected-delete-undo')).score,actual)
   }
   assert.equal(await run(()=>document.querySelector('.notation-dynamic-target.is-selected')?.dataset.dynamicId),'primary-first')
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,actual)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'pasted.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'pasted.musicxml'),'utf8'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));await pick('primary-first');await key('Enter');assert((await control()).focus);fs.writeFileSync(path.join(scene,'reviewed.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(originalSourceFile),sourceBytes);if(destinationFile)assert.deepEqual(fs.readFileSync(destinationFile),destinationBytes)
   rows.push({width,height,nativeClick:true,nativeDoubleClick:true,selectedEnter:true,scope:selected.help,selectedEditPreservesDuplicates:true,snapshotCopy:true,explicitMeasureReplace:true,selectedDeleteOnly:true,undoRedoNative:true,xmlExact:true,midiExact:true,xsd:true,pdfNoTargets:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS individual dynamic '+width)
  }
  return
 }
 if(dynamicPolicyAudit){
  const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score,edited=JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score
  for(const width of [960,1400]){
   const height=1000;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='measure-dynamics-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await measure('primary-bar-1');await click('도구');await click('선택 속성 열기')
   const dynamicControl=()=>run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='선택 마디 셈여림')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual dynamic Inspector unavailable');n.scrollIntoView({block:'center'});n.focus();return n.textContent.trim()})
   const value=await dynamicControl(),glyphs=await run(()=>Object.fromEntries([...document.querySelectorAll('.score-canvas .notation-dynamic-mark')].map(n=>[n.dataset.measureId,n.textContent])))
   fs.writeFileSync(path.join(scene,'source-state.json'),JSON.stringify({value,glyphs},null,2));assert.equal(value,'p');assert.equal(glyphs['primary-bar-1'],'p','Rendered first value must match Inspector/playback');assert.equal(glyphs['lower-bar-1'],'f')
   if(dynamicClearanceAudit){const measured=await readDynamicClearance(false);fs.writeFileSync(path.join(scene,'dynamic-source-clearance.json'),JSON.stringify(measured,null,2));assert(measured.overlapX>0&&measured.gap>=7.9,'Actual screen dynamic/notehead clearance: '+JSON.stringify(measured));assert.equal(measured.unresolved,'false');assert.notEqual(measured.staffUnresolved,'true');assert.notEqual(measured.systemUnresolved,'true');if(dynamicClearanceReference){const previous=JSON.parse(fs.readFileSync(dynamicClearanceReference));assert(Math.abs(measured.manualRelativeY-previous.manualRelativeY)<.1,'Manual offsetY0 path must keep its staff-relative position');assert(Math.abs(measured.manualHeight-previous.manualHeight)<.1)}}
   assert.deepEqual((await save('view-only')).score,sourceScore)
   await dynamicControl();await key('Space');const index=await run(()=>[...document.querySelectorAll('[role="listbox"] [role="option"]')].findIndex(n=>n.dataset.value==='mf'));assert(index>=0);await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')
   assert.deepEqual((await save('edited')).score,edited)
   const updated=await run(()=>Object.fromEntries([...document.querySelectorAll('.score-canvas .notation-dynamic-mark')].map(n=>[n.dataset.measureId,n.textContent])));assert.equal(updated['primary-bar-1'],'mf');assert.equal(updated['lower-bar-1'],'f')
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,sourceScore)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'edited.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'edited.musicxml'),'utf8'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));await measure('lower-bar-1');await click('도구');await click('선택 속성 열기');await dynamicControl()
   fs.writeFileSync(path.join(scene,'reviewed.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
   rows.push({width,height,sourceGlyphs:glyphs,inspector:value,viewNoMutation:true,existingMeasureReplace:true,undoRedoNative:true,xmlExact:true,midiExact:true,xsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS measure dynamics '+width)
  }
  return
 }
 if(singleHarmonyAudit){
  const sourceBytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(sourceBytes).score,edited=singleHarmonyStructure?undefined:JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score,golden=JSON.parse(fs.readFileSync(path.join(source,'pasted.chromatics'))).score
  for(const width of [960,1400]){
   sourceFile=path.join(source,'source.chromatics')
   const height=1000;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='single-harmony-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const pick=async(id,double=false)=>{
    await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-harmony-target')].find(n=>n.dataset.harmonyId===id);if(!n)throw Error('Missing harmony target '+id);n.querySelector('rect').scrollIntoView({block:'center'})},id);await settle()
    const point=await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-harmony-target')].find(n=>n.dataset.harmonyId===id),hit=n.querySelector('rect'),r=hit.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!n.contains(document.elementFromPoint(x,y)))throw Error('Harmony ink pointer occluded');return{x,y,width:r.width,height:r.height}},id)
    for(let count=1;count<=(double?2:1);count++)for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:count})
    await settle();return point
   }
   const point=await pick('h-source-second')
   const state=await run(()=>({id:document.querySelector('.notation-harmony-target.is-selected')?.dataset.harmonyId,kind:document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind,field:document.querySelector('input[aria-label="선택 요약 코드"]').value,focus:document.activeElement?.getAttribute('data-harmony-id')}))
   assert.equal(state.id,'h-source-second');assert.equal(state.kind,'harmony');assert.equal(state.field,'G7/B');assert.equal(state.focus,'h-source-second')
   if(singleHarmonyGuidance){
    await key('C',['control']);await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="other-bar-2-a"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await key('Right',['shift'])
    const before=await run(()=>({kind:document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind,ids:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)}));assert.equal(before.kind,'range');assert.equal(before.ids.length,2)
    await click('편집');assert.equal(await run(()=>[...document.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent.trim()==='복사한 코드 추가')?.disabled),true);await key('Escape');await key('V',['control'])
    const after=await run(()=>({status:document.querySelector('.editor-status').textContent,ids:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)}));assert(after.status.includes('코드 심벌을 추가할 마디 또는 음표·쉼표 하나를 선택해 주세요.'));assert(!after.status.includes('총보 첫 보표'));assert(after.status.includes('0회 수정'));assert.deepEqual(after.ids,before.ids)
    fs.writeFileSync(path.join(scene,'guidance.json'),JSON.stringify({before,after},null,2));fs.writeFileSync(path.join(scene,'guidance.png'),(await capturePresented()).toPNG());assert.deepEqual((await save('guarded')).score,sourceScore);assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
    rows.push({width,height,unsupportedRangeStillBlocked:true,menuDisabled:true,nativeShortcut:true,correctScope:true,selectionHistoryPreserved:true,nativeExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony guidance '+width);continue
   }
   if(singleHarmonyStructure){
    await key('C',['control']);const point=await measure('primary-bar-1')
    for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'right',clickCount:1});await settle()
    await run(()=>{const n=[...document.querySelectorAll('[role="menu"][aria-label="마디 작업"] [role="menuitem"]')].find(n=>n.textContent.trim()==='마디 제거');if(!n?.checkVisibility()||n.disabled)throw Error('Actual remove measure menu unavailable');n.focus()});await key('Enter')
    const removed=JSON.parse(fs.readFileSync(path.join(source,'removed.chromatics'))).score
    assert.deepEqual((await save('source-removed')).score,removed)
    await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="other-bar-2-b"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await key('V',['control'])
    const actual=(await save('structural-pasted')).score,expected=structuredClone(golden);expected.harmonies.at(-1).id=actual.harmonies.at(-1).id;assert.match(actual.harmonies.at(-1).id,/^harmony-/);assert.deepEqual(actual,expected);assert.deepEqual(actual.slurs,sourceScore.slurs);assert.deepEqual(actual.layout,sourceScore.layout)
    for(const [name,expected]of [['paste-undo',removed],['structure-undo',sourceScore]]){await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save(name)).score,expected)}
    for(const [name,expected]of [['structure-redo',removed],['paste-redo',actual]]){await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save(name)).score,expected)}
    openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('structure-reopened')).score,actual)
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'pasted.mid')))
    await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'pasted.musicxml'),'utf8'))
    const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    fs.writeFileSync(path.join(scene,'structure-reopened.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
    rows.push({width,height,copySourceDeleted:true,allStaffStructuralDelete:true,survivingConcreteOwner:true,twoUndoRedo:true,manualGeometryAndLayoutExact:true,nativeReopen:true,xmlExact:true,midiExact:true,xsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony structure '+width);continue
   }
   if(singleHarmonyEmpty){
    await pick('h-source-second',true);assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드')
    await run(()=>document.activeElement.select());await key('Backspace');assert.equal(await run(()=>document.activeElement.value),'');await key('Enter')
    assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('1회 수정'))
    const expected=JSON.parse(fs.readFileSync(path.join(source,'removed.chromatics'))).score
    assert.deepEqual((await save('empty-deleted')).score,expected)
    assert.equal(await run(()=>document.querySelector('.notation-harmony-target[data-harmony-id="h-source-second"]')===null),true)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('empty-undo')).score,sourceScore)
    assert.equal(await run(()=>document.querySelector('.notation-harmony-target.is-selected')?.dataset.harmonyId),'h-source-second')
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('empty-redo')).score,expected)
    openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('empty-reopened')).score,expected)
    if(process.argv.includes('--audit-suggested-filenames')){
     const prior=projectSaves;await click('파일');await click('프로젝트 다른 이름으로 저장');assert.equal(projectSaves,prior+1)
     const suggested=JSON.parse(fs.readFileSync(path.join(scene,'suggested-filenames.json'))).at(-1);assert.equal(suggested.destinationProvided,false,'Actual Save As must request a fresh destination');assert.equal(suggested.name,'score-con.chromatics')
     assert.deepEqual(JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics'))).score,expected)
    }
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'removed.mid')))
    await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'removed.musicxml'),'utf8'))
    const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    const printed=JSON.parse(fs.readFileSync(path.join(scene,'harmony-print.json')));assert.deepEqual(printed.labels.map(h=>h.text).sort(),expected.harmonies.map(h=>h.text).sort())
    fs.writeFileSync(path.join(scene,'empty-reopened.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
    rows.push({width,height,emptyCommit:true,oneCommand:true,selectedIdentityUndo:true,exactUndoRedo:true,nativeReopen:true,neighborsMusicUnchanged:true,xmlExact:true,midiExact:true,xsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony empty edit '+width);continue
   }
   if(singleHarmonyDestinations){
    await key('C',['control']);sourceFile=path.join(source,'destination.chromatics');const destinationBytes=fs.readFileSync(sourceFile),destination=JSON.parse(destinationBytes).score
    await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.score-title')?.textContent.includes('Destination document same IDs'))
    await measure('other-bar-2');await key('V',['control'])
    const actual=(await save('destination-pasted')).score,expected=JSON.parse(fs.readFileSync(path.join(source,'destination-pasted.chromatics'))).score;expected.harmonies.at(-1).id=actual.harmonies.at(-1).id;assert.match(actual.harmonies.at(-1).id,/^harmony-/);assert.deepEqual(actual,expected);assert.equal(actual.harmonies.at(-1).tick,0);assert.equal(actual.harmonies.at(-1).text,'G7/B');assert.equal(actual.harmonies.find(h=>h.id==='h-source-second').text,'Cm7/Eb')
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('destination-undo')).score,destination)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('destination-redo')).score,actual)
    openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('destination-reopened')).score,actual)
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'destination-pasted.mid')))
    await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'destination-pasted.musicxml'),'utf8'))
    const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    fs.writeFileSync(path.join(scene,'destination.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(path.join(source,'source.chromatics')),sourceBytes);assert.deepEqual(fs.readFileSync(sourceFile),destinationBytes)
    rows.push({width,height,sourceIdCollision:true,clipboardSnapshot:true,blankMeasureZero:true,occupiedNeighbors:true,exactUndoRedo:true,nativeReopen:true,xmlExact:true,midiExact:true,xsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony destination '+width);continue
   }
   if(singleHarmonyConditions){
    const conditions=await prepareTextChoiceConditions(width,'선택 요약 코드','코드 대상')
    const chooseHarmony=async index=>{
     await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='코드 대상')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Public harmony chooser unavailable');n.scrollIntoView({block:'center'});n.focus()});await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter');await scaleTextChoiceChrome();await settle()
     if(await run(()=>document.activeElement?.getAttribute('role')==='combobox'))await key('Tab')
     assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드','Use actual Tab from the unchanged common chooser before editing')
    }
    await chooseHarmony(2)
    assert.equal(await run(()=>document.querySelector('.notation-harmony-target.is-selected')?.dataset.harmonyId),'h-source-third')
    assert.equal(await run(()=>document.querySelector('input[aria-label="선택 요약 코드"]').value),'F')
    await chooseHarmony(1)
    assert.equal(await run(()=>document.querySelector('.notation-harmony-target.is-selected')?.dataset.harmonyId),'h-source-second')
    await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 코드"]');n.focus();n.select();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))});await win.webContents.insertText('조합 중');await key('Enter')
    assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드')
    await run(()=>document.activeElement.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await key('Escape')
    assert.deepEqual((await save('composition-cancelled')).score,sourceScore)
    await chooseHarmony(1)
    await run(()=>{document.activeElement.select()});await win.webContents.insertText('Dm7/A');await key('Enter')
    assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('1회 수정'))
    assert.deepEqual((await save('conditions-edited')).score,edited)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('conditions-undo')).score,sourceScore)
    await chooseHarmony(1)
    const visible=await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 코드"]'),d=n.closest('aside').getBoundingClientRect(),b=n.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{value:n.value,font:parseFloat(getComputedStyle(n).fontSize),height:b.height,left:b.left,right:b.right,top:b.top,bottom:b.bottom,portTop:Math.max(0,d.top),portBottom:Math.min(innerHeight,d.bottom,f.top),width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}})
    assert.equal(visible.value,'G7/B');assert(visible.height>=(conditions.config.coarse?47.9:31.9));assert(visible.left>=0&&visible.right<=visible.width+1&&visible.top>=visible.portTop-1&&visible.bottom<=visible.portBottom+1&&!visible.overflow)
    fs.writeFileSync(path.join(scene,'conditions.json'),JSON.stringify({conditions,visible,syntheticImeOnly:true},null,2));fs.writeFileSync(path.join(scene,'conditions.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
    if(conditions.config.coarse){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}
    rows.push({width,height,conditions:conditions.config,publicKeyboardChooser:true,exactInteriorTickIds:true,syntheticImeCancel:true,oneCommandUndo:true,modelUnchangedAfterUndo:true,containment:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony conditions '+width);continue
   }
   await key('C',['control']);await pick('h-source-second',true)
   assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드','Native double click must edit in the existing Inspector')
   await run(()=>document.activeElement.select());await win.webContents.insertText('Dm7/A');await key('Enter');assert.deepEqual((await save('edited')).score,edited)
   await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="other-bar-2-b"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await key('V',['control'])
   const pasted=(await save('pasted')).score,added=pasted.harmonies.at(-1),expected=structuredClone(golden);expected.harmonies.at(-1).id=added.id;assert.match(added.id,/^harmony-/);assert.deepEqual(pasted,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,edited)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,pasted)
   // Lower-staff hit targets use the same concrete owner. Selection is read-only.
   await pick('h-lower-neighbor');assert.deepEqual((await save('lower-selected')).score,pasted)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,pasted)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'pasted.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),fs.readFileSync(path.join(source,'pasted.musicxml'),'utf8'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   await pick('h-source-second');await key('Enter');assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'선택 요약 코드')
   fs.writeFileSync(path.join(scene,'reviewed.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
   rows.push({width,height,theme:width===960?'dark':'light',point,state,nativeClick:true,nativeDoubleClick:true,selectedEnter:true,clipboardSnapshot:true,appendNeighborPreserved:true,exactUndoRedo:true,nativeReopen:true,xmlExact:true,xsd:true,midiExact:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS single harmony '+width)
  }
  return
 }
 if(partCopySnapshotAudit){
  const choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Public part view control unavailable');n.focus();n.scrollIntoView({block:'center'})},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
  const state=()=>run(()=>({title:document.querySelector('.studio-document h1').textContent,partId:document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId,selected:document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId,history:document.querySelector('.editor-status').textContent,dirty:document.querySelector('.studio-document__state').textContent,focus:{id:document.activeElement?.id,role:document.activeElement?.getAttribute('role'),label:document.activeElement?.getAttribute('aria-label'),tag:document.activeElement?.tagName},report:document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent??null}))
  for(const[width,height]of [[960,750],[1400,800]])for(const scenario of partCopySnapshotCase?[partCopySnapshotCase]:['edit-part-switch','replace-document']){
   sourceFile=path.join(source,scenario,'source.chromatics');const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,golden=JSON.parse(fs.readFileSync(path.join(source,scenario,'expected-current.chromatics'))).score,xmlExpected=fs.readFileSync(path.join(source,scenario,'expected-copy.musicxml'),'utf8'),meta=JSON.parse(fs.readFileSync(path.join(source,scenario,'expectations.json')));scene=path.join(out,String(width),scenario);fs.mkdirSync(scene,{recursive:true});step='copy-snapshot-'+width+'-'+scenario;openCurrent=false;partCopyRecoveryWrites=[];nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   // Normal startup deliberately enables real renderer recovery writes;the owned
   // IPC records generated scores only and never touches the user's recovery file.
   await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle();await click('프로젝트 열기');await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',0);await click('파일');await click('내보내기 설정')
   const count=xmlSaves;await run(()=>{const n=document.querySelector('button[aria-label="MusicXML 내보내기"]');n.focus();n.scrollIntoView({block:'center'})});await key('Enter');assert.equal(xmlSaves,count+1);assert(pendingPartCopyRelease);assert.equal(fs.readFileSync(path.join(scene,'older-piano.musicxml'),'utf8'),xmlExpected);assert(!(await state()).report)
   if(scenario==='edit-part-switch'){await click('악보 제목 수정');await run(()=>{const n=document.querySelector('input[aria-label="악보 제목"]');if(!n?.checkVisibility())throw Error('Actual title editor unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText(meta.title);await key('Enter');await click('형식');await click('악보 설정');await choose('파트보 선택',1)}
   else{await click('파일');await click('새 악보 만들기');await run(()=>{const dialog=document.querySelector('dialog[open]'),input=[...dialog.querySelectorAll('label')].find(n=>n.textContent==='제목')?.control;if(!input?.checkVisibility())throw Error('Actual wizard title unavailable');input.focus();input.select()});await win.webContents.insertText(meta.title);await click('만들기');await click('파일');await click('내보내기 설정');assert(await run(()=>document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled))}
   const deadline=Date.now()+5000;while(!partCopyRecoveryWrites.some(v=>v.score.title===meta.title)){assert(Date.now()<deadline,'Real production recovery write did not arrive');await new Promise(resolve=>setTimeout(resolve,40))}
   const recovery=partCopyRecoveryWrites.filter(v=>v.score.title===meta.title).at(-1).score,expected=structuredClone(golden);if(scenario==='replace-document'){assert.match(recovery.id,/^score-[0-9a-f-]{36}$/);assert.notEqual(recovery.id,original.id);expected.id=recovery.id}assert.deepEqual(recovery,expected,'Only the documented random new document ID may vary from the independent UI fixture')
   const before=await state();assert(before.dirty.includes('저장하지 않은 변경'));if(scenario==='replace-document')assert(!before.history.includes('내보내는 중'));fs.writeFileSync(path.join(scene,'pending-state.json'),JSON.stringify({before,recovery,randomIdCapturedBeforeResponse:scenario==='replace-document'},null,2));fs.writeFileSync(path.join(scene,'pending-state.png'),(await capturePresented()).toPNG());pendingPartCopyRelease();await settle()
   if(scenario==='edit-part-switch')await wait(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]')?.textContent.includes('older-piano.musicxml'));else await wait(()=>!document.querySelector('button[aria-label="MusicXML 내보내기"]').disabled)
   const after=await state();assert.equal(after.selected,before.selected);assert.deepEqual(after.focus,before.focus);assert(after.dirty.includes('저장하지 않은 변경'));assert(after.title.includes(meta.title));assert.equal(xmlSaves,count+1)
   if(scenario==='edit-part-switch'){assert.equal(after.partId,'other-part');assert(after.report.includes('Piano · 보표 2 · 2마디'));assert(after.history.includes('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.'));assert(after.history.includes('1회 수정'))}else{assert.equal(after.report,null);assert(!after.history.includes('older-piano.musicxml'));assert(after.history.includes('0회 수정'))}
   fs.writeFileSync(path.join(scene,'completed-state.json'),JSON.stringify(after,null,2));fs.writeFileSync(path.join(scene,'completed-state.png'),(await capturePresented()).toPNG());if(scenario==='edit-part-switch'){await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]').scrollIntoView({block:'center'}));await settle();const presented=await run(()=>{const report=document.querySelector('[aria-label="MusicXML 경고 상세"]'),summary=report.querySelector('li').firstElementChild,r=summary.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect();return{top:r.top,bottom:r.bottom,viewport:innerHeight,footerTop:footer.top,text:summary.textContent,currentPart:document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId}});assert(presented.top>=0&&presented.bottom<=Math.min(presented.viewport,presented.footerTop)+1,'Explicit review scroll must expose the actual old-part notice text');assert.equal(presented.currentPart,'other-part');fs.writeFileSync(path.join(scene,'manually-revealed-warning.json'),JSON.stringify(presented,null,2));fs.writeFileSync(path.join(scene,'manually-revealed-warning.png'),(await capturePresented()).toPNG())}assert.deepEqual((await save('pending-copy-current-preserved')).score,recovery);openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics'));assert.deepEqual((await save('pending-copy-current-reopened')).score,recovery);assert.deepEqual(fs.readFileSync(sourceFile),bytes);assert.equal(fs.readFileSync(path.join(scene,'older-piano.musicxml'),'utf8'),xmlExpected)
   rows.push({width,height,scenario,xmlSnapshotExact:true,realRecoveryBeforeResponse:true,fullCurrentNativeExact:true,nativeReopen:true,focusAndSelectionPreserved:true,privateReportScopeCorrect:true,randomIdCaptured:scenario==='replace-document'});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS part report snapshot '+width+' '+scenario)
  }return
 }
 if(repeatConflictAudit){
  for(const[width,height]of [[960,750],[1400,800]])for(const channel of ['save','copy']){
   sourceFile=path.join(source,'source.chromatics');const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,expected=JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score;scene=path.join(out,String(width),channel);fs.mkdirSync(scene,{recursive:true});step='repeat-conflict-'+width+'-'+channel;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await click('악보로 이동');await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="primary-note-0"]');if(!n)throw Error('Native event unavailable');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await key('D')
   const baseSave=nativeXmlSaves,baseCopy=xmlSaves;if(channel==='save'){await click('파일');await click('파일 작업 열기')}else{await click('파일');await click('내보내기 설정')}const triggerLabel=channel==='save'?'MusicXML로 저장':'MusicXML 내보내기';await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&!n.disabled&&(n.getAttribute('aria-label')||n.textContent).trim()===label);if(!n)throw Error('Actual keyboard export trigger unavailable');n.scrollIntoView({block:'center'});n.focus()},triggerLabel);await key('Enter')
   await wait(()=>document.querySelector('.editor-status').textContent.includes('MusicXML 저장 검증에 실패했습니다.'));const feedback=await run(()=>({message:document.querySelector('.editor-status__result').textContent,history:document.querySelector('.editor-status').textContent,dirty:document.querySelector('.studio-document__state').textContent,selected:document.querySelector('.score-canvas .notation-event.is-selected')?.dataset.eventId,overflow:document.documentElement.scrollWidth>innerWidth}));fs.writeFileSync(path.join(scene,'conflict-feedback.json'),JSON.stringify(feedback,null,2));fs.writeFileSync(path.join(scene,'conflict-feedback.png'),(await capturePresented()).toPNG());assert.equal(nativeXmlSaves,baseSave);assert.equal(xmlSaves,baseCopy);assert(feedback.message.includes('보표별 반복·볼타 설정이 달라 MusicXML로 모두 보존할 수 없습니다'));assert(feedback.message.includes('프로젝트로 저장해 원본을 유지해 주세요'));assert(feedback.message.includes('Piano · 보표 2 · 2마디'));assert(!feedback.message.includes('(parts)'));assert(feedback.history.includes('1회 수정'));assert(feedback.dirty.includes('저장하지 않은 변경'));assert.equal(feedback.selected,'primary-note-0');assert(!feedback.overflow);await wait(label=>(document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim()===label,triggerLabel);fs.writeFileSync(path.join(scene,'trigger-focus.json'),JSON.stringify({triggerLabel,keyboardActivation:'native Enter',focusReturned:true},null,2))
   const label=channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보',technical=()=>run(label=>{const group=document.querySelector('[role="group"][aria-label="'+label+'"]'),content=group?.querySelector('.studio-warning-technical__content'),button=group?.querySelector('button');return{visible:content?.checkVisibility()??false,text:content?.textContent??'',expanded:button?.getAttribute('aria-expanded')}},label);const closed=await technical();assert(!closed.visible);await run(label=>{const group=document.querySelector('[role="group"][aria-label="'+label+'"]'),button=group?.querySelector('button');if(!button?.checkVisibility()||button.disabled)throw Error('Public technical disclosure inaccessible');button.scrollIntoView({block:'center'});button.focus()},label);await key('Enter');const opened=await technical();assert(opened.visible&&opened.text.includes('(parts)')&&opened.text.includes('lower-staff'));assert(await run(()=>document.querySelector('.editor-status').textContent.includes('정지')));fs.writeFileSync(path.join(scene,'conflict-technical.png'),(await capturePresented()).toPNG());await key('Space');assert(!(await technical()).visible,'Native Space must retain disclosure closing behavior');assert(await run(()=>document.querySelector('.editor-status').textContent.includes('정지')))
   assert.deepEqual((await save('conflict-project-preserved')).score,expected);await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('conflict-undo')).score,original);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('conflict-redo')).score,expected);openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('conflict-reopened')).score,expected);assert.deepEqual(fs.readFileSync(sourceFile),bytes);assert(!fs.existsSync(path.join(scene,'saved.musicxml'))&&!fs.existsSync(path.join(scene,'filtered.musicxml')))
   rows.push({width,height,channel,xmlWrites:0,nativeExact:true,undoRedo:true,nativeReopen:true,technicalKeyboard:true,selectionPreserved:true,dirtyPreserved:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS repeat conflict '+width+' '+channel)
  }return
 }
 if(repeatCountAudit){
  for(const[width,height]of [[960,750],[1400,800]])for(const owner of ['primary','lower','other']){
   sourceFile=path.join(source,owner,'source.chromatics');const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,golden=fs.readFileSync(path.join(source,owner,'source.mid'));scene=path.join(out,String(width),owner);fs.mkdirSync(scene,{recursive:true});step='repeat-count-'+width+'-'+owner;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await click('악보로 이동')
   const marks=await run(()=>{const root=document.querySelector('.score-canvas'),svg=root.querySelector('svg'),r=svg.getBoundingClientRect(),nodes=[...root.querySelectorAll('.notation-repeat-times')],staves=[...root.querySelectorAll('.vf-stave')].slice(0,4).map(n=>{const b=n.getBoundingClientRect();return{top:b.top,bottom:b.bottom}});return{labels:nodes.map(n=>n.textContent),ink:nodes.map(n=>{const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(n).font;c.textBaseline='alphabetic';c.textAlign='left';const b=c.measureText(n.textContent),p=n.getStartPositionOfChar(0),m=n.getScreenCTM(),a=new DOMPoint(p.x-b.actualBoundingBoxLeft,p.y-b.actualBoundingBoxAscent).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m);return{left:a.x,right:z.x,top:a.y,bottom:z.y}}),staves,svg:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},history:document.querySelector('.editor-status').textContent,position:document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent}});fs.writeFileSync(path.join(scene,'native-repeat-count.json'),JSON.stringify(marks,null,2));fs.writeFileSync(path.join(scene,'native-repeat-count.png'),(await capturePresented()).toPNG());assert.deepEqual(marks.labels,['x3'],'Performed repeat count must be shown once on the existing full-score system surface');assert(marks.staves[2].top>marks.staves[1].bottom+40,'Fixture must exercise two systems');assert(marks.history.includes('0회 수정'));assert(marks.position.includes('/ 32.0박'));for(const b of marks.ink)assert(b.left>=marks.svg.left-1&&b.right<=marks.svg.right+1&&b.top>=marks.svg.top-1&&b.bottom<=marks.svg.bottom+1,'Actual repeat-count ink must stay within the SVG')
   if(sharedRepeatBarlinesAudit){const bars=await run(()=>{const groups=[...document.querySelectorAll('.score-canvas .vf-stavebarline')];return groups.map(n=>({id:n.dataset.measureId,dots:[...n.querySelectorAll('path')].map(p=>p.getBBox()).filter(b=>b.width>3.5&&b.width<4.5&&b.height>3.5&&b.height<4.5).length}))});fs.writeFileSync(path.join(scene,'shared-barline-dots.json'),JSON.stringify(bars,null,2));for(const id of original.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.slice(0,2).map(m=>m.id))))assert.equal(bars.filter(b=>b.id===id).reduce((sum,b)=>sum+b.dots,0),2,'Shared repeat dots must be drawn on concrete staff measure '+id);const columns=await run(()=>['primary-note-0','lower-note-0','other-note-0'].map(id=>{const head=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"] .vf-notehead');if(!head)throw Error('Real staff note absent');const b=head.getBoundingClientRect();return{id,center:(b.left+b.right)/2}}));assert(Math.max(...columns.map(n=>n.center))-Math.min(...columns.map(n=>n.center))<1,'Same tick column must remain shared after repeat-barline insets');fs.writeFileSync(path.join(scene,'shared-barline-note-columns.json'),JSON.stringify(columns,null,2))}
   assert.deepEqual((await save('native-count-preserved')).score,original);openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-count-reopened')).score,original)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),golden)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'native-repeat-count.pdf'));await click('PDF 출력 결과 닫기')
   await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-repeat-times')].map(n=>n.textContent)),['x3']);await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),golden);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,owner,labels:marks.labels,twoSystems:true,nativeUnchanged:true,nativeReopen:true,zeroHistory:true,midiBytesExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS repeat count '+width+' '+owner)
  }return
 }
 if(partRepeatAudit){
  const choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual part navigation unavailable');n.focus();n.scrollIntoView({block:'center'})},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
  for(const[width,height]of [[960,750],[1400,800]])for(const kind of partRepeatWarningAudit?['repeat','volta','empty','identical']:partRepeatCase?[partRepeatCase]:['repeat','volta']){
   sourceFile=path.join(source,kind,'source.chromatics');const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,golden=fs.readFileSync(path.join(source,kind,'expected-part.mid')),meta=JSON.parse(fs.readFileSync(path.join(source,kind,'expectations.json')));scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});step='part-repeat-'+width+'-'+kind;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',partRepeatWarningAudit?0:1)
   if(partRepeatWarningAudit){
    await click('파일');await click('내보내기 설정');await run(()=>{const button=document.querySelector('button[aria-label="MusicXML 내보내기"]');if(!button?.checkVisibility()||button.disabled)throw Error('Actual part copy control unavailable');button.scrollIntoView({block:'center'});button.focus()});await key('Enter');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await wait(()=>document.activeElement?.getAttribute('aria-label')==='MusicXML \uB0B4\uBCF4\uB0B4\uAE30');const xmlFile=path.join(scene,'filtered.musicxml');assert.equal(fs.readFileSync(xmlFile,'utf8'),fs.readFileSync(path.join(source,kind,'expected-part.musicxml'),'utf8'),'The notice must not change existing part XML bytes');const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),check=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(check.status,0,check.stderr)
    const report=await run(()=>{const n=document.querySelector('[aria-label="MusicXML 경고 상세"]');return{visible:n?.checkVisibility()??false,title:n?.querySelector('h3')?.textContent,summary:[...n?.querySelectorAll('li')??[]].map(li=>li.firstElementChild.textContent),technical:[...n?.querySelectorAll('.studio-warning-technical__content')??[]].map(n=>({visible:n.checkVisibility(),text:n.textContent})),history:document.querySelector('.editor-status').textContent,dirty:document.querySelector('.studio-document__state').textContent,overflow:document.documentElement.scrollWidth>innerWidth}});fs.writeFileSync(path.join(scene,'part-copy-warning.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(scene,'part-copy-warning.png'),(await capturePresented()).toPNG());assert(report.history.includes('0회 수정'));assert(report.dirty.includes('변경 없음'));assert(!report.overflow)
    if(kind==='repeat'||kind==='volta'){assert(report.visible,'Overwritten independent part staff settings must have a visible copy warning');assert.equal(report.title,'MusicXML 내보내기 경고 1개');assert(report.summary[0].includes('보표별로 다른 반복·볼타 설정은 사본에 포함되지 않습니다'));assert(report.summary[0].includes('Piano · 보표 2 · 2마디'));assert(!report.technical[0].visible);await run(()=>{const n=document.querySelector('[aria-label="MusicXML 경고 상세"] button');if(!n?.checkVisibility())throw Error('Visible warning disclosure unavailable');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');assert(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content')?.checkVisibility()));assert(await run(()=>document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent.includes('Independent staff repeat and volta')));fs.writeFileSync(path.join(scene,'part-copy-technical.png'),(await capturePresented()).toPNG());await key('Space');assert(await run(()=>document.querySelector('.editor-status').textContent.includes('정지')))}else assert(!report.visible,'Empty/identical inherited flags must stay warning-free')
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'part-warning-native.pdf'));await click('PDF 출력 결과 닫기');
    assert.deepEqual((await save('part-copy-native-preserved')).score,original);openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('part-copy-reopened')).score,original);await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),golden);await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert(await run(()=>!document.querySelector('[aria-label="MusicXML 경고 상세"]')),'A replacement import must clear the previous private copy warning');await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),golden);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
    rows.push({width,height,kind,warning:kind==='repeat'||kind==='volta',xmlBytesUnchanged:true,xmlXsd:true,midiExact:true,nativePreserved:true,nativeReopen:true,pdf:true,replacementClearsWarning:true,zeroHistory:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS part repeat warning '+width+' '+kind);continue
   }
   if(repeatScopeAudit){
    await measure('other-bar-2');await click('추가');await click('반복·볼타 팔레트');await click('반복·볼타 설정 열기')
    const before=await run(()=>({start:document.querySelector('button[aria-label="도돌이표 시작"]').getAttribute('aria-pressed'),end:document.querySelector('button[aria-label="도돌이표 끝"]').getAttribute('aria-pressed'),count:document.querySelector('input[aria-label="반복 횟수"]').value,scope:document.querySelector('.studio-repeat-tools').textContent,position:document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent}));fs.writeFileSync(path.join(scene,'scope-before.json'),JSON.stringify(before,null,2))
    await run(()=>{const n=document.querySelector('.studio-repeat-tools');n.scrollIntoView({block:'center'})});await settle();const geometry=await run(()=>{const n=document.querySelector('.studio-repeat-tools'),r=n.getBoundingClientRect(),field=n.querySelector('input').getBoundingClientRect();return{left:r.left,right:r.right,fieldLeft:field.left,fieldRight:field.right,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}});assert(geometry.left>=-1&&geometry.right<=geometry.viewport+1&&geometry.fieldLeft>=-1&&geometry.fieldRight<=geometry.viewport+1&&geometry.documentWidth<=geometry.viewport+1,'Public scope controls must remain within viewport');fs.writeFileSync(path.join(scene,'scope-geometry.json'),JSON.stringify(geometry,null,2));fs.writeFileSync(path.join(scene,'scope-before.png'),(await capturePresented()).toPNG())
    if(repeatScopeContext){await measure('other-bar-2');const point=await run(()=>{const n=document.querySelector('.score-canvas .notation-measure[data-measure-id="other-bar-2"]'),r=n.getBoundingClientRect();for(const fx of [.75,.5,.3])for(const fy of [.25,.65]){const x=Math.round(r.x+r.width*fx),y=Math.round(r.y+r.height*fy);if(document.elementFromPoint(x,y)===n)return{x,y}}throw Error('No actual part context point')});for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'right',clickCount:1});await wait(()=>Boolean(document.querySelector('[role="menu"][aria-label="마디 작업"]')));assert(await run(()=>document.querySelector('[role="menu"][aria-label="마디 작업"]').textContent.includes('총보 공통 반복 · Piano · 보표 2 · 2마디')));fs.writeFileSync(path.join(scene,'scope-context.png'),(await capturePresented()).toPNG());await run(label=>{const menu=document.querySelector('[role="menu"][aria-label="마디 작업"]'),item=[...menu.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent===label);if(!item?.checkVisibility()||item.disabled)throw Error('Actual scoped menu command unavailable');item.focus()},kind==='repeat'?'도돌이표 끝':'1번 볼타');await key('Enter')}
    else if(kind==='repeat'){await run(()=>{const n=document.querySelector('input[aria-label="반복 횟수"]');const visible=n.checkVisibility()&&!n.disabled;if(!visible)throw Error('Repeat input inaccessible');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('3');await key('Enter');await key('Tab')}else await click('1번 볼타')
    const expected=structuredClone(original),target=expected.parts[0].staves[1].measures[1];if(kind==='repeat'){if(repeatScopeContext)delete target.repeat;else target.repeat={end:true,times:3}}else delete target.volta
    const actual=(await save('repeat-scope-edited')).score;assert.deepEqual(actual,expected,'Part edits must update the performed source without writing ignored local marks')
    assert(before.scope.includes('총보 공통 반복 · Piano · 보표 2 · 2마디'),'Shared native scope must be explicit before editing')
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('repeat-scope-undo')).score,original);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('repeat-scope-redo')).score,expected)
    openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('repeat-scope-reopened')).score,expected)
    const position=await run(()=>document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent);assert(position.includes('/ '+(kind==='repeat'?(repeatScopeContext?'16.0':'32.0'):'24.0')+'박'),'Transport must reflect edited performed sequence');await click('악보로 이동');fs.writeFileSync(path.join(scene,'scope-edited.png'),(await capturePresented()).toPNG())
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));const editedMidi=fs.readFileSync(path.join(scene,'filtered.mid'));fs.writeFileSync(path.join(scene,'edited-before-xml.mid'),editedMidi)
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'edited-native.pdf'));await click('PDF 출력 결과 닫기')
    await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),check=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(check.status,0,check.stderr)
    await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),editedMidi);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
    rows.push({width,height,kind,position,nativeOwnerExact:true,undoRedo:true,nativeReopen:true,xmlXsd:true,midiRoundtripExact:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));continue
   }
   const read=()=>run(()=>({partId:document.querySelector('.score-page[data-view-mode="part"]')?.dataset.partId,labels:[...document.querySelectorAll('.score-canvas .notation-volta-mark text')].map(n=>n.textContent),position:document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent,history:document.querySelector('.editor-status').textContent}))
   await click('악보로 이동');await settle()
   const ink=await run(()=>{const glyph=document.querySelector('.score-canvas .notation-event.is-selected .vf-notehead text');if(!glyph)throw Error('Actual selected part note missing');const context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(glyph).font;context.textBaseline='alphabetic';context.textAlign='left';const b=context.measureText(glyph.textContent),p=glyph.getStartPositionOfChar(0),m=glyph.getScreenCTM(),a=new DOMPoint(p.x-b.actualBoundingBoxLeft,p.y-b.actualBoundingBoxAscent).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m),canvas=document.querySelector('.score-canvas').getBoundingClientRect();return{top:a.y,bottom:z.y,portTop:Math.max(0,canvas.top),portBottom:Math.min(innerHeight,canvas.bottom,document.querySelector('.studio-status').getBoundingClientRect().top)}});assert(ink.top>=ink.portTop-1&&ink.bottom<=ink.portBottom+1,'Explicit score navigation must expose actual part-note ink');fs.writeFileSync(path.join(scene,'part-note-exposed.json'),JSON.stringify(ink,null,2))
   const before=await read();assert.equal(before.partId,meta.partId);assert(before.history.includes('0회 수정'));assert.deepEqual((await save('part-view-native-preserved')).score,original);fs.writeFileSync(path.join(scene,'part-before-output.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));const midi=fs.readFileSync(path.join(scene,'filtered.mid')),midiMatch=midi.equals(golden);fs.copyFileSync(path.join(scene,'filtered.mid'),path.join(scene,'before-xml.mid'))
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'part-native.pdf'));await click('PDF 출력 결과 닫기');assert.deepEqual((await save('part-output-preserved')).score,original)
   await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const after=await read();await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));const imported=fs.readFileSync(path.join(scene,'filtered.mid')),xmlMidiMatch=imported.equals(golden);fs.copyFileSync(path.join(scene,'filtered.mid'),path.join(scene,'after-xml.mid'))
   const comparison={width,height,kind,before,after,midiMatch,xmlMidiMatch,nativeMidiBytes:midi.length,expectedMidiBytes:golden.length,nativeMidiSha256:createHash('sha256').update(midi).digest('hex'),expectedMidiSha256:createHash('sha256').update(golden).digest('hex')};fs.writeFileSync(path.join(scene,'part-repeat-comparison.json'),JSON.stringify(comparison,null,2));assert.deepEqual(fs.readFileSync(sourceFile),bytes);assert(xmlMidiMatch,'Existing XML part export must remain a valid performed-sequence control');assert(midiMatch,'Native selected-part MIDI must preserve the same sequence as its XML export');if(kind==='volta')assert.deepEqual(before.labels,['1.','2.'],'Native selected-part view must preserve system endings')
   rows.push(comparison);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS inherited part '+width+' '+kind)
  }return
 }
 if(secondaryContextAudit){
  for(const[width,height]of [[960,750],[1400,800]])for(const kind of ['repeat','volta']){
   sourceFile=path.join(source,kind,'input.chromatics');const inputBytes=fs.readFileSync(sourceFile),input=JSON.parse(inputBytes).score,expected=JSON.parse(fs.readFileSync(path.join(source,kind,'source.chromatics'))).score,meta=JSON.parse(fs.readFileSync(path.join(source,kind,'expectations.json')));scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});step='secondary-repeat-'+width+'-'+kind;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const actions=[]
   const context=async(id,label)=>{await measure(id);const point=await run(id=>{const n=document.querySelector('.notation-measure[data-measure-id="'+id+'"]'),r=n.getBoundingClientRect();for(const fx of [.75,.5,.3])for(const fy of [.25,.65]){const x=Math.round(r.x+r.width*fx),y=Math.round(r.y+r.height*fy);if(document.elementFromPoint(x,y)===n)return{x,y}}throw Error('No real measure context point')},id);for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'right',clickCount:1});await wait(()=>Boolean(document.querySelector('[role="menu"][aria-label="마디 작업"]')));await click(label);actions.push({id,label,point});fs.writeFileSync(path.join(scene,'context-actions.json'),JSON.stringify(actions,null,2))}
   await context(meta.measureIds[0],'도돌이표 시작');await context(meta.measureIds[1],'도돌이표 끝');if(kind==='volta'){await context(meta.measureIds[1],'1번 볼타');await context(meta.measureIds[2],'2번 볼타')}
   const edited=(await save('context-edited')).score;assert.deepEqual(edited,expected,'Actual context commands must match the independent model/MIDI fixture')
   if(secondaryVoltaAudit&&kind==='volta'){
    const marks=await run(()=>{const root=document.querySelector('.score-canvas'),rect=n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right}},staves=[...root.querySelectorAll('.vf-stave')];return{labels:[...root.querySelectorAll('.notation-volta-mark')].filter(n=>n.querySelector('text')).map(n=>({text:n.querySelector('text').textContent,box:rect(n)})),svg:rect(root.querySelector('svg')),primary:staves.slice(0,4).map(rect)}});fs.writeFileSync(path.join(scene,'native-volta-marks.json'),JSON.stringify(marks,null,2));fs.writeFileSync(path.join(scene,'native-volta-marks.png'),(await capturePresented()).toPNG());assert.deepEqual(marks.labels.map(n=>n.text),['1.','2.'],'Native lower-source endings must be drawn before XML export');assert(marks.primary[2].top>marks.primary[1].bottom+40,'Fixture must exercise two actual systems');for(const [label,index]of marks.labels.map((label,i)=>[label,i+1])){assert(label.box.bottom<marks.primary[index].top+1,'Volta must stay above the existing primary-staff surface');assert(label.box.top>=marks.svg.top-1&&label.box.left>=marks.svg.left-1&&label.box.right<=marks.svg.right+1,'Actual volta ink must stay in the score SVG')}
   }
   const readTotal=()=>run(()=>Number(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent.split('/')[1].replace('박','').trim()));assert.equal(await readTotal(),meta.totalBeats)
   for(let i=0;i<actions.length;i++){await click('악보로 이동');await key('Z',['control'])}assert.deepEqual((await save('context-all-undo')).score,input)
   for(let i=0;i<actions.length;i++){await click('악보로 이동');await key('Z',['control','shift'])}assert.deepEqual((await save('context-all-redo')).score,expected)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('context-native-reopened')).score,expected)
   fs.writeFileSync(path.join(scene,'native-repeat.png'),(await capturePresented()).toPNG());await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'source.mid')));fs.copyFileSync(path.join(scene,'filtered.mid'),path.join(scene,'before-xml.mid'))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const file=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(file,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0');assert(xml.includes('<repeat'));if(kind==='volta')assert(xml.includes('<ending'));const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'native-repeat.pdf'));await click('PDF 출력 결과 닫기');assert.deepEqual((await save('source-before-xml-import')).score,expected)
   await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(await readTotal(),meta.totalBeats,'Default MusicXML import must preserve the repeat traversal')
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(scene,'before-xml.mid')),'Actual UI XML round-trip must retain exact MIDI bytes');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'reimport-repeat.pdf'));fs.writeFileSync(path.join(scene,'reimport-repeat.png'),(await capturePresented()).toPNG());assert.deepEqual(fs.readFileSync(sourceFile),inputBytes)
   rows.push({width,height,kind,totalBeats:meta.totalBeats,actions,nativeExact:true,allUndoRedo:true,midiExact:true,xmlXsd:true,actualXmlImportMidiExact:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS secondary context '+width+' '+kind)
  }return
 }
 if(expressionDestinationAudit){
  const sourcePath=path.join(source,'source.chromatics'),destinationPath=path.join(source,'destination.chromatics'),sourceBytes=fs.readFileSync(sourcePath),destinationBytes=fs.readFileSync(destinationPath),sourceScore=JSON.parse(sourceBytes).score,destinationScore=JSON.parse(destinationBytes).score
  for(const[width,height]of [[960,750],[1400,800]])for(const destination of ['primary-measure','lower-measure','other-measure','other-event','new-document']){
   sourceFile=sourcePath;scene=path.join(out,String(width),destination);fs.mkdirSync(scene,{recursive:true});step='expression-destination-'+width+'-'+destination;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await run(()=>{const n=document.querySelector('.score-canvas .notation-expression-text-target[data-expression-text-id="second-expression"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await click('악보로 이동');await key('C',['control']);assert.deepEqual((await save('copied-unchanged')).score,sourceScore)
   let target=sourceScore;if(destination==='new-document'){sourceFile=destinationPath;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('destination.chromatics을 열었습니다.'));target=destinationScore}
   const targetMeasure=destination==='lower-measure'?'lower-neighbor':destination.startsWith('other-')?'second-neighbor':'neighbor',tick=destination.endsWith('-measure')?0:26880
   if(destination.endsWith('-measure')){
    const ownerEvent=destination==='lower-measure'?'lower-neighbor-note':destination==='other-measure'?'second-neighbor-note':'neighbor-note'
    // Probe the actual staff ink even when an overlay is missing;do not infer
    // pointer failure solely from a selector that expects the new surface.
    await run(id=>document.querySelector('.notation-event[data-event-id="'+id+'"]').scrollIntoView({block:'center'}),ownerEvent);await settle()
    fs.writeFileSync(path.join(scene,'blank-staff-metrics.json'),JSON.stringify(await run(id=>({event:document.querySelector('.notation-event[data-event-id="'+id+'"]').getBoundingClientRect().toJSON(),head:document.querySelector('.notation-event[data-event-id="'+id+'"] .vf-notehead').getBoundingClientRect().toJSON(),staves:[...document.querySelectorAll('.score-canvas .vf-stave')].map(n=>({box:n.getBoundingClientRect().toJSON(),html:n.outerHTML.slice(0,160)}))}),ownerEvent),null,2))
    const point=await run(id=>{
     const event=document.querySelector('.notation-event[data-event-id="'+id+'"]'),glyph=event.querySelector('.vf-notehead text'),context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(glyph).font;context.textAlign='left';context.textBaseline='alphabetic';const ink=context.measureText(glyph.textContent),start=glyph.getStartPositionOfChar(0),matrix=glyph.getScreenCTM(),a=new DOMPoint(start.x-ink.actualBoundingBoxLeft,start.y-ink.actualBoundingBoxAscent).matrixTransform(matrix),z=new DOMPoint(start.x+ink.actualBoundingBoxRight,start.y+ink.actualBoundingBoxDescent).matrixTransform(matrix),head={left:a.x,top:a.y,right:z.x,bottom:z.y},staves=[...document.querySelectorAll('.score-canvas .vf-stave')].map(n=>({n,r:n.getBoundingClientRect()})).filter(({r})=>head.left>=r.left&&head.left<r.right&&head.top>=r.top&&head.top-r.bottom<35).sort((a,b)=>Math.abs(head.top-a.r.bottom)-Math.abs(head.top-b.r.bottom));if(!staves.length)throw Error('Actual lower-staff ink not found');const r=staves[0].r
     for(const fx of [.7,.35,.85])for(const fy of [.25,.6,.4]){const x=Math.round(r.left+r.width*fx),y=Math.round(r.top+r.height*fy),hit=document.elementFromPoint(x,y);if(hit&&!hit.closest('.notation-event,.notation-expression-text-target,.notation-staff-text-target')&&y>0&&y<innerHeight)return{x,y,hitClass:hit.getAttribute('class'),staffRect:{x:r.x,y:r.y,width:r.width,height:r.height},ownerInk:head,ownerEvent:event.dataset.eventId}}
     throw Error('No actual blank staff ink point')
    },ownerEvent);for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});await settle()
    const selected=await run(()=>({measure:document.querySelector('.notation-measure.is-selected')?.dataset.measureId,kind:document.querySelector('[aria-label="선택 요약"]')?.dataset.selectionKind}));fs.writeFileSync(path.join(scene,'blank-measure-pointer.json'),JSON.stringify({point,selected},null,2));fs.writeFileSync(path.join(scene,'blank-measure-pointer.png'),(await capturePresented()).toPNG());assert.equal(selected.measure,targetMeasure,'Real blank staff click must select its concrete measure');assert.equal(selected.kind,'measure')
    for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'right',clickCount:1});await wait(()=>Boolean(document.querySelector('[role="menu"][aria-label="마디 작업"]')));assert.equal(await run(()=>document.querySelector('.notation-measure.is-selected')?.dataset.measureId),targetMeasure);await key('Escape');assert(await run(()=>!document.querySelector('[role="menu"][aria-label="마디 작업"]')&&document.activeElement===document.querySelector('.score-canvas')),'Context Escape must return canvas focus without changing owner')
   }
   else{await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');n.scrollIntoView({block:'center'});n.focus()},destination==='other-event'?'second-neighbor-late':'neighbor-late');await key('Enter')}
   await key('V',['control']);const pasted=(await save('destination-paste')).score,added=pasted.expressionTexts.at(-1);assert.match(added.id,/^expression-text-/);assert(!target.expressionTexts.some(n=>n.id===added.id));assert.deepEqual(added,{id:added.id,measureId:targetMeasure,tick,text:'Second'});assert.deepEqual(pasted.expressionTexts.slice(0,-1),target.expressionTexts);assert.deepEqual({...pasted,expressionTexts:target.expressionTexts},target)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('destination-undo')).score,target);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('destination-redo')).score,pasted)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('destination-reopened')).score,pasted);fs.writeFileSync(path.join(scene,'destination-pasted.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   expressionPrintExpected=pasted.expressionTexts.map(n=>n.text);await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('destination-output-preserved')).score,pasted);assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes);assert.deepEqual(fs.readFileSync(destinationPath),destinationBytes)
   rows.push({width,height,destination,targetMeasure,tick,added,actualMeasurePointer:destination.endsWith('-measure'),nativeClipboardKeys:true,exactUndoRedo:true,nativeReopen:true,midiExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS expression destination '+width+' '+destination)
  }return
 }
 if(expressionClipboardAudit){
  const choose=async(label,index)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Missing visible choice '+label);n.focus();n.scrollIntoView({block:'center'})},label);await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')}
  for(const[width,height]of [[960,750],[1400,800]])for(const view of ['score','primary-part','lower-part','other-part']){
   sourceFile=path.join(source,view,'source.chromatics');const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,meta=JSON.parse(fs.readFileSync(path.join(source,view,'expectations.json')));scene=path.join(out,String(width),view);fs.mkdirSync(scene,{recursive:true});step='expression-clipboard-'+width+'-'+view;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   if(view!=='score'){await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',view==='other-part'?1:0)}
   await run(()=>{const n=document.querySelector('.score-canvas .notation-expression-text-target[data-expression-text-id="second-expression"]');if(!n)throw Error('Missing source expression');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await click('악보로 이동')
   if(width===960)await key('C',['control']);else{await click('편집');await click('선택 표현 텍스트 복사')}
   assert.deepEqual((await save('copied-no-music')).score,original)
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 표현 텍스트"]');if(!n?.checkVisibility()||n.disabled)throw Error('Existing public property field inaccessible');n.scrollIntoView({block:'center'});n.focus();n.select()});win.webContents.insertText('Edited after copy');await key('Enter');await key('Tab')
   const edited=structuredClone(original);edited.expressionTexts.find(n=>n.id==='second-expression').text='Edited after copy';assert.deepEqual((await save('source-edited-after-copy')).score,edited)
   await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');if(!n)throw Error('Missing destination event');n.scrollIntoView({block:'center'});n.focus()},meta.destinationEvent);await key('Enter')
   const before=await run(()=>({id:document.querySelector('.notation-event.is-selected')?.dataset.eventId,history:document.querySelector('.editor-status').textContent}));assert.equal(before.id,meta.destinationEvent)
   if(width===960)await key('V',['control']);else{await click('편집');await click('복사한 표현 텍스트 추가')}
   const pasted=(await save('pasted-one')).score,added=pasted.expressionTexts.at(-1);assert.match(added.id,/^expression-text-/);assert(!edited.expressionTexts.some(n=>n.id===added.id));assert.deepEqual(added,{id:added.id,measureId:meta.destinationMeasure,tick:meta.destinationTick,text:'Second'});assert.deepEqual(pasted.expressionTexts.slice(0,-1),edited.expressionTexts);assert.deepEqual({...pasted,expressionTexts:edited.expressionTexts},edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('paste-undo')).score,edited);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('paste-redo')).score,pasted)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('paste-native-reopened')).score,pasted);fs.writeFileSync(path.join(scene,'pasted-one.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,view,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const file=path.join(scene,'filtered.musicxml'),schema=path.resolve('src/musicxml/schema/musicxml-4.0'),check=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(check.status,0,check.stderr)
   expressionPrintExpected=pasted.expressionTexts.filter(n=>view==='score'||pasted.parts.find(p=>p.id===meta.partId).staves.some(s=>s.measures.some(m=>m.id===n.measureId))).map(n=>n.text);await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('paste-output-preserved')).score,pasted);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,view,added,oneCommandPaste:true,snapshotPreserved:true,neighborsExact:true,nativeExact:true,midiExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS single expression clipboard '+width+' '+view)
  }return
 }
 if(expressionObjectAudit){
  for(const [width,height]of [[960,750],[1400,800]])for(const view of ['score','primary-part','lower-part','other-part']){
   step='expression-object-'+width+'-'+view;scene=path.join(out,String(width),view);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,view,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,meta=JSON.parse(fs.readFileSync(path.join(source,view,'expectations.json')))
   if(expressionBrowserAudit&&win.webContents.debugger.isAttached()){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}
   nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   let browserOpens=0
   const choose=async(label,index)=>{
    await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual view field unavailable');n.focus();n.scrollIntoView({block:'center'})},label);await key('Space')
    if(expressionBrowserAudit&&label==='표현 텍스트 대상'){
     await scaleTextChoiceChrome();await settle()
     const box=await run(()=>{const n=document.querySelector('[role="listbox"]'),r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer:coarse)').matches,unitHelp:(()=>{const field=[...document.querySelectorAll('label')].find(n=>n.textContent==='표현 텍스트 대상')?.control;return(field?.getAttribute('aria-describedby')??'').split(/\s+/).map(id=>document.getElementById(id)?.textContent??'').join(' ').trim()})(),options:[...n.querySelectorAll('[role="option"]')].map(n=>{const r=n.getBoundingClientRect();return{label:n.textContent,height:r.height,top:r.top,bottom:r.bottom}})}})
     assert(box.left>=-.5&&box.right<=box.width+.5&&box.top>=-.5&&box.bottom<=box.height+.5,'Actual enlarged object picker must remain inside the viewport');assert(box.options.every(n=>n.height>=(box.coarse?47.9:31.9)),'Public object options must preserve pointer target minimums')
     if(expressionPickerDensityAudit){
      assert.equal(box.unitHelp,'위치는 4분음표 기준입니다.');assert(box.options.every(n=>!n.label.includes('4분음표')),'Explain the common unit once,not inside every option')
      if(browserOpens===0)assert(box.options.filter(n=>n.top>=box.top-.5&&n.bottom<=box.bottom+.5).length>=2,'Initial enlarged object list must expose at least two complete choices')
     }
     const name='expression-browser-open-'+(++browserOpens);fs.writeFileSync(path.join(scene,name+'.json'),JSON.stringify(box,null,2));fs.writeFileSync(path.join(scene,name+'.png'),(await capturePresented()).toPNG())
    }
    await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')
   }
   if(view!=='score'){await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',view==='other-part'?1:0)}
   if(expressionBrowserAudit){
    await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');if(!n)throw Error('Actual owner note missing');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},meta.eventId);await key('Enter');await click('도구');await click('선택 속성 열기')
    const conditions=await prepareTextChoiceConditions(width,'선택 요약 표현 텍스트','표현 텍스트 대상');fs.writeFileSync(path.join(scene,'browser-conditions.json'),JSON.stringify(conditions,null,2))
    await choose('표현 텍스트 대상',1)
    const selected=await run(()=>({id:document.querySelector('.notation-expression-text-target.is-selected')?.dataset.expressionTextId,value:document.querySelector('input[aria-label="선택 요약 표현 텍스트"]').value,focus:document.activeElement===document.querySelector('input[aria-label="선택 요약 표현 텍스트"]')}));assert.equal(selected.id,'second-expression');assert.equal(selected.value,'Second');assert(selected.focus);assert.deepEqual((await save('browser-selection-only')).score,original)
    fs.writeFileSync(path.join(scene,'browser-selected.png'),(await capturePresented()).toPNG())
   }
   const activate=async(id,method='pointer')=>{
    const point=await run(id=>{const n=document.querySelector('.score-canvas .notation-expression-text-target[data-expression-text-id="'+id+'"]');if(!n)throw Error('Actual expression object missing '+id);n.scrollIntoView({block:'center'});n.focus({preventScroll:true});const r=n.querySelector('rect').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}},id);await settle()
    if(method==='pointer'){
     const hit=await run(({x,y})=>document.elementFromPoint(x,y)?.closest('.notation-expression-text-target')?.dataset.expressionTextId,point);assert.equal(hit,id,'Actual expression ink must hit its exact object');win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(point.x),y:Math.round(point.y)});win.webContents.sendInputEvent({type:'mouseDown',x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1});await settle()
    }else await key(method)
    const value=original.expressionTexts.find(n=>n.id===id)?.text
    const state=await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 표현 텍스트"]');return{value:n?.value,focus:document.activeElement===n,kind:document.querySelector('[aria-label="선택 요약"]').dataset.selectionKind,selected:document.querySelector('.notation-expression-text-target.is-selected')?.dataset.expressionTextId,stopped:document.querySelector('.studio-playback button[aria-label="정지"]').disabled}})
    assert.equal(state.value,value);assert(state.focus&&state.stopped);assert.equal(state.kind,'expression-text');assert.equal(state.selected,id)
    fs.writeFileSync(path.join(scene,'selected-'+id+'-'+method+'.png'),(await capturePresented()).toPNG())
   }
   await activate('second-expression');assert.deepEqual((await save('selection-only')).score,original)
   const ink=(await readUpperAnnotationInk(false)).find(n=>n.kind==='notation-expression-text'&&n.text==='Second'),hit=await run(()=>{const r=document.querySelector('.notation-expression-text-target[data-expression-text-id="second-expression"] rect').getBBox();return{x:r.x,y:r.y,width:r.width,height:r.height}})
   assert(ink);for(const [a,b]of [[hit.x,ink.left],[hit.y,ink.top],[hit.x+hit.width,ink.right],[hit.y+hit.height,ink.bottom]])assert(Math.abs(a-b)<.1,'Expression pointer rectangle must follow real ink,not its font cell')
   const ime=[]
   for(const spec of [{key:'Enter',isComposing:true},{key:' ',isComposing:true},{key:'Enter',keyCode:229},{key:'Process'}]){
    await run(()=>{const n=document.querySelector('.notation-expression-text-target[data-expression-text-id="first-expression"]');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})});await run(spec=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...spec})),spec);await settle()
    const state=await run(()=>({id:document.querySelector('.notation-expression-text-target.is-selected')?.dataset.expressionTextId,history:document.querySelector('.editor-status').textContent,stopped:document.querySelector('.studio-playback button[aria-label="정지"]').disabled}));assert.equal(state.id,'second-expression');assert(state.history.includes('0회 수정')&&state.stopped);ime.push({spec,...state})
   }
   fs.writeFileSync(path.join(scene,'synthetic-ime.json'),JSON.stringify(ime,null,2));await activate('first-expression','Enter');await activate('second-expression','Space')
   await run(()=>document.querySelector('input[aria-label="선택 요약 표현 텍스트"]').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));await win.webContents.insertText('미확정');await activate('third-expression');assert.deepEqual((await save('discarded-composition')).score,original)
   await run(()=>document.querySelector('input[aria-label="선택 요약 표현 텍스트"]').select());await win.webContents.insertText('Third edited');await key('Enter');await key('Tab')
   const edited=structuredClone(original);edited.expressionTexts.find(n=>n.id==='third-expression').text='Third edited';assert.deepEqual((await save('edited')).score,edited)
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 코드"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual location chord property unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('C7');await key('Enter');await key('Tab')
   const withChord=(await save('exact-location-chord')).score;assert.equal(withChord.harmonies.length,1);assert.equal(withChord.harmonies[0].measureId,meta.targetMeasure);assert.equal(withChord.harmonies[0].tick,meta.tick);assert.equal(withChord.harmonies[0].text,'C7');const {harmonies:temporaryChord,...untouched}=withChord;assert.deepEqual(untouched,edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('location-chord-undo')).score,edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,original);await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
   await activate('second-expression');await click('편집');const copy=await run(()=>[...document.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent.includes('복사'))?.disabled);assert.equal(copy,false,'Exact single-expression copy is supported;the separate clipboard audit verifies no music fallback');await key('Escape');await click('악보로 이동');await key('Delete')
   const deleted=structuredClone(edited);deleted.expressionTexts=deleted.expressionTexts.filter(n=>n.id!=='second-expression');assert.deepEqual((await save('deleted-one')).score,deleted);await key('Z',['control']);assert.deepEqual((await save('delete-undo')).score,edited)
   if(expressionBrowserAudit){
    await activate('first-expression');await click('악보로 이동');await key('Delete')
    const removedFirst=structuredClone(edited);removedFirst.expressionTexts=removedFirst.expressionTexts.filter(n=>n.id!=='first-expression');assert.deepEqual((await save('empty-current-position')).score,removedFirst)
    const empty=await run(()=>({value:document.querySelector('input[aria-label="선택 요약 표현 텍스트"]').value,choice:[...document.querySelectorAll('label')].find(n=>n.textContent==='표현 텍스트 대상')?.control.textContent}));assert.equal(empty.value,'');assert(empty.choice.includes('현재 위치에 새 표기'));fs.writeFileSync(path.join(scene,'empty-current-position.json'),JSON.stringify(empty,null,2))
    await choose('표현 텍스트 대상',0);assert.equal(await run(()=>document.querySelector('.notation-expression-text-target.is-selected')?.dataset.expressionTextId),'second-expression');assert.deepEqual((await save('off-grid-after-empty')).score,removedFirst)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('empty-position-undo')).score,edited)
   }
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   const present=await run(()=>[...document.querySelectorAll('.score-canvas .notation-expression-text-target')].map(n=>({id:n.dataset.expressionTextId,text:n.textContent})));assert(present.some(n=>n.id==='third-expression'&&n.text==='Third edited'));fs.writeFileSync(path.join(scene,'edited.png'),(await capturePresented()).toPNG())
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,view,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xml=path.join(scene,'filtered.musicxml'),schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xml],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   expressionPrintExpected=edited.expressionTexts.map(n=>n.text);await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('output-preserved')).score,edited);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,view,targetMeasure:meta.targetMeasure,tick:meta.tick,actualPointer:true,keyboard:true,syntheticIme:true,staleDraftIsolated:true,exactUndoRedo:true,deleteOne:true,nativeExact:true,midiExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS expression object '+width+' '+view)
  }
  return
 }
 if(prepareTupletPlaybackAudit){
  win.webContents.setAudioMuted(true);const bytes=fs.readFileSync(sourceFile),sourceScore=original.score,rest=sourceScore.parts[0].staves[0].measures[0].voices[0].events[0]
  for(const[width,height]of [[960,750],[1400,800]]){
   scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='prepare-playing-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await click('재생');await wait(()=>Boolean(document.querySelector('.notation-playhead')))
   await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');n.scrollIntoView({block:'center'});n.focus()},rest.id);await key('Enter');if(!prepareTupletFromRest)await key('N')
   await run(()=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&n.getAttribute('aria-label')?.includes('셋잇단음표 적용 또는 입력 준비'));if(!n||n.disabled)throw Error('Tuplet prep unavailable');n.click()});await click('악보로 이동');await key('C')
   const state=()=>run(()=>({input:document.querySelector('.studio-input-context').dataset.inputActive,history:document.querySelector('.editor-status').textContent,preview:document.querySelectorAll('.notation-event.is-preview').length,beat:parseFloat(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent),pauseDisabled:document.querySelector('.studio-playback [aria-label="일시정지"]').disabled}))
   const before=await state();await new Promise(resolve=>setTimeout(resolve,1750));await settle();const after=await state();fs.writeFileSync(path.join(scene,'prepare-states.json'),JSON.stringify({before,after},null,2));fs.writeFileSync(path.join(scene,'prepare-held.png'),(await capturePresented()).toPNG());assert(before.history.includes('셋잇단음표 1/3'),'Actual valid draft must start');assert(after.history.includes('셋잇단음표 1/3')&&after.input==='true','Running playback must not discard newly prepared draft: '+JSON.stringify(after));assert(after.pauseDisabled&&after.history.includes('일시정지'));assert.equal(after.beat,before.beat);assert.equal(after.preview,before.preview)
   await key('D');await key('E');const edited=(await save('completed-from-playback')).score;assert.deepEqual(edited.parts[1],sourceScore.parts[1]);assert.deepEqual(edited.parts[0].staves[0].measures[0].voices[0].events.filter(n=>n.type==='note').map(n=>n.pitch.step),['C','D','E'])
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('prepared-reopened')).score,edited);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,fromRest:prepareTupletFromRest,before,after,nativeExact:true,otherPartExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS playback→tuplet preparation '+width)
  }return
 }
 if(pendingInputMarkerAudit){
  if(pendingTupletPlaybackAudit)win.webContents.setAudioMuted(true)
  const sourceScore=original.score,rest=sourceScore.parts[0].staves[0].measures[0].voices[0].events[0]
  assert.equal(rest.type,'rest')
  for(const [width,height]of [[960,750],[1400,800]]){
   scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='pending-input-marker-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');n.scrollIntoView({block:'center'});n.focus()},rest.id);await key('Enter');await key('N');await settle();assert.equal(await run(()=>document.querySelectorAll('.notation-note-input-cursor').length),1)
   await run(()=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&n.getAttribute('aria-label')?.includes('셋잇단음표 적용 또는 입력 준비'));if(!n||n.disabled)throw Error('Actual tuplet command unavailable');n.click()});await settle()
   const phases=[]
   const audit=async count=>{
    const state=await run(()=>({markers:document.querySelectorAll('.notation-note-input-cursor').length,preview:[...document.querySelectorAll('.notation-event.is-preview')].map(n=>({role:n.getAttribute('role'),tab:n.getAttribute('tabindex')})),history:document.querySelector('.editor-status').textContent}))
    if(pendingTupletPlaybackAudit&&(pendingPlayCount===undefined||Number(pendingPlayCount)===count)){
     await click('악보로 이동');win.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});win.webContents.sendInputEvent({type:'char',keyCode:' '});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});await new Promise(resolve=>setTimeout(resolve,160));await settle()
     const after=await run(()=>({playhead:document.querySelectorAll('.notation-playhead').length,input:document.querySelector('.studio-input-context').dataset.inputActive,history:document.querySelector('.editor-status').textContent,preview:document.querySelectorAll('.notation-event.is-preview').length,disabled:document.querySelector('[aria-label="재생 컨트롤"] button[aria-label="재생"]').disabled}));fs.writeFileSync(path.join(scene,'play-attempt-'+count+'.json'),JSON.stringify(after,null,2));fs.writeFileSync(path.join(scene,'play-attempt-'+count+'.png'),(await capturePresented()).toPNG());assert(after.history.includes('셋잇단음표 '+count+'/3'),'Play must not discard pending tuplet members: '+JSON.stringify(after));assert.equal(after.playhead,0);assert.equal(after.input,'true');assert.equal(after.preview,state.preview.length);assert(after.disabled,'Transport Play must communicate pending-input enablement');assert(after.history.includes('완료하거나 취소한 뒤 재생'))
    }
    assert.equal(state.markers,0,'Pending tick is a group anchor,not a fabricated next-input slot');assert(state.history.includes('셋잇단음표 '+count+'/3')&&state.history.includes('묶음 시작')&&state.history.includes('0회 수정'));assert(count===0?state.preview.length===0:state.preview.length>=3&&state.preview.every(n=>n.role===null&&n.tab===null),'Zero members have no draft; actual preview notes remain readonly');phases.push({count,...state});fs.writeFileSync(path.join(scene,'pending-phases.json'),JSON.stringify(phases,null,2));fs.writeFileSync(path.join(scene,'pending-'+count+'.png'),(await capturePresented()).toPNG())
   }
   await audit(0);await click('악보로 이동');await key('C');await settle();await audit(1);await key('D');await settle();await audit(2)
   const beforeSave=projectSaves;await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.editor-status').textContent.includes('셋잇단음표 입력을 완료하거나 취소한 뒤 저장해 주세요.'));assert.equal(projectSaves,beforeSave,'Pending preview must not cross the native save boundary')
   await click('악보로 이동');await key('E');await settle()
   const complete=await run(()=>({markers:document.querySelectorAll('.notation-note-input-cursor').length,preview:document.querySelectorAll('.notation-event.is-preview').length,history:document.querySelector('.editor-status').textContent}));assert.equal(complete.markers,1);assert.equal(complete.preview,0);assert(complete.history.includes('1회 수정')&&complete.history.includes('입력 중'))
   const edited=(await save('completed-tuplet')).score,notes=edited.parts[0].staves[0].measures[0].voices[0].events.filter(n=>n.type==='note');assert.deepEqual(notes.map(n=>n.pitch.step),['C','D','E']);assert.deepEqual(edited.parts[1],sourceScore.parts[1]);assert(notes[0].position.tick<notes[1].position.tick&&notes[1].position.tick<notes[2].position.tick)
   fs.writeFileSync(path.join(scene,'completed.png'),(await capturePresented()).toPNG());await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const file=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(file,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0');assert(xml.includes('<actual-notes>3</actual-notes>')&&xml.includes('<normal-notes>2</normal-notes>'));const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),file],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   const prior=pdfSaves;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfSaves,prior+1);const print=JSON.parse(fs.readFileSync(path.join(scene,'cursor-print-'+prior+'.json')));assert(print.screen===1&&print.printed===0&&print.input==='true');assert.deepEqual((await save('tuplets-after-output')).score,edited)
   if(pendingTupletPlaybackAudit){
    await click('PDF 출력 결과 닫기');await click('악보로 이동');await key('Z',['control']);await audit(2);await key('Escape');assert.deepEqual((await save('tuplet-undo')).score,sourceScore);await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('tuplet-redo')).score,edited)
    openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('tuplet-reopened')).score,edited)
    await click('악보로 이동');win.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});win.webContents.sendInputEvent({type:'char',keyCode:' '});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});await wait(()=>Boolean(document.querySelector('.notation-playhead')));await click('정지');assert.deepEqual((await save('tuplet-playback-preserved')).score,edited)
   }
   rows.push({width,height,phases,complete,pendingSaveBlocked:true,nativeCompletedExact:true,otherPartExact:true,xmlRatio:true,xmlXsd:true,print});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS pending input marker '+width)
  }
  return
 }
 if(inputClipboardCaretAudit){
  const meta=JSON.parse(fs.readFileSync(path.join(source,'expectations.json'))),originalScore=original.score,unitInput=JSON.parse(fs.readFileSync(path.join(source,'input.chromatics'))).score,bytes=fs.readFileSync(sourceFile)
  const selector=meta.family==='staffTexts'?'.notation-staff-text-target':meta.family==='systemTexts'?'.notation-system-text-target':'.notation-rehearsal-mark',attribute=meta.family==='staffTexts'?'data-staff-text-id':meta.family==='systemTexts'?'data-system-text-id':'data-rehearsal-id'
  for(const [width,height]of [[960,750],[1400,800]]){
   scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='input-caret-clipboard-'+meta.family+'-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await run(({selector,attribute,id})=>{const n=[...document.querySelectorAll('.score-canvas '+selector)].find(n=>n.getAttribute(attribute)===id);if(!n)throw Error('Actual copied text missing');n.scrollIntoView({block:'center'});n.focus()},{selector,attribute,id:meta.copiedId});await key('Enter');await click('편집');await click('선택 '+meta.label+' 복사')
   assert.deepEqual((await save('copied-no-edit')).score,originalScore)
   await run(id=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="'+id+'"]');n.scrollIntoView({block:'center'});n.focus()},meta.selectedEventId);await key('Enter');await key('N');await click('온음표, 단축키 7');await click('악보로 이동');await key('C');await settle()
   const state=await run(()=>({selection:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,measure:n.dataset.measureId})),history:document.querySelector('.editor-status').textContent,input:document.querySelector('.studio-input-context').dataset.inputActive}))
   assert(state.input==='true'&&state.history.includes('2마디')&&state.history.includes('1회 수정'));assert.deepEqual(state.selection,[{id:meta.selectedEventId,measure:meta.selectedMeasureId}]);if(manualInputViewportAudit){const snapshot=await run(()=>{const cue=document.querySelector('.notation-note-input-cursor'),b=cue?.getBoundingClientRect();return{focus:document.activeElement===document.querySelector('.score-canvas'),marker:b&&{top:b.top,bottom:b.bottom},footer:document.querySelector('.studio-status').getBoundingClientRect().top,scrollY}});fs.writeFileSync(path.join(scene,'manual-pre-save-caret.json'),JSON.stringify(snapshot,null,2));assert(snapshot.focus&&snapshot.marker.top>=0&&snapshot.marker.bottom<=snapshot.footer,'Actual entry reveals the next cue before a file-menu command')};assert.deepEqual((await save('actual-input')).score,unitInput,'Actual native note entry must match the independently generated model/MIDI control');if(manualInputViewportAudit)await click('악보로 이동')
   const auditMarker=async(phase,targetMeasure=meta.caretMeasureId)=>{
    if(canvasFocusTokenAudit){
     const focus=await run(()=>{
      const canvas=document.querySelector('.score-canvas'),style=getComputedStyle(canvas),chrome=document.querySelector('.studio-document'),probe=document.createElement('span');probe.style.color='var(--dd-focus)';chrome.append(probe);const token=getComputedStyle(probe).color;probe.remove()
      return{active:document.activeElement===canvas,visible:canvas.matches(':focus-visible'),color:style.outlineColor,style:style.outlineStyle,width:style.outlineWidth,token,expectedWidth:getComputedStyle(chrome).getPropertyValue('--dd-control-focus-width').trim()}
     });fs.writeFileSync(path.join(scene,'canvas-focus-'+phase+'.json'),JSON.stringify(focus,null,2));assert(focus.active&&focus.visible,'Native input remains on the visibly focused canvas');assert.equal(focus.color,focus.token,'Workspace canvas must use current public chrome-theme focus color');assert.equal(focus.style,'solid');assert.equal(focus.width,focus.expectedWidth)
    }
    const marker=await run(measure=>{
     const nodes=[...document.querySelectorAll('.score-canvas .notation-note-input-cursor')],n=nodes[0],r=n?.getBoundingClientRect(),line=n?.querySelector('line'),canvas=document.querySelector('.score-canvas'),probe=document.createElement('span');probe.style.color='var(--studio-paper-focus)';canvas.append(probe);const token=getComputedStyle(probe).color;probe.remove()
     const head=document.querySelector('.score-canvas .notation-event[data-measure-id="'+measure+'"] .vf-notehead'),box=head?.getBBox(),matrix=head&&head.ownerSVGElement.getCTM().inverse().multiply(head.getCTM()),point=box&&new DOMPoint(box.x,box.y).matrixTransform(matrix)
     return{count:nodes.length,measure:n?.dataset.measureId,voice:n?.dataset.voiceId,tick:n?.dataset.tick,hidden:n?.getAttribute('aria-hidden'),width:r?.width,height:r?.height,x:line&&Number(line.getAttribute('x1')),headX:point?.x,stroke:line&&getComputedStyle(line).stroke,token,pointer:n&&getComputedStyle(n).pointerEvents,rect:r&&{top:r.top,bottom:r.bottom,left:r.left,right:r.right},port:{top:Math.max(0,canvas.getBoundingClientRect().top),bottom:Math.min(innerHeight,canvas.getBoundingClientRect().bottom,document.querySelector('.studio-status').getBoundingClientRect().top)}}
    },targetMeasure)
    fs.writeFileSync(path.join(scene,'input-marker-'+phase+'.json'),JSON.stringify(marker,null,2));assert.equal(marker.count,1,'Next-input position must be visible separately from the selected note');assert.equal(marker.measure,targetMeasure);assert.equal(marker.tick,'0');assert(marker.width>0&&marker.height>0&&marker.hidden==='true');assert.equal(marker.stroke,marker.token);assert.equal(marker.pointer,'none');assert(Math.abs(marker.x+6-marker.headX)<3,'Input marker must follow the independently measured target note column')
    if(inputMarkerViewportAudit)assert(marker.rect.top>=marker.port.top-1&&marker.rect.bottom<=marker.port.bottom+1,'Actual next-input marker must be exposed in the editor viewport after entry: '+JSON.stringify(marker))
   }
   if(visibleInputPositionAudit)await auditMarker('before-paste')
   if(inputPlaybackOwnershipAudit){
    win.webContents.setAudioMuted(true)
    const readPlayback=()=>run(()=>{
     const root=document.querySelector('.score-canvas'),r=root.getBoundingClientRect(),footer=document.querySelector('.studio-status').getBoundingClientRect(),green=document.querySelector('.notation-playhead')?.getBoundingClientRect(),blue=document.querySelector('.notation-note-input-cursor'),b=blue?.getBoundingClientRect()
     return{green:green&&{top:green.top,bottom:green.bottom},blue:b&&{top:b.top,bottom:b.bottom,measure:blue.dataset.measureId,tick:blue.dataset.tick},port:{top:Math.max(0,r.top),bottom:Math.min(innerHeight,r.bottom,footer.top)},scrollY,following:document.querySelector('[aria-label="재생 위치 따라가기"]').getAttribute('aria-pressed'),beat:parseFloat(document.querySelector('.studio-playback [aria-label="재생 위치"]').textContent),input:document.querySelector('.studio-input-context').dataset.inputActive,focus:document.activeElement===root,history:document.querySelector('.editor-status').textContent}
    })
    const visible=state=>state.green&&state.green.top>=state.port.top-1&&state.green.bottom<=state.port.bottom+1
    const records={}
    const record=async name=>{const frame=await capturePresented();const state=await readPlayback();records[name]=state;fs.writeFileSync(path.join(scene,'input-playback-'+name+'.png'),frame.toPNG());fs.writeFileSync(path.join(scene,'input-playback-states.json'),JSON.stringify(records,null,2));return state}
    const space=async()=>{win.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});win.webContents.sendInputEvent({type:'char',keyCode:' '});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});await settle()}
    await click('악보로 이동');await space();await wait(()=>Boolean(document.querySelector('.notation-playhead')));const started=await record('started');assert(visible(started));assert.equal(started.input,'false');assert.equal(started.blue,undefined,'Existing playback-selection sync exits ordinary N input');assert.equal(started.following,'true')
    win.setContentSize(width===960?1400:960,height);await settle();const resized=await record('auto-resized');assert(visible(resized),'Playback follow must win over ordinary input auto-reveal');assert(resized.input==='false'&&resized.blue===undefined&&resized.focus&&resized.beat<4)
    const point=await run(()=>{const r=document.querySelector('.score-canvas').getBoundingClientRect();return{x:Math.min(innerWidth-40,r.right-40),y:Math.max(40,Math.min(innerHeight-220,r.top+300))}});win.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(point.x),y:Math.round(point.y),deltaY:400,deltaX:0,canScroll:true});await wait(()=>document.querySelector('[aria-label="재생 위치 따라가기"]').getAttribute('aria-pressed')==='false');await new Promise(resolve=>setTimeout(resolve,180));await settle();const manual=await record('manual');assert.equal(manual.following,'false')
    win.setContentSize(width,height);await settle();const held=await record('manual-resized');assert.equal(held.following,'false');assert.equal(held.blue,undefined,'Input cursor must remain absent throughout playback');assert(visible(held)&&held.beat<4,'Source note must remain in its first held playback event during ownership audit')
    await click('재생 위치 따라가기');await settle();const resumed=await record('playback-resumed');assert.equal(resumed.following,'true');assert(visible(resumed));await click('정지');await wait(()=>!document.querySelector('.notation-playhead'));assert.equal(await run(()=>document.querySelector('.studio-input-context').dataset.inputActive),'false');await record('stopped');await click('악보로 이동');await key('N');await auditMarker('playback-stopped-input-return',meta.selectedMeasureId);assert.deepEqual((await save('playback-ownership-preserved')).score,unitInput);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
    rows.push({width,height,inputPlaybackHandoff:true,explicitInputResumesAtSelection:true,realClock:true,ownedSinkMuted:true,manualSuspension:true,explicitResume:true,nativeExact:true,records});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS N/playback viewport ownership '+width);continue
   }
   if(manualInputViewportAudit){
    const readAnchor=(eventId=meta.selectedEventId)=>run(id=>{
     const root=document.querySelector('.score-canvas'),event=root.querySelector('.notation-event[data-event-id="'+id+'"]'),glyph=event.querySelector('.vf-notehead text'),style=getComputedStyle(glyph),context=document.createElement('canvas').getContext('2d');context.font=style.font;context.textBaseline='alphabetic';context.textAlign='left';const b=context.measureText(glyph.textContent),p=glyph.getStartPositionOfChar(0),m=glyph.getScreenCTM(),a=new DOMPoint(p.x-b.actualBoundingBoxLeft,p.y-b.actualBoundingBoxAscent).matrixTransform(m),z=new DOMPoint(p.x+b.actualBoundingBoxRight,p.y+b.actualBoundingBoxDescent).matrixTransform(m),c=root.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{top:a.y,bottom:z.y,scrollY,limit:Math.min(innerHeight,c.bottom,f.top),portTop:Math.max(0,c.top),focus:document.activeElement===root,marker:document.querySelector('.notation-note-input-cursor')?.getBoundingClientRect().top}
    },eventId)
    const point=await run(()=>{const r=document.querySelector('.score-canvas').getBoundingClientRect();return{x:Math.min(innerWidth-40,r.right-40),y:Math.max(40,Math.min(innerHeight-220,r.top+300))}})
    const initial=await readAnchor();win.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(point.x),y:Math.round(point.y),deltaY:400,deltaX:0,canScroll:true});await new Promise(resolve=>setTimeout(resolve,180));await settle();const manual=await readAnchor();fs.writeFileSync(path.join(scene,'manual-input-before-resize.json'),JSON.stringify({initial,manual},null,2));assert(manual.focus&&manual.scrollY!==initial.scrollY);assert(manual.top>=manual.portTop&&manual.bottom<=manual.limit,'Real wheel must expose the manually inspected source note before ownership audit')
    if(manualInputControl)await key('Escape')
    const resizeBaseline=manualInputControl?await readAnchor():manual
    win.setContentSize(width===960?1400:960,height);await settle();const resized=await readAnchor(),reflow=(resized.top+resized.scrollY)-(resizeBaseline.top+resizeBaseline.scrollY),measured={width,height,family:meta.family,sourceSha256:createHash('sha256').update(bytes).digest('hex'),resizeBaseline,resized,reflow};fs.writeFileSync(path.join(scene,'manual-input-after-resize.json'),JSON.stringify(measured,null,2));assert(resized.top>=resized.portTop&&resized.bottom<=resized.limit,'Resize must preserve manual note inspection rather than pull back to the offscreen input cursor')
    if(manualInputControl){assert.equal(resized.marker,undefined);assert.deepEqual((await save('manual-control-preserved')).score,unitInput);rows.push({width,height,manualControl:true,manual,resized,nativeExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS input-off manual control '+width);continue}
    assert(manualInputControlRoot,'Manual N audit requires an independently recorded input-off control');const control=JSON.parse(fs.readFileSync(path.join(manualInputControlRoot,String(width),'manual-input-after-resize.json')));assert.equal(control.sourceSha256,measured.sourceSha256);assert.equal(control.width,width);assert.equal(control.height,height);assert.equal(control.family,meta.family)
    const shift={ink:resized.top-resizeBaseline.top,scroll:resized.scrollY-resizeBaseline.scrollY},expectedShift={ink:control.resized.top-control.resizeBaseline.top,scroll:control.resized.scrollY-control.resizeBaseline.scrollY};fs.writeFileSync(path.join(scene,'manual-input-control-comparison.json'),JSON.stringify({shift,expectedShift,controlRoot:manualInputControlRoot},null,2));assert(Math.abs(shift.ink-expectedShift.ink)<1&&Math.abs(shift.scroll-expectedShift.scroll)<1,'N must preserve the same manual inspection movement as the input-off native control')
    fs.writeFileSync(path.join(scene,'manual-input-held.png'),(await capturePresented()).toPNG())
    await key('E');const entryTarget=unitInput.parts[0].staves[0].measures.find(n=>n.id===meta.caretMeasureId).voices[0].events[0],enteredInk=await readAnchor(entryTarget.id);assert(enteredInk.top>=enteredInk.portTop&&enteredInk.bottom<=enteredInk.limit,'Actual entry resumes exposure before the save-menu focus handoff');const entered=(await save('entered-after-manual')).score,expectedEntry=structuredClone(unitInput),target=expectedEntry.parts[0].staves[0].measures.find(n=>n.id===meta.caretMeasureId).voices[0].events[0];target.pitch={step:'E',alter:0,octave:4}
    // Aligned final-bar input uses the established ensemble append contract.
    // Only allocated UUIDs come from actual output;all content is independent.
    const allocated=new Set()
    for(const[pi,part]of expectedEntry.parts.entries())for(const[si,staff]of part.staves.entries()){
     const actualStaff=entered.parts[pi].staves[si];assert.equal(actualStaff.measures.length,staff.measures.length+1)
     const appended=actualStaff.measures.at(-1),prior=staff.measures.at(-1)
     const fresh=(id,kind)=>{assert.match(id,new RegExp('^'+kind+'-[0-9a-f-]{36}$'));assert(!JSON.stringify(unitInput).includes(id)&&!allocated.has(id));allocated.add(id);return id}
     const next={id:fresh(appended.id,'measure'),number:prior.number+1,timing:{type:'regular'},timeSignature:structuredClone(prior.timeSignature),keySignature:structuredClone(prior.keySignature),clef:structuredClone(prior.clef),voices:prior.voices.map((voice,vi)=>({id:voice.id,events:[{id:fresh(appended.voices[vi].events[0].id,'event'),position:{tick:0},duration:{value:'whole',dots:0},type:'rest',fullMeasure:true}]}))}
     if(prior.transposition!==undefined)next.transposition=structuredClone(prior.transposition)
     staff.measures.push(next)
    }
    assert.deepEqual(entered,expectedEntry)
    fs.writeFileSync(path.join(scene,'entry-resumed.json'),JSON.stringify(enteredInk,null,2));await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('resumed-entry-undo')).score,unitInput)
    await click('악보로 이동');await auditMarker('explicit-follow-resumed');win.setContentSize(width,height);await settle();await auditMarker('explicit-resize-resumed');assert.deepEqual((await save('manual-view-preserved')).score,unitInput)
   }
   if(liveInputViewportAudit){
    for(const nextWidth of [width===960?1400:960,width]){
     win.setContentSize(nextWidth,height);await settle();await auditMarker('live-resize-'+nextWidth)
    }
    await click('고정 배율');await run(()=>{const field=[...document.querySelectorAll('label')].find(n=>n.textContent==='고정 확대율')?.control;if(!field?.checkVisibility()||field.disabled)throw Error('Actual fixed zoom selector unavailable');field.click()});await settle()
    await run(()=>{const option=[...document.querySelectorAll('[role="option"]')].find(n=>n.textContent.trim()==='150%');if(!option?.checkVisibility())throw Error('Actual150% option unavailable');option.click()});await settle()
    const ownsZoom=()=>run(()=>{const field=[...document.querySelectorAll('label')].find(n=>n.textContent==='고정 확대율')?.control;return Boolean(field?.isConnected&&field===document.activeElement)})
    assert(await ownsZoom(),'Actual zoom field owns focus after option selection');win.setContentSize(width===960?1400:960,height);await settle();assert(await ownsZoom(),'Resize must not steal a newer zoom-field focus')
    await click('악보로 이동');await auditMarker('fixed-150-return')
    fs.writeFileSync(path.join(scene,'fixed-150-return.png'),(await capturePresented()).toPNG());await click('폭 맞춤');await click('악보로 이동');win.setContentSize(width,height);await settle();await auditMarker('fit-return');assert.deepEqual((await save('live-reflow-preserved')).score,unitInput)
   }
   fs.writeFileSync(path.join(scene,'before-paste.png'),(await capturePresented()).toPNG());await click('악보로 이동');await key('V',width===1400?['meta']:['control'])
   const pasted=(await save('caret-pasted')).score,newMarks=pasted[meta.family].filter(n=>!unitInput[meta.family].some(old=>old.id===n.id));assert.equal(newMarks.length,1);assert.equal(newMarks[0].measureId,meta.selectedMeasureId);assert.equal(newMarks[0].text,meta.targetText)
   const expected=structuredClone(unitInput);expected[meta.family].push(newMarks[0]);assert.deepEqual(pasted,expected,'Paste must use selected event measure, not advanced input target')
   const after=await run(()=>({selection:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,measure:n.dataset.measureId})),history:document.querySelector('.editor-status').textContent,input:document.querySelector('.studio-input-context').dataset.inputActive}));assert.deepEqual(after.selection,state.selection);assert(after.input==='true'&&after.history.includes('2마디')&&after.history.includes('2회 수정'))
   fs.writeFileSync(path.join(scene,'after-paste.png'),(await capturePresented()).toPNG())
   if(visibleInputPositionAudit){
    if(manualInputViewportAudit)await click('악보로 이동') // Return explicitly from the preceding native save menu.
    await auditMarker('after-paste');const prior=pdfSaves;await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfSaves,prior+1)
    const printed=JSON.parse(fs.readFileSync(path.join(scene,'cursor-print-'+prior+'.json')));assert.equal(printed.input,'true');assert.equal(printed.screen,1);assert.equal(printed.printed,0);fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'active-input.pdf'));await click('PDF 출력 결과 닫기');assert.deepEqual((await save('active-input-print-preserved')).score,expected)
   }
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('paste-undo')).score,unitInput);await key('Z',['control']);assert.deepEqual((await save('input-undo')).score,originalScore);await key('Z',['control','shift']);await key('Z',['control','shift']);assert.deepEqual((await save('two-redo')).score,expected)
   if(visibleInputPositionAudit){await click('악보로 이동');await key('Escape');assert.equal(await run(()=>document.querySelectorAll('.score-canvas .notation-note-input-cursor').length),0);assert.deepEqual((await save('input-marker-escaped')).score,expected)}
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('caret-native-reopened')).score,expected)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'input.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xml=path.join(scene,'filtered.musicxml'),schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xml],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('caret-output-preserved')).score,expected);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({family:meta.family,width,height,state,after,selectedNotePaste:true,advancedCaretRetained:true,exactTwoUndoRedo:true,nativeExact:true,midiExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS input caret clipboard '+meta.family+' '+width)
  }
  return
 }
 if(paperImeKind){
  const originalScore=original.score,bytes=fs.readFileSync(sourceFile),targetSelector=paperImeKind==='span'?'.notation-span-target[data-span-id="manual-control"]':'.notation-lyric[data-event-id="first-note"][data-lyric-number="1"]'
  for(const [width,height]of [[960,750],[1400,800]]){
   scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});step='paper-ime-'+paperImeKind+'-'+width;openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const selectProperty=async()=>{
    await run(()=>{const n=document.querySelector('.score-canvas .notation-staff-text-target[data-staff-text-id="second-mark"]');if(!n)throw Error('Actual staff-text target missing');n.scrollIntoView({block:'center'});n.focus()});await key('Enter')
    await wait(()=>{const n=document.querySelector('input[aria-label="선택 요약 보표 글자"]');return n?.value==='Second'&&n===document.activeElement})
   }
   const focusTarget=()=>run(selector=>{const n=document.querySelector('.score-canvas '+selector);if(!n)throw Error('Actual paper target missing '+selector);n.scrollIntoView({block:'center'});n.focus()},targetSelector)
   const traces=[]
   for(const spec of [{key:'Enter',isComposing:true},{key:' ',isComposing:true},{key:'Enter',keyCode:229},{key:'Process'}]){
    await selectProperty();await focusTarget()
    const dispatched=await run(({selector,spec})=>{const n=document.querySelector('.score-canvas '+selector),event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...spec});n.dispatchEvent(event);return{key:event.key,isComposing:event.isComposing,keyCode:event.keyCode}},{selector:targetSelector,spec});await settle()
    const after=await run(selector=>({value:document.querySelector('input[aria-label="선택 요약 보표 글자"]')?.value,span:Boolean(document.querySelector('.score-canvas .notation-span-target.is-selected')),inline:Boolean(document.querySelector('.notation-lyric-editor input')),focus:document.activeElement?.matches?.(selector),history:document.querySelector('.editor-status').textContent}),targetSelector)
    traces.push({spec,dispatched,after});fs.writeFileSync(path.join(scene,'synthetic-paper-ime.json'),JSON.stringify(traces,null,2))
    assert.equal(after.value,'Second','Composition confirmation must not activate another paper property: '+JSON.stringify(after));assert(!after.span&&!after.inline&&after.focus);assert(after.history.includes('0회 수정'));if(spec.keyCode)assert.equal(dispatched.keyCode,229)
   }
   fs.writeFileSync(path.join(scene,'ime-preserved.png'),(await capturePresented()).toPNG())
   const normal=[]
   for(const method of ['Enter','Space']){
    await selectProperty();await focusTarget();await key(method)
    const actual=await run(kind=>kind==='span'?{selected:document.querySelector('.score-canvas .notation-span-target[data-span-id="manual-control"]')?.getAttribute('aria-pressed')==='true'}:{selected:document.querySelector('.notation-lyric-editor input')===document.activeElement,value:document.querySelector('.notation-lyric-editor input')?.value},paperImeKind)
    assert(actual.selected,'Non-composing activation must remain functional');if(paperImeKind==='lyric')assert.equal(actual.value,'첫 가사');normal.push({method,...actual})
    fs.writeFileSync(path.join(scene,'activated-'+method+'.png'),(await capturePresented()).toPNG())
   }
   await selectProperty();assert.deepEqual((await save('ime-no-score-change')).score,originalScore)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('ime-native-reopened')).score,originalScore)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xml=path.join(scene,'filtered.musicxml'),schema=path.resolve('src/musicxml/schema/musicxml-4.0');assert(fs.readFileSync(xml,'utf8').includes('첫 가사'))
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xml],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('ime-after-output')).score,originalScore);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({kind:paperImeKind,width,height,syntheticOnly:true,traces,normal,nativeExact:true,midiExact:true,xmlXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS paper IME '+paperImeKind+' '+width)
  }
  return
 }
 if(rehearsalPointerAudit){
  const q=staffTextPointerAudit?{editedText:'합주 시작',family:'staffTexts',label:'보표 글자',field:'선택 요약 보표 글자',selector:'.notation-staff-text-target',idKey:'staffTextId',idAttribute:'data-staff-text-id'}:systemTextPointerAudit?{editedText:'합주 시작',family:'systemTexts',label:'시스템 텍스트',field:'선택 요약 시스템 텍스트',selector:'.notation-system-text-target',idKey:'systemTextId',idAttribute:'data-system-text-id'}:{editedText:'Edited',family:'rehearsalMarks',label:'연습표',field:'선택 요약 연습표',selector:'.notation-rehearsal-mark',idKey:'rehearsalId',idAttribute:'data-rehearsal-id'}
  for(const [width,height]of [[960,750],[1400,800]])for(const view of (staffTextPointerAudit?['score','primary-part','lower-part','other-part']:['score','primary-part','other-part'])){
   step='rehearsal-pointer-'+width+'-'+view;scene=path.join(out,String(width),view);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,view,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),original=JSON.parse(bytes).score,meta=JSON.parse(fs.readFileSync(path.join(source,view,'expectations.json')))
   if(win.webContents.debugger.isAttached()){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}
   nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await run(config=>{window.__measureTextQa=config},q);assert(!meta.family||meta.family===q.family)
   const choose=async(label,index)=>{
    await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('View field unavailable');n.focus();n.scrollIntoView({block:'center'})},label)
    await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')
   }
   if(view!=='score'){await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',view==='other-part'?1:0)}
   const activate=async(text,method='pointer')=>{
    await run(text=>{const n=[...document.querySelectorAll('.score-canvas '+window.__measureTextQa.selector)].find(n=>n.textContent===text);if(!n)throw Error('Rehearsal ink missing '+text);n.scrollIntoView({block:'center'});if(n.tabIndex===0)n.focus({preventScroll:true})},text);await settle()
    const ink=await run(text=>{const n=[...document.querySelectorAll('.score-canvas '+window.__measureTextQa.selector)].find(n=>n.textContent===text),b=(window.__measureTextQa.family!=='rehearsalMarks'?n.querySelector('rect'):n).getBoundingClientRect(),r=n.querySelector('rect').getBBox();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);window.__rehearsalPointerTrace=undefined;window.addEventListener('click',event=>{window.__rehearsalPointerTrace={text:event.target.closest?.(window.__measureTextQa.selector)?.textContent,tag:event.target.tagName,x:event.clientX,y:event.clientY}},{once:true,capture:true});return{x:b.x+b.width/2,y:b.y+b.height/2,role:n.getAttribute('role'),height:r.height,localFrame:{x:r.x,y:r.y,width:r.width,height:r.height},label:n.getAttribute('aria-label'),hitText:hit?.closest(window.__measureTextQa.selector)?.textContent,frame:(()=>{const b=n.querySelector('rect').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2,top:b.top,bottom:b.bottom,hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest(window.__measureTextQa.selector)?.textContent}})(),inkBounds:[...document.querySelectorAll('.score-canvas '+window.__measureTextQa.selector)].map(g=>{const b=g.getBoundingClientRect(),r=g.querySelector('rect').getBoundingClientRect(),t=g.querySelector('text').getBoundingClientRect();return{text:g.textContent,group:{top:b.top,bottom:b.bottom},frame:{top:r.top,bottom:r.bottom},font:{top:t.top,bottom:t.bottom},style:getComputedStyle(g.querySelector('text')).font}}),scroll:scrollY}},text)
    fs.writeFileSync(path.join(scene,`activation-${text}-${method}.json`),JSON.stringify(ink,null,2))
    if(method==='pointer')assert.equal(ink.hitText,text,'The actual point inside the visible frame must hit that mark, not the neighboring font cell')
    if(method==='pointer'){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(ink.x),y:Math.round(ink.y)});win.webContents.sendInputEvent({type:'mouseDown',x:Math.round(ink.x),y:Math.round(ink.y),button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(ink.x),y:Math.round(ink.y),button:'left',clickCount:1});await settle()}
    else await key(method)
    const actual=await run(()=>{const n=document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]');return{visible:n?.checkVisibility(),value:n?.value,focused:document.activeElement===n,trace:window.__rehearsalPointerTrace,history:document.querySelector('.editor-status').textContent,stopped:document.querySelector('.studio-playback button[aria-label="정지"]').disabled}})
    fs.writeFileSync(path.join(scene,`selected-${text}-${method}.json`),JSON.stringify(actual,null,2));assert(actual.visible&&actual.focused&&actual.value===text,'Actual rehearsal activation must focus its exact property: '+JSON.stringify(actual));if(q.family==='rehearsalMarks')assert.equal(ink.height,24);else{const actualInk=(await readUpperAnnotationInk(false)).find(n=>n.kind===(q.family==='staffTexts'?'notation-staff-text':'notation-system-text')&&n.text===text);assert(actualInk,'Actual independent system-text ink missing');assert(ink.height>0);for(const [a,b]of [[ink.localFrame.x,actualInk.left],[ink.localFrame.y,actualInk.top],[ink.localFrame.x+ink.localFrame.width,actualInk.right],[ink.localFrame.y+ink.localFrame.height,actualInk.bottom]])assert(Math.abs(a-b)<.1,'The click surface must follow real system-text ink, not its font cell')};assert.equal(ink.role,'button');assert(actual.stopped)
   }
   const priorSelection=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
   if(rehearsalDeleteAudit){await run(()=>document.querySelector('.score-canvas .notation-event.is-selected').focus());await key('Enter');await key('C',['control']);assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('1개 이벤트를 복사했습니다.'),'The note clipboard control must actually be populated')}
   if(staffRehearsalClearanceAudit)await auditCoincidentStaffText(false,original,'initial')
   await activate('Second');assert.deepEqual((await save('selection-only')).score,original)
   if(measureTextImeAudit){
    const traces=[]
    for(const spec of [{key:'Enter',code:'Enter',isComposing:true},{key:' ',code:'Space',isComposing:true},{key:'Enter',code:'Enter',keyCode:229},{key:'Process',code:'Enter'}]){
     await run(()=>{const n=[...document.querySelectorAll('.score-canvas '+window.__measureTextQa.selector)].find(n=>n.textContent==='First');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})});await settle()
     const event=await run(spec=>{const e=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...spec});document.activeElement.dispatchEvent(e);return{key:e.key,isComposing:e.isComposing,keyCode:e.keyCode}},spec);await settle()
     if(spec.keyCode)assert.equal(event.keyCode,spec.keyCode,'The synthetic229 control must actually expose229')
     const after=await run(()=>({value:document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]')?.value,active:document.activeElement?.getAttribute?.(window.__measureTextQa.idAttribute),history:document.querySelector('.editor-status').textContent}))
     traces.push({spec,event,after});fs.writeFileSync(path.join(scene,'synthetic-ime.json'),JSON.stringify(traces,null,2));assert.equal(after.value,'Second','Composition confirmation must not activate a different paper text property');assert.equal(after.active,'first-mark');assert(after.history.includes('0회 수정'))
    }
    assert.deepEqual((await save('synthetic-ime-preserved')).score,original)
   }
   const auditVisual=async(id,phase)=>{
    const state=await run(()=>{const canvas=document.querySelector('.score-canvas'),probe=document.createElement('span');probe.style.color='var(--studio-paper-focus)';canvas.append(probe);const token=getComputedStyle(probe).color;probe.remove();return{token,measures:[...canvas.querySelectorAll('.notation-measure.is-selected')].map(n=>n.dataset.measureId),marks:[...canvas.querySelectorAll(window.__measureTextQa.selector)].map(n=>({id:n.dataset[window.__measureTextQa.idKey],selected:n.classList.contains('is-selected'),pressed:n.getAttribute('aria-pressed'),stroke:getComputedStyle(n.querySelector('rect')).stroke,textFill:getComputedStyle(n.querySelector('text')).fill,width:getComputedStyle(n.querySelector('rect')).strokeWidth}))}})
    fs.writeFileSync(path.join(scene,`visual-${phase}.json`),JSON.stringify(state,null,2));assert.deepEqual(state.measures,[],'An object property target must not paint a whole-measure selection');const selected=state.marks.filter(n=>n.selected);assert.equal(selected.length,1);assert.equal(selected[0].id,id);assert.equal(selected[0].pressed,'true');if(q.family==='rehearsalMarks'){assert.equal(selected[0].stroke,state.token);assert.equal(selected[0].width,'1.5px')}else{assert.equal(selected[0].textFill,state.token);assert.equal(selected[0].stroke,'none');assert.equal(selected[0].width,'0px')};return state
   }
   if(rehearsalVisualAudit)await auditVisual('second-mark','initial')
   if(rehearsalKeyboardAudit){
    const focused=()=>run(()=>{const n=document.activeElement,r=n?.querySelector?.('rect'),b=r?.getBoundingClientRect(),s=r&&getComputedStyle(r),canvas=document.querySelector('.score-canvas'),c=canvas.getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{mark:n?.matches?.(window.__measureTextQa.selector)?n.textContent:null,event:n?.getAttribute?.('data-event-id'),id:n?.getAttribute?.(window.__measureTextQa.idAttribute),role:n?.getAttribute?.('role'),visibleFocus:n?.matches?.(':focus-visible'),frame:b?{top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height}:null,outline:s?{width:parseFloat(s.outlineWidth),style:s.outlineStyle,color:s.outlineColor}:null,viewport:{top:Math.max(0,c.top),bottom:Math.min(innerHeight,c.bottom,f.top),left:Math.max(0,c.left),right:Math.min(innerWidth,c.right)},oldDetached:window.__oldRehearsalFocus?!window.__oldRehearsalFocus.isConnected:undefined}})
    await click('악보로 이동');let state=await focused();fs.writeFileSync(path.join(scene,'score-return.json'),JSON.stringify(state,null,2));assert.equal(state.mark,'Second','Score return must focus the selected rehearsal, not a containing note')
    await key('Tab',['shift']);state=await focused();assert.equal(state.mark,'First','Natural reverse Tab must reach the adjacent rehearsal frame');await key('Enter');assert.equal(await run(()=>document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]').value),'First')
    await click('악보로 이동');await run(()=>{window.__oldRehearsalFocus=document.activeElement})
    const beforeResize=await run(()=>({viewport:innerWidth,svg:document.querySelector('.score-canvas svg').getBoundingClientRect().width}))
    const temporaryWidth=width===1400?960:width+48;win.setContentSize(temporaryWidth,height);await settle()
    const afterResize=await run(()=>({viewport:innerWidth,svg:document.querySelector('.score-canvas svg').getBoundingClientRect().width}));fs.writeFileSync(path.join(scene,'resize-trigger.json'),JSON.stringify({beforeResize,temporaryWidth,afterResize},null,2));assert.notEqual(afterResize.svg,beforeResize.svg,'The fixture must actually change notation width, not remain inside its page cap')
    await wait(()=>window.__oldRehearsalFocus&&!window.__oldRehearsalFocus.isConnected);await settle();const expanded=await focused();assert.equal(expanded.mark,'First');assert.equal(expanded.id,'first-mark');assert(expanded.oldDetached,'The test must exercise actual SVG replacement')
    await run(()=>{window.__oldRehearsalFocus=document.activeElement});win.setContentSize(width,height);await wait(()=>window.__oldRehearsalFocus&&!window.__oldRehearsalFocus.isConnected);await settle();const restored=await focused();assert.equal(restored.mark,'First');assert.equal(restored.id,'first-mark')
    assert(restored.frame.top>=restored.viewport.top-1&&restored.frame.bottom<=restored.viewport.bottom+1&&restored.frame.left>=restored.viewport.left-1&&restored.frame.right<=restored.viewport.right+1,'The actual frame and focus must stay exposed after reflow')
    assert(restored.visibleFocus&&restored.outline.width>0&&restored.outline.style==='solid','A keyboard frame needs a visible token focus ring')
    const tokenColor=await run(()=>{const host=document.querySelector('.score-canvas'),n=document.createElement('span');n.style.color='var(--studio-paper-focus)';host.append(n);const value=getComputedStyle(n).color;n.remove();return value});assert.equal(restored.outline.color,tokenColor)
    fs.writeFileSync(path.join(scene,'keyboard-focus.png'),(await capturePresented()).toPNG());fs.writeFileSync(path.join(scene,'keyboard-reflow.json'),JSON.stringify({expanded,restored,tokenColor},null,2))
    await key('Tab');assert.equal((await focused()).mark,'Second');await key('Space');assert.equal(await run(()=>document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]').value),'Second');assert.deepEqual((await save('keyboard-reflow-preserved')).score,original)
   }
   if(rehearsalDeleteAudit){
    const expectedDelete=structuredClone(original);expectedDelete[q.family]=expectedDelete[q.family].filter(mark=>mark.id!=='second-mark')
    await run(()=>document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]').focus());await key('Escape');await key('V',['control']);assert.deepEqual((await save('paste-scope-preserved')).score,original)
    await click('편집');const clipboardEnablement=await run(()=>Object.fromEntries([...document.querySelectorAll('[role="menuitem"]')].filter(n=>['선택 '+window.__measureTextQa.label+' 복사','선택 범위에 붙여넣기'].includes(n.textContent.trim())).map(n=>[n.textContent.trim(),n.disabled])));assert.deepEqual(clipboardEnablement,{['선택 '+q.label+' 복사']:false,'선택 범위에 붙여넣기':true});await key('Escape')
    fs.writeFileSync(path.join(scene,'clipboard-scope.json'),JSON.stringify({clipboardEnablement,existingNoteClipboardCannotPasteThroughAnnotation:true},null,2))
    const histories=[]
    for(const method of ['Delete','Backspace','menu','property-choice',...(measureTextEmptyAudit?['empty-enter','empty-blur']:[])]){
     await activate(method==='property-choice'?'First':'Second')
     if(method==='property-choice'){await choose(q.label+' 대상',1);await run(()=>{const n=document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]');if(n.value!=='Second')throw Error('Actual property choice not applied');n.focus()})}
     if(method.startsWith('empty-')){
      await run(()=>{const n=document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]');n.focus();n.select()});await key('Backspace');await key(method==='empty-enter'?'Enter':'Tab')
     }else{
      await key('Escape')
      if(method==='menu'){await click('편집');await click('선택 '+q.label+' 지우기')}else await key(method==='property-choice'?'Delete':method)
     }
     assert.deepEqual((await save('delete-'+method)).score,expectedDelete,'Delete must consume only the chosen annotation, not its measure')
     assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)),priorSelection,'Deleting the property target restores its original visible event')
     await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('delete-undo-'+method)).score,original)
     assert.equal(await run(()=>document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]').value),'Second','Undo restores the exact object property target')
     await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('delete-redo-'+method)).score,expectedDelete)
     await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('delete-restored-'+method)).score,original)
     histories.push({method,deleteOnlySecond:true,originalEventRestored:true,exactUndoRedo:true,undoRestoresPropertyTarget:true})
    }
    fs.writeFileSync(path.join(scene,'delete-scope.json'),JSON.stringify(histories,null,2))
   }
   if(singleTextClipboardAudit){
    step='single-text-clipboard-'+width+'-'+view
    await activate('Second')
    const nativeKeyboardCopy=keyboardObjectCopyAudit&&width===1400
    if(nativeKeyboardCopy){
     await click('악보로 이동');await run(()=>{window.__objectCopyKey=undefined;window.addEventListener('keydown',event=>{window.__objectCopyKey={key:event.key,meta:event.metaKey,ctrl:event.ctrlKey}},{once:true,capture:true})});await key('C',['meta'])
     const trace=await run(()=>window.__objectCopyKey);assert(trace.meta&&!trace.ctrl&&trace.key.toLowerCase()==='c');fs.writeFileSync(path.join(scene,'object-copy-key.json'),JSON.stringify(trace,null,2))
    }else{await click('편집');await click('선택 '+q.label+' 복사')}
    assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('1개를 복사했습니다.'),'Actual native copy must execute the single-object command')
    let spanGuard=false
    if(nativeKeyboardCopy&&view!=='other-part'){
     await run(()=>{const n=document.querySelector('.score-canvas .notation-span-target[data-span-id="manual-control"]');if(!n)throw Error('Visible manual span control missing');n.scrollIntoView({block:'center'});n.focus()});await key('Enter')
     assert.equal(await run(()=>document.querySelector('.score-canvas .notation-span-target[data-span-id="manual-control"]').getAttribute('aria-pressed')),'true')
     await key('C',['meta']);await key('V',['meta']);assert.deepEqual((await save('span-clipboard-guard')).score,original);assert((await run(()=>document.querySelector('.editor-status').textContent)).includes('0회 수정'));spanGuard=true
    }

    assert.deepEqual((await save('copied-object-only')).score,original,'Copy cannot change the score or its original IDs')
    const targetMeasure=meta.targetMeasure.replace('primary-first','neighbor')
    await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-event')].find(n=>n.dataset.measureId===id);if(!n)throw Error('Actual destination note missing '+id);n.scrollIntoView({block:'center'});n.focus()},targetMeasure);await key('Enter')
    const selectedTarget=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,measure:n.dataset.measureId})));assert.equal(selectedTarget.length,1);assert.equal(selectedTarget[0].measure,targetMeasure)
    const supported=q.family==='staffTexts'||view!=='other-part'
    await click('편집');const pasteName='복사한 '+q.label+' 추가',disabled=await run(label=>[...document.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent.trim()===label)?.disabled,pasteName);assert.equal(disabled,!supported);await key('Escape');await key('V',nativeKeyboardCopy?['meta']:['control'])
    const actual=await save('single-object-pasted')
    if(supported){
     const sourceIds=new Set(original[q.family].map(n=>n.id)),added=actual.score[q.family].filter(n=>!sourceIds.has(n.id));assert.equal(added.length,1);assert.equal(added[0].text,'Second');assert.equal(added[0].measureId,targetMeasure)
     const expectedAppend=structuredClone(original);expectedAppend[q.family].push(added[0]);assert.deepEqual(actual.score,expectedAppend,'Single copy must append without replacing target texts, music or manual geometry')
     assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,measure:n.dataset.measureId}))),selectedTarget)
     await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,view,'source.mid')))
     await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));fs.copyFileSync(path.join(scene,'filtered.musicxml'),path.join(scene,'single-object.musicxml'))
     const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'single-object.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});assert.equal(validation.status,0,validation.stderr)
     if(staffRehearsalClearanceAudit)activeStaffTextScore=expectedAppend
     await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(rehearsalPointerPdfMarks.filter(n=>n.text==='Second').length,2);fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,'single-object.pdf'));fs.writeFileSync(path.join(scene,'single-object.png'),(await capturePresented()).toPNG());await click('PDF 출력 결과 닫기')
     await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('single-object-undo')).score,original)
     await key('Z',['control','shift']);assert.deepEqual((await save('single-object-redo')).score,expectedAppend)
     openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('single-object-reopened')).score,expectedAppend)
     // Reopening resets history; restore the original through its real file path.
     openCurrent=false;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.chromatics을 열었습니다.'));assert.deepEqual((await save('single-object-original-restored')).score,original)
     if(view!=='score'){await click('형식');await click('악보 설정');await choose('악보 보기',1);await choose('파트보 선택',view==='other-part'?1:0)}
    }else assert.deepEqual(actual.score,original,'Off-primary global paste guard must preserve all original data')
    fs.writeFileSync(path.join(scene,'single-object-contract.json'),JSON.stringify({family:q.family,view,targetMeasure,supported,copyMethod:nativeKeyboardCopy?'native-meta-C':'edit-menu',pasteMethod:nativeKeyboardCopy?'native-meta-V':'native-control-V',spanGuard,copyNoMutation:true,targetNeighborsPreserved:true,newId:supported,exactUndoRedo:supported,nativeReopen:supported},null,2))
    step='rehearsal-pointer-'+width+'-'+view
   }
   await activate('First','Space');assert.deepEqual((await save('keyboard-only')).score,original)
   await activate('Second','Enter')
   const conditions=await prepareTextChoiceConditions(width,q.field,q.label+' 대상')
   await activate('Second');await scaleTextChoiceChrome();await settle()
   await run(()=>{const n=document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]');n.focus();n.select()});await win.webContents.insertText(q.editedText);await key('Enter')
   const expected=structuredClone(original);expected[q.family][1].text=q.editedText
   const status=await run(()=>document.querySelector('.editor-status').textContent);assert(status.includes('1회 수정'),'Enter plus blur must produce one command');assert.deepEqual((await save('edited')).score,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,original)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,expected)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,expected)
   await activate(q.editedText);await scaleTextChoiceChrome();await settle()
   const field=await run(()=>{const n=document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]'),b=n.getBoundingClientRect(),l=n.labels[0].getBoundingClientRect(),d=n.closest('aside').getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{value:n.value,left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,label:{text:n.labels[0].textContent,top:l.top,bottom:l.bottom,left:l.left,right:l.right},dock:{top:d.top,bottom:d.bottom},footer:f.top,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}})
   assert.equal(field.value,q.editedText);assert(field.height>=(width===1400?47.9:31.9)&&field.left>=0&&field.right<=field.width+1&&field.top>=0&&field.bottom<=field.footer+1&&!field.overflow)
   fs.writeFileSync(path.join(scene,'field-visibility.json'),JSON.stringify(field,null,2))
   fs.writeFileSync(path.join(scene,'selected.png'),(await capturePresented()).toPNG())
   if(rehearsalVisualAudit){
    await auditVisual('second-mark','enlarged');await click('악보로 이동');await key('Tab',['shift']);await key('Tab');await settle()
    const keyboard=await run(()=>{const n=document.activeElement,r=n?.querySelector?.('rect'),b=r?.getBoundingClientRect(),c=document.querySelector('.score-canvas').getBoundingClientRect(),f=document.querySelector('.studio-status').getBoundingClientRect();return{id:n?.getAttribute?.(window.__measureTextQa.idAttribute),focus:n?.matches?.(':focus-visible'),outline:r?getComputedStyle(r).outlineColor:null,ring:r?parseFloat(getComputedStyle(r).outlineWidth):0,coarse:matchMedia('(pointer:coarse)').matches,inputFont:parseFloat(getComputedStyle(document.querySelector('input[aria-label="'+window.__measureTextQa.field+'"]')).fontSize),top:b?.top,bottom:b?.bottom,portTop:Math.max(0,c.top),portBottom:Math.min(innerHeight,c.bottom,f.top)}})
    assert.equal(keyboard.id,'second-mark');assert(keyboard.focus&&keyboard.ring>0&&keyboard.top>=keyboard.portTop-1&&keyboard.bottom<=keyboard.portBottom+1);assert.equal(keyboard.coarse,width===1400);assert.equal(keyboard.inputFont,32);const visual=await auditVisual('second-mark','keyboard-enlarged');assert.equal(keyboard.outline,visual.token)
    fs.writeFileSync(path.join(scene,'expanded-keyboard.json'),JSON.stringify(keyboard,null,2));fs.writeFileSync(path.join(scene,'expanded-keyboard.png'),(await capturePresented()).toPNG())
   }
   if(rehearsalLabelAudit)assert(field.label.top>=Math.max(0,field.dock.top)-1&&field.label.bottom<=Math.min(field.footer,field.dock.bottom)+1,'The focused field name must be visible inside its actual dock scrollport: '+JSON.stringify(field))
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,view,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   const xmlFile=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(xmlFile,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0');for(const text of ['First',q.editedText,'Neighbor'])assert(xml.includes(text))
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   if(staffRehearsalClearanceAudit)activeStaffTextScore=expected
   rehearsalPointerPdfMarks=undefined;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   const pdfMarks=rehearsalPointerPdfMarks
   assert.deepEqual(pdfMarks.map(n=>n.text),['First',q.editedText,'Neighbor']);assert(pdfMarks.every(n=>n.role===null&&n.tabindex===null),'Printed ink has no editing controls')
   if(systemTextPointerAudit||staffTextPointerAudit){
    const extracted=spawnSync('pdftotext',['-bbox-layout',path.join(scene,'filtered.pdf'),'-'],{encoding:'utf8'})
    assert.equal(extracted.status,0,extracted.stderr||'Poppler pdftotext must complete normally')
    const words=await run(xml=>{
     const doc=new DOMParser().parseFromString(xml,'application/xml')
     if(doc.querySelector('parsererror'))throw Error('Invalid Poppler word-box XML')
     return [...doc.getElementsByTagName('word')].map(n=>({text:n.textContent,xMin:Number(n.getAttribute('xMin')),xMax:Number(n.getAttribute('xMax')),yMin:Number(n.getAttribute('yMin')),yMax:Number(n.getAttribute('yMax'))}))
    },extracted.stdout)
    const phraseWords=q.editedText.split(' ');assert.equal(phraseWords.length,2,'This fixture covers one internal U+0020')
    const boxes=phraseWords.map(text=>{const matches=words.filter(n=>n.text===text);assert.equal(matches.length,1,'Each Korean word must survive actual PDF text extraction: '+text);return matches[0]})
    const gapPt=boxes[1].xMin-boxes[0].xMax
    assert(boxes.flatMap(n=>[n.xMin,n.xMax,n.yMin,n.yMax]).every(Number.isFinite))
    assert(Math.abs(boxes[0].yMin-boxes[1].yMin)<.1&&Math.abs(boxes[0].yMax-boxes[1].yMax)<.1,'The phrase must remain on the same PDF line')
    assert(gapPt>0,'Actual PDF words must retain a positive intervening gap')
    fs.writeFileSync(path.join(scene,'pdf-word-spacing.json'),JSON.stringify({phrase:q.editedText,codePoints:[...q.editedText].map(c=>c.codePointAt(0)),boxes,gapPt},null,2))
   }
   assert.deepEqual((await save('after-output')).score,expected);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,view,conditions,field,pdfMarks,pointerAndEnterAndSpace:true,selectionOnlyNoCommand:true,oneEditExactUndoRedo:true,nativeReopenExact:true,originalAnchorsNeighborsManualGeometryPreserved:true,midiExact:true,xmlXsd:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS rehearsal-pointer '+width+' '+view)
  }
  return
 }
 if(mixerPartIdentity){
  const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score,records=[]
  const openMixer=async()=>{await click('도구');await click('재생 도구');await wait(()=>document.querySelector('#studio-part-mixer').checkVisibility())}
  const read=()=>run(()=>{
   const root=document.querySelector('#studio-part-mixer'),control=(label,type)=>type==='volume'?[...root.querySelectorAll('input[type="range"]')].find(n=>n.labels?.[0]?.textContent.trim().startsWith(label+' 볼륨')):root.querySelector(`input[aria-label="${label} ${type}"]`)
   const box=n=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}}
   const part=label=>{const mute=control(label,'음소거'),solo=control(label,'솔로'),volume=control(label,'volume');if(!mute?.checkVisibility()||!solo?.checkVisibility()||!volume?.checkVisibility())throw Error('Actual labeled mixer controls missing '+label);return{muted:mute.checked,solo:solo.checked,volume:Number(volume.value),muteTarget:box(mute.closest('label')),soloTarget:box(solo.closest('label')),rangeTarget:box(volume)}}
   const glyph=document.querySelector('.score-canvas .vf-notehead text'),g=glyph.getBBox()
   return{first:part('1 · Piano'),second:part('2 · Piano'),selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,part:n.dataset.partId,staff:n.dataset.staffId,measure:n.dataset.measureId,voice:n.dataset.voiceId})),labels:[...root.querySelectorAll('.studio-part-mixer__row > strong')].map(n=>n.textContent),coarse:matchMedia('(pointer:coarse)').matches,font:parseFloat(getComputedStyle(root.querySelector('label')).fontSize),rowFont:parseFloat(getComputedStyle(root.querySelector('.studio-part-mixer__row > strong')).fontSize),glyph:{width:g.width,height:g.height,font:getComputedStyle(glyph).font},storage:JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')||'{}'),stopped:document.querySelector('.studio-playback button[aria-label="정지"]').disabled,history:document.querySelector('.editor-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,width:innerWidth,height:innerHeight,footer:document.querySelector('.studio-status').getBoundingClientRect().top}
  })
  const focus=async(label,type)=>{await run(({label,type})=>{const root=document.querySelector('#studio-part-mixer'),n=type==='volume'?[...root.querySelectorAll('input[type="range"]')].find(n=>n.labels?.[0]?.textContent.trim().startsWith(label+' 볼륨')):root.querySelector(`input[aria-label="${label} ${type}"]`);if(!n?.checkVisibility()||n.disabled)throw Error('Actual mixer input unavailable');n.focus();n.scrollIntoView({block:'center'})},{label,type});await settle()}
  for(const [width,height]of [[960,750],[1400,800]]){
   step='mixer-part-identity-'+width;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await openMixer()
   if(width===1400){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await settle()}
   const baseline=await read();await scaleTextChoiceChrome();await settle();const before=await read();assert.equal(before.coarse,width===1400);assert.deepEqual(before.labels,['1 · Piano','2 · Piano']);assert(Math.abs(before.font-baseline.font*2)<.1);fs.writeFileSync(path.join(scene,'text-scale.json'),JSON.stringify({labelBefore:baseline.font,labelAfter:before.font,rowBefore:baseline.rowFont,rowAfter:before.rowFont},null,2));assert(Math.abs(before.rowFont-baseline.rowFont*2)<.1,'Mixer row text must also be doubled by the owned-window text emulation');assert.deepEqual(before.glyph,baseline.glyph)
   await focus('2 · Piano','음소거');await key('Space');await focus('2 · Piano','솔로');await key('Space');await focus('2 · Piano','volume')
   const goal=width===960?65:70,delta=(goal-before.second.volume)/5;assert(Number.isInteger(delta));for(let i=0;i<Math.abs(delta);i++)await key(delta<0?'Left':'Right');await scaleTextChoiceChrome();await settle()
   const after=await read();assert.equal(after.second.muted,!before.second.muted);assert.equal(after.second.solo,!before.second.solo);assert.equal(after.second.volume,goal);assert(after.stopped&&after.history.includes('0회 수정')&&!after.overflow);assert.deepEqual(after.glyph,baseline.glyph)
   assert.equal(after.first.muted,before.first.muted);assert.equal(after.first.solo,before.first.solo);assert.equal(after.first.volume,before.first.volume)
   assert.deepEqual(after.selected,before.selected,'Local mixer controls must preserve score selection')
   assert.deepEqual(after.storage['second-part'],{muted:!before.second.muted,solo:!before.second.solo,volume:goal/100})
   for(const target of [after.second.muteTarget,after.second.soloTarget,after.second.rangeTarget]){assert(target.height>=(after.coarse?47.9:31.9));assert(target.width>=48);assert(target.left>=0&&target.right<=width+1)}
   assert(after.second.rangeTarget.top>=0&&after.second.rangeTarget.bottom<=after.footer+1,'Focused volume input must be exposed above footer')
   fs.writeFileSync(path.join(scene,'mixer.png'),(await capturePresented()).toPNG());assert.deepEqual((await save('mixer-preserved')).score,sourceScore)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));await openMixer();await scaleTextChoiceChrome();await settle();const restored=await read()
   for(const key of ['muted','solo','volume'])assert.equal(restored.second[key],after.second[key]);assert.deepEqual((await save('reopened')).score,sourceScore)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xmlFile=path.join(scene,'filtered.musicxml'),schema=path.resolve('src/musicxml/schema/musicxml-4.0'),xml=fs.readFileSync(xmlFile,'utf8');assert.equal((xml.match(/<part-name>Piano<\/part-name>/g)||[]).length,2)
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   records.push({width,height,baseline,before,after,restored,keyboardControls:true,nativeScoreExact:true,midiExact:true,xmlXsd:true,zeroHistory:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));console.log('PASS mixer part identity '+width)
  }
  return
 }
 if(livePartLabelsAudit){
  const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score,renamed=JSON.parse(fs.readFileSync(path.join(source,'renamed.chromatics'))).score,records=[]
  const openView=async()=>{await click('형식');await click('악보 설정')}
  const choose=async(label,last)=>{await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual live-name selector unavailable '+label);n.focus();n.scrollIntoView({block:'center'})},label);await settle();await key('Space');await key(last?'End':'Home');await key('Enter');await settle()}
  const labels=()=>run(()=>{const control=label=>[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;return{input:control('입력 보표')?.textContent,view:control('파트보 선택')?.textContent,scope:document.querySelector('[aria-label="작업과 선택 상태"]').textContent,history:document.querySelector('.editor-status').textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,part:n.dataset.partId,staff:n.dataset.staffId})),overflow:document.documentElement.scrollWidth>innerWidth+1}})
  for(const [width,height]of [[960,750],[1400,800]]){
   step='live-part-labels-'+width;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await openView();await choose('악보 보기',true);await choose('파트보 선택',true)
   const before=await labels();assert(before.input.includes('2 · Piano')&&before.view.includes('2 · Piano'));assert.deepEqual(before.selected,[{id:'second-rest',part:'second-part',staff:'second-staff'}])
   await run(()=>{const n=document.querySelector('input[aria-label="현재 파트 이름"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual part-name editor unavailable');n.focus();n.scrollIntoView({block:'center'});n.select()});await settle();await win.webContents.insertText('Solo');await key('Enter');await settle()
   const afterName=await labels();assert(afterName.input.includes('Solo')&&afterName.view.includes('Solo')&&afterName.scope.includes('Solo · 보표 1 · 성부 1')&&afterName.history.includes('1회 수정')&&!afterName.overflow);assert.deepEqual(afterName.selected,before.selected)
   fs.writeFileSync(path.join(scene,'renamed.png'),(await capturePresented()).toPNG());assert.deepEqual((await save('renamed')).score,renamed)
   await click('악보로 이동');await key('N');await key('E');await settle();await auditEnteredNoteVisibility(2)
   const edited=(await save('edited')).score,notes=edited.parts[1].staves[0].measures[0].voices[0].events.filter(event=>event.type==='note')
   assert.equal(notes.length,1);assert.equal(notes[0].pitch.step,'E');assert.equal(notes[0].pitch.octave,4);assert.equal(notes[0].position.tick,0);assert.deepEqual(edited.parts[0],sourceScore.parts[0]);assert.deepEqual(edited.slurs,sourceScore.slurs);assert.deepEqual(edited.rehearsalMarks,sourceScore.rehearsalMarks)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('input-undo')).score,renamed)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('rename-undo')).score,sourceScore);await openView();const restored=await labels();assert(restored.input.includes('2 · Piano')&&restored.view.includes('2 · Piano'))
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('rename-redo')).score,renamed)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('input-redo')).score,edited)
   await openView();await choose('악보 보기',false);await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'edited.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xmlFile=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(xmlFile,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0')
   assert(xml.includes('<part-name>Piano</part-name>')&&xml.includes('<part-name>Solo</part-name>')&&!xml.includes('<part-name>1 ·')&&!xml.includes('<part-name>2 ·'))
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   records.push({width,height,before,afterName,restored,renameCommandOnce:true,inputCommandOnce:true,exactUndoRedo:true,nativeReopen:true,manualGeometryExact:true,midiExact:true,xmlXsd:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));console.log('PASS live part labels '+width)
  }
  return
 }
 if(inputPartIdentity){
  const records=[]
  for(const [width,height]of [[960,750],[1400,800]])for(const kind of ['same','staff-collision']){
   step='input-part-identity-'+width+'-'+kind;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,kind,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score,labels=JSON.parse(fs.readFileSync(path.join(source,kind,'labels.json')))
   nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const focus=async()=>{await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='입력 보표')?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual input target unavailable');n.focus();n.scrollIntoView({block:'center'})});await settle()}
   await focus();await key('Space');const options=await run(()=>[...document.querySelectorAll('[role="option"]')].filter(n=>n.checkVisibility()).map(n=>n.textContent));assert.deepEqual(options,labels);assert.equal(new Set(options).size,options.length)
   await key('End');await key('Escape');assert.deepEqual((await save('target-cancelled')).score,sourceScore)
   await focus();await key('Space');await key('End');await key('Enter');await settle()
   const selected=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,part:n.dataset.partId,staff:n.dataset.staffId})))
   assert.deepEqual(selected,[{id:'second-rest',part:'second-part',staff:'second-staff'}]);assert.deepEqual((await save('target-switched')).score,sourceScore)
   await focus();const control=await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='입력 보표').control,b=n.getBoundingClientRect();return{label:n.textContent,active:document.activeElement===n,left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:innerWidth,height:innerHeight,history:document.querySelector('.editor-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth+1}})
   assert(control.label.includes(labels.at(-1))&&control.active&&control.history.includes('0회 수정')&&!control.overflow);assert(control.left>=0&&control.right<=control.width+1&&control.top>=0&&control.bottom<=control.height+1)
   const scope=await run(()=>document.querySelector('[aria-label="작업과 선택 상태"]').textContent),scopePart=kind==='same'?'2 · Piano':'Piano 보표 1';assert(scope.includes(scopePart+' · 보표 1 · 성부 1'));fs.writeFileSync(path.join(scene,'footer-identity.json'),JSON.stringify({scope},null,2))
   fs.writeFileSync(path.join(scene,'target-selected.png'),(await capturePresented()).toPNG())
   await click('악보로 이동');await key('N');await key('E');await settle()
   if(inputVisibilityAudit)await auditEnteredNoteVisibility()
   if(visibleInputPositionAudit){
    const target=sourceScore.parts[1].staves[0],marker=await run(targetIndex=>{
     const nodes=[...document.querySelectorAll('.score-canvas .notation-note-input-cursor')],n=nodes[0],line=n?.querySelector('line'),staves=[...document.querySelectorAll('.score-canvas .vf-stave')],staff=staves[targetIndex]
     const paths=[...staff.querySelectorAll('path')].map(n=>{const b=n.getBBox(),m=n.ownerSVGElement.getCTM().inverse().multiply(n.getCTM()),a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);return{x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y}}).filter(b=>b.width>100&&b.height>=0&&b.height<=41)
     return{count:nodes.length,part:n?.dataset.partId,staff:n?.dataset.staffId,measure:n?.dataset.measureId,voice:n?.dataset.voiceId,tick:n?.dataset.tick,y1:line&&Number(line.getAttribute('y1')),y2:line&&Number(line.getAttribute('y2')),staves:staves.length,staffTop:Math.min(...paths.map(p=>p.y)),staffBottom:Math.max(...paths.map(p=>p.y+p.height)),paths}
    },sourceScore.parts[0].staves.length)
    fs.writeFileSync(path.join(scene,'passive-input-marker.json'),JSON.stringify(marker,null,2));fs.writeFileSync(path.join(scene,'passive-input-marker.png'),(await capturePresented()).toPNG());assert.equal(marker.count,1);assert.equal(marker.part,'second-part');assert.equal(marker.staff,target.id);assert.equal(marker.measure,target.measures[0].id);assert.equal(marker.voice,target.measures[0].voices[0].id);assert.equal(marker.tick,'13440');assert.equal(marker.staves,sourceScore.parts.reduce((n,p)=>n+p.staves.length,0));assert(Math.abs(marker.staffBottom-marker.staffTop-40)<.1);assert(Math.abs(marker.y2-marker.y1-50)<.02);assert(Math.abs((marker.y1+marker.y2)/2+.5-(marker.staffTop+marker.staffBottom)/2)<.02,'Marker must follow the actual lower staff; VexFlow hints its 1px horizontal paths by half a pixel')
   }

   const edited=(await save('edited')).score,events=edited.parts[1].staves[0].measures[0].voices[0].events,notes=events.filter(event=>event.type==='note')
   assert.equal(notes.length,1);assert.equal(notes[0].pitch.step,'E');assert.equal(notes[0].pitch.octave,4);assert.equal(notes[0].position.tick,0);assert.deepEqual(edited.parts[0],sourceScore.parts[0]);assert.deepEqual(edited.parts.map(part=>part.name),sourceScore.parts.map(part=>part.name))
   assert(await run(()=>document.querySelector('.editor-status').textContent.includes('1회 수정')))
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,sourceScore)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'edited.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xmlFile=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(xmlFile,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0')
   for(const part of sourceScore.parts)assert(xml.includes('<part-name>'+part.name+'</part-name>'));assert(!xml.includes('<part-name>1 ·')&&!xml.includes('<part-name>2 ·'))
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   records.push({width,height,kind,labels,control,selected,targetPitch:64,otherPartExact:true,exactUndoRedo:true,nativeReopen:true,midiExact:true,xmlXsd:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));console.log('PASS input part identity '+width+' '+kind)
  }
  return
 }
 if(partViewIdentity){
  const bytes=fs.readFileSync(sourceFile),sourceScore=JSON.parse(bytes).score,records=[]
  const openView=async()=>{await click('형식');await click('악보 설정')}
  const select=async(label,text)=>{
   await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual part-view select unavailable '+label);n.focus();n.scrollIntoView({block:'center'})},label);await settle();await key('Space')
   const options=await run(()=>[...document.querySelectorAll('[role="option"]')].filter(n=>n.checkVisibility()).map(n=>n.textContent))
   assert.equal(new Set(options).size,options.length,'Visible options must have distinct identities')
   await run(text=>{const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.checkVisibility()&&n.textContent===text);if(!n)throw Error('Missing visible part option '+text);n.click()},text);await settle()
  }
  const notes=()=>run(()=>[...document.querySelectorAll('.score-canvas .notation-event')].map(n=>n.dataset.eventId))
  const selectFocus=async()=>{await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='파트보 선택').control;n.focus();n.scrollIntoView({block:'center'})});await settle()}
  for(const [width,height]of [[960,750],[1400,800]]){
   step='part-view-identity-'+width;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await openView()
   await select('악보 보기','파트보');await select('파트보 선택','2 · Piano');assert.deepEqual(await notes(),['second-part-note'])
   await selectFocus();await key('Space');await key('Home');await key('Escape');assert.deepEqual(await notes(),['second-part-note'])
   assert(await run(()=>document.querySelector('.studio-playback button[aria-label="정지"]').disabled),'View navigation must not start playback')
   const state=await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='파트보 선택').control,b=n.getBoundingClientRect();return{label:n.textContent,active:document.activeElement===n,left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:innerWidth,height:innerHeight,history:document.querySelector('.editor-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth+1}})
   assert(state.label.includes('2 · Piano')&&state.active&&state.history.includes('0회 수정')&&!state.overflow);assert(state.left>=0&&state.right<=state.width+1&&state.top>=0&&state.bottom<=state.height+1)
   const scope=await run(()=>document.querySelector('[aria-label="작업과 선택 상태"]').textContent);assert(state.history.includes('파트보: 2 · Piano'));assert(scope.includes('2 · Piano · 보표 1 · 성부 1'));fs.writeFileSync(path.join(scene,'footer-identity.json'),JSON.stringify({scope,view:state.history},null,2))
   fs.writeFileSync(path.join(scene,'part-second.png'),(await capturePresented()).toPNG());assert.deepEqual((await save('second-part-view')).score,sourceScore)
   await openView();await selectFocus();await key('Space');await key('Home');await key('Enter');assert.deepEqual(await notes(),['first-part-note']);assert.deepEqual((await save('first-part-view')).score,sourceScore)
   await openView();await select('악보 보기','총보');assert.deepEqual((await notes()).sort(),['first-part-note','second-part-note']);assert.deepEqual((await save('full-view')).score,sourceScore)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xmlFile=path.join(scene,'filtered.musicxml'),xml=fs.readFileSync(xmlFile,'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0')
   assert.equal((xml.match(/<part-name>Piano<\/part-name>/g)||[]).length,2);assert(!xml.includes('1 · Piano')&&!xml.includes('2 · Piano'))
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),xmlFile],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,sourceScore);assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   records.push({width,height,state,nativeScoreExact:true,zeroHistory:true,keyboardCancelAndCommit:true,xmlXsd:true,midiExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));console.log('PASS duplicate part view '+width)
  }
  return
 }
 if(tempoLabelAudit){
  for(const [width,height]of [[960,750],[1400,800]])for(const kind of ['global-custom','position-automatic','position-hidden']){
   step=`tempo-label-${width}-${kind}`;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,kind,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),expected=JSON.parse(bytes).score,edited=JSON.parse(fs.readFileSync(path.join(source,kind,'edited.chromatics'))).score,meta=JSON.parse(fs.readFileSync(path.join(source,kind,'expectations.json')));activeTempoLabelMeta=meta
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.score-canvas .notation-event[data-event-id="tempo-label-note"]')))
   await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="tempo-label-note"]');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})});await key('Enter');await click('형식');await click('악보 설정')
   await run(scope=>{const n=document.querySelector(scope==='global'?'.studio-tempo-tools input[type="range"]':'input[aria-label="위치별 빠르기 BPM"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual BPM control unavailable');n.scrollIntoView({block:'center'});n.focus();if(scope!=='global')n.select()},meta.scope)
   if(meta.scope==='global')await key('Right');else{await win.webContents.insertText('81');await key('Enter')}
   assert(await run(()=>document.querySelector('.editor-status').textContent.includes('1회 수정')));assert.deepEqual((await save('edited')).score,edited)
   const label=await run(meta=>{const n=document.querySelector(meta.scope==='global'?'.score-canvas .notation-tempo-marking:not(.notation-tempo-marking--positioned)':'.score-canvas .notation-tempo-marking--positioned');return{text:n.textContent,hidden:n.classList.contains('notation-tempo-marking--transparent')}},meta);assert.equal(label.text,meta.text);assert.equal(label.hidden,meta.hidden)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,expected)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'edited.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   fs.writeFileSync(path.join(scene,'reopened.png'),(await capturePresented()).toPNG());rows.push({width,height,kind,actualBpmCommand:true,oneUndoRedo:true,nativeExact:true,labelOwnership:true,hiddenStatePreserved:true,xmlXsd:true,midiExpected:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS tempo label ownership '+width+' '+kind)
  }
  return
 }
 if(tempoWarningAudit){
  for(const [width,height]of [[960,750],[1400,800]])for(const kind of ['sound','offset-default','override']){
   step=`tempo-warning-${width}-${kind}`;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,kind,'source.chromatics');xmlOpenFile=path.join(source,kind,'source.musicxml');openCurrent=false
   const expected=JSON.parse(fs.readFileSync(sourceFile)).score,warning=JSON.parse(fs.readFileSync(path.join(source,kind,'warnings.json'))).warnings[0],bytes=fs.readFileSync(xmlOpenFile)
   if(win.webContents.debugger.isAttached()){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}
   nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await file();await click('MusicXML 가져오기')
   await wait(()=>Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]')))
   if(width===1400){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});await settle()}
   const baseline=await run(()=>{const root=document.querySelector('[aria-label="MusicXML 경고 상세"]'),button=root.querySelector('.studio-warning-technical button');return{height:button.getBoundingClientRect().height,font:parseFloat(getComputedStyle(button).fontSize),coarse:matchMedia('(pointer:coarse)').matches,theme:root.dataset.theme}})
   assert.equal(baseline.coarse,width===1400);assert.equal(baseline.theme,width===960?'dark':'light');assert(baseline.height>=(width===1400?47.9:31.9))
   if(width===960){await scaleTextChoiceChrome();await settle()}
   const collapsed=await run(kind=>{const root=document.querySelector('[aria-label="MusicXML 경고 상세"]'),human=root.querySelector('.studio-warning-report__list > li > :first-child'),technical=root.querySelector('.studio-warning-technical__content');human.scrollIntoView({block:'center'});return{text:human.textContent,technicalVisible:technical?.checkVisibility()??false,overflow:document.documentElement.scrollWidth>innerWidth+1,history:document.querySelector('.editor-status').textContent,dirty:document.querySelector('.studio-document__state').textContent}},kind)
   assert(collapsed.text.includes(kind==='sound'?'별도로 지정된 재생 빠르기':'다른 재생 위치'));assert(collapsed.text.includes('1번째 파트 · 1마디')&&!collapsed.technicalVisible&&!collapsed.overflow);assert(collapsed.history.includes('0회 수정')&&collapsed.dirty==='변경 없음')
   fs.writeFileSync(path.join(scene,'collapsed.png'),(await capturePresented()).toPNG())
   await run(()=>{const n=document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button');n.focus();n.scrollIntoView({block:'center'})});await key('Enter')
   if(width===960){await scaleTextChoiceChrome();await settle()}
   const expanded=await run(()=>{const panel=document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content'),code=panel.querySelector('code');code.scrollIntoView({block:'center'});return{visible:panel.checkVisibility(),text:panel.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,stop:document.querySelector('.studio-playback button[aria-label="정지"]').disabled}})
   assert(expanded.visible&&expanded.text.includes(warning.message)&&expanded.text.includes(warning.path)&&!expanded.overflow&&expanded.stop)
   fs.writeFileSync(path.join(scene,'expanded.png'),(await capturePresented()).toPNG());await key('Space');assert(await run(()=>!document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content').checkVisibility()));assert(await run(()=>document.querySelector('.studio-playback button[aria-label="정지"]').disabled))
   assert.deepEqual((await save('warning-model-preserved')).score,expected)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-reopened')).score,expected)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'source.mid')));assert.deepEqual(fs.readFileSync(xmlOpenFile),bytes)
   fs.writeFileSync(path.join(scene,'warning.json'),JSON.stringify({baseline,uiTextScale:width===960?2:1,collapsed,expanded,currentImportedModelOnly:true},null,2));rows.push({width,height,kind,koreanWarning:true,keyboardDetails:true,nativeModelPreserved:true,midiMatchesImportedModel:true,sourceXmlUntouched:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS tempo import warning '+width+' '+kind)
  }
  return
 }
 if(tempoPositionAudit){
  for(const [width,height]of [[960,750],[1400,800]])for(const kind of tempoSoundAudit?['position-half-0-96','position-quarter-1-80','position-eighth-0-96']:['1-offset-inherited','7-cursor-inherited','2-offset-7']){
   step=`tempo-position-${width}-${kind}`;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});openCurrent=false;sourceFile=path.join(source,kind,'source.chromatics');xmlOpenFile=path.join(source,kind,'source.musicxml')
   const sourceBytes=fs.readFileSync(xmlOpenFile),expected=JSON.parse(fs.readFileSync(sourceFile)).score,edited=JSON.parse(fs.readFileSync(path.join(source,kind,'edited.chromatics'))).score,meta=JSON.parse(fs.readFileSync(path.join(source,kind,'expectations.json')))
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await file();await click('MusicXML 가져오기');await wait(title=>document.querySelector('.score-title')?.textContent.includes(title),meta.title)
   assert.deepEqual((await save('imported')).score,expected)
   const select=async()=>{await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},meta.eventId);await key('Enter')}
   const tempo=async()=>{await click('형식');await click('악보 설정');await run(()=>{const n=document.querySelector('input[aria-label="위치별 빠르기 BPM"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual tempo input unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()})}
   await select();await tempo();assert.equal(await run(()=>document.querySelector('input[aria-label="위치별 빠르기 BPM"]').value),String(meta.originalBpm??80));await auditTempoPositions(false,expected)
   fs.writeFileSync(path.join(scene,'imported.png'),(await capturePresented()).toPNG())
   await win.webContents.insertText('88');await key('Enter');assert.deepEqual((await save('edited')).score,edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,expected)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'edited.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   if(tempoOffsetAudit){
    const {XMLParser}=require('fast-xml-parser'),parser=new XMLParser({ignoreAttributes:false}),rows=[]
    for(const [name,xml]of [['source',sourceBytes.toString('utf8')],['output',fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8')]]){
     const part=parser.parse(xml)['score-partwise'].part,measures=[].concat(part.measure),directions=measures.flatMap(m=>[].concat(m.direction??[])).filter(d=>d.sound&&d.offset!==undefined)
     assert.equal(directions.length,1)
     for(const d of directions){assert.equal(d.offset['@_sound'],'yes');assert.equal(Number(d.offset['#text']),13440);rows.push({name,offset:Number(d.offset['#text']),sound:d.offset['@_sound'],quarterBpm:Number(d.sound['@_tempo'])})}
    }
    fs.writeFileSync(path.join(scene,'offset-playback.json'),JSON.stringify(rows,null,2))
   }
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0')
   for(const [name,p]of [['source',xmlOpenFile],['output',path.join(scene,'filtered.musicxml')]]){const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),p],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,`xsd-${name}.log`),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)}
   activeTempoPositionScore=edited;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual(fs.readFileSync(xmlOpenFile),sourceBytes)
   await select();await tempo();assert.equal(await run(()=>document.querySelector('input[aria-label="위치별 빠르기 BPM"]').value),'88');fs.writeFileSync(path.join(scene,'reopened.png'),(await capturePresented()).toPNG())
   rows.push({width,height,kind,actualXmlImport:true,tempoNoteColumns:true,nativeExact:true,oneUndoRedo:true,midiExpected:true,sourceAndOutputXsd:true,pdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS tempo position import '+width+' '+kind)
  }
  return
 }
 if(tempoSaveAudit){
  const sourceBytes=fs.readFileSync(sourceFile)
  const expected=JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score
  for(const [width,height]of [[960,750],[1400,800]])for(const copy of [false,true]){
   step=`tempo-save-${width}-${copy?'copy':'save'}`;scene=path.join(out,String(width),copy?'copy':'save');fs.mkdirSync(scene,{recursive:true});openCurrent=false
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await wait(()=>Boolean(document.querySelector('.score-canvas .notation-event[data-event-id="guard-note"]')))
   await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="guard-note"]');n.scrollIntoView({block:'center'});n.focus({preventScroll:true})});await key('Enter');await key('D')
   const counts={save:nativeXmlSaves,copy:xmlSaves}
   if(copy){await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기')}else{await file();await click('MusicXML로 저장')}
   await wait(()=>document.querySelector('.editor-status').textContent.includes('위치별 빠르기'))
   assert.equal(nativeXmlSaves,counts.save);assert.equal(xmlSaves,counts.copy)
   const blocked=await run(()=>({status:document.querySelector('.editor-status').textContent,dirty:document.querySelector('.studio-document__state').textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId),overflow:document.documentElement.scrollWidth>innerWidth+1}))
   assert(blocked.status.includes('1회 수정')&&blocked.dirty==='저장하지 않은 변경'&&!blocked.overflow);assert.deepEqual(blocked.selected,['guard-note'])
   fs.writeFileSync(path.join(scene,'blocked.json'),JSON.stringify(blocked,null,2));fs.writeFileSync(path.join(scene,'blocked.png'),(await capturePresented()).toPNG())
   assert.deepEqual((await save('blocked-preserved')).score,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,original.score)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,expected)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,expected)
   await click('형식');await click('악보 설정')
   for(const label of ['악보 보기','파트보 선택']){
    await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('View selector unavailable');n.scrollIntoView({block:'center'});n.focus()},label)
    await key('Space');await key('End');await key('Enter')
   }
   await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   assert.equal(xmlSaves,counts.copy+1);const xml=fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8');assert(xml.includes('Other rit')&&!xml.includes('Primary rit'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'part.mid')))
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   assert.deepEqual((await save('part-output-preserved')).score,expected);assert.deepEqual(fs.readFileSync(sourceFile),sourceBytes)
   rows.push({width,height,copy,blockedBeforeBridge:true,dirtySelectionHistoryPreserved:true,exactUndoRedoNative:true,partXmlXsd:true,partMidiExact:true,partPdf:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS tempo loss guard '+width+' '+copy)
  }
  return
 }
 if(coincidentTextAudit){
  for(const [width,height] of [[960,750],[1400,800]])for(const family of rehearsalAudit?['rehearsalMarks']:inputCaretTempo?['tempoEvents']:inputCaretAudit?['expressionTexts','harmonies']:staffTextFirstAudit||staffTextChoiceAudit?['staffTexts']:['systemTexts','expressionTexts','harmonies']){
   const kind=family+(staffTextLowerAudit?'-lower':'')+(textObjectChoiceAudit?'-second':'')
   step=`coincident-text-${width}-${family}`;scene=path.join(out,String(width),family);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,kind,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),document=JSON.parse(bytes),meta=JSON.parse(fs.readFileSync(path.join(source,kind,'expectations.json')))
   const targetId=meta.targetId??meta.firstId,target=document.score[family].find(item=>item.id===targetId),choiceLabel=meta.label.replace('선택 요약 ','')+' 대상',choiceRecords=[]
   const openProperty=async()=>{await click(inputCaretTempo?'형식':'도구');await click(inputCaretTempo?'악보 설정':'선택 속성 열기')}
   if(textObjectConditionAudit){if(win.webContents.debugger.isAttached()){await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()}nativeTheme.themeSource=width===960?'dark':'light'}
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   const eventId=meta.eventId??'first-note',historyBase=inputCaretAudit?1:0
   await wait(id=>Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)),eventId)
   await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},eventId);await key('Enter')
   if(inputCaretAudit){
    await key('N');await click('온음표, 단축키 7');await click('악보로 이동');await key('C');await settle()
    const expectedInput=JSON.parse(fs.readFileSync(path.join(source,kind,'input.chromatics'))).score
    assert.deepEqual((await save('input-advanced')).score,expectedInput);document.score=expectedInput
    const context=await run(()=>({position:document.querySelector('[aria-label="입력 위치"]')?.textContent,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)}))
    assert(context.position.includes('2마디'));assert.deepEqual(context.selected,[eventId]);fs.writeFileSync(path.join(scene,'input-context.json'),JSON.stringify(context,null,2))
   }
   await openProperty()
   const conditions=textObjectConditionAudit?await prepareTextChoiceConditions(width,meta.label,choiceLabel):undefined
   const field=async label=>{if(conditions){await scaleTextChoiceChrome();await settle()}return run(label=>{const n=document.querySelector(`input[aria-label="${label}"]`);if(!n?.checkVisibility()||n.disabled)throw Error('Actual property field unavailable');n.focus();n.scrollIntoView({block:'center'});n.select()},label)}
   const read=()=>run(({label,choiceLabel})=>{const n=document.querySelector(`input[aria-label="${label}"]`),b=n.getBoundingClientRect(),choice=[...document.querySelectorAll('label')].find(n=>n.textContent===choiceLabel)?.control;return{choice:choice?.textContent,value:n.value,help:document.getElementById(n.getAttribute('aria-describedby'))?.textContent??'',active:document.activeElement===n,top:b.top,bottom:b.bottom,height:b.height,footer:document.querySelector('.editor-status').getBoundingClientRect().top,selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId),history:document.querySelector('.editor-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth+1}},{label:meta.label,choiceLabel})
   const chooseTarget=async expected=>{
    if(conditions){await scaleTextChoiceChrome();await settle()}
    await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label)?.control;if(!n?.checkVisibility()||n.disabled)throw Error('Actual object selector unavailable');n.focus();n.scrollIntoView({block:'center'})},choiceLabel)
    await settle()
    const before=await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label).control,b=n.getBoundingClientRect();return{active:document.activeElement===n,top:b.top,bottom:b.bottom,left:b.left,right:b.right,height:b.height,width:innerWidth,footer:document.querySelector('.editor-status').getBoundingClientRect().top}},choiceLabel)
    assert(before.active&&before.height>=31.9&&before.top>=0&&before.bottom<=before.footer+1&&before.left>=0&&before.right<=before.width+1)
    await key('Space')
    const list=await run(label=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent===label).control,l=document.getElementById(n.getAttribute('aria-controls')),b=l.getBoundingClientRect();return{visible:l.checkVisibility(),font:parseFloat(getComputedStyle(l).fontSize),left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:innerWidth,height:innerHeight,options:[...l.querySelectorAll('[role="option"]')].map(o=>o.textContent)}},choiceLabel)
    assert(list.visible&&list.left>=0&&list.right<=list.width+1&&list.top>=0&&list.bottom<=list.height+1&&list.options.length===2)
    if(conditions)assert(Math.abs(list.font-conditions.baseline.choice.font*2)<.1,'Newly mounted list must inherit enlarged text before positioning')
    if(conditions)fs.writeFileSync(path.join(scene,`choice-open-${choiceRecords.length}.png`),(await capturePresented()).toPNG())
    await key('End');await key('Enter');await settle();const value=await read();assert(value.choice.startsWith('2 · ')&&value.value===expected)
    choiceRecords.push({before,list,expected,selected:value.choice})
    assert(await run(()=>document.querySelector('.studio-playback button[aria-label="정지"]').disabled),'Object selection must not start playback')
   }
   if(textObjectChoiceAudit){await chooseTarget(target.text);assert.deepEqual((await save('choice-only-preserved')).score,document.score);await click('도구');await click('선택 속성 열기')}
   await field(meta.label);await settle();const initial=await read();assert(initial.active&&initial.value===(meta.originalValue??target.text)&&(inputCaretAudit||initial.help.includes('2개 중')))
   assert((inputCaretAudit||initial.choice.startsWith(textObjectChoiceAudit?'2 · ':'1 · '))&&initial.history.includes(`${historyBase}회 수정`))
   assert(initial.height>=31.9&&initial.top>=0&&initial.bottom<=initial.footer+1&&!initial.overflow)
   if(staffTextInkAudit)await auditCoincidentStaffText(false,document.score,'initial')
   if(rehearsalInkAudit)await auditCoincidentRehearsalMarks(false,document.score,'initial')
   if(inputCaretAudit)fs.writeFileSync(path.join(scene,'input-active.png'),(await capturePresented()).toPNG())
   await win.webContents.insertText(meta.text);await key('Enter');await settle();const editedField=await read();assert.equal(editedField.value,meta.text);assert(editedField.history.includes(`${historyBase+1}회 수정`));assert.deepEqual(editedField.selected,[eventId])
   const edited=inputCaretTempo?JSON.parse(fs.readFileSync(path.join(source,kind,'edited.chromatics'))).score:structuredClone(document.score),index=edited[family].findIndex(item=>item.id===targetId),old=edited[family][index]
   if(!inputCaretTempo)edited[family][index]=family==='harmonies'?{id:old.id,measureId:old.measureId,tick:old.tick,...meta.replacement}:{...old,text:meta.text}
   if(staffTextInkAudit)activeStaffTextScore=edited
   if(rehearsalInkAudit)activeRehearsalScore=edited
   assert.deepEqual((await save('edited')).score,edited)
   await openProperty();await field(meta.label);await key('Backspace');await key('Enter');await settle();const clearedField=await read();assert(clearedField.history.includes(`${historyBase+2}회 수정`))
   const cleared=structuredClone(document.score);cleared[family]=cleared[family].filter(item=>item.id!==targetId)
   assert.deepEqual((await save('cleared-one')).score,cleared)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('clear-undo')).score,edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('edit-undo')).score,document.score)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('edit-redo')).score,edited)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,inputCaretTempo?'edited.mid':'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   const xml=fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8'),schema=path.resolve('src/musicxml/schema/musicxml-4.0')
   for(const type of ['systemTexts','staffTexts','expressionTexts','harmonies','rehearsalMarks'])for(const item of edited[type]??[])assert(xml.includes(item.text),'Every authored text must survive actual XML: '+item.text)
   if(inputCaretTempo){for(const item of edited.tempoEvents)assert(xml.includes(item.text),'Tempo wording must survive');assert(xml.includes('<per-minute>92</per-minute>'))}
   else assert(!xml.includes(target.text),'The first object must actually be replaced')
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   if(staffTextLowerAudit){
    // Native reopen starts on the primary staff. Re-select the actual lower
    // event before asserting its property object's fresh local choice.
    await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},eventId);await key('Enter')
   }
   await openProperty()
   if(textObjectChoiceAudit){const reset=await read();assert.equal(reset.value,edited[family][0].text,'A new document load resets local object choice');await chooseTarget(meta.text)}
   await field(meta.label);await settle();fs.writeFileSync(path.join(scene,'property.png'),(await capturePresented()).toPNG())
   if(conditions){conditions.final=await sampleTextChoiceConditions(meta.label,choiceLabel);assert.deepEqual(conditions.final.glyph,conditions.baseline.glyph);assert(Math.abs(conditions.final.input.font-conditions.baseline.input.font*2)<.1);fs.writeFileSync(path.join(scene,'conditions.json'),JSON.stringify(conditions,null,2))}
   fs.writeFileSync(path.join(scene,'property.json'),JSON.stringify({initial,editedField,clearedField,choiceRecords,reopened:await read()},null,2))
   rows.push({width,height,family,targetId,objectChoice:textObjectChoiceAudit,exactEditClearUndoRedo:true,neighborsAndArrayOrderPreserved:true,nativeReopen:true,xmlXsd:true,midiExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS coincident text property '+width+' '+family)
  }
  return
 }
 if(ambiguousLyricAudit){
  for(const [width,height] of [[960,750],[1400,800]])for(const kind of ['none-none','1-none','2-2']){
   step=`ambiguous-lyrics-${width}-${kind}`;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});sourceFile=path.join(source,kind,'source.chromatics');openCurrent=false
   const bytes=fs.readFileSync(sourceFile),document=JSON.parse(bytes),notes=document.score.parts[0].staves[0].measures[0].voices[0].events.filter(e=>e.type==='note')
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await wait(id=>Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)),notes[0].id)
   const select=async id=>{await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},id);await key('Enter')}
   await select(notes[0].id);await click('추가');await click('가사 및 코드')
   const focusDiagnostic=await run(()=>{const n=document.querySelector('.studio-lyric-tools');return{active:document.activeElement?.outerHTML.slice(0,500),visible:n.checkVisibility(),tabindex:n.getAttribute('tabindex'),root:n.outerHTML.slice(0,1700)}})
   fs.writeFileSync(path.join(scene,'focus-diagnostic.json'),JSON.stringify(focusDiagnostic,null,2));await wait(()=>document.activeElement?.matches('.studio-lyric-tools'))
   const warning=await run(()=>{const root=document.querySelector('.studio-lyric-tools'),box=root.getBoundingClientRect();return{text:root.querySelector('[role="status"]')?.textContent,field:Boolean(document.querySelector('.notation-lyric-editor input')),disabled:[...root.querySelectorAll('button,input')].map(n=>({label:n.getAttribute('aria-label')||n.textContent,disabled:n.disabled})),overflow:document.documentElement.scrollWidth>innerWidth+1,box:{x:box.x,y:box.y,width:box.width,height:box.height}}})
   assert(warning.text?.includes('절 번호가 중복된 가사는 현재 편집할 수 없습니다.'));assert(!warning.field&&!warning.overflow);assert(warning.disabled.length>=4&&warning.disabled.every(n=>n.disabled))
   await wait(()=>document.activeElement?.matches('.studio-lyric-tools')&&!document.querySelector('.studio-application-menu [popover]:popover-open'))
   fs.writeFileSync(path.join(scene,'warning.json'),JSON.stringify(warning,null,2));fs.writeFileSync(path.join(scene,'warning.png'),(await capturePresented()).toPNG())
   assert(await run(()=>document.activeElement?.matches('.studio-lyric-tools')&&!document.querySelector('.studio-application-menu [popover]:popover-open')),'Capture must retain the actual warning focus after the menu closes')
   await key('Space');assert(await run(()=>document.querySelector('.studio-playback button[aria-label="정지"]').disabled));assert.deepEqual((await save('blocked-preserved')).score,document.score)
   await select(notes[1].id);await click('추가');await click('가사 및 코드');await wait(()=>document.activeElement?.matches('.notation-lyric-editor input'))
   await run(()=>document.querySelector('.notation-lyric-editor input').select());await win.webContents.insertText('이웃 수정');await key('Enter');await click('악보로 이동')
   const expected=structuredClone(document.score),neighbor=expected.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.id===notes[1].id)
   neighbor.lyrics=[{number:1,syllabic:'single',text:'이웃 수정'}]
   assert.deepEqual((await save('neighbor-edited')).score,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('exact-undo')).score,document.score)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('exact-redo')).score,expected)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('restored')).score,document.score)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,document.score)
   await click('파일');await click('내보내기 설정');const mc=midiSaves;await click('MIDI 내보내기');await wait(n=>document.querySelector('.editor-status').textContent.includes('filtered.mid'),mc);assert.equal(midiSaves,mc+1);assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,kind,'source.mid')))
   await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.musicxml')),fs.readFileSync(path.join(source,kind,'source.musicxml')))
   const xsd=spawnSync('xmllint',['--noout','--nonet','--schema',path.resolve('src/musicxml/schema/musicxml-4.0/musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.resolve('src/musicxml/schema/musicxml-4.0/catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),xsd.stderr);assert.equal(xsd.status,0)
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual(fs.readFileSync(sourceFile),bytes)
   rows.push({width,height,kind,blockedOriginalExact:true,neighborEditUndoRedo:true,nativeReopen:true,xmlBytesExact:true,midiBytesExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS ambiguous lyric protection '+width+' '+kind)
  }
  return
 }
 if(harmonyOverflow){
  const warning='PDF에서 지면 밖으로 나가는 코드 심벌이 있습니다. 코드 심벌과 마디 배치를 확인해 주세요.'
  for(const [width,height] of [[960,750],[1400,800]]){
   step=`harmony-overflow-${width}`;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;win.setContentSize(width,height)
   const bytes=fs.readFileSync(sourceFile),document=JSON.parse(bytes),event=document.score.parts[0].staves[0].measures[0].voices[0].events[0].id
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기')
   await wait(id=>Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)),event)
   assert.deepEqual((await save('source-preserved')).score,document.score)
   if(partLabel){
    await click('형식');await click('악보 설정')
    const editor=await run(()=>{const n=document.querySelector('[aria-label="현재 파트 표기"]');n.scrollIntoView({block:'center'});const b=n.getBoundingClientRect();return{visible:n.checkVisibility(),left:b.left,right:b.right,viewport:innerWidth,text:n.textContent}})
    assert(editor.visible&&editor.left>=0&&editor.right<=editor.viewport+1,'Actual shared part-label editor must remain visible and contained')
    fs.writeFileSync(path.join(scene,'part-label-editor.json'),JSON.stringify(editor,null,2));fs.writeFileSync(path.join(scene,'part-label-editor.png'),(await win.webContents.capturePage()).toPNG())
    await run(()=>{const n=document.querySelector('input[aria-label="현재 파트 약어"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual part abbreviation field unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()})
    await win.webContents.insertText('Tmp.');await key('Enter')
    const edited=await save('part-abbreviation-edited'),expected=JSON.parse(JSON.stringify(document.score));expected.parts[0].abbreviation='Tmp.'
    assert.deepEqual(edited.score,expected,'Abbreviation editing must keep notes, names and neighboring parts unchanged')
    expectedPartLabels=partLabelExpectations(expected);await auditPartLabels(false)
    await click('파일');await click('내보내기 설정');let count=midiSaves;await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.equal(midiSaves,count+1);assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),expectedMidi);fs.copyFileSync(path.join(scene,'filtered.mid'),path.join(scene,'part-abbreviation-edited.mid'))
    await key('Z',['control']);assert.deepEqual((await save('part-abbreviation-undo')).score,document.score)
    await key('Z',['control','shift']);assert.deepEqual((await save('part-abbreviation-redo')).score,expected)
    await key('Z',['control']);assert.deepEqual((await save('part-abbreviation-restored')).score,document.score)
    expectedPartLabels=partLabelExpectations(document.score)
   }
   if(meterHeader){
    const original=document.score.parts[0].staves[0].measures[2].voices[0].events[0],id=original.id
    await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},id);await key('Enter')
    assert.equal(await run(()=>document.activeElement?.getAttribute('data-event-id')),id,'Note focus must survive the new meter header layout')
    await key('Up',['control'])
    const edited=await save('meter-note-edited'),expected=JSON.parse(JSON.stringify(document.score))
    expected.parts[0].staves[0].measures[2].voices[0].events[0].pitch={...original.pitch,octave:original.pitch.octave+1,alter:original.pitch.alter||0}
    assert.deepEqual(edited.score,expected,'Existing octave command must affect only the selected note after the header')
    await key('Z',['control']);assert.deepEqual((await save('meter-note-undo')).score,document.score)
    await key('Z',['control','shift']);assert.deepEqual((await save('meter-note-redo')).score,expected)
    await key('Z',['control']);assert.deepEqual((await save('meter-note-restored')).score,document.score)
   }
   if(harmonySpanAudit){
    const owner=document.score.parts[0].staves.at(-1),eventId=owner.measures.at(-1).voices[0].events[0].id
    await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},eventId);await key('Enter')
    const noteFocus=await run(id=>({expected:id,actual:document.activeElement?.getAttribute('data-event-id'),selected:Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"].is-selected`))}),eventId)
    assert.equal(noteFocus.actual,eventId,'Logical note focus must survive measured repaint');assert(noteFocus.selected)
    const spanId=document.score.slurs[0].id
    await run(id=>{const n=[...document.querySelectorAll('.score-canvas .notation-span-target')].find(n=>n.dataset.spanId===id);n.scrollIntoView({block:'center'});n.focus({preventScroll:true})},spanId);await key('Enter')
    const spanFocus=await run(id=>({expected:id,actual:document.activeElement?.getAttribute('data-span-id'),selected:[...document.querySelectorAll('.score-canvas .notation-span-target.is-selected')].some(n=>n.dataset.spanId===id)}),spanId)
    assert.equal(spanFocus.actual,spanId,'Logical manual span focus must survive measured repaint');assert(spanFocus.selected)
    assert.deepEqual((await save('after-measured-selection')).score,document.score)
    fs.writeFileSync(path.join(scene,'measured-selection.json'),JSON.stringify({noteFocus,spanFocus},null,2))
   }
   const selected=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
   const output=async(mode,name,clipped)=>{
    step=`harmony-overflow-${width}-${name}`;pdfMode=mode;const count=pdfSaves,attempt=pdfAttempts
    await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>!document.querySelector('.app-shell--pdf-export'))
    assert.equal(pdfAttempts,attempt+1)
    const ink=JSON.parse(fs.readFileSync(path.join(scene,`pdf-attempt-${pdfAttempts}.json`))).ink
    assert.equal(ink.length,1);assert.equal(ink[0].text.length>120,clipped);assert.equal(ink[0].clipped,clipped,'Actual print SVG must establish the clipping condition')
    if(mode==='save'){
     assert.equal(pdfSaves,count+1);fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,name+'.pdf'))
     const report=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.innerText)
     assert.equal(typeof report,'string');assert(report.includes('filtered.pdf'),'Every successful save must publish the actual result')
     assert.equal(await run(()=>document.documentElement.scrollWidth>innerWidth),false,'The result warning must not overflow the document')
     fs.writeFileSync(path.join(scene,name+'-report.json'),JSON.stringify({report,ink},null,2))
     fs.writeFileSync(path.join(scene,name+'.png'),(await win.webContents.capturePage()).toPNG())
     assert.equal(Boolean(report?.includes(warning)),clipped,'Successful clipped PDF needs a Korean result warning; a corrected retry must clear it')
    }else{
     assert.equal(pdfSaves,count);assert.equal(await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]')!==null),false)
     if(mode==='fail')assert(await run(()=>document.querySelector('.editor-status').textContent.includes('임시 PDF 저장 실패')))
    }
    assert.deepEqual(await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId)),selected)
   }
   await output('save','clipped',true)
   for(const mode of ['cancel','fail']){await output(mode,mode,true);assert.deepEqual((await save(mode+'-preserved')).score,document.score);assert(await run(()=>document.querySelector('.editor-status').textContent.includes('0회 수정')))}
   await output('save','clipped-retry',true)
   await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus()},event);await key('Enter')
   await click('추가');await click('가사 및 코드');await click('코드 심벌 편집');await wait(()=>document.activeElement?.getAttribute('aria-label')==='선택 요약 코드')
   await run(()=>{const n=document.querySelector('input[aria-label="선택 요약 코드"]');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('C');await key('Enter')
   assert(await run(()=>document.querySelector('.studio-document__state').textContent.includes('저장하지 않은 변경')))
   await output('save','corrected',false)
   assert(await run(()=>document.querySelector('.studio-document__state').textContent.includes('저장하지 않은 변경')),'PDF never cleans the edited project')
   const edited=structuredClone(document.score),old=edited.harmonies[0];edited.harmonies=[{id:old.id,measureId:old.measureId,tick:old.tick,text:'C',root:{step:'C'},kind:'major'}]
   assert.deepEqual((await save('corrected-native')).score,edited)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('exact-undo')).score,document.score)
   await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('exact-redo')).score,edited)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,edited)
   await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,'source.mid')))
   assert.deepEqual(fs.readFileSync(sourceFile),bytes);rows.push({width,height,clippedWarning:true,cancelAndFailurePreserved:true,retry:true,correctedWarningCleared:true,pdfKeepsDirty:true,exactUndoRedo:true,nativeReopen:true,midiExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS actual harmony overflow '+width)
  }
  return
 }
 if(xmlRoundtrip){
  const kinds=printHeader?['short','long-title','long-composer']:partLabel?['labels','empty-labels','ensemble-labels']:meterHeader?['stable','changed']:harmonyPaged?['pages']:harmonyPickup?['pickup-held','pickup-tuplet']:harmonyRest?['rest-solo','rest-grand','rest-grand-reference']:harmonyVoices?(process.argv.includes('--audit-voice-lower-marks')?['voices','voices-auto-lower','voices-manual-lower','voices-lower-staff']:['voices']):harmonyHeld?['held','grand-staff','lyrics']:harmonyDisplay?['standard','legacy-full']:harmonyDense?['solo','grand-staff','lyrics']:harmonyTiming?['low-divisions','relative-cursor','fractional-offset','voice-backup','inherited-divisions','lower-staff']:pageRoundtrip?['a4-portrait','a4-landscape','letter-portrait','letter-landscape']:['tie','dotted-accidental','tuplet-staff','lower-grace','upper-grace','system-text','transparent-tempo'],schema=path.resolve('src/musicxml/schema/musicxml-4.0')
  assert.equal(spawnSync('xmllint',['--version']).status,0,'This actual XSD matrix requires xmllint; do not report a skipped binary as PASS')
  for(const [width,height] of [[960,750],[1400,800]])for(const kind of kinds){
   step=`xml-schema-${width}-${kind}`;scene=path.join(out,String(width),kind);fs.mkdirSync(scene,{recursive:true});openCurrent=false;sourceFile=path.join(source,kind,'source.chromatics')
   const bytes=fs.readFileSync(sourceFile),document=JSON.parse(bytes),event=document.score.parts[0].staves[0].measures[0].voices[0].events[0].id,expectedMidi=fs.readFileSync(path.join(source,kind,'source.mid'))
   expectedHarmonyCount=document.score.harmonies?.length??0
   expectedMeterHeaders=document.score.parts.flatMap(p=>p.staves).reduce((sum,s)=>sum+s.measures.filter((m,i)=>i===0||m.timeSignature.beats!==s.measures[i-1].timeSignature.beats||m.timeSignature.beatType!==s.measures[i-1].timeSignature.beatType).length,0)
   expectedPartLabels=partLabelExpectations(document.score)
   expectedPartDrawing={events:document.score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).length,staves:document.score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures)).length,clefs:document.score.parts.flatMap(p=>p.staves).length*3}
   const foreignFile=harmonyTiming||harmonyDisplay?path.join(source,kind,'source.musicxml'):undefined,foreignBytes=foreignFile?fs.readFileSync(foreignFile):undefined
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일')
   if(harmonyTiming||harmonyDisplay){xmlOpenFile=foreignFile;await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('source.musicxml을 가져왔습니다.'));xmlOpenFile=undefined}
   else await click('프로젝트 열기')
   await wait(id=>Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)),event)
   if(harmonyDisplay){const labels=await run(()=>[...document.querySelectorAll('.score-canvas .notation-harmony-mark')].map(n=>n.textContent));fs.writeFileSync(path.join(scene,'source-harmony-labels.json'),JSON.stringify(labels,null,2));assert.deepEqual(labels,document.score.harmonies.map(h=>h.text),'Actual imported chord labels must include root, kind and bass')}
   assert.deepEqual((await save('source-preserved')).score,document.score)
   if(harmonyVoices)activeVoiceScore=document.score
   if(voiceLyricAudit)await auditVoiceLyricClearance(false)
   if(harmonyEdit)await editDenseHarmonies(document.score,width)
   if(voiceLyricAudit&&['voices','voices-lower-staff'].includes(kind)&&process.argv.includes('--audit-shifted-lyric-draft'))await probeShiftedLyricDraft(document.score,width,height)
   const output=async (name,score=document.score)=>{
    if(harmonyVoices)activeVoiceScore=score
    if(harmonyRest){
     activeRestScore=score;activeRestKind=kind;activeRestPhase=name
     if(name==='source'){
      const id=score.parts[0].staves.at(-1).measures[0].voices[0].events[0].id
      await run(id=>document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`).scrollIntoView({block:'center'}),id);await settle()
      const point=await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"] .vf-notehead text`),context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(n).font;const b=context.measureText(n.textContent),p=n.getStartPositionOfChar(0),q=new DOMPoint(p.x+(b.actualBoundingBoxRight-b.actualBoundingBoxLeft)/2,p.y+(b.actualBoundingBoxDescent-b.actualBoundingBoxAscent)/2).matrixTransform(n.getScreenCTM());return{x:q.x,y:q.y,footer:document.querySelector('.editor-status').getBoundingClientRect().top,visible:n.checkVisibility()}},id)
      assert(point.visible&&point.y>0&&point.y<point.footer,'Actual rest pointer target must clear the sticky status')
      for(const type of ['mouseMove','mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1})
      await settle();const selected=await run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>({id:n.dataset.eventId,staffId:n.dataset.staffId})))
      assert.deepEqual(selected,[{id,staffId:score.parts[0].staves.at(-1).id}]);fs.writeFileSync(path.join(scene,'rest-pointer.json'),JSON.stringify({point,selected},null,2))
     }
     await auditMeasureRests(false)
    }

    if(printHeader&&process.argv.includes('--audit-print-header-horizontal')){
     const screenInk=await run(()=>{
      const page=document.querySelector('.score-canvas .score-page'),title=page.querySelector('.score-title');title.scrollIntoView({block:'center'})
      const p=page.getBoundingClientRect(),marks=[...title.querySelectorAll('.metadata-display')].flatMap(n=>{if(!n.textContent.trim())return[];const r=document.createRange();r.selectNodeContents(n);return[...r.getClientRects()].map(b=>({left:b.left,right:b.right,width:b.width,text:n.textContent}))})
      return{paper:{left:p.left,right:p.right},marks}
     })
     fs.writeFileSync(path.join(scene,name+'-screen-header-flow.json'),JSON.stringify(screenInk,null,2));fs.writeFileSync(path.join(scene,name+'-screen-header-flow.png'),(await win.webContents.capturePage()).toPNG())
     assert(screenInk.marks.every(n=>n.left>=screenInk.paper.left-.5&&n.right<=screenInk.paper.right+.5),'Live paper title/composer text must wrap within its paper too')
    }
    if(meterHeader)await auditMeterHeaders(false)
    if(partLabel){expectedPartLabels=partLabelExpectations(score);await auditPartLabels(false)}
    if(harmonyHeld){
     await run(()=>document.querySelector('.score-canvas .notation-harmony-mark').scrollIntoView({block:'center'}));await settle()
     const pulse=await run(score=>{const root=document.querySelector('.score-canvas'),staves=score.parts[0].staves,shared=[]
      if(staves.length>1){const owner=staves.at(-1)
       owner.measures.forEach((bar,index)=>{const labels=[...root.querySelectorAll('.notation-harmony-mark')].filter(n=>n.dataset.measureId===bar.id),marks=score.harmonies.filter(h=>h.measureId===bar.id)
        marks.forEach((h,i)=>{if(bar.voices.some(v=>v.events.some(e=>e.position.tick===h.tick)))return
         const event=staves[0].measures[index].voices.flatMap(v=>v.events).find(e=>e.type==='note'&&e.position.tick===h.tick);if(!event)return
         const n=root.querySelector(`.notation-event[data-event-id="${event.id}"] .vf-notehead >text`),box=n.getBBox();shared.push({tick:h.tick,label:h.text,expected:box.x+box.width/2,actual:Number(labels[i].getAttribute('x'))})
        })
       })
      }
      return{events:root.querySelectorAll('.notation-event').length,expectedEvents:score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).length,shared}
     },score)
     fs.writeFileSync(path.join(scene,name+'-held-pulse.json'),JSON.stringify(pulse,null,2));assert.equal(pulse.events,pulse.expectedEvents,'Layout-only annotation columns must not create rendered score events')
     if(kind==='grand-staff'){assert.equal(pulse.shared.length,2);assert(pulse.shared.every(p=>Math.abs(p.actual-p.expected)<=.5),'An interior lower-staff chord sharing an upper note onset must follow that actual glyph column')}
     if(kind==='pickup-tuplet'){
      assert.equal(pulse.shared.length,4);assert(pulse.shared.every(p=>Math.abs(p.actual-p.expected)<=.5),'Pickup triplet onsets and lower held-note chords must share actual glyph columns')
      const glyphs=await run(()=>{const root=document.querySelector('.score-canvas'),context=document.createElement('canvas').getContext('2d');return{groups:root.querySelectorAll('.vf-tuplet').length,glyphs:[...root.querySelectorAll('.vf-tuplet text')].map(n=>{const s=getComputedStyle(n);context.font=s.font;const b=context.measureText(n.textContent);return{text:n.textContent,width:b.actualBoundingBoxLeft+b.actualBoundingBoxRight,height:b.actualBoundingBoxAscent+b.actualBoundingBoxDescent}})}})
      fs.writeFileSync(path.join(scene,name+'-pickup-tuplet.json'),JSON.stringify(glyphs,null,2));assert.equal(glyphs.groups,1);assert(glyphs.glyphs.length>0&&glyphs.glyphs.every(n=>n.width>0&&n.height>0),'The existing tuplet group must contain actual visible font ink')
     }
    }
    if(harmonyDense)await auditHarmonySpacing(false)
    if(harmonySystemAudit)await auditHarmonySystemClearance(false)
    if(harmonyAnchorAudit){
     await run(async()=>{await document.fonts.ready;return true});await settle()
     const positions=await run(score=>{
      const root=document.querySelector('.score-canvas')
      return(score.harmonies||[]).map(h=>{
       const measure=score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures)).find(m=>m.id===h.measureId),points=new Map()
       for(const event of measure.voices.flatMap(v=>v.events))if(event.type==='note'){
        const text=root.querySelector(`.notation-event[data-event-id="${event.id}"] .vf-notehead > text`),b=text.getBBox(),x=b.x+b.width/2
        points.set(event.position.tick,Math.min(points.get(event.position.tick)??Infinity,x))
       }
       const ticks=[...points.keys()].sort((a,b)=>a-b),left=ticks.filter(t=>t<=h.tick).at(-1),right=ticks.find(t=>t>=h.tick)
       if(left===undefined||right===undefined)throw Error('This actual fixture requires bracketing note onsets')
       const expected=left===right?points.get(left):points.get(left)+(points.get(right)-points.get(left))*(h.tick-left)/(right-left)
       const index=score.harmonies.filter(n=>n.measureId===h.measureId).findIndex(n=>n.id===h.id),text=root.querySelectorAll(`.notation-harmony-mark[data-measure-id="${h.measureId}"]`)[index]
       return{measureId:h.measureId,tick:h.tick,expectedNoteCenterX:expected,actualCodeX:Number(text.getAttribute('x')),text:text.textContent}
      })
     },score)
     fs.writeFileSync(path.join(scene,name+'-harmony-anchors.json'),JSON.stringify(positions,null,2))
     assert(positions.every(p=>Math.abs(p.expectedNoteCenterX-p.actualCodeX)<=0.5),'Chord symbols must follow actual note onsets, not the full bar width ratio')
    }
    if(kind==='lower-grace'||kind==='upper-grace'){
     const hostId=score.parts[0].staves[kind==='lower-grace'?1:0].measures[0].voices[0].events[0].id
     const glyphs=await run(({hostId,print})=>{const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),host=root.querySelector(`.notation-event[data-event-id="${hostId}"]`);return[...host.querySelectorAll('g.vf-stavenote')].map(n=>{const b=n.getBBox(),head=n.querySelector('.vf-notehead')?.getBBox();return{box:{x:b.x,y:b.y,width:b.width,height:b.height},head:head&&{x:head.x,y:head.y,width:head.width,height:head.height},paths:n.querySelectorAll('path').length,headText:n.querySelector('.vf-notehead text')?.textContent}})},{hostId,print:false})
     fs.writeFileSync(path.join(scene,name+'-grace-ink.json'),JSON.stringify(glyphs,null,2))
     assert.equal(glyphs.length,kind==='lower-grace'?1:2,'Actual grace note glyphs must render on both primary and lower staves')
     assert(glyphs.every(n=>n.head?.width>0&&n.head.height>0&&n.headText&&[...n.headText].every(c=>c.codePointAt(0)>=0xE000)),'Grace must contain real ink, not a letter placeholder')
     fs.writeFileSync(path.join(scene,name+'-grace-ink.json'),JSON.stringify(glyphs,null,2))
    }
    await click('파일');await click('내보내기 설정');let count=midiSaves;await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.equal(midiSaves,count+1);assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),expectedMidi);fs.copyFileSync(path.join(scene,'filtered.mid'),path.join(scene,name+'.mid'))
    if(harmonyPaged){await run(()=>{const n=document.querySelector('input[aria-label="PDF 목표 장수"]');if(!n?.checkVisibility()||n.disabled)throw Error('Actual PDF target unavailable');n.scrollIntoView({block:'center'});n.focus();n.select()});await win.webContents.insertText('1');await key('Tab');assert.equal(await run(()=>document.querySelector('input[aria-label="PDF 목표 장수"]').value),'1')}
    count=pdfSaves;await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.equal(pdfSaves,count+1);fs.copyFileSync(path.join(scene,'filtered.pdf'),path.join(scene,name+'.pdf'))
    if(harmonyPaged){
     const info=spawnSync('pdfinfo',[path.join(scene,name+'.pdf')],{encoding:'utf8'});assert.equal(info.status,0,info.stderr);const pages=Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);assert(pages>1,'Generated measured two-staff layout must exceed the requested one-page target')
     const message=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').innerText)
     fs.writeFileSync(path.join(scene,name+'-page-target.json'),JSON.stringify({target:1,actualPdfPages:pages,message},null,2));assert(message.includes('목표 1장'),'A real PDF exceeding the target must explain the layout limit')
     const surface=await run(()=>{const n=document.querySelector('[aria-label="PDF 출력 결과"]');n.scrollIntoView({block:'center'});const b=n.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}})
     assert(surface.left>=0&&surface.right<=surface.viewport+1,'Actual result surface must remain within compact and desktop width')
     assert.equal(surface.documentWidth,surface.clientWidth,'Result warning must not add horizontal document overflow')
     fs.writeFileSync(path.join(scene,name+'-page-target-surface.json'),JSON.stringify(surface,null,2));fs.writeFileSync(path.join(scene,name+'-page-target.png'),(await win.webContents.capturePage()).toPNG())
    }
   }
   await output('source')
   await click('파일');await click('내보내기 설정');let count=xmlSaves;await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));assert.equal(xmlSaves,count+1)
   const validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}});fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
   assert.deepEqual((await save('after-export')).score,document.score)
   if(harmonyDense){openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('source-native-reopened')).score,document.score);openCurrent=false}
   count=xmlOpens;await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml을 가져왔습니다.'));assert.equal(xmlOpens,count+1)
   const imported=await save('xml-imported')
   if(printHeader){assert.equal(imported.score.title,document.score.title);assert.equal(imported.score.composer,document.score.composer)}
   assert.deepEqual(imported.score.tempo,document.score.tempo)
   if(harmonyTiming||harmonyDisplay)assert.deepEqual(imported.score.harmonies,document.score.harmonies)
   if(harmonyHeld){assert.deepEqual(imported.score.harmonies.map(h=>[h.tick,h.text]),document.score.harmonies.map(h=>[h.tick,h.text]));const owner=imported.score.parts[0].staves.at(-1);assert(imported.score.harmonies.every(h=>owner.measures.some(m=>m.id===h.measureId)))}
   if(kind==='lower-grace')assert.deepEqual(imported.score.parts[0].staves[1].measures[0].voices[0].events[0].graceNotes,document.score.parts[0].staves[1].measures[0].voices[0].events[0].graceNotes)
   if(pageRoundtrip){
    assert.deepEqual(imported.score.layout.pageSetup,document.score.layout.pageSetup)
    assert.equal(imported.score.layout.systemBreakBeforeMeasureIds.length,document.score.layout.systemBreakBeforeMeasureIds.length)
   }
   if(kind==='system-text'||pageRoundtrip){
    assert.deepEqual(imported.score.systemTexts.map(n=>n.text),['System text'])
    const visible=await run(()=>[...document.querySelectorAll('.score-canvas .notation-system-text')].map(n=>{const b=n.getBBox();return{text:n.textContent,box:{x:b.x,y:b.y,width:b.width,height:b.height}}}))
    assert.equal(visible.filter(n=>n.text==='System text'&&n.box.width>0&&n.box.height>0).length,1,'Reimported global text must have actual visible ink, not just retained metadata')
   }
   await output('reimported',imported.score);assert.deepEqual((await save('after-reimport-output')).score,imported.score)
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('native-reopened')).score,imported.score)
   assert.deepEqual(fs.readFileSync(sourceFile),bytes);fs.writeFileSync(path.join(scene,'roundtrip.png'),(await win.webContents.capturePage()).toPNG())
   if(harmonyTiming||harmonyDisplay)assert.deepEqual(fs.readFileSync(foreignFile),foreignBytes)
   if(pageRoundtrip){
    xmlOpenFile=path.join(scene,'unsupported-margins.musicxml')
    fs.writeFileSync(xmlOpenFile,fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8').replace(/<left-margin>[^<]+<\/left-margin>/,'<left-margin>40</left-margin>'))
    await click('파일');await click('MusicXML 가져오기');await wait(()=>document.querySelector('.editor-status').textContent.includes('unsupported-margins.musicxml을 가져왔습니다.'))
    const warning=await run(()=>{const n=document.querySelector('[aria-label="MusicXML 경고 상세"]');n.scrollIntoView({block:'center'});return{visible:n.innerText,technical:n.textContent}})
    assert(warning.visible.includes('서로 다르거나 지원 범위를 벗어난 여백은 가져오지 못했습니다.'))
    assert(!warning.visible.includes('Asymmetric, incomplete'));assert(warning.technical.includes('Asymmetric, incomplete'))
    const partial=await save('asymmetric-imported');assert.deepEqual(partial.score.layout.pageSetup,{pageSize:document.score.layout.pageSetup.pageSize,orientation:document.score.layout.pageSetup.orientation})
    fs.writeFileSync(path.join(scene,'unsupported-margins.png'),(await win.webContents.capturePage()).toPNG());xmlOpenFile=undefined
   }
   rows.push({width,height,kind,sourceFileUnchanged:true,nativeSourceExact:true,actualXmlXsd:true,midiBeforeAndAfterExact:true,tempoExact:true,nativeReopenExact:true,sourceAndReimportPdfs:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS actual XML schema roundtrip '+width+' '+kind)
  }
  return
 }
 if(unequal){
  for(const [width,height] of [[960,750],[1400,800]])for(const scope of ['score','part']){
   step=`unequal-${width}-${scope}`;scene=path.join(out,String(width),scope);fs.mkdirSync(scene,{recursive:true});openCurrent=false
   sourceFile=path.join(source,scope,'source.chromatics');const before=JSON.parse(fs.readFileSync(sourceFile))
   const target=before.score.parts[1].staves[1],event=target.measures[0].voices[0].events[0].id
   win.setContentSize(width,height);await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle()
   await click('파일');await click('프로젝트 열기');await wait(id=>Boolean(document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)),event)
   await run(id=>{const n=document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`);n.scrollIntoView({block:'center'});n.focus()},event);await key('Enter')
   const selection=()=>run(()=>[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId))
   const selected=await selection();assert.deepEqual(selected,[event])
   await click('형식');await click('악보 설정');await click('보표 삭제')
   assert.equal(await run(()=>document.querySelector('.editor-status').textContent.includes('저장된 줄·페이지 나누기를 다른 보표로 옮길 수 없습니다.')),true)
   assert.equal(await run(()=>document.querySelector('.editor-status').textContent.includes('0회 수정')),true);assert.deepEqual(await selection(),selected)
   fs.writeFileSync(path.join(scene,'guard.png'),(await win.webContents.capturePage()).toPNG())
   const after=await save('guard-preserved');assert.deepEqual(after.score,before.score);assert.deepEqual(after.partLayouts,before.partLayouts)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('no-undo')).score,before.score)
   await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
   const reopened=await save('reopened');assert.deepEqual(reopened.score,before.score);assert.deepEqual(reopened.partLayouts,before.partLayouts)
   rows.push({width,height,scope,selectionExact:true,scoreExact:true,layoutsExact:true,noUndoEntry:true,nativeReopen:true,pdfProduced:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS unequal staff guard '+width+' '+scope)
  }
  return
 }
 if(harmonyBounds){
  for(const [width,height] of [[960,750],[1400,800]]){
   step='harmony-bounds-'+width;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;win.setContentSize(width,height)
   await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.notation-measure[data-measure-id="short-target"]')))
   await measure(first);await file();await filter('harmonies');await click('선택 범위 복사');await measure('short-target');await file()
   assert.equal(await run(()=>document.querySelector('button[aria-label="선택 범위에 붙여넣기"]').disabled),true)
   await click('악보로 이동');await key('V',['control']);assert.ok(await run(()=>document.querySelector('.editor-status').textContent.includes('마디 길이와 표기 위치를 확인해 주세요.')))
   assert.ok(await run(()=>document.querySelector('.editor-status').textContent.includes('0회 수정')))
   fs.writeFileSync(path.join(scene,'bounds.png'),(await win.webContents.capturePage()).toPNG());assert.deepEqual((await save('bounds-preserved')).score,original.score)
   await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('bounds-no-undo')).score,original.score)
   await click('파일');await click('내보내기 설정');await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'))
   const xml=fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8');assert.ok(xml.includes('C7')&&xml.includes('F'))
   await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
   openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('bounds-reopened')).score,original.score)
   rows.push({width,height,outOfBarPasteDisabled:true,nativeKeyboardRejected:true,noUndoEntry:true,sourceAndNativeExact:true,existingTargetChordPreserved:true,xmlAndPdfProduced:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS harmony bounds '+width)
  }
  return
 }
 for(const [width,height] of [[960,750],[1400,800]]){
  step='open-'+width;scene=path.join(out,String(width));fs.mkdirSync(scene,{recursive:true});openCurrent=false;win.setContentSize(width,height)
  await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});app.focus({steal:true});win.focus();await settle();await click('파일');await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.notation-event[data-event-id="first-note"]')));await settle()
  await measure(first);await file();await filter(objectFilter)
  await click('선택 범위 복사');assert.deepEqual((await save('copied')).score,original.score)
  step='paste-'+width;await measure('target');await file();await click('선택 범위에 붙여넣기')
  const pasted=(await save('pasted')).score,copied=pasted[family].find(t=>t.measureId==='target')
  if(rehearsalClipboard){activeRehearsalScore=pasted;if(rehearsalInkAudit)await auditCoincidentRehearsalMarks(false,pasted,'pasted')}
  if(dynamic)assert.equal(copied.value,'pp')
  else assert.equal(copied.text,rehearsalClipboard?'Source R1':systemText?'Source system':expression?'Source expression zero':harmony?'C7':'Source')
  assert.notEqual(copied.id,'source');assert.notEqual(copied.id,'target-text')
  const copiedSource=original.score[family].filter(t=>t.measureId===first||(globalClipboard&&t.measureId==='measure-1')),copiedTarget=pasted[family].filter(t=>t.measureId==='target')
  const contents=items=>items.map(({id,measureId,...value})=>value)
  assert.deepEqual(contents(copiedTarget),contents(copiedSource))
  assert(copiedTarget.every(t=>!original.score[family].some(o=>o.id===t.id)))
  assert.deepEqual(pasted[family].filter(t=>t.measureId!=='target'),original.score[family].filter(t=>t.measureId!=='target'&&(!globalClipboard||t.measureId!=='measure-2')))
  if(expression){const values=pasted.expressionTexts.filter(t=>t.measureId==='target');assert.deepEqual(values.map(t=>[t.text,t.tick]),[['Source expression zero',0],['Source expression two',26880]]);assert.ok(values.every(t=>!original.score.expressionTexts.some(o=>o.id===t.id)))}
  assert.deepEqual({...pasted,[family]:original.score[family]},original.score)
  if(harmonyRowsAudit&&harmony){
   const rows=await run(score=>[...new Set(score.harmonies.map(h=>h.measureId))].flatMap(measureId=>{
    const marks=score.harmonies.filter(h=>h.measureId===measureId)
    if(marks.length<2)return[]
    const nodes=[...document.querySelectorAll(`.score-canvas .notation-harmony-mark[data-measure-id="${measureId}"]`)]
    return[{measureId,ticks:marks.map(h=>h.tick),labels:nodes.map(n=>n.textContent),ys:nodes.map(n=>Number(n.getAttribute('y')))}]
   }),pasted)
   fs.writeFileSync(path.join(scene,'harmony-rows.json'),JSON.stringify(rows,null,2));assert.equal(rows.length,2)
   for(const row of rows){
    assert.equal(row.ys.length,row.ticks.length)
    if(new Set(row.ticks).size===row.ticks.length)assert(Math.max(...row.ys)-Math.min(...row.ys)<=0.01,'Different chord onsets must share a row')
    else if(new Set(row.ticks).size===1){const y=[...row.ys].sort((a,b)=>a-b);assert(y.slice(1).every((n,i)=>n-y[i]>=15.99),'Simultaneous chords retain their existing stack')}
    else throw Error('Mixed tick fixture requires explicit per-group assertions')
   }
  }
  await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,original.score)
  await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,pasted)
  await file();await click(`선택 마디 ${familyLabel} 지우기`);const deleted=(await save('deleted')).score
  assert.deepEqual(deleted[family],pasted[family].filter(t=>t.measureId!=='target'));assert.deepEqual({...deleted,[family]:pasted[family]},pasted)
  await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('delete-undo')).score,pasted)
  step='guard-'+width;await run(()=>{const n=document.querySelector('.score-canvas .notation-event[data-event-id="first-note"]');n.scrollIntoView({block:'center'});n.focus()});await key('Enter');await file()
  const disabled=await run(()=>['음표 지우기','선택 범위 복사','선택 범위에 붙여넣기'].map(label=>({label,disabled:document.querySelector(`button[aria-label="${label}"]`).disabled})))
  assert.ok(disabled.every(x=>x.disabled));await click('악보로 이동');await key('Delete');await key('V',['control']);assert.deepEqual((await save('blocked-note')).score,pasted)
  await measure('target');await file();assert.equal(await run(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  if(globalClipboard){
   await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 필터')?.control;if(!n||n.disabled)throw Error('Public system-text filter unavailable');n.focus();n.scrollIntoView({block:'center'})});await settle()
   const control=await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 필터').control,b=n.getBoundingClientRect(),footer=document.querySelector('.editor-status').getBoundingClientRect().top;return{active:document.activeElement===n,label:n.textContent,top:b.top,bottom:b.bottom,left:b.left,right:b.right,footer,width:innerWidth,help:n.parentElement.textContent}})
   fs.writeFileSync(path.join(scene,'filter-control.json'),JSON.stringify(control,null,2));assert(control.active&&control.label.includes(familyLabel)&&control.top>=0&&control.bottom<=control.footer+1&&control.left>=0&&control.right<=control.width+1)
   assert(control.help.includes('총보 첫 보표'))
  }
  fs.writeFileSync(path.join(scene,'filter-visible.png'),(await capturePresented()).toPNG())
  step='exports-'+width;await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.mid'));assert.deepEqual(fs.readFileSync(path.join(scene,'filtered.mid')),fs.readFileSync(path.join(source,dynamic?'pasted.mid':'source.mid')))
  await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('filtered.musicxml'));const xml=fs.readFileSync(path.join(scene,'filtered.musicxml'),'utf8');assert.ok(xml.includes('Source')&&xml.includes('Neighbor')&&(systemText?xml.includes('Keep expression'):xml.includes('Keep system')))
  if(expression)assert.ok(xml.includes('Source expression zero')&&xml.includes('Source expression two')&&xml.includes('Neighbor expression')&&!xml.includes('Keep expression')&&xml.includes('Old'))
  else if(globalClipboard){
   if(rehearsalClipboard)assert(xml.includes('Source R1')&&xml.includes('Source R2')&&xml.includes('Neighbor R')&&xml.includes('Old')&&!xml.includes('Old R1')&&!xml.includes('Old R2'))
   else assert(xml.includes('Source system')&&xml.includes('Neighbor system')&&xml.includes('Old')&&!xml.includes('Old system'))
   const schema=path.resolve('src/musicxml/schema/musicxml-4.0'),validation=spawnSync('xmllint',['--nonet','--noout','--schema',path.join(schema,'musicxml.xsd'),path.join(scene,'filtered.musicxml')],{encoding:'utf8',env:{...process.env,XML_CATALOG_FILES:path.join(schema,'catalog.xml')}})
   fs.writeFileSync(path.join(scene,'xsd.log'),validation.stderr||'');assert.equal(validation.status,0,validation.stderr)
  }
  else if(!harmony&&!dynamic)assert.ok(!xml.includes('Old'))
  if(harmony)assert(xml.includes('C7')&&xml.includes('G7')&&xml.includes('Dm')&&xml.includes('Old'))
  if(dynamic)assert.equal((xml.match(/<pp\s*\/>/g)||[]).length,2)
  if(textInkAudit||allTextInkAudit)await auditTextInk(false)
  if(wordSpaceAudit)await auditWordSpacing(false)
  await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
  openCurrent=true;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'));assert.deepEqual((await save('reopened')).score,pasted)
  rows.push({width,height,nativePointerMeasure:true,markingFamily:family,staffTextOnly:family==='staffTexts',expressionTextOnly:expression,exactUndoRedo:true,blockedNoteDeletePaste:true,otherPartAndFamiliesExact:true,midiExpected:dynamic?'pasted-target-velocity':'source',midiExact:true,nativeReopenExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS object filters '+width+' '+family)
 }}catch(error){if(scene){fs.writeFileSync(path.join(scene,'failure.json'),JSON.stringify({step,error:String(error)},null,2));fs.writeFileSync(path.join(scene,'failure.png'),(await win.webContents.capturePage()).toPNG())}throw error}
 finally{clearTimeout(deadline);win.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
