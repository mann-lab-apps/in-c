const { app, BrowserWindow, nativeTheme } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')

const out = path.resolve(process.env.DDIRORI_COMPACT_QA_OUT || 'out/ddirori/studio-r3-compact')
const measureOnly = process.argv.includes('--measure-only')
const shortWindow = process.argv.includes('--short-window')
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-compact-')))
app.disableHardwareAcceleration()
fs.mkdirSync(out, { recursive: true })
let step='startup'
const deadline=setTimeout(()=>{console.error(`Compact QA deadline at ${step}`);app.exit(1)},180000)

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1400, height: 1000, show: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const run = async (fn, arg) => {
    const answer=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn.toString()})(${JSON.stringify(arg)??''})}}catch(error){return{ok:false,error:error.stack}}})()`)
    if(!answer.ok)throw Error(`${step}: ${answer.error}`)
    return answer.value
  }
  const settle = () => run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
  const wait = async (fn, arg) => {
    const start = Date.now()
    while (!await run(fn, arg)) {
      assert.ok(Date.now() - start < 5000, `Condition timed out: ${fn}`)
      await settle()
    }
  }
  const key = async (keyCode, modifiers = []) => {
    app.focus({steal:true});win.focus();win.webContents.focus()
    await wait(()=>document.hasFocus())
    assert.ok(win.isFocused()&&win.webContents.isFocused(),'Owned compact window must receive native keys')
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
    if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers })
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers })
    await settle()
  }
  const tabTo = async (selector, modifiers = []) => {
    let tabs = 0
    while (!await run(selector => document.activeElement?.matches(selector), selector)) {
      assert.ok(tabs++ < 160, `Keyboard could not reach ${selector}`)
      await key('Tab', modifiers)
    }
    return tabs
  }
  const capture = async name => fs.writeFileSync(path.join(out, `${name}.png`), (await win.webContents.capturePage()).toPNG())
  const click=async label=>{
    console.log(`${step}:command:${label}`)
    await run(label=>{const node=[...document.querySelectorAll('button')].find(n=>(n.getAttribute('aria-label')||n.textContent.trim())===label&&n.checkVisibility());if(!node||node.disabled)throw Error(`Unavailable real control:${label}`);node.scrollIntoView({block:'nearest'});node.focus();node.click()},label);await settle()
  }
  const load=async()=>{await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});await settle()}
  const results = []
  try {
    nativeTheme.themeSource = 'light'
    for (const width of [960, 1400]) for (const height of shortWindow ? [750, 800, 1000] : [1000]) {
      step=`${width}-${height}:measure`;console.log(step)
      win.setContentSize(width, height)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
      await settle()
      const result = await run(() => {
        const box = node => {
          if (!node || !node.checkVisibility()) return null
          const r = node.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
        }
        const selectors = {
          document: '.studio-document', menu: '.studio-application-menu', input: '.studio-input-context',
          context: '.studio-status__context', tools: '.studio-note-toolbar',
          status: '.studio-status', workspace: '.studio-docks', palette: '#studio-palette',
          properties: '#studio-properties', canvas: '.score-canvas', page: '.score-page',
          svg: '.notation-preview svg', staff: '.notation-preview .vf-stave'
        }
        const text = document.querySelector('.notation-preview .vf-notehead text')
        let noteInk = null
        if (text && text.textContent) {
          const context = document.createElement('canvas').getContext('2d')
          const style = getComputedStyle(text)
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
          const metrics = context.measureText(text.textContent)
          const start = text.getStartPositionOfChar(0)
          const matrix = text.getScreenCTM()
          const corners = [
            [start.x - metrics.actualBoundingBoxLeft, start.y - metrics.actualBoundingBoxAscent],
            [start.x + metrics.actualBoundingBoxRight, start.y + metrics.actualBoundingBoxDescent]
          ].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix))
          noteInk = { x: corners[0].x, y: corners[0].y, width: corners[1].x - corners[0].x,
            height: corners[1].y - corners[0].y, bottom: corners[1].y }
        }
        return { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
          boxes: { ...Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, box(document.querySelector(selector))])), note: noteInk },
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          noteCount: document.querySelectorAll('.notation-preview .vf-notehead').length,
          eventCount: document.querySelectorAll('.notation-event').length,
          sharedPane: document.querySelector('aside:not([hidden])')?.id,
          technicalOpen: document.querySelector('.studio-selected-properties__technical .dd-accordion >button')?.getAttribute('aria-expanded')==='true',
          widths: JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),
          selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id') }
      })
      results.push(result)
      fs.writeFileSync(path.join(out, `${width}${shortWindow ? `-${height}` : ''}.png`), (await win.webContents.capturePage()).toPNG())
    }
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ runtime: process.versions, results }, null, 2))
    for (const result of results) {
      console.log(JSON.stringify(result))
      if (measureOnly) continue
      assert.equal(result.overflow, false)
      assert.ok(result.boxes.input && result.boxes.tools && result.boxes.menu,
        'Measure the actual input-target, persistent note toolbar and global menu surfaces')
      assert.ok(result.boxes.staff && result.boxes.note, 'Measure actual engraved staff and note ink, not an empty canvas')
      if (shortWindow && result.viewport[1] < 1000) {
        assert.ok(result.boxes.document.height <= 72, 'Short-window document/zoom controls must share a row at normal text size')
        continue // Short windows have a separate explicit navigation contract below.
      }
      assert.ok(result.boxes.staff.y >= 0 && result.boxes.staff.bottom <= result.viewport[1] - 24,
        `${result.viewport[0]}px first staff must fit in the initial viewport: ${JSON.stringify(result.boxes.staff)}`)
      assert.ok(result.boxes.note.y >= 0 && result.boxes.note.bottom <= result.viewport[1] - 24)
      assert.deepEqual(result.widths, { palette: 280, properties: 280 })
    }
    if (shortWindow && !measureOnly) {
      const navigation = []
      for (const result of results) {
        const [width, height] = result.viewport
        step=`${width}-${height}:score-navigation`;console.log(step)
        win.setContentSize(width, height)
        await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
        app.focus({ steal: true }); win.focus()
        await wait(() => document.hasFocus())
        assert.equal(await run(() => Boolean(document.querySelector('[aria-label="악보로 이동"]'))), true,
          'Short windows need a real visible keyboard route to the selected score position')
        const tabs = await tabTo('[aria-label="악보로 이동"]')
        const activation = height === 800 ? 'Space' : 'Enter'
        await key(activation)
        const focused = await run(() => {
          const node = document.activeElement
          const r = node.getBoundingClientRect()
          const text = node.querySelector('.vf-notehead text')
          const logicalBox = text?.getBoundingClientRect()
          const footer=document.querySelector('.studio-status').getBoundingClientRect()
          const style=getComputedStyle(node),ring=Math.max(0,parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset))
          let ink
          if(text){const s=getComputedStyle(text),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const m=ctx.measureText(text.textContent),p=text.getStartPositionOfChar(0),matrix=text.getScreenCTM();ink={top:new DOMPoint(p.x,p.y-m.actualBoundingBoxAscent).matrixTransform(matrix).y,bottom:new DOMPoint(p.x,p.y+m.actualBoundingBoxDescent).matrixTransform(matrix).y}}
          return { id: node.getAttribute('data-event-id'), selected: node.classList.contains('is-selected'),
            top: r.top, bottom: r.bottom, textLogicalBox: logicalBox && { top: logicalBox.top, bottom: logicalBox.bottom },
            viewport: innerHeight, footerTop:footer.top,ring,ink,scroll: scrollY, edits: document.querySelector('.editor-status').textContent,
            svg: { width: document.querySelector('.notation-preview svg').getAttribute('width'), height: document.querySelector('.notation-preview svg').getAttribute('height') },
            overflow: document.documentElement.scrollWidth > innerWidth + 1 }
        })
        assert.equal(focused.id, 'm1-c4')
        assert.equal(focused.selected, true)
        assert.ok(focused.top >= 8 && focused.bottom <= height - 8, JSON.stringify(focused))
        assert.ok(focused.top-focused.ring>=8&&focused.bottom+focused.ring<=focused.footerTop-8,JSON.stringify(focused))
        assert.ok(focused.ink&&focused.ink.top>=8&&focused.ink.bottom<=focused.footerTop-8,'Actual focused note ink must clear the sticky footer')
        assert.match(focused.edits, /0회 수정/)
        assert.match(focused.edits, /정지/)
        assert.equal(focused.overflow, false)
        assert.equal(Number(focused.svg.width), result.boxes.svg.width)
        await capture(`${width}-${height}-score-focus`)
        navigation.push({ width, height, tabs, activation, focused })
      }
      fs.writeFileSync(path.join(out, 'navigation.json'), JSON.stringify(navigation, null, 2))
    }
    if (!measureOnly) {
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' })
      await settle()
      assert.equal(await run(() => document.querySelector('.studio-note-toolbar').checkVisibility()), false,
        'Current note input controls must not appear in print media')
      assert.equal(await run(() => document.querySelector('.studio-status').checkVisibility()), false)
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: '' })
      win.webContents.debugger.detach()
      const journeys = []
      for (const width of [960, 1400]) {
        step=`${width}:live-disclosures`;console.log(step)
        const journeyHeight = shortWindow ? 750 : 1000
        win.setContentSize(width, journeyHeight)
        await load()
        app.focus({ steal: true }); win.focus()
        await wait(() => document.hasFocus())
        // Retired note-details preference cannot hide the persistent input toolbar.
        for(const oldValue of ['true','false']){
          await run(value=>localStorage.setItem('chromatics.note-details.v1',value),oldValue);await load()
          assert.equal(await run(()=>document.querySelector('[aria-label="2성부"]').checkVisibility()),true)
          assert.equal(await run(()=>Boolean(document.querySelector('.studio-note-details'))),false)
        }
        const tabs=await tabTo('[aria-label="2성부"]')
        assert.equal(await run(() => document.activeElement.disabled), false)
        await capture(`${width}-input-voice-focus`)
        // Persisted disclosure coverage now belongs to the real notation family.
        await click('추가');await click('표기 팔레트 열기')
        await run(()=>{const n=[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='셈여림');n.scrollIntoView({block:'nearest'});n.focus()})
        assert.equal(await run(()=>document.activeElement.getAttribute('aria-expanded')),'true')
        await key('Enter')
        assert.equal(await run(()=>JSON.parse(localStorage.getItem('studio.palette-families.v1'))['셈여림']),false)
        await load()
        assert.equal(await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='셈여림').getAttribute('aria-expanded')),'false')
        await run(()=>{const n=[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='셈여림');n.scrollIntoView({block:'nearest'});n.focus()})
        await key('Enter');await load()
        assert.equal(await run(()=>[...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].find(n=>n.textContent==='셈여림').getAttribute('aria-expanded')),'true')
        assert.equal(await run(()=>document.querySelector('#studio-properties').checkVisibility()),false)
        await click('도구');await click('선택 속성 열기')
        await tabTo('.studio-selected-properties__technical .dd-accordion >button');await key('Enter')
        assert.equal(await run(()=>document.activeElement.getAttribute('aria-expanded')),'true')
        await capture(`${width}-technical-open`)
        await load()
        assert.equal(await run(()=>document.querySelector('#studio-properties').checkVisibility()),true,'Active inspector survives reopen')
        assert.equal(await run(()=>document.querySelector('.studio-selected-properties__technical .dd-accordion >button').getAttribute('aria-expanded')),'false','Technical disclosure is session state,not the retired persisted note-details setting')
        await click('도구');await click('선택 속성 열기')
        await tabTo('[aria-label="선택 요약 표현 텍스트"]')
        const focus = await run(() => {
          const field = document.activeElement.getBoundingClientRect()
          const style = getComputedStyle(document.activeElement)
          const panel = document.querySelector('#studio-properties').getBoundingClientRect()
          const footerTop=document.querySelector('.studio-status').getBoundingClientRect().top
          return { field: { top: field.top, bottom: field.bottom }, panel: { top: panel.top, bottom: panel.bottom },
            footerTop,
            scrollTop: document.querySelector('#studio-properties').scrollTop,
            focusRing: Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)),
            edits: document.querySelector('.editor-status').textContent,
            selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id'),
            overflow: document.documentElement.scrollWidth > innerWidth + 1 }
        })
        await capture(`${width}-property-focus`)
        assert.ok(focus.field.top >= Math.max(0, focus.panel.top) - 1 && focus.field.bottom <= Math.min(journeyHeight, focus.panel.bottom) + 1,
          'Keyboard focus must scroll a clipped property into the visible panel')
        assert.ok(focus.field.top - focus.focusRing >= Math.max(0, focus.panel.top) - 1 &&
          focus.field.bottom + focus.focusRing <= Math.min(journeyHeight, focus.panel.bottom) + 1,
          `Keyboard focus ring must also fit: ${JSON.stringify(focus)}`)
        assert.ok(focus.field.bottom+focus.focusRing<=focus.footerTop-8,'Live text field must clear the actual footer')
        assert.match(focus.edits, /0회 수정/)
        assert.equal(focus.selected, 'm1-c4')
        assert.equal(focus.overflow, false)
        if (width === 960) assert.ok(focus.scrollTop > 0)
        journeys.push({ width, tabs, focus,legacyNoteDetailsIgnored:true,paletteDisclosurePersisted:true,technicalDisclosureSessionOnly:true })
      }
      win.setContentSize(960, shortWindow ? 750 : 1000)
      nativeTheme.themeSource = 'dark'
      step='960:dark-text200';console.log(step);await load()
      await click('고정 배율')
      await capture('960-dark')
      assert.equal(await run(() => document.querySelector('.studio-document').dataset.theme), 'dark')
      await run(() => {
        const nodes = [...document.querySelectorAll('.ddirori :is(button,input,select,label,span,output,h1,h2,h3,h4,p,dt,dd)')].filter(n=>!n.closest('.score-canvas,.studio-pdf-snapshot'))
        const sizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize))
        window.__compactFonts=nodes.map(node=>[node,node.style.fontSize])
        nodes.forEach((node, index) => { node.style.fontSize = `${sizes[index] * 2}px` })
      })
      await settle()
      assert.equal(await run(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await capture('960-dark-text200')
      const review = await run(() => {
        const strip = document.querySelector('.studio-status__context')
        const label = [...document.querySelectorAll('.studio-status__view-tools label')].find(n=>n.textContent==='고정 확대율')
        const range = document.createRange(); range.selectNodeContents(label)
        const probe=document.createElement('span');probe.style.color='var(--dd-muted)';strip.append(probe);const expectedTextColor=getComputedStyle(probe).color;probe.remove()
        return { expectedTextColor,contextColor:getComputedStyle(strip).color,
          statusColors: [...strip.querySelectorAll('strong')].map(node => getComputedStyle(node).color),
          zoomLabelLines: range.getClientRects().length }
      })
      await tabTo('.studio-note-toolbar button[aria-label^="셋잇단음표 적용"]')
      const toolbarFocus = await run(() => {
        const node = document.activeElement, r = node.getBoundingClientRect()
        const toolbar = document.querySelector('.studio-note-toolbar'), box = toolbar.getBoundingClientRect()
        const footerTop=document.querySelector('.studio-status').getBoundingClientRect().top
        return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:[innerWidth,innerHeight],
          footerTop,
          toolbar:{left:box.left,right:box.right,scrollLeft:toolbar.scrollLeft},
          edits:document.querySelector('.editor-status').textContent }
      })
      await capture('960-dark-text200-toolbar-focus')
      fs.writeFileSync(path.join(out,'text-review.json'),JSON.stringify({review,toolbarFocus},null,2))
      assert.ok(toolbarFocus.left >= Math.max(0,toolbarFocus.toolbar.left) - 1 &&
        toolbarFocus.right <= Math.min(toolbarFocus.viewport[0],toolbarFocus.toolbar.right) + 1 &&
        toolbarFocus.top >= 0 && toolbarFocus.bottom <= toolbarFocus.footerTop-8,
        'Large-text keyboard focus must reveal the actual last duration command, including toolbar horizontal scroll')
      assert.equal(review.zoomLabelLines,1,'Zoom label must remain a whole readable phrase')
      assert.ok(review.statusColors.length>0&&review.statusColors.every(color=>color===review.contextColor&&color===review.expectedTextColor),'Dark metadata values must retain the context color andcurrent public muted text token')
      await run(() => {for(const[node,value]of window.__compactFonts)if(node.isConnected)node.style.fontSize=value})
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true })
      await settle()
      const coarse = await run(() => ({ pointer: matchMedia('(pointer:coarse)').matches,
        familyHeight: document.querySelector('.studio-notation-palette .dd-accordion >button').getBoundingClientRect().height,
        navigationHeight: document.querySelector('[aria-label="악보로 이동"]').getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 }))
      assert.equal(coarse.pointer, true)
      // Palette is currently inactive; activate its actual tab before measuring.
      await click('추가');await click('표기 팔레트 열기')
      coarse.familyHeight=await run(()=>document.querySelector('.studio-notation-palette .dd-accordion >button').getBoundingClientRect().height)
      assert.ok(coarse.familyHeight >= 48)
      assert.ok(coarse.navigationHeight >= 48)
      assert.equal(coarse.overflow, false)
      await capture('960-dark-coarse')
      win.webContents.debugger.detach()
      fs.writeFileSync(path.join(out, 'journeys.json'), JSON.stringify({ journeys, coarse, scope: 'Production renderer; native Tab/Enter and reopen. DOM focus setup for dock-field traversal; no physical keyboard/IME/OS dialog claim.' }, null, 2))
    }
    console.log(measureOnly ? 'Compact workspace measurements recorded' : 'PASS compact first ink at1000,explicit short-window navigation andcurrent public controls;initial750 first ink remains limited')
  } catch(error) {
    await capture('failure')
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({step,error:String(error)},null,2))
    throw error
  } finally { clearTimeout(deadline);win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
