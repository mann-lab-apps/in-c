// Owned renderer/profile, actual blank-measure secondary pointer and native keys.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_CONTEXT_OUT || 'out/ddirori/studio-system-measure-context')
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration(); app.on('window-all-closed', () => {})
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-measure-context-')))
let win, scene, name = 'before', openFile, step = 'start'
const result = f => ({ filePath: f, fileName: path.basename(f) })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, name + '.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:save', (_e, v) => { const f = path.join(scene, name + '.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('midi:save', (_e, v) => { const f = path.join(scene, name + '.mid'); fs.writeFileSync(f, Buffer.from(v.contents)); return result(f) })
ipcMain.handle('pdf:save', async () => { const f = path.join(scene, name + '.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f) })
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = async (fn, arg) => { const r = await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(e){return{ok:false,error:e.stack}}})()`); if (!r.ok) throw Error(r.error); return r.value }
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async (fn, arg) => { const t = Date.now(); while (!await run(fn, arg)) { assert.ok(Date.now() - t < 12000, step); await settle() } }
const click = async label => { await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error('Unavailable ' + label); n.focus(); n.click() }, label); await settle() }
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const portable = p => ({ score: p.score, view: p.view, partLayouts: p.partLayouts })
const save = async label => { name = label; await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('.chromatics')); return portable(JSON.parse(fs.readFileSync(path.join(scene, name + '.chromatics'), 'utf8'))) }
const selected = () => run(() => document.querySelector('.notation-measure.is-selected')?.dataset.measureId)
const capture = async label => { console.log(path.basename(scene) + ':' + label); fs.writeFileSync(path.join(scene, label + '.png'), (await win.webContents.capturePage()).toPNG()) }
const openContext = async scale => {
  await run(() => document.querySelectorAll('.notation-measure')[1].scrollIntoView({ block: 'center' })); await settle()
  const p = await run(() => { const m = document.querySelectorAll('.notation-measure')[1], b = m.getBoundingClientRect(); for (let y = Math.max(1, b.bottom - 10); y > b.top; y -= 8) for (let x = b.right - 10; x > b.left; x -= 8) if (document.elementFromPoint(x, y) === m) return { x: Math.round(x), y: Math.round(y), measureId: m.dataset.measureId }; throw Error('No visible blank measure ink target') })
  win.webContents.sendInputEvent({ type: 'mouseDown', button: 'right', clickCount: 1, x: p.x, y: p.y }); win.webContents.sendInputEvent({ type: 'mouseUp', button: 'right', clickCount: 1, x: p.x, y: p.y })
  await wait(() => Boolean(document.querySelector('.studio-measure-context-menu')))
  if (scale === 2) await run(() => { const nodes = [...document.querySelectorAll('.studio-measure-context-layer :is(button,span)')], sizes = nodes.map(n => parseFloat(getComputedStyle(n).fontSize)); nodes.forEach((n, i) => n.style.fontSize = sizes[i] * 2 + 'px') })
  await settle(); assert.equal(await selected(), p.measureId)
  return p
}
const active = () => run(() => document.activeElement?.textContent.trim())
const canvasFocused = () => run(() => document.activeElement?.classList.contains('score-canvas'))
const outputs = async label => {
  name = label; await click('파일'); await click('파일 작업 열기'); await click('MusicXML로 저장'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('.musicxml'))
  await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('.mid'))
  await click('PDF 변환'); await wait(label => document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes(label + '.pdf'), label)
}
const deadline = setTimeout(() => { console.error('Deadline', step); app.exit(1) }, 180000)
app.whenReady().then(async () => {
  const records = []
  try {
    for (const c of [{ width: 960, theme: 'light', scale: 1, coarse: false }, { width: 1400, theme: 'dark', scale: 1, coarse: false }, { width: 960, theme: 'dark', scale: 2, coarse: true }, { width: 1400, theme: 'light', scale: 2, coarse: true }]) {
      scene = path.join(out, `${c.width}-${c.theme}-${c.scale}-${c.coarse ? 'coarse' : 'fine'}`); fs.mkdirSync(scene, { recursive: true }); step = path.basename(scene)
      nativeTheme.themeSource = c.theme
      win = new BrowserWindow({ width: c.width, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), sandbox: false, contextIsolation: true, backgroundThrottling: false } })
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); await settle(); win.focus(); win.webContents.focus()
      await win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: c.theme }] }); await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: c.coarse }); await settle()
      const before = await save('before'); await outputs('before')
      const p = await openContext(c.scale)
      const geometry = await run(() => {
        const root = document.querySelector('.studio-measure-context-menu'), r = root.getBoundingClientRect(), items = [...root.querySelectorAll('[role="menuitem"]')]
        return { backdrop: getComputedStyle(root.parentElement).backgroundColor, contained: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, horizontalOverflow: root.scrollWidth > root.clientWidth + 1, card: !!root.querySelector('.dd-card'), legacy: !!root.closest('.studio-chrome'), theme: root.closest('[data-theme]').dataset.theme,
          rows: items.map(n => ({ public: n.classList.contains('dd-button'), height: n.getBoundingClientRect().height, font: parseFloat(getComputedStyle(n).fontSize), disabled: n.disabled })), glyphs: items.map(n => ({ width: n.querySelector('svg').getAttribute('width'), stroke: n.querySelector('svg').getAttribute('stroke-width') })) }
      })
      fs.writeFileSync(path.join(scene, 'geometry.json'), JSON.stringify(geometry, null, 2))
      assert.equal(geometry.backdrop, 'rgba(0, 0, 0, 0)', 'Context scope must not obscure the score')
      assert.equal(geometry.contained, true); assert.equal(geometry.horizontalOverflow, false); assert.equal(geometry.card, true); assert.equal(geometry.legacy, false); assert.equal(geometry.theme, c.theme)
      assert.ok(geometry.rows.every(n => n.public && n.height >= (c.coarse ? 48 : 32) && n.font === (c.coarse ? 16 : 14) * c.scale)); assert.ok(geometry.glyphs.every(n => n.width === '18' && n.stroke === '1.75'))
      assert.equal(await active(), '앞에 마디 추가'); await capture('menu')
      await key('End'); assert.equal(await active(), '마디 제거'); await capture('end-scroll'); await key('Down'); assert.equal(await active(), '앞에 마디 추가')
      await key('Escape'); assert.equal(await canvasFocused(), true); assert.equal(await selected(), p.measureId)
      assert.deepEqual(await save('cancelled'), before)
      await openContext(c.scale); await key('End'); await key('Enter'); assert.equal(await canvasFocused(), true)
      const removed = await save('removed'); assert.equal(removed.score.parts[0].staves[0].measures.length, before.score.parts[0].staves[0].measures.length - 1)
      await run(() => document.querySelector('.score-canvas').focus()); await key('Z', ['control']); assert.deepEqual(await save('undo-remove'), before)
      await run(() => document.querySelector('.score-canvas').focus()); await key('Z', ['control', 'shift']); assert.deepEqual(await save('redo-remove'), removed)
      await run(() => document.querySelector('.score-canvas').focus()); await key('Z', ['control']); assert.deepEqual(await save('restored'), before)
      await openContext(c.scale); await key('Down'); await key('Down'); assert.equal(await active(), '도돌이표 시작'); await key('Enter')
      const repeated = await save('repeat'); assert.equal(repeated.score.parts[0].staves[0].measures[1].repeat.start, true)
      await run(() => document.querySelector('.score-canvas').focus()); await key('Z', ['control']); assert.deepEqual(await save('repeat-undo'), before)
      await openContext(c.scale); await key('Home'); await key('Enter'); const inserted = await save('inserted'); assert.equal(inserted.score.parts[0].staves[0].measures.length, before.score.parts[0].staves[0].measures.length + 1)
      await run(() => document.querySelector('.score-canvas').focus()); await key('Z', ['control']); assert.deepEqual(await save('final'), before)
      await outputs('after'); for (const ext of ['musicxml', 'mid']) assert.deepEqual(fs.readFileSync(path.join(scene, 'after.' + ext)), fs.readFileSync(path.join(scene, 'before.' + ext)))
      openFile = path.join(scene, 'final.chromatics'); await click('파일'); await click('프로젝트 열기'); await settle(); assert.deepEqual(await save('reopened'), before)
      fs.writeFileSync(path.join(scene, 'geometry.json'), JSON.stringify(geometry, null, 2)); records.push({ ...c, geometry, nativeUndoRedoReopen: true, xmlMidiEqual: true }); win.destroy(); win = null
    }
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(records, null, 2)); console.log('PASS public measure context:4;actual pointer/native keys/exact undo/reopen/XML/MIDI/PDF'); clearTimeout(deadline); app.exit(0)
  } catch (error) { console.error(step, error); if (win) { fs.writeFileSync(path.join(scene, 'failure.json'), JSON.stringify(await run(() => ({ active: document.activeElement?.outerHTML, status: document.querySelector('.editor-status')?.textContent })), null, 2)); await capture('failure') }; clearTimeout(deadline); app.exit(1) }
})
