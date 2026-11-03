// Real renderer controls and disk-backed output. Owned delayed IPC, not OS dialogs.
const {app, BrowserWindow, ipcMain, nativeTheme} = require('electron')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict')
const input = path.resolve(process.env.DDIRORI_XML_LAYOUT_INPUT)
const out = path.resolve(process.env.DDIRORI_XML_LAYOUT_OUT)
const root = path.resolve(process.env.DDIRORI_XML_LAYOUT_APP_ROOT || '.')
assert(fs.existsSync(input)); assert(!fs.existsSync(out)); fs.mkdirSync(out, {recursive:true})
app.disableHardwareAcceleration(); app.on('window-all-closed', () => {})
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-xml-layout-')))
let win, scene, xmlPath, release, captures = [], nativeName = 'current.chromatics'
const result = p => ({filePath:p, fileName:path.basename(p)})
for (const n of ['recent-musicxml:list', 'recent-musicxml:add', 'project:list-backups']) ipcMain.handle(n, () => [])
for (const n of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(n, () => null)
ipcMain.handle('musicxml:open', () => ({...result(xmlPath), contents:fs.readFileSync(xmlPath,'utf8')}))
ipcMain.handle('musicxml:save', (_, v) => new Promise((resolve, reject) => {
  captures.push(v.contents)
  release = outcome => {
    if (outcome === 'failure') return reject(Error('Owned XML layout disk failure'))
    if (outcome === 'cancel') return resolve(null)
    fs.writeFileSync(xmlPath, v.contents); resolve(result(xmlPath))
  }
}))
ipcMain.handle('project:save', (_, v) => {const p=path.join(scene,nativeName);fs.writeFileSync(p,v.contents);return result(p)})
ipcMain.handle('pdf:save', async () => {const p=path.join(scene,'latest.pdf');fs.writeFileSync(p,await win.webContents.printToPDF({preferCSSPageSize:true}));return result(p)})
const run = async (fn,arg) => {
  const r = await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{error:String(e.stack||e)}}})()`)
  if(r.error)throw Error(r.error);return r.value
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))))
const wait = async (fn,arg) => {const end=Date.now()+12000;while(!await run(fn,arg)){assert(Date.now()<end,'Finite XML layout deadline');await settle()}}
const click = async label => {await run(label => {
  const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')||n.textContent.trim())===label)
  if(!n||n.disabled)throw Error('Unavailable public button '+label);n.scrollIntoView({block:'nearest'});n.focus();n.click()
},label);await settle()}
const choose = async ([label,value]) => {
  await run(label => {const n=[...document.querySelectorAll('[role="combobox"]')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')===label||[...(n.labels??[])].some(l=>l.textContent.trim()===label)));if(!n||n.disabled)throw Error('Unavailable select '+label);n.scrollIntoView({block:'nearest'});n.focus();n.click()},label)
  await settle()
  await run(value => {const n=[...document.querySelectorAll('[role="option"]')].find(n=>n.checkVisibility()&&n.dataset.value===value);if(!n)throw Error('Unavailable option '+value);n.click()},value)
  await settle()
}
const key = async (keyCode,modifiers=[]) => {
  app.focus({steal:true});win.focus();win.webContents.focus();await wait(()=>document.hasFocus())
  win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers})
  if(keyCode==='Enter')win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers})
  win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await settle()
}
const read = () => run(() => ({
  stored:localStorage.getItem('chromatics.part-page-setup.v1'),
  dirty:document.querySelector('.studio-document').textContent.includes('저장하지 않은 변경'),
  status:document.querySelector('.editor-status').textContent,
  selection:[...document.querySelectorAll('.notation-event.is-selected')].map(n=>n.dataset.eventId),
  overflow:document.documentElement.scrollWidth>innerWidth+1
}))
const saveNative = async name => {
  nativeName=name+'.chromatics';await click('파일');await click('프로젝트 저장')
  await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'))
  return JSON.parse(fs.readFileSync(path.join(scene,nativeName)))
}
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>app.exit(124),180000),rows=[]
  try {for(const width of [960,1400])for(const outcome of ['success','cancel','failure','unchanged']) {
    console.log('START',width,outcome);scene=path.join(out,`${width}-${outcome}`);fs.mkdirSync(scene,{recursive:true})
    xmlPath=path.join(scene,'current.musicxml');fs.copyFileSync(input,xmlPath);captures=[];release=undefined
    nativeTheme.themeSource=width===960?'dark':'light'
    win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
    win.setContentSize(width,800);await win.loadFile(path.join(root,'out/renderer/index.html'));await settle()
    await click('MusicXML 가져오기');await wait(()=>Boolean(document.querySelector('.studio-document')))
    await click('형식');await click('악보 설정');await choose(['악보 보기','part']);await choose(['파트보 선택','P2'])
    await click('파일');await click('내보내기 설정');await choose(['PDF 설정 프리셋','compact-parts'])
    await click('파일');await click('MusicXML로 저장');assert(release,'XML write must be pending')
    if(outcome!=='unchanged'){await click('파일');await click('내보내기 설정');await choose(['PDF 용지','letter'])}
    const before=await read();release(outcome==='unchanged'?'success':outcome)
    await wait(()=>![...document.querySelectorAll('button')].some(n=>n.getAttribute('aria-label')==='MusicXML로 저장'&&n.disabled))
    await settle();const after=await read();fs.writeFileSync(path.join(scene,'transition.json'),JSON.stringify({before,after},null,2))
    assert.equal(after.stored,before.stored,'Late XML completion must preserve latest local part metadata')
    assert(after.dirty,'Native-only independent settings remain dirty after XML save');assert(!after.overflow)
    assert.deepEqual(after.selection,before.selection)
    if(outcome==='success')assert(after.status.includes('저장 중 추가한 변경사항은 아직 저장되지 않았습니다.'))
    if(outcome==='failure')assert(after.status.includes('MusicXML 저장을 마무리하지 못했습니다.'))
    const saved=await saveNative('latest'),part=saved.partLayouts.find(p=>p.partId==='P2')
    assert.equal(part.layout.pageSetup.pageSize,outcome==='unchanged'?'a4':'letter')
    await click('파일');await click('내보내기 설정');await click('PDF 변환')
    await wait(()=>document.querySelector('[aria-label="PDF 출력 결과"]')?.textContent.includes('latest.pdf'))
    assert(fs.statSync(path.join(scene,'latest.pdf')).size>1000)
    if(outcome!=='unchanged'){
      await click('악보로 이동');await key('Z',['control']);const undo=await saveNative('undo')
      assert.equal(undo.partLayouts.find(p=>p.partId==='P2').layout.pageSetup.pageSize,'a4');assert.deepEqual(undo.score,saved.score)
      assert.deepEqual(undo.partLayouts.filter(p=>p.partId!=='P2'),saved.partLayouts.filter(p=>p.partId!=='P2'))
      await click('악보로 이동');await key('Z',['control','shift']);const redo=await saveNative('redo');assert.deepEqual(redo,saved)
    }
    await click('파일');await click('MusicXML 가져오기')
    await wait(()=>document.querySelector('.editor-status').textContent.includes('current.musicxml을 가져왔습니다.'))
    const reopened=await saveNative('xml-reopened')
    assert.equal(reopened.partLayouts.find(p=>p.partId==='P2').layout.pageSetup.pageSize,outcome==='unchanged'?'a4':'letter')
    fs.writeFileSync(path.join(scene,'screen.png'),(await win.webContents.capturePage()).toPNG())
    fs.writeFileSync(path.join(scene,'serialized.musicxml'),captures[0]);rows.push({width,outcome,before,after,scope:'Actual renderer/disk XML/native/undo; owned IPC, not OS file dialogs'})
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
  }console.log('PASS XML part-layout save',rows.length)} finally {clearTimeout(timer);win?.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
