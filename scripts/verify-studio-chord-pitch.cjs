// Owned native fixture, real renderer/keymap and disk-backed QA IPC; not OS dialogs.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_CHORD_QA_OUT || 'out/ddirori/studio-chord-pitch')
const source = path.resolve(process.env.DDIRORI_CHORD_QA_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const baseProject = JSON.parse(fs.readFileSync(source)); let original = baseProject
const chord = original.score.parts[1].staves[0].measures[0].voices[0].events[0]
assert.equal(chord.pitches.length, 2)
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-chord-pitch-')))
let win, scene, step = 'start', openFile = source, deadline
const result = f => ({ filePath: f, fileName: path.basename(f) })
ipcMain.handle('project:open', () => ({ ...result(openFile), contents: fs.readFileSync(openFile, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:export', (_e, v) => { const f = path.join(scene, 'chord.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('midi:save', (_e, v) => { const f = path.join(scene, 'chord.mid'); fs.writeFileSync(f, Buffer.from(v.contents)); return result(f) })
ipcMain.handle('pdf:save', async () => {
 const rootInk = await ink(true); fs.writeFileSync(path.join(scene, 'print-ink.json'), JSON.stringify(rootInk, null, 2))
 const f = path.join(scene, 'chord.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f)
})
for (const c of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(c, () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = async (fn, arg) => { const r = await win.webContents.executeJavaScript(`(async()=>{try{return {ok:true,value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(e){return {ok:false,error:e.stack}}})()`); if(!r.ok)throw Error(r.error);return r.value }
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async (fn, arg) => { const t = Date.now(); while (!await run(fn, arg)) { assert.ok(Date.now() - t < 12000, step); await settle() } }
const file = async name => { const t = Date.now(); while (!fs.existsSync(path.join(scene, name))) { assert.ok(Date.now() - t < 12000, `${step}: ${name}`); await settle() } }
const clickButton = async label => { await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error(`Unavailable ${label}`); n.focus(); n.click() }, label); await settle() }
const workspaces = {'파일':['파일','파일 작업 열기'],'내보내기':['파일','내보내기 설정'],'음표':['도구','선택 속성 열기']}
const click = async label => { const entry=workspaces[label];if(entry){await clickButton(entry[0]);await clickButton(entry[1])}else await clickButton(label) }
const key = async (keyCode, modifiers = []) => {
 app.focus({steal:true});win.focus();win.webContents.focus()
 await wait(()=>document.hasFocus())
 assert.ok(win.isFocused()&&win.webContents.isFocused(),'Owned native window/content must own keys')
 win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers})
 if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers})
 win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
}
const ink = (print = false) => run(({ id, print }) => {
 const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas'); if (!root) throw Error('Missing actual score surface')
 const n = root.querySelector(`.notation-event[data-event-id="${id}"]`); if (!n) throw Error('Missing real chord')
 return { lyrics: [...root.querySelectorAll(`.notation-lyric[data-event-id="${id}"]`)].map(n => n.textContent), heads: [...n.querySelectorAll('.vf-notehead')].map(n => { const r = n.getBBox(); return { x: r.x, y: r.y, width: r.width, height: r.height } }), accidentals: [...n.querySelectorAll('.vf-notehead > text')].filter(n => n.textContent === String.fromCodePoint(0xe262)).length, flats: [...n.querySelectorAll('.vf-notehead > text')].filter(n => n.textContent === String.fromCodePoint(0xe260)).length, documentOverflow: document.documentElement.scrollWidth > window.innerWidth, selected: n.classList.contains('is-selected') }
}, { id: chord.id, print })
const save = async name => { await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); const f = path.join(scene, 'current.chromatics'); fs.copyFileSync(f, path.join(scene, `${name}.chromatics`)); return JSON.parse(fs.readFileSync(f)) }
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
 const records = []
 try {
  for (const width of [960, 1400]) for (const movement of (process.argv.includes('--audit-letter') ? ['single-letter', 'chord-letter'] : process.argv.includes('--audit-spelling') ? ['sharp', 'natural', 'enharmonic'] : ['diatonic', 'chromatic', 'octave'])) {
   step = `${width}:${movement}`;console.log(step+':start');deadline=setTimeout(()=>{console.error('Deadline '+step);app.exit(1)},60000); scene = path.join(out, `${width}-${movement}`); fs.mkdirSync(scene, { recursive: true }); openFile = source; original = structuredClone(baseProject)
   if (process.argv.includes('--audit-spelling')) {
    if (movement !== 'sharp') { const event = original.score.parts[1].staves[0].measures[0].voices[0].events[0]; event.pitches = event.pitches.map(p => ({ ...p, alter: 1 })); event.pitch = event.pitches[0] }
    openFile = path.join(scene, 'input.chromatics'); fs.writeFileSync(openFile, JSON.stringify(original))
   }
   if (process.argv.includes('--audit-letter')) {
    if (movement === 'single-letter') delete original.score.parts[1].staves[0].measures[0].voices[0].events[0].pitches
    openFile = path.join(scene, 'input.chromatics'); fs.writeFileSync(openFile, JSON.stringify(original))
   }
   win.setContentSize(width, 800); win.webContents.once('will-prevent-unload', e => e.preventDefault())
   await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
   await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.studio-document').textContent.includes('Expanded Part Export'))
   const before = await ink(); assert.equal(before.heads.length, movement === 'single-letter' ? 1 : 2); assert.equal(before.selected, true)
   await click('음표'); await click('악보로 이동'); assert.equal(await run(() => Boolean(document.activeElement?.closest('.score-canvas'))), true)
   if (process.argv.includes('--audit-spelling')) {
    if (movement === 'enharmonic') await click('이명동음으로 바꾸기')
    else { await run(label => { const n = document.querySelector(`.studio-note-toolbar [aria-label="임시표"] button[aria-label="${label}"]`); if (!n?.checkVisibility() || n.disabled) throw Error('Missing actual persistent accidental control'); n.focus(); n.click() }, movement === 'natural' ? '제자리표' : '샤프'); await settle() }
    assert.match(await run(() => document.querySelector('[aria-label="음표 편집 대상"]').textContent), /화음 전체/)
   } else if (process.argv.includes('--audit-letter')) await key('D')
   else await key('Up', movement === 'diatonic' ? ['alt', 'shift'] : movement === 'chromatic' ? [] : ['control'])
   const after = await ink(); assert.equal(after.heads.length, process.argv.includes('--audit-letter') ? 1 : 2); assert.equal(after.documentOverflow, false)
   if (process.argv.includes('--audit-letter')) { assert.deepEqual(after.lyrics, before.lyrics); assert.deepEqual(after.lyrics, ['Sing']); assert.equal(after.accidentals, 0); assert.notEqual(after.heads[0].y, before.heads[0].y) }
   else if (movement === 'natural') assert.equal(after.accidentals, 0, 'Natural command clears both unneeded sharps')
   else if (movement === 'enharmonic') { assert.equal(after.accidentals, 0); assert.equal(after.flats, 1) }
   else if (movement === 'chromatic' || movement === 'sharp') assert.equal(after.accidentals, 2, 'Both altered chord members need actual glyphs')
   else before.heads.forEach((head, i) => assert.notEqual(after.heads[i].y, head.y, 'Every chord head must visibly move'))
   assert.match(await run(() => document.querySelector('.editor-status').textContent), /1회 수정/)
   if (process.argv.includes('--audit-spelling') || process.argv.includes('--audit-letter')) fs.writeFileSync(path.join(scene, 'properties.png'), (await win.webContents.capturePage()).toPNG())
   const edited = await save('edited'), expected = structuredClone(original.score)
   const event = expected.parts[1].staves[0].measures[0].voices[0].events[0]
   event.pitches = movement === 'natural' ? [{ step: 'C', octave: 4, alter: 0 }, { step: 'E', octave: 4, alter: 0 }] : movement === 'enharmonic' ? [{ step: 'D', octave: 4, alter: -1 }, { step: 'F', octave: 4, alter: 0 }] : movement === 'diatonic' ? [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }] : (movement === 'chromatic' || movement === 'sharp') ? [{ step: 'C', octave: 4, alter: 1 }, { step: 'E', octave: 4, alter: 1 }] : [{ step: 'C', octave: 5, alter: 0 }, { step: 'E', octave: 5, alter: 0 }]
   event.pitch = event.pitches[0];
   if (process.argv.includes('--audit-letter')) { event.pitch = { step: 'D', octave: 4, alter: 0 }; delete event.pitches } assert.deepEqual(edited.score, expected); assert.deepEqual(edited.partLayouts, original.partLayouts)
   fs.writeFileSync(path.join(scene, 'screen.png'), (await win.webContents.capturePage()).toPNG())
   await key('Z', ['control']); assert.deepEqual((await save('undo')).score, original.score)
   await key('Z', ['control', 'shift']); assert.deepEqual((await save('redo')).score, expected)
   openFile = path.join(scene, 'current.chromatics'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, expected)
   await click('내보내기'); await click('MIDI 내보내기'); await file('chord.mid')
   const midi = [...fs.readFileSync(path.join(scene, 'chord.mid'))], notes = process.argv.includes('--audit-letter') ? [62] : movement === 'natural' ? [60, 64] : movement === 'enharmonic' ? [61, 65] : movement === 'diatonic' ? [62, 65] : (movement === 'chromatic' || movement === 'sharp') ? [61, 65] : [72, 76]
   for (const note of notes) assert.ok(midi.some((b, i) => b === 0x90 && midi[i + 1] === note), `Part MIDI must contain ${note}`)
   await click('MusicXML 내보내기'); await file('chord.musicxml')
   const pitches = await run(({ xml, count }) => { const doc = new DOMParser().parseFromString(xml, 'application/xml'); return [...doc.querySelectorAll('part > measure')][0].querySelectorAll('note > pitch').length ? [...doc.querySelector('part > measure').querySelectorAll('note > pitch')].slice(0, count).map(n => ({ step: n.querySelector('step').textContent, octave: Number(n.querySelector('octave').textContent), alter: Number(n.querySelector('alter')?.textContent || 0) })) : [] }, { xml: fs.readFileSync(path.join(scene, 'chord.musicxml'), 'utf8'), count: event.pitches?.length || 1 })
   assert.deepEqual(pitches, event.pitches || [event.pitch])
   await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]'))); await file('chord.pdf'); assert.ok(fs.statSync(path.join(scene, 'chord.pdf')).size > 1000)
   assert.deepEqual((await save('after-output')).score, expected)
   clearTimeout(deadline)
   records.push({ width, movement, before, after, nativeExact: true, oneUndo: true, redoReopen: true, xmlPitches: pitches, midiNoteOns: notes, pdf: 'chord.pdf' })
   fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ records, scope: 'Actual renderer/keymap/disk/PDF with QA IPC. MIDI bytes checked, no listening/OS dialog/physical IME certification.' }, null, 2))
  }
  console.log('PASS chord commands: actual member ink, one undo, native/XML/MIDI/PDF at960/1400; spelling=' + process.argv.includes('--audit-spelling') + '; letter=' + process.argv.includes('--audit-letter'))
 } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure-dom.html'), await run(id => document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`)?.outerHTML || document.body.innerHTML, chord.id)); fs.writeFileSync(path.join(scene || out, 'failure.png'), (await win.webContents.capturePage()).toPNG()); fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records }, null, 2)); throw error }
 finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
