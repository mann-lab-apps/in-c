// Real renderer/disk with delayed QA MIDI/XML copy boundaries; no OS dialog claim.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), crypto = require('node:crypto')
const auditXml = process.argv.includes('--audit-xml'), extension = auditXml ? 'musicxml' : 'mid'
const out = path.resolve(process.env.DDIRORI_MIDI_RESULT_OUT || (auditXml ? 'out/ddirori/studio-xml-copy-results' : 'out/ddirori/studio-midi-results'))
const source = path.resolve(process.env.DDIRORI_MIDI_RESULT_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const original = JSON.parse(fs.readFileSync(source)), next = structuredClone(original); next.score.title = '다음 악보'
fs.mkdirSync(out, { recursive: true }); const replacement = path.join(out, 'next-document.chromatics'); fs.writeFileSync(replacement, JSON.stringify(next))
app.disableHardwareAcceleration(); app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-midi-results-')))
let win, scene, step = 'start', openFile = source, finishMidi, requested
const result = f => ({ filePath: f, fileName: path.basename(f) }), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle(auditXml ? 'musicxml:export' : 'midi:save', (_e, request) => {
 requested = { ...request, contents: auditXml ? request.contents : [...request.contents] }; fs.writeFileSync(path.join(scene, `requested.${extension}`), Buffer.from(request.contents))
 return new Promise((resolve, reject) => { finishMidi = failure => {
  if (failure) { reject(new Error(auditXml ? 'Old XML copy failed' : 'Old MIDI failed')); return }
  const f = path.join(scene, `old-request.${extension}`); fs.writeFileSync(f, Buffer.from(request.contents)); resolve(result(f))
 } })
})
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const t = Date.now(); while (!await run(fn)) { assert.ok(Date.now() - t < 10000, step); await settle() } }
const click = async label => { await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error(label); n.focus(); n.click() }, label); await settle() }
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const state = () => run(() => ({ status: document.querySelector('.editor-status > span:last-child')?.textContent, document: document.querySelector('.studio-document').textContent, selected: [...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n => ({ ...n.dataset })), history: document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0], overflow: document.documentElement.scrollWidth > innerWidth }))
const save = async name => { await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); const f = path.join(scene, 'current.chromatics'); fs.copyFileSync(f, path.join(scene, `${name}.chromatics`)); return JSON.parse(fs.readFileSync(f)) }
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
 const records = []
 try {
  for (const width of (process.argv.includes('--probe-only') ? [960] : [960, 1400])) for (const action of (process.argv.includes('--probe-only') ? ['edit-success'] : ['replace-success', 'replace-error', 'edit-success'])) {
   step = `${width}:${action}`; scene = path.join(out, step.replace(':', '-')); fs.mkdirSync(scene, { recursive: true }); openFile = source; finishMidi = undefined
   win.setContentSize(width, 800); win.webContents.once('will-prevent-unload', e => e.preventDefault()); await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
   await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('Expanded Part Export'))
   await click('내보내기'); await click(auditXml ? 'MusicXML 내보내기' : 'MIDI 내보내기'); const t = Date.now(); while (!finishMidi) { assert.ok(Date.now() - t < 10000, `Missing real ${extension} bridge`); await settle() }
   const requestedBytes = Buffer.from(requested.contents), expected = structuredClone(action === 'edit-success' ? original.score : next.score)
   if (action === 'edit-success') {
    await click('음표'); await click('악보로 이동'); assert.equal(await run(() => Boolean(document.activeElement?.closest('.score-canvas'))), true); await key('Up', ['alt','shift'])
    const event = expected.parts[1].staves[0].measures[0].voices[0].events[0]; event.pitches = [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]; event.pitch = event.pitches[0]
   } else { openFile = replacement; await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('다음 악보')) }
   const before = await state(); finishMidi(action === 'replace-error'); await settle(); const after = await state()
   assert.deepEqual(after.selected, before.selected); assert.equal(after.history, before.history); assert.equal(after.document, before.document); assert.equal(after.overflow, false)
   if (action === 'edit-success') { assert.match(after.status, /내보내기 시작 이후의 수정 내용은 포함되지 않았습니다/); assert.match(after.document, /저장하지 않은 변경/); assert.equal(after.history, '1회 수정') }
   else assert.equal(after.status, before.status, 'Old document success/error must not replace the current status')
   if (action !== 'replace-error') assert.deepEqual(fs.readFileSync(path.join(scene, `old-request.${extension}`)), requestedBytes)
   fs.writeFileSync(path.join(scene, 'screen.png'), (await win.webContents.capturePage()).toPNG())
   await run(() => document.querySelector('.editor-status').scrollIntoView({block:'center'})); await settle()
   const statusBounds = await run(() => { const r=document.querySelector('.editor-status').getBoundingClientRect(); return {top:r.top,bottom:r.bottom,viewport:innerHeight,text:document.querySelector('.editor-status').textContent} })
   assert.ok(statusBounds.top>=0 && statusBounds.bottom<=statusBounds.viewport,'Completion status must be visibly reachable')
   fs.writeFileSync(path.join(scene,'status-viewport.json'),JSON.stringify(statusBounds,null,2)); fs.writeFileSync(path.join(scene,'status.png'),(await win.webContents.capturePage()).toPNG())
   const saved = await save('current-after-midi'); assert.deepEqual(saved.score, expected); assert.deepEqual(saved.partLayouts, original.partLayouts)
   if (action === 'edit-success') { await key('Z', ['control']); assert.deepEqual((await save('undo')).score, original.score) }
   openFile = path.join(scene, 'current.chromatics'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, action === 'edit-success' ? original.score : expected)
   records.push({ width, action, before, after, requestSha256: hash(requestedBytes), ...(auditXml ? {} : { requestMidiSha256: hash(requestedBytes) }), format: extension, requestBytesPreserved: action !== 'replace-error', nativeCurrentExact: true, selectionHistoryPreserved: true, scope: 'Actual renderer/preload/disk/native keys; delayed QA save boundary, not physical OS dialog or MIDI listening' })
   fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(records, null, 2))
  }
  console.log(`PASS960/1400 ${extension} late success/error isolation and same-document edits; requested bytes/current native/selection/undo preserved`)
 } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records, state: await state() }, null, 2)); throw error }
 finally { win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
