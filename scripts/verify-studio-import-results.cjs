// Real renderer/disk; owned files and delayed QA picker/recent boundaries only.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const auditRecent = process.argv.includes('--audit-recent')
const out = path.resolve(process.env.DDIRORI_IMPORT_RESULT_OUT || 'out/ddirori/studio-import-results')
const source = path.resolve(process.env.DDIRORI_IMPORT_RESULT_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const xml = path.resolve('src/musicxml/fixtures/single-part-treble.musicxml'), original = JSON.parse(fs.readFileSync(source)), next = structuredClone(original)
next.score.title = '다음 가져오기 악보'; fs.mkdirSync(out, { recursive: true }); const replacement = path.join(out, 'next-document.chromatics'); fs.writeFileSync(replacement, JSON.stringify(next))
app.disableHardwareAcceleration(); app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-import-results-')))
let win, scene, step = 'start', openFile = source, finishOpen, finishRecent, holdRecent = false
const deadline=setTimeout(()=>{console.error('Import QA deadline at '+step);app.exit(1)},150000)
const result = f => ({ filePath: f, fileName: path.basename(f) }), xmlResult = () => ({ ...result(xml), contents: fs.readFileSync(xml, 'utf8') })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
const readXml = () => holdRecent ? xmlResult() : new Promise((resolve, reject) => { finishOpen = failure => failure ? reject(new Error('Old import failed')) : resolve(xmlResult()) })
ipcMain.handle('musicxml:open', readXml)
ipcMain.handle('recent-musicxml:open', readXml)
ipcMain.handle('recent-musicxml:add', (_e, file) => holdRecent && !file.format ? new Promise((_resolve, reject) => { finishRecent = () => reject(new Error('Old recent list failed')) }) : [])
ipcMain.handle('project:list-backups', () => [])
ipcMain.handle('recent-musicxml:list', () => auditRecent ? [{ ...result(xml), openedAt: '2026-10-26T00:00:00Z' }] : [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = async (fn, arg) => {
 const answer=await win.webContents.executeJavaScript(`(async()=>{try{return{ok:true,value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(error){return{ok:false,error:error.stack}}})()`)
 if(!answer.ok)throw Error(`${step}: ${answer.error}`)
 return answer.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const t = Date.now(); while (!await run(fn)) { assert.ok(Date.now() - t < 10000, step); await settle() } }
const rawClick = async label => { console.log(step+':command:'+label);await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error('Missing actual command: '+label); n.scrollIntoView({block:'nearest'});n.focus();n.click() }, label); await settle() }
const routes={'파일':['파일','파일 작업 열기'],'음표':['도구','선택 속성 열기'],'내보내기':['파일','내보내기 설정']}
const click = async label => {for(const command of routes[label]??[label])await rawClick(command)}
const key = async (keyCode, modifiers = []) => {
 app.focus({steal:true});win.focus();win.webContents.focus();const start=Date.now()
 while(!(win.isFocused()&&win.webContents.isFocused()&&await run(()=>document.hasFocus()))){assert.ok(Date.now()-start<5000,'Import QA native focus precondition: '+step);await settle()}
 win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
}
const state = () => run(() => ({ status: document.querySelector('.editor-status > span:last-child')?.textContent, document: document.querySelector('.studio-document').textContent, selected: [...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n => ({ ...n.dataset })), history: document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0], confirmations: [...globalThis.__importConfirmations], overflow: document.documentElement.scrollWidth > innerWidth }))
const save = async name => { await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); const f = path.join(scene, 'current.chromatics'); fs.copyFileSync(f, path.join(scene, `${name}.chromatics`)); return JSON.parse(fs.readFileSync(f)) }
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
 const records = []
 win.webContents.on('will-prevent-unload', e => e.preventDefault())
 try {
  for (const width of [960, 1400]) for (const action of (auditRecent ? ['replace-success', 'replace-error', 'recent-error'] : ['replace-success', 'replace-error', 'edit-cancel', 'edit-accept', 'layout-cancel', 'recent-error'])) {
   step = `${width}:${action}`; scene = path.join(out, step.replace(':', '-')); fs.mkdirSync(scene, { recursive: true }); openFile = source; finishOpen = undefined; finishRecent = undefined; holdRecent = false
   win.setContentSize(width, 800); await win.loadFile(path.resolve('out/renderer/index.html'), auditRecent ? undefined : { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
   await run(accept => { globalThis.__importConfirmations = []; window.confirm = message => { globalThis.__importConfirmations.push(message); return accept } }, action === 'edit-accept')
   holdRecent = action === 'recent-error'
   if (auditRecent) {
    await wait(() => Boolean(document.querySelector('.recent-files__list .dd-item-title')))
    fs.writeFileSync(path.join(scene, 'welcome.png'), (await win.webContents.capturePage()).toPNG())
    await run(name => { const n = [...document.querySelectorAll('.recent-files__list .dd-item-title')].find(n => n.textContent === name); if (!n?.checkVisibility() || n.disabled) throw Error('Missing actual welcome recent entry'); n.focus(); n.click() }, path.basename(xml)); await settle()
   } else { holdRecent = false; await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('Expanded Part Export')); holdRecent = action === 'recent-error'; await click('MusicXML 가져오기') }
   const t = Date.now(); while (!(holdRecent ? finishRecent : finishOpen)) { assert.ok(Date.now() - t < 10000, 'Missing delayed import boundary'); await settle() }
   const expected = structuredClone(action.startsWith('replace') || action === 'recent-error' ? next.score : original.score)
   if (action.startsWith('replace') || action === 'recent-error') { openFile = replacement; if (await run(() => [...document.querySelectorAll('button')].some(n => (n.getAttribute('aria-label') || n.textContent.trim()) === '파일' && n.checkVisibility()))) await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('다음 가져오기 악보')) }
   else if (action === 'layout-cancel') {
    await click('내보내기'); await run(() => { const n = document.querySelector('[aria-label="PDF 여백 mm"]'); if (!n?.checkVisibility() || n.disabled) throw Error('Missing actual margin field'); n.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(n, '17'); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })) }); await settle()
   } else {
    await click('음표'); await click('악보로 이동'); await key('Up', ['alt'])
    const event = expected.parts[1].staves[0].measures[0].voices[0].events[0]; event.pitches = [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]; event.pitch = event.pitches[0]
   }
   const before = await state(); if (holdRecent) finishRecent(); else finishOpen(action === 'replace-error'); await settle(); const after = await state()
   assert.equal(after.overflow, false)
   if (action === 'edit-cancel' || action === 'edit-accept' || action === 'layout-cancel') assert.deepEqual(after.confirmations, ['파일 선택 중 편집한 내용을 버리고 MusicXML을 가져올까요?'])
   if (action !== 'edit-accept') { assert.equal(after.document, before.document); assert.equal(after.status, before.status); assert.deepEqual(after.selected, before.selected); assert.equal(after.history, before.history) }
   else { assert.match(after.document, /MusicXML Sketch/); assert.equal(after.history, '0회 수정') }
   fs.writeFileSync(path.join(scene, 'screen.png'), (await win.webContents.capturePage()).toPNG())
   const saved = await save('after-result')
   if (action === 'edit-accept') {
    const sourcePitches = await run(xml => [...new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('part > measure > note > pitch')].map(n => ({ step: n.querySelector('step').textContent, octave: Number(n.querySelector('octave').textContent), alter: Number(n.querySelector('alter')?.textContent || 0) })), fs.readFileSync(xml, 'utf8'))
    const actual = saved.score.parts.flatMap(p => p.staves.flatMap(s => s.measures.flatMap(m => m.voices.flatMap(v => v.events.filter(e => e.type === 'note').map(e => ({ ...e.pitch, alter: e.pitch.alter || 0 }))))))
    assert.deepEqual(actual, sourcePitches); assert.equal(saved.score.title, 'MusicXML Sketch'); assert.deepEqual(saved.partLayouts, [])
   } else assert.deepEqual(saved.score, expected)
   if (action === 'layout-cancel') assert.equal(saved.partLayouts.find(p => p.partId === 'P2').layout.pageSetup.pageMarginMm, 17)
   else if (action !== 'edit-accept') assert.deepEqual(saved.partLayouts, original.partLayouts)
   if (action === 'edit-cancel' || action === 'layout-cancel') { await key('Z', ['control']); const undone = await save('undo'); assert.deepEqual(undone.score, original.score); assert.deepEqual(undone.partLayouts, original.partLayouts) }
   openFile = path.join(scene, 'current.chromatics'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, action === 'edit-cancel' || action === 'layout-cancel' ? original.score : saved.score)
   records.push({ width, action, recentEntry: auditRecent, before, after, nativeCurrentPreserved: true, undoReopen: true, scope: 'Actual renderer/preload/native keys/disk. QA picker/recent and JS confirm responses;not physical OS picker/confirm or IME.' }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(records, null, 2))
  }
  console.log('PASS960/1400 import replacement/error isolation, pending-edit/layout cancel/accept, late recent failure;native undo/reopen preserved; recentEntry=' + auditRecent)
 } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records, state: await state() }, null, 2)); throw error }
 finally { clearTimeout(deadline);win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
