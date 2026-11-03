// Native Tab/Space/Enter on real welcome controls; own renderer/disk/QA IPC only.
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const out = path.resolve(process.env.DDIRORI_WELCOME_KEY_OUT || 'out/ddirori/studio-welcome-keyboard')
const source = path.resolve(process.env.DDIRORI_WELCOME_KEY_SOURCE || 'out/ddirori/studio-r3-part-pages/manual-reopened.chromatics'), xml = path.resolve('src/musicxml/fixtures/single-part-treble.musicxml')
const systemWelcome=process.argv.includes('--system-welcome'), welcomeScenes=[]
const deadline=setTimeout(()=>{console.error('Welcome verifier exceeded 180s');app.exit(1)},180000)
const original = JSON.parse(fs.readFileSync(source)); fs.mkdirSync(out, { recursive: true })
app.disableHardwareAcceleration(); app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-welcome-keyboard-')))
let win, scene, step = 'start', projectSaves = 0, xmlSaves = 0
const result = f => ({ filePath: f, fileName: path.basename(f) }), xmlResult = () => ({ ...result(xml), contents: fs.readFileSync(xml, 'utf8') })
ipcMain.handle('project:open', () => ({ ...result(source), contents: fs.readFileSync(source, 'utf8') }))
ipcMain.handle('project:save', (_e, v) => { projectSaves++; const f = path.join(scene, 'current.chromatics'); fs.writeFileSync(f, v.contents); return result(f) })
ipcMain.handle('musicxml:save', () => { xmlSaves++; throw Error('Unexpected hidden welcome save') })
ipcMain.handle('musicxml:open', xmlResult); ipcMain.handle('recent-musicxml:open', xmlResult)
ipcMain.handle('project:list-backups', () => [])
ipcMain.handle('recent-musicxml:list', () => [{ ...result(xml), ...(systemWelcome ? {fileName:'아주 긴 한글 제목과 합주 편집 검증을 위한 최근 악보 파일 이름 MusicXML Sketch.musicxml'} : {}), openedAt: '2026-10-26T00:00:00Z' }]); ipcMain.handle('recent-musicxml:add', () => [])
for (const c of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(c, () => null)
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async fn => { const t = Date.now(); while (!await run(fn)) { assert.ok(Date.now() - t < 10000, step); await settle() } }
const key = async (keyCode, modifiers = []) => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); if (keyCode === 'Enter') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await settle() }
const state = () => run(() => ({ welcome: Boolean(document.querySelector('.start-screen')), wizard: Boolean(document.querySelector('dialog[open]')), backup: Boolean(document.querySelector('.studio-backups dialog[open]')), document: document.querySelector('.studio-document')?.textContent, history: document.querySelector('.editor-status')?.textContent.match(/\d+회 수정/)?.[0], inputActive: document.querySelector('.studio-input-context')?.dataset.inputActive, trace: [...globalThis.__welcomeKeyTrace], overflow: document.documentElement.scrollWidth > innerWidth }))
const target = id => run(id => {
 const n = document.activeElement
 if (id === 'recent') return Boolean(n?.matches('.recent-files__list .dd-item-title'))
 return Boolean(n?.closest('.start-actions') && (n.getAttribute('aria-label') || n.querySelector('span')?.textContent || n.textContent.trim()) === id)
}, id)
const tabTo = async id => { let tabs = 0; while (!await target(id)) { assert.ok(tabs++ < 40, `Cannot reach visible welcome target ${id}`); await key('Tab') } return tabs }
app.whenReady().then(async () => {
 win = new BrowserWindow({ width: 960, height: 800, show: true, webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } }); win.webContents.on('will-prevent-unload', e => e.preventDefault())
 const records = [], cases = process.argv.includes('--probe-only') ? ['새 악보 만들기'] : ['새 악보 만들기', 'MusicXML 가져오기', '프로젝트 열기', '프로젝트 백업', 'recent', 'Enter new score']
 try {
  for (const width of (process.argv.includes('--probe-only') ? [960] : [960, 1400])) for (const action of cases) {
   step = `${width}:${action}`; scene = path.join(out, `${width}-${action.replaceAll(' ', '-')}`); fs.mkdirSync(scene, { recursive: true }); projectSaves = 0; xmlSaves = 0
   win.setContentSize(width, 800); await win.loadFile(path.resolve('out/renderer/index.html')); app.focus({ steal: true }); win.focus(); await settle(); await wait(() => Boolean(document.querySelector('.recent-files__list .dd-item-title')))
   if(systemWelcome && action==='새 악보 만들기') await inspectWelcome(width)
   await run(() => { globalThis.__welcomeKeyTrace = []; window.addEventListener('keydown', e => globalThis.__welcomeKeyTrace.push({ key: e.key, code: e.code, prevented: e.defaultPrevented, target: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent.slice(0, 70) })) })
   const tabs = await tabTo(action === 'Enter new score' ? '새 악보 만들기' : action)
   await run(() => { globalThis.__welcomeReturnTarget = document.activeElement })
   fs.writeFileSync(path.join(scene, 'focused.png'), (await win.webContents.capturePage()).toPNG())
   await key(action === 'Enter new score' ? 'Enter' : 'Space'); const after = await state(); fs.writeFileSync(path.join(scene, 'activation.json'), JSON.stringify(after, null, 2)); fs.writeFileSync(path.join(scene, 'activated.png'), (await win.webContents.capturePage()).toPNG())
   assert.equal(after.overflow, false); assert.equal(projectSaves, 0); assert.equal(xmlSaves, 0)
   if (action === '새 악보 만들기' || action === 'Enter new score') {
    assert.equal(after.wizard, true, 'Native Space/Enter on visible welcome new-score button must open the actual wizard')
    if (action === '새 악보 만들기') {
     // Existing wizard guards are a negative control; no product fix claimed there.
     await run(() => { const n = [...document.querySelectorAll('.studio-new-score-template-grid button')].find(n => n.getAttribute('aria-pressed') !== 'true'); globalThis.__welcomeTemplateTarget = n; if (!n?.checkVisibility()) throw Error('Missing actual template button'); n.focus() }); await key('N'); await key('S', ['control']); assert.equal(projectSaves, 0); assert.equal(xmlSaves, 0); assert.notEqual((await state()).inputActive, 'true')
     await key('Space'); assert.equal((await state()).wizard, true); assert.equal(await run(() => globalThis.__welcomeTemplateTarget.getAttribute('aria-pressed')), 'true', 'Native Space still selects an actual wizard template')
    }
    await key('Escape'); assert.equal(await run(() => Boolean(document.querySelector('dialog[open]'))), false); assert.equal(await run(() => document.activeElement === globalThis.__welcomeReturnTarget), true, 'Dialog must return focus to its original welcome control')
   } else if (action === '프로젝트 백업') {
    assert.equal(after.backup, true, 'Native Space must open actual backups'); await key('Escape'); assert.equal(await run(() => document.activeElement === globalThis.__welcomeReturnTarget), true)
   } else {
    assert.equal(after.history, '0회 수정'); assert.equal(after.welcome, false); assert.match(after.document, action === '프로젝트 열기' ? /Expanded Part Export/ : /MusicXML Sketch/)
    if (action === '프로젝트 열기') {
     // Editor commands still work after a document actually opens.
     await key('N'); assert.equal((await state()).inputActive, 'true'); await key('Escape'); await key('S', ['control']); await wait(() => document.querySelector('.studio-document').textContent.includes('변경 없음')); assert.equal(projectSaves, 1); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(scene, 'current.chromatics'))).score, original.score)
    }
   }
   records.push({ width, action, tabs, after, projectSaves, xmlSaves, scope: 'Native Tab/Space/Enter and actual renderer/preload/disk;QA IPC,not OS dialogs/physical keyboard/IME/audio-listening.' }); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(records, null, 2))
  }
  console.log('PASS960/1400 native welcome button activation, wizard/backups focus, editor-only command scope and native source preservation')
 } catch (error) { fs.writeFileSync(path.join(scene || out, 'failure.json'), JSON.stringify({ step, error: String(error), records, state: await state() }, null, 2)); throw error }
 finally { clearTimeout(deadline);win.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })

