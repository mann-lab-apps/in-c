// Authored native fixture; actual renderer/keymap and disk-backed QA IPC, not OS dialogs.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const sourceDir = path.resolve(process.env.DDIRORI_CHORD_MEMORY_QA_DIR || 'out/ddirori/studio-r3-chord-memory-source')
const out = path.resolve(process.env.DDIRORI_CHORD_MEMORY_UI_DIR || 'out/ddirori/studio-r3-chord-memory-ui')
const originalFile = path.join(sourceDir, 'source.chromatics'), original = JSON.parse(fs.readFileSync(originalFile))
const oracle = fs.readFileSync(path.join(sourceDir, 'expected.mid'))
const contract = JSON.parse(fs.readFileSync(path.join(sourceDir, 'contract.json')))
const title = contract.title || 'Chord accidental memory'
const expectedSigns = contract.signs || [[2,1,0],[1,0,0],[1,0,1],[1,0,0]]
const expectedXml = contract.xmlNotes || [{step:'C',alter:0,octave:4},{step:'E',alter:1,octave:4},{step:'E',alter:1,octave:4},{step:'E',alter:0,octave:4},{step:'E',alter:0,octave:4}]
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-chord-memory-')))
let win, scene, step = 'start', openFile = originalFile
const result = f => ({ filePath: f, fileName: path.basename(f) })
ipcMain.handle('musicxml:open', () => { const f = path.join(scene, 'memory.musicxml'); return { ...result(f), contents: fs.readFileSync(f,'utf8') } })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:export', (_e, v) => { const f = path.join(scene, 'memory.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('midi:save', (_e, v) => { const f = path.join(scene, 'memory.mid'); fs.writeFileSync(f, Buffer.from(v.contents)); return result(f) })
ipcMain.handle('pdf:save', async () => { fs.writeFileSync(path.join(scene, 'print-ink.json'), JSON.stringify(await ink(true), null, 2)); const f = path.join(scene, 'memory.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f) })
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const t = Date.now(); while (!await run(fn)) { assert.ok(Date.now() - t < 12000, step); await settle() } }
const file = async name => { const t = Date.now(); while (!fs.existsSync(path.join(scene, name))) { assert.ok(Date.now() - t < 12000, `${step}:${name}`); await settle() } }
const click = async label => { await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error(`Unavailable ${label}`); n.focus(); n.click() }, label); await settle() }
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const ink = (print = false) => run(print => {
 const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas'); if (!root) throw Error('Missing actual score surface')
 return { tempoText: root.querySelector('.notation-tempo-marking')?.textContent, documentOverflow: document.documentElement.scrollWidth > innerWidth, events: ['memory-chord', 'memory-carried', 'memory-natural', 'memory-after-natural'].map(id => {
  const n = root.querySelector(`.notation-event[data-event-id="${id}"]`); if (!n) throw Error(`Missing ${id}`)
  const text = [...n.querySelectorAll('.vf-notehead > text')].map(n => n.textContent)
  return { id, heads: n.querySelectorAll('.vf-notehead').length, sharp: text.filter(t => t === String.fromCodePoint(0xe262)).length, natural: text.filter(t => t === String.fromCodePoint(0xe261)).length, bounds: (() => { const r = n.getBBox(); return { x: r.x, y: r.y, width: r.width, height: r.height } })() }
 }) }
}, print)
const save = async name => { await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); await file('current.chromatics'); const p = JSON.parse(fs.readFileSync(path.join(scene, 'current.chromatics'))); fs.writeFileSync(path.join(scene, `${name}.chromatics`), JSON.stringify(p, null, 2)); return p }
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
 win.webContents.on('will-prevent-unload', e => e.preventDefault())
 const records = []
 try {
  for (const width of (process.argv.includes('--probe-only') ? [960] : [960, 1400])) {
   step = `${width}:open`; scene = path.join(out, String(width)); fs.mkdirSync(scene, { recursive: true }); openFile = originalFile
   win.setContentSize(width, 800); await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
   await click('파일'); await click('프로젝트 열기'); await wait(() => Boolean(document.querySelector('.score-canvas .notation-event[data-event-id="memory-chord"]'))); assert.ok(await run(title => document.querySelector('.studio-document').textContent.includes(title),title))
   const before = await ink(); if (contract.tempoText) assert.equal(before.tempoText,contract.tempoText); fs.writeFileSync(path.join(scene, 'screen-ink.json'), JSON.stringify(before, null, 2)); fs.writeFileSync(path.join(scene, 'screen.png'), (await win.webContents.capturePage()).toPNG())
   step = `${width}:midi`; await click('내보내기'); await click('MIDI 내보내기'); await file('memory.mid')
   assert.deepEqual(fs.readFileSync(path.join(scene, 'memory.mid')), oracle, 'Entire MIDI, including second beat, must equal independently explicit pitches')
   assert.equal(before.documentOverflow, false)
   assert.deepEqual(before.events.map(e => [e.heads, e.sharp, e.natural]), expectedSigns)
   await click('MusicXML 내보내기'); await file('memory.musicxml')
   const xmlNotes = await run(xml => [...new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('note > pitch')].map(n => ({ step: n.querySelector('step').textContent, alter: Number(n.querySelector('alter')?.textContent || 0), octave: Number(n.querySelector('octave').textContent) })), fs.readFileSync(path.join(scene, 'memory.musicxml'), 'utf8'))
   assert.deepEqual(xmlNotes, expectedXml)
   step = `${width}:pdf`; await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]'))); await file('memory.pdf')
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(scene, 'print-ink.json'))).events.map(e => [e.heads,e.sharp,e.natural]), expectedSigns)
   assert.deepEqual((await save('after-output')).score, original.score)
   step = `${width}:letter`; await run(() => { const n = document.querySelector('.score-canvas .notation-event[data-event-id="memory-carried"]'); n.focus() }); await key('Enter')
   await click('음표'); await click('악보로 이동'); await key(contract.letter || 'E')
   const expected = structuredClone(original.score); const editedNote = expected.parts[0].staves[0].measures[0].voices[0].events[1]; editedNote.pitch = {step:contract.letter || 'E',octave:4,alter:contract.letter === 'F' || !contract.letter ? 1 : -1}; delete editedNote.pitches
   assert.deepEqual((await save('edited')).score, expected)
   await key('Z', ['control']); assert.deepEqual((await save('undo')).score, original.score)
   await key('Z', ['control','shift']); assert.deepEqual((await save('redo')).score, expected)
   openFile = path.join(scene, 'after-output.chromatics'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, original.score)
   if (contract.parsedTempo) {
    await click('MusicXML 가져오기'); await wait(() => Boolean(document.querySelector('.score-canvas .notation-tempo-marking'))); await settle()
    assert.equal(await run(() => document.querySelector('.score-canvas .notation-tempo-marking')?.textContent),contract.tempoText)
    assert.deepEqual((await save('xml-reopened')).score.tempo,contract.parsedTempo)
    fs.unlinkSync(path.join(scene,'memory.mid')); await click('내보내기'); await click('MIDI 내보내기'); await file('memory.mid'); assert.deepEqual(fs.readFileSync(path.join(scene,'memory.mid')),oracle)
   }
   records.push({ width, xmlReopen: Boolean(contract.parsedTempo), before, xmlNotes, midiExact: true, sourceUnchanged: true, oneUndo: true, redo: true, nativeReopen: true })
   fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ records, scope: 'Actual renderer/keymap/PDF/native/XML/MIDI with QA IPC, not OS dialogs, physical IME, listening or external compatibility.' }, null, 2))
  }
  console.log(`PASS ${title} at960/1400: actual signs, full MIDI oracle, XML/PDF/native and one undo`)
 } catch(error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records }, null, 2)); fs.writeFileSync(path.join(scene || out, 'failure.png'), (await win.webContents.capturePage()).toPNG()); throw error }
 finally { win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
