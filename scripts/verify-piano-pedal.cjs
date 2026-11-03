// Actual import/save/export/playback of the generated, authored pedal QA score.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const output = path.resolve('out/piano-pedal-qa')
const source = path.resolve('out/piano-instrument-qa/expression-score.musicxml')
fs.mkdirSync(output, { recursive: true })
assert.ok(fs.existsSync(source), 'Run verify-piano-sampler.cjs first to generate the QA score')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(output, 'user-data'))
let saved, exported, midi, win
for (const name of ['recent-musicxml:list', 'recent-musicxml:add', 'project:list-backups']) ipcMain.handle(name, () => [])
for (const name of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(name, () => null)
ipcMain.handle('musicxml:open', () => ({ filePath: source, fileName: path.basename(source), contents: fs.readFileSync(source, 'utf8') }))
ipcMain.handle('project:save', (_, input) => {
  saved = JSON.parse(input.contents)
  fs.writeFileSync(path.join(output, 'saved.chromatics'), input.contents)
  return { filePath: path.join(output, 'saved.chromatics'), fileName: 'saved.chromatics' }
})
ipcMain.handle('musicxml:export', (_, input) => {
  exported = input.contents
  fs.writeFileSync(path.join(output, 'export.musicxml'), exported)
  return { filePath: path.join(output, 'export.musicxml'), fileName: 'export.musicxml' }
})
ipcMain.handle('midi:save', (_, input) => {
  midi = Buffer.from(input.contents)
  fs.writeFileSync(path.join(output, 'export.mid'), midi)
  return { filePath: path.join(output, 'export.mid'), fileName: 'export.mid' }
})
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const wait = async (fn, label) => {
  const until = Date.now() + 15000
  while (!await fn()) { assert.ok(Date.now() < until, label); await pause(50) }
}
const click = label => run(label => {
  const node = [...document.querySelectorAll('button')].find(n =>
    (n.getAttribute('aria-label') === label || n.textContent.trim() === label) && n.checkVisibility())
  if (!node || node.disabled) throw Error(`Unavailable ${label}`)
  node.click()
}, label)
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 45000)
  try {
    win = new BrowserWindow({ width: 1200, height: 950, show: true, webPreferences: {
      preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false
    } })
    win.webContents.on('console-message', event => { if (event.level === 'error') console.error(event.message) })
    await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    await wait(() => run(() => Boolean(document.querySelector('[aria-label="피아노 음색"]'))), 'piano UI')
    await run(() => { window.confirm = () => true })
    await click('파일'); await click('MusicXML 가져오기')
    await wait(() => run(() => document.body.textContent.includes('expression-score.musicxml을 가져왔습니다.')), 'actual XML import')
    await click('파일')
    await click('프로젝트 저장')
    await wait(() => saved, 'native save')
    assert.deepEqual(saved.score.pedalEvents.map(p => p.value), [127, 0])
    await wait(() => run(() => document.body.textContent.includes('saved.chromatics에 저장했습니다.')), 'native save UI completed')
    await click('파일'); await click('내보내기 설정')
    await click('MusicXML 내보내기')
    await wait(() => exported, 'XML export including the save-signature guard')
    assert.ok(exported.includes('damper-pedal'))
    const schema = path.resolve('src/musicxml/schema/musicxml-4.0')
    execFileSync('xmllint', ['--nonet', '--noout', '--schema', path.join(schema, 'musicxml.xsd'), path.join(output, 'export.musicxml')],
      { env: { ...process.env, XML_CATALOG_FILES: path.join(schema, 'catalog.xml') } })
    await click('MIDI 내보내기')
    await wait(() => midi, 'MIDI export')
    assert.ok(midi.includes(Buffer.from([0xb0, 64, 127])))
    assert.ok(midi.includes(Buffer.from([0xb0, 64, 0])))
    await run(() => {
      window.__pedalNodes = []
      const create = AudioContext.prototype.createBufferSource
      AudioContext.prototype.createBufferSource = function () {
        const node = create.call(this), start = node.start.bind(node), stop = node.stop.bind(node), record = {}
        window.__pedalNodes.push(record)
        node.start = function (...args) { record.start = args[0]; return start(...args) }
        node.stop = function (...args) { record.stop = args[0]; return stop(...args) }
        return node
      }
    })
    await click('재생')
    await wait(() => run(() => window.__pedalNodes[0]?.stop !== undefined), 'authored pedal note release scheduled')
    const first = await run(() => window.__pedalNodes[0])
    const ringingSeconds = first.stop - first.start
    assert.ok(Math.abs(ringingSeconds - 2.63) < .02, `Pedal must hold first staccato note to beat 4 plus release: ${ringingSeconds}`)
    await click('정지')
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ actualXmlImport: true, nativePedalPreserved: true,
      xmlSaveGuard: true, musicXml40Schema: true, midiCC64: true, firstNoteRingingSeconds: ringingSeconds,
      label: '자체 생성 QA 악보. 실제 연주 학습/청음 성과가 아님.' }, null, 2))
    console.log('PASS actual pedal XML import -> native/XML/MIDI export -> sample ringing')
  } catch (error) {
    if (win) fs.writeFileSync(path.join(output, 'failure.txt'), String(error) + '\n' + await run(() => document.body.innerText))
    throw error
  } finally { clearTimeout(timeout); win?.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
