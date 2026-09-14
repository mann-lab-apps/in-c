const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const deadline = setTimeout(() => { console.error('Part span QA timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1100, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const evaluate = code => window.webContents.executeJavaScript(code)
  const wait = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error(label + ': ' + await evaluate('document.querySelector(".editor-status")?.textContent'))
  }
  const click = async label => {
    const point = await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.getClientRects().length && (item.getAttribute('aria-label') === ${JSON.stringify(label)} || item.textContent.trim() === ${JSON.stringify(label)}))
      if (!button || button.disabled) throw new Error('Missing enabled button: ' + ${JSON.stringify(label)})
      button.scrollIntoView({block:'nearest', inline:'nearest'})
      const box = button.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || !button.contains(document.elementFromPoint(x, y))) throw new Error('Button not clickable')
      return {x: Math.round(x), y: Math.round(y)}
    })()`)
    window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
    window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  const select = (label, value) => evaluate(`(() => {
    const select = document.querySelector('select[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']')
    select.value = ${JSON.stringify(value)}; select.dispatchEvent(new Event('change', {bubbles:true}))
  })()`)
  const offset = async value => {
    await evaluate(`document.querySelector('.span-properties__geometry').open = true`)
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label="표기 세로 이동"]')
      input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))})
      input.dispatchEvent(new Event('input', { bubbles:true }))
    })()`)
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label="표기 세로 이동"]')
      input.dispatchEvent(new FocusEvent('focusout', {bubbles:true})); input.blur()
    })()`)
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  const geometry = kind => evaluate(`(() => {
    const element = document.querySelector('.notation-' + ${JSON.stringify(kind)})
    const box = element.getBBox()
    return {x:box.x,y:box.y,width:box.width,height:box.height}
  })()`)
  const save = async () => {
    await click('파일')
    await evaluate('window.__saved = undefined')
    await click('프로젝트 저장')
    await wait('window.__saved', 'Native save missing')
    return await evaluate('window.__saved')
  }
  try {
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture:'single-voice-mvp' } })
    await wait('document.querySelector(".notation-event")', 'Renderer missing')
    const xml = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/expanded-v1-part-export.musicxml'), 'utf8')
    await evaluate(`void (window.inC = {
      musicXml:{open:async()=>({filePath:'/qa/ensemble.musicxml',fileName:'ensemble.musicxml',contents:${JSON.stringify(xml)}})},
      project:{save:async request=>{window.__saved=request.contents;return {filePath:'/qa/part.chromatics',fileName:'part.chromatics'}}},
      autosave:{clear:async()=>{},write:async()=>{},read:async()=>null},
      recentMusicXml:{add:async()=>[],list:async()=>[]}
    })`)
    await click('파일'); await click('MusicXML 가져오기')
    await wait('document.querySelector(".notation-slur") && document.querySelector(".notation-hairpin")', 'Imported spans missing')
    const references = await evaluate(`(() => {
      const options = [...document.querySelector('select[aria-label="표기 객체 선택"]')?.options ?? []]
      return options.map(item => item.value).filter(Boolean)
    })()`)
    // The inspector is mounted only in Notation Objects.
    await click('표기 객체')
    const refs = references.length ? references : await evaluate(`[...document.querySelector('select[aria-label="표기 객체 선택"]').options].map(item=>item.value).filter(Boolean)`)
    for (const ref of refs) { await select('표기 객체 선택', ref); await offset(-1) }
    const full = JSON.parse(await save())
    await click('악보'); await select('악보 보기', 'part'); await select('파트보 선택', 'P2')
    await click('표기 객체')
    const checkAnnotationClearance = async () => {
      const annotationClefOverlap = await evaluate(`(() => {
      const context=document.createElement('canvas').getContext('2d')
      const ink=item=>{
        const text=item.matches('text') ? item : item.querySelector('text')
        if (!text) return item.getBoundingClientRect()
        const style=getComputedStyle(text)
        context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
        const metrics=context.measureText(text.textContent), matrix=text.getScreenCTM()
        let x=text.x.baseVal[0]?.value ?? 0, y=text.y.baseVal[0]?.value ?? 0
        x+=text.dx.baseVal[0]?.value ?? 0; y+=text.dy.baseVal[0]?.value ?? 0
        if(style.textAnchor==='middle') x-=metrics.width/2
        if(style.textAnchor==='end') x-=metrics.width
        const a=new DOMPoint(x-metrics.actualBoundingBoxLeft,y-metrics.actualBoundingBoxAscent).matrixTransform(matrix)
        const b=new DOMPoint(x+metrics.actualBoundingBoxRight,y+metrics.actualBoundingBoxDescent).matrixTransform(matrix)
        return {left:a.x,top:a.y,right:b.x,bottom:b.y}
      }
      const clefs=[...document.querySelectorAll('.vf-clef')].map(ink)
      return [...document.querySelectorAll('.notation-staff-text,.notation-staff-label')].filter(item=>{
        const a=ink(item)
        return clefs.some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)
      }).map(item=>item.textContent)
    })()`)
      if (annotationClefOverlap.length) throw new Error('Staff annotations overlap clefs: '+annotationClefOverlap.join(','))
    }
    await checkAnnotationClearance()
    const changes = []
    for (const ref of refs) {
      const kind = ref.split(':')[0]
      await select('표기 객체 선택', ref)
      const inherited = await geometry(kind)
      await offset(2)
      const independent = await geometry(kind)
      if (Math.abs(independent.y - inherited.y - 30) > 0.1) throw new Error('Part offset not rendered: ' + JSON.stringify({ref,inherited,independent,input:await evaluate('document.querySelector(\'input[aria-label="표기 세로 이동"]\').value'),status:await evaluate('document.querySelector(".editor-status")?.textContent')}))
      await click('표기 자동 배치 복원')
      await click('총보 배치 따르기')
      if (JSON.stringify(await geometry(kind)) !== JSON.stringify(inherited)) throw new Error('Inheritance did not restore score placement')
      await offset(2)
      changes.push({ref,inherited,independent})
    }
    const output = path.join(app.getPath('temp'), 'chromatics-part-span.chromatics')
    fs.writeFileSync(output, await save())
    const contents = fs.readFileSync(output, 'utf8'), native = JSON.parse(contents)
    if (JSON.stringify(native.score) !== JSON.stringify(full.score) || native.partLayouts[0].spanEngravings.length !== refs.length) throw new Error('Part geometry altered full score or was not saved')
    await evaluate(`void (window.inC.project.open = async()=>({filePath:${JSON.stringify(output)},fileName:'chromatics-part-span.chromatics',contents:${JSON.stringify(contents)}}))`)
    await click('프로젝트 열기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("chromatics-part-span.chromatics")', 'Native reopen missing')
    await click('표기 객체'); await select('표기 객체 선택', refs[0])
    await evaluate(`document.querySelector('.span-properties__geometry').open = true`)
    if (await evaluate('document.querySelector(\'input[aria-label="표기 세로 이동"]\').value') !== '2') throw new Error('Reopen lost independent geometry')
    const screenshots = []
    for (const width of [960,1400]) {
      window.setSize(width,1100)
      await new Promise(resolve=>setTimeout(resolve,300))
      await click('총보 배치 따르기'); await offset(2)
      await checkAnnotationClearance()
      const outside = await evaluate(`['slur','hairpin'].filter(kind=>{
        const item=document.querySelector('.notation-'+kind), box=item.getBBox(), svg=item.ownerSVGElement.viewBox.baseVal
        return box.x < svg.x-1 || box.y < svg.y-1 || box.x+box.width > svg.x+svg.width+1 || box.y+box.height > svg.y+svg.height+1
      })`)
      if (outside.length) throw new Error('Span outside SVG: '+outside.join(','))
      const file=path.join(app.getPath('temp'),'chromatics-part-span-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG()); screenshots.push(file)
    }
    await evaluate(`void (window.inC.pdf={save:request=>new Promise(resolve=>{window.__pdf=request;window.__resolvePdf=resolve})})`)
    await click('내보내기'); await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-slur")', 'PDF renderer missing')
    await checkAnnotationClearance()
    const printPartIds = await evaluate(`[...new Set([...document.querySelectorAll('.notation-event')].map(item=>item.dataset.partId))]`)
    if (printPartIds.length !== 1 || printPartIds[0] !== 'P2') throw new Error('PDF includes another part')
    const pdf=path.join(app.getPath('temp'),'chromatics-part-span.pdf')
    fs.writeFileSync(pdf, await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({filePath:${JSON.stringify(pdf)},fileName:'chromatics-part-span.pdf'})`)
    await save()
    const soloXml = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/release-qa.musicxml'), 'utf8')
    await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/segments.musicxml',fileName:'segments.musicxml',contents:${JSON.stringify(soloXml)}}))`)
    await click('MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("segments.musicxml을 가져왔습니다.") && document.querySelector(".notation-event")', 'Solo fixture missing')
    const segmentProject = JSON.parse(await save())
    const part = segmentProject.score.parts[0], staff = part.staves[0]
    if(staff.measures.length!==4) throw new Error('Unexpected release QA measure count')
    const notes = staff.measures.flatMap(measure=>measure.voices.flatMap(voice=>voice.events.filter(event=>event.type==='note')))
    segmentProject.score.slurs = [{id:'segment-slur',startEventId:notes[0].id,endEventId:notes.at(-1).id,engraving:{offsetY:-1}}]
    segmentProject.score.hairpins = [{id:'segment-hairpin',type:'crescendo',startEventId:notes[0].id,endEventId:notes.at(-1).id,engraving:{offsetY:-1}}]
    segmentProject.score.layout = {systemBreakBeforeMeasureIds:[staff.measures[1].id,staff.measures[2].id,staff.measures[3].id],pageBreakBeforeMeasureIds:[staff.measures[2].id]}
    segmentProject.partLayouts = []
    segmentProject.view = {mode:'score'}
    const openProject = async project => {
      await evaluate(`void (window.inC.project.open=async()=>({filePath:'/qa/segments.chromatics',fileName:'segments.chromatics',contents:${JSON.stringify(JSON.stringify(project))}}))`)
      await click('파일'); await click('프로젝트 열기')
      await wait('document.querySelector(".editor-status")?.textContent.includes("segments.chromatics")', 'Segment project reopen failed')
      await click('표기 객체')
    }
    await openProject(segmentProject)
    const boxes = kind => evaluate(`Array.from(document.querySelectorAll('.notation-'+${JSON.stringify(kind)})).map(item=>{
      const b=item.getBBox();return {key:item.getAttribute('data-span-segment'),x:b.x,y:b.y,localY:b.y-Number(item.getAttribute('data-span-staff-y')),width:b.width,height:b.height}
    })`)
    const segmentChanges = []
    for (const kind of ['slur','hairpin']) {
      const before = await boxes(kind)
      if(before.length < 3 || before.some(item=>!item.key)) throw new Error('Multiple addressed segments missing: '+kind)
      await evaluate(`(() => {const target=document.querySelector('.notation-span-target[data-span-kind="${kind}"]');target.scrollIntoView({block:'center'});target.focus()})()`)
      window.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'})
      window.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'})
      await wait(`document.querySelector('select[aria-label="표기 조정 대상"]')?.value === ${JSON.stringify(before[0].key)}`, 'Keyboard segment selection missing')
      await offset(2)
      const after = await boxes(kind)
      const local = items=>items.map(({y,...geometry})=>geometry)
      if(Math.abs(after[0].localY-before[0].localY-30)>0.1 || JSON.stringify(local(after.slice(1)))!==JSON.stringify(local(before.slice(1)))) throw new Error('Editing one segment changed another relative to its staff: '+kind)
      await click('표기 자동 배치 복원')
      await click('객체 전체 배치 따르기')
      if(JSON.stringify(await boxes(kind))!==JSON.stringify(before)) throw new Error('Segment inheritance reset failed')
      await offset(2)
      segmentChanges.push({kind,before,after})
    }
    const segmentOutput = path.join(app.getPath('temp'),'chromatics-span-segments.chromatics')
    const finalSegments = {slur:await boxes('slur'),hairpin:await boxes('hairpin')}
    fs.writeFileSync(segmentOutput,await save())
    const savedSegments = JSON.parse(fs.readFileSync(segmentOutput,'utf8'))
    for(const kind of ['slurs','hairpins']) {
      if(savedSegments.score[kind][0].engraving.offsetY!==-1 || savedSegments.score[kind][0].engraving.segments.length!==1) throw new Error('Segment save overwrote whole geometry')
    }
    await openProject(savedSegments)
    const checkContinuationClearance = async () => {
      const collisions = await evaluate(`(() => {
        const context=document.createElement('canvas').getContext('2d')
        const marks=[...document.querySelectorAll('.notation-fermata,.notation-breath-mark')].map(text=>{
          const style=getComputedStyle(text);context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
          const m=context.measureText(text.textContent),x=text.x.baseVal[0].value,y=text.y.baseVal[0].value
          return {x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,text:text.textContent}
        })
        return [...document.querySelectorAll('.notation-slur,.notation-hairpin')].flatMap(span=>{
          const a=span.getBBox();return marks.filter(b=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1).map(b=>({span:span.getAttribute('data-span-segment'),mark:b.text}))
        })
      })()`)
      if(collisions.length) throw new Error('Continuation overlaps expression marks: '+JSON.stringify(collisions))
    }
    await checkContinuationClearance()
    for(const change of segmentChanges) if(JSON.stringify(await boxes(change.kind))!==JSON.stringify(finalSegments[change.kind])) throw new Error('Segment disk reopen differs')
    for(const width of [960,1400]) {
      window.setSize(width,1100); await new Promise(resolve=>setTimeout(resolve,250))
      for(const kind of ['slur','hairpin']) {
        const current=await boxes(kind)
        if(current.filter(item=>item.key===segmentChanges.find(change=>change.kind===kind).before[0].key).length!==1) throw new Error('Width changed segment ownership')
      }
      await select('표기 객체 선택','slur:segment-slur')
      await select('표기 조정 대상',segmentChanges[0].before[0].key)
      await evaluate(`document.querySelector('.span-properties__geometry').open=true`)
      await wait(`document.querySelector('[aria-label="구간 배치 상태"]')?.textContent==='현재 배치에 적용'`, 'Active segment status missing')
      const invalidControls=await evaluate(`(() => [...document.querySelectorAll('.span-properties__geometry input,.span-properties__geometry select')].filter(element=>{
        element.scrollIntoView({block:'nearest',inline:'nearest'});const b=element.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2
        return b.width<=0 || b.left<0 || b.right>innerWidth || x<0 || y<0 || y>=innerHeight || !element.contains(document.elementFromPoint(x,y))
      }).map(element=>element.getAttribute('aria-label')))()`)
      if(invalidControls.length) throw new Error('Segment controls clipped or obstructed: '+JSON.stringify(invalidControls))
      await new Promise(resolve=>setTimeout(resolve,300))
      if(!await evaluate(`document.querySelector('.span-properties__geometry').open`)) throw new Error('Segment inspector unexpectedly collapsed')
      const file=path.join(app.getPath('temp'),'chromatics-span-segments-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    await evaluate('window.__pdf=undefined')
    await click('내보내기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-slur")','Segment PDF missing')
    await checkContinuationClearance()
    const segmentPdf=path.join(app.getPath('temp'),'chromatics-span-segments.pdf')
    fs.writeFileSync(segmentPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'segments.pdf'})`)
    const reflowed=structuredClone(savedSegments)
    reflowed.score.layout.systemBreakBeforeMeasureIds=[staff.measures[2].id,staff.measures[3].id]
    await openProject(reflowed)
    for(const change of segmentChanges) {
      if((await boxes(change.kind)).some(item=>item.key===change.before[0].key)) throw new Error('Stale segment survived changed musical boundaries')
    }
    const inactive=JSON.parse(await save())
    for(const kind of ['slurs','hairpins']) if(JSON.stringify(inactive.score[kind])!==JSON.stringify(savedSegments.score[kind])) throw new Error('Reflow discarded stored segment geometry')
    await click('표기 객체')
    await select('표기 객체 선택','slur:segment-slur')
    await select('표기 조정 대상',segmentChanges[0].before[0].key)
    await evaluate(`document.querySelector('.span-properties__geometry').open=true`)
    await wait(`document.querySelector('[aria-label="구간 배치 상태"]')?.textContent==='현재 배치에 없음' && document.querySelector('[aria-label="표기 세로 이동"]').disabled`, 'Inactive stored segment is still editable')
    await click('객체 전체 배치 따르기')
    const cleared=JSON.parse(await save())
    if(cleared.score.slurs[0].engraving.segments?.length || JSON.stringify(cleared.score.hairpins)!==JSON.stringify(inactive.score.hairpins)) throw new Error('Inactive segment cleanup changed other geometry')
    await click('실행 취소')
    const undone=JSON.parse(await save())
    if(JSON.stringify(undone.score.slurs)!==JSON.stringify(inactive.score.slurs)) throw new Error('Inactive segment cleanup undo failed')
    undone.score.layout=structuredClone(savedSegments.score.layout)
    await openProject(undone)
    for(const kind of ['slur','hairpin']) if(JSON.stringify(await boxes(kind))!==JSON.stringify(finalSegments[kind])) throw new Error('Restoring musical boundaries lost segment geometry')
    console.log(JSON.stringify({status:'passed',output,pdf,segmentOutput,segmentPdf,screenshots,changes,segmentChanges,printPartIds,fileIO:'intercepted App bridge; actual parser, renderer, native disk readback and Electron PDF'}))
    clearTimeout(deadline); app.exit(0)
  } catch(error) {console.error(error);clearTimeout(deadline);app.exit(1)}
}).catch(error=>{console.error(error);clearTimeout(deadline);app.exit(1)})
