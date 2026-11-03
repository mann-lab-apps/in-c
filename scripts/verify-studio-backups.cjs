// Own production renderer, temporary profile, generated project and QA IPC. No OS dialog.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_BACKUPS_OUT || 'out/ddirori/studio-system-backups')
const sourcePath = path.resolve('out/ddirori/studio-r3-part-pages/manual-reopened.chromatics')
const sourceText = fs.readFileSync(sourcePath, 'utf8'), source = JSON.parse(sourceText)
const fileName = '아주 긴 한글 이름과 합주 독립 배치가 포함된 프로젝트 백업 파일.chromatics'
const entries = [{ id: 'good', fileName, title: '합주 독립 배치 백업', updatedAt: '2026-10-26T00:00:00Z' }, { id: 'bad', fileName: 'unreadable.chromatics', error: 'Invalid JSON', updatedAt: '' }]
fs.mkdirSync(out, { recursive: true })
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-backups-')))
app.disableHardwareAcceleration()
let win, scene, listMode = 'pending', readMode = 'pending', releaseList, releaseRead, readRequests = 0, saveRequests = []
const deadline = setTimeout(() => { console.error('Backup QA exceeded 180s'); app.exit(1) }, 180000)
ipcMain.handle('project:list-backups', async () => {
  if (listMode === 'pending') return new Promise(resolve => { releaseList = resolve })
  if (listMode === 'error') throw Error('QA backup list unavailable')
  return listMode === 'empty' ? [] : entries
})
ipcMain.handle('project:read-backup', async () => {
  readRequests++
  if (readMode === 'pending') return new Promise(resolve => { releaseRead = resolve })
  if (readMode === 'error') throw Error('QA restore unavailable')
  return { contents: sourceText }
})
ipcMain.handle('project:save', (_event, input) => {
  saveRequests.push(input)
  const filePath = path.join(scene, 'restored.chromatics'); fs.writeFileSync(filePath, input.contents)
  return { filePath, fileName: path.basename(filePath) }
})
ipcMain.handle('project:open', () => null)
for (const name of ['recent-musicxml:list', 'recent-musicxml:add']) ipcMain.handle(name, () => [])
for (const name of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(name, () => null)
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
const wait = async (fn, arg) => { const start = Date.now(); while (!await run(fn, arg)) { assert.ok(Date.now() - start < 10000, String(fn)); await settle() } }
const click = async label => {
  await run(label => { const n = [...document.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent.trim()) === label && n.checkVisibility()); if (!n || n.disabled) throw Error('Unavailable: ' + label); n.focus(); n.click() }, label)
  await settle()
}
const key = async (keyCode, modifiers = []) => {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
  if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers })
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle()
}
const capture = async name => { console.log(path.basename(scene) + ':' + name); fs.writeFileSync(path.join(scene, name + '.png'), (await win.webContents.capturePage()).toPNG()) }
const close = async () => { await key('Escape'); await wait(() => !document.querySelector('dialog')); assert.equal(await run(() => document.activeElement?.getAttribute('aria-label')), '프로젝트 백업') }
app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), sandbox: false, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } })
  const records = []
  try {
    for (const [width, theme, scale, coarse] of [[960, 'light', 1, false], [1400, 'dark', 1, false], [960, 'dark', 2, true], [1400, 'light', 2, true]]) {
      scene = path.join(out, `${width}-${theme}-${scale}-${coarse ? 'coarse' : 'fine'}`); fs.mkdirSync(scene, { recursive: true })
      listMode = 'pending'; readMode = 'pending'; readRequests = 0; saveRequests = []
      nativeTheme.themeSource = theme; win.setContentSize(width, 800)
      await win.loadFile(path.resolve('out/renderer/index.html')); win.focus(); win.webContents.focus(); await settle()
      win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: coarse })
      await click('프로젝트 백업'); await wait(() => document.querySelector('.studio-backups')?.textContent.includes('불러오는 중'))
      await close(); releaseList(entries); await settle(); assert.equal(await run(() => Boolean(document.querySelector('dialog'))), false)
      listMode = 'empty'; await click('프로젝트 백업'); await wait(() => document.querySelector('.studio-backups')?.textContent.includes('백업 없음')); await capture('empty'); await close()
      listMode = 'error'; await click('프로젝트 백업'); await wait(() => Boolean(document.querySelector('.studio-backups .dd-banner--error')))
      await click('기술 정보'); assert.equal(await run(() => document.querySelector('.studio-backups')?.textContent.includes('QA backup list unavailable')), true); await capture('list-error'); await close()
      listMode = 'entries'; await click('프로젝트 백업'); await wait(() => document.querySelectorAll('.studio-backups .dd-item--flat').length === 2)
      await run(scale => { const nodes = [...document.querySelectorAll('.studio-backups,.studio-backups *')], sizes = nodes.map(n => parseFloat(getComputedStyle(n).fontSize)); if (scale === 2) nodes.forEach((n, i) => { n.style.fontSize = sizes[i] * 2 + 'px' }) }, scale)
      const geometry = await run(() => {
        const d = document.querySelector('.studio-backups dialog'), r = d.getBoundingClientRect()
        return { public: d.classList.contains('dd-dialog'), legacy: !!d.closest('.studio-chrome'), overflow: d.scrollWidth > d.clientWidth + 1,
          theme: getComputedStyle(d.querySelector('h2')).color === getComputedStyle(d).color,
          headingFont: parseFloat(getComputedStyle(d.querySelector('h2')).fontSize), titleFont: parseFloat(getComputedStyle(d.querySelector('.dd-item-content strong')).fontSize),
          contained: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          controls: [...d.querySelectorAll('button')].map(n => ({ height: n.getBoundingClientRect().height, public: n.classList.contains('dd-button') })),
          glyphs: [...d.querySelectorAll('button svg')].map(n => ({ size: n.getAttribute('width'), stroke: n.getAttribute('stroke-width') })) }
      })
      assert.equal(geometry.public, true); assert.equal(geometry.legacy, false); assert.equal(geometry.overflow, false); assert.equal(geometry.contained, true); assert.equal(geometry.theme, true); assert.equal(geometry.headingFont, 20 * scale); assert.equal(geometry.titleFont, 16 * scale)
      assert.ok(geometry.controls.every(n => n.public && n.height >= (coarse ? 48 : 32))); assert.ok(geometry.glyphs.every(n => n.size === '18' && n.stroke === '1.75'))
      assert.equal(await run(() => document.querySelector('[aria-label="unreadable.chromatics 복구"]').disabled), true)
      await capture('entries')
      await run(() => document.querySelector('[aria-label="합주 독립 배치 백업 복구"]').focus()); await key('Enter')
      await wait(() => document.querySelector('.studio-backups')?.textContent.includes('닫으면 복구를 취소'))
      await key('Enter'); assert.equal(readRequests, 1); await capture('restore-pending'); await close()
      releaseRead({ contents: sourceText }); await settle(); assert.equal(await run(() => Boolean(document.querySelector('.start-screen'))), true)
      assert.equal(await run(() => Boolean(document.querySelector('dialog'))), false)
      readMode = 'error'; await click('프로젝트 백업'); await click('합주 독립 배치 백업 복구')
      await wait(() => Boolean(document.querySelector('.studio-backups .dd-banner--error'))); await capture('restore-error')
      readMode = 'success'; await click('합주 독립 배치 백업 복구'); await wait(() => !document.querySelector('dialog'))
      assert.equal(readRequests, 3); assert.equal(await run(() => document.querySelector('.studio-document')?.textContent.includes('저장하지 않은 변경')), true)
      await click('파일'); await click('파일 작업 열기'); await click('프로젝트 저장')
      await wait(() => document.querySelector('.studio-document')?.textContent.includes('변경 없음'))
      assert.equal(saveRequests.length, 1); assert.equal(saveRequests[0].filePath, undefined)
      const saved = JSON.parse(saveRequests[0].contents)
      assert.deepEqual(saved.score, source.score); assert.deepEqual(saved.view, source.view); assert.deepEqual(saved.partLayouts, source.partLayouts)
      await capture('restored'); win.webContents.debugger.detach()
      records.push({ width, theme, scale, coarse, geometry, lateListIgnored: true, lateRestoreIgnored: true, restoreFailureRetry: true, freshSavePath: true, exactPortableState: true })
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ records, sourcePath, scope: 'Production renderer/preload and disk with QA IPC. No OS dialog, physical IME/touch, or external app.' }, null, 2))
    console.log('PASS backup loading/empty/error/pending-cancel/retry/exact portable state:4 conditions')
  } catch (error) { if (scene) await capture('failure'); throw error }
  finally { clearTimeout(deadline); win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
