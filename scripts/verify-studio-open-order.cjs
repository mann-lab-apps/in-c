// Public welcome/backup controls and disk-backed native snapshots; owned delayed IPC.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const source=path.resolve(process.env.DDIRORI_OPEN_ORDER_INPUT),out=path.resolve(process.env.DDIRORI_OPEN_ORDER_OUT),root=path.resolve(process.env.DDIRORI_OPEN_ORDER_APP_ROOT||'.')
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-open-order-')))
const template=JSON.parse(fs.readFileSync(path.join(source,'incoming.chromatics'))),xml=fs.readFileSync(path.join(source,'incoming.musicxml'),'utf8')
let win,scene,records=[],pending=new Map(),recentAdds=[]
const deferred=index=>new Promise((resolve,reject)=>pending.set(index,{resolve,reject}))
ipcMain.handle('recent-musicxml:list',()=>records.filter(r=>r.kind.startsWith('recent')).map(r=>r.entry))
ipcMain.handle('recent-musicxml:open',(_,v)=>deferred(records.findIndex(r=>r.entry.filePath===v.filePath)))
ipcMain.handle('recent-musicxml:add',(_,v)=>{recentAdds.push(v);return[]})
ipcMain.handle('project:open',()=>deferred(records.findIndex(r=>r.kind==='native-picker')))
ipcMain.handle('musicxml:open',()=>deferred(records.findIndex(r=>r.kind==='xml-picker')))
ipcMain.handle('project:list-backups',()=>[{id:'latest',fileName:'newer.chromatics',title:'Latest backup',updatedAt:''}])
ipcMain.handle('project:read-backup',()=>deferred(1))
for(const n of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(n,()=>null)
ipcMain.handle('project:save',(_,v)=>{const p=path.join(scene,'current.chromatics');fs.writeFileSync(p,v.contents);return{filePath:p,fileName:path.basename(p)}})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return{value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return{error:String(e.stack||e)}}})()`);if(r.error)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const wait=async(fn,arg)=>{const end=Date.now()+12000;while(!await run(fn,arg)){assert(Date.now()<end,'Finite open-order deadline');await settle()}}
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n||n.disabled)throw Error('Unavailable public button '+label);n.scrollIntoView({block:'nearest'});n.focus();n.click()},label);await settle()}
const start=async index=>{const r=records[index]
 if(r.kind.startsWith('recent'))await run(name=>{const n=[...document.querySelectorAll('.recent-files button')].find(n=>n.checkVisibility()&&n.textContent.includes(name));if(!n||n.disabled)throw Error('Visible recent entry required');n.focus();n.click()},r.entry.fileName)
 else if(r.kind==='backup'){await click('프로젝트 백업');await wait(()=>Boolean(document.querySelector('[data-backup-id="latest"] button')));await click('Latest backup 복구')}
 else await click(r.kind==='native-picker'?'프로젝트 열기':'MusicXML 가져오기')
 await settle();assert(pending.has(index),'Authorized read '+index+' must actually reach IPC')
}
const read=()=>run(()=>({title:document.querySelector('.studio-document h1')?.textContent??null,start:Boolean(document.querySelector('.studio-start')),status:(document.querySelector('.editor-status')?.textContent??document.querySelector('.studio-start')?.textContent??'')+[...document.querySelectorAll('[role="alert"]')].map(n=>n.textContent).join(' '),backup:Boolean(document.querySelector('dialog[open]')),dirty:document.querySelector('.studio-document')?.textContent.includes('저장하지 않은 변경')??false}))
const finish=async(index,failure=false,cancel=false)=>{
 const p=pending.get(index);assert(p);if(failure)p.reject(Error(index?'Newest read failure':'Older read failure'))
 else p.resolve(cancel?null:records[index].kind==='backup'?{contents:records[index].file.contents}:records[index].file)
 await settle()
}
const pairs=[['recent-xml','recent-xml'],['native-picker','xml-picker'],['recent-native','recent-native'],['native-picker','backup'],['xml-picker','backup']]
app.whenReady().then(async()=>{const timer=setTimeout(()=>app.exit(124),180000),rows=[]
 try{for(const width of[960,1400])for(const[older,newer]of pairs)for(const order of['older-first','newer-first','newer-failure',...(newer.endsWith('picker')||newer==='backup'?['newer-cancel']:[])]){
  console.log('START',width,older,newer,order);scene=path.join(out,`${width}-${older}-${newer}-${order}`);fs.mkdirSync(scene,{recursive:true});pending=new Map();recentAdds=[]
  records=[older,newer].map((kind,index)=>{const native=kind.includes('native')||kind==='backup',name=index?'newer':'older',project=structuredClone(template);project.score.title=name+' document'
   const contents=native?JSON.stringify(project):xml.replace(/<work-title>[\s\S]*?<\/work-title>/,`<work-title>${name} document</work-title>`)
   const entry={filePath:path.join(scene,name+(native?'.chromatics':'.musicxml')),fileName:name+(native?'.chromatics':'.musicxml'),openedAt:'2026-10-31T00:00:00Z',...(native?{format:'native'}:{})}
   fs.writeFileSync(entry.filePath,contents);return{kind,entry,file:{...entry,contents},project}
  })
  nativeTheme.themeSource=width===960?'dark':'light';win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(root,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
  win.setContentSize(width,800);await win.loadFile(path.join(root,'out/renderer/index.html'));await settle();await start(0);await start(1)
  let intermediate
  if(order==='older-first'){
   await finish(0);intermediate=await read();fs.writeFileSync(path.join(scene,'intermediate.json'),JSON.stringify(intermediate,null,2));assert(intermediate.start,'Older success cannot replace before newer completion')
   await finish(1)
  }else{
   if(order==='newer-cancel'&&newer==='backup'){await click('닫기');await finish(1)}
   else await finish(1,order==='newer-failure',order==='newer-cancel')
   intermediate=await read();await finish(0)
  }
  const after=await read();fs.writeFileSync(path.join(scene,'transition.json'),JSON.stringify({intermediate,after},null,2))
  if(order==='newer-failure'||order==='newer-cancel'){
   assert(after.start);assert.equal(after.title,null);assert.equal(recentAdds.length,0)
   if(order==='newer-failure')assert(after.status.includes(newer==='backup'?'백업을 확인하지 못했습니다.':'열지 못했습니다.')||after.status.includes('가져오지 못했습니다.'))
  }else{
   assert(after.title.includes('newer document'));assert.equal(after.dirty,newer==='backup')
   assert.equal(recentAdds.length,newer==='backup'?0:1)
   await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'))
   const saved=JSON.parse(fs.readFileSync(path.join(scene,'current.chromatics')))
   assert.equal(saved.score.title,'newer document')
   if(newer.includes('native')||newer==='backup'){
    assert.deepEqual(saved.score,records[1].project.score)
    assert.deepEqual(saved.partLayouts,records[1].project.partLayouts)
    assert.deepEqual(saved.view,records[1].project.view)
   }
  }
  fs.writeFileSync(path.join(scene,'screen.png'),(await win.webContents.capturePage()).toPNG());rows.push({width,older,newer,order,intermediate,after});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
 }console.log('PASS newest authorized read',rows.length)}finally{clearTimeout(timer);win?.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
