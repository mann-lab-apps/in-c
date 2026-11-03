// Owned deterministic resume gates + actual local sample/WebAudio playback.
const {app,BrowserWindow,ipcMain}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const out=path.resolve(process.env.DDIRORI_PIANO_LIFECYCLE_OUT||'out/ddirori/piano-lifecycle')
assert(!fs.existsSync(out),'Keep old evidence');fs.mkdirSync(out,{recursive:true})
app.on('window-all-closed',()=>{});app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-piano-lifecycle-')))
for(const n of ['recent-musicxml:list','recent-musicxml:add','project:list-backups'])ipcMain.handle(n,()=>[])
for(const n of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(n,()=>null)
let win,phase='start';const rows=[]
const run=(fn,a)=>win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(a)??''})`)
const wait=async(fn,label)=>{const end=Date.now()+15000;while(!await fn()){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,50))}}
const click=label=>run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')===label&&n.checkVisibility());if(!n||n.disabled)throw Error('Unavailable '+label);n.click()},label)
const key=async(keyCode,modifiers=[])=>{win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await new Promise(r=>setTimeout(r,70))}
const sample=()=>run(()=>({position:document.querySelector('[aria-label="재생 위치"]').textContent,loading:document.querySelector('[aria-label="피아노 음색"]').textContent,playing:!document.querySelector('[aria-label="일시정지"]').disabled,errors:[...document.querySelectorAll('[role="alert"]')].filter(n=>n.checkVisibility()).map(n=>n.textContent),nodes:window.__nodes.map(n=>({started:n.started,stopped:n.stopped})),selection:document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id')}))
app.whenReady().then(async()=>{const deadline=setTimeout(()=>{console.error('deadline',phase);app.exit(1)},90000)
try{
 for(const width of [960,1400])for(const height of [750,800]){
  phase=width+' setup';win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.resolve('out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}})
  win.setContentSize(width,height)
  await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'single-voice-mvp'}})
  await run(()=>{
   window.__nodes=[];window.__gates=[];window.__mode='hold';const resume=AudioContext.prototype.resume
   AudioContext.prototype.resume=function(){const ctx=this;if(window.__mode==='hold')return new Promise((resolve,reject)=>window.__gates.push({resolve:()=>resume.call(ctx).then(resolve,reject),reject}));if(window.__mode==='fail')return Promise.reject(Error('Owned audio retry fault'));return resume.call(ctx)}
   const create=AudioContext.prototype.createBufferSource
   AudioContext.prototype.createBufferSource=function(){const n=create.call(this),start=n.start.bind(n),stop=n.stop.bind(n);const e={started:false,stopped:false};window.__nodes.push(e);n.start=(...a)=>{e.started=true;return start(...a)};n.stop=(...a)=>{e.stopped=true;return stop(...a)};return n}
  })
  await click('악보로 이동');await key('Right');await key('Right')
  assert(await run(()=>!document.querySelector('[aria-label="처음으로"]').disabled),'Later selection permits rewind')
  phase=width+' held load rewind';await click('재생');await wait(()=>run(()=>window.__gates.length===1),'resume held')
  const loading=await sample();assert(loading.loading.includes('준비 중'))
  await click('처음으로');const rewound=await sample();assert(!rewound.loading.includes('준비 중'),'Rewind must cancel loading UI');assert(!rewound.playing)
  await run(()=>{window.__mode='normal';window.__gates.shift().resolve()});await new Promise(r=>setTimeout(r,250));assert.equal((await sample()).nodes.length,0,'Late resume cannot start old transport')
  phase=width+' real retry';await click('재생');await wait(()=>run(()=>!document.querySelector('[aria-label="일시정지"]').disabled),'real playback after retry')
  await wait(()=>run(()=>window.__nodes.some(n=>n.started)),'actual decoded source')
  const playing=await sample();assert(!playing.errors.length)
  await click('일시정지');const paused=await sample();assert(paused.nodes.every(n=>n.stopped));assert(!paused.playing)
  await click('재생');await wait(()=>run(()=>!document.querySelector('[aria-label="일시정지"]').disabled),'resume')
  phase=width+' failed mixer restart';await click('믹서 표시');await run(()=>{window.__mode='fail';const n=document.querySelector('[aria-label="멜로디 음소거"]')||document.querySelector('#studio-part-mixer input[type="checkbox"]');if(!n)throw Error('Mixer checkbox missing');n.click()})
  await wait(()=>run(()=>document.querySelector('[aria-label="피아노 음색"] [role="alert"]')?.textContent.includes('Owned audio retry fault')),'fault surfaced')
  const failed=await sample();assert(!failed.playing,'Failed restart must stop cursor/status');assert(failed.nodes.every(n=>n.stopped))
  const failedPosition=failed.position;await new Promise(r=>setTimeout(r,150));assert.equal((await sample()).position,failedPosition,'No runaway ticker after failure')
  await run(()=>{window.__mode='normal';const n=document.querySelector('#studio-part-mixer input[type="checkbox"]');n.click()})
  await click('재생');await wait(()=>run(()=>!document.querySelector('[aria-label="일시정지"]').disabled),'failed restart retry');assert(!(await sample()).errors.length)
  phase=width+' pedal stop';await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='서스테인 페달');if(!n)throw Error('Pedal missing');n.querySelector('input').click()})
  await click('정지');const stopped=await sample();assert(stopped.nodes.every(n=>n.stopped));assert(!stopped.playing);assert(stopped.position.startsWith('0.0'))
  await run(()=>{const n=[...document.querySelectorAll('label')].find(n=>n.textContent==='서스테인 페달');n.querySelector('input').click()})
  phase=width+' preview';const count=stopped.nodes.length;await click('피아노 음색 들어보기');await wait(()=>run(n=>window.__nodes.length>n,count),'actual preview');await click('정지');assert((await sample()).nodes.every(n=>n.stopped))
  await run(()=>{const n=document.querySelector('[aria-label="재생"]');n.focus();n.scrollIntoView({block:'center',behavior:'instant'})});await new Promise(r=>setTimeout(r,80))
  const geometry=await run(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};return{viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,transport:rect(document.querySelector('[aria-label="재생 컨트롤"]')),piano:rect(document.querySelector('[aria-label="피아노 음색"]')),score:rect(document.querySelector('.notation-preview svg'))}})
  fs.writeFileSync(path.join(out,width+'-'+height+'-geometry.json'),JSON.stringify(geometry,null,2));assert(!geometry.overflow);assert(geometry.transport.y>=0&&geometry.transport.y+geometry.transport.height<=geometry.viewport.height);assert(geometry.piano.y>=0&&geometry.piano.y+geometry.piano.height<=geometry.viewport.height)
  fs.writeFileSync(path.join(out,width+'-'+height+'.png'),(await win.webContents.capturePage()).toPNG());rows.push({width,height,loading,rewound,playing,paused,failed,stopped,geometry,scope:'Owned resume fault gates, actual local samples and AudioBufferSource scheduling; no physical listening claim'})
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS width',width);win.destroy();win=undefined
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('PASS piano lifecycle',rows.length)
}catch(e){if(win&&!win.isDestroyed()){fs.writeFileSync(path.join(out,'failure.txt'),phase+'\n'+String(e)+'\n'+await run(()=>document.body.innerText));fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG())}throw e}
finally{clearTimeout(deadline);win?.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)})
