// Existing-model audit. Reuse the exact370 real-font alpha sampler through AST,
// not a copied/modified approximation or a product-only test control.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript')
module.exports=async function auditMultivoiceTie(q){
  const {win,source,out,run,settle,wait,click,capture,save,nativeTheme}=q
  const samplerFile='scripts/verify-studio-stored-dynamics.cjs',code=fs.readFileSync(samplerFile,'utf8'),ast=ts.createSourceFile(samplerFile,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
  let sampler
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='tieSnapshot')sampler=node.initializer.body.arguments[0].getText(ast);ts.forEachChild(node,visit)};visit(ast)
  assert(sampler&&sampler.includes('positivePixels')&&sampler.includes('new Path2D'))
  const renderer=Function('return ('+sampler+')')(),sha=s=>crypto.createHash('sha256').update(s).digest('hex')
  fs.writeFileSync(path.join(out,'sampler.json'),JSON.stringify({file:samplerFile,sourceSha256:sha(code),rendererSha256:sha(sampler),modified:false},null,2))
  let expectedSystems=1
  const measure=async print=>{
    const result=await run(renderer,{print,audit:true})
    const ids=await run(print=>{
      const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas')
      return [...root.querySelectorAll('.vf-clef text,.vf-keysignature text,.vf-timesignature text,.notation-event .vf-notehead text')].map(n=>({eventId:n.closest('.notation-event')?.dataset.eventId,voiceId:n.closest('.notation-event')?.dataset.voiceId,text:n.textContent}))
    },print)
    assert.equal(ids.length,result.modifierInk.length)
    result.modifierInk=result.modifierInk.map((g,i)=>{assert.equal(g.text,ids[i].text);return{...g,...ids[i]}})
    if(q.auditStems||q.auditBeams){
      result.stemInk=await run(require('./studio-tie-stem-ink.cjs'),{print,beam:Boolean(q.auditBeams),accidentals:Boolean(q.auditPieces)})
      if(q.auditBeams){
        assert(result.stemInk.filter(s=>s.kind==='stem').length>=2,'Actual beamed stems must be present')
        assert(result.stemInk.some(s=>s.kind==='beam'),'Actual filled beam body must be present')
      }else assert.equal(result.stemInk.length,1,'Fixture must paint one actual other-voice stem')
      for(const stem of result.stemInk){assert(stem.positivePixels>0&&stem.positiveProbe>0);assert.equal(stem.transparentProbe,0)}
    }
    if(q.auditPieces&&expectedSystems>1){
      result.systemGap=await run(print=>{
        const root=document.querySelector(print?'.studio-pdf-snapshot':'.score-canvas'),svg=root.querySelector('svg')
        const box=n=>{const b=n.getBBox(),m=svg.getCTM().inverse().multiply(n.getCTM());const p=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return{top:Math.min(...p.map(p=>p.y)),bottom:Math.max(...p.map(p=>p.y))}}
        const lines=[...root.querySelectorAll('.vf-stave[data-measure-id="bar-2"] path')].filter(n=>{const b=n.getBBox(),s=getComputedStyle(n);return b.width>100&&b.height<=1&&s.stroke!=='none'&&Number(s.strokeOpacity)>0})
        const pieces=[...root.querySelectorAll('.vf-stavetie[data-system-index="0"] path')]
        return{staffLines:lines.length,outgoingPieces:pieces.length,gap:Math.min(...lines.map(n=>box(n).top-parseFloat(getComputedStyle(n).strokeWidth)/2))-Math.max(...pieces.map(n=>box(n).bottom))}
      },print)
      assert(result.systemGap.staffLines>=5&&result.systemGap.outgoingPieces>0,'Actual next staff lines and outgoing ink must be present')
      assert(result.systemGap.gap>=8,'Corrected outgoing lens must retain space before the next system')
    }
    return result
  }
  q.setPrintInspection(()=>measure(true));const rows=[]
  for(const width of[960,1400])for(const name of(q.auditPieces?['cross-low','cross-eight','cross-mixed','cross-far','cross-clear','cross-single','cross-symbols','view-score','view-part']:q.auditBeams?['beam-eight','beam-mixed','beam-far']:q.auditStems?['crossing-c5','near-d5','far-c3']:['near-e','near-f','far-c'])){
    const scene=path.join(out,`${width}-${name}`);fs.mkdirSync(scene,{recursive:true});q.setCase(`${width}-${name}`,scene);console.log('START',width,name)
    nativeTheme.themeSource=width===960?'light':'dark';win.setContentSize(width,800)
    await win.loadFile(path.resolve('out/renderer/index.html'),{query:{fixture:'release-test'}});require('electron').app.focus({steal:true});win.focus();await settle()
    const file=path.join(source,name+'.chromatics'),project=JSON.parse(fs.readFileSync(file)),score=project.score,meta=q.auditPieces?JSON.parse(fs.readFileSync(path.join(source,name+'-meta.json'))):{tiePaths:2};q.setOpenFile(file)
    expectedSystems=meta.systems??1
    await click('파일');await click('프로젝트 열기');await wait(count=>document.querySelectorAll('.score-canvas .vf-stavetie path').length===count,meta.tiePaths)
    const initial=await save('initial');assert.deepEqual(initial.score,score)
    if(q.auditPieces){assert.deepEqual(initial.partLayouts,project.partLayouts);assert.deepEqual(initial.view,project.view)}
    await click('악보로 이동')
    const live=await measure(false);fs.writeFileSync(path.join(scene,'live-ink.json'),JSON.stringify(live,null,2));await capture('live')
    await click('파일');await click('내보내기 설정');await click('MIDI 내보내기');assert.deepEqual(fs.readFileSync(path.join(scene,'converted.mid')),fs.readFileSync(path.join(source,name+'.mid')))
    await click('MusicXML 내보내기');assert.deepEqual(fs.readFileSync(path.join(scene,'fresh.musicxml')),fs.readFileSync(path.join(source,name+'.musicxml')))
    await click('PDF 변환');await wait(()=>Boolean(document.querySelector('[aria-label="PDF 출력 결과"]')))
    const printed=JSON.parse(fs.readFileSync(path.join(scene,'print-ink.json')));assert(live.withinSvg&&printed.withinSvg)
    assert.equal(live.ties.length,meta.tiePaths);assert.equal(printed.ties.length,meta.tiePaths)
    if(q.auditPieces)for(const data of[live,printed]){
      assert.deepEqual([...new Set(data.ties.map(t=>t.system))].sort(),Array.from({length:meta.systems},(_,i)=>i))
      if(meta.defaultGeometryControl)assert(data.ties.every(t=>!t.corrected),'Already-clear pieces must retain the default VexFlow geometry')
      if(meta.changedStartSymbols)assert(data.stemInk.some(s=>s.kind==='accidental'),'Changed-key fixture must paint an actual accidental')
    }
    const foreign=live.modifierInk.filter(g=>g.eventId==='other-note'),printForeign=printed.modifierInk.filter(g=>g.eventId==='other-note');assert.equal(foreign.length,1);assert.equal(printForeign.length,1);assert(foreign[0].positivePixels>0&&printForeign[0].positivePixels>0)
    const overlap=foreign[0].overlaps.reduce((n,t)=>n+t.pixels,0),printOverlap=printForeign[0].overlaps.reduce((n,t)=>n+t.pixels,0)
    assert.deepEqual((await save('after-output')).score,score)
    q.setOpenFile(path.join(scene,'current.chromatics'));await click('파일');await click('프로젝트 열기');await settle();assert.deepEqual((await save('reopened')).score,score)
    if(q.auditPieces&&['cross-eight','cross-single'].includes(name)){
      const untied=structuredClone(score);for(const m of untied.parts[0].staves[0].measures)for(const n of m.voices[0].events)if(n.type==='note')delete n.ties
      await click('악보로 이동');await q.key('T');await wait(()=>document.querySelectorAll('.score-canvas .vf-stavetie path').length===0);assert.deepEqual((await save('untied')).score,untied)
      await click('악보로 이동');await q.key('Z',['control']);assert.deepEqual((await save('undo')).score,score)
      await click('악보로 이동');await q.key('Z',['control']);assert.deepEqual((await save('undo-noop')).score,score)
      await click('악보로 이동');await q.key('Z',['control','shift']);assert.deepEqual((await save('redo')).score,untied)
      await click('악보로 이동');await q.key('Z',['control','shift']);assert.deepEqual((await save('redo-noop')).score,untied)
      await click('악보로 이동');await q.key('Z',['control']);assert.deepEqual((await save('history-restored')).score,score)
    }
    const row={width,name,foreignGlyph:foreign[0],printedForeignGlyph:printForeign[0],overlapPixels:overlap,printOverlapPixels:printOverlap,nativeAndOutputsExact:true};rows.push(row);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('INK',name,overlap,printOverlap)
    if(q.auditStems||q.auditBeams){
      if(q.auditBeams){const meta=JSON.parse(fs.readFileSync(path.join(source,name+'-meta.json')));for(const data of[live,printed]){assert.equal(data.stemInk.filter(s=>s.kind==='stem').length,meta.stemCount);assert(data.stemInk.filter(s=>s.kind==='beam').length>=meta.beamBodiesMinimum)}}
      row.stemOverlapPixels=live.stemInk.flatMap(s=>s.overlaps).reduce((n,t)=>n+t.pixels,0)
      row.printStemOverlapPixels=printed.stemInk.flatMap(s=>s.overlaps).reduce((n,t)=>n+t.pixels,0)
      fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log('STEM',name,row.stemOverlapPixels,row.printStemOverlapPixels)
      if(q.auditBeams){row.beamShapeOverlap=live.stemInk.map(s=>({kind:s.kind,pixels:s.overlaps.reduce((n,t)=>n+t.pixels,0)}));row.printBeamShapeOverlap=printed.stemInk.map(s=>({kind:s.kind,pixels:s.overlaps.reduce((n,t)=>n+t.pixels,0)}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2))}
      if(q.requireClearance)assert.equal(row.stemOverlapPixels+row.printStemOverlapPixels,0,'Actual other-voice stem must clear the filled tie')
    }
    if(q.requireClearance)assert.equal(overlap+printOverlap,0,'Actual second-voice glyph must not meet a filled whole-chord tie')
    if(q.requireClearance)for(const g of [...live.modifierInk,...printed.modifierInk])assert.equal(g.overlaps.length,0,'Corrected tie must not collide with any measured note/rest or header')
  }
  console.log('PASS',rows.length,'observed actual-font/native/XML/MIDI/PDF workflows;overlap results are separate from clearance approval')
}
