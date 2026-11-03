const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_RESPONSIVE_QA_OUT || 'out/ddirori/studio-responsive-workspace')
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-responsive-')))
app.disableHardwareAcceleration()
fs.mkdirSync(out, { recursive: true })
let stage = 'startup'
const deadline = setTimeout(() => { console.error(`Responsive QA deadline at ${stage}`); app.exit(1) }, 180000)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1400, height: 750, show: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const run = async (fn, arg) => {
    const answer = await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn.toString()})(${JSON.stringify(arg) ?? ''})}}catch(error){return{ok:false,error:error.stack}}})()`)
    if (!answer.ok) throw Error(`${stage}: ${answer.error}`)
    return answer.value
  }
  const settle = () => run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
  const click = async label => {
    await run(label => {
      const node = [...document.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent.trim()) === label && node.checkVisibility())
      if (!node || node.disabled) throw Error(`Unavailable real workspace control: ${label}`)
      node.scrollIntoView({block:'nearest'}); node.focus(); node.click()
    }, label)
    await settle()
  }
  const available = name => run(name => JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1'))[name], name)
  const paneVisible = name => run(name => document.querySelector(name==='palette'?'#studio-palette':'#studio-properties').checkVisibility(), name)
  const paneLabel = name => name==='palette'?'팔레트':'속성'
  const openPane = async name => { if (!await paneVisible(name)) await click(`${paneLabel(name)} 표시`) }
  const setAvailable = async (name, wanted) => {
    if (await available(name) === wanted) return
    await openPane(name)
    if (!wanted) await click(`${paneLabel(name)} 도크 닫기`)
  }
  const setWidth = async (name, value) => {
    await openPane(name); await click(`${paneLabel(name)} 도크 설정`)
    await run(({label,value})=>{
      const n=document.querySelector(`input[aria-label="${label}"]`)
      if(!n?.checkVisibility() || n.disabled)throw Error('Actual width input is unavailable')
      n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,String(value))
      n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}))
    },{label:`${paneLabel(name)} 도크 폭`,value});await settle()
    await run(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));await settle()
  }
  const measure = () => run(() => {
    const canvas = document.querySelector('.score-canvas'), svg = canvas.querySelector('svg')
    const box = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height } }
    return { viewport:[innerWidth,innerHeight], canvas:box(canvas), page:box(canvas.querySelector('.score-page')),
      svg:[Number(svg.getAttribute('width')),Number(svg.getAttribute('height'))],
      overflow:document.documentElement.scrollWidth > innerWidth + 1, canvasScroll:canvas.scrollWidth > canvas.clientWidth + 1,
      selected:canvas.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id'),
      events:canvas.querySelectorAll('.notation-event').length, edits:document.querySelector('.editor-status').textContent,
      palette:document.querySelector('#studio-palette').checkVisibility(), properties:document.querySelector('#studio-properties').checkVisibility(),
      paletteBox:box(document.querySelector('#studio-palette')), propertiesBox:box(document.querySelector('#studio-properties')),
      storedWidths:JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),
      storedVisibility:JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')),
      activeDock:JSON.parse(localStorage.getItem('chromatics.dock-active.v1')),
      switcher:document.querySelector('.studio-dock-switcher').checkVisibility(),
      mode:canvas.dataset.notationSizing }
  })
  const records = []
  try {
    for (const width of [960,1400]) for (const size of [200,280,360]) {
      win.setContentSize(width,750)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query:{fixture:'release-test'} })
      await settle()
      // Settings live in public Popovers; select each real pane before editing.
      await setWidth('palette',size); await setWidth('properties',size)
      for (const mode of ['fit-width','fixed']) {
        await click(mode === 'fixed' ? '고정 배율' : '폭 맞춤')
        for (const [palette,properties] of [[true,true],[false,true],[true,false],[false,false]]) {
          stage=`${width}-${size}-${mode}-${Number(palette)}${Number(properties)}`;console.log(stage)
          await setAvailable('palette',palette); await setAvailable('properties',properties)
          if(palette||properties)await openPane(palette?'palette':'properties')
          const activeBeforeReload=await run(()=>JSON.parse(localStorage.getItem('chromatics.dock-active.v1')))
          await win.loadFile(path.resolve('out/renderer/index.html'), { query:{fixture:'release-test'} })
          await settle()
          const state = await measure()
          const canvasWidth = width - (palette||properties ? size : 0)
          // Shared/shared v3 workspace, existing paper padding and560px minimum.
          const expectedSvgWidth = mode === 'fixed' ? 900 : Math.max(560, width <= 1200 ? canvasWidth - 80 : Math.min(900,canvasWidth - 64) - 96)
          assert.deepEqual(state.storedWidths,{palette:size,properties:size})
          assert.deepEqual(state.storedVisibility,{palette,properties})
          assert.equal(state.palette,palette)
          assert.equal(state.properties,!palette&&properties)
          assert.equal(state.switcher,palette||properties)
          // Closing the preferred pane uses the available fallback without erasing preference.
          assert.equal(state.activeDock,activeBeforeReload,'Reload preserves the actual saved pane preference, including closed-pane fallback')
          assert.equal(state.mode,mode)
          assert.equal(state.canvas.width,canvasWidth)
          assert.equal(state.svg[0],expectedSvgWidth)
          assert.equal(state.events,33)
          assert.equal(state.selected,'m1-c4')
          assert.match(state.edits,/0회 수정/)
          assert.equal(state.overflow,false)
          if (palette||properties) assert.equal((palette?state.paletteBox:state.propertiesBox).width,size,'Shared sidebar retains the active pane width')
          // Smallest tested canvas is600px: left16px margin +24px padding +560px SVG.
          // The SVG can occupy the paper's trailing whitespace without canvas overflow.
          if (mode === 'fit-width') assert.equal(state.canvasScroll,false,'The tested fit-width range retains the existing no-horizontal-scroll contract')
          else assert.equal(state.canvasScroll,canvasWidth < 996,'Fixed paper scrolls only when its996px width exceeds the canvas')
          const name = `${width}-${size}-${mode}-${Number(palette)}${Number(properties)}`
          if (size === 280) fs.writeFileSync(path.join(out,`${name}.png`),(await win.webContents.capturePage()).toPNG())
          records.push({size,palette,properties,expectedSvgWidth,...state})
        }
      }
    }
    const navigation = []
    for (const width of [960,1400]) {
      stage=`${width}:actual-input-and-span-navigation`;console.log(stage)
      win.setContentSize(width,750)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query:{fixture:'release-test'} })
      await settle()
      await click('음표 입력 전환, 단축키 N')
      const inputBefore = await run(()=>({input:document.querySelector('.studio-input-context').textContent,edits:document.querySelector('.editor-status').textContent,selected:document.querySelector('.notation-event.is-selected')?.dataset.eventId}))
      await click('악보로 이동')
      const input = await run(()=>{
        const preview=document.querySelector('.notation-event.is-preview')
        const r=preview?.getBoundingClientRect()
        const focused=document.activeElement,fr=focused.getBoundingClientRect()
        return {active:document.querySelector('.studio-input-context').dataset.inputActive,
          input:document.querySelector('.studio-input-context').textContent,edits:document.querySelector('.editor-status').textContent,
          preview:r&&{top:r.top,bottom:r.bottom},focus:focused.classList.toString(),focusedEvent:focused.dataset.eventId,
          focusBox:{top:fr.top,bottom:fr.bottom},selected:document.querySelector('.notation-event.is-selected')?.dataset.eventId,
          visibleBottom:Math.min(innerHeight,document.querySelector('main > .studio-status').getBoundingClientRect().top)-8}
      })
      assert.equal(input.active,'true')
      assert.equal(input.input,inputBefore.input)
      assert.equal(input.edits,inputBefore.edits)
      assert.equal(input.selected,inputBefore.selected)
      if(input.preview) {
        assert.match(input.focus,/score-canvas/,'Input preview navigation must focus the canvas without selecting or replacing the preview')
        assert.ok(input.preview.top>=8&&input.preview.bottom<=742,JSON.stringify(input))
        assert.ok(input.preview.bottom<=input.visibleBottom,JSON.stringify(input))
      } else {
        assert.equal(input.focusedEvent,inputBefore.selected,'The actual selected event remains the input navigation target')
        assert.ok(input.focusBox.top>=8&&input.focusBox.bottom<=input.visibleBottom,JSON.stringify(input))
      }
      await click('음표 입력 전환, 단축키 N')
      await click('도구');await click('범위 표기 찾기')
      await run(()=>{
        const node=[...document.querySelectorAll('label')].find(n=>n.textContent==='표기 객체 선택')?.control
        if(!node?.checkVisibility()||node.disabled)throw Error('Actual span finder unavailable')
        node.focus();node.click()
      });await settle()
      await run(()=>{
        const option=[...document.querySelectorAll('[role="option"]')].find(n=>n.dataset.value?.startsWith('slur:')&&n.checkVisibility())
        if(!option||option.getAttribute('aria-disabled')==='true')throw Error('No actual fixture slur')
        option.scrollIntoView({block:'nearest'});option.click()
      })
      await settle()
      await click('악보로 이동')
      const span=await run(()=>{
        const node=document.activeElement,r=node.getBoundingClientRect()
        return {kind:node.dataset.spanKind,id:node.dataset.spanId,selected:node.classList.contains('is-selected'),top:r.top,bottom:r.bottom,visibleBottom:Math.min(innerHeight,document.querySelector('main > .studio-status').getBoundingClientRect().top)-8,edits:document.querySelector('.editor-status').textContent}
      })
      assert.equal(span.kind,'slur')
      assert.equal(span.selected,true)
      assert.ok(span.top>=8&&span.bottom<=742,JSON.stringify(span))
      assert.ok(span.bottom<=span.visibleBottom,JSON.stringify(span))
      assert.match(span.edits,/0회 수정/)
      fs.writeFileSync(path.join(out,`${width}-span-focus.png`),(await win.webContents.capturePage()).toPNG())
      navigation.push({width,input,span})
    }
    fs.writeFileSync(path.join(out,'workspace.json'),JSON.stringify({runtime:process.versions,records,navigation,
      policy:'Current workspace geometry contract; legacy responsive snapshot and fixed-canvas engraving remain separate. Actual controls + renderer reopen; no OS dialog or physical-input claim.'},null,2))
    console.log(`PASS ${records.length} responsive workspace cases`)
  } catch(error) {
    fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG())
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({completed:records,state:await measure()},null,2))
    throw error
  } finally { clearTimeout(deadline);win.destroy(); app.quit() }
}).catch(error=>{console.error(error);app.exit(1)})
