// Owned Electron warning workflow. CDP/text emulation is not OS/hardware QA.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const source = path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR), out = path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT)
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-warning-workflow-')))
const inputs = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-warning-input-'))
let input = path.join(inputs, '반복과 화음의 타이를 확인할 긴 악보 이름_Studio_가져오기_연습용.musicxml')
const toggleAudit = process.argv.includes('--audit-warning-toggle-visibility')
const recentFocusAudit = process.argv.includes('--audit-late-recent-focus')
const multivoiceTieAudit = process.argv.includes('--audit-multivoice-tie-ink') || process.argv.includes('--audit-multivoice-tie-stems') || process.argv.includes('--audit-multivoice-tie-beams') || process.argv.includes('--audit-multivoice-tie-pieces')
const focusLifetimeAudit = toggleAudit || process.argv.includes('--audit-warning-focus-lifetime')
const longMixedAudit = focusLifetimeAudit || process.argv.includes('--audit-long-mixed')
const letRingAudit = process.argv.includes('--audit-let-ring')
const recentFailureAudit = process.argv.includes('--audit-recent-update-failure')
const conditionalAudit = process.argv.includes('--audit-conditional-ties')
const unknownAudit = letRingAudit || conditionalAudit || process.argv.includes('--audit-unclassified')
const resetAudit = focusLifetimeAudit || process.argv.includes('--audit-report-reset')
const copyAudit = process.argv.includes('--audit-same-file-export')
const mixedAudit = longMixedAudit || unknownAudit || resetAudit || copyAudit || process.argv.includes('--audit-mixed')
let fixture, expected
let win, scene, step = 'start', saved, queueCopy = false, pendingCopy, failRecentAdd = false, disclosureTraversal = [], toggleChecks = []
let deferRecent = false, pendingRecent
let inspectPrint
const fileResult = f => ({ filePath: f, fileName: path.basename(f) })
ipcMain.handle('musicxml:open', () => ({ ...fileResult(input), contents: fs.readFileSync(input, 'utf8') }))
ipcMain.handle('project:save', (_, value) => { saved = path.join(scene, 'current.chromatics'); fs.writeFileSync(saved, value.contents); return fileResult(saved) })
ipcMain.handle('project:open', () => ({ ...fileResult(saved), contents: fs.readFileSync(saved, 'utf8') }))
ipcMain.handle('musicxml:export', (_, value) => {
  const file = path.join(scene, queueCopy ? 'old.musicxml' : 'fresh.musicxml')
  if (queueCopy) return new Promise((resolve, reject) => { pendingCopy = { file, contents: value.contents, resolve, reject } })
  fs.writeFileSync(file, value.contents); return fileResult(file)
})
ipcMain.handle('midi:save', (_, value) => { const file = path.join(scene, 'converted.mid'); fs.writeFileSync(file, Buffer.from(value.contents)); return fileResult(file) })
ipcMain.handle('pdf:save', async () => {
  const file = path.join(scene, 'converted.pdf')
  const print = await run(() => { const root = document.querySelector('.studio-pdf-snapshot'), svg = root.querySelector('svg'); return { heads: root.querySelectorAll('.vf-notehead').length, ties: root.querySelectorAll('.vf-stavetie path').length, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height } })
  fs.writeFileSync(path.join(scene, 'print.json'), JSON.stringify(print))
  if (inspectPrint) fs.writeFileSync(path.join(scene, 'print-ink.json'), JSON.stringify(await inspectPrint(), null, 2))
  fs.writeFileSync(file, await win.webContents.printToPDF({ preferCSSPageSize: true })); return fileResult(file)
})
for (const c of ['project:list-backups', 'recent-musicxml:list']) ipcMain.handle(c, () => [])
ipcMain.handle('recent-musicxml:add', () => {
  if (deferRecent) return new Promise((resolve, reject) => { pendingRecent = { resolve, reject } })
  if (failRecentAdd) { failRecentAdd = false; throw Error('EACCES: owned recent-list update failure /owned/recent-index.json') }
  return []
})
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = async (fn, arg) => {
  const value = await win.webContents.executeJavaScript(`(async()=>{try{return {value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(e){return {error:String(e.stack||e)}}})()`)
  if (value.error) throw Error(step + ':' + value.error)
  return value.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async (fn, arg) => { const t = Date.now(); while (!await run(fn, arg)) { assert(Date.now() - t < 12000, step); await settle() } }
const key = async (keyCode, modifiers = []) => {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
  if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle()
  if (toggleAudit && (keyCode === 'Enter' || keyCode === 'Space')) {
    const state = await run(() => {
      const n = document.activeElement
      if (!n?.closest('.studio-warning-report')) return null
      const r = n.getBoundingClientRect(), footer = document.querySelector('.studio-status').getBoundingClientRect()
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
      return { label: n.textContent.trim(), expanded: n.getAttribute('aria-expanded'), top: r.top, bottom: r.bottom, left: r.left, right: r.right, footerTop: footer.top, viewportWidth: innerWidth, owner: n.contains(document.elementFromPoint(x,y)), focusVisible: n.matches(':focus-visible') }
    })
    if (state) { toggleChecks.push({ keyCode, ...state }); fs.writeFileSync(path.join(scene, 'toggle-checks.json'), JSON.stringify(toggleChecks, null, 2)); await capture('toggle-' + toggleChecks.length); assert(state.top >= 0 && state.bottom <= state.footerTop && state.owner && state.focusVisible, 'Post-toggle focused report control must remain visible and pointer-owned') }
  }
}
const click = async label => {
  const point = await run(label => {
    const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility())
    if (!n || n.disabled) throw Error('Unavailable public control:' + label)
    n.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = n.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  }, label)
  for (const type of ['mouseDown', 'mouseUp']) win.webContents.sendInputEvent({ type, ...point, button: 'left', clickCount: 1 })
  await settle()
}
const capture = async name => {
  await settle(); await new Promise((resolve, reject) => { const t = setTimeout(() => { win.webContents.endFrameSubscription(); reject(Error('No presented frame')) }, 2000); win.webContents.beginFrameSubscription(false, () => { clearTimeout(t); win.webContents.endFrameSubscription(); resolve() }); win.webContents.invalidate() })
  fs.writeFileSync(path.join(scene, name + '.png'), (await win.webContents.capturePage()).toPNG())
}
// Same chrome-only text emulation for report and failed-import QA.
const { scaleStudioChromeText } = require('./studio-text-scale.cjs')
const scaleText = () => run(scaleStudioChromeText)
const notation = () => run(() => [...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n => {
  const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(n).font
  const m = c.measureText(n.textContent), p = n.getStartPositionOfChar(0)
  return { text: n.textContent, font: c.font, x: p.x - m.actualBoundingBoxLeft, y: p.y - m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent }
}))
const sample = () => run(() => {
  const report = document.querySelector('[aria-label="MusicXML 경고 상세"]'), n = report.querySelector('.studio-warning-report__details .dd-accordion > button') ?? report.querySelector('.studio-warning-technical button'), r = n.getBoundingClientRect()
  return { grouped: Boolean(report.querySelector('.studio-warning-report__details')), warnings: report.querySelectorAll('.studio-warning-report__list > li').length, theme: report.dataset.theme, coarse: matchMedia('(pointer:coarse)').matches, font: parseFloat(getComputedStyle(n).fontSize), height: r.height, left: r.left, right: r.right, buttonScroll: n.scrollWidth, buttonClient: n.clientWidth, reportScroll: report.scrollWidth, reportClient: report.clientWidth, expanded: n.getAttribute('aria-expanded'), overflow: document.documentElement.scrollWidth > innerWidth }
})
const focusDisclosure = async () => {
  if (!longMixedAudit) return run(() => { const n = document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-report__details .dd-accordion > button'); n.scrollIntoView({ block: 'center' }); n.focus() })
  // Actual Tab traversal,including browser focus-scroll,from the current public control.
  const reverse = await run(() => Boolean(document.activeElement?.closest('.studio-warning-technical')))
  let tabs = 0
  while (!await run(() => document.activeElement === document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-report__details .dd-accordion > button'))) { assert(tabs < 100, 'Native keyboard must reach the report disclosure'); await key('Tab', reverse ? ['shift'] : []); tabs++ }
  const state = await run(() => { const n = document.activeElement, r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, focusVisible: n.matches(':focus-visible'), expanded: n.getAttribute('aria-expanded'), footerTop: document.querySelector('.studio-status').getBoundingClientRect().top } })
  fs.writeFileSync(path.join(scene, 'keyboard-state-' + disclosureTraversal.length + '.json'), JSON.stringify({ tabs, reverse, ...state }, null, 2)); await capture('keyboard-state-' + disclosureTraversal.length)
  assert(state.focusVisible && state.top >= 0 && state.bottom <= state.footerTop, 'Keyboard focus-scroll must expose report disclosure')
  disclosureTraversal.push({ tabs, reverse, ...state }); await capture('report-keyboard-' + disclosureTraversal.length)
}
const save = async name => {
  await click('파일'); await click('프로젝트 저장'); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음'))
  const bytes = fs.readFileSync(saved); fs.writeFileSync(path.join(scene, name + '.chromatics'), bytes); return JSON.parse(bytes)
}
const deadline = setTimeout(() => { console.error('DEADLINE', step); app.exit(124) }, 150000)
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
  win.webContents.on('will-prevent-unload', e => e.preventDefault()); const rows = []
  try {
    if (multivoiceTieAudit) {
      await require('./studio-multivoice-tie-ink.cjs')({ win, source, out, run, settle, wait, key, click, capture, save, nativeTheme,
        setCase: (name, directory) => { step = name; scene = directory; saved = undefined },
        setOpenFile: file => { saved = file },
        setPrintInspection: callback => { inspectPrint = callback },
        auditStems: process.argv.includes('--audit-multivoice-tie-stems'),
        auditBeams: process.argv.includes('--audit-multivoice-tie-beams') || process.argv.includes('--audit-multivoice-tie-pieces'),
        auditPieces: process.argv.includes('--audit-multivoice-tie-pieces'),
        requireClearance: process.argv.includes('--require-multivoice-clearance') })
      return
    }
    if (recentFocusAudit) {
      await require('./studio-recent-warning-focus.cjs')({ win, source, out, run, settle, wait, key, click, capture, save, notation, scaleText, nativeTheme,
        setCase: (name, directory) => { step = name; scene = directory; saved = undefined },
        setInput: file => { input = file },
        deferRecent: value => { deferRecent = value; if (value) pendingRecent = undefined },
        pendingRecent: () => pendingRecent,
        probe: process.argv.includes('--probe-late-recent') })
      return
    }
    for (const width of [960, 1400]) for (const kind of (focusLifetimeAudit ? ['many'] : letRingAudit ? ['single', 'chord', 'alongside'] : conditionalAudit ? ['first-pass', 'second-pass', 'all-passes'] : unknownAudit ? ['unknown'] : copyAudit ? ['mixed'] : mixedAudit ? ['mixed', 'many', 'technical'] : ['sound-whole-notation-root'])) for (const coarse of (longMixedAudit ? [true] : copyAudit ? [false] : [false, true])) for (const scale of (longMixedAudit ? [2] : copyAudit ? [1] : [1, 2])) for (const outcome of (copyAudit ? ['success', 'failure'] : ['none'])) for (const nameKind of (focusLifetimeAudit ? ['korean'] : longMixedAudit ? ['ascii', 'korean'] : ['normal'])) {
      if (longMixedAudit) { input = path.join(inputs, (nameKind === 'ascii' ? 'x'.repeat(242) : '가'.repeat(80) + 'aa') + '.musicxml'); assert.equal(Buffer.byteLength(path.basename(input)), 251) }
      fixture = path.join(source, kind); fs.copyFileSync(path.join(fixture, 'source.musicxml'), input); expected = JSON.parse(fs.readFileSync(path.join(fixture, 'source.chromatics'))).score
      const expectedWarnings = mixedAudit ? JSON.parse(fs.readFileSync(path.join(fixture, 'report.json'))).warnings.length : JSON.parse(fs.readFileSync(path.join(fixture, 'contract.json'))).warnings
      step = `${width}-${mixedAudit ? kind + '-' : ''}${coarse ? 'coarse' : 'fine'}-${scale * 100}${copyAudit ? '-' + outcome : ''}${longMixedAudit ? '-' + nameKind : ''}`; console.log('START', step)
      disclosureTraversal = []; toggleChecks = []; scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
      if (!win.webContents.debugger.isAttached()) win.webContents.debugger.attach('1.3')
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: coarse }); await settle()
      failRecentAdd = recentFailureAudit
      await click('파일'); await click('MusicXML 가져오기'); await wait(() => Boolean(document.querySelector('[aria-label="MusicXML 경고 상세"]')))
      if (recentFailureAudit) {
        await wait(() => Boolean(document.querySelector('[aria-label="최근 악보 목록 기술 정보"]')))
        assert(await run(() => document.querySelector('.editor-status').textContent.includes('열린 악보는 사용할 수 있습니다.')))
        assert(await run(() => !/EACCES|\/owned\//.test(document.querySelector('.editor-status').textContent)))
        assert(await run(() => !document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      }
      if (copyAudit) {
        const golden = fs.readFileSync(path.join(fixture, 'expected.musicxml'), 'utf8')
        queueCopy = true; pendingCopy = undefined
        await click('파일'); await click('내보내기 설정'); await click('MusicXML 내보내기')
        const t = Date.now(); while (!pendingCopy) { assert(Date.now() - t < 12000, 'Owned XML gate did not queue'); await settle() }
        const old = pendingCopy; queueCopy = false; assert.equal(old.contents, golden)
        await click('파일'); await click('MusicXML 가져오기')
        await wait(() => document.querySelector('.editor-status').textContent.includes('을 가져왔습니다.'))
        assert.equal((await sample()).expanded, 'false')
        await click('악보로 이동'); await key('T')
        await click('마디별 경고 상세 3개')
        await run(() => { const n = [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button')].at(-1); n.scrollIntoView({ block: 'center' }); n.focus() })
        const current = () => run(() => {
          const r = document.querySelector('[aria-label="MusicXML 경고 상세"]'), last = [...r.querySelectorAll('.studio-warning-technical button')].at(-1)
          return { text: r.textContent, expanded: r.querySelector('.studio-warning-report__details .dd-accordion > button').getAttribute('aria-expanded'), focus: document.activeElement === last, selection: [...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n => n.dataset.eventId), status: document.querySelector('.editor-status').textContent, document: document.querySelector('.studio-document').textContent }
        })
        const before = await current(); assert.equal(before.expanded, 'true'); assert(before.focus)
        if (outcome === 'failure') old.reject(Error('Owned stale same-file XML failure'))
        else { fs.writeFileSync(old.file, old.contents); old.resolve(fileResult(old.file)) }
        await settle(); await settle(); const after = await current(); assert.deepEqual(after, before)
        assert(!after.status.includes('old.musicxml') && !after.status.includes('Owned stale')); await capture('new-report-preserved')
        const edited = structuredClone(expected)
        for (const m of edited.parts[0].staves[0].measures) for (const n of m.voices[0].events) if (n.type === 'note') delete n.ties
        assert.deepEqual((await save('edited')).score, edited)
        await click('악보로 이동'); await key('Z', ['control'])
        assert(await run(() => document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
        await click('파일'); await click('내보내기 설정'); await click('MusicXML 내보내기')
        await wait(() => document.querySelector('.editor-status').textContent.includes('fresh.musicxml'))
        assert.equal(fs.readFileSync(path.join(scene, 'fresh.musicxml'), 'utf8'), golden)
        assert(await run(() => document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
        assert.deepEqual((await save('after-fresh-copy')).score, expected)
        await click('파일'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, expected)
        assert.deepEqual(fs.readFileSync(input), fs.readFileSync(path.join(fixture, 'source.musicxml')))
        rows.push({ width, outcome, sameFileAndIds: true, newReportFocusAndSelectionPreserved: true, nativeExact: true, oneUndo: true, freshCopyExact: true, oldArtifact: outcome === 'success' }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
        await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false }); win.webContents.debugger.detach()
        continue
      }
      if (letRingAudit) assert(await run(() => document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent.includes('울림 유지 타이 표기를 가져오지 못했습니다')))
      if (conditionalAudit) assert(await run(() => document.querySelector('[aria-label="MusicXML 경고 상세"]').textContent.includes('반복 차수별 타이 조건은 보존하지 못했습니다')))
      const baseline = await sample(), beforeInk = await notation()
      if (scale === 2) await scaleText(); await settle()
      const closed = await sample(); fs.writeFileSync(path.join(scene, 'closed.json'), JSON.stringify({ baseline, closed }, null, 2)); await capture('closed')
      assert.equal(closed.grouped, !unknownAudit, 'Unclassified warnings must retain their direct instructions;known repeated losses get grouped details'); assert.equal(closed.warnings, expectedWarnings); assert.equal(closed.coarse, coarse); assert.equal(closed.theme, width === 960 ? 'dark' : 'light'); assert.equal(closed.expanded, 'false')
      assert.equal(closed.overflow, false); assert(closed.reportScroll <= closed.reportClient + 1 && closed.buttonScroll <= closed.buttonClient + 1)
      assert(closed.height >= (coarse ? 47.9 : 31.9)); assert(closed.left >= 0 && closed.right <= width + 1)
      assert(Math.abs(closed.font / baseline.font - scale) < .01); assert.deepEqual(await notation(), beforeInk)
      if (longMixedAudit) assert(await run(name => document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-report__header').textContent.includes(name), path.basename(input)))
      if (!unknownAudit) { await focusDisclosure(); await key('Enter'); assert.equal((await sample()).expanded, 'true') }
      await run(() => { const n = [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button')].at(-1); n.scrollIntoView({ block: 'center' }); n.focus() }); await key('Enter')
      if (scale === 2) await scaleText(); await settle()
      const technical = await run(() => {
        const region = document.querySelector('[aria-label="MusicXML 경고 상세"]'), n = [...region.querySelectorAll('.studio-warning-technical button')].at(-1), r = n.getBoundingClientRect(), s = getComputedStyle(n)
        return { visible: n.closest('.studio-warning-technical').querySelector('.studio-warning-technical__content').checkVisibility(), focused: document.activeElement === n, focusVisible: n.matches(':focus-visible'), outline: s.outlineStyle, outlineWidth: s.outlineWidth, shadow: s.boxShadow, top: r.top, bottom: r.bottom, footerTop: document.querySelector('.studio-status').getBoundingClientRect().top, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      fs.writeFileSync(path.join(scene, 'technical.json'), JSON.stringify(technical, null, 2)); await capture('technical')
      assert(technical.visible && technical.focused && technical.focusVisible); assert.equal(technical.overflow, false)
      assert(technical.shadow !== 'none' || technical.outline !== 'none' && parseFloat(technical.outlineWidth) > 0)
      assert(technical.top >= 0 && technical.bottom <= technical.footerTop)
      let diagnosticRead
      if (longMixedAudit) {
        const expectedLast = JSON.parse(fs.readFileSync(path.join(fixture, 'report.json'))).warnings.at(-1)
        const readTail = () => run(expectedLast => {
          const content = [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content')].at(-1)
          if (!content.checkVisibility() || !content.textContent.includes(expectedLast.message) || !content.textContent.includes(expectedLast.path)) throw Error('Full original last diagnostic must remain visible')
          const last = content.lastElementChild.lastChild, range = document.createRange(); range.setStart(last, last.textContent.length - 1); range.setEnd(last, last.textContent.length)
          const r = range.getBoundingClientRect(); let top = 0, bottom = document.querySelector('.studio-status').getBoundingClientRect().top, left = 0, right = innerWidth
          for (let a = last.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a), b = a.getBoundingClientRect(); if (/auto|scroll|hidden|clip/.test(s.overflowY)) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom) }; if (/auto|scroll|hidden|clip/.test(s.overflowX)) { left = Math.max(left, b.left); right = Math.min(right, b.right) } }
          const button = content.closest('.studio-warning-technical').querySelector('button'), b = button.getBoundingClientRect(), x = Math.round(b.left + Math.min(24, b.width / 2)), y = Math.round(Math.max(top + 10, Math.min(bottom - 10, b.top + 10)))
          return { visible: r.top >= top && r.bottom <= bottom && r.left >= left && r.right <= right, tail: last.textContent.slice(-12), top: r.top, bottom: r.bottom, clipTop: top, clipBottom: bottom, wheel: { x, y }, owner: Boolean(document.elementFromPoint(x,y)?.closest('[aria-label="MusicXML 경고 상세"]')) }
        }, expectedLast)
        const before = await readTail(); let after = before, wheels = 0
        while (!after.visible && wheels < 14) { assert(after.owner, 'Wheel target must belong to public warning report'); win.webContents.sendInputEvent({ type: 'mouseMove', ...after.wheel }); win.webContents.sendInputEvent({ type: 'mouseWheel', ...after.wheel, deltaX: 0, deltaY: -180, canScroll: true }); await settle(); after = await readTail(); wheels++ }
        diagnosticRead = { before, after, wheels, fileName: path.basename(input), fileNameBytes: Buffer.byteLength(path.basename(input)) }; fs.writeFileSync(path.join(scene, 'diagnostic-read.json'), JSON.stringify(diagnosticRead, null, 2)); await capture('diagnostic-tail')
        assert(after.visible, 'Last original diagnostic character must be readable inside every clipping surface')
      }
      if (resetAudit) {
        // Leave the last technical field open,then import the identical file.
        if (focusLifetimeAudit) await run(() => { window.__ownedPreviousWarningReport = document.querySelector('[aria-label="MusicXML 경고 상세"]') })
        await click('파일'); await click('MusicXML 가져오기')
        await wait(() => document.querySelector('.editor-status').textContent.includes('을 가져왔습니다.'))
        if (scale === 2) await scaleText(); await settle()
        assert.equal((await sample()).expanded, 'false')
        await focusDisclosure(); await key('Enter')
        const fresh = await run(() => [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical__content')].map(n => n.checkVisibility()))
        fs.writeFileSync(path.join(scene, 'fresh-details.json'), JSON.stringify(fresh)); await capture('fresh-details')
        assert(fresh.every(value => !value), 'New report must not inherit an open technical field from the previous same-file snapshot')
        if (focusLifetimeAudit) {
          const lifecycle = await run(() => ({ oldDisconnected: !window.__ownedPreviousWarningReport.isConnected, reportCount: document.querySelectorAll('[aria-label="MusicXML 경고 상세"]').length, focusedFreshSummary: document.activeElement === document.querySelector('[aria-label="MusicXML 경고 상세"] .studio-warning-report__details .dd-accordion > button') }))
          assert(lifecycle.oldDisconnected && lifecycle.reportCount === 1 && lifecycle.focusedFreshSummary)
          fs.writeFileSync(path.join(scene, 'focus-lifetime.json'), JSON.stringify({ ...lifecycle, freshTechnicalCollapsed: fresh.every(value => !value), currentControlCount: fresh.length }, null, 2))
        }
        await run(() => { const n = [...document.querySelectorAll('[aria-label="MusicXML 경고 상세"] .studio-warning-technical button')].at(-1); n.scrollIntoView({ block: 'center' }); n.focus() }); await key('Enter')
      }
      await key('Space'); if (!unknownAudit) { await focusDisclosure(); await key('Space') } assert.equal((await sample()).expanded, 'false')
      if (recentFailureAudit) {
        await run(() => {
          const button = document.querySelector('[aria-label="최근 악보 목록 기술 정보"] button')
          button.scrollIntoView({ block: 'center' }); button.focus()
        }); await key('Enter')
        if (scale === 2) { await scaleText(); await settle() }
        const detail = await run(() => {
          const group = document.querySelector('[aria-label="최근 악보 목록 기술 정보"]'), content = group.querySelector('.studio-warning-technical__content'), last = content.lastElementChild
          last.scrollIntoView({ block: 'end' })
          const text = last.lastChild, range = document.createRange(); range.setStart(text, text.length - 1); range.setEnd(text, text.length)
          const r = range.getBoundingClientRect(), f = group.closest('.studio-status').getBoundingClientRect(), button = group.querySelector('button')
          return { visible: content.checkVisibility(), raw: last.textContent, top: r.top, bottom: r.bottom, footerTop: f.top, footerBottom: f.bottom, owner: Boolean(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.studio-warning-technical__content')), focus: document.activeElement === button }
        })
        assert(detail.visible && detail.focus && detail.owner && detail.raw.includes('owned recent-list update failure'))
        assert(detail.top >= Math.max(0, detail.footerTop) && detail.bottom <= Math.min(800, detail.footerBottom))
        fs.writeFileSync(path.join(scene, 'recent-detail.json'), JSON.stringify(detail, null, 2)); await capture('recent-detail')
        await key('Space')
        assert(await run(() => !document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      }
      assert(await run(() => document.querySelector('.editor-status').textContent.includes('정지')))
      await click('악보로 이동'); await settle()
      const target = await run(() => {
        const n = document.activeElement, glyph = n.querySelector('.vf-notehead text'); if (!glyph) throw Error('Score navigation did not focus a real note')
        const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(glyph).font
        const m = c.measureText(glyph.textContent), p = glyph.getStartPositionOfChar(0), q = new DOMPoint(p.x + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, p.y + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2).matrixTransform(glyph.getScreenCTM())
        return { id: n.dataset.eventId, x: q.x, y: q.y, footerTop: document.querySelector('.studio-status').getBoundingClientRect().top, pointerOwner: document.elementFromPoint(q.x, q.y)?.closest('.notation-event')?.dataset.eventId }
      })
      fs.writeFileSync(path.join(scene, 'target.json'), JSON.stringify(target, null, 2)); await capture('target')
      assert(target.x >= 0 && target.x < width && target.y >= 0 && target.y < target.footerTop); assert.equal(target.pointerOwner, target.id)
      for (const type of ['mouseDown', 'mouseUp']) win.webContents.sendInputEvent({ type, x: Math.round(target.x), y: Math.round(target.y), button: 'left', clickCount: 1 })
      await settle(); await key('T'); await key('Z', ['control'])
      assert.deepEqual((await save('after-undo')).score, expected); assert.deepEqual(await notation(), beforeInk)
      if (conditionalAudit || letRingAudit || longMixedAudit) {
        await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기')
        assert.deepEqual(fs.readFileSync(path.join(scene, 'converted.mid')), fs.readFileSync(path.join(fixture, 'expected.mid')))
        await click('MusicXML 내보내기'); assert.equal(fs.readFileSync(path.join(scene, 'fresh.musicxml'), 'utf8'), fs.readFileSync(path.join(fixture, 'expected.musicxml'), 'utf8'))
        await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
        assert.deepEqual((await save('after-output')).score, expected)
      }
      await click('파일'); await click('프로젝트 열기'); await settle(); assert.deepEqual((await save('reopened')).score, expected)
      assert.deepEqual(fs.readFileSync(input), fs.readFileSync(path.join(fixture, 'source.musicxml')))
      rows.push({ width, kind, coarse, scale, nameKind, diagnosticRead, disclosureTraversal, toggleChecks, conditionalSourceSupported: false, sourceLetRingSupported: false, convertedFilesChecked: conditionalAudit || letRingAudit || longMixedAudit, closed, technical, target, nativeExact: true, glyphInkExact: true, hardware: false }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
      await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false }); win.webContents.debugger.detach()
    }
    console.log('PASS', rows.length, longMixedAudit ? 'current mixed/dense warnings with251byte actual filenames;native/keyboard/last-raw/converted-model XML/MIDI/PDF;not unsupported-source fidelity' : letRingAudit ? 'let-ring source visual loss warning/converted-model XML/MIDI/PDF;not let-ring support or source fidelity' : conditionalAudit ? 'pass-specific source loss warning/converted-model XML/MIDI/PDF;not conditional playback or external fidelity' : copyAudit ? 'same-file XML ownership/fresh retry;native/oneundo;no physical touch/OS-dialog/PDF claim' : 'owned text/pointer conditions;native/keyboard/focus;no physical touch/OS-dialog/XML/PDF claim')
  } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), rows }, null, 2)); throw error }
  finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
