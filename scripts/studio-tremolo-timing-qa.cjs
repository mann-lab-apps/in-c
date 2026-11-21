// Observe real muted AudioBufferSource starts; never substitute score commands.
module.exports=async function tremoloTimingQa(ctx){
 const {win,nativeTheme,run,wait,settle,button,click,menu,point,fs,path,root,out,assert,sha,results,setOpen,setSave,setStage,waitNativeProjectCompletion}=ctx
 const width=Number(process.env.STUDIO_TREMOLO_TIMING_WIDTH??960);assert([960,1400].includes(width))
 const kind=process.env.STUDIO_TREMOLO_TIMING_CASE??(width===960?'eighth1':'dotted-eighth');assert(['eighth1','dotted-eighth','boundary'].includes(kind))
 const fixtures=path.join(root,'out/studio-parity-20261104/smg-025-flagged-tremolo-timing/fixtures-h',kind)
 const sourceFile=path.join(fixtures,'source.chromatics'),source=JSON.parse(fs.readFileSync(sourceFile,'utf8')),expected=JSON.parse(fs.readFileSync(path.join(fixtures,'expectations.json'),'utf8')),originalHash=sha(sourceFile),working=path.join(out,'working.chromatics')
 fs.copyFileSync(sourceFile,working,fs.constants.COPYFILE_EXCL);win.setSize(width,1000);nativeTheme.themeSource=width===960?'light':'dark'
 setStage('tremolo-source');setOpen(working);await button('프로젝트 열기');await wait(()=>run(()=>document.querySelector('.studio-status__result')?.textContent.includes('working.chromatics')),'owned source opened')
 assert.equal(await run(()=>document.querySelector('.notation-event.is-selected')?.dataset.eventId),expected.firstEventId??'leading')
 assert.equal(await run(()=>document.querySelectorAll('.notation-tremolo-mark line').length),1,'One actual source stroke remains visible')
 const state=()=>run(()=>({dirty:document.querySelector('.studio-document__state').textContent,history:document.querySelector('.editor-status').textContent.match(/\d+회 수정/)?.[0]}))
 const before=await state();assert.equal(before.history,'0회 수정')
 assert.equal(source.score.parts.length,1,'Isolated generated one-part fixture; earlier mixer failure remains separate')
 await menu('파일','내보내기 설정');setSave(path.join(out,'before.mid'));await button('MIDI 내보내기');await wait(()=>fs.existsSync(path.join(out,'before.mid')),'actual pre-play MIDI');assert.equal(sha(path.join(out,'before.mid')),sha(path.join(fixtures,'expected.mid')))
 await run(()=>{
  window.__tremoloStarts=[]
  const create=AudioContext.prototype.createBufferSource
  AudioContext.prototype.createBufferSource=function(...args){const node=create.apply(this,args),start=node.start.bind(node),context=this
   node.start=function(...args){window.__tremoloStarts.push({at:args[0],offset:args[1]??0,currentTime:context.currentTime,rate:node.playbackRate.value,frames:node.buffer?.length,sampleRate:node.buffer?.sampleRate});return start(...args)}
   return node
  }
 })
 setStage('tremolo-schedule');await click('.studio-playback button[aria-label="재생"]')
 await wait(()=>run(beat=>window.__tremoloStarts.length>0&&parseFloat(document.querySelector('[aria-label="재생 위치"]').textContent)>=beat,expected.waitBeat??1),'actual target interval completes')
 await click('.studio-playback button[aria-label="일시정지"]');await settle()
 const observed=await run(()=>({starts:window.__tremoloStarts,position:document.querySelector('[aria-label="재생 위치"]').textContent}))
 const attacks=[...new Set(observed.starts.map(n=>Math.round(n.at*1e6)/1e6))].sort((a,b)=>a-b)
 const capture={width,kind,expected,observed,attacks,sourceHash:originalHash,scope:'Own muted real AudioContext/sample start observations for generated single-part score; no physical audio/listening or mixer-focus approval.'}
 fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(capture,null,2)+'\n');await point('.notation-event[data-event-id="leading"]',undefined,'nearest');fs.writeFileSync(path.join(out,'scheduled.png'),(await win.webContents.capturePage()).toPNG())
 assert.equal(attacks.length,expected.count,'Actual sampled attacks follow source flags plus tremolo strokes')
 for(let i=1;i<attacks.length;i++)assert(Math.abs((attacks[i]-attacks[0])-i*expected.interval*.5)<.001,'Actual scheduled subdivision at120BPM')
 assert(observed.starts.every(n=>n.frames>0&&n.sampleRate>0&&n.offset===0))
 await click('.studio-playback button[aria-label="정지"]');assert.deepEqual(await state(),before)
 setStage('tremolo-native');setSave(working);await menu('파일','프로젝트 저장');await waitNativeProjectCompletion(working);const saved=JSON.parse(fs.readFileSync(working,'utf8'));assert.deepEqual(saved.score,source.score);assert.deepEqual(saved.partLayouts,source.partLayouts)
 const reopen=path.join(out,'unique.chromatics');fs.copyFileSync(working,reopen,fs.constants.COPYFILE_EXCL);setOpen(reopen);await menu('파일','프로젝트 열기');await wait(()=>run(()=>document.querySelector('.studio-status__result')?.textContent.includes('unique.chromatics')),'unique native reopened')
 await menu('파일','내보내기 설정')
 for(const[name,label]of[['structured.musicxml','MusicXML 내보내기'],['expanded.musicxml','반복 펼치기 MusicXML 내보내기'],['after.mid','MIDI 내보내기'],['observed.pdf','PDF 변환']]){setSave(path.join(out,name));await button(label);await wait(()=>run(n=>document.querySelector('.studio-status__result')?.textContent.includes(n),name),'actual '+name);assert(fs.existsSync(path.join(out,name)))}
 assert.equal(sha(path.join(out,'after.mid')),sha(path.join(fixtures,'expected.mid')));assert.equal(sha(sourceFile),originalHash)
 results.actions.push({stage:'tremolo-timing',width,kind,attacks,expected,nativeExact:true,midiExact:true,uniqueReopen:true,sourceHash:originalHash,scope:capture.scope})
}
