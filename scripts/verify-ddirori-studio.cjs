// Actual built renderer in isolated Electron; no product files or user profile.
const { app, BrowserWindow, nativeTheme } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddirori-electron-'))
app.setPath('userData', profile)
// Software compositing also supports capturePage under Linux Xvfb runners.
app.disableHardwareAcceleration()
const r2 = process.argv.includes('--r2')
const out = path.resolve(process.env.DDIRORI_STUDIO_QA_OUT || path.resolve(__dirname, r2 ? '../out/ddirori/studio-r2-renderer' : '../out/ddirori/product-design-r1'))
async function focusWindow(win) {
  app.focus({steal:true})
  win.focus()
  await win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    if (document.hasFocus()) return resolve();
    const done = () => { clearTimeout(timeout); window.removeEventListener('focus', done); resolve(); };
    const timeout = setTimeout(() => { window.removeEventListener('focus', done); reject(new Error('Studio QA window focus precondition failed')); }, 2000);
    window.addEventListener('focus', done);
  })`)
}
app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1200,height:1000,show:true,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}})
  try {
    await win.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), {query:{fixture:'release-test'}})
    await focusWindow(win)
    const result = await win.webContents.executeJavaScript(`(async () => {
      const pause = () => new Promise(r => setTimeout(r, 100));
      const button = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent.trim()) === label);
      button('표기 객체').click(); await pause();
      const objects = document.querySelector('[aria-label="표기 객체 선택"]');
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      set.call(objects, [...objects.options].find(o => o.value.startsWith('hairpin:')).value);
      objects.dispatchEvent(new Event('change',{bubbles:true})); await pause();
      document.querySelector('.span-properties__geometry summary').click();
      const input = document.querySelector('input[aria-label="표기 세로 이동"]');
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0');
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true})); await pause();
      input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); input.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); input.blur(); await pause();
      const committed = input.value;
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ',key:'z',ctrlKey:true,bubbles:true})); await pause();
      const panel = document.querySelector('.span-properties');
      return {committed, undone:input.value, host:panel.classList.contains('ddirori'),
        font:getComputedStyle(input).fontFamily, height:input.getBoundingClientRect().height,
        popover:'showPopover' in HTMLElement.prototype, dialog:'showModal' in HTMLDialogElement.prototype,
        panelWidth:panel.getBoundingClientRect().width, overflow:panel.scrollWidth > panel.clientWidth+1};
    })()`)
    assert.equal(result.committed, '0')
    assert.equal(result.undone, '')
    assert.equal(result.host, true)
    assert.equal(result.overflow, false)
    assert.ok(result.popover && result.dialog && result.height >= 32)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))')
    fs.mkdirSync(out,{recursive:true})
    fs.writeFileSync(path.join(out,'studio-electron.png'),(await win.webContents.capturePage()).toPNG())
    fs.writeFileSync(path.join(out,'studio-electron.json'),JSON.stringify({at:new Date().toISOString(),versions:process.versions,result,scope:'Built product renderer; fixture, isolated userData, no file/audio bridge. Native history and shared CSS verified; no physical IME or OS accessibility claims.'},null,2))
    console.log('Studio Electron shared panel and single undo passed',result)
    await verifyR1(win)
    if (r2) await verifyR2(win)
  } finally {
    win.destroy()
    app.quit()
  }
}).catch(error => {console.error(error);app.exit(1)})

async function verifyR1(win) {
  const run = async (fn, arg) => {
    await focusWindow(win)
    return win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg) ?? ''})`)
  }
  const pause = () => new Promise(resolve => setTimeout(resolve, 150))
  const click = async label => {
    await run(label => {
      const button = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent.trim()) === label)
      if (!button || !button.checkVisibility() || button.disabled) throw new Error(`Unavailable command: ${label}`)
      button.click()
    }, label)
    await pause()
  }
  const change = async (label, value) => {
    await run(({label, value}) => {
      const el = document.querySelector(`[aria-label="${label}"]`)
      if (!el || !el.checkVisibility() || el.disabled) throw new Error(`Unavailable field: ${label}`)
      el.focus()
      const prototype = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value)
      el.dispatchEvent(new Event('input', {bubbles:true}))
      el.dispatchEvent(new Event('change', {bubbles:true}))
    }, {label, value})
    await pause()
  }
  const capture = async name => {
    await run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(resolve))))
    const frame=await win.webContents.capturePage()
    fs.writeFileSync(path.join(out, `${name}.png`), frame.toPNG())
    return frame
  }
  // Bridge fixture records real serializer output. It does not simulate an OS dialog.
  await run(() => {
    window.studioQA = {native:[], xml:[], fail:false}
    const result = extension => ({filePath:`/fixture/studio.${extension}`, fileName:`studio.${extension}`})
    window.inC = {
      project: {
        save: async request => {
          window.studioQA.native.push(request.contents)
          if (window.studioQA.hold) await new Promise(resolve => {window.studioQA.release = resolve})
          if (window.studioQA.fail) throw new Error('R1 disk unavailable')
          return result('chromatics')
        },
        open: async () => ({...result('chromatics'), contents:window.studioQA.native.at(-1)})
      },
      musicXml: {save:async request => {window.studioQA.xml.push(request.contents); return result('musicxml')}},
      recentMusicXml: {add:async () => [], list:async () => []},
      autosave: {clear:async () => {}, read:async () => undefined, write:async () => {}}
    }
  })
  await click('파일')
  await click('프로젝트 저장')
  await click('MusicXML로 저장')
  const original = await run(() => ({native:window.studioQA.native.at(-1), xml:window.studioQA.xml.at(-1)}))
  fs.writeFileSync(path.join(out, 'initial.chromatics'), original.native)
  fs.writeFileSync(path.join(out, 'initial.musicxml'), original.xml)
  fs.writeFileSync(path.join(out, 'before-workspace.pdf'), await win.webContents.printToPDF({printBackground:true, pageSize:'A4'}))
  const screens = []
  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme
    for (const width of [207, 280, 360]) {
      win.setContentSize(1400, 1000)
      await pause()
      await change('팔레트 도크 폭', String(width))
      await change('속성 도크 폭', String(width))
      await click('표기 객체')
      await change('표기 객체 선택', '')
      const reference = await run(() => [...document.querySelector('[aria-label="표기 객체 선택"]').options].find(o => o.value.startsWith('hairpin:')).value)
      await change('표기 객체 선택', reference)
      await run(() => {
        const details = document.querySelector('.span-properties__geometry')
        if (!details.open) details.querySelector('summary').click()
        window.scrollTo(0, document.querySelector('.docked-workspace').offsetTop - 16)
      })
      const metrics = await run(() => {
        const dock = document.querySelector('.docked-properties'), panel = document.querySelector('.span-properties')
        const box = dock.getBoundingClientRect()
        return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,dock:box.width,theme:panel.dataset.theme,
          overflow:panel.scrollWidth > panel.clientWidth+1,documentOverflow:document.documentElement.scrollWidth > innerWidth+1,
          inputHeight:panel.querySelector('input').getBoundingClientRect().height,
          paperFont:getComputedStyle(document.querySelector('.notation-preview')).fontFamily,
          background:getComputedStyle(panel).backgroundColor}
      })
      assert.equal(metrics.dock, width)
      assert.equal(metrics.theme, theme)
      assert.equal(metrics.overflow, false)
      assert.equal(metrics.documentOverflow, false)
      await capture(`span-${theme}-${width}`)
      screens.push({file:`span-${theme}-${width}.png`,...metrics})
    }
  }
  nativeTheme.themeSource = 'light'
  await click('파일')
  await run(() => window.scrollTo(0,0))
  const fileMetrics=await run(()=>{
    const toolbar=document.querySelector('header.toolbar')
    const read=node=>({rect:node.getBoundingClientRect().toJSON(),display:getComputedStyle(node).display,
      color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor,
      scrollLeft:node.scrollLeft,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth})
    return {toolbar:read(toolbar),group:read(toolbar.querySelector('.toolbar__group')),file:read(toolbar.querySelector('.file-actions')),
      button:read(document.querySelector('[aria-label="프로젝트 저장"]'))}
  })
  const fileFrame=await capture('file-light-1400')
  const pixels=fileFrame.toBitmap()
  const scale=Math.sqrt(pixels.length/4/(1400*1000))
  const stride=Math.round(1400*scale)
  const box=fileMetrics.file.rect
  let ink=0
  for(let y=Math.ceil(box.top*scale);y<Math.floor(box.bottom*scale);y++)
    for(let x=Math.ceil(box.left*scale);x<Math.floor(box.right*scale);x++) {
      const offset=(y*stride+x)*4
      if(pixels[offset]<140 && pixels[offset+1]<140 && pixels[offset+2]<140) ink++
    }
  fs.writeFileSync(path.join(out,'file-toolbar-metrics.json'),JSON.stringify({...fileMetrics,ink},null,2))
  assert.ok(ink>200,'Visible file controls must paint pixels, not just have DOM boxes')
  await click('프로젝트 저장')
  await click('MusicXML로 저장')
  const unchanged = await run(() => ({native:window.studioQA.native.at(-1),xml:window.studioQA.xml.at(-1)}))
  assert.equal(unchanged.xml, original.xml, 'Workspace must not change MusicXML')
  // Native envelopes have save timestamps, compare their score payload instead.
  assert.deepEqual(JSON.parse(unchanged.native).score, JSON.parse(original.native).score)
  fs.writeFileSync(path.join(out, 'after-workspace.pdf'), await win.webContents.printToPDF({printBackground:true, pageSize:'A4'}))
  await click('프로젝트 열기')
  await click('표기 객체')
  await change('표기 객체 선택', '')
  await run(() => window.scrollTo(0, document.querySelector('.docked-workspace').offsetTop))
  await capture('no-span-selection')
  const reference = await run(() => [...document.querySelector('[aria-label="표기 객체 선택"]').options].find(o => o.value.startsWith('hairpin:')).value)
  await change('표기 객체 선택', reference)
  await run(() => {
    const details = document.querySelector('.span-properties__geometry')
    if (!details.open) details.querySelector('summary').click()
    document.querySelector('[aria-label="표기 세로 이동"]').focus()
  })
  await change('표기 세로 이동', '3')
  await run(() => {
    const input = document.querySelector('[aria-label="표기 세로 이동"]')
    input.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true, data:'한'}))
    input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', code:'Enter', isComposing:true, keyCode:229, bubbles:true}))
  })
  assert.equal(await run(() => document.activeElement.getAttribute('aria-label')), '표기 세로 이동')
  await run(() => {
    const input = document.querySelector('[aria-label="표기 세로 이동"]')
    input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한'}))
    input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
  })
  await change('표기 세로 이동', '99')
  await run(() => {
    const input = document.querySelector('[aria-label="표기 세로 이동"]')
    input.focus(); input.blur()
  })
  await pause()
  assert.equal(await run(() => document.querySelector('[aria-label="표기 세로 이동"]').getAttribute('aria-invalid')), 'true')
  await capture('invalid-geometry')
  await run(() => document.querySelector('[aria-label="표기 세로 이동"]').focus())
  await change('표기 세로 이동', '0')
  await run(() => document.querySelector('[aria-label="표기 세로 이동"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})))
  await pause()
  await run(() => {window.studioQA.fail = true; window.studioQA.hold = true; window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyS',ctrlKey:true,bubbles:true}))})
  await pause()
  assert.equal(await run(() => document.querySelector('.studio-document [role="status"]').textContent), '저장 중')
  assert.equal(await run(() => document.querySelector('[aria-label="MusicXML로 저장"]').disabled), true)
  await run(() => window.scrollTo(0,0))
  await capture('save-pending')
  await run(() => {window.studioQA.hold = false; window.studioQA.release()})
  await pause()
  const failed = await run(() => ({value:document.querySelector('[aria-label="표기 세로 이동"]').value,
    selected:document.querySelector('[aria-label="표기 객체 선택"]').value,
    dirty:document.querySelector('.studio-document [role="status"]').textContent,
    error:document.querySelector('.editor-status').textContent}))
  assert.equal(failed.value, '0')
  assert.equal(failed.selected, reference)
  assert.equal(failed.dirty, '저장하지 않은 변경')
  assert.match(failed.error, /R1 disk unavailable/)
  await run(() => window.scrollTo(0,0))
  await capture('save-failure')
  await run(() => window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ',ctrlKey:true,bubbles:true})))
  await pause()
  assert.equal(await run(() => document.querySelector('[aria-label="표기 세로 이동"]').value), '')
  await run(() => {window.studioQA.fail = false})
  await click('파일')
  await click('프로젝트 저장')
  assert.equal(await run(() => document.querySelector('.studio-document [role="status"]').textContent), '변경 없음')
  await capture('save-retry-success')
  await click('표기 객체')
  await click('속성 도크 닫기')
  assert.equal(await run(() => document.activeElement.getAttribute('aria-label')), '속성 표시')
  await click('속성 표시')
  win.webContents.debugger.attach('1.3')
  await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', {enabled:true})
  await pause()
  const touch = await run(() => ({coarse:matchMedia('(pointer: coarse)').matches,
    inputHeight:document.querySelector('[aria-label="표기 세로 이동"]').getBoundingClientRect().height,
    closeHeight:document.querySelector('[aria-label="속성 도크 닫기"]').getBoundingClientRect().height}))
  assert.equal(touch.coarse, true)
  assert.ok(touch.inputHeight >= 48 && touch.closeHeight >= 48)
  await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', {enabled:false})
  win.webContents.debugger.detach()
  for (const scale of [1, 2]) {
    win.setContentSize(960, 1000)
    await pause()
    if (scale === 2) await run(() => {
      const nodes = [...document.querySelectorAll('.studio-chrome, .studio-chrome *')]
      const sizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize))
      nodes.forEach((node,index) => { node.style.fontSize = `${sizes[index]*2}px` })
    })
    await run(() => window.scrollTo(0,0))
    await capture(`narrow-text-${scale}`)
    assert.equal(await run(() => document.documentElement.scrollWidth > innerWidth+1), false)
    if (scale === 2) {
      await click('파일')
      await capture('file-text-2')
      assert.equal(await run(() => {
        const group = document.querySelector('.file-actions'), box = group.getBoundingClientRect()
        return [...group.querySelectorAll('button')].every(button => {
          const b = button.getBoundingClientRect()
          return b.left >= box.left-1 && b.right <= box.right+1 && b.bottom <= box.bottom+1
        })
      }), true)
    }
  }
  fs.writeFileSync(path.join(out,'r1-results.json'),JSON.stringify({versions:process.versions,screens,failed,touch,
    nativeScoreUnchanged:true,musicXmlUnchanged:true,scope:'Synthetic DOM/bridge fixture. No OS dialogs, physical IME, or screen reader certification.'},null,2))
  console.log('R1 dock/theme/text/save/native/XML matrix passed')
}

async function verifyR2(win) {
  const run = async (fn,arg) => {
    await focusWindow(win)
    return win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg) ?? ''})`)
  }
  const settle = () => run(() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const click = async label => {
    await run(label=>{
      const button=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===label)
      if (!button || button.disabled || !button.checkVisibility()) throw Error(`R2 command unavailable: ${label}`)
      button.click()
    },label)
    await settle()
  }
  const width = async value => {
    await run(value=>{
      for (const label of ['팔레트 도크 폭','속성 도크 폭']) {
        const input=document.querySelector(`[aria-label="${label}"]`)
        input.focus()
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value))
        input.dispatchEvent(new Event('input',{bubbles:true}))
        input.dispatchEvent(new Event('change',{bubbles:true}))
      }
    },value)
    await settle()
  }
  const capture=async name=>fs.writeFileSync(path.join(out,`${name}.png`),(await win.webContents.capturePage()).toPNG())
  const metrics=()=>run(()=>{
    const svg=document.querySelector('.notation-preview svg'), node=document.querySelector('.notation-event.is-selected')
    const rect=node?.getBoundingClientRect()
    const canvas=document.querySelector('.score-canvas')
    return {mode:canvas.dataset.notationSizing,viewport:[innerWidth,innerHeight],
      svg:[Number(svg.getAttribute('width')),Number(svg.getAttribute('height'))],
      selected:node?.dataset.eventId,address:node?[node.dataset.partId,node.dataset.staffId,node.dataset.measureId,node.dataset.voiceId]:null,
      anchor:rect?{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}:null,
      canvasScroll:canvas.scrollLeft,windowScroll:scrollY,focused:document.activeElement?.dataset.eventId,
      focusedControl:document.activeElement?.getAttribute('aria-label'),
      focusedControlBox:document.activeElement?.getBoundingClientRect().toJSON(),
      input:document.querySelector('[aria-label="다음 입력 설정"]')?.textContent,
      inputAddress:document.querySelector('.studio-edit-context output')?.textContent,
      inputActive:document.querySelector('[aria-label="다음 입력"]')?.dataset.inputActive,
      overflow:document.documentElement.scrollWidth>innerWidth+1}
  })
  await win.loadFile(path.resolve(__dirname,'../out/renderer/index.html'),{query:{fixture:'release-test'}})
  await settle()
  await run(()=>{
    window.r2QA={native:[],xml:[]}
    const result=extension=>({filePath:`/fixture/r2.${extension}`,fileName:`r2.${extension}`})
    window.inC={project:{
      save:async request=>{window.r2QA.native.push(request.contents);return result('chromatics')},
      open:async()=>({...result('chromatics'),contents:window.r2QA.native.at(-1)})},
      musicXml:{save:async request=>{window.r2QA.xml.push(request.contents);return result('musicxml')}},
      recentMusicXml:{add:async()=>[],list:async()=>[]},autosave:{clear:async()=>{},write:async()=>{},read:async()=>undefined},
      pdf:{save:request=>new Promise(resolve=>{window.r2QA.pdf=request;window.r2QA.finishPdf=resolve})}}
  })
  await click('파일'); await click('프로젝트 저장'); await click('MusicXML로 저장')
  const original=await run(()=>({native:window.r2QA.native.at(-1),xml:window.r2QA.xml.at(-1)}))
  const exportPdf=async name=>{
    await click('내보내기'); await click('PDF 변환')
    await run(()=>new Promise((resolve,reject)=>{
      const start=performance.now()
      const check=()=>window.r2QA.pdf && document.querySelector('[data-print-scale]') ? resolve() : performance.now()-start>4000 ? reject(Error('PDF export scene did not render')) : requestAnimationFrame(check)
      check()
    }))
    await settle()
    fs.writeFileSync(path.join(out,`${name}.pdf`),await win.webContents.printToPDF({preferCSSPageSize:true,printBackground:true}))
    await run(()=>{window.r2QA.pdf=undefined;window.r2QA.finishPdf({fileName:'r2.pdf'})})
    await settle()
  }
  await exportPdf('r2-export-before')
  await click('음표')
  await click('폭 맞춤')
  win.setContentSize(1400,1000); await settle()
  const selectedId=await run(()=>{
    const events=[...document.querySelectorAll('.notation-event[role="button"]')]
    const node=events[Math.floor(events.length/2)]
    node.scrollIntoView({block:'center'}); node.focus(); return node.dataset.eventId
  })
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'})
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'})
  await settle()
  const before=await metrics()
  assert.equal(before.selected,selectedId)
  assert.equal(before.focused,selectedId,'Keyboard-selected SVG note must retain focus after redraw')
  win.setContentSize(960,1000); await settle()
  const reflow=await metrics()
  assert.equal(reflow.focused,selectedId,'Canvas keyboard focus must survive responsive reflow')
  assert.ok(reflow.anchor.top>=0 && reflow.anchor.bottom<=1000,'Focused score anchor must remain in the viewport')
  win.setContentSize(1400,1000); await settle()
  const records=[]
  for (const mode of ['fit-width','fixed']) {
    await click(mode==='fixed'?'고정 배율':'폭 맞춤')
    if (mode==='fixed') {
      await run(()=>document.querySelector('[role="combobox"]').click())
      await settle()
      await run(()=>[...document.querySelectorAll('[role="option"]')].find(node=>node.textContent.trim()==='150%').click())
      await settle()
    }
    for (const viewport of [1400,960]) {
      win.setContentSize(viewport,1000); await settle()
      for (const size of [207,280,360]) {
        await width(size)
        const state=await metrics()
        records.push({size,...state})
        assert.equal(state.selected,selectedId)
        assert.deepEqual(state.address,before.address)
        assert.equal(state.overflow,false)
        assert.equal(state.focusedControl,'속성 도크 폭')
        assert.ok(state.focusedControlBox.top>=0 && state.focusedControlBox.bottom<=1000,'Dock field must stay visible while it owns focus')
        await run(()=>document.querySelector('.notation-event.is-selected').scrollIntoView({block:'center',inline:'nearest'}))
        await capture(`r2-${mode}-${viewport}-${size}`)
      }
    }
  }
  const fixed=records.filter(record=>record.mode==='fixed')
  for(const record of fixed) assert.deepEqual(record.svg,fixed[0].svg,'Fixed zoom must not reflow when dock or viewport changes')
  const fit=records.filter(record=>record.mode==='fit-width')
  assert.ok(new Set(fit.map(record=>record.svg[0])).size>1,'Fit-width must follow actual available width')
  await click('음표 입력 전환, 단축키 N')
  await click('8분음표, 단축키 4')
  await click('점 추가')
  await run(()=>{
    const details=document.querySelector('.studio-note-details')
    if (!details.open) details.querySelector('summary').click()
  })
  await settle()
  const inputBefore=await metrics()
  assert.match(inputBefore.input,/8분음표.*점 1/)
  await settle()
  await run(()=>window.scrollTo(0,0))
  await settle()
  assert.equal(await run(()=>document.querySelector('.studio-input-context').getBoundingClientRect().top>=0),true,'Next-input capture must show the actual input controls')
  await capture('r2-next-input-960')
  const inputLayout=await run(()=>{
    const toolbar=document.querySelector('[aria-label="음표 편집"]')
    const context=toolbar.querySelector('.studio-edit-context')
    return {toolbarWidth:toolbar.clientWidth,contextWidth:context.getBoundingClientRect().width,
      toolbarScrollWidth:toolbar.scrollWidth}
  })
  fs.writeFileSync(path.join(out,'r2-input-layout.json'),JSON.stringify(inputLayout,null,2))
  assert.ok(inputLayout.contextWidth>=inputLayout.toolbarWidth*0.8,'Input context must have a full readable row, not a compressed vertical strip')
  assert.ok(inputLayout.toolbarScrollWidth<=inputLayout.toolbarWidth+1,'Input toolbar groups must wrap within the viewport')
  await width(207); win.setContentSize(1400,1000); await settle()
  const inputAfter=await metrics()
  assert.equal(inputAfter.input,inputBefore.input)
  assert.equal(inputAfter.inputAddress,inputBefore.inputAddress)
  assert.equal(inputAfter.inputActive,'true')
  win.setContentSize(960,1000); await settle()
  await run(()=>{
    const nodes=[...document.querySelectorAll('.studio-chrome, .studio-chrome *')]
    const sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize))
    nodes.forEach((node,index)=>{node.style.fontSize=`${sizes[index]*2}px`})
  })
  await settle()
  await run(()=>window.scrollTo(0,0)); await settle()
  await capture('r2-next-input-text-2')
  assert.equal(await run(()=>{
    const toolbar=document.querySelector('[aria-label="음표 편집"]')
    return toolbar.scrollWidth<=toolbar.clientWidth+1 && document.documentElement.scrollWidth<=innerWidth+1
  }),true,'Next-input groups must remain contained at 200% text size')
  await run(()=>document.querySelectorAll('.studio-chrome, .studio-chrome *').forEach(node=>node.style.removeProperty('font-size')))
  await settle()
  await click('음표 입력 전환, 단축키 N')
  await click('파일'); await click('프로젝트 저장'); await click('MusicXML로 저장')
  const after=await run(()=>({native:window.r2QA.native.at(-1),xml:window.r2QA.xml.at(-1)}))
  assert.equal(after.xml,original.xml)
  assert.deepEqual(JSON.parse(after.native).score,JSON.parse(original.native).score)
  await click('프로젝트 열기')
  await exportPdf('r2-export-after')
  fs.writeFileSync(path.join(out,'r2-workspace.json'),JSON.stringify({versions:process.versions,before,reflow,records,inputBefore,inputAfter,
    nativeScoreUnchanged:true,musicXmlUnchanged:true,pdf:'Actual App export scene and Chromium printToPDF; bridge fixture, no OS dialog'},null,2))
  console.log('R2 command context and responsive/fixed workspace matrix passed')
}
