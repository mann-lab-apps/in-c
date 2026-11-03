// Owned production QA. Reuses the warning runner's real input, capture and IPC.
// Delayed/injected bookkeeping is not an OS permission or physical input test.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
module.exports = async function auditRecentWarningFocus(q) {
  const { win, source, out, run, settle, wait, key, click, capture, save, notation, scaleText, nativeTheme } = q
  const fixture = path.join(source, 'many'), original = JSON.parse(fs.readFileSync(path.join(fixture, 'source.chromatics'))).score
  const edited = JSON.parse(fs.readFileSync(path.join(fixture, 'edited.chromatics'))).score, meta = JSON.parse(fs.readFileSync(path.join(fixture, 'meta.json')))
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-late-recent-input-'))
  const input = path.join(directory, '가'.repeat(80) + 'aa.musicxml'), raw = 'EACCES: owned delayed recent-index failure /owned/recent-index.json'
  assert.equal(Buffer.byteLength(path.basename(input)), 251)
  fs.writeFileSync(input, fs.readFileSync(path.join(fixture, 'source.musicxml'))); q.setInput(input)
  const rows = [], tabs = []
  const tabTo = async (fn, arg, reverse = false) => {
    const start = Date.now(); let count = 0
    while (!await run(fn, arg)) { assert(count < 180 && Date.now() - start < 15000, 'Public keyboard destination not reached'); await key('Tab', reverse ? ['shift'] : []); count++ }
    tabs.push({ count, reverse }); await settle()
  }
  const state = () => run(() => {
    const report = document.querySelector('[aria-label="MusicXML 경고 상세"]'), target = window.__ownedRecentFocusTarget
    const footer = document.querySelector('.studio-status').getBoundingClientRect(), b = target.getBoundingClientRect()
    const summary = report.querySelector('.studio-warning-report__details .dd-accordion > button')
    return { focused: document.activeElement === target, connected: target.isConnected, owner: target.contains(document.elementFromPoint(Math.round(b.left+b.width/2),Math.round(b.top+b.height/2))),
      focusVisible: target.matches(':focus-visible'), target: { top:b.top,bottom:b.bottom,height:b.height }, footer:{top:footer.top,height:footer.height,bottom:footer.bottom},
      summary:summary.getAttribute('aria-expanded'), technical:[...report.querySelectorAll('.studio-warning-technical button')].map(n=>n.getAttribute('aria-expanded')),
      warnings:report.querySelectorAll('.studio-warning-report__list > li').length, selected:[...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n=>n.dataset.eventId),
      dirty:document.querySelector('.studio-document__state').textContent.trim(),status:document.querySelector('.editor-status').textContent,
      overflow:document.documentElement.scrollWidth>innerWidth,coarse:matchMedia('(pointer:coarse)').matches,font:parseFloat(getComputedStyle(target).fontSize) }
  })
  const visible = s => { assert(s.focused && s.connected && s.owner && s.focusVisible); assert(s.target.top>=0 && s.target.bottom<=s.footer.top && s.target.height>=48); assert(s.coarse && s.font>=28 && !s.overflow) }
  for (const width of q.probe ? [960] : [960,1400]) for (const target of q.probe ? ['summary'] : ['summary','technical']) for (const outcome of q.probe ? ['failure'] : ['success','failure']) {
    const name=`${width}-${target}-${outcome}`, scene=path.join(out,name);fs.mkdirSync(scene,{recursive:true});q.setCase(name,scene);console.log('START',name);tabs.length=0
    nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
    await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});require('electron').app.focus({steal:true});win.focus();await settle()
    if(!win.webContents.debugger.isAttached())win.webContents.debugger.attach('1.3')
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true});q.deferRecent(true)
    await click('파일');await click('MusicXML 가져오기');await wait(()=>Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]')))
    assert(q.pendingRecent(),'Owned recent-index request must actually be pending')
    await click('악보로 이동');assert.equal(await run(()=>document.activeElement?.getAttribute('data-event-id')),meta.eventId);await key('T')
    const ink=await notation();await scaleText();await settle();assert.deepEqual(await notation(),ink)
    await tabTo(()=>document.activeElement===document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-report__details .dd-accordion > button'),undefined,true)
    if(target==='technical'){
      await key('Enter');await tabTo(()=>document.activeElement===[...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button')].at(-1))
      await key('Enter');await scaleText();await settle()
    }
    await run(()=>{window.__ownedRecentFocusTarget=document.activeElement});const before=await state();visible(before);assert.equal(before.warnings,16);assert.equal(before.dirty,'저장하지 않은 변경');assert(before.status.includes('1회 수정'));assert.deepEqual(before.selected,[meta.eventId]);await capture('pending')
    const pending=q.pendingRecent();q.deferRecent(false)
    if(outcome==='failure')pending.reject(Error(raw));else pending.resolve([])
    if(outcome==='failure')await wait(()=>Boolean(document.querySelector('[aria-label="최근 악보 목록 기술 정보"]')))
    await settle();await scaleText();await settle();const after=await state();visible(after)
    for(const k of ['selected','dirty','summary','technical','warnings'])assert.deepEqual(after[k],before[k],k)
    assert(after.status.includes('1회 수정')&&after.status.includes('정지'));assert.deepEqual(await notation(),ink);await capture('completed')
    let detailRead
    if(outcome==='failure'){
      assert(after.status.includes('열린 악보는 사용할 수 있습니다.')&&!/EACCES|\/owned\//.test(after.status))
      assert(await run(()=>!document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      await click('악보로 이동');await tabTo(()=>document.activeElement===document.querySelector('[aria-label="최근 악보 목록 기술 정보"] button'))
      await key('Enter');await scaleText();await settle()
      const tail=()=>run(raw=>{
        const group=document.querySelector('[aria-label="최근 악보 목록 기술 정보"]'),content=group.querySelector('.studio-warning-technical__content'),text=content.lastElementChild.lastChild
        if(!content.checkVisibility()||!content.textContent.includes(raw))throw Error('Complete original recent-index diagnostic required')
        const range=document.createRange();range.setStart(text,text.length-1);range.setEnd(text,text.length);const r=range.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth
        for(let a=text.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),b=a.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)};if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}}
        const f=group.closest('.studio-status').getBoundingClientRect();return {visible:r.top>=top&&r.bottom<=bottom&&r.left>=left&&r.right<=right,top:r.top,bottom:r.bottom,clipTop:top,clipBottom:bottom,wheel:{x:Math.round(f.left+20),y:Math.round(f.top+25)},focus:document.activeElement===group.querySelector('button')}
      },raw)
      const first=await tail();let last=first,wheels=0
      while(!last.visible&&wheels<14){win.webContents.sendInputEvent({type:'mouseMove',...last.wheel});win.webContents.sendInputEvent({type:'mouseWheel',...last.wheel,deltaX:0,deltaY:-180,canScroll:true});await settle();last=await tail();wheels++}
      assert(last.visible&&last.focus);detailRead={first,last,wheels};await capture('recent-detail');await key('Space')
      assert(await run(()=>!document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      await tabTo(()=>document.activeElement===window.__ownedRecentFocusTarget,undefined,true);visible(await state());await capture('report-return')
    }else assert(await run(()=>!document.querySelector('[aria-label="최근 악보 목록 기술 정보"]')))
    assert.deepEqual((await save('edited')).score,edited)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo')).score,original)
    await click('악보로 이동');await key('Z',['control']);assert.deepEqual((await save('undo-noop')).score,original)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,edited)
    await click('악보로 이동');await key('Z',['control','shift']);assert.deepEqual((await save('redo-noop')).score,edited)
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');assert.deepEqual(fs.readFileSync(path.join(scene,'converted.mid')),fs.readFileSync(path.join(fixture,'edited.mid')))
    await click('MusicXML 내보내기');assert.deepEqual(fs.readFileSync(path.join(scene,'fresh.musicxml')),fs.readFileSync(path.join(fixture,'edited-converted.musicxml')))
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')));assert.deepEqual((await save('after-output')).score,edited)
    await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual((await save('reopened')).score,edited)
    assert.deepEqual(fs.readFileSync(input),fs.readFileSync(path.join(fixture,'source.musicxml')))
    rows.push({width,target,outcome,before,after,detailRead,tabs:[...tabs],fileNameBytes:251,oneCommandHistoryAndNative:true,glyphMetricsExact:true,convertedOutputsExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))
    await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()
  }
  console.log('PASS',rows.length,'delayed recent-index result/report-focus workflows;owned IPC,not OSpermissions or physical input')
}
