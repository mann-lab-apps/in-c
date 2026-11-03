// Owned temporary files and Electron input; no OS dialog/physical IME claim.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const { scaleStudioChromeText } = require('./studio-text-scale.cjs')
const densityAudit = process.argv.includes('--audit-density')
const generalFailureAudit = process.argv.includes('--audit-read-failures')
const removalAudit = process.argv.includes('--audit-recent-removal')
const pdfAudit = process.argv.includes('--audit-pdf-failure')
const newScoreFocusAudit = process.argv.includes('--audit-new-score-focus')
const partHeaderAudit = process.argv.includes('--audit-part-print-header')
const narrowHeaderAudit = process.argv.includes('--audit-narrow-print-header')
const headerEditReturnAudit = process.argv.includes('--audit-header-edit-return')
const paginationHeaderAudit = process.argv.includes('--audit-pagination-print-header') || headerEditReturnAudit
const printHeaderAudit = process.argv.includes('--audit-print-header') || partHeaderAudit || narrowHeaderAudit || paginationHeaderAudit
const expressionClearanceAudit = process.argv.includes('--audit-expression-clearance')
const expressionNoSpanAudit = process.argv.includes('--audit-expression-no-span')
const interiorStemAudit = process.argv.includes('--audit-interior-hairpin-stem')
const foreignVoiceAudit = process.argv.includes('--audit-foreign-voice-hairpin')
const interiorResetAudit = process.argv.includes('--audit-interior-hairpin-reset')
const interiorInputAudit = process.argv.includes('--audit-interior-hairpin-input') || interiorResetAudit
const headerReflowReference = process.argv.includes('--header-reflow-reference')
const headerViewportAudit = process.argv.includes('--audit-header-viewport-sampling')
assert(!(headerViewportAudit && headerReflowReference), 'Sampling diagnostics cannot replace the strict header reflow gate')
const interiorReference = process.argv.find(v => v.startsWith('--interior-reference='))?.slice('--interior-reference='.length)
const interiorHairpinAudit = process.argv.includes('--audit-interior-hairpin')
const searchCancelAudit = process.argv.includes('--audit-search-cancel')
const wizardCancelAudit = process.argv.includes('--audit-wizard-cancel')
const openWizardIntentAudit = process.argv.includes('--audit-open-wizard-intent')
const backupReopenAudit = process.argv.includes('--audit-backup-reopen-ownership')
const backupDiagnosticAudit = process.argv.includes('--audit-backup-diagnostics')
const invalidBackupName='owned-backup-'+ 'unbroken-file-name-'.repeat(8)+'.chromatics'
const invalidBackupError='Invalid JSON in /owned/backups/'+invalidBackupName+' · 진단 원문과 경로를 보존합니다 '.repeat(8)
const partStructureAudit = process.argv.includes('--audit-part-structure')
const source = path.resolve(process.env.DDIRORI_MEASURE_MARKING_QA_DIR)
const out = path.resolve(process.env.DDIRORI_OBJECT_FILTER_QA_OUT)
fs.mkdirSync(out, { recursive: true }); app.disableHardwareAcceleration()
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-unattached-tie-')))
let win, scene, saved, contents, rejectNextOpen = false, step = 'start'
let removalOutcome, pendingRemoval, removalCalls = 0
let rejectNextPdf = false, pdfCalls = 0, pendingPrintMeasurement
let delayNextOpen = false, pendingOpenResponse, recentAdds = 0, projectOpenCalls = 0
let pendingBackupReads = []
let diagnosticBackupReads = 0
const result = p => ({ filePath: p, fileName: path.basename(p) })
ipcMain.handle('musicxml:open', () => {
  if (rejectNextOpen) { rejectNextOpen = false; throw Error('EACCES: owned bridge read failure /owned/input.musicxml') }
  const file = path.join(scene, 'input.musicxml'); fs.writeFileSync(file, contents)
  return { ...result(file), contents: fs.readFileSync(file, 'utf8') }
})
ipcMain.handle('project:save', (_, value) => {
  if(backupReopenAudit)fs.appendFileSync(path.join(scene,'save-requests.jsonl'),JSON.stringify({filePath:value.filePath,suggestedName:value.suggestedName})+'\n')
  saved = path.join(scene, 'current.chromatics'); fs.writeFileSync(saved, value.contents); return result(saved)
})
ipcMain.handle('project:open', () => {
  projectOpenCalls++
  if(openWizardIntentAudit&&delayNextOpen){delayNextOpen=false;return new Promise((resolve,reject)=>{pendingOpenResponse={resolve,reject}})}
  return { ...result(saved), contents: fs.readFileSync(saved, 'utf8') }
})
ipcMain.handle('project:list-backups',()=>backupDiagnosticAudit?[{id:'bad',fileName:invalidBackupName,updatedAt:'',error:invalidBackupError},{id:'healthy',fileName:'healthy.chromatics',title:'Healthy backup',updatedAt:'2026-10-30T00:00:00Z'}]:backupReopenAudit?[{id:'same-id',fileName:'same.chromatics',title:'Same listed backup',updatedAt:'2026-10-30T00:00:00Z'}]:[])
if(backupReopenAudit)ipcMain.handle('project:read-backup',(_,id)=>{assert.equal(id,'same-id');return new Promise((resolve,reject)=>pendingBackupReads.push({resolve,reject}))})
if(backupDiagnosticAudit)ipcMain.handle('project:read-backup',(_,id)=>{assert.equal(id,'healthy','Invalid backup must never be restored');diagnosticBackupReads++;return{contents:fs.readFileSync(path.join(source,'replacement.chromatics'),'utf8')}})
ipcMain.handle('recent-musicxml:add',()=>{recentAdds++;return[]})
ipcMain.handle('recent-musicxml:list', () => removalAudit ? [{ filePath: '/owned/missing.musicxml', fileName: 'missing.musicxml', openedAt: '2026-10-29T00:00:00Z' }] : [])
if (removalAudit) {
  ipcMain.handle('recent-musicxml:open', () => { throw Error('최근 파일을 찾을 수 없습니다: /owned/missing.musicxml') })
  ipcMain.handle('recent-musicxml:remove', () => {
    removalCalls++
    if (removalOutcome === 'retry') {
      if (removalCalls === 1) throw Error('EACCES: owned recent removal failed /owned/recent-index.json')
      return []
    }
    return new Promise((resolve, reject) => { pendingRemoval = { resolve, reject } })
  })
}
if (pdfAudit || partStructureAudit || interiorHairpinAudit || printHeaderAudit) ipcMain.handle('pdf:save', async () => {
  pdfCalls++
  if (rejectNextPdf) { rejectNextPdf = false; throw Error('EACCES: owned PDF output failure /owned/output.pdf') }
  const snapshot = await run(() => {
    const root = document.querySelector('.studio-pdf-snapshot'), svg = root.querySelector('svg')
    return { heads: root.querySelectorAll('.vf-notehead').length, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, inkPasses:svg.dataset.systemInkPasses, headerOffset:svg.dataset.printHeaderOffset, headerUnresolved:svg.dataset.printHeaderUnresolved, expressionOffsets:svg.dataset.expressionOffsets }
  })
  fs.writeFileSync(path.join(scene, 'print.json'), JSON.stringify(snapshot, null, 2))
  if (printHeaderAudit) fs.writeFileSync(path.join(scene, 'header-probe.json'), JSON.stringify(await headerProbe(), null, 2))
  if (interiorHairpinAudit) fs.writeFileSync(path.join(scene, 'print-clearance.json'), JSON.stringify(await pendingPrintMeasurement(), null, 2))
  const file = path.join(scene, (partStructureAudit || interiorHairpinAudit || printHeaderAudit) ? 'view.pdf' : 'retry.pdf')
  fs.writeFileSync(file, await win.webContents.printToPDF({ preferCSSPageSize: true }))
  return result(file)
})
if (interiorHairpinAudit || printHeaderAudit) {
  ipcMain.handle('musicxml:export', (_, value) => { const file = path.join(scene, 'actual.musicxml'); fs.writeFileSync(file, value.contents); return result(file) })
  ipcMain.handle('midi:save', (_, value) => { const file = path.join(scene, 'actual.mid'); fs.writeFileSync(file, Buffer.from(value.contents)); return result(file) })
}
for (const channel of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(channel, () => null)
const run = async (fn, arg) => {
  const result = await win.webContents.executeJavaScript(`(async()=>{try{return {value:await (${fn})(${JSON.stringify(arg) ?? ''})}}catch(error){return {error:String(error.stack||error)}}})()`)
  if (result.error) throw Error(step + ': ' + result.error)
  return result.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
const wait = async fn => { const start = Date.now(); while (!await run(fn)) { assert(Date.now() - start < 10000, step); await settle() } }
const key = async (keyCode, modifiers = []) => {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
  if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle()
}
const click = async (label, partial = false) => {
  const locate = (scroll) => run(({ label, partial, scroll }) => {
    const node = [...document.querySelectorAll('button')].find(n => n.checkVisibility() && (partial ? (n.getAttribute('aria-label') || n.textContent.trim()).includes(label) : (n.getAttribute('aria-label') || n.textContent.trim()) === label))
    if (!node || node.disabled) throw Error('Unavailable public control: ' + label + ' ' + JSON.stringify({
      disabled: node?.disabled, focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent,
      visible: [...document.querySelectorAll('button')].filter(n => n.checkVisibility()).map(n => ({ name: n.getAttribute('aria-label') || n.textContent.trim(), disabled: n.disabled }))
    }))
    if (scroll) node.scrollIntoView({ block: 'center' }); const r = node.getBoundingClientRect()
    const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2), owner = document.elementFromPoint(x, y)
    return { x, y, targetHit: Boolean(owner && node.contains(owner)), ownerRole: owner?.closest('[role]')?.getAttribute('role'), ownerText: owner?.textContent?.slice(0,160), ownerClass: owner?.className }
  }, { label, partial, scroll })
  const start = Date.now(); let point
  while (true) {
    const before = await locate(true)
    win.webContents.sendInputEvent({ type: 'mouseMove', x: before.x, y: before.y }); await settle()
    point = await locate(false)
    fs.appendFileSync(path.join(scene, 'pointer.jsonl'), JSON.stringify({ label, before, after: point, elapsed: Date.now() - start }) + '\n')
    if (point.targetHit && Math.abs(point.x - before.x) <= 1 && Math.abs(point.y - before.y) <= 1) break
    assert(Date.now() - start < 3000, 'Public control must settle and own its pointer target: ' + label)
  }
  for (const type of ['mouseDown', 'mouseUp']) win.webContents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await settle()
}
const snapshot = () => run(() => ({
  ink: [...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n => ({ text: n.textContent, box: [n.getBBox().x, n.getBBox().y, n.getBBox().width, n.getBBox().height], transform: n.parentElement.getAttribute('transform') })),
  selection: [...document.querySelectorAll('.score-canvas .notation-event.is-selected')].map(n => [n.dataset.eventId, n.dataset.measureId]),
  dirty: document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')
}))
const save = async name => {
  await click('파일'); await click('프로젝트 저장')
  await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음'))
  const bytes = fs.readFileSync(saved); fs.writeFileSync(path.join(scene, name + '.chromatics'), bytes)
  return JSON.parse(bytes).score
}
const capture = async name => {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { win.webContents.endFrameSubscription(); reject(Error('No frame')) }, 2000)
    win.webContents.beginFrameSubscription(false, () => { clearTimeout(timer); win.webContents.endFrameSubscription(); resolve() }); win.webContents.invalidate()
  })
  fs.writeFileSync(path.join(scene, name + '.png'), (await win.webContents.capturePage()).toPNG())
}
const auditRecentRemoval = async () => {
  const sourceFile = path.resolve('out/ddirori/continuous-let-ring-source/single/source.chromatics')
  const originalBytes = fs.readFileSync(sourceFile), baseline = JSON.parse(originalBytes).score, rows = []
  for (const width of [960, 1400]) for (const outcome of ['retry', 'success', 'failure', 'focus-away']) {
    step = `${width}-${outcome}`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
    removalOutcome = outcome; pendingRemoval = undefined; removalCalls = 0; saved = sourceFile
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle()
    await wait(() => [...document.querySelectorAll('button')].some(n => n.textContent.includes('missing.musicxml')))
    await click('missing.musicxml', true)
    await wait(() => [...document.querySelectorAll('button')].some(n => n.textContent.trim() === '목록에서 지우기'))
    await click('목록에서 지우기')
    if (outcome === 'retry') {
      await wait(() => document.body.textContent.includes('목록은 유지됩니다. 다시 시도하거나 기술 정보를 확인해 주세요.'))
      const focus = await run(() => ({ text: document.activeElement?.textContent, disabled: document.activeElement?.disabled }))
      assert.equal(focus.text, '목록에서 지우기'); assert.equal(focus.disabled, false)
      assert(await run(() => !document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      await capture('retry-ready')
      await run(() => document.querySelector('[aria-label="최근 악보 목록 기술 정보"] button').focus()); await key('Enter')
      assert(await run(() => document.querySelector('[aria-label="최근 악보 목록 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      await key('Space'); await click('목록에서 지우기')
      await wait(() => document.body.textContent.includes('아직 최근 파일이 없습니다.'))
      assert.equal(removalCalls, 2); await capture('removed')
    } else if (outcome === 'focus-away') {
      assert(pendingRemoval)
      await click('새 악보 만들기')
      await wait(() => Boolean(document.querySelector('dialog[open] input[aria-label="제목"],dialog[open] input')))
      await run(() => {
        const label = [...document.querySelectorAll('dialog[open] label')].find(n => n.textContent.trim() === '제목')
        const input = document.getElementById(label.htmlFor); input.focus()
      })
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'A' })
      win.webContents.sendInputEvent({ type: 'char', keyCode: 'A' })
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'A' }); await settle()
      const draft = await run(() => ({ id: document.activeElement.id, value: document.activeElement.value }))
      assert(draft.value.includes('A'), 'The new-score draft must contain actual character input')
      pendingRemoval.reject(Error('Owned removal failure while drafting')); await settle(); await settle()
      assert.deepEqual(await run(() => ({ id: document.activeElement.id, value: document.activeElement.value })), draft)
      assert(await run(() => Boolean(document.querySelector('dialog[open]'))))
      await capture('draft-focus-preserved'); assert.equal(removalCalls, 1)
    } else {
      assert(pendingRemoval)
      await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('을 열었습니다.'))
      await click('악보로 이동'); await key('Up', ['alt','shift'])
      const before = await snapshot(), status = await run(() => document.querySelector('.editor-status').textContent)
      assert(before.dirty)
      if (outcome === 'success') pendingRemoval.resolve([])
      else pendingRemoval.reject(Error('Owned stale recent removal failure'))
      await settle(); await settle()
      assert.deepEqual(await snapshot(), before)
      assert.equal(await run(() => document.querySelector('.editor-status').textContent), status)
      await capture('stale-isolated')
      const edited = await save('current'); assert.notDeepEqual(edited, baseline)
      await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
      await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), edited)
      await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
      assert.deepEqual(await save('reopened'), edited); assert.equal(removalCalls, 1)
    }
    assert.deepEqual(fs.readFileSync(sourceFile), originalBytes)
    rows.push({ width, outcome, physicalDialog: false, staleResultIsolation: outcome === 'success' || outcome === 'failure', focusRetry: outcome === 'retry', draftFocusPreserved: outcome === 'focus-away' })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const auditPdfFailure = async () => {
  const sourceFile = path.resolve('out/ddirori/continuous-let-ring-source/single/source.chromatics')
  const originalBytes = fs.readFileSync(sourceFile), baseline = JSON.parse(originalBytes).score, rows = []
  for (const width of [960, 1400]) {
    step = `${width}-pdf-retry`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); saved = sourceFile
    rejectNextPdf = true; pdfCalls = 0
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle()
    await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('을 열었습니다.'))
    await click('악보로 이동'); await key('Up', ['alt','shift'])
    const before = await snapshot(); assert(before.dirty)
    await click('파일'); await click('내보내기 설정'); await click('PDF 변환')
    await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 기술 정보"]')))
    assert.deepEqual(await snapshot(), before)
    assert(await run(() => !document.querySelector('[aria-label="PDF 출력 결과"]')))
    assert(!fs.existsSync(path.join(scene, 'retry.pdf'))); assert.equal(pdfCalls, 1)
    const focus = await run(() => ({ label: document.activeElement?.getAttribute('aria-label'), disabled: document.activeElement?.disabled, status: document.querySelector('.editor-status').textContent }))
    assert.equal(focus.label, 'PDF 변환'); assert.equal(focus.disabled, false)
    assert(focus.status.includes('악보와 변경 사항은 유지됩니다.')); assert(!focus.status.includes('EACCES'))
    assert(await run(() => !document.querySelector('[aria-label="PDF 출력 기술 정보"] .studio-warning-technical__content').checkVisibility()))
    await capture('failure-retry-ready')
    await run(() => document.querySelector('[aria-label="PDF 출력 기술 정보"] button').focus()); await key('Enter')
    assert(await run(() => document.querySelector('[aria-label="PDF 출력 기술 정보"] .studio-warning-technical__content').checkVisibility()))
    await capture('technical'); await key('Space')
    await key('z', ['control']); assert.notDeepEqual((await snapshot()).ink, before.ink)
    await key('z', ['control', 'shift']); assert.deepEqual(await snapshot(), before)
    await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    assert.equal(pdfCalls, 2); assert(fs.statSync(path.join(scene, 'retry.pdf')).size > 1000)
    assert.deepEqual(await snapshot(), before, 'PDF success must not clean or replace the edited project')
    await capture('retry-success')
    const edited = await save('after-pdf'); assert.notDeepEqual(edited, baseline)
    await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
    await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), edited)
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    assert.deepEqual(await save('reopened'), edited); assert.deepEqual(fs.readFileSync(sourceFile), originalBytes)
    rows.push({ width, focus, actualPdf: path.join(scene, 'retry.pdf'), exactNativeUndoRedoReopen: true, injectedBridgeFailure: true, osDialog: false, scoreReceived: false })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const auditNewScoreFocus = async () => {
  const rows = []
  for (const width of [960, 1400]) {
    step = `${width}-new-score-focus`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle()
    await click('새 악보 만들기'); await click('만들기')
    await wait(() => document.activeElement?.getAttribute('aria-label') === '음표 입력 전환, 단축키 N')
    await capture('initial-input-focus')
    const baseline = await save('blank')
    await click('음표 입력 전환, 단축키 N')
    await wait(() => document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]').getAttribute('aria-pressed') === 'true')
    await key('C')
    await wait(() => Boolean(document.querySelector('.score-canvas .vf-notehead')))
    const noteTip = await run(() => {
      const button = document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]')
      const tip = (button.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)).find(n => n?.getAttribute('role') === 'tooltip')
      if (!tip) throw Error('Note-entry tooltip must remain described')
      const r = tip.getBoundingClientRect(); return { id: tip.id, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    })
    win.webContents.sendInputEvent({ type: 'mouseMove', x: noteTip.x, y: noteTip.y }); await settle()
    assert(await run(p => {
      const tip = document.getElementById(p.id)
      return tip?.checkVisibility() && getComputedStyle(tip).pointerEvents === 'none' && !document.elementFromPoint(p.x, p.y)?.closest('[role="tooltip"]')
    }, noteTip), 'Hover guidance stays readable while hit-testing passes to underlying controls')
    const entered = await save('entered')
    const note = entered.parts[0].staves[0].measures[0].voices[0].events[0]
    assert.equal(note.type, 'note'); assert.equal(note.pitch.step, 'C')
    await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
    await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), entered)
    await run(() => document.querySelector('button[aria-label="재생"]').focus()); await settle()
    const playbackTip = await run(() => {
      const button = document.activeElement
      const tip = (button.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)).find(n => n?.getAttribute('role') === 'tooltip')
      if (!tip) throw Error('Playback tooltip must remain described')
      const r = tip.getBoundingClientRect()
      return { id: tip.id, visible: tip.checkVisibility(), pointerEvents: getComputedStyle(tip).pointerEvents, ownerIsTooltip: Boolean(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[role="tooltip"]')) }
    })
    assert(playbackTip.visible && playbackTip.pointerEvents === 'none' && !playbackTip.ownerIsTooltip)
    const inputBeforeTooltipEscape = await run(() => document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]').getAttribute('aria-pressed'))
    await capture('playback-tooltip'); await key('Escape')
    assert(await run(id => !document.getElementById(id), playbackTip.id))
    assert(await run(() => document.activeElement?.getAttribute('aria-label') === '재생'))
    assert.equal(await run(() => document.querySelector('[aria-label="음표 입력 전환, 단축키 N"]').getAttribute('aria-pressed')), inputBeforeTooltipEscape)
    await click('파일'); await click('내보내기 설정')
    await wait(() => {
      const label = [...document.querySelectorAll('label')].find(n => n.textContent.trim() === 'PDF 설정 프리셋')
      return label && document.activeElement === document.getElementById(label.htmlFor)
    })
    await key('Down'); assert(await run(() => Boolean(document.querySelector('[role="listbox"]'))))
    await key('Escape')
    assert(await run(() => document.activeElement?.getAttribute('role') === 'combobox' && document.activeElement.getAttribute('aria-expanded') === 'false'))
    await capture('export-preset-focus'); assert.deepEqual(await save('after-workspace'), entered)
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    assert.deepEqual(await save('reopened'), entered)
    rows.push({ width, noteTip, playbackTip, initialInputFocus: true, realNoteInput: true, undoRedoExact: true, exportPresetKeyboard: true, nativeReopenExact: true })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const headerProbe = () => run(() => {
  const root=document.querySelector('.studio-pdf-snapshot'),svg=root.querySelector('svg'),header=root.querySelector('.score-title'),matrix=svg.getScreenCTM(),inverse=matrix.inverse()
  const box=(n,b)=>{const m=n?inverse.multiply(n.getScreenCTM()):inverse,a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);return{x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y}}
  const lines=[],walker=document.createTreeWalker(header,NodeFilter.SHOW_TEXT)
  while(walker.nextNode()){
    const node=walker.currentNode;if(!node.textContent.trim())continue
    const range=document.createRange();range.selectNodeContents(node)
    for(const rect of range.getClientRects())if(rect.width&&rect.height)lines.push({text:node.textContent,className:node.parentElement.className,...box(null,rect)})
  }
  const context=document.createElement('canvas').getContext('2d'),texts=[]
  for(const node of svg.querySelectorAll('text')){
    const s=getComputedStyle(node);if(!node.textContent||s.visibility==='hidden'||s.display==='none'||s.opacity==='0')continue
    context.font=s.font;context.textAlign='start';context.textBaseline='alphabetic'
    const metrics=context.measureText(node.textContent),point=node.getStartPositionOfChar(0)
    if(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight<=0||metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent<=0)continue
    texts.push({text:node.textContent,className:node.getAttribute('class')||node.parentElement.getAttribute('class'),...box(node,{x:point.x-metrics.actualBoundingBoxLeft,y:point.y-metrics.actualBoundingBoxAscent,width:metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight,height:metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent})})
  }
  const shapes=[],paint=(v,opacity)=>opacity!=='0'&&v&&v!=='none'&&v!=='transparent'&&!/^rgba\([^)]*,\s*0\)$/.test(v)
  for(const node of svg.querySelectorAll('path,line,polygon,polyline,circle,ellipse,rect')){
    let visible=true
    for(let parent=node;parent;parent=parent.parentElement){const s=getComputedStyle(parent);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0'){visible=false;break}if(parent===svg)break}
    if(!visible)continue
    const s=getComputedStyle(node),stroke=paint(s.stroke,s.strokeOpacity)?Number.parseFloat(s.strokeWidth)/2:0
    if(!paint(s.fill,s.fillOpacity)&&!stroke)continue
    const b=node.getBBox();if(b.width+2*stroke<=0||b.height+2*stroke<=0)continue
    shapes.push({text:node.tagName,className:node.getAttribute('class')||node.parentElement.getAttribute('class'),...box(node,{x:b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke})})
  }
  const collisions=[]
  for(const line of lines)for(const ink of [...texts,...shapes])if(Math.min(line.x+line.width,ink.x+ink.width)>Math.max(line.x,ink.x)&&ink.y-line.y-line.height<8/matrix.d)collisions.push({heading:line.text,notation:ink.text,notationClass:ink.className,gap:ink.y-line.y-line.height})
  return{headerBlock:box(null,header.getBoundingClientRect()),headingLineEnvelopes:lines,earliestTextInk:texts.sort((a,b)=>a.y-b.y).slice(0,12),collisions,scale:matrix.d,headerOffset:svg.dataset.printHeaderOffset,headerUnresolved:svg.dataset.printHeaderUnresolved,passes:svg.dataset.systemInkPasses}
})
// Diagnostic only: clone an immutable print SVG and add blank viewport height.
// All authored glyph attributes remain identical. Remove clones before output.
const headerViewportProbe = oldHeight => run(oldHeight => {
  const svg=document.querySelector('.studio-pdf-snapshot svg'),host=svg.parentElement
  const context=document.createElement('canvas').getContext('2d')
  const sample=node=>({height:node.viewBox.baseVal.height,inlineHeight:node.style.height,cssHeight:getComputedStyle(node).height,ctm:[node.getScreenCTM().a,node.getScreenCTM().d,node.getScreenCTM().e,node.getScreenCTM().f],
    lyrics:[...node.querySelectorAll('.notation-lyric')].map(text=>{
      context.font=getComputedStyle(text).font;const p=text.getStartPositionOfChar(0),ink=context.measureText(text.textContent),matrix=node.getScreenCTM().inverse().multiply(text.getScreenCTM())
      return{text:text.textContent,x:text.getAttribute('x'),y:text.getAttribute('y'),firstX:p.x,inkX:new DOMPoint(p.x-ink.actualBoundingBoxLeft,p.y).matrixTransform(matrix).x,advance:text.getComputedTextLength(),font:getComputedStyle(text).font,bbox:{x:text.getBBox().x,width:text.getBBox().width}}
    })})
  const before=sample(svg),samples=[]
  for(const height of [before.height,oldHeight,before.height+128]){
    const copy=svg.cloneNode(true),view=svg.viewBox.baseVal
    copy.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${height}`);copy.setAttribute('height',String(height));copy.style.height=`${height}px`;host.append(copy)
    try{samples.push(sample(copy))}finally{copy.remove()}
  }
  return{before,samples,after:sample(svg)}
},oldHeight)
const auditPrintHeader = async () => {
  const rows=[],failures=[]
  for(const width of [960,1400])for(const kind of (paginationHeaderAudit?['short','long']:narrowHeaderAudit?['small-staff','normal-staff']:['short','wrapped','no-tempo','swing','tempo-text','tall-no-tempo'])){
    const fixture=path.join(source,kind),file=path.join(fixture,'source.chromatics'),bytes=fs.readFileSync(file)
    step=`${width}-${kind}`;console.log('START',step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});saved=file
    nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
    await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
    await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    assert.deepEqual(await save('unchanged'),JSON.parse(bytes).score);await capture('screen')
    await click('파일');await click('내보내기 설정')
    if(paginationHeaderAudit){
      await run(()=>{const field=document.querySelector('input[aria-label="PDF 목표 장수"]');if(!field?.checkVisibility()||field.disabled)throw Error('PDF target must be visible and enabled');field.focus();field.select()})
      for(const type of ['keyDown','char','keyUp'])win.webContents.sendInputEvent({type,keyCode:'1'});await settle()
      assert.equal(await run(()=>document.querySelector('input[aria-label="PDF 목표 장수"]').value),'1','Use the real requested one-page target, not the default two pages')
    }
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    const probe=JSON.parse(fs.readFileSync(path.join(scene,'header-probe.json')))
    if(paginationHeaderAudit){
      const result=await run(()=>document.querySelector('[aria-label="PDF 출력 결과"]').textContent)
      fs.writeFileSync(path.join(scene,'target-feedback.json'),JSON.stringify({requested:1,text:result},null,2))
      assert.equal(result.includes('목표 1장에 맞추기 어려운 배치입니다.'),kind==='long','Measured pagination must report the long-header overflow and keep the short control clear')
    }
    assert.deepEqual(await save('after-output'),JSON.parse(bytes).score);assert.deepEqual(fs.readFileSync(file),bytes)
    await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.mid'))
    assert.deepEqual(fs.readFileSync(path.join(scene,'actual.mid')),fs.readFileSync(path.join(fixture,'expected.mid')))
    await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.musicxml'))
    assert.equal(fs.readFileSync(path.join(scene,'actual.musicxml'),'utf8'),fs.readFileSync(path.join(fixture,'expected.musicxml'),'utf8'))
    if(headerEditReturnAudit){
      const baseline=JSON.parse(bytes).score,eventId=baseline.parts[0].staves[0].measures[0].voices[0].events[0].id
      await click('악보로 이동');await settle()
      const point=await run(id=>{
        const note=[...document.querySelectorAll('.score-canvas .notation-event')].find(n=>n.dataset.eventId===id),glyph=note?.querySelector('.vf-notehead text')
        if(!glyph)throw Error('Missing real first-note ink after output')
        const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(glyph).font
        const m=c.measureText(glyph.textContent),p=glyph.getStartPositionOfChar(0),q=new DOMPoint(p.x+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,p.y+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2).matrixTransform(glyph.getScreenCTM())
        return{x:Math.round(q.x),y:Math.round(q.y),footerTop:document.querySelector('.studio-status').getBoundingClientRect().top,viewportWidth:innerWidth,owner:document.elementFromPoint(q.x,q.y)?.closest('.notation-event')?.dataset.eventId,focused:document.activeElement?.closest('.notation-event')?.dataset.eventId}
      },eventId)
      fs.writeFileSync(path.join(scene,'editor-return.json'),JSON.stringify(point,null,2))
      assert.equal(point.owner,eventId,'Actual note ink must own pointer input after return');assert.equal(point.focused,eventId)
      assert(point.x>=0&&point.x<point.viewportWidth&&point.y>=0&&point.y<point.footerTop,'Use the entire status-row boundary, not its inner label')
      for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});await settle();await capture('editor-return')
      await key('Up',['alt','shift']);const edited=await save('edited');assert.notDeepEqual(edited,baseline)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('undo'),baseline)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('second-undo-noop'),baseline)
      await click('악보로 이동');await key('z',['control','shift']);assert.deepEqual(await save('redo'),edited)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('restored'),baseline)
      await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
      assert.deepEqual(await save('reopened-after-edit'),baseline)
    }
    if(probe.headerUnresolved!=='false'||probe.collisions.length)failures.push({width,kind,headerOffset:probe.headerOffset,unresolved:probe.headerUnresolved,collisions:probe.collisions})
    rows.push({width,kind,probe,nativeExact:true,midiExact:true,xmlExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,'header-failures.json'),JSON.stringify(failures,null,2))
  }
  assert.deepEqual(failures,[],'Actual paper header and first notation must clear and settle')
}
const auditPartHeader = async () => {
  const file=path.join(source,'source.chromatics'),bytes=fs.readFileSync(file),project=JSON.parse(bytes),rows=[],failures=[]
  const choose=async(label,index)=>{
    await run(label=>{
      const node=[...document.querySelectorAll('label')].find(n=>n.textContent.trim()===label)?.control
      if(!node?.checkVisibility()||node.disabled)throw Error('Unavailable public choice: '+label)
      node.scrollIntoView({block:'center'});node.focus()
    },label)
    await key('Space');await key('Home');for(let i=0;i<index;i++)await key('Down');await key('Enter')
  }
  for(const width of [960,1400])for(const view of ['score','part']){
    step=`${width}-${view}`;console.log('START',step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});saved=file
    nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
    await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
    await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    await click('형식');await click('악보 설정');await choose('악보 보기',view==='part'?1:0)
    await save('selected-view')
    const selected=JSON.parse(fs.readFileSync(saved)),expectedView=view==='score'?{mode:'score'}:{mode:'part',partId:project.score.parts[0].id}
    assert.deepEqual(selected,{...project,view:expectedView})
    await capture('selected-view')
    await click('파일');await click('내보내기 설정');await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    const probe=JSON.parse(fs.readFileSync(path.join(scene,'header-probe.json')))
    assert(probe.headingLineEnvelopes.some(n=>n.text===project.score.composer),'Composer must participate in actual print heading measurement')
    assert.equal(probe.headingLineEnvelopes.some(n=>n.text===project.partLayouts[0].title),view==='part')
    if(probe.headerUnresolved!=='false'||probe.collisions.length)failures.push({width,view,probe})
    await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.mid'))
    assert.deepEqual(fs.readFileSync(path.join(scene,'actual.mid')),fs.readFileSync(path.join(source,view+'.mid')))
    await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.musicxml'))
    assert.equal(fs.readFileSync(path.join(scene,'actual.musicxml'),'utf8'),fs.readFileSync(path.join(source,view+'.musicxml'),'utf8'))
    await save('after-output');assert.deepEqual(JSON.parse(fs.readFileSync(saved)),selected)
    await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    await save('cold-reopen');assert.deepEqual(JSON.parse(fs.readFileSync(saved)),selected);assert.deepEqual(fs.readFileSync(file),bytes)
    rows.push({width,view,probe,nativeExact:true,coldReopenExact:true,midiExact:true,xmlExact:true})
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,'header-failures.json'),JSON.stringify(failures,null,2))
  }
  assert.deepEqual(failures,[],'Selected-part heading needs physical clearance without losing independent metadata')
}
const auditInteriorHairpin = async () => {
  const rows = [], failures = []
  for (const width of [960, 1400]) for (const cross of [false, true]) for (const manual of (expressionNoSpanAudit ? [false] : interiorResetAudit ? [true] : [false, true])) {
    const kind = `${cross ? 'cross' : 'single'}-${manual ? 'manual' : 'auto'}`, fixture = path.join(source, kind), file = path.join(fixture, 'source.chromatics'), bytes = fs.readFileSync(file)
    step = `${width}-${kind}`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); saved = file
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle()
    await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    const measure = async print => run(({ print, cross, stem, foreign, noSpan, expressionAudit }) => {
      const root = document.querySelector(print ? '.studio-pdf-snapshot' : '.score-canvas'), svg = root.querySelector('svg'), inverse = svg.getScreenCTM().inverse()
      const transformBox = (n, b) => {
        const matrix = inverse.multiply(n.getScreenCTM()), a = new DOMPoint(b.x, b.y).matrixTransform(matrix), z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(matrix)
        return { x: a.x, y: a.y, width: z.x - a.x, height: z.y - a.y }
      }
      const ink = node => {
        const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(node).font
        const m = c.measureText(node.textContent), p = node.getStartPositionOfChar(0)
        return { text: node.textContent, ...transformBox(node, { x: p.x - m.actualBoundingBoxLeft, y: p.y - m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent }) }
      }
      if (svg.dataset.expressionInkUnresolved !== 'false') throw Error('Expression ink pass must settle before approval')
      if (svg.dataset.hairpinInkUnresolved !== 'false') throw Error('Automatic hairpin ink pass must settle before approval')
      const pieces = [...root.querySelectorAll('.notation-hairpin')]
      if (pieces.length !== (noSpan ? 0 : cross ? 2 : 1)) throw Error('Expected explicit system pieces, got ' + pieces.length)
      const piece = pieces.at(-1), lines = piece ? [...piece.querySelectorAll('line')] : []
      const boxes = lines.map(n => { const b = transformBox(n, n.getBBox()), stroke = Number.parseFloat(getComputedStyle(n).strokeWidth) / 2; return { x: b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke } })
      const wedge = noSpan ? null : { x: Math.min(...boxes.map(b=>b.x)), y: Math.min(...boxes.map(b=>b.y)), right: Math.max(...boxes.map(b=>b.x+b.width)), bottom: Math.max(...boxes.map(b=>b.y+b.height)) }
      const lyrics = [...root.querySelectorAll('.notation-lyric')].map(ink), dynamics = [...root.querySelectorAll('.notation-dynamic-mark')].map(ink), expressions = [...root.querySelectorAll('.notation-expression-text')].map(ink)
      if (lyrics.length!==(stem?0:2) || dynamics.length!==(stem?0:1) || expressions.length!==1) throw Error('Fixture needs actual interior-only annotation ink')
      const music = []
      if (stem && !foreign) {
        const note=root.querySelector('.notation-event[data-event-id="interior-note-1"]')
        music.push(...[...note.querySelectorAll('.vf-notehead text')].map(ink))
        const stems=[...note.querySelectorAll('.vf-stem')].flatMap(n=>n.matches('path,line')?[n]:[...n.querySelectorAll('path,line')])
        if (!stems.length) throw Error('Fixture must contain actual painted note stems')
        for (const n of stems) {const b=transformBox(n,n.getBBox()),stroke=Number.parseFloat(getComputedStyle(n).strokeWidth)/2;music.push({type:'stem',x:b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke})}
      }
      if (foreign) {
        const notes=[...root.querySelectorAll('.notation-event[data-event-id^="foreign-low-"]')]
        if(notes.length!==4)throw Error('Four actual competing voice notes required')
        for(const note of notes){
          music.push(...[...note.querySelectorAll('.vf-notehead text')].map(n=>({...ink(n),type:'foreign-head'})))
          for(const n of note.querySelectorAll('path,line')){
            const css=getComputedStyle(n),raw=n.getBBox();if(css.stroke==='none'&&css.fill==='none'||Number(css.opacity)===0)continue
            const b=transformBox(n,raw),stroke=css.stroke==='none'?0:Number.parseFloat(css.strokeWidth)/2
            if(b.width+2*stroke>0&&b.height+2*stroke>0)music.push({type:raw.height===0?'foreign-ledger':'foreign-stem',x:b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke})
          }
        }
        for(const n of [...root.querySelectorAll('.vf-beam[data-measure-id] path')].filter(n=>n.closest('.vf-beam').dataset.measureId===notes[0].dataset.measureId)){
          const b=transformBox(n,n.getBBox()),css=getComputedStyle(n),stroke=css.stroke==='none'?0:Number.parseFloat(css.strokeWidth)/2
          music.push({type:n.closest('.vf-stem')?'foreign-stem':'foreign-beam',x:b.x-stroke,y:b.y-stroke,width:b.width+2*stroke,height:b.height+2*stroke})
        }
        for(const kind of ['foreign-head','foreign-stem','foreign-ledger','foreign-beam'])if(!music.some(n=>n.type===kind&&n.width>0&&n.height>0))throw Error('Missing actual painted '+kind)
      }
      const overlap = b => Math.min(wedge.right, b.x+b.width)-Math.max(wedge.x,b.x)
      if (!noSpan && ![...lyrics,...dynamics,...expressions,...music].every(b=>overlap(b)>0)) throw Error('Fixture ink must horizontally overlap actual wedge')
      return { pieces: pieces.length, wedge, lyrics, dynamics, expressions, ...(stem?{music}:{}), upperGap: noSpan ? null : Math.min(...[...lyrics,...dynamics,...music].map(b=>wedge.y-b.y-b.height)), expressionGap: noSpan ? null : Math.min(...expressions.map(b=>b.y-wedge.bottom)), ...(expressionAudit?{expressionMusicGap:Math.min(...expressions.flatMap(t=>music.filter(n=>Math.min(t.x+t.width,n.x+n.width)>Math.max(t.x,n.x)).map(n=>t.y-n.y-n.height)))}:{}) }
    }, { print, cross, stem: interiorStemAudit, foreign: foreignVoiceAudit, noSpan: expressionNoSpanAudit, expressionAudit: expressionClearanceAudit })
    if(process.argv.includes('--audit-settled-interior')){
      const samples=[],started=Date.now();let previous,stable=0
      while(stable<3){
        await settle();const measured=await measure(false),geometry=await run(()=>{const root=document.querySelector('.score-canvas'),svg=root.querySelector('svg'),r=root.getBoundingClientRect();return{containerWidth:r.width,svgWidth:svg.getBoundingClientRect().width,viewBox:svg.getAttribute('viewBox')}}),signature=JSON.stringify({measured,geometry})
        stable=signature===previous?stable+1:0;previous=signature;samples.push({ms:Date.now()-started,stable,geometry,measured})
        assert(Date.now()-started<3000,'Owned interior screen geometry must converge independently of any reference')
      }
      fs.writeFileSync(path.join(scene,'screen-settle.json'),JSON.stringify({requiredStableFrames:3,samples},null,2))
    }
    const screen = await measure(false); fs.writeFileSync(path.join(scene, 'screen-clearance.json'), JSON.stringify(screen, null, 2))
    if (process.argv.includes('--audit-hairpin-ink-capture')) {
      await run(() => document.querySelector('.score-canvas .notation-hairpin').scrollIntoView({ block: 'center' })); await settle()
      const visible = await run(() => { const n = document.querySelector('.score-canvas .notation-hairpin'), r = n.getBoundingClientRect(), bottom = document.querySelector('.studio-status').getBoundingClientRect().top; return { top: r.top, bottom: r.bottom, viewportBottom: bottom } })
      assert(visible.top >= 0 && visible.bottom <= visible.viewportBottom, 'Capture must expose the actual wedge, not just the score header')
      fs.writeFileSync(path.join(scene, 'capture-visibility.json'), JSON.stringify(visible, null, 2))
    }
    await capture('clearance')
    let hit
    if (interiorInputAudit && !expressionNoSpanAudit) {
    await run(() => document.querySelectorAll('.notation-span-target[data-span-kind="hairpin"]').item(document.querySelectorAll('.notation-span-target[data-span-kind="hairpin"]').length - 1).scrollIntoView({ block: 'center' })); await settle()
    hit = await run(() => {
      const targets = [...document.querySelectorAll('.score-canvas .notation-span-target[data-span-kind="hairpin"]')], target = targets.at(-1), line = target.querySelector('.notation-hairpin line')
      const x1=Number(line.getAttribute('x1')),x2=Number(line.getAttribute('x2')),y1=Number(line.getAttribute('y1')),y2=Number(line.getAttribute('y2'))
      for (const f of [.25,.5,.75]) {
        const p=new DOMPoint(x1+(x2-x1)*f,y1+(y2-y1)*f).matrixTransform(line.getScreenCTM()),x=Math.round(p.x),y=Math.round(p.y)
        if(x>=0&&x<innerWidth&&y>=0&&y<document.querySelector('.studio-status').getBoundingClientRect().top&&document.elementFromPoint(x,y)?.closest('.notation-span-target')===target)return{x,y}
      }
      throw Error('Moved painted wedge must retain an actual pointer target')
    })
    for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...hit,button:'left',clickCount:1})
    await settle(); assert(await run(()=>[...document.querySelectorAll('.score-canvas .notation-span-target[data-span-kind="hairpin"]')].every(n=>n.getAttribute('aria-pressed')==='true')))
    assert.deepEqual(await save('unchanged'), JSON.parse(bytes).score)
    if (interiorResetAudit) {
      await wait(() => document.querySelector('.studio-span-properties')?.checkVisibility())
      if (await run(() => document.querySelector('.studio-span-properties__geometry button[aria-expanded]')?.getAttribute('aria-expanded') === 'false')) await click('배치 · 형상')
      assert.equal(await run(() => { const n=document.querySelector('input[aria-label="표기 세로 이동"]'); if(!n?.checkVisibility()||n.disabled)throw Error('Visible enabled geometry field required'); return n.value }), '0')
      assert.equal(await run(() => document.querySelector('input[aria-label="표기 높이"]').value), '2')
      const automatic = JSON.parse(bytes).score; delete automatic.hairpins[0].engraving
      await click('표기 자동 배치 복원')
      assert.deepEqual(await save('reset-auto'), automatic)
      const resetScreen = await measure(false); assert(resetScreen.upperGap >= 8 && resetScreen.expressionGap >= 8)
      fs.writeFileSync(path.join(scene,'reset-auto-screen.json'),JSON.stringify(resetScreen,null,2)); await capture('reset-auto')
      pendingPrintMeasurement = () => measure(true)
      await click('파일'); await click('내보내기 설정'); await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
      const resetPrint = JSON.parse(fs.readFileSync(path.join(scene,'print-clearance.json')))
      assert(resetPrint.upperGap >= 8 && resetPrint.expressionGap >= 8)
      fs.copyFileSync(path.join(scene,'view.pdf'),path.join(scene,'reset-auto.pdf')); fs.writeFileSync(path.join(scene,'reset-auto-print.json'),JSON.stringify(resetPrint,null,2))
      for (const [name, expected, modifiers] of [['reset-undo',JSON.parse(bytes).score,['control']],['reset-redo',automatic,['control','shift']],['reset-final-undo',JSON.parse(bytes).score,['control']]]) {
        await click('악보로 이동'); await key('z',modifiers); assert.deepEqual(await save(name),expected)
      }
    }
    const beforeReopen = await measure(false)
    fs.writeFileSync(path.join(scene, 'before-reopen-clearance.json'), JSON.stringify(beforeReopen, null, 2))
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
    assert.deepEqual(await measure(false), beforeReopen)
    assert.deepEqual(await save('cold-reopen'), JSON.parse(bytes).score)
    } else if (expressionNoSpanAudit && interiorInputAudit) {
      await run(() => document.querySelector('.score-canvas .notation-expression-text').scrollIntoView({block:'center'})); await settle()
      hit=await run(()=>{
        const node=document.querySelector('.score-canvas .notation-expression-text'),c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(node).font
        const m=c.measureText(node.textContent),p=node.getStartPositionOfChar(0),q=new DOMPoint(p.x+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,p.y+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2).matrixTransform(node.getScreenCTM()),x=Math.round(q.x),y=Math.round(q.y)
        if(x<0||x>=innerWidth||y<0||y>=document.querySelector('.studio-status').getBoundingClientRect().top||document.elementFromPoint(x,y)?.closest('.notation-expression-text-target')?.dataset.expressionTextId!=='interior-expression')throw Error('Moved expression ink must keep its actual pointer target')
        return{x,y}
      })
      for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...hit,button:'left',clickCount:1});await settle()
      assert(await run(()=>document.querySelector('.score-canvas .notation-expression-text-target')?.getAttribute('aria-pressed')==='true'))
      assert.deepEqual(await save('unchanged'),JSON.parse(bytes).score)
      const beforeReopen=await measure(false)
      await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
      assert.deepEqual(await measure(false),beforeReopen);assert.deepEqual(await save('cold-reopen'),JSON.parse(bytes).score)
    } else assert.deepEqual(await save('unchanged'), JSON.parse(bytes).score)
    await click('파일'); await click('내보내기 설정'); await click('MIDI 내보내기')
    await wait(() => document.querySelector('.editor-status').textContent.includes('actual.mid'))
    assert.deepEqual(fs.readFileSync(path.join(scene, 'actual.mid')), fs.readFileSync(path.join(fixture, 'expected.mid')))
    await click('MusicXML 내보내기'); await wait(() => document.querySelector('.editor-status').textContent.includes('actual.musicxml'))
    assert.equal(fs.readFileSync(path.join(scene, 'actual.musicxml'), 'utf8'), fs.readFileSync(path.join(fixture, 'expected.musicxml'), 'utf8'))
    pendingPrintMeasurement = async () => {
      const value=await measure(true)
      if(headerViewportAudit){
        assert(interiorReference,'Viewport sampling needs a recorded height reference')
        const old=JSON.parse(fs.readFileSync(path.join(interiorReference,step,'print.json')))
        const probe=await headerViewportProbe(old.height)
        assert.deepEqual(probe.after,probe.before,'Diagnostic clones must not change the real output geometry')
        for(const sample of probe.samples)assert.deepEqual(sample.lyrics.map(n=>[n.text,n.x,n.y,n.font]),probe.before.lyrics.map(n=>[n.text,n.x,n.y,n.font]),'Only blank viewport height may change')
        const reference=JSON.parse(fs.readFileSync(path.join(interiorReference,step,'print-clearance.json')))
        assert.equal(probe.samples[1].lyrics.length,reference.lyrics.length)
        for(let i=0;i<reference.lyrics.length;i++){
          assert(Math.abs(probe.samples[1].lyrics[i].inkX-reference.lyrics[i].x)<0.001,'Matched viewport must reconstruct recorded lyric ink at the unchanged strict precision')
          assert(Math.abs(probe.before.lyrics[i].inkX-value.lyrics[i].x)<0.001,'Real viewport sample must match the real output ink')
        }
        probe.matchedReferenceInk=reference.lyrics.map(n=>n.x)
        fs.writeFileSync(path.join(scene,'viewport-probe.json'),JSON.stringify(probe,null,2))
      }
      return value
    }
    await click('PDF 변환'); await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    const print = JSON.parse(fs.readFileSync(path.join(scene, 'print-clearance.json'))); assert.deepEqual(await save('after-output'), JSON.parse(bytes).score); assert.deepEqual(fs.readFileSync(file), bytes)
    const clear = expressionClearanceAudit ? [screen,print].every(m=>(expressionNoSpanAudit||manual||m.upperGap>=8) && (expressionNoSpanAudit||m.expressionGap>=8) && m.expressionMusicGap>=8) : manual || [screen, print].every(m=>m.upperGap >= 8 && m.expressionGap >= 8)
    if (!clear) failures.push({ width, kind, screenGap: [screen.upperGap,screen.expressionGap], printGap: [print.upperGap,print.expressionGap], ...(expressionClearanceAudit?{expressionMusicGap:[screen.expressionMusicGap,print.expressionMusicGap]}:{}) })
    rows.push({ width, kind, manual, screen, print, nativeExact: true, pointerTarget: hit, coldReopenGeometryExact: interiorInputAudit, resetTransition: interiorResetAudit, midiExact: true, xmlExact: true, clear })
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,'clearance-failures.json'),JSON.stringify(failures,null,2))
  }
  if (interiorReference && !headerViewportAudit) {
    const prior = JSON.parse(fs.readFileSync(path.join(interiorReference, 'results.json')))
    for (const row of (headerReflowReference ? rows : rows.filter(r => r.manual))) {
      const old = prior.find(r => r.width === row.width && r.kind === row.kind)
      assert(old, 'Manual reference missing')
      if (headerReflowReference) {
        // A corrected heading can translate a system. All body geometry must
        // stay exact relative to its own ink anchor; raw native geometry stays
        // byte-for-byte covered by the save checks above.
        const normalized=m=>{
          const anchor=m.music?.find(n=>n.text)||m.lyrics[0]||m.dynamics[0]||m.expressions[0]
          const rect=n=>({...n,y:n.y-anchor.y})
          return {pieces:m.pieces,wedge:m.wedge?{x:m.wedge.x,y:m.wedge.y-anchor.y,right:m.wedge.right,bottom:m.wedge.bottom-anchor.y}:null,lyrics:m.lyrics.map(rect),dynamics:m.dynamics.map(rect),expressions:m.expressions.map(rect),...(m.music?{music:m.music.map(rect)}:{})}
        }
        const compare=(left,right)=>{
          if(typeof left==='number'){assert(Math.abs(left-right)<0.001,'Relative body geometry changed: '+left+' vs '+right);return}
          if(left===null||typeof left!=='object'){assert.equal(left,right);return}
          assert.deepEqual(Object.keys(left),Object.keys(right));for(const key of Object.keys(left))compare(left[key],right[key])
        }
        compare(normalized(row.print),normalized(old.print))
      } else if (expressionClearanceAudit) {
        // Automatic text now moves; preserve the manual wedge relative to its
        // own note ink, not an entire PDF containing the corrected text.
        const relative = m => { const n=m.music.find(n=>n.text); return { x:m.wedge.x-n.x,right:m.wedge.right-n.x,y:m.wedge.y-n.y,bottom:m.wedge.bottom-n.y } }
        const left=relative(row.print),right=relative(old.print)
        for(const field of Object.keys(left))assert(Math.abs(left[field]-right[field])<0.001,'Manual relative geometry changed: '+field)
      } else { if (!interiorInputAudit) assert.deepEqual(row.screen, old.screen); assert.deepEqual(row.print, old.print) }
    }
  }
  assert.deepEqual(failures, [], 'Automatic middle-annotation ink needs full wedge clearance')
}
const auditSearchCancel = async () => {
  const file = path.resolve('out/ddirori/continuous-let-ring-source/single/source.chromatics')
  const bytes = fs.readFileSync(file), baseline = JSON.parse(bytes).score, rows = []
  for (const width of [960, 1400]) for (const action of ['Escape', '닫기']) {
    step = `${width}-${action}`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); saved = file
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    await click('악보로 이동'); await key('Up', ['alt','shift']); const before = await snapshot(); assert(before.dirty)
    await click('도구'); await click('명령 검색')
    await wait(() => document.activeElement?.getAttribute('type') === 'search')
    await key('Down')
    assert(await run(() => document.activeElement?.classList.contains('studio-command-search__result') && !document.activeElement.disabled))
    await key('Tab', ['shift']); assert(await run(() => document.activeElement?.getAttribute('type') === 'search'))
    for (const type of ['keyDown', 'char', 'keyUp']) win.webContents.sendInputEvent({ type, keyCode: 'Q' })
    await settle(); assert(await run(() => document.querySelector('.studio-command-search').textContent.includes('일치하는 명령이 없습니다.')))
    if (action === 'Escape') await key('Escape'); else await click(action)
    await wait(() => !document.querySelector('dialog[open]') && document.activeElement?.getAttribute('aria-label') === '도구')
    assert.deepEqual(await snapshot(), before); await capture('search-return')
    await key('Enter'); await wait(() => document.querySelector('[aria-label="도구"][aria-haspopup="menu"]').getAttribute('aria-expanded') === 'true')
    await key('Escape'); assert(await run(() => document.activeElement?.getAttribute('aria-label') === '도구'))
    const edited = await save('after-search-cancel'); assert.notDeepEqual(edited, baseline)
    await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
    await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), edited)
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
    assert.deepEqual(await save('reopened'), edited); assert.deepEqual(fs.readFileSync(file), bytes)
    rows.push({ width, action, emptySearchKeyboard: true, firstResultAndReverseTab: true, dirtySelectionInkExact: true, restoredMenuKeyboard: true, undoRedoExact: true, nativeReopen: true })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const auditWizardCancel = async () => {
  const file = path.resolve('out/ddirori/continuous-let-ring-source/single/source.chromatics')
  const bytes = fs.readFileSync(file), baseline = JSON.parse(bytes).score, rows = []
  for (const width of [960, 1400]) for (const action of ['취소', 'Escape', '닫기']) {
    step = `${width}-${action}`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); saved = file
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    await click('악보로 이동'); await key('Up', ['alt','shift'])
    const before = await snapshot(); assert(before.dirty)
    await click('파일'); await click('파일 작업 열기'); await click('새 악보 만들기')
    await wait(() => Boolean(document.querySelector('dialog[open]')))
    const initialFocus = await run(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent }))
    fs.writeFileSync(path.join(scene, 'wizard-initial-focus.json'), JSON.stringify(initialFocus, null, 2))
    const titleFocused = () => run(() => document.activeElement === [...document.querySelectorAll('label')].find(n => n.textContent.trim() === '제목')?.control)
    for (let tabs = 0; !await titleFocused(); tabs++) { assert(tabs < 30, 'Title must be reachable through native Tab'); await key('Tab') }
    await key('a', ['control'])
    for (const type of ['keyDown', 'char', 'keyUp']) win.webContents.sendInputEvent({ type, keyCode: 'K' })
    await settle()
    assert.equal(await run(() => [...document.querySelectorAll('label')].find(n => n.textContent.trim() === '제목')?.control.value), 'K')
    if (action === 'Escape') await key('Escape'); else await click(action)
    await wait(() => !document.querySelector('dialog[open]') && document.activeElement?.getAttribute('aria-label') === '새 악보 만들기')
    assert.deepEqual(await snapshot(), before)
    await capture('cancel-focus')
    // Native Enter reopens from the restored trigger; draft text is discarded.
    await key('Enter')
    await wait(() => Boolean(document.querySelector('dialog[open]')))
    assert.notEqual(await run(() => [...document.querySelectorAll('label')].find(n => n.textContent.trim() === '제목')?.control.value), 'K')
    await key('Escape'); await wait(() => document.activeElement?.getAttribute('aria-label') === '새 악보 만들기')
    const edited = await save('after-cancel'); assert.notDeepEqual(edited, baseline)
    await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
    await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), edited)
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
    assert.deepEqual(await save('reopened'), edited); assert.deepEqual(fs.readFileSync(file), bytes)
    rows.push({ width, action, discardDraft: true, dirtySelectionInkExact: true, enterReopens: true, cancelFocus: true, undoRedoExact: true, nativeReopen: true })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const auditOpenWizardIntent = async () => {
  const file=path.join(source,'source.chromatics'),bytes=fs.readFileSync(file),baseline=JSON.parse(bytes).score
  const edited=JSON.parse(fs.readFileSync(path.join(source,'edited.chromatics'))).score,replacementFile=path.join(source,'replacement.chromatics'),replacementBytes=fs.readFileSync(replacementFile),replacement=JSON.parse(replacementBytes).score,rows=[]
  const cases=[['open','success'],['open','failure'],['cancel','success'],['cancel','failure'],['overlap','success'],['overlap','failure'],['declined','success']]
  for(const width of [960,1400])for(const [phase,outcome]of cases){
    step=`${width}-${phase}-${outcome}`;console.log('START',step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});saved=file
    nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
    await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
    await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
    assert.deepEqual(await save('initial'),baseline)
    await click('악보로 이동');await key('t')
    await click('파일');await click('파일 작업 열기')
    const before=await snapshot();assert(before.dirty)
    await run(phase=>{window.__ownedConfirm=[];window.confirm=message=>{window.__ownedConfirm.push(message);return !(phase==='declined'&&window.__ownedConfirm.length===2)}},phase)
    delayNextOpen=true;pendingOpenResponse=undefined
    await click('프로젝트 열기');await wait(()=>Boolean(document.querySelector('.score-canvas .notation-event')))
    assert(pendingOpenResponse,'Owned read must be pending before starting the later wizard')
    const readBusy=()=>run(()=>{const button=document.querySelector('button[aria-label="프로젝트 열기"]');if(!button?.checkVisibility())throw Error('Live native toolbar control missing');return{disabled:button.disabled,busy:button.getAttribute('aria-busy')}})
    assert.deepEqual(await readBusy(),{disabled:true,busy:'true'})
    await click('파일');await click('새 악보 만들기')
    if(phase!=='declined'){
      await run(()=>{const label=[...document.querySelectorAll('dialog[open] label')].find(n=>n.textContent.trim()==='제목'),input=label?.control;if(!input?.checkVisibility())throw Error('Public wizard title missing');input.focus();input.select()})
      for(const type of ['keyDown','char','keyUp'])win.webContents.sendInputEvent({type,keyCode:'W'});await settle()
      assert.equal(await run(()=>document.activeElement?.value),'W')
      if(phase==='cancel'||phase==='overlap')await click('취소')
    }else assert(await run(()=>!document.querySelector('dialog[open]')),'A declined new-score confirmation must not start a wizard')
    const afterWizard=await readBusy();assert.deepEqual(afterWizard,{disabled:phase==='declined',busy:phase==='declined'?'true':'false'})
    fs.writeFileSync(path.join(scene,'toolbar-busy.json'),JSON.stringify({before:{disabled:true,busy:'true'},afterWizard},null,2))
    const older=pendingOpenResponse;let newer
    if(phase==='overlap'){
      delayNextOpen=true;await click('프로젝트 열기');newer=pendingOpenResponse
      assert(newer&&newer!==older,'Explicit retry must reach IPC before the stale read completes')
      assert.deepEqual(await readBusy(),{disabled:true,busy:'true'})
    }
    const status=await run(()=>document.querySelector('.editor-status').textContent),adds=recentAdds
    if(outcome==='success')older.resolve({...result(replacementFile),contents:replacementBytes.toString('utf8')})
    else older.reject(Error('Owned stale open failure'))
    if(!newer)pendingOpenResponse=undefined;await settle();await settle()
    const confirmations=await run(()=>window.__ownedConfirm);assert.equal(confirmations.length,phase==='overlap'?3:2,'Dirty open and dirty wizard confirmations are explicitly controlled, not OS dialogs')
    if(phase==='declined'){
      await wait(()=>document.querySelector('.studio-document').textContent.includes('Owned fresh file'))
      assert.deepEqual(await save('valid-earlier-open'),replacement)
    }else if(phase==='overlap'){
      assert.equal(await run(()=>document.querySelector('.editor-status').textContent),status);assert.deepEqual(await snapshot(),before);assert.equal(recentAdds,adds)
      assert.deepEqual(await readBusy(),{disabled:true,busy:'true'})
      const reads=projectOpenCalls;await click('파일')
      const point=await run(()=>{
        const node=[...document.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent.trim()==='프로젝트 열기')
        if(!node?.checkVisibility()||(!node.disabled&&node.getAttribute('aria-disabled')!=='true'))throw Error('Current native open must stay disabled in the live menu')
        const r=node.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}
      })
      for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle()
      assert.equal(projectOpenCalls,reads,'Old finally must not unlock the current read')
      await key('Escape')
      newer.resolve({...result(replacementFile),contents:replacementBytes.toString('utf8')});pendingOpenResponse=undefined
      await wait(()=>document.querySelector('.studio-document').textContent.includes('Owned fresh file'));assert.deepEqual(await save('overlap-retry'),replacement)
    }else{
      assert.equal(await run(()=>document.querySelector('.editor-status').textContent),status)
      assert.deepEqual(await snapshot(),before);assert.equal(recentAdds,adds,'Discarded read must not update recent feedback')
      if(phase==='open'){
        assert.equal(await run(()=>document.activeElement?.value),'W');assert(await run(()=>Boolean(document.querySelector('dialog[open]'))))
        await capture('draft-preserved');await click('취소')
      }else await capture('cancel-preserved')
      assert.deepEqual(await save('preserved'),edited)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('undo'),baseline)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('second-undo-noop'),baseline)
      await click('악보로 이동');await key('z',['control','shift']);assert.deepEqual(await save('redo'),edited)
      await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('restored'),baseline)
      saved=replacementFile;await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.studio-document').textContent.includes('Owned fresh file'))
      assert.deepEqual(await save('explicit-retry'),replacement)
    }
    assert.deepEqual(fs.readFileSync(file),bytes);assert.deepEqual(fs.readFileSync(replacementFile),replacementBytes)
    rows.push({width,phase,outcome,controlledConfirmations:confirmations,sourceExact:true,explicitRetry:phase!=='declined',priorUndoPreserved:phase!=='declined'&&phase!=='overlap'})
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))
  }
}
const auditBackupReopen = async () => {
 const file=path.join(source,'source.chromatics'),bytes=fs.readFileSync(file),baseline=JSON.parse(bytes).score,replacementFile=path.join(source,'replacement.chromatics'),replacementBytes=fs.readFileSync(replacementFile),replacement=JSON.parse(replacementBytes),rows=[]
 for(const width of [960,1400])for(const outcome of ['success','failure']){
  step=`${width}-${outcome}`;console.log('START',step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});saved=file;pendingBackupReads=[]
  nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
  await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
  await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'));assert.deepEqual(await save('initial'),baseline)
  await click('악보로 이동');await key('t');await click('파일');await click('파일 작업 열기')
  const before=await snapshot();assert(before.dirty)
  await run(()=>{window.__ownedBackupConfirm=[];window.confirm=message=>{window.__ownedBackupConfirm.push(message);return true}})
  await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('button[aria-label="Same listed backup 복구"]')));await click('Same listed backup 복구')
  assert.equal(pendingBackupReads.length,1);await key('Escape');await wait(()=>!document.querySelector('dialog[open]'))
  assert.equal(await run(()=>document.activeElement?.getAttribute('aria-label')),'프로젝트 백업')
  await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('button[aria-label="Same listed backup 복구"]')));await click('Same listed backup 복구');assert.equal(pendingBackupReads.length,2)
  if(outcome==='success')pendingBackupReads[0].resolve({contents:bytes.toString('utf8')});else pendingBackupReads[0].reject(Error('Owned canceled backup failure'))
  await settle();await settle();assert.deepEqual(await snapshot(),before)
  const point=await run(()=>{
   const dialog=document.querySelector('dialog[open]'),button=dialog?.querySelector('button[aria-label="Same listed backup 복구"]')
   if(!button?.checkVisibility()||!button.disabled||!dialog.textContent.includes('복구 파일을 불러오는 중입니다. 닫으면 복구를 취소합니다.')||dialog.querySelector('[role="alert"]'))throw Error('Old restore must not close, unlock or publish an error into the current dialog')
   const r=button.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}
  })
  for(const type of ['mouseDown','mouseUp'])win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await settle();assert.equal(pendingBackupReads.length,2)
  await capture('new-restore-pending')
  pendingBackupReads[1].resolve({contents:replacementBytes.toString('utf8')});await wait(()=>!document.querySelector('dialog[open]')&&document.querySelector('.studio-document')?.textContent.includes('Owned fresh file'))
  assert(await run(()=>document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경')))
  await click('악보로 이동');await key('z',['control']);assert.deepEqual(await save('current-backup'),replacement.score)
  assert.deepEqual(JSON.parse(fs.readFileSync(saved)),replacement)
  const request=JSON.parse(fs.readFileSync(path.join(scene,'save-requests.jsonl'),'utf8').trim().split('\n').at(-1));assert(!Object.hasOwn(request,'filePath'),'Backup recovery must request a new save path')
  await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'));await key('z',['control']);assert.deepEqual(await save('cold-reopen'),replacement.score)
  assert.deepEqual(fs.readFileSync(file),bytes);assert.deepEqual(fs.readFileSync(replacementFile),replacementBytes)
  const confirmations=await run(()=>window.__ownedBackupConfirm);assert.equal(confirmations.length,2)
  rows.push({width,outcome,oldSourceAndDirtyExact:true,newRestoreRemainedBusy:true,readRequests:pendingBackupReads.length,controlledConfirmations:confirmations,freshPath:true,nativeReopenExact:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))
 }
}
const auditBackupDiagnostics = async () => {
 const file=path.join(source,'source.chromatics'),bytes=fs.readFileSync(file),baseline=JSON.parse(bytes).score,replacementFile=path.join(source,'replacement.chromatics'),replacementBytes=fs.readFileSync(replacementFile),replacement=JSON.parse(replacementBytes),rows=[],failures=[]
 for(const width of [960,1400])for(const coarse of [false,true])for(const scale of [1,2]){
  step=`${width}-${coarse?'coarse':'fine'}-${scale*100}`;console.log('START',step);scene=path.join(out,step);fs.mkdirSync(scene,{recursive:true});saved=file;diagnosticBackupReads=0
  nativeTheme.themeSource=width===960?'dark':'light';win.setContentSize(width,800)
  await win.loadFile(path.resolve('out/renderer/index.html'));app.focus({steal:true});win.focus();await settle()
  await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'));assert.deepEqual(await save('initial'),baseline)
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
  const fonts=()=>run(()=>[...document.querySelectorAll('.score-canvas .vf-notehead text')].map(n=>({text:n.textContent,width:n.getBBox().width,height:n.getBBox().height})))
  const beforeFonts=await fonts()
  await click('파일');await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('[data-backup-id="bad"]')))
  if(scale===2){await run(scaleStudioChromeText);await settle()}
  const inspect=()=>run(({name,raw})=>{
   const dialog=document.querySelector('dialog[open]'),row=dialog.querySelector('[data-backup-id="bad"]'),button=[...row.querySelectorAll('button')].find(n=>n.textContent.trim()==='기술 정보'),content=row.querySelector('.studio-warning-technical__content')
   const b=button?.getBoundingClientRect(),s=button?getComputedStyle(button):null,d=dialog.getBoundingClientRect()
   return{hasTechnical:Boolean(button),hasGuidance:row.textContent.includes('이 백업을 읽을 수 없습니다. 다른 백업을 선택해 주세요.'),rawVisible:content?.checkVisibility()??false,rawExact:content?.textContent.includes(raw)??false,titleOnly:[...row.querySelectorAll('[title]')].some(n=>n.getAttribute('title')===raw),coarse:matchMedia('(pointer:coarse)').matches,docOverflow:document.documentElement.scrollWidth>innerWidth,dialogOverflow:dialog.scrollWidth>dialog.clientWidth+1,restoreDisabled:row.querySelector('button[aria-label]')?.disabled,goodEnabled:!dialog.querySelector('button[aria-label="Healthy backup 복구"]').disabled,button:b?{x:b.x,y:b.y,width:b.width,height:b.height,font:parseFloat(s.fontSize),focused:document.activeElement===button,focusVisible:button.matches(':focus-visible'),contained:b.top>=Math.max(0,d.top)&&b.bottom<=Math.min(innerHeight,d.bottom)}:null}
  },{name:invalidBackupName,raw:invalidBackupError})
  const collapsed=await inspect();await capture('collapsed');assert.equal(collapsed.coarse,coarse);assert(collapsed.restoreDisabled&&collapsed.goodEnabled)
  if(!collapsed.hasTechnical||!collapsed.hasGuidance||collapsed.docOverflow||collapsed.dialogOverflow)failures.push({step,stage:'collapsed',probe:collapsed})
  if(collapsed.hasTechnical){
   assert(!collapsed.rawVisible&&collapsed.rawExact&&!collapsed.titleOnly)
   await key('Tab');const focused=await inspect();assert(focused.button.focused&&focused.button.focusVisible);assert(focused.button.height>=(coarse?47.9:31.9))
   const status=await run(()=>document.querySelector('.editor-status').textContent)
   await key('Enter');if(scale===2){await run(scaleStudioChromeText);await settle()}
   const expanded=await inspect();assert(expanded.rawVisible&&expanded.rawExact)
   if(expanded.docOverflow||expanded.dialogOverflow)failures.push({step,stage:'expanded',probe:expanded})
   const readTail=()=>run(()=>{
    const dialog=document.querySelector('dialog[open]'),text=dialog.querySelector('[data-backup-id="bad"] .studio-warning-technical__content > span:last-child'),node=text.firstChild,length=node.textContent.trimEnd().length,range=document.createRange()
    range.setStart(node,Math.max(0,length-8));range.setEnd(node,length)
    const r=[...range.getClientRects()].filter(r=>r.width&&r.height).at(-1),clip={left:0,top:0,right:innerWidth,bottom:innerHeight},owners=[]
    for(let p=text.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX)){clip.left=Math.max(clip.left,b.left+p.clientLeft);clip.right=Math.min(clip.right,b.left+p.clientLeft+p.clientWidth)}if(/auto|scroll|hidden|clip/.test(s.overflowY)){clip.top=Math.max(clip.top,b.top+p.clientTop);clip.bottom=Math.min(clip.bottom,b.top+p.clientTop+p.clientHeight);owners.push({className:p.className,scrollTop:p.scrollTop,scrollHeight:p.scrollHeight,clientHeight:p.clientHeight})}}
    const d=dialog.getBoundingClientRect(),x=Math.round(d.left+d.width/2),y=Math.round(Math.min(d.bottom-24,d.top+d.height/2))
    return{visible:Boolean(r&&r.left>=clip.left&&r.right<=clip.right&&r.top>=clip.top&&r.bottom<=clip.bottom),tail:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null,clip,owners,point:{x,y},pointOwned:document.elementFromPoint(x,y)?.closest('dialog[open]')===dialog}
   })
   const readingBefore=await readTail();let readingAfter=readingBefore,wheels=0
   await capture('expanded-top')
   while(!readingAfter.visible&&wheels<8){assert(readingAfter.pointOwned);win.webContents.sendInputEvent({type:'mouseMove',...readingAfter.point});win.webContents.sendInputEvent({type:'mouseWheel',...readingAfter.point,deltaY:-380,deltaX:0,canScroll:true});await settle();wheels++;readingAfter=await readTail()}
   fs.writeFileSync(path.join(scene,'raw-reading.json'),JSON.stringify({before:readingBefore,after:readingAfter,wheels},null,2));assert(readingAfter.visible,'Actual wheel must reveal the final raw diagnostic line inside every real clip boundary')
   await capture('expanded');await key('Space');const closed=await inspect();assert(!closed.rawVisible&&closed.button.focused&&closed.button.contained);assert.equal(await run(()=>document.querySelector('.editor-status').textContent),status);assert.equal(diagnosticBackupReads,0)
  }
  assert.deepEqual(await fonts(),beforeFonts,'Chrome-only text choice must not scale music glyph metrics')
  await key('Escape');await wait(()=>!document.querySelector('dialog[open]'));assert.deepEqual(await save('after-inspection'),baseline)
  if(collapsed.hasTechnical){
   await click('파일');await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('[data-backup-id="bad"]')))
   if(scale===2){await run(scaleStudioChromeText);await settle()}
   assert(!(await inspect()).rawVisible,'Reopening must reset the diagnostic disclosure')
   await click('Healthy backup 복구');await wait(()=>!document.querySelector('dialog[open]'));assert.equal(diagnosticBackupReads,1)
   assert.deepEqual(await save('healthy-restored'),replacement.score);assert.deepEqual(JSON.parse(fs.readFileSync(saved)),replacement)
  }
  assert.deepEqual(fs.readFileSync(file),bytes);assert.deepEqual(fs.readFileSync(replacementFile),replacementBytes)
  rows.push({width,coarse,scale,collapsed,nativeExact:true,healthyRecovery:collapsed.hasTechnical});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(out,'diagnostic-failures.json'),JSON.stringify(failures,null,2))
  await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach()
 }
 assert.deepEqual(failures,[],'Invalid backup diagnostics need keyboard/coarse access and contained text')
}
const auditPartStructure = async () => {
  const file = path.join(source, 'source.chromatics'), originalBytes = fs.readFileSync(file)
  const saveProject = async name => { await save(name); return JSON.parse(fs.readFileSync(saved, 'utf8')) }
  const original = JSON.parse(originalBytes), deleted = JSON.parse(fs.readFileSync(path.join(source, 'deleted.chromatics')))
  const contract = JSON.parse(fs.readFileSync(path.join(source, 'contract.json'))), rows = []
  const choose = async (label, index) => {
    await run(label => {
      const node = [...document.querySelectorAll('label')].find(n => n.textContent.trim() === label)?.control
      if (!node?.checkVisibility() || node.disabled) throw Error('Unavailable public choice: ' + label)
      node.scrollIntoView({ block: 'center' }); node.focus()
    }, label)
    await key('Space'); await key('Home'); for (let i = 0; i < index; i++) await key('Down'); await key('Enter')
  }
  for (const width of [960, 1400]) for (const view of ['score', 'part-a', 'part-b']) {
    step = `${width}-${view}`; console.log('START', step)
    scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true }); saved = file
    nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
    await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle()
    await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status')?.textContent.includes('을 열었습니다.'))
    await run(id => {
      const node = [...document.querySelectorAll('.score-canvas .notation-event')].find(n => n.dataset.eventId === id)
      if (!node) throw Error('Missing lower-staff target')
      node.scrollIntoView({ block: 'center' })
    }, contract.target.eventId); await settle()
    const point = await run(id => {
      const node = [...document.querySelectorAll('.score-canvas .notation-event')].find(n => n.dataset.eventId === id), glyph = node.querySelector('text')
      if (!glyph) throw Error('Lower staff target needs actual glyph ink')
      const context = document.createElement('canvas').getContext('2d'); context.font = getComputedStyle(glyph).font
      const metrics = context.measureText(glyph.textContent), p = glyph.getStartPositionOfChar(0)
      const q = new DOMPoint(p.x + (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2, p.y + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2).matrixTransform(glyph.getScreenCTM())
      return { x: Math.round(q.x), y: Math.round(q.y), footerTop: document.querySelector('.studio-status').getBoundingClientRect().top, owner: document.elementFromPoint(q.x, q.y)?.closest('.notation-event')?.dataset.eventId }
    }, contract.target.eventId)
    assert(point.y >= 0 && point.y < point.footerTop && point.x >= 0 && point.x < width); assert.equal(point.owner, contract.target.eventId)
    const contextPoint = await run(id => {
      const node = [...document.querySelectorAll('.score-canvas .notation-measure')].find(n => n.dataset.measureId === id)
      if (!node) throw Error('Missing actual lower measure surface')
      const r = node.getBoundingClientRect()
      for (const fx of [.75, .5, .3]) for (const fy of [.25, .65]) {
        const x = Math.round(r.x + r.width * fx), y = Math.round(r.y + r.height * fy)
        if (document.elementFromPoint(x, y) === node) return { x, y }
      }
      throw Error('No blank public lower-staff measure point')
    }, contract.target.measureId)
    for (const type of ['mouseDown', 'mouseUp']) win.webContents.sendInputEvent({ type, ...contextPoint, button: 'right', clickCount: 1 })
    await settle(); await wait(() => Boolean(document.querySelector('[role="menu"][aria-label="마디 작업"]')))
    await capture('lower-staff-menu'); await click('마디 제거')
    assert.deepEqual(await saveProject('deleted'), deleted)
    await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await saveProject('undo'), original)
    await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await saveProject('redo'), deleted)
    await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'))
    await key('z', ['control']); assert.deepEqual(await saveProject('cold-reopen'), deleted)
    await click('형식'); await click('악보 설정'); await choose('악보 보기', view === 'score' ? 0 : 1)
    if (view !== 'score') await choose('파트보 선택', view === 'part-a' ? 0 : 1)
    const afterView = await saveProject('selected-view'), expectedView = view === 'score' ? { mode: 'score' } : { mode: 'part', partId: deleted.score.parts[view === 'part-a' ? 0 : 1].id }
    assert.deepEqual(afterView, { ...deleted, view: expectedView })
    await capture('view')
    await click('파일'); await click('내보내기 설정'); await click('PDF 변환')
    await wait(() => Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    assert.deepEqual(await saveProject('after-output'), afterView); assert.deepEqual(fs.readFileSync(file), originalBytes)
    rows.push({ width, view, target: point, expectedPages: contract.pages[view], nativeExact: true, exactUndoRedo: true, coldReopenNoOldUndo: true, independentLayoutsPreserved: true })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
  }
}
const deadline = setTimeout(() => { console.error('DEADLINE', step); app.exit(124) }, 120000)
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
  win.webContents.on('will-prevent-unload', event => event.preventDefault())
  try {
    if (removalAudit) { await auditRecentRemoval(); clearTimeout(deadline); app.exit(0); return }
    if (pdfAudit) { await auditPdfFailure(); clearTimeout(deadline); app.exit(0); return }
    if (newScoreFocusAudit) { await auditNewScoreFocus(); clearTimeout(deadline); app.exit(0); return }
    if (partHeaderAudit) { await auditPartHeader(); clearTimeout(deadline); app.exit(0); return }
    if (printHeaderAudit) { await auditPrintHeader(); clearTimeout(deadline); app.exit(0); return }
    if (interiorHairpinAudit) { await auditInteriorHairpin(); clearTimeout(deadline); app.exit(0); return }
    if (searchCancelAudit) { await auditSearchCancel(); clearTimeout(deadline); app.exit(0); return }
    if (wizardCancelAudit) { await auditWizardCancel(); clearTimeout(deadline); app.exit(0); return }
    if (openWizardIntentAudit) { await auditOpenWizardIntent(); clearTimeout(deadline); app.exit(0); return }
    if (backupReopenAudit) { await auditBackupReopen(); clearTimeout(deadline); app.exit(0); return }
    if (backupDiagnosticAudit) { await auditBackupDiagnostics(); clearTimeout(deadline); app.exit(0); return }
    if (partStructureAudit) { await auditPartStructure(); clearTimeout(deadline); app.exit(0); return }
    const rows = []
    for (const width of [960, 1400]) for (const kind of (generalFailureAudit ? ['read', 'parse'] : ['first', 'last', 'chord'])) for (const coarse of (densityAudit ? [false, true] : [false])) for (const scale of (densityAudit ? [1, 2] : [1])) {
      step = `${width}-${kind}${densityAudit ? `-${coarse ? 'coarse' : 'fine'}-${scale * 100}` : ''}`; console.log('START', step)
      scene = path.join(out, step); fs.mkdirSync(scene, { recursive: true })
      nativeTheme.themeSource = width === 960 ? 'dark' : 'light'; win.setContentSize(width, 800)
      contents = fs.readFileSync('out/ddirori/continuous-let-ring-source/single/expected.musicxml', 'utf8')
      await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'release-test' } }); app.focus({ steal: true }); win.focus(); await settle()
      if (densityAudit) {
        win.webContents.debugger.attach('1.3')
        await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: coarse })
      }
      await click('파일'); await click('MusicXML 가져오기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 가져왔습니다.'))
      const baseline = await save('baseline')
      await click('악보로 이동'); await key('Up', ['alt','shift'])
      const before = await snapshot(); assert(before.dirty)
      if (generalFailureAudit) {
        rejectNextOpen = kind === 'read'
        if (kind === 'parse') contents = '<not-a-score/>'
      } else contents = fs.readFileSync(path.join(source, kind + '.musicxml'), 'utf8')
      const failedInput = contents
      await click('파일'); await click('MusicXML 가져오기')
      if (generalFailureAudit) await wait(() => document.querySelector('.editor-status').textContent.includes('MusicXML을 가져오지 못했습니다. 현재 악보는 유지됩니다.'))
      else await wait(() => document.querySelector('.editor-status').textContent.includes('한 음표에만 연결된 타이'))
      assert.deepEqual(await snapshot(), before, 'Failed import must preserve ink, selection and dirty state')
      const originalFont = await run(() => parseFloat(getComputedStyle(document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] button')).fontSize))
      if (scale === 2) { await run(scaleStudioChromeText); await settle() }
      assert.deepEqual(await snapshot(), before, 'Chrome-only scaling must preserve notation ink')
      const hidden = await run(() => {
        const group = document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"]'), content = group.querySelector('.studio-warning-technical__content')
        return { rawVisible: content.checkVisibility(), status: document.querySelector('.editor-status').textContent, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert(!hidden.rawVisible && !hidden.overflow); assert(!/Invalid tie|EACCES|score-partwise|\/owned\//.test(hidden.status))
      await capture('rejected')
      await run(() => document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] button').focus())
      await key('Enter')
      if (scale === 2) { await run(scaleStudioChromeText); await settle() }
      assert(await run(() => document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      const target = await run(() => {
        const button = document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] button')
        const b = button.getBoundingClientRect(), footer = button.closest('.studio-status').getBoundingClientRect(), style = getComputedStyle(button)
        return { coarse: matchMedia('(pointer:coarse)').matches, font: parseFloat(style.fontSize), height: b.height, top: b.top, bottom: b.bottom, left: b.left, right: b.right, footerTop: footer.top, footerBottom: footer.bottom, focus: document.activeElement === button, focusVisible: button.matches(':focus-visible'), outline: style.outlineStyle, outlineWidth: style.outlineWidth, shadow: style.boxShadow, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert.equal(target.coarse, coarse); assert.equal(target.overflow, false)
      assert(Math.abs(target.font / originalFont - scale) < .01)
      assert(target.height >= (coarse ? 47.9 : 31.9))
      assert(target.focus && target.focusVisible && (target.shadow !== 'none' || target.outline !== 'none' && parseFloat(target.outlineWidth) > 0))
      assert(target.top >= Math.max(0, target.footerTop) && target.bottom <= Math.min(800, target.footerBottom))
      assert(target.left >= 0 && target.right <= width)
      await capture('technical')
      let rawInk
      if (densityAudit) {
        const readRawInk = () => run(() => {
          const content = document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] .studio-warning-technical__content'), text = content.lastElementChild.lastChild
          const range = document.createRange(); range.setStart(text, text.length - 1); range.setEnd(text, text.length)
          const r = range.getBoundingClientRect(), footer = content.closest('.studio-status'), f = footer.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, footerTop: f.top, footerBottom: f.bottom, scrollTop: footer.scrollTop, owner: Boolean(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.studio-warning-technical__content')) }
        })
        const scrollStarted = Date.now()
        let attempt = 0
        while (true) {
          rawInk = await readRawInk()
          fs.appendFileSync(path.join(scene, 'raw-scroll.jsonl'), JSON.stringify({ attempt, elapsed: Date.now() - scrollStarted, ...rawInk }) + '\n')
          if (rawInk.owner && rawInk.top >= Math.max(0, rawInk.footerTop) && rawInk.bottom <= Math.min(800, rawInk.footerBottom)) break
          if (Date.now() - scrollStarted > 3000) break
          // In this owned Electron input, negative deltas moved the footer down.
          // Await actual ink visibility while Chromium finishes smooth scrolling.
          if (attempt++ === 0) win.webContents.sendInputEvent({ type: 'mouseWheel', x: Math.round(width / 2), y: Math.round((Math.max(0, rawInk.footerTop) + Math.min(800, rawInk.footerBottom)) / 2), deltaY: -1000, canScroll: true })
          await settle()
        }
        assert(rawInk.owner && rawInk.top >= Math.max(0, rawInk.footerTop) && rawInk.bottom <= Math.min(800, rawInk.footerBottom), 'Last diagnostic text ink must be readable inside the scrollport')
        await capture('technical-end')
      }
      await key('Space')
      assert(await run(() => !document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"] .studio-warning-technical__content').checkVisibility()))
      await click('악보로 이동')
      const noteTarget = await run(() => {
        const event = document.activeElement, glyph = event.querySelector('.vf-notehead text')
        if (!glyph) throw Error('Score return must focus a real note')
        const canvas = document.createElement('canvas').getContext('2d'); canvas.font = getComputedStyle(glyph).font
        const metrics = canvas.measureText(glyph.textContent), p = glyph.getStartPositionOfChar(0)
        const q = new DOMPoint(p.x + (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2, p.y + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2).matrixTransform(glyph.getScreenCTM())
        return { id: event.dataset.eventId, x: q.x, y: q.y, footerTop: document.querySelector('.studio-status').getBoundingClientRect().top, owner: document.elementFromPoint(q.x, q.y)?.closest('.notation-event')?.dataset.eventId }
      })
      assert(noteTarget.x >= 0 && noteTarget.x < width && noteTarget.y >= 0 && noteTarget.y < noteTarget.footerTop)
      assert.equal(noteTarget.owner, noteTarget.id)
      await capture('score-return')
      const edited = await save('after-rejection'); assert.notDeepEqual(edited, baseline)
      await click('악보로 이동'); await key('z', ['control']); assert.deepEqual(await save('undo'), baseline)
      await click('악보로 이동'); await key('z', ['control', 'shift']); assert.deepEqual(await save('redo'), edited)
      await click('파일'); await click('프로젝트 열기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 열었습니다.'))
      assert.deepEqual(await save('reopened'), edited)
      assert.equal(contents, failedInput)
      if (generalFailureAudit) {
        contents = fs.readFileSync('out/ddirori/continuous-let-ring-source/single/expected.musicxml', 'utf8')
        await click('파일'); await click('MusicXML 가져오기'); await wait(() => document.querySelector('.editor-status').textContent.includes('을 가져왔습니다.'))
        assert(await run(() => !document.querySelector('[aria-label="MusicXML 가져오기 기술 정보"]')))
        assert.deepEqual(await save('retry'), baseline)
      } else assert.equal(contents, fs.readFileSync(path.join(source, kind + '.musicxml'), 'utf8'))
      rows.push({ width, kind, coarse, scale, target, rawInk, noteTarget, rejectionPreservedDocument: true, hiddenTechnical: hidden, undoRedoNativeExact: true })
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(rows, null, 2))
      if (densityAudit) { await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false }); win.webContents.debugger.detach() }
    }
    clearTimeout(deadline); app.exit(0)
  } catch (error) { console.error(step, error.stack || error); clearTimeout(deadline); app.exit(1) }
})
