// Existing whole-chord model:independent part page QA,not partial-member support.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const source = path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR), out = path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT)
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-partial-tie-import-')))
let win, scene, openFile, step = 'start'
const result = filePath => ({ filePath, fileName: path.basename(filePath) })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:export', (_, v) => { const f = path.join(scene, 'view.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('midi:save', (_, v) => { const f = path.join(scene, 'view.mid'); fs.writeFileSync(f, Buffer.from(v.contents)); return result(f) })
ipcMain.handle('pdf:save', async () => {
  fs.writeFileSync(path.join(scene, 'print.json'), JSON.stringify(await ink(true), null, 2))
  const f = path.join(scene, 'view.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f)
})
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = async (fn, arg) => {
  const r = await win.webContents.executeJavaScript(`(async()=>{try{return {value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(error){return {error:String(error.stack||error)}}})()`)
  if (r.error) throw Error(step + ':' + r.error); return r.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async (fn, arg) => { const start = Date.now(); while (!await run(fn, arg)) { assert(Date.now() - start < 12000, step); await settle() } }
const click = async label => {
  console.log(step, label)
  await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error('Unavailable public control:' + label); n.focus(); n.click() }, label); await settle()
}
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const capture = async () => {
  await settle(); await new Promise((resolve, reject) => { const timer = setTimeout(() => { win.webContents.endFrameSubscription(); reject(Error('No presented frame')) }, 2000); win.webContents.beginFrameSubscription(false, () => { clearTimeout(timer); win.webContents.endFrameSubscription(); resolve() }); win.webContents.invalidate() })
  await settle(); return win.webContents.capturePage()
}
const ink = print => run(print => {
  const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas'), svg = root.querySelector('svg'), w = svg.viewBox.baseVal.width || svg.width.baseVal.value, h = svg.viewBox.baseVal.height || svg.height.baseVal.value
  const ties = [...root.querySelectorAll('.vf-stavetie path')].map(n => { const b = n.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height, system: Number(n.closest('.vf-stavetie').dataset.systemIndex) } })
  return { ties, heads: root.querySelectorAll('.vf-notehead').length, withinSvg: ties.every(b => b.x >= 0 && b.y >= 0 && b.x + b.width <= w + .1 && b.y + b.height <= h + .1), overflow: document.documentElement.scrollWidth > innerWidth }
}, Boolean(print))
const save = async name => {
  await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음'))
  const bytes = fs.readFileSync(path.join(scene, 'current.chromatics')); fs.writeFileSync(path.join(scene, name + '.chromatics'), bytes); return JSON.parse(bytes)
}
const deadline = setTimeout(() => { console.error('DEADLINE', step); app.exit(124) }, 120000)
const choose = async (label, index) => {
  await run(label => { const n = [...document.querySelectorAll('label')].find(n => n.textContent === label)?.control; if (!n?.checkVisibility() || n.disabled) throw Error('Unavailable choice:' + label); n.scrollIntoView({ block: 'center' }); n.focus() }, label)
  await key('Space'); await key('Home'); for (let i = 0; i < index; i++) await key('Down'); await key('Enter')
}
const selectNote = async id => {
  await run(id => [...document.querySelectorAll('.score-canvas .notation-event')].find(n => n.dataset.eventId === id).scrollIntoView({ block: 'center' }), id); await settle()
  const q = await run(id => {
    const n = [...document.querySelectorAll('.score-canvas .notation-event')].find(n => n.dataset.eventId === id), g = n.querySelector('.vf-notehead text'), c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(g).font
    const m = c.measureText(g.textContent), p = g.getStartPositionOfChar(0), q = new DOMPoint(p.x + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, p.y + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2).matrixTransform(g.getScreenCTM())
    return { x: Math.round(q.x), y: Math.round(q.y), owner: document.elementFromPoint(q.x, q.y)?.closest('.notation-event')?.dataset.eventId, footerTop: document.querySelector('.studio-status').getBoundingClientRect().top }
  }, id)
  assert.equal(q.owner, id); assert(q.y >= 0 && q.y < q.footerTop)
  for (const type of ['mouseDown', 'mouseUp']) win.webContents.sendInputEvent({ type, x: q.x, y: q.y, button: 'left', clickCount: 1 })
  await settle(); assert.equal(await run(() => document.activeElement.dataset.eventId), id)
}
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
  win.webContents.on('will-prevent-unload', e => e.preventDefault()); const rows = [], bytes = fs.readFileSync(path.join(source, 'source.chromatics')), original = JSON.parse(bytes)
  try {
    for (const width of [960, 1400]) for (const view of ['score', 'part-a', 'part-b']) {
      step = `${width}-${view}`; console.log('START', step); scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
      const contract = JSON.parse(fs.readFileSync(path.join(source, view + '.json')))
      nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800); openFile = path.join(source, 'source.chromatics')
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
      await click('파일'); await click('프로젝트 열기'); await wait(title => document.querySelector('.studio-document').textContent.includes(title), original.score.title)
      if (view !== 'score') { await click('형식'); await click('악보 설정'); await choose('악보 보기', 1); await choose('파트보 선택', view === 'part-a' ? 0 : 1) }
      await settle()
      const screen = await ink(); fs.writeFileSync(path.join(scene, 'screen.json'), JSON.stringify(screen, null, 2))
      assert.equal(screen.heads, contract.heads); assert.equal(screen.ties.length, contract.tiePaths); assert(screen.withinSvg && !screen.overflow)
      assert.deepEqual([...new Set(screen.ties.map(t => t.system))].sort(), Array.from({ length: contract.systems }, (_, i) => i))
      await run(() => document.querySelector('.score-canvas svg').scrollIntoView({ block: 'start' })); fs.writeFileSync(path.join(scene, 'screen.png'), (await capture()).toPNG())
      await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기'); assert.deepEqual(fs.readFileSync(path.join(scene, 'view.mid')), fs.readFileSync(path.join(source, view + '.mid')))
      await click('MusicXML 내보내기'); assert.equal(fs.readFileSync(path.join(scene, 'view.musicxml'), 'utf8'), fs.readFileSync(path.join(source, view + '.musicxml'), 'utf8'))
      await run(() => { const n = document.querySelector('input[aria-label="PDF 목표 장수"]'); if (!n?.checkVisibility() || n.disabled) throw Error('PDF target unavailable'); n.scrollIntoView({ block: 'center' }); n.focus(); n.select() })
      await win.webContents.insertText(String(contract.pages)); await key('Tab')
      await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
      const printed = JSON.parse(fs.readFileSync(path.join(scene, 'print.json'))); assert.equal(printed.ties.length, contract.tiePaths); assert(printed.withinSvg)
      const after = await save('after-output'); assert.deepEqual(after.score, original.score); assert.deepEqual(after.partLayouts, original.partLayouts)
      assert.deepEqual(after.view, view === 'score' ? { mode: 'score' } : { mode: 'part', partId: contract.partId })
      const partId = contract.partId ?? original.score.parts[0].id, part = original.score.parts.find(p => p.id === partId), first = part.staves[0].measures[0].voices[0].events[0]
      await selectNote(first.id); await key('T')
      const edited = structuredClone(original.score); for (const m of edited.parts.find(p => p.id === partId).staves[0].measures) delete m.voices[0].events[0].ties
      const removed = await save('removed'); assert.deepEqual(removed.score, edited); assert.deepEqual(removed.partLayouts, original.partLayouts)
      await selectNote(first.id); await key('Z', ['control']); assert.deepEqual((await save('undo')).score, original.score)
      await selectNote(first.id); await key('Z', ['control', 'shift']); assert.deepEqual((await save('redo')).score, edited)
      await selectNote(first.id); await key('Z', ['control']); assert.deepEqual((await save('restored')).score, original.score)
      openFile = path.join(scene, 'after-output.chromatics'); await click('파일'); await click('프로젝트 열기'); await settle()
      const reopened = await save('reopened'); assert.deepEqual(reopened.score, original.score); assert.deepEqual(reopened.partLayouts, original.partLayouts)
      assert.equal((await ink()).ties.length, contract.tiePaths); assert.deepEqual(fs.readFileSync(path.join(source, 'source.chromatics')), bytes)
      rows.push({ width, view, expectedPages: contract.pages, screen, nativeScoreAndLayoutsExact: true, neighbourPartPreserved: true, oneUndoRedo: true, reopened: true, midiExact: true, xmlExact: true, pdfWritten: true }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
    }
    console.log('PASS', rows.length, 'independent part-page tie paths;native/undo/reopen/XML/MIDI/PDF;actual PDF page/raster review is separate')
  } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), rows }, null, 2)); throw error }
  finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
