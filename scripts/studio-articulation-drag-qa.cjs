// Browser-owned drag tokens and actual renderer geometry, never a fabricated payload.
module.exports=async function eventMarkDragQa(ctx,options={}){
 const {win,nativeTheme,run,settle,click,button,key,menu:nativeMenu,point,wait,fs,path,assert,sha,out,root,results,setStage,setSave,setOpen,waitNativeProjectCompletion,fill}=ctx
 const menu=nativeMenu
 const fixtures=path.join(root,options.fixtureDirectory??'out/studio-parity-20261104/smg-012-articulation-drag/fixtures-a'),cases=[],density=[]
 const qaKey=options.key??'articulation',family=options.family??'표현 기호',captionSelector=`[aria-label="${family} 끌기 안내"]`,mime=options.mime??'application/x-ddirori-studio-articulation'
 let sourceFile,source,expected,meta,originalHash,destination,tile
 const input=require('./studio-native-drag-input-qa.cjs')(ctx)
 const names=options.names??{staccato:'스타카토',accent:'악센트',tenuto:'테누토',marcato:'마르카토'},event=id=>`.notation-event[data-event-id="${id}"]`
 const phase=options.phase??'all',widths=options.widths??[960,1400],values=options.values??Object.keys(names),fixtureSuffix=options.fixtureSuffix??''
 assert(['','-rest'].includes(fixtureSuffix),'Explicit note/rest fixture scope')
 assert(['all','functional'].includes(phase),'Explicit QA phase');assert(widths.length&&new Set(widths).size===widths.length&&widths.every(width=>[960,1400].includes(width)),'Known nonempty viewport scope');assert(values.length&&new Set(values).size===values.length&&values.every(value=>Object.hasOwn(names,value)),'Known nonempty symbol scope')
 const record=()=>fs.writeFileSync(path.join(out,`${qaKey}-steps.json`),JSON.stringify({phase,requestedWidths:widths,requestedValues:values,fixtureSuffix,cases,density},null,2)+'\n')
 record()
 const inkModule=await require('esbuild').build({stdin:{contents:"export {ornamentGlyphs} from './src/renderer/src/notation/ornament-glyphs';export {resolveNotePointerOwner} from './src/renderer/src/notation/note-pointer-owner';export {readSvgTextInk,readSvgShapeInk} from './src/renderer/src/notation/staff-ink-spacing'",resolveDir:root,loader:'ts'},bundle:true,platform:'browser',format:'iife',globalName:'__studioQaEventInk',write:false,logLevel:'silent'})
 await win.webContents.executeJavaScript(inkModule.outputFiles[0].text)
 await run(()=>{window.__studioQaEventPoint=selector=>{
  const n=document.querySelector(selector);if(!n||!n.checkVisibility())throw Error('Unavailable owned point '+selector);const r=n.getBoundingClientRect();let x=r.x+r.width/2,y=r.y+r.height/2
  if(n.matches('.notation-event')){
   const text=[...n.querySelectorAll('.vf-notehead text')].find(t=>t.closest('.vf-stavenote')===n),context=document.createElement('canvas').getContext('2d'),ink=text&&context?window.__studioQaEventInk.readSvgTextInk(text,context):undefined,m=n.ownerSVGElement?.getScreenCTM();if(!ink||!m)throw Error('Missing real regular-head ink '+selector)
   const px=ink.x+ink.width/2,py=ink.y+ink.height/2;x=m.a*px+m.c*py+m.e;y=m.b*px+m.d*py+m.f
  }
  const top=document.elementFromPoint(x,y),raw=top?.closest('.notation-event'),owner=raw?window.__studioQaEventInk.resolveNotePointerOwner(raw,x,y):undefined,hit=n.matches('.notation-event')?owner?.element===n:Boolean(top&&n.contains(top))
  return{x,y,w:r.width,h:r.height,hit:hit&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight,domOwner:raw?.dataset.eventId,inkOwner:owner?.eventId,expected:n.dataset.eventId}
 }})
 const clickNote=async(selector)=>{
  let previous
  for(let i=0;i<4;i++){
   await run(sel=>document.querySelector(sel).scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}),selector);await settle();const p=await run(sel=>window.__studioQaEventPoint(sel),selector)
   if(p.hit&&previous?.hit&&['x','y','w','h'].every(k=>Math.abs(p[k]-previous[k])<.25)){
    for(const type of['mouseMove','mouseDown','mouseUp'])await input.native({type,x:Math.round(p.x),y:Math.round(p.y),...(type==='mouseMove'?{}:{button:'left',clickCount:1})});await settle();assert(await run(sel=>document.querySelector(sel).classList.contains('is-selected'),selector),'Actual pointer must select the unique ink owner');return p
   }
   previous=p
  }
  throw Error('Bounded stable unique ink selection failed: '+JSON.stringify(previous))
 }
 const pair=async()=>{
  // A genuine nonzero wheel gives the user ownership over previous focus-follow.
  await input.native({type:'mouseWheel',x:win.getContentSize()[0]-24,y:500,deltaX:0,deltaY:1,canScroll:true});await settle()
  let previous;const samples=[]
  for(let i=0;i<4;i++){
   await run(({tile,destination})=>{for(const selector of [destination,tile]){const n=document.querySelector(selector);if(!n||!n.checkVisibility())throw Error('Drag endpoint unavailable: '+selector);n.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'})}},{tile,destination});await settle()
   const g=await run(({tile,destination})=>{const read=selector=>window.__studioQaEventPoint(selector);return{source:read(tile),destination:read(destination),footerTop:document.querySelector('.studio-status').getBoundingClientRect().top}},{tile,destination});samples.push(g)
   if(g.source.hit&&g.destination.hit&&previous?.source.hit&&previous?.destination.hit&&['source','destination'].every(k=>['x','y','w','h'].every(p=>Math.abs(g[k][p]-previous[k][p])<.25)))return{...g,samples}
   previous=g
   // Save feedback can make the sticky footer taller. Native wheel reveals
   // the same endpoints above that measured overlay; strict hit stays required.
   if(!g.destination.hit&&g.destination.y>=g.footerTop-24){
    const x=Math.round(g.destination.x),y=Math.round(Math.max(120,Math.min(g.footerTop-40,g.destination.y-120))),deltaY=-Math.max(60,Math.min(300,g.destination.y-g.footerTop+100))
    await input.native({type:'mouseMove',x,y});await input.native({type:'mouseWheel',x,y,deltaX:0,deltaY,canScroll:true,hasPreciseScrollingDeltas:true});await settle()
   }
  }
  throw Error('Bounded stable native articulation drag endpoints failed: '+JSON.stringify(samples))
 }
 const drag=async(width,cancel,refused=false,repeat=false)=>{
  setStage(`${qaKey}-drag-${width}-${meta.value}-${cancel?'cancel':repeat?'repeat':'apply'}`)
  await require('./studio-native-input-state-qa.cjs')({win,run,results,label:`${qaKey} owned drag start`})
  const p=await pair();assert(await run(selector=>document.querySelector(selector).draggable,tile));assert.equal(await run(selector=>getComputedStyle(document.querySelector(selector)).cursor,tile),'grab');const oldStatus=await run(()=>document.querySelector('.editor-status').textContent),selectionBefore=await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId)
  const focusEvents=[],focusChecks=[];const checkFocus=async step=>{const screen=require('electron').screen,content=win.getContentBounds();focusChecks.push({step,at:Date.now(),native:win.isFocused(),content,workArea:screen.getDisplayMatching(content).workArea,sourceScreen:{x:content.x+p.source.x,y:content.y+p.source.y},renderer:await run(selector=>{const source=document.querySelector(selector),original=window.__articulationSourceNode,r=source?.getBoundingClientRect();return{focused:document.hasFocus(),active:document.activeElement?.getAttribute('aria-label'),source:{sameNode:source===original,originalConnected:original?.isConnected,draggable:source?.draggable,disabled:source?.disabled,rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null}}},tile)})};await checkFocus('before-interception');const blurListener=()=>focusEvents.push({event:'native-window-blur',at:Date.now()});win.on('blur',blurListener)
  let intercepted,primaryError,cueInk;const listener=(_event,method,params)=>{if(method==='Input.dragIntercepted')intercepted=params.data}
  win.webContents.debugger.on('message',listener);await win.webContents.debugger.sendCommand('Input.setInterceptDrags',{enabled:true})
  await run(selector=>{window.__articulationPointerTrace=[];window.__articulationSourceNode=document.querySelector(selector);const read=(phase,e)=>{if(window.__articulationPointerTrace.length>=160)return;const button=e.target?.closest?.('button');window.__articulationPointerTrace.push({phase,type:e.type,at:performance.now(),trusted:e.isTrusted,buttons:e.buttons,button:e.button,pointerId:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,prevented:e.defaultPrevented,target:e.target?.tagName,label:button?.getAttribute('aria-label'),sourceTarget:button===window.__articulationSourceNode})};window.__articulationPointerCapture=e=>read('capture',e);window.__articulationPointerBubble=e=>read('bubble',e);for(const type of['pointerdown','pointermove','pointerup','pointercancel','mousedown','mousemove','mouseup']){document.addEventListener(type,window.__articulationPointerCapture,true);document.addEventListener(type,window.__articulationPointerBubble)};window.__articulationDragTrace=[];window.__articulationDropEffects=[];window.__articulationOver=e=>window.__articulationDropEffects.push(e.dataTransfer.dropEffect);document.addEventListener('dragover',window.__articulationOver);window.__articulationDragListener=e=>window.__articulationDragTrace.push({type:e.type,trusted:e.isTrusted,types:Array.from(e.dataTransfer?.types??[])});for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,window.__articulationDragListener,true)},tile)
  const send=(type,p,buttons)=>input.mouse(type,p,buttons)
  try{
   await send('mouseMoved',p.source,0);await checkFocus('source-move');const hover=await run(()=>window.__articulationPointerTrace.filter(e=>e.phase==='capture'&&e.type==='pointermove'&&e.sourceTarget).at(-1));assert(hover&&Math.abs(hover.x-p.source.x)<1&&Math.abs(hover.y-p.source.y)<1,'Native hover reaches the stable source');assert.equal(hover.buttons,0,'A free hover must not claim the left button is already pressed');await send('mousePressed',p.source,1);await checkFocus('source-press');await send('mouseMoved',{x:p.source.x+12,y:p.source.y},1);await checkFocus('threshold-12');await send('mouseMoved',{x:p.source.x+24,y:p.source.y},1);await checkFocus('threshold-24')
   await wait(()=>Boolean(intercepted),'actual browser articulation dragstart',3000);assert(intercepted.items.some(item=>item.mimeType===mime))
   const args={x:p.destination.x,y:p.destination.y,data:intercepted}
   for(const type of ['dragEnter','dragOver'])await input.drag(type,args);await settle()
   assert(await run(()=>Boolean(document.querySelector('.studio-palette-drop-highlight'))));assert(await run(({selector,label})=>document.querySelector(selector).textContent.includes(label),{selector:captionSelector,label:source.score.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).find(b=>b.id===meta.targetMeasureId).number+'마디'}))
   assert(await run(()=>![...document.querySelectorAll('[role="tooltip"]')].some(n=>n.matches(':popover-open')&&n.checkVisibility())),'Native source tooltip yields')
   assert.equal(await run(()=>document.querySelector('.editor-status').textContent),oldStatus,'Hover never executes a score command')
   cueInk=await run(selector=>{
    const note=document.querySelector(selector),frame=document.querySelector('.studio-palette-drop-highlight'),context=document.createElement('canvas').getContext('2d'),m=note.ownerSVGElement?.getScreenCTM(),rect=n=>{const r=n.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}}
    if(!context||!m||!frame)throw Error('Actual cue requires loaded ink and screen transform')
    const primitives=[...note.querySelectorAll('.vf-notehead text,.vf-flag text,.vf-stem path')].filter(n=>n.closest('.vf-stavenote')===note).map(n=>({kind:n.tagName.toLowerCase(),ink:n.tagName.toLowerCase()==='text'?window.__studioQaEventInk.readSvgTextInk(n,context):window.__studioQaEventInk.readSvgShapeInk(n)})).filter(n=>n.ink&&n.ink.width>0&&n.ink.height>0)
    if(!primitives.length)throw Error('No independent principal body ink')
    const points=primitives.flatMap(({ink:b})=>[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}))),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y))
    return{owner:note.dataset.eventId,group:rect(note),frame:rect(frame),expected:{left,top,width:right-left,height:bottom-top},primitives,fonts:document.fonts.status,outline:{width:getComputedStyle(frame).outlineWidth,offset:getComputedStyle(frame).outlineOffset}}
   },destination)
   fs.writeFileSync(path.join(out,`${qaKey}-drag-${width}-${meta.value}-${cancel?'cancel':repeat?'repeat':'apply'}-cue.json`),JSON.stringify(cueInk,null,2)+'\n')
   assert.equal(cueInk.owner,meta.targetEventId);assert.equal(cueInk.fonts,'loaded')
   assert(['left','top','width','height'].every(k=>Math.abs(cueInk.expected[k]-cueInk.frame[k])<1),'Cue frames independent actual principal ink, not hit/em/group bounds')
   if(refused)assert(await run(selector=>document.querySelector(selector).textContent.includes('여러'),captionSelector));const effects=await run(()=>window.__articulationDropEffects);assert(effects.includes(refused?'none':'copy'),'Actual browser dropEffect follows target policy');
   fs.writeFileSync(path.join(out,`${qaKey}-drag-${width}-${meta.value}-${refused?'refused':cancel?'cancel':repeat?'repeat':'apply'}-hover.png`),(await win.webContents.capturePage()).toPNG())
   await input.drag(cancel?'dragCancel':'drop',args);if(cancel)await win.webContents.debugger.sendCommand('Input.cancelDragging');await send('mouseReleased',p.destination,0);await settle()
   const trace=await run(()=>window.__articulationDragTrace);assert(trace.some(e=>e.type==='dragstart'&&e.trusted));if(!cancel&&!refused)assert(trace.some(e=>e.type==='drop'&&e.trusted))
   assert(await run(()=>!document.querySelector('.studio-palette-drop-highlight')))
   const proof={cancel,refused,repeat,cueInk,pair:p,trace,effects,focusEvents,focusChecks,selectionBefore,pointerTrace:await run(()=>window.__articulationPointerTrace)};fs.writeFileSync(path.join(out,`${qaKey}-drag-${width}-${meta.value}-${cancel?'cancel':repeat?'repeat':'apply'}-proof.json`),JSON.stringify(proof,null,2));return proof
  }catch(error){
   primaryError=error
   try{fs.writeFileSync(path.join(out,`drag-failure-${width}-${meta.value}-${cancel?'cancel':'apply'}.json`),JSON.stringify({error:error.stack,pair:p,intercepted,focusEvents,focusChecks,pointerTrace:await run(()=>window.__articulationPointerTrace),trace:await run(()=>window.__articulationDragTrace),focus:await run(()=>({focused:document.hasFocus(),visible:document.visibilityState,active:document.activeElement?.outerHTML?.slice(0,400)}))},null,2))}catch(observationError){results.dragObservationErrors??=[];results.dragObservationErrors.push({primary:String(error),observation:String(observationError)})}
   throw error
  }finally{
   await input.cleanup(p.destination,primaryError,[
    ()=>win.off('blur',blurListener),
    ()=>win.webContents.debugger.off('message',listener),
    ()=>win.webContents.debugger.sendCommand('Input.setInterceptDrags',{enabled:false}),
    ()=>run(()=>{for(const type of['pointerdown','pointermove','pointerup','pointercancel','mousedown','mousemove','mouseup']){document.removeEventListener(type,window.__articulationPointerCapture,true);document.removeEventListener(type,window.__articulationPointerBubble)}delete window.__articulationSourceNode;document.removeEventListener('dragover',window.__articulationOver);for(const type of ['dragstart','dragover','drop','dragend'])document.removeEventListener(type,window.__articulationDragListener,true)})
   ])
  }
 }

 const save=async(name)=>{const f=path.join(out,name);setSave(f);await menu('파일','프로젝트 다른 이름으로 저장');await waitNativeProjectCompletion(f);return JSON.parse(fs.readFileSync(f,'utf8'))}
 for(const width of widths)for(const id of values){
  setStage(`${qaKey}-drag-${width}-${id}-open`);win.setSize(width,1000);const workArea=require('electron').screen.getDisplayMatching(win.getBounds()).workArea,bounds=win.getBounds();assert(bounds.width<=workArea.width&&bounds.height<=workArea.height,'Owned native drag window must fit the physical work area');win.setPosition(workArea.x+Math.floor((workArea.width-bounds.width)/2),workArea.y+Math.floor((workArea.height-bounds.height)/2));nativeTheme.themeSource='light'
  sourceFile=path.join(fixtures,id+fixtureSuffix+'-source.chromatics');source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));expected=JSON.parse(fs.readFileSync(path.join(fixtures,id+fixtureSuffix+'-expected.chromatics'),'utf8'));meta=JSON.parse(fs.readFileSync(path.join(fixtures,id+fixtureSuffix+'.json'),'utf8'));originalHash=sha(sourceFile);destination=event(meta.targetEventId);tile=`#studio-palette button[aria-label="${names[id]} 적용 또는 해제"]`
  const prefix=`${qaKey}-drag-${width}-${id}`,owned=path.join(out,prefix+'-source.chromatics');fs.copyFileSync(sourceFile,owned,fs.constants.COPYFILE_EXCL);setOpen(owned);await menu('파일','프로젝트 열기');await wait(()=>run(name=>document.querySelector('.studio-status__result')?.textContent.includes(name),path.basename(owned)),'owned articulation source')
  const sourceSelection=await clickNote(event(meta.firstEventId));await menu('추가','표기 팔레트 열기');if(!await run(selector=>document.querySelector(selector)?.checkVisibility(),tile))await button(family)
  if(phase==='all'&&id===values[0]){
   for(const theme of ['light','dark'])for(const condition of ['fine','coarse','text200']){
    nativeTheme.themeSource=theme;await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:condition==='coarse',maxTouchPoints:1});const dockWidth={fine:207,coarse:280,text200:360}[condition];await button('팔레트 도크 설정');await fill('input[aria-label="팔레트 도크 폭"]',String(dockWidth));await key('Escape')
    const caption=captionSelector,baseFont=await run(sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize),caption)
    if(condition==='text200')await run(({caption,baseFont})=>document.querySelector(caption).style.fontSize=baseFont*2+'px',{caption,baseFont})
    await point(tile,undefined,'nearest');const g=await run(({names,caption})=>{const p=document.querySelector('#studio-palette'),f=p.querySelector(`button[aria-label="${Object.values(names)[0]} 적용 또는 해제"]`).closest('section'),c=document.querySelector(caption);return{tiles:Object.values(names).map(label=>{const n=p.querySelector(`button[aria-label="${label} 적용 또는 해제"]`),r=n.getBoundingClientRect();return{label,x:r.x,y:r.y,w:r.width,h:r.height,draggable:n.draggable}}),width:innerWidth,font:parseFloat(getComputedStyle(c).fontSize),coarse:matchMedia('(pointer:coarse)').matches,overflow:p.scrollWidth>p.clientWidth+1||f.scrollWidth>f.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1}},{names,caption});assert(!g.overflow);for(const t of g.tiles){assert(t.draggable&&t.x>=0&&t.x+t.w<=g.width+1);if(condition==='coarse')assert(g.coarse&&t.h>=48&&t.w>=48)}if(condition==='text200')assert.equal(g.font,baseFont*2);density.push({width,theme,condition,dockWidth,...g});record();fs.writeFileSync(path.join(out,`${qaKey}-density-${width}-${theme}-${condition}.png`),(await win.webContents.capturePage()).toPNG());await run(sel=>document.querySelector(sel).style.removeProperty('font-size'),caption);await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false})
   }
   nativeTheme.themeSource='light';await button('팔레트 도크 설정');await fill('input[aria-label="팔레트 도크 폭"]','200');await key('Escape');await point(tile,undefined,'nearest');assert(await run(()=>JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')).palette===200&&document.querySelector('#studio-palette').scrollWidth<=document.querySelector('#studio-palette').clientWidth+1));await button('팔레트 도크 설정');await fill('input[aria-label="팔레트 도크 폭"]','280');await key('Escape')
  }
  const canceled=await drag(width,true);assert.deepEqual((await save(prefix+'-cancel.chromatics')).score,source.score)
  const applied=await drag(width,false);assert(await run(()=>document.querySelector('.editor-status').textContent.includes('1회 수정')));assert(await run(selector=>document.querySelector(selector).classList.contains('is-selected'),destination))
  const native=prefix+'.chromatics',changed=await save(native);assert.deepEqual(changed.score,expected.score)
  const repeated=await drag(width,false,false,true);assert(await run(()=>document.querySelector('.editor-status').textContent.includes('1회 수정')))
  await key('z',['meta']);assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),applied.selectionBefore);assert.deepEqual((await save(prefix+'-undo.chromatics')).score,source.score)
  await key('z',['meta','shift']);assert.deepEqual((await save(prefix+'-redo.chromatics')).score,changed.score)
  const reopenName=prefix+'-reopen-copy.chromatics',reopenPath=path.join(out,reopenName);fs.copyFileSync(path.join(out,native),reopenPath,fs.constants.COPYFILE_EXCL);assert.equal(sha(reopenPath),sha(path.join(out,native)))
  setOpen(reopenPath);await menu('파일','프로젝트 열기');await wait(()=>run(name=>document.querySelector('.studio-status__result')?.textContent.includes(name),reopenName),'unique articulation native reopened')
  assert.deepEqual((await save(prefix+'-reopened.chromatics')).score,changed.score,'Actual reopened model preserves event ownership')
  await menu('파일','내보내기 설정')
  for(const [ext,label] of [['structured.musicxml','MusicXML 내보내기'],['expanded.musicxml','반복 펼치기 MusicXML 내보내기'],['mid','MIDI 내보내기'],['pdf','PDF 변환']]){setStage(prefix+'-export-'+ext);const f=path.join(out,prefix+'.'+ext);setSave(f);await button(label);await wait(()=>fs.existsSync(f),'actual articulation output');await wait(()=>run(name=>document.querySelector('.studio-status__result')?.textContent.includes(name),path.basename(f)),'articulation output ownership')}
  if(options.verifyXmlReopen&&id===values[0]){
   setStage(prefix+'-xml-reopen');const xml=path.join(out,prefix+'.structured.musicxml');setOpen(xml);await menu('파일','MusicXML 가져오기');await wait(()=>run(name=>document.querySelector('.studio-status__result')?.textContent.includes(name),path.basename(xml)),'actual ornament XML imported')
   const reopened=await save(prefix+'-xml-reopened.chromatics'),marks=score=>score.parts.map(p=>p.staves.map(s=>s.measures.map(b=>b.voices.map(v=>v.events.map(e=>e.type==='note'?e.ornaments??[]:[])))))
   assert.deepEqual(marks(reopened.score),marks(expected.score),'Actual XML import preserves every ornament array order')
   const marked=reopened.score.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(b=>b.voices).flatMap(v=>v.events).filter(e=>e.type==='note'&&e.ornaments?.length)
   assert(await run(marked=>marked.every(e=>document.querySelector(`.notation-ornament[data-ornament-event-id="${e.id}"]`)?.textContent===e.ornaments.map(k=>window.__studioQaEventInk.ornamentGlyphs[k]).join(' ')),marked),'Actual renderer keeps imported visible glyph order')
   fs.writeFileSync(path.join(out,prefix+'-xml-reopened.png'),(await win.webContents.capturePage()).toPNG());await menu('파일','내보내기 설정');const pdf=path.join(out,prefix+'-xml-reopened.pdf');setSave(pdf);await button('PDF 변환');await wait(()=>fs.existsSync(pdf),'reimported ornament PDF');await wait(()=>run(name=>document.querySelector('.studio-status__result')?.textContent.includes(name),path.basename(pdf)),'reimported PDF completion')
  }
  assert.equal(sha(owned),originalHash);assert.equal(sha(sourceFile),originalHash);cases.push({width,id,sourceSelection,canceled,applied,repeated,originalHash,nativeSha256:sha(path.join(out,native)),oneUndoRedo:true,eventSelected:true,nativeReopen:true});record()
 }
 await menu('도움말','사용설명서');await button('표기와 표현');assert(await run(needle=>document.querySelector('.studio-manual__article').textContent.includes(needle),options.manualNeedle??'끌어'));await key('Escape')
 assert.equal(cases.length,widths.length*values.length,'Every requested functional case must finish')
 results.actions.push({stage:qaKey+'-drag',phase,requestedWidths:widths,requestedValues:values,fixtureSuffix,cases,density,scope:values.length+' requested event-level '+qaKey+' additions with actual browser drag; legacy click toggle retained; no individual grace/chord-member model; density approved only for recorded all-phase conditions'})
}
