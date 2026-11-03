// Real renderer and local sample nodes; owned IPC files. No listening/OS-dialog claim.
const {app,BrowserWindow,ipcMain,nativeTheme}=require('electron')
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict')
const source=path.resolve(process.env.DDIRORI_REPEAT_HAIRPIN_QA_DIR),out=path.resolve(process.env.DDIRORI_REPEAT_HAIRPIN_OUT)
const appRoot=path.resolve(process.env.DDIRORI_REPEAT_HAIRPIN_APP_ROOT||'.')
const timed=process.argv.includes('--audit-tempo-fermata')
const kinds=(timed?['internal','exit']:['internal','missing-first-stop','missing-last-stop','cross-ending']).filter(k=>!process.env.DDIRORI_REPEAT_HAIRPIN_CASES||process.env.DDIRORI_REPEAT_HAIRPIN_CASES.split(',').includes(k))
assert(kinds.length>0)
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});app.disableHardwareAcceleration();app.on('window-all-closed',()=>{})
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'studio-repeat-hairpin-')))
let win,scene,fixture,saved
const result=p=>({filePath:p,fileName:path.basename(p)})
for(const name of ['recent-musicxml:list','recent-musicxml:add','project:list-backups'])ipcMain.handle(name,()=>[])
for(const name of ['autosave:read','autosave:write','autosave:clear'])ipcMain.handle(name,()=>null)
ipcMain.handle('project:open',()=>{const p=saved||path.join(fixture,'source.chromatics');return {...result(p),contents:fs.readFileSync(p,'utf8')}})
ipcMain.handle('project:save',(_,v)=>{saved=path.join(scene,'current.chromatics');fs.writeFileSync(saved,v.contents);return result(saved)})
ipcMain.handle('midi:save',(_,v)=>{const p=path.join(scene,'actual.mid');fs.writeFileSync(p,Buffer.from(v.contents));return result(p)})
ipcMain.handle('musicxml:export',(_,v)=>{const p=path.join(scene,'actual.musicxml');fs.writeFileSync(p,v.contents);return result(p)})
const run=async(fn,arg)=>{const r=await win.webContents.executeJavaScript(`(async()=>{try{return {value:await (${fn})(${JSON.stringify(arg)??''})}}catch(e){return {error:String(e.stack||e)}}})()`);if(r.error)throw Error(r.error);return r.value}
const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))))
const click=async label=>{await run(label=>{const n=[...document.querySelectorAll('button')].find(n=>n.checkVisibility()&&(n.getAttribute('aria-label')||n.textContent.trim())===label);if(!n||n.disabled)throw Error('Unavailable public control: '+label);n.click()},label);await settle()}
const wait=async(fn,label,ms=15000)=>{const until=Date.now()+ms;while(!await run(fn)){assert(Date.now()<until,label);await new Promise(r=>setTimeout(r,40))}}
const grouped=()=>{
 const rows=window.__rh.filter(r=>r.at!==undefined).sort((a,b)=>a.at-b.at),groups=[]
 for(const row of rows){let g=groups.find(g=>Math.abs(g.at-row.at)<.0001);if(!g){g={at:row.at,amplitude:0,layers:0,offsets:[]};groups.push(g)}g.amplitude+=row.amplitude;g.layers++;g.offsets.push(row.offset)}return groups
}
app.whenReady().then(async()=>{const deadline=setTimeout(()=>app.exit(124),180000),rows=[]
try{for(const width of [960,1400])for(const kind of kinds){
 console.log('START',width,kind);fixture=path.join(source,timed?kind:kind+'-note');scene=path.join(out,width+'-'+kind);fs.mkdirSync(scene,{recursive:true});saved=undefined
 const original=JSON.parse(fs.readFileSync(path.join(fixture,'source.chromatics'))),oracle=timed?JSON.parse(fs.readFileSync(path.join(fixture,'oracle.json'))):undefined
 const expected=timed?oracle.beats.map((beat,i)=>({startBeat:beat,velocityStart:oracle.velocities[i]})):JSON.parse(fs.readFileSync(path.join(fixture,'timeline.json'))).events
 const expectedSeconds=timed?oracle.seconds:expected.map(e=>e.startBeat*.5)
 nativeTheme.themeSource=width===960?'dark':'light'
 win=new BrowserWindow({width,height:800,show:true,webPreferences:{preload:path.join(appRoot,'out/preload/index.js'),contextIsolation:true,sandbox:false,backgroundThrottling:false}});win.setContentSize(width,800)
 await win.loadFile(path.join(appRoot,'out/renderer/index.html'));await settle();await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('을 열었습니다.'),'native open')
 await run(()=>{
  window.__rh=[]
  const createGain=AudioContext.prototype.createGain
  AudioContext.prototype.createGain=function(){const g=createGain.call(this),ramp=g.gain.linearRampToValueAtTime.bind(g.gain);g.__rhRamps=[];g.gain.linearRampToValueAtTime=function(value,time){g.__rhRamps.push({value,time});return ramp(value,time)};return g}
  const create=AudioContext.prototype.createBufferSource
  AudioContext.prototype.createBufferSource=function(){const n=create.call(this),start=n.start.bind(n),connect=n.connect.bind(n),entry={amplitude:0};window.__rh.push(entry)
   n.connect=function(g,...args){entry.ramps=g.__rhRamps;return connect(g,...args)}
   n.start=function(at,offset,...args){entry.at=at;entry.offset=offset;entry.amplitude=entry.ramps.find(r=>Math.abs(r.time-at-.002)<.001)?.value??0;return start(at,offset,...args)};return n}
 })
 await click('재생')
 await wait(()=>document.querySelector('[aria-label="피아노 음색"]').textContent.includes('그랜드 피아노'),'real samples ready')
 await wait(()=>window.__rh.filter(n=>n.at!==undefined).length>=1,'sample reservation')
 // Bounded lookahead eventually reserves every performed note; allow actual audio-clock progress.
 const until=Date.now()+18000;let groups
 do{await new Promise(r=>setTimeout(r,100));groups=await run(grouped);assert(Date.now()<until,'Complete repeated reservation deadline')}while(groups.length<expected.length)
 assert.equal(groups.length,expected.length)
 fs.writeFileSync(path.join(scene,'sample-groups.json'),JSON.stringify({groups,expected},null,2))
 groups.forEach((g,i)=>{assert(g.layers>0);assert(Math.abs(g.at-groups[0].at-expectedSeconds[i])<.015,'Performed source order/time');assert(Math.abs(g.amplitude-(.35+.65*expected[i].velocityStart/.24))<.00001,'Actual layered sampler amplitude must match authored ramp');assert(g.offsets.every(v=>v===0),'Fresh attack offset')})
 await click('정지');await click('파일');await click('프로젝트 저장');await wait(()=>document.querySelector('.studio-document').textContent.includes('변경 없음'),'save clean')
 assert.deepEqual(JSON.parse(fs.readFileSync(saved)).score,original.score)
 await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.mid'),'MIDI output')
 assert.deepEqual(fs.readFileSync(path.join(scene,'actual.mid')),fs.readFileSync(path.join(fixture,'expected.mid')))
 await click('MusicXML 내보내기');await wait(()=>document.querySelector('.editor-status').textContent.includes('actual.musicxml'),'XML output')
 assert.equal(fs.readFileSync(path.join(scene,'actual.musicxml'),'utf8'),fs.readFileSync(path.join(fixture,'source.musicxml'),'utf8'))
 await click('파일');await click('프로젝트 열기');await wait(()=>document.querySelector('.editor-status').textContent.includes('current.chromatics을 열었습니다.'),'native reopen')
 fs.writeFileSync(path.join(scene,'screen.png'),(await win.webContents.capturePage()).toPNG())
 rows.push({width,kind,timed,groups,expected,expectedSeconds,sourceUnchanged:true,nativeExact:true,midiExact:true,xmlExact:true,scope:'Actual local AudioBufferSource/GainNode reservations, not listening or external consumer approval'});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));win.destroy();win=undefined
}console.log('PASS repeat hairpin native/sample/export',rows.length)}finally{clearTimeout(deadline);win?.destroy();app.quit()}}).catch(e=>{console.error(e);app.exit(1)})
