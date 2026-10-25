const { app, BrowserWindow, nativeTheme } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')

const out = path.resolve(process.env.DDIRORI_COMPACT_QA_OUT || 'out/ddirori/studio-r3-compact')
const measureOnly = process.argv.includes('--measure-only')
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-compact-')))
app.disableHardwareAcceleration()
fs.mkdirSync(out, { recursive: true })

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1400, height: 1000, show: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg) ?? ''})`)
  const settle = () => run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
  const wait = async (fn, arg) => {
    const start = Date.now()
    while (!await run(fn, arg)) {
      assert.ok(Date.now() - start < 5000, `Condition timed out: ${fn}`)
      await settle()
    }
  }
  const key = async (keyCode, modifiers = []) => {
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
  const results = []
  try {
    nativeTheme.themeSource = 'light'
    for (const width of [960, 1400]) {
      win.setContentSize(width, 1000)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
      await settle()
      const result = await run(() => {
        const box = node => {
          if (!node || !node.checkVisibility()) return null
          const r = node.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
        }
        const selectors = {
          document: '.studio-document', categories: '.toolbar-tabs', input: '.studio-input-context',
          context: '.editor-context-strip', noteDetails: '[aria-label="음표 편집"]', tools: 'header.toolbar',
          status: '.editor-status', workspace: '.studio-docks', palette: '#studio-palette',
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
          noteDetailsOpen: document.querySelector('.studio-note-details')?.open,
          widths: JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')),
          selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id') }
      })
      results.push(result)
      fs.writeFileSync(path.join(out, `${width}.png`), (await win.webContents.capturePage()).toPNG())
    }
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ runtime: process.versions, results }, null, 2))
    for (const result of results) {
      console.log(JSON.stringify(result))
      if (measureOnly) continue
      assert.equal(result.overflow, false)
      assert.ok(result.boxes.staff && result.boxes.note, 'Measure actual engraved staff and note ink, not an empty canvas')
      assert.ok(result.boxes.staff.y >= 0 && result.boxes.staff.bottom <= result.viewport[1] - 24,
        `${result.viewport[0]}px first staff must fit in the initial viewport: ${JSON.stringify(result.boxes.staff)}`)
      assert.ok(result.boxes.note.y >= 0 && result.boxes.note.bottom <= result.viewport[1] - 24)
      assert.deepEqual(result.widths, { palette: 280, properties: 280 })
    }
    if (!measureOnly) {
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' })
      await settle()
      assert.equal(await run(() => document.querySelector('.studio-note-details').checkVisibility()), false,
        'The new editor disclosure must not appear in print media')
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { media: '' })
      win.webContents.debugger.detach()
      const journeys = []
      for (const width of [960, 1400]) {
        win.setContentSize(width, 1000)
        await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
        app.focus({ steal: true }); win.focus()
        await wait(() => document.hasFocus())
        const tabs = await tabTo('.studio-note-details > summary')
        await key('Enter')
        await wait(() => document.querySelector('.studio-note-details').open && localStorage.getItem('chromatics.note-details.v1') === 'true')
        assert.equal(await run(() => document.querySelector('[aria-label="입력 성부"]')?.checkVisibility() || document.querySelector('[aria-label="2성부"]').checkVisibility()), true)
        await tabTo('[aria-label="2성부"]')
        assert.equal(await run(() => document.activeElement.disabled), false)
        await capture(`${width}-details-open`)
        await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
        await settle()
        assert.equal(await run(() => document.querySelector('.studio-note-details').open), true, 'Expanded preference must survive renderer reopen')
        await tabTo('.studio-note-details > summary')
        await key('Enter')
        await wait(() => !document.querySelector('.studio-note-details').open && localStorage.getItem('chromatics.note-details.v1') === 'false')
        assert.equal(await run(() => document.activeElement.matches('.studio-note-details > summary')), true)
        await run(() => document.querySelector('[aria-label="속성 도크 폭"]').focus())
        await tabTo('[aria-label="선택 요약 표현 텍스트"]')
        const focus = await run(() => {
          const field = document.activeElement.getBoundingClientRect()
          const style = getComputedStyle(document.activeElement)
          const panel = document.querySelector('#studio-properties').getBoundingClientRect()
          return { field: { top: field.top, bottom: field.bottom }, panel: { top: panel.top, bottom: panel.bottom },
            scrollTop: document.querySelector('#studio-properties').scrollTop,
            focusRing: Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)),
            edits: document.querySelector('.editor-status').textContent,
            selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id'),
            overflow: document.documentElement.scrollWidth > innerWidth + 1 }
        })
        await capture(`${width}-property-focus`)
        assert.ok(focus.field.top >= Math.max(0, focus.panel.top) - 1 && focus.field.bottom <= Math.min(1000, focus.panel.bottom) + 1,
          'Keyboard focus must scroll a clipped property into the visible panel')
        assert.ok(focus.field.top - focus.focusRing >= Math.max(0, focus.panel.top) - 1 &&
          focus.field.bottom + focus.focusRing <= Math.min(1000, focus.panel.bottom) + 1,
          `Keyboard focus ring must also fit: ${JSON.stringify(focus)}`)
        assert.match(focus.edits, /0회 수정/)
        assert.equal(focus.selected, 'm1-c4')
        assert.equal(focus.overflow, false)
        if (width === 960) assert.ok(focus.scrollTop > 0)
        journeys.push({ width, tabs, focus })
      }
      win.setContentSize(960, 1000)
      nativeTheme.themeSource = 'dark'
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
      await settle()
      await capture('960-dark')
      assert.equal(await run(() => document.querySelector('.studio-document').dataset.theme), 'dark')
      await run(() => {
        const nodes = [...document.querySelectorAll('.studio-chrome,.studio-chrome *')]
        const sizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize))
        nodes.forEach((node, index) => { node.style.fontSize = `${sizes[index] * 2}px` })
      })
      await settle()
      assert.equal(await run(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await capture('960-dark-text200')
      await run(() => document.querySelectorAll('.studio-chrome,.studio-chrome *').forEach(node => node.style.removeProperty('font-size')))
      await win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true })
      await settle()
      const coarse = await run(() => ({ pointer: matchMedia('(pointer:coarse)').matches,
        summaryHeight: document.querySelector('.studio-note-details > summary').getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 }))
      assert.equal(coarse.pointer, true)
      assert.ok(coarse.summaryHeight >= 48)
      assert.equal(coarse.overflow, false)
      await capture('960-dark-coarse')
      win.webContents.debugger.detach()
      fs.writeFileSync(path.join(out, 'journeys.json'), JSON.stringify({ journeys, coarse, scope: 'Production renderer; native Tab/Enter and reopen. DOM focus setup for dock-field traversal; no physical keyboard/IME/OS dialog claim.' }, null, 2))
    }
    console.log(measureOnly ? 'Compact workspace measurements recorded' : 'Compact workspace first staff and note ink visible')
  } finally { win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
