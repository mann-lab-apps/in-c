// Owned native fixtures, real public controls and pointer/key events; no OS dialogs.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const invalidTieOpenAudit = process.argv.includes('--audit-invalid-tie-open')
const source = path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR)
const out = path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT)
fs.mkdirSync(out, { recursive: true })
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-tie-time-')))
app.disableHardwareAcceleration()
let win, scene, input, step = 'start'
const result = filePath => ({ filePath, fileName: path.basename(filePath) })
ipcMain.handle('project:open', () => ({ ...result(input), contents: fs.readFileSync(input, 'utf8') }))
ipcMain.handle('project:save', (_, value) => {
  const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, value.contents); return result(f)
})
ipcMain.handle('midi:save', (_, value) => {
  const f = path.join(scene, 'output.mid'); fs.writeFileSync(f, Buffer.from(value.contents)); return result(f)
})
ipcMain.handle('pdf:save', async () => {
  const ink = await run(() => document.querySelectorAll('.studio-pdf-snapshot .vf-stavetie path').length)
  fs.writeFileSync(path.join(scene, 'print-ink.json'), JSON.stringify({ tiePaths: ink }))
  const f = path.join(scene, 'output.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f)
})
for (const channel of ['project:list-backups', 'recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(channel, () => [])
for (const channel of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(channel, () => null)
const run = async (fn, arg) => {
  const response = await win.webContents.executeJavaScript(`(async () => { try { return { value: await (${fn})(${JSON.stringify(arg) ?? ''}) } } catch (error) { return { error: String(error.stack || error) } } })()`);
  if (response.error) throw Error(step + ': ' + response.error); return response.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const start = Date.now(); while (!await run(fn)) { assert(Date.now() - start < 12000, step); await settle() } }
const click = async label => { step = path.basename(scene) + ':click:' + label; console.log(step); await run(label => {
  const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility())
  if (!n || n.disabled) throw Error('Unavailable public control: ' + label)
  n.focus(); n.click()
}, label); await settle() }
const key = async (keyCode, modifiers = []) => {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
  if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle()
}
const selectNote = async id => {
  await run(id => document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"]`).scrollIntoView({ block: 'center' }), id)
  await settle()
  const p = await run(id => {
    const n = document.querySelector(`.score-canvas .notation-event[data-event-id="${id}"] .vf-notehead`)
    const r = n.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  }, id)
  win.webContents.sendInputEvent({ type: 'mouseDown', ...p, button: 'left', clickCount: 1 })
  win.webContents.sendInputEvent({ type: 'mouseUp', ...p, button: 'left', clickCount: 1 }); await settle()
  assert.equal(await run(() => document.activeElement?.getAttribute('data-event-id')), id)
}
const save = async name => {
  await click('파일'); await click('프로젝트 저장')
  await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음'))
  const bytes = fs.readFileSync(path.join(scene, 'current.chromatics'))
  fs.writeFileSync(path.join(scene, name + '.chromatics'), bytes); return JSON.parse(bytes).score
}
const deadline = setTimeout(() => { console.error('DEADLINE', step); app.exit(124) }, 90000)
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
  win.webContents.on('will-prevent-unload', e => e.preventDefault())
  const records = []
  try {
    for (const width of [960, 1400]) for (const kind of (invalidTieOpenAudit ? ['same-gap', 'boundary-gap', 'boundary-offset'] : ['same-gap', 'boundary-gap', 'boundary-offset', 'pickup'])) {
      step = `${width}-${kind}`; console.log('START', step)
      scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
      const fixtureKind = invalidTieOpenAudit ? 'pickup' : kind
      input = path.join(source, fixtureKind, 'source.chromatics')
      const bytes = fs.readFileSync(input), original = JSON.parse(bytes).score
      const contract = JSON.parse(fs.readFileSync(path.join(source, fixtureKind, 'contract.json')))
      nativeTheme.themeSource = width === 960 ? 'dark' : 'light'
      win.setContentSize(width, 800); await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } })
      app.focus({ steal: true }); win.focus(); await settle(); await click('파일'); await click('프로젝트 열기')
      await wait(() => Boolean(document.querySelector('.score-canvas .notation-event')))
      await selectNote(contract.eventId)
      const disabled = await run(() => document.querySelector('button[aria-label="타이 추가, 단축키 T"]').disabled)
      fs.writeFileSync(path.join(scene, 'enablement.json'), JSON.stringify({ disabled, expected: !contract.enabled }))
      assert.equal(disabled, !contract.enabled, 'Tie affordance must follow actual temporal adjacency')
      await key('T')
      const expected = contract.enabled ? JSON.parse(fs.readFileSync(path.join(source, fixtureKind, 'expected.chromatics'))).score : original
      if (invalidTieOpenAudit) {
        const bad = JSON.parse(fs.readFileSync(path.join(source, kind, 'source.chromatics')))
        const notes = bad.score.parts[0].staves[0].measures.flatMap(m => m.voices[0].events)
        notes[0].ties = { start: true }; notes[1].ties = { stop: true }
        const badBytes = JSON.stringify(bad), badFile = path.join(scene, 'invalid-tie.chromatics')
        fs.writeFileSync(badFile, badBytes)
        const selection = await run(() => [...document.querySelectorAll('.notation-event.is-selected')].map(n => n.dataset.eventId))
        assert(await run(() => document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
        // Only this owned QA renderer auto-confirms document replacement; not OS dialog QA.
        await run(() => { window.confirm = () => true })
        input = badFile; await click('파일'); await click('프로젝트 열기')
        await wait(() => document.querySelector('.editor-status').textContent.includes('프로젝트를 열지 못했습니다.'))
        const failure = await run(() => ({ summary: document.querySelector('.editor-status').textContent, dirty: document.querySelector('.studio-document').textContent, selected: [...document.querySelectorAll('.notation-event.is-selected')].map(n => n.dataset.eventId), expanded: document.querySelector('.studio-status__technical button').getAttribute('aria-expanded') }))
        assert(failure.summary.includes('현재 악보는 유지됩니다.')); assert(failure.summary.includes('1회 수정'))
        assert(!failure.summary.includes('Invalid project ties')); assert(failure.dirty.includes('저장하지 않은 변경'))
        assert.deepEqual(failure.selected, selection); assert.equal(failure.expanded, 'false')
        await run(() => { const n = document.querySelector('.studio-status__technical button'); n.scrollIntoView({ block: 'nearest' }); n.focus() })
        await key('Enter')
        const diagnostic = await run(() => { const n = document.querySelector('.studio-warning-technical__content'); return { text: n.textContent, visible: n.checkVisibility(), expanded: document.querySelector('.studio-status__technical button').getAttribute('aria-expanded') } })
        assert(diagnostic.visible); assert.equal(diagnostic.expanded, 'true'); assert(diagnostic.text.includes('Invalid project ties'))
        await key('Space'); assert.equal(await run(() => document.querySelector('.studio-status__technical button').getAttribute('aria-expanded')), 'false')
        assert(await run(() => document.querySelector('.editor-status').textContent.includes('정지')))
        assert.equal(fs.readFileSync(badFile, 'utf8'), badBytes)
        fs.writeFileSync(path.join(scene, 'invalid-open-preservation.json'), JSON.stringify({ failure, diagnostic, sourceUnchanged: true, confirmation: 'owned QA override; not OS dialog' }, null, 2))
        fs.writeFileSync(path.join(scene, 'invalid-open.png'), (await win.webContents.capturePage()).toPNG())
      }
      assert.deepEqual(await save('after-key'), expected)
      assert.equal(await run(() => document.querySelectorAll('.score-canvas .vf-stavetie path').length), contract.enabled ? 1 : 0)
      if (contract.enabled) {
        await selectNote(contract.eventId); await key('Z', ['control']); assert.deepEqual(await save('undo'), original)
        await selectNote(contract.eventId); await key('Z', ['control', 'shift']); assert.deepEqual(await save('redo'), expected)
        await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기'); await settle()
        assert.deepEqual(fs.readFileSync(path.join(scene, 'output.mid')), fs.readFileSync(path.join(source, fixtureKind, 'expected.mid')))
      } else {
        await click('편집')
        assert.equal(await run(() => [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === '실행 취소' && n.checkVisibility())?.disabled), true)
        await key('Escape')
      }
      input = path.join(scene, 'current.chromatics'); await click('파일'); await click('프로젝트 열기'); await settle()
      assert.deepEqual(await save('reopened'), expected)
      await click('파일'); await click('내보내기 설정'); await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
      assert.equal(JSON.parse(fs.readFileSync(path.join(scene, 'print-ink.json'))).tiePaths, contract.enabled ? 1 : 0)
      await run(() => document.querySelector('.score-canvas svg').scrollIntoView({ block: 'center' })); await settle()
      fs.writeFileSync(path.join(scene, 'screen.png'), (await win.webContents.capturePage()).toPNG())
      assert.deepEqual(fs.readFileSync(path.join(source, fixtureKind, 'source.chromatics')), bytes)
      records.push({ width, kind, disabled, nativeExact: true, pdfTiePaths: contract.enabled ? 1 : 0 })
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(records, null, 2))
    }
    console.log('PASS', records.length, 'temporal tie paths; synthetic input/disk bridge, not OS dialogs or listening')
  } catch (error) {
    fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error) }, null, 2)); throw error
  } finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
