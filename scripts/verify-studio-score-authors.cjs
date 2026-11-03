// Actual author metadata/output; owned native/XML/PDF files and QA IPC only.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const captureExisting = process.argv.includes('--capture-existing')
const out = path.resolve(process.env.DDIRORI_AUTHOR_QA_OUT || 'out/ddirori/studio-score-authors')
const source = path.resolve(process.env.DDIRORI_AUTHOR_QA_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics'), original = JSON.parse(fs.readFileSync(source))
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration(); app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-score-authors-')))
let win, scene, step = 'start', openFile, effectiveComposer
const result = f => ({ filePath: f, fileName: path.basename(f) })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:export', (_e, v) => { const f = path.join(scene, 'author.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('pdf:save', async () => {
 const geometry = await run(() => { const root = document.querySelector('.studio-pdf-snapshot'); if (!root) throw Error('Missing actual print source'); const box = n => { const r = n.getBBox(); return { x: r.x, y: r.y, width: r.width, height: r.height } }; return { composerText: root.querySelector('.score-title > .metadata-display--composer')?.textContent, svgs: [...root.querySelectorAll('.notation-preview svg')].map(n => ({ width: n.getAttribute('width'), height: n.getAttribute('height') })), noteheads: [...root.querySelectorAll('.vf-notehead')].map(box), staves: [...root.querySelectorAll('.vf-stave')].map(box), spanPieces: [...root.querySelectorAll('.notation-span-target')].map(n => ({ ...n.dataset })), scope: 'Real print-source SVG before printToPDF,not HTML print-media page coordinates' } })
 fs.writeFileSync(path.join(scene, 'print-source.json'), JSON.stringify(geometry, null, 2))
 if (!captureExisting) assert.equal(geometry.composerText, effectiveComposer ?? '\u00a0', 'Print only actual author text;reserve the existing line without printing an editor label')
 const f = path.join(scene, 'author.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f)
})
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const t = Date.now(); while (!await run(fn)) { assert.ok(Date.now() - t < 10000, step); await settle() } }
const click = async label => { await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error(label); n.focus(); n.click() }, label); await settle() }
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const change = async (label, value) => { await run(({ label, value }) => { const labelNode = [...document.querySelectorAll('.studio-new-score-form label')].find(n => n.textContent.trim() === label); const n = labelNode?.control; if (!n?.checkVisibility()) throw Error(label); n.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, value); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })) }, { label, value }); await settle() }
const save = async name => { await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); const f = path.join(scene, 'current.chromatics'); fs.copyFileSync(f, path.join(scene, `${name}.chromatics`)); return JSON.parse(fs.readFileSync(f)) }
const output = async baseline => {
 effectiveComposer = baseline.score.composer
 await click('내보내기'); await click('MusicXML 내보내기'); await settle(); const xmlFile = path.join(scene, 'author.musicxml'); assert.ok(fs.existsSync(xmlFile))
 const creators = await run(xml => [...new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('creator[type="composer"]')].map(n => n.textContent), fs.readFileSync(xmlFile, 'utf8'))
 assert.deepEqual(creators, effectiveComposer ? [effectiveComposer] : [])
 await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]'))); assert.ok(fs.statSync(path.join(scene, 'author.pdf')).size > 1000)
 const saved = await save('after-output'); assert.deepEqual(saved.score, baseline.score); assert.deepEqual(saved.partLayouts, baseline.partLayouts)
 openFile = path.join(scene, 'current.chromatics'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, baseline.score)
 return { creators, storedComposer: effectiveComposer, sourceAndManualLayoutPreserved: true, pdf: 'author.pdf' }
}
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } }); win.webContents.on('will-prevent-unload', e => e.preventDefault())
 const records = []
 try {
  for (const width of [960, 1400]) {
   for (const [name, composer] of [['undefined', undefined], ['empty', ''], ['named', '기존 작곡가'], ['legacy', 'in-C']]) {
    step = `${width}:existing-${name}`; scene = path.join(out, `${width}-existing-${name}`); fs.mkdirSync(scene, { recursive: true }); const project = structuredClone(original); project.score.composer = composer
    openFile = path.join(scene, 'input.chromatics'); fs.writeFileSync(openFile, JSON.stringify(project)); win.setContentSize(width, 800); await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('Expanded Part Export'))
    const baseline = await save('before-output'); if (composer) assert.equal(baseline.score.composer, composer)
    records.push({ width, kind: `existing-${name}`, ...await output(baseline) }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ captureExisting, records }, null, 2))
   }
   if (!captureExisting) for (const composer of [undefined, '직접 입력한 작곡가']) {
    step = `${width}:new-${composer ? 'named' : 'blank'}`; scene = path.join(out, `${width}-new-${composer ? 'named' : 'blank'}`); fs.mkdirSync(scene, { recursive: true }); await win.loadFile(path.resolve('out/renderer/index.html')); await settle(); await click('새 악보 만들기')
    const defaultComposer = await run(() => [...document.querySelectorAll('.studio-new-score-form label')].find(n => n.textContent.trim() === '작곡가').control.value)
    assert.equal(defaultComposer, '', 'New score must not silently assign a brand/app name as its author')
    await change('제목', 'Author QA'); if (composer) await change('작곡가', composer); await click('만들기'); await settle(); await key('N'); await key('C'); await key('Escape')
    const baseline = await save('created'); assert.equal(baseline.score.composer, composer); assert.ok(baseline.score.parts[0].staves[0].measures[0].voices[0].events.some(e => e.type === 'note'))
    await key('Z', ['control']); const undone = await save('undo'); assert.equal(undone.score.parts[0].staves[0].measures[0].voices[0].events.some(e => e.type === 'note'), false); await key('Z', ['control', 'shift']); assert.deepEqual((await save('redo')).score, baseline.score)
    records.push({ width, kind: composer ? 'new-named' : 'new-blank', ...await output(baseline) }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ captureExisting, records }, null, 2))
   }
  }
  console.log(captureExisting ? 'CAPTURED existing author/header/music reference;not blank-author acceptance' : 'PASS960/1400 new blank/named authors and existing undefined/empty/named/legacy native/XML/PDF;source/undo/reopen preserved')
 } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records }, null, 2)); throw error }
 finally { win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
