// Actual File import of valid XML with unsupported member-specific ties.
// Native/MIDI/PDF comparisons describe the converted model, not source fidelity.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const source = path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR), out = path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT)
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-partial-tie-import-')))
let win, scene, fixture, reopen, step = 'start'
const result = filePath => ({ filePath, fileName: path.basename(filePath) })
ipcMain.handle('musicxml:open', () => { const f = path.join(source, fixture, 'source.musicxml'); return { ...result(f), contents: fs.readFileSync(f, 'utf8') } })
ipcMain.handle('project:open', () => ({ ...result(reopen), contents: fs.readFileSync(reopen, 'utf8') }))
ipcMain.handle('project:save', (_, v) => { const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:export', (_, v) => { const f = path.join(scene, 'converted.musicxml'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('midi:save', (_, v) => { const f = path.join(scene, 'converted.mid'); fs.writeFileSync(f, Buffer.from(v.contents)); return result(f) })
ipcMain.handle('pdf:save', async () => {
  fs.writeFileSync(path.join(scene, 'print.json'), JSON.stringify(await ink(true), null, 2))
  const f = path.join(scene, 'converted.pdf'); fs.writeFileSync(f, await win.webContents.printToPDF({ preferCSSPageSize: true })); return result(f)
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
const key = async keyCode => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode }); if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode }); await settle() }
const capture = async () => {
  await settle(); await new Promise((resolve, reject) => { const timer = setTimeout(() => { win.webContents.endFrameSubscription(); reject(Error('No presented frame')) }, 2000); win.webContents.beginFrameSubscription(false, () => { clearTimeout(timer); win.webContents.endFrameSubscription(); resolve() }); win.webContents.invalidate() })
  await settle(); return win.webContents.capturePage()
}
const ink = print => run(print => {
  const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas'), svg = root.querySelector('svg'), w = svg.viewBox.baseVal.width || svg.width.baseVal.value, h = svg.viewBox.baseVal.height || svg.height.baseVal.value
  const ties = [...root.querySelectorAll('.vf-stavetie path')].map(n => { const b = n.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height } })
  return { ties, heads: root.querySelectorAll('.vf-notehead').length, withinSvg: ties.every(b => b.x >= 0 && b.y >= 0 && b.x + b.width <= w + .1 && b.y + b.height <= h + .1), overflow: document.documentElement.scrollWidth > innerWidth }
}, Boolean(print))
const save = async name => {
  await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음'))
  const bytes = fs.readFileSync(path.join(scene, 'current.chromatics')); fs.writeFileSync(path.join(scene, name + '.chromatics'), bytes); return JSON.parse(bytes)
}
const deadline = setTimeout(() => { console.error('DEADLINE', step); app.exit(124) }, 120000)
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
  win.webContents.on('will-prevent-unload', e => e.preventDefault()); const rows = []
  try {
    for (const width of [960, 1400]) for (fixture of (process.argv.includes('--audit-representations') ? ['sound-whole-notation-root', 'sound-whole-notation-upper', 'notation-whole-sound-root', 'notation-whole-sound-upper', 'sound-only', 'notation-only', 'middle-stop'] : ['root-only', 'upper-only', 'whole', 'parallel-voice'])) {
      step = `${width}-${fixture}`; console.log('START', step); scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
      const xmlFile = path.join(source, fixture, 'source.musicxml'), original = fs.readFileSync(xmlFile), expected = JSON.parse(fs.readFileSync(path.join(source, fixture, 'source.chromatics'))), contract = JSON.parse(fs.readFileSync(path.join(source, fixture, 'contract.json')))
      nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
      await click('파일'); await click('MusicXML 가져오기')
      await wait(id => [...document.querySelectorAll('.score-canvas .notation-event')].some(n => n.dataset.eventId === id), contract.eventId)
      const report = await run(() => { const n = document.querySelector('[aria-label="MusicXML 경고 상세"]'); return n ? { text: n.textContent, visible: n.checkVisibility(), technical: [...n.querySelectorAll('.studio-warning-technical__content')].map(p => p.checkVisibility()) } : null })
      if (process.argv.includes('--audit-compact-report') && contract.warnings > 1) {
        await wait(() => document.querySelector('.editor-status').textContent.includes('source.musicxml'))
        fs.writeFileSync(path.join(scene, 'initial.png'), (await capture()).toPNG())
        const initial = await run(() => {
          const report = document.querySelector('[aria-label="MusicXML 경고 상세"]'), button = [...report.querySelectorAll('button')].find(n => n.textContent.trim().startsWith('마디별 경고 상세'))
          const glyph = document.querySelector('.score-canvas .vf-notehead text'), context = document.createElement('canvas').getContext('2d')
          context.font = getComputedStyle(glyph).font
          const m = context.measureText(glyph.textContent), p = glyph.getStartPositionOfChar(0), matrix = glyph.getScreenCTM()
          const top = new DOMPoint(p.x, p.y - m.actualBoundingBoxAscent).matrixTransform(matrix).y, bottom = new DOMPoint(p.x, p.y + m.actualBoundingBoxDescent).matrixTransform(matrix).y
          return { reportHeight: report.getBoundingClientRect().height, top, bottom, footerTop: document.querySelector('.studio-status').getBoundingClientRect().top, readoutTop: document.querySelector('.editor-status').getBoundingClientRect().top, toggle: button?.getAttribute('aria-expanded'), overflow: document.documentElement.scrollWidth > innerWidth }
        })
        fs.writeFileSync(path.join(scene, 'initial-geometry.json'), JSON.stringify(initial, null, 2))
        assert(initial.top >= 0 && initial.bottom < initial.footerTop, 'Initial warning summary must leave real first-note ink in the viewport')
        assert.equal(initial.toggle, 'false'); assert.equal(initial.overflow, false)
        await run(() => { const n = [...document.querySelector('[aria-label="MusicXML 경고 상세"]').querySelectorAll('button')].find(n => n.textContent.trim().startsWith('마디별 경고 상세')); n.focus() })
        await key('Enter'); assert(await run(() => [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] button')].find(n => n.textContent.trim().startsWith('마디별 경고 상세')).getAttribute('aria-expanded') === 'true'))
        await key('Space'); assert(await run(() => [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] button')].find(n => n.textContent.trim().startsWith('마디별 경고 상세')).getAttribute('aria-expanded') === 'false'))
        await click(`마디별 경고 상세 ${contract.warnings}개`)
      }
      const detailLabel = `마디별 경고 상세 ${contract.warnings}개`
      if (contract.warnings > 1 && await run(label => [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] button')].some(n => n.textContent.trim() === label && n.getAttribute('aria-expanded') === 'false'), detailLabel)) await click(detailLabel)
      if (contract.warnings) {
        assert(report?.visible); assert(report.text.includes('구성음별 타이는 지원하지 않아 원래 연결 범위를 보존하지 못했습니다')); assert(report.text.includes('원본 MusicXML을 함께 보관')); assert.equal(report.technical.length, contract.warnings); assert(report.technical.every(v => !v))
        await run(() => { const n = document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button'); n.scrollIntoView({ block: 'center' }); n.focus() }); await key('Enter')
        assert(await run(() => document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content').checkVisibility())); await key('Space')
        assert.equal(await run(() => document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content').checkVisibility()), false)
        assert(await run(() => document.querySelector('.editor-status').textContent.includes('정지')))
      } else assert.equal(report, null, 'Whole-chord/peer controls must remain warning-free')
      const status = await run(() => { const n = document.querySelector('.editor-status'), r = n.getBoundingClientRect(); return { text: n.textContent, height: r.height, top: r.top } })
      if (contract.warnings) { assert(status.text.includes('경고 상세에서 보존되지 않은 타이를 확인')); assert(!status.text.includes('구성음별 타이는 지원하지 않아 원래 연결 범위를 보존하지 못했습니다')) }
      if (contract.warnings > 1 && await run(label => [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] button')].some(n => n.textContent.trim() === label && n.getAttribute('aria-expanded') === 'true'), detailLabel)) await click(detailLabel)
      fs.writeFileSync(path.join(scene, 'import-report.json'), JSON.stringify({ report, status, claimsPartialTieFidelity: false, convertedModelOnly: true }, null, 2)); fs.writeFileSync(path.join(scene, 'import.png'), (await capture()).toPNG())
      const screen = await ink(); assert.equal(screen.ties.length, contract.tiePaths); assert.equal(screen.heads, contract.heads); assert(screen.withinSvg && !screen.overflow)
      assert.deepEqual((await save('after-import')).score, expected.score)
      await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기')
      assert.deepEqual(fs.readFileSync(path.join(scene, 'converted.mid')), fs.readFileSync(path.join(source, fixture, 'expected.mid')))
      await click('MusicXML 내보내기'); assert.deepEqual(fs.readFileSync(path.join(scene, 'converted.musicxml')), fs.readFileSync(path.join(source, fixture, 'expected.musicxml')))
      await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
      const print = JSON.parse(fs.readFileSync(path.join(scene, 'print.json'))); assert.equal(print.ties.length, contract.tiePaths); assert(print.withinSvg)
      assert.deepEqual((await save('after-output')).score, expected.score)
      reopen = path.join(scene, 'after-output.chromatics'); await click('파일'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, expected.score)
      assert.equal(await run(() => Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]'))), false)
      assert.deepEqual(fs.readFileSync(xmlFile), original)
      await run(() => document.querySelector('.score-canvas svg').scrollIntoView({ block: 'center' })); fs.writeFileSync(path.join(scene, 'converted-score.png'), (await capture()).toPNG())
      rows.push({ width, fixture, warnings: contract.warnings, originalXmlExact: true, convertedNativeExact: true, convertedMidiExact: true, convertedXmlExact: true, pdf: true, reopen: true, claimsPartialTieFidelity: false })
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
    }
    console.log('PASS', rows.length, 'actual XML imports; loss reporting/conversion only;no partial model/external fidelity/OS-dialog claim')
  } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error) }, null, 2)); throw error }
  finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