async function inspectWelcome(width) {
 const initialTheme=nativeTheme.themeSource
 win.webContents.debugger.attach('1.3')
 try {
  for(const theme of ['light','dark']) for(const scale of [1,2]) for(const coarse of [false,true]) {
   nativeTheme.themeSource=theme
   await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:coarse})
   await settle()
   const fonts=await run(scale=>{
    const root=document.querySelector('.studio-start'),nodes=[root,...root.querySelectorAll('*')]
    const sizes=nodes.map(n=>[n.style.fontSize,parseFloat(getComputedStyle(n).fontSize)])
    if(scale===2)nodes.forEach((n,i)=>{n.style.fontSize=sizes[i][1]*2+'px'})
    return sizes.map(row=>row[0])
   },scale)
   await settle()
   const metrics=await run(()=>{
    const root=document.querySelector('.studio-start'),buttons=[...root.querySelectorAll('.start-actions button')]
    return {legacy:!!root.closest('.studio-chrome'),theme:root.dataset.theme,coarse:matchMedia('(pointer:coarse)').matches,
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      recent:!!root.querySelector('.recent-files__list .dd-item--flat .dd-item-title'),
      buttons:buttons.map(b=>({common:b.classList.contains('dd-button'),height:b.getBoundingClientRect().height,radius:getComputedStyle(b).borderRadius,
       icon:[b.querySelector('svg')?.getAttribute('width'),b.querySelector('svg')?.getAttribute('stroke-width')]})),
      titleFont:parseFloat(getComputedStyle(root.querySelector('h1')).fontSize),
      titleColor:getComputedStyle(root.querySelector('h1')).color,foreground:getComputedStyle(root).color,
      recentWhitespace:getComputedStyle(root.querySelector('.dd-item-title')).whiteSpace}
   })
   assert.equal(metrics.legacy,false);assert.equal(metrics.theme,theme);assert.equal(metrics.coarse,coarse);assert.equal(metrics.overflow,false);assert.equal(metrics.recent,true)
   assert.equal(metrics.titleFont,24*scale);assert.equal(metrics.titleColor,metrics.foreground);assert.notEqual(metrics.recentWhitespace,'nowrap')
   for(const button of metrics.buttons){assert.ok(button.common);assert.ok(button.height>=(coarse?48:32));assert.notEqual(button.radius,'6px');assert.deepEqual(button.icon,['18','1.75'])}
   const file=`welcome-${width}-${theme}-${scale}-${coarse?'coarse':'fine'}.png`
   fs.writeFileSync(path.join(out,file),(await win.webContents.capturePage()).toPNG())
   welcomeScenes.push({width,scale,file,...metrics})
   await run(fonts=>{const root=document.querySelector('.studio-start'),nodes=[root,...root.querySelectorAll('*')];nodes.forEach((n,i)=>{n.style.fontSize=fonts[i]||''})},fonts)
  }
  fs.writeFileSync(path.join(out,'system-scenes.json'),JSON.stringify(welcomeScenes,null,2))
 } finally {
  await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach();nativeTheme.themeSource=initialTheme;await settle()
 }
}
