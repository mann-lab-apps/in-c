const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { isDeepStrictEqual } = require('node:util')
const { Glyphs } = require('vexflow')
const auditSystemSpacing = process.argv.includes('--audit-system-spacing')
const auditHeaderPage = process.argv.includes('--audit-header-page')
const auditNestedVolta = process.argv.includes('--audit-nested-volta')
const auditNestedRepeats = process.argv.includes('--audit-nested-repeats') || auditNestedVolta
const auditNativeVoltaKeyboard = process.argv.includes('--audit-native-volta-keyboard')
const auditStaffDensity = process.argv.includes('--audit-staff-density')
const auditPdfTargetOverflow = process.argv.includes('--audit-pdf-target-overflow')
const auditLocalStaffSpacing = process.argv.includes('--audit-local-staff-spacing')
const auditManualSlurPage = process.argv.includes('--audit-manual-slur-page')
const auditManualHairpinPage = process.argv.includes('--audit-manual-hairpin-page')
const auditManualSpanPage = auditManualSlurPage || auditManualHairpinPage
const auditLowerTextPage = process.argv.includes('--audit-lower-text-page')
const auditTiePage = process.argv.includes('--audit-tie-page')
const auditLeadingInkPage = process.argv.includes('--audit-leading-ink-page')
const auditInlineClefPage = process.argv.includes('--audit-inline-clef-page')
const auditRehearsalPage = process.argv.includes('--audit-rehearsal-page')
const auditHarmonyPage = process.argv.includes('--audit-harmony-page')
const auditTempoPage = process.argv.includes('--audit-tempo-page')
const auditRhythmFeelSixteenthPage = process.argv.includes('--audit-rhythm-feel-16th-page')
const auditRhythmFeelPage = process.argv.includes('--audit-rhythm-feel-page') || auditRhythmFeelSixteenthPage
const auditHorizontalTextPage = process.argv.includes('--audit-horizontal-text-page') || auditRehearsalPage || auditHarmonyPage || auditTempoPage || auditRhythmFeelPage
const auditInkPage = auditManualSpanPage || auditLowerTextPage || auditTiePage || auditLeadingInkPage || auditHorizontalTextPage || auditInlineClefPage
const auditOversizedPage = process.argv.includes('--audit-oversized-page') || auditInkPage
const auditHairpinLocalBaselines = process.argv.includes('--audit-hairpin-local-baselines') || auditPdfTargetOverflow || auditLocalStaffSpacing
const auditSlurContinuationShape = process.argv.includes('--audit-slur-continuation-shape') || auditHairpinLocalBaselines
const auditHairpinInterior = process.argv.includes('--audit-hairpin-interior') || auditSlurContinuationShape
const auditMixedHairpinBaselines = process.argv.includes('--audit-hairpin-mixed-baselines')
const auditHairpinStack = process.argv.includes('--audit-polyphonic-hairpin-stack') || auditMixedHairpinBaselines
const auditPolyphonicHairpins = process.argv.includes('--audit-polyphonic-hairpins') || auditHairpinStack || auditHairpinInterior
const auditPolyphonicAnnotations = process.argv.includes('--audit-polyphonic-annotations') || auditPolyphonicHairpins
const auditPolyphonicSlurs = process.argv.includes('--audit-polyphonic-slurs') || auditPolyphonicAnnotations
const auditPolyphonicTriplets = process.argv.includes('--audit-polyphonic-triplets') || auditPolyphonicSlurs
const auditSharedRhythm = process.argv.includes('--audit-shared-rhythm') || auditStaffDensity || auditPolyphonicTriplets

const deadline = setTimeout(() => { console.error('Part span QA timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1100, show: false,
    webPreferences: { partition: 'part-span-qa', contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const evaluate = async code => {
    const result = await window.webContents.executeJavaScript(`(async () => {
      try { return { value: await eval(${JSON.stringify(code)}) } }
      catch (error) { return { error: error.stack || String(error) } }
    })()`)
    if (result.error) throw new Error(result.error)
    return result.value
  }
  const wait = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error(label + ': ' + await evaluate('document.querySelector(".editor-status")?.textContent'))
  }
  const click = async (label, selector = 'button') => {
    const point = await evaluate(`(() => {
      const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(item => item.getClientRects().length && (item.getAttribute('aria-label') === ${JSON.stringify(label)} || item.textContent.trim() === ${JSON.stringify(label)}))
      if (!button || button.disabled) throw new Error('Missing enabled button: ' + ${JSON.stringify(label)})
      button.scrollIntoView({block:'nearest', inline:'nearest'})
      const box = button.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight || !button.contains(document.elementFromPoint(x, y))) throw new Error('Control not clickable: ' + ${JSON.stringify(label)})
      return {x: Math.round(x), y: Math.round(y)}
    })()`)
    window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
    window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  const menu = async (label, command) => {
    await click(label, '[role="menubar"] button')
    await click(command, '[role="menu"] button')
  }
  const readyControl = selector => evaluate(`(() => {
    const control = document.querySelector(${JSON.stringify(selector)})
    if (!control || control.disabled || !control.getClientRects().length) throw new Error('Missing visible enabled control: ' + ${JSON.stringify(selector)})
    control.scrollIntoView({block:'nearest', inline:'nearest'})
    const box=control.getBoundingClientRect(), x=box.x+box.width/2, y=box.y+box.height/2
    if (box.width<=0 || box.height<=0 || box.left<0 || box.right>innerWidth || y<0 || y>=innerHeight || !control.contains(document.elementFromPoint(x,y))) throw new Error('Control clipped or obstructed: ' + ${JSON.stringify(selector)})
    control.focus()
  })()`)
  const select = async (label, value) => {
    const selector = `select[aria-label=${JSON.stringify(label)}]`
    await readyControl(selector)
    await evaluate(`(() => {
      const select = document.querySelector(${JSON.stringify(selector)})
      if (![...select.options].some(option=>option.value===${JSON.stringify(value)} && !option.disabled)) throw new Error('Missing enabled option: ' + ${JSON.stringify(value)})
      select.value = ${JSON.stringify(value)}; select.dispatchEvent(new Event('change', {bubbles:true}))
    })()`)
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  const openSpans = async () => {
    await menu('추가', '표기 도구 열기')
    await click('속성', '[role="tab"]')
    await readyControl('select[aria-label="표기 객체 선택"]')
  }
  const checkWorkspace = async () => {
    const state = await evaluate(`({
      shared: document.querySelector('.docked-workspace')?.dataset.shared,
      properties: document.querySelector('#dock-tab-properties')?.getAttribute('aria-selected'),
      overflow: document.documentElement.scrollWidth > innerWidth + 1
    })`)
    if (state.shared !== 'true' || state.properties !== 'true' || state.overflow) throw new Error('Shared property workspace invalid: ' + JSON.stringify(state))
  }
  const openGeometry = async () => {
    if (!await evaluate('document.querySelector(".span-properties__geometry")?.open')) {
      await click('배치 · 형상', '.span-properties__geometry summary')
    }
  }
  const offset = async value => {
    await openGeometry()
    await readyControl('input[aria-label="표기 세로 이동"]')
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
    await evaluate('window.__saved = undefined')
    await menu('파일', '프로젝트 저장')
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
    await menu('파일', 'MusicXML 가져오기')
    await wait('document.querySelector(".notation-slur") && document.querySelector(".notation-hairpin")', 'Imported spans missing')
    await openSpans()
    const refs = await evaluate(`[...document.querySelector('select[aria-label="표기 객체 선택"]').options].map(item=>item.value).filter(Boolean)`)
    if (!refs.some(ref=>ref.startsWith('slur:')) || !refs.some(ref=>ref.startsWith('hairpin:'))) throw new Error('Imported span choices missing')
    for (const ref of refs) { await select('표기 객체 선택', ref); await offset(-1) }
    const full = JSON.parse(await save())
    await menu('형식', '악보 및 마디 설정 열기')
    await click('파트와 보표 펼치기')
    await select('악보 보기', 'part'); await select('파트보 선택', 'P2')
    await openSpans()
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
    await menu('파일', '프로젝트 열기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("chromatics-part-span.chromatics")', 'Native reopen missing')
    await openSpans(); await select('표기 객체 선택', refs[0])
    await openGeometry()
    if (await evaluate('document.querySelector(\'input[aria-label="표기 세로 이동"]\').value') !== '2') throw new Error('Reopen lost independent geometry')
    const screenshots = []
    for (const width of [960,1400]) {
      window.setSize(width,1100)
      await new Promise(resolve=>setTimeout(resolve,300))
      await click('총보 배치 따르기'); await offset(2)
      await checkWorkspace()
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
    await menu('파일', '내보내기 작업 열기'); await click('PDF 변환')
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
    await menu('파일', 'MusicXML 가져오기')
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
      await menu('파일', '프로젝트 열기')
      await wait('document.querySelector(".editor-status")?.textContent.includes("segments.chromatics")', 'Segment project reopen failed')
      await openSpans()
    }
    if(auditHeaderPage) {
      const project=structuredClone(segmentProject)
      project.score.title='W'.repeat(120)
      project.score.composer='M'.repeat(80)
      delete project.score.tempo
      delete project.score.rhythmFeel
      delete project.score.slurs
      delete project.score.hairpins
      delete project.score.layout
      await openProject(project)
      const before=JSON.parse(await save()).score
      await evaluate('window.__pdf=undefined')
      await menu('파일', '내보내기 작업 열기'); await click('PDF 변환')
      await wait('window.__pdf', 'Header PDF missing')
      const file=path.join(app.getPath('temp'),'chromatics-header-page.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
      window.webContents.debugger.attach('1.3')
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:'print'})
      window.setContentSize(Math.round((210-16)*96/25.4),1100)
      await new Promise(resolve=>setTimeout(resolve,150))
      const bounds=await evaluate(`(() => {
        const page=document.querySelector('.score-page').getBoundingClientRect()
        return [...document.querySelectorAll('.score-title .metadata-display')].map(element=>{
          const range=document.createRange();range.selectNodeContents(element)
          const box=range.getBoundingClientRect()
          return {name:element.getAttribute('aria-label'),left:box.left-page.left,right:box.right-page.left,width:page.width,bottom:box.bottom-page.top}
        })
      })()`)
      console.log(JSON.stringify({status:'header-print-audit',bounds,pdf:file}))
      if(bounds.some(box=>box.left< -1 || box.right>box.width+1)) throw new Error('Printed header text crosses page edge')
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{media:''})
      window.webContents.debugger.detach()
      await evaluate('window.__resolvePdf(null)')
      if(!isDeepStrictEqual(JSON.parse(await save()).score,before)) throw new Error('Header export changed native score')
      clearTimeout(deadline);app.quit();return
    }
    if(auditOversizedPage) {
      const partCount=auditHorizontalTextPage?1:auditInkPage?9:32
      const prefix=auditRhythmFeelSixteenthPage?'chromatics-rhythm-feel-16th-page':auditRhythmFeelPage?'chromatics-rhythm-feel-page':auditTempoPage?'chromatics-tempo-page':auditInlineClefPage?'chromatics-inline-clef-page':auditHarmonyPage?'chromatics-harmony-page':auditRehearsalPage?'chromatics-rehearsal-page':auditHorizontalTextPage?'chromatics-horizontal-text-page':auditLeadingInkPage?'chromatics-leading-ink-page':auditTiePage?'chromatics-tie-page':auditLowerTextPage?'chromatics-lower-text-page':auditManualHairpinPage?'chromatics-manual-hairpin-page':auditManualSlurPage?'chromatics-manual-slur-page':'chromatics-oversized-page'
      const textLabel=auditHarmonyPage?'코드 심벌':auditRehearsalPage?'연습표':'보표 글자'
      const textSelector=auditRhythmFeelPage?'.notation-rhythm-feel-marking text':auditTempoPage?'.notation-tempo-marking':auditHarmonyPage?'.notation-harmony-mark':auditRehearsalPage?'.notation-rehearsal-mark text':'.notation-staff-text'
      const textCollection=auditHarmonyPage?'harmonies':auditRehearsalPage?'rehearsalMarks':'staffTexts'
      const fittingText=auditHarmonyPage?'C7':auditRehearsalPage?'A':'dolce'
      const project={...structuredClone(segmentProject),score:{id:'oversized-system',title:'Oversized system',
        parts:Array.from({length:partCount},(_,index)=>({id:'oversized-part-'+index,name:'Part '+(index+1),staves:[{
          id:'oversized-staff-'+index,measures:[{id:'oversized-measure-'+index,number:1,
            timing:{type:'regular'},timeSignature:{beats:4,beatType:4},keySignature:{fifths:0},clef:{sign:'G',line:2},
            voices:[{id:'oversized-voice-'+index,events:[{id:'oversized-note-'+index,type:'note',
              pitch:{step:'C',octave:5},position:{tick:0},duration:{value:'whole',dots:0}}]}]
          }]}]}))}}
      if(auditManualSpanPage) {
        project.score.parts.at(-1).staves[0].measures[0].voices[0].events=[0,1].map(index=>({
          id:'manual-page-note-'+index,type:'note',pitch:{step:'C',octave:auditManualHairpinPage?5:0},
          position:{tick:index*26880},duration:{value:'half',dots:0}
        }))
        project.score[auditManualHairpinPage?'hairpins':'slurs']=[{id:'manual-page-span',
          ...(auditManualHairpinPage?{type:'crescendo'}:{}),startEventId:'manual-page-note-0',endEventId:'manual-page-note-1',
          engraving:{placement:'below',height:8,offsetY:8}}]
      }
      if(auditLowerTextPage) project.score.expressionTexts=Array.from({length:4},(_,index)=>({
        id:'page-text-'+index,measureId:'oversized-measure-8',tick:index*13440,text:'espressivo'
      }))
      if(auditTiePage) project.score.parts.at(-1).staves[0].measures[0].voices[0].events=[0,1].map(index=>({
        id:'page-tie-note-'+index,type:'note',pitch:{step:'C',octave:3},position:{tick:index*26880},
        duration:{value:'half',dots:0},ties:index?{stop:true}:{start:true}
      }))
      if(auditLeadingInkPage) project.score.layout={pageSetup:{pageMarginMm:11}}
      if(auditInlineClefPage) project.score.parts.forEach((part,index)=>{
        part.staves[0].measures[0].voices[0].events[0].clefBefore=[{sign:'G',line:2},{sign:'F',line:4},{sign:'C',line:3}][index%3]
      })
      if(auditTempoPage) project.score.tempo={bpm:120,beatUnit:'quarter',dots:0,text:'Allegro '.repeat(80).trim()}
      if(auditRhythmFeelPage) project.score.rhythmFeel={unit:'eighth',text:'Swing '.repeat(80).trim()}
      if(auditRhythmFeelSixteenthPage) project.score.tempo={bpm:120,beatUnit:'quarter',dots:0}
      if(auditHorizontalTextPage && !auditTempoPage && !auditRhythmFeelPage) project.score[textCollection]=[{id:'wide-page-text',measureId:'oversized-measure-0',
        text:auditHarmonyPage?'C7 '.repeat(80).trim():auditRehearsalPage?'I'.repeat(63):'dolce '.repeat(80),
        ...(auditHarmonyPage?{tick:0,root:{step:'C'},kind:'dominant'}:{})}]
      const check=()=>evaluate(`(() => {
        const measures=[...document.querySelectorAll('.notation-measure[data-measure-id^="oversized-measure-"]')]
        const first=Number(measures[0]?.getAttribute('y')), last=Number(measures.at(-1)?.getAttribute('y'))
        if(measures.length!==${partCount} || document.querySelectorAll('.notation-event').length!==${partCount+(auditManualSpanPage||auditTiePage?1:0)} || !Number.isFinite(first) || first>=200 || last-first<${auditHorizontalTextPage?0:auditInkPage?880:3400})
          throw new Error('Oversized system shifted or scaled: '+JSON.stringify({first,last,count:measures.length}))
        return {first,last,estimatedPages:document.querySelector('[data-print-estimated-pages]')?.dataset.printEstimatedPages}
      })()`)
      await openProject(project)
      const results=[]
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        results.push({width,...await check()})
        fs.writeFileSync(path.join(app.getPath('temp'),prefix+'-'+width+'.png'),(await window.webContents.capturePage()).toPNG())
      }
      if(auditInkPage) {
        await evaluate(`[...document.querySelectorAll('${auditInlineClefPage?'.notation-inline-clef':auditHorizontalTextPage?textSelector:auditLeadingInkPage?'.vf-clef':auditTiePage?'.vf-stavetie':auditLowerTextPage?'.notation-expression-text':auditManualHairpinPage?'.notation-hairpin':'.notation-slur'}')].at(-1).scrollIntoView({block:'center',inline:'nearest'})`)
        fs.writeFileSync(path.join(app.getPath('temp'),prefix+'-detail.png'),(await window.webContents.capturePage()).toPNG())
      }
      if(!isDeepStrictEqual(JSON.parse(await save()).score,project.score)) throw new Error('Oversized layout changed native score')
      await openProject(JSON.parse(await save()));await check()
      if(auditInlineClefPage) {
        await evaluate(`(() => {
          window.__pdf=undefined
          window.__inlinePreflight=undefined
          window.__inlineObserver=new MutationObserver(()=>{
            const preview=document.querySelector('.app-shell--pdf-export .notation-preview')
            if(preview?.dataset.printOverflowMeasure) window.__inlinePreflight={
              measure:preview.dataset.printOverflowMeasure,axis:preview.dataset.printOverflowAxis,
              layoutHeight:Number(preview.dataset.layoutHeight),
              clefBottom:Math.max(...[...preview.querySelectorAll('.vf-clef text')].map(text=>{
                const style=getComputedStyle(text),context=document.createElement('canvas').getContext('2d')
                context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
                return Number(text.getAttribute('y'))+context.measureText(text.textContent).actualBoundingBoxDescent
              })),
              lastStaffBottom:Math.max(...[...preview.querySelectorAll('.vf-stave')].map(stave=>{const b=stave.getBBox();return b.y+b.height}))}
          })
          window.__inlineObserver.observe(document.querySelector('.notation-preview'),{attributes:true})
        })()`)
        await menu('파일','내보내기 작업 열기');await click('PDF 변환')
        await wait('document.querySelector(".editor-status")?.textContent.includes("한 페이지 높이를 넘습니다")','Nine-staff inline clef overflow missing')
        const preflight=await evaluate(`(() => {
          window.__inlineObserver.disconnect()
          if(window.__pdf || window.__inlinePreflight?.axis!=='height') throw new Error('Inline preflight did not reject before IPC: '+JSON.stringify({pdf:Boolean(window.__pdf),preflight:window.__inlinePreflight}))
          return window.__inlinePreflight
        })()`)
        if(!isDeepStrictEqual(JSON.parse(await save()).score,project.score)) throw new Error('Inline preflight mutated native score')
        if(await evaluate(`Boolean(document.querySelector('button[aria-label="PDF 조판 설정 펼치기"]'))`)) await click('PDF 조판 설정 펼치기')
        await readyControl('input[aria-label="PDF 보표 크기"]')
        await evaluate(`(() => {
          const input=document.querySelector('input[aria-label="PDF 보표 크기"]')
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'90')
          input.dispatchEvent(new Event('input',{bubbles:true}))
          input.dispatchEvent(new Event('change',{bubbles:true}))
        })()`)
        await wait('document.querySelector(".editor-status")?.textContent.includes("PDF 페이지 설정을 갱신했습니다")','Staff size correction missing')
        const fitting=structuredClone(project)
        fitting.score.layout={pageSetup:{pageSize:'a4',orientation:'portrait',pageMarginMm:8,staffSizePercent:90,systemSpacingPercent:100}}
        if(!isDeepStrictEqual(JSON.parse(await save()).score,fitting.score)) throw new Error('Inline retry changed more than page setup')
        await openProject(fitting)
        await menu('파일','내보내기 작업 열기');await click('PDF 변환')
        await wait('window.__pdf && document.querySelector(".app-shell--pdf-export")','Inline clef PDF missing')
        const ink=await evaluate(`(() => {
          const preview=document.querySelector('.notation-preview'), viewport=preview.querySelector('svg').viewBox.baseVal
          if(preview.dataset.printOverflowMeasure) throw new Error('Fitting inline clefs rejected')
          const margin=Number(document.querySelector('.score-page').dataset.pdfPageMarginMm)
          const pageBottom=viewport.y+Math.floor(viewport.width*(297-2*margin)/(210-2*margin))
          const staves=[...preview.querySelectorAll('.vf-stave')]
          const symbols=[...preview.querySelectorAll('.notation-inline-clef')].map((text,index)=>{
            const style=getComputedStyle(text), context=document.createElement('canvas').getContext('2d')
            context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
            const measured=context.measureText(text.textContent), x=Number(text.getAttribute('x')), y=Number(text.getAttribute('y'))
            const lines=[...staves[index].querySelectorAll('path')].map(path=>path.getBBox()).filter(box=>box.width>100 && box.height<1)
            const top=Math.min(...lines.map(box=>box.y))
            const head=preview.querySelector('.notation-event[data-event-id="oversized-note-'+index+'"] .vf-notehead text')
            return {eventId:text.dataset.eventId,text:text.textContent,left:x-measured.actualBoundingBoxLeft,
              right:x+measured.actualBoundingBoxRight,top:y-measured.actualBoundingBoxAscent,bottom:y+measured.actualBoundingBoxDescent,
              baseline:y,expectedBaseline:top+[30,10,20][index%3],headY:Number(head?.getAttribute('y')),
              expectedHeadY:top+[15,-45,-15][index%3],fontFamily:style.fontFamily}
          })
          const glyphs=${JSON.stringify([Glyphs.gClef, Glyphs.fClef, Glyphs.cClef])}
          // Staff strokes are snapped half a pixel away from VexFlow's logical note/clef baselines.
          if(symbols.some((item,index)=>item.text!==glyphs[index%3] || !item.fontFamily.includes('Bravura') ||
            Math.abs(item.baseline-item.expectedBaseline)>0.51 || Math.abs(item.headY-item.expectedHeadY)>0.51))
            throw new Error('Inline clef alignment/effective pitch mismatch: '+JSON.stringify(symbols))
          if(symbols.length!==9 || new Set(symbols.map(item=>item.text)).size!==3 ||
            symbols.some((item,index)=>item.eventId!=='oversized-note-'+index || item.right<=item.left || item.bottom<=item.top ||
              item.left<viewport.x || item.right>viewport.x+viewport.width || item.top<viewport.y || item.bottom>pageBottom))
            throw new Error('Inline clef ink clipped or missing: '+JSON.stringify({symbols,pageBottom}))
          const box=preview.querySelector('svg').getBBox()
          return {symbols,pageBottom,pageRight:viewport.x+viewport.width,viewportHeight:viewport.height,
            layoutHeight:Number(preview.dataset.layoutHeight),svgBottom:box.y+box.height}
        })()`)
        const file=path.join(app.getPath('temp'),prefix+'.pdf')
        fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
        await evaluate(`window.__resolvePdf({fileName:'inline-clefs.pdf'})`)
        await wait('!document.querySelector(".app-shell--pdf-export")','Inline clef print state not restored')
        if(!isDeepStrictEqual(JSON.parse(await save()).score,fitting.score)) throw new Error('Inline clef output changed native score')
        console.log(JSON.stringify({status:'inline-clef-ink-audited',results,preflight,ink,pdf:file,pdfReviewRequired:true,nativePreserved:true}))
        clearTimeout(deadline);app.exit(0);return
      }
      await evaluate(`(() => {
        window.__pdf=undefined;window.__oversizedPrint=undefined
        window.__oversizedObserver=new MutationObserver(() => {
          const preview=document.querySelector('.app-shell--pdf-export .notation-preview')
          if(preview?.dataset.printOverflowMeasure) window.__oversizedPrint={
            measure:preview.dataset.printOverflowMeasure,pages:preview.dataset.printEstimatedPages,
            axis:preview.dataset.printOverflowAxis,
            pageRight:preview.querySelector('svg').viewBox.baseVal.width,
            rehearsalRight:Math.max(...[...preview.querySelectorAll('.notation-rehearsal-mark rect')].map(rect=>
              Number(rect.getAttribute('x'))+Number(rect.getAttribute('width'))+parseFloat(getComputedStyle(rect).strokeWidth)/2)),
            textRight:Math.max(...[...preview.querySelectorAll('.notation-staff-text, .notation-rehearsal-mark text, .notation-harmony-mark, .notation-tempo-marking, .notation-rhythm-feel-marking text')].map(text=>{
              const style=getComputedStyle(text), context=document.createElement('canvas').getContext('2d')
              context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
              const ink=context.measureText(text.textContent)
              return Number(text.getAttribute('x'))+ink.actualBoundingBoxRight-(style.textAnchor==='middle'?ink.width/2:0)
            })),
            lastStaffY:Number([...preview.querySelectorAll('.notation-measure')].at(-1)?.getAttribute('y')),
            staffBottom:Math.max(...[...preview.querySelectorAll('.vf-stave')].map(stave=>{
              const box=stave.getBBox();return box.y+box.height
            })),
            pageBottom:(() => {
              const viewport=preview.querySelector('svg').viewBox.baseVal
              const margin=Number(document.querySelector('.score-page').dataset.pdfPageMarginMm)
              return viewport.y+Math.floor(viewport.width*(297-2*margin)/(210-2*margin))
            })(),
            slurBottom:preview.querySelector('.notation-slur')?.getAttribute('data-slur-ink-bottom'),
            clefBottom:Math.max(...[...preview.querySelectorAll('.vf-clef text')].map(text=>{
              const style=getComputedStyle(text), context=document.createElement('canvas').getContext('2d')
              context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
              return Number(text.getAttribute('y'))+context.measureText(text.textContent).actualBoundingBoxDescent
            })),
            tieBottom:Math.max(...[...preview.querySelectorAll('.vf-stavetie path')].map(path=>{
              const box=path.getBBox();return box.y+box.height
            })),
            textBottom:Math.max(...[...preview.querySelectorAll('.notation-expression-text')].map(text=>{
              const style=getComputedStyle(text), context=document.createElement('canvas').getContext('2d')
              context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
              return Number(text.getAttribute('y'))+context.measureText(text.textContent).actualBoundingBoxDescent
            })),
            hairpinBottom:Math.max(...[...preview.querySelectorAll('.notation-hairpin line')].flatMap(line=>
              ['y1','y2'].map(key=>Number(line.getAttribute(key))+parseFloat(getComputedStyle(line).strokeWidth)/2)))}
        })
        window.__oversizedObserver.observe(document.querySelector('.notation-preview'),{attributes:true})
      })()`)
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait(`document.querySelector('.editor-status')?.textContent.includes(${JSON.stringify(auditHorizontalTextPage?'1마디부터 시작하는 악보단의 기호가 페이지 너비를 넘습니다.':'1마디부터 시작하는 악보단이 한 페이지 높이를 넘습니다.')})`,'Oversized PDF rejection missing')
      const preflight=await evaluate(`(() => {
        window.__oversizedObserver.disconnect()
        if(window.__pdf || document.querySelector('.app-shell--pdf-export') || window.__oversizedPrint?.measure!=='1')
          throw new Error('Oversized preflight did not reject before IPC or restore editing')
        return window.__oversizedPrint
      })()`)
      if(auditManualSlurPage && !(Number(preflight.slurBottom)>preflight.lastStaffY+80)) throw new Error('Manual slur boundary probe missing')
      if(auditManualHairpinPage && !(preflight.hairpinBottom>preflight.lastStaffY+80)) throw new Error('Manual hairpin boundary probe missing')
      if(auditLowerTextPage && !(preflight.textBottom>preflight.lastStaffY+80)) throw new Error('Lower text boundary probe missing')
      if(auditTiePage && !(preflight.tieBottom>preflight.lastStaffY+80)) throw new Error('Tie boundary probe missing')
      if(auditLeadingInkPage && !(preflight.staffBottom<=preflight.pageBottom && preflight.clefBottom>preflight.pageBottom))
        throw new Error('Clef must cross the A4 page boundary while staff lines fit: '+JSON.stringify(preflight))
      if(auditRehearsalPage && !(preflight.axis==='width' && preflight.textRight<=preflight.pageRight && preflight.rehearsalRight>preflight.pageRight))
        throw new Error('Rehearsal stroke must cross while its text fits: '+JSON.stringify(preflight))
      if(auditHorizontalTextPage && !auditRehearsalPage && !(preflight.axis==='width' && preflight.textRight>preflight.pageRight))
        throw new Error('Text must cross the horizontal page boundary: '+JSON.stringify(preflight))
      results.push({pdfRejected:true,...preflight})
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await evaluate(`(() => {
          const message=document.querySelector('.editor-status__message.is-error'), box=message?.getBoundingClientRect()
          if(!box || box.width<=0 || box.left<0 || box.right>innerWidth+1 || box.bottom>innerHeight+1 || message.scrollWidth>message.clientWidth+1)
            throw new Error('PDF preflight message clipped')
        })()`)
        fs.writeFileSync(path.join(app.getPath('temp'),prefix+'-rejection-'+width+'.png'),(await window.webContents.capturePage()).toPNG())
      }
      if(!isDeepStrictEqual(JSON.parse(await save()).score,project.score)) throw new Error('Oversized PDF changed native score')
      if(auditRhythmFeelPage) {
        await menu('형식','악보 및 마디 설정 열기')
        if(await evaluate(`[...document.querySelectorAll('button')].some(item=>item.getAttribute('aria-label')==='빠르기 펼치기')`)) await click('빠르기 펼치기')
        await select('리듬 해석 표기','none')
        await select('리듬 해석 표기',auditRhythmFeelSixteenthPage?'16th':'eighth')
        const fitting=structuredClone(project)
        fitting.score.rhythmFeel={unit:auditRhythmFeelSixteenthPage?'16th':'eighth'}
        if(!isDeepStrictEqual(JSON.parse(await save()).score,fitting.score)) throw new Error('Rhythm-feel replacement changed unrelated score content')
        await openProject(fitting)
      } else if(auditTempoPage) {
        await menu('형식','악보 및 마디 설정 열기')
        if(await evaluate(`[...document.querySelectorAll('button')].some(item=>item.getAttribute('aria-label')==='빠르기 펼치기')`)) await click('빠르기 펼치기')
        await readyControl('input[aria-label="악보에 빠르기말 표기"]')
        await click('악보에 빠르기말 표기','input')
        const fitting=structuredClone(project)
        fitting.score.tempo.transparent=true
        if(!isDeepStrictEqual(JSON.parse(await save()).score,fitting.score)) throw new Error('Hiding tempo changed its text or score')
        await openProject(fitting)
      } else if(auditHorizontalTextPage) {
        const fitting=structuredClone(project)
        fitting.score[textCollection][0].text=fittingText
        await menu('추가',textLabel+' 입력')
        await select(textLabel+' 객체 선택','wide-page-text')
        await readyControl('input[aria-label="'+textLabel+'"]')
        await evaluate(`(() => {
          const input=document.querySelector('input[aria-label="${textLabel}"]')
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(fittingText)})
          input.dispatchEvent(new Event('input',{bubbles:true}))
          input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))
          input.blur()
        })()`)
        await wait(`document.querySelector('${textSelector}')?.textContent===${JSON.stringify(fittingText)}`,'Text correction did not apply')
        if(!isDeepStrictEqual(JSON.parse(await save()).score,fitting.score)) throw new Error('Text retry changed native score')
      } else {
        await menu('형식','악보 및 마디 설정 열기')
        if(await evaluate(`[...document.querySelectorAll('button')].some(item=>item.getAttribute('aria-label')==='파트와 보표 펼치기')`)) await click('파트와 보표 펼치기')
        await select('악보 보기','part');await select('파트보 선택','oversized-part-'+(auditInkPage?partCount-1:0))
      }
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector("[data-print-estimated-pages]")','Part retry PDF missing')
      if(await evaluate(`Boolean(document.querySelector('[data-print-overflow-measure]'))`)) throw new Error('Part retry kept stale overflow')
      if(auditManualSlurPage) await evaluate(`(() => {
        const slur=document.querySelector('.notation-slur')
        if(!slur || Math.abs(Number(slur.dataset.slurControlY)-Math.max(Number(slur.dataset.slurY1),Number(slur.dataset.slurY2))-80)>0.01)
          throw new Error('Part retry changed manual slur height')
      })()`)
      if(auditManualHairpinPage) await evaluate(`(() => {
        const lines=[...document.querySelectorAll('.notation-hairpin line')]
        if(lines.length!==2 || Math.abs(Number(lines[1].getAttribute('y2'))-Number(lines[0].getAttribute('y2'))-80)>0.01)
          throw new Error('Part retry changed manual hairpin height')
      })()`)
      if(auditLowerTextPage && await evaluate(`document.querySelectorAll('.notation-expression-text').length`)!==4)
        throw new Error('Part retry lost expression texts')
      if(auditTiePage && await evaluate(`document.querySelectorAll('.vf-stavetie path').length`)!==1)
        throw new Error('Part retry lost tie')
      if(auditLeadingInkPage && await evaluate(`document.querySelectorAll('.notation-preview .vf-clef text').length`)!==1)
        throw new Error('Part retry lost clef')
      if(auditTempoPage && await evaluate(`document.querySelector('.notation-tempo-marking--transparent')?.textContent`)!==project.score.tempo.text)
        throw new Error('Hidden tempo retry lost its text')
      if(auditRhythmFeelPage) results.push(await evaluate(`(() => {
        const group=document.querySelector('.notation-rhythm-feel-marking')
        const texts=[...group.querySelectorAll('text')], bracket=group.querySelector('path')
        if(texts.length!==5 || !bracket || group.hasAttribute('transform')) throw new Error('Rhythm-feel ink structure changed')
        const context=document.createElement('canvas').getContext('2d')
        const boxes=texts.map(text=>{
          const style=getComputedStyle(text)
          context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
          const ink=context.measureText(text.textContent),x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'))
          return {left:x-ink.actualBoundingBoxLeft,right:x+ink.actualBoundingBoxRight,
            top:y-ink.actualBoundingBoxAscent,bottom:y+ink.actualBoundingBoxDescent}
        })
        const box=bracket.getBBox(), half=parseFloat(getComputedStyle(bracket).strokeWidth)/2
        boxes.push({left:box.x-half,right:box.x+box.width+half,top:box.y-half,bottom:box.y+box.height+half})
        const pageWidth=document.querySelector('.notation-preview svg').viewBox.baseVal.width
        if(!boxes.every(ink=>ink.left>=0 && ink.right<=pageWidth && ink.top>=0 && ink.bottom<100)) throw new Error('Fitting rhythm-feel ink clipped: '+JSON.stringify(boxes))
        return {rhythmFeelInk:boxes,unit:${JSON.stringify(auditRhythmFeelSixteenthPage?'16th':'eighth')},withTempo:${auditRhythmFeelSixteenthPage}}
      })()`))
      if(auditHorizontalTextPage && !auditTempoPage && !auditRhythmFeelPage && await evaluate(`document.querySelector('${textSelector}')?.textContent`)!==fittingText)
        throw new Error('Text retry lost its annotation')
      const file=path.join(app.getPath('temp'),prefix+(auditHorizontalTextPage?'-retry.pdf':'-part.pdf'))
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
      await evaluate(`window.__resolvePdf({fileName:'oversized-part.pdf'})`)
      console.log(JSON.stringify({status:'oversized-preflight-passed',results,partPdf:file,nativePreserved:true}))
      clearTimeout(deadline);app.exit(0);return
    }
    if(auditNestedRepeats) {
      const fixture=auditNestedVolta?'nested-volta-ownership':'nested-repeat-slur-contract'
      const capturePrefix=auditNestedVolta?'chromatics-nested-volta':'chromatics-nested-repeat'
      const sourceNotes=auditNestedVolta?6:5, slurSegments=auditNestedVolta?5:4, playbackBeats=auditNestedVolta?8:12
      const xml=fs.readFileSync(path.resolve(__dirname,'../src/musicxml/fixtures/'+fixture+'.musicxml'),'utf8')
      await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/nested.musicxml',fileName:'nested.musicxml',contents:${JSON.stringify(xml)}}))`)
      await menu('파일','MusicXML 가져오기')
      await wait('document.querySelector(".editor-status")?.textContent.includes("nested.musicxml을 가져왔습니다.")','Nested repeat import missing')
      const project=JSON.parse(await save())
      project.score.layout={systemBreakBeforeMeasureIds:project.score.parts[0].staves[0].measures.slice(1).map(measure=>measure.id)}
      await openProject(project)
      const check=()=>evaluate(`(() => {
        if(document.querySelectorAll('.notation-event').length!==${sourceNotes} || document.querySelectorAll('g.vf-stavetie').length!==1 || document.querySelectorAll('.notation-slur').length!==${slurSegments})
          throw new Error('Nested playback changed written notes/tie/slur segments')
        if(!document.querySelector('.editor-status').textContent.includes('/ ${playbackBeats}.0박')) throw new Error('Nested repeat timeline has incorrect duration')
        if(document.documentElement.scrollWidth>innerWidth+1) throw new Error('Nested fixture workspace overflows')
      })()`)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250));await check()
        fs.writeFileSync(path.join(app.getPath('temp'),capturePrefix+'-'+width+'.png'),(await window.webContents.capturePage()).toPNG())
      }
      if(!isDeepStrictEqual(JSON.parse(await save()).score,project.score)) throw new Error('Nested layout changed native score')
      await evaluate(`void (window.inC.midi={save:async request=>{window.__nestedMidi=request.contents;return {fileName:'nested.mid'}}})`)
      await menu('파일','내보내기 작업 열기');await click('MIDI 내보내기')
      await wait('window.__nestedMidi','Nested MIDI missing')
      fs.writeFileSync(path.join(app.getPath('temp'),capturePrefix+'.mid'),Buffer.from(await evaluate('window.__nestedMidi')))
      await evaluate('window.__pdf=undefined');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Nested PDF missing')
      await check()
      fs.writeFileSync(path.join(app.getPath('temp'),capturePrefix+'.pdf'),await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
      await evaluate(`window.__resolvePdf({fileName:'nested.pdf'})`)
      await openProject(JSON.parse(await save()));await check()
      console.log(JSON.stringify({status:'nested-repeat-contract-passed',fixture,sourceNotes,sourceTies:1,slurSegments,playbackBeats,nativePreserved:true}))
      clearTimeout(deadline);app.exit(0);return
    }
    if(auditSharedRhythm) {
      const results=[]
      const measureIndices=auditStaffDensity?[0,1,2,3]:auditHairpinInterior?[0,1,2]:[0,1]
      const subdivisions=auditStaffDensity?4:2
      const capturePrefix=auditLocalStaffSpacing?'chromatics-local-staff':auditPdfTargetOverflow?'chromatics-pdf-overflow':auditStaffDensity?'chromatics-staff-density':auditHairpinLocalBaselines?'chromatics-local-hairpin':auditSlurContinuationShape?'chromatics-slur-continuation':auditHairpinInterior?'chromatics-hairpin-interior':auditMixedHairpinBaselines?'chromatics-hairpin-mixed':auditHairpinStack?'chromatics-hairpin-stack':auditPolyphonicHairpins?'chromatics-polyphonic-hairpins':auditPolyphonicAnnotations?'chromatics-polyphonic-annotations':auditPolyphonicSlurs?'chromatics-polyphonic-slurs':auditPolyphonicTriplets?'chromatics-polyphonic-triplets':'chromatics-shared-rhythm'
      const densityLayouts=new Map()
      const staffGaps=()=>auditLocalStaffSpacing?evaluate(`(() => {
        const y=(part,measure)=>Number(document.querySelector('.notation-measure[data-measure-id="rhythm-measure-'+part+'-'+measure+'"]')?.getAttribute('y'))
        return ${JSON.stringify(measureIndices)}.map(measure=>y(1,measure)-y(0,measure))
      })()`):undefined
      const checkDensityLayout=async key=>{
        if(!auditStaffDensity)return
        const columns=await evaluate(`Array.from(document.querySelectorAll('.notation-measure[data-measure-id^="rhythm-measure-0-"]')).map(item=>({
          system:item.dataset.systemIndex,x:Number(item.getAttribute('x')),width:Number(item.getAttribute('width'))
        }))`)
        if(!columns.length)throw new Error('Density layout missing')
        const previous=densityLayouts.get(key)
        if(previous && !isDeepStrictEqual(columns,previous))throw new Error('Part order changed density layout: '+JSON.stringify({key,previous,columns}))
        densityLayouts.set(key,columns)
        return columns
      }
      for(const densePart of [0,1]) {
        const project={...structuredClone(segmentProject),score:{id:'shared-rhythm',title:'Shared rhythmic columns',
          ...(auditStaffDensity?{}:{layout:{systemBreakBeforeMeasureIds:measureIndices.slice(1).map(index=>'rhythm-measure-0-'+index)}}),
          parts:[0,1].map(part=>({id:'rhythm-part-'+part,name:part?'Lower staff':'Upper staff',staves:[{
            id:'rhythm-staff-'+part,measures:measureIndices.map(index=>({id:'rhythm-measure-'+part+'-'+index,number:index+1,
              timing:{type:'regular'},timeSignature:{beats:4,beatType:4},keySignature:{fifths:0},
              clef:part?{sign:'F',line:4}:{sign:'G',line:2},
              voices:[{id:'rhythm-voice-'+part+'-'+index,events:Array.from({length:part===densePart?4*subdivisions:4},(_,event)=>({
                id:'rhythm-'+part+'-'+index+'-'+event,type:'note',pitch:{step:'C',octave:part?3:5},
                position:{tick:event*13440/(part===densePart?subdivisions:1)},duration:{value:part===densePart?subdivisions===4?'16th':'eighth':'quarter',dots:0}
              }))}]
            }))}]})),
          slurs:[{id:'rhythm-slur',startEventId:'rhythm-0-0-0',endEventId:'rhythm-0-1-3',engraving:{placement:'above',height:2,offsetY:-1}}]
        }}
        if(auditPolyphonicTriplets) {
          for(const [index,measure] of project.score.parts[densePart].staves[0].measures.entries()) {
            const voice=measure.voices[0]
            voice.id='voice-1'
            voice.events=Array.from({length:6},(_,event)=>({
              id:'rhythm-'+densePart+'-'+index+'-'+event,type:'note',pitch:{step:'C',octave:densePart?3:5},
              position:{tick:event<3?event*13440/3:(event-2)*13440},
              duration:event<3?{value:'eighth',dots:0,tuplet:{actualNotes:3,normalNotes:2}}:{value:'quarter',dots:0}
            }))
            voice.tuplets=[{id:'triplet-'+index,eventIds:voice.events.slice(0,3).map(event=>event.id),actualNotes:3,normalNotes:2}]
            measure.voices.push({id:'voice-2',events:[0,1].map(event=>({
              id:'half-'+index+'-'+event,type:'note',pitch:{step:'G',octave:densePart?2:4},
              position:{tick:event*2*13440},duration:{value:'half',dots:0}
            }))})
          }
        }
        if(auditPolyphonicSlurs) project.score.slurs=[
          {id:'polyphonic-upper',startEventId:'rhythm-'+densePart+'-0-0',endEventId:'rhythm-'+densePart+'-'+measureIndices.at(-1)+'-5'},
          {id:'polyphonic-lower',startEventId:'half-0-0',endEventId:'half-'+measureIndices.at(-1)+'-1'}
        ]
        if(auditPolyphonicAnnotations) {
          const measures=project.score.parts[densePart].staves[0].measures
          for(const measure of measures) for(const event of measure.voices[1].events)
            event.lyrics=[{number:1,text:'dolce',syllabic:'single'}]
          project.score.dynamics=measures.map((measure,index)=>({id:'poly-dynamic-'+index,measureId:measure.id,value:'mf'}))
          project.score.expressionTexts=measures.map((measure,index)=>({id:'poly-expression-'+index,measureId:measure.id,tick:26880,text:'espressivo'}))
          if(auditPolyphonicHairpins) project.score.hairpins=[{id:'poly-hairpin',type:'crescendo',startEventId:'half-0-0',endEventId:'half-'+measureIndices.at(-1)+'-1'}]
          if(auditHairpinStack) project.score.hairpins.push({id:'poly-hairpin-second',type:'crescendo',startEventId:'half-0-0',endEventId:'half-1-1'})
          if(auditMixedHairpinBaselines || auditHairpinInterior) {
            for(const event of measures[auditHairpinInterior?1:0].voices[1].events) event.lyrics=[
              {number:1,text:'dolce',syllabic:'single'}, {number:2,text:'piano',syllabic:'single'}, {number:3,text:'cantabile',syllabic:'single'}]
            if(auditMixedHairpinBaselines) project.score.hairpins[1].startEventId='half-1-0'
          }
        }
        const check=()=>evaluate(`(() => {
          const pairs=[]
          if(${auditHairpinLocalBaselines}) {
            const groups=[...document.querySelectorAll('.notation-hairpin')]
            const baselines=groups.map(group=>{
              const lines=[...group.querySelectorAll('line')]
              return lines.reduce((sum,line)=>sum+Number(line.getAttribute('y1')),0)/lines.length-Number(group.dataset.spanStaffY)
            })
            const gaps=groups.map((group,index)=>{
              const measure=JSON.parse(group.dataset.spanSegment)[2]
              const dynamic=document.querySelector('.notation-dynamic-mark[data-measure-id="'+measure+'"]')
              if(!dynamic) throw new Error('Local baseline dynamic missing')
              return baselines[index]-(Number(dynamic.getAttribute('y'))-Number(group.dataset.spanStaffY))
            })
            // Real slur/lyric ink can change the amount of movement. Check local
            // annotation alignment rather than prescribing an arbitrary delta.
            if(baselines.length!==3 || baselines[1]<=baselines[0]+0.05 || baselines[1]<=baselines[2]+0.05 || Math.max(...gaps)-Math.min(...gaps)>0.05)
              throw new Error('Sparse systems inherit interior hairpin baseline: '+JSON.stringify({baselines,gaps}))
          }
          if(${auditPolyphonicTriplets} && document.querySelectorAll('g.vf-tuplet').length!==${measureIndices.length}) throw new Error('Tuplet engraving missing')
          if(${auditLocalStaffSpacing} && ${densePart}===0) {
            const y=(part,measure)=>Number(document.querySelector('.notation-measure[data-measure-id="rhythm-measure-'+part+'-'+measure+'"]')?.getAttribute('y'))
            const gaps=${JSON.stringify(measureIndices)}.map(measure=>y(1,measure)-y(0,measure))
            if(!gaps.every(Number.isFinite) || gaps[1]<=gaps[0]+1 || gaps[1]<=gaps[2]+1)
              throw new Error('Sparse systems inherit dense staff gap: '+JSON.stringify(gaps))
          }
          if(${auditPolyphonicSlurs}) {
            const slurs=[...document.querySelectorAll('.notation-slur')]
            if(slurs.length!==${measureIndices.length*2}) throw new Error('Polyphonic continuation segments missing')
            for(const [index,slur] of slurs.entries()) {
              const side=index<${measureIndices.length}?'upper':'lower'
              if(slur.dataset.annotationLane!==side+'-slur') throw new Error('Polyphonic slur direction: '+JSON.stringify({index,expected:side,actual:slur.dataset.annotationLane}))
              const measure=index%${measureIndices.length},boxes=[]
              if(${auditSlurContinuationShape} && measure>0 && measure<${measureIndices.length-1}) {
                const y1=Number(slur.dataset.slurY1),y2=Number(slur.dataset.slurY2),control=Number(slur.dataset.slurControlY)
                const depth=side==='upper'?Math.min(y1,y2)-control:control-Math.max(y1,y2)
                if(depth>40.05) throw new Error('Flat continuation slur excessive curvature: '+JSON.stringify({index,side,y1,y2,control,depth}))
              }
              const context=document.createElement('canvas').getContext('2d')
              const inkBox=text=>{
                const style=getComputedStyle(text);context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
                const ink=context.measureText(text.textContent),anchor=style.textAnchor==='middle'?ink.width/2:style.textAnchor==='end'?ink.width:0
                const x=Number(text.getAttribute('x'))-anchor,y=Number(text.getAttribute('y'))
                if(ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent<=0) throw new Error('Polyphonic ink missing')
                return {left:x-ink.actualBoundingBoxLeft,right:x+ink.actualBoundingBoxRight,top:y-ink.actualBoundingBoxAscent,bottom:y+ink.actualBoundingBoxDescent}
              }
              const shapeBox=shape=>{const b=shape.getBBox();return {left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height}}
              for(const event of document.querySelectorAll('.notation-event[data-measure-id="rhythm-measure-${densePart}-'+measure+'"]')) {
                for(const text of event.querySelectorAll('.vf-notehead text')) boxes.push(inkBox(text))
                for(const stem of event.querySelectorAll('.vf-stem path')) boxes.push(shapeBox(stem))
              }
              const tuplet=document.querySelectorAll('g.vf-tuplet')[measure]
              for(const text of tuplet.querySelectorAll('text')) boxes.push(inkBox(text))
              if(index===0) {
                const number=inkBox(tuplet.querySelector('text'))
                const gap=number.top-Number(slur.dataset.slurY1)
                if(gap>20) throw new Error('Polyphonic endpoint double clearance: '+JSON.stringify({gap,number,endpoint:Number(slur.dataset.slurY1)}))
              }
              for(const rect of tuplet.querySelectorAll('rect')) if(rect.getAttribute('opacity')!=='0') boxes.push(shapeBox(rect))
              const beam=document.querySelectorAll('g.vf-beam')[measure]
              if(!beam) throw new Error('Polyphonic beam missing')
              for(const path of beam.querySelectorAll(':scope > path')) boxes.push(shapeBox(path))
              const spanBox=shapeBox(slur)
              for(const event of document.querySelectorAll('.notation-event[data-measure-id="rhythm-measure-${1-densePart}-'+measure+'"]')) {
                const neighbors=[...event.querySelectorAll('.vf-notehead text')].map(inkBox)
                neighbors.push(...[...event.querySelectorAll('.vf-stem path')].map(shapeBox))
                for(const other of neighbors) {
                  if(other.right<spanBox.left || other.left>spanBox.right) continue
                  const gap=${densePart}===0?other.top-spanBox.bottom:spanBox.top-other.bottom
                  if(gap<12-0.05) throw new Error('Polyphonic slur neighboring staff: '+JSON.stringify({index,gap,spanBox,other}))
                }
              }
              const curve=document.createElementNS('http://www.w3.org/2000/svg','path');curve.setAttribute('d',slur.dataset.spanHitPath)
              const length=curve.getTotalLength(),start=curve.getPointAtLength(0).x,end=curve.getPointAtLength(length).x
              if(${auditPolyphonicAnnotations}) {
                const allHairpins=[...document.querySelectorAll('.notation-hairpin')]
                if(${auditPolyphonicHairpins} && allHairpins.length!==${auditMixedHairpinBaselines?3:auditHairpinStack?4:measureIndices.length}) throw new Error('Automatic hairpin continuation missing')
                const hairpins=allHairpins.filter(group=>JSON.parse(group.dataset.spanSegment)[2]==='rhythm-measure-${densePart}-'+measure)
                const hairpin=${auditPolyphonicHairpins}?shapeBox(hairpins.at(-1)):undefined
                if(${auditHairpinStack} && hairpins.length>1) {
                  const first=shapeBox(hairpins[0]),second=shapeBox(hairpins[1])
                  if(second.top-first.bottom-1.8<4-0.05) throw new Error('Automatic hairpin stack clearance: '+JSON.stringify({first,second,gap:second.top-first.bottom-1.8}))
                }
                if(hairpin && side==='lower' && hairpin.top<spanBox.bottom+4) throw new Error('Automatic hairpin/slur collision: '+JSON.stringify({hairpin,spanBox}))
                const texts=[...document.querySelectorAll('.notation-dynamic-mark[data-measure-id="rhythm-measure-${densePart}-'+measure+'"],.notation-expression-text[data-measure-id="rhythm-measure-${densePart}-'+measure+'"]'),
                  ...document.querySelectorAll('.notation-lyric[data-event-id^="half-'+measure+'-"]')]
                if(texts.length!==(${auditMixedHairpinBaselines || auditHairpinInterior} && measure===${auditHairpinInterior?1:0}?8:4)) throw new Error('Polyphonic lower annotations missing')
                for(const text of texts) {
                  const box=inkBox(text),left=Math.max(start+0.01,box.left),right=Math.min(end-0.01,box.right)
                  const viewport=slur.ownerSVGElement.viewBox.baseVal
                  if(box.top<viewport.y || box.bottom>viewport.y+viewport.height) throw new Error('Lower annotation clipped by SVG')
                  if(hairpin) for(const line of hairpins.flatMap(group=>[...group.querySelectorAll('line')])) {
                    const x1=Number(line.getAttribute('x1')),x2=Number(line.getAttribute('x2'))
                    const y1=Number(line.getAttribute('y1')),y2=Number(line.getAttribute('y2'))
                    const left=Math.max(box.left,x1),right=Math.min(box.right,x2)
                    if(left>right) continue
                    const ys=[left,right].map(x=>y1+(y2-y1)*(x-x1)/(x2-x1))
                    const stroke=Number.parseFloat(getComputedStyle(line).strokeWidth)/2
                    if(!(Math.max(...ys)+stroke+4<=box.top || Math.min(...ys)-stroke-4>=box.bottom))
                      throw new Error('Automatic hairpin/text clearance: '+JSON.stringify({text:text.textContent,box,ys,stroke}))
                  }
                  if(hairpin && (hairpin.top<viewport.y || hairpin.bottom>viewport.y+viewport.height)) throw new Error('Automatic hairpin clipped by SVG')
                  const neighborPart=${densePart}===0?1:0,neighborMeasure=${densePart}===0?measure:measure+1
                  for(const event of document.querySelectorAll('.notation-event[data-measure-id="rhythm-measure-'+neighborPart+'-'+neighborMeasure+'"]')) {
                    const obstacles=[...event.querySelectorAll('.vf-notehead text')].map(inkBox)
                    obstacles.push(...[...event.querySelectorAll('.vf-stem path')].map(shapeBox))
                    for(const other of obstacles) if(box.left<=other.right && box.right>=other.left && box.bottom+12>other.top+0.05)
                      throw new Error('Lower annotation invades neighboring staff/system: '+JSON.stringify({text:text.textContent,box,other}))
                    for(const other of obstacles) if(hairpin && hairpin.left<=other.right && hairpin.right>=other.left && hairpin.bottom+12>other.top+0.05)
                      throw new Error('Automatic hairpin invades neighboring staff/system: '+JSON.stringify({hairpin,other}))
                  }
                  if(left>right) continue
                  const ys=[left,(left+right)/2,right].map(x=>{
                    let low=0,high=length
                    for(let attempt=0;attempt<24;attempt++){const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<x) low=mid;else high=mid}
                    return curve.getPointAtLength((low+high)/2).y
                  })
                  if(!ys.every(y=>y+1.6<=box.top-4) && !ys.every(y=>y-1.6>=box.bottom+4))
                    throw new Error('Polyphonic text/slur collision: '+JSON.stringify({index,text:text.textContent,box,ys}))
                }
              }
              let checked=0
              for(const box of boxes) {
                const left=Math.max(start+0.01,box.left),right=Math.min(end-0.01,box.right)
                if(left>right) continue
                for(const x of [left,(left+right)/2,right]) {
                  let low=0,high=length
                  for(let attempt=0;attempt<24;attempt++){const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<x) low=mid;else high=mid}
                  const y=curve.getPointAtLength((low+high)/2).y
                  const gap=(side==='upper'?box.top-y:y-box.bottom)-1.6
                  if(gap<4-0.05) throw new Error('Polyphonic slur clearance: '+JSON.stringify({index,x,y,box,gap}))
                  checked++
                }
              }
              if(!checked) throw new Error('Polyphonic obstacle audit empty')
            }
          }
          for(const measure of ${JSON.stringify(measureIndices)}) for(const beat of [0,1,2,3]) {
            const heads=[0,1].map(part=>{
              const index=part===${densePart}?${auditPolyphonicTriplets}?(beat===0?0:beat+2):beat*${subdivisions}:beat
              const id='rhythm-'+part+'-'+measure+'-'+index
              const event=document.querySelector('.notation-event[data-event-id="'+id+'"]')
              const head=event?.querySelector('.vf-notehead text')
              if(!head) throw new Error('Rhythm head missing: '+id)
              const box=head.getBoundingClientRect()
              const target=document.querySelector('.notation-measure[data-measure-id="'+event.dataset.measureId+'"]')
              const bounds=target.getBoundingClientRect()
              if(box.left<bounds.left || box.right>bounds.right) throw new Error('Rhythm head crosses barline: '+id)
              return box.left
            })
            pairs.push({measure,beat,delta:Math.abs(heads[0]-heads[1])})
          }
          if(pairs.some(pair=>pair.delta>0.1)) throw new Error('Shared rhythm misalignment: '+JSON.stringify(pairs))
          for(const measure of ${JSON.stringify(measureIndices)}) {
            const target=document.querySelector('.notation-measure[data-measure-id="rhythm-measure-${densePart}-'+measure+'"]')
            const bounds=target.getBoundingClientRect()
            const heads=Array.from({length:${auditPolyphonicTriplets?6:4*subdivisions}},(_,event)=>{
              const head=document.querySelector('.notation-event[data-event-id="rhythm-${densePart}-'+measure+'-'+event+'"] .vf-notehead text')
              if(!head) throw new Error('Dense head missing')
              return head.getBoundingClientRect()
            })
            if(heads.some(head=>head.left<bounds.left || head.right>bounds.right)) throw new Error('Dense notehead crosses barline: '+JSON.stringify({measure,width:bounds.width,lastRight:heads.at(-1).right,barRight:bounds.right}))
            const gaps=heads.slice(1).map((head,index)=>head.left-heads[index].right)
            if(Math.min(...gaps)<2) throw new Error('Dense noteheads collide: '+JSON.stringify({measure,gaps}))
            if(${auditPolyphonicTriplets}) {
              const upper=document.querySelector('.notation-event[data-event-id="rhythm-${densePart}-'+measure+'-0"]')
              if(upper.dataset.voiceStemDirection!=='up') throw new Error('Upper voice stem policy missing')
              for(const event of [0,1]) {
                const lower=document.querySelector('.notation-event[data-event-id="half-'+measure+'-'+event+'"]')
                if(lower?.dataset.voiceStemDirection!=='down') throw new Error('Lower voice stem policy missing')
                const head=lower.querySelector('.vf-notehead text')
                if(!head) throw new Error('Secondary voice head missing')
                const box=head.getBoundingClientRect()
                if(box.left<bounds.left || box.right>bounds.right) throw new Error('Secondary voice crosses barline')
                const primary=heads[event===0?0:4]
                if(Math.abs(box.left-primary.left)>1) throw new Error('Secondary voice onset mismatch: '+JSON.stringify({measure,event,delta:box.left-primary.left}))
              }
            }
          }
          return pairs
        })()`)
        await openProject(project)
        for(const width of [960,1400]) {
          window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
          const file=path.join(app.getPath('temp'),capturePrefix+'-'+densePart+'-'+width+'.png')
          fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG())
          results.push({densePart,width,pairs:await check(),columns:await checkDensityLayout(width),staffGaps:await staffGaps()})
          await checkWorkspace()
        }
        const saved=JSON.parse(await save())
        if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Shared formatting mutated native content')
        await openProject(saved);await check()
        await evaluate('window.__pdf=undefined')
        await menu('파일','내보내기 작업 열기')
        if(auditPdfTargetOverflow) {
          await readyControl('input[aria-label="PDF 목표 장수"]')
          await evaluate(`(() => {
            const input=document.querySelector('input[aria-label="PDF 목표 장수"]')
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1')
            input.dispatchEvent(new Event('input',{bubbles:true}))
          })()`)
          await new Promise(resolve=>setTimeout(resolve,50))
        }
        await click('PDF 변환')
        await wait('window.__pdf && document.querySelector(".notation-slur")','Shared rhythm PDF missing')
        results.push({densePart,pdf:true,pairs:await check(),columns:await checkDensityLayout('pdf'),staffGaps:await staffGaps()})
        const renderedPages=await evaluate('Number(document.querySelector(".notation-preview").dataset.printEstimatedPages)')
        if(auditPdfTargetOverflow && !(renderedPages>1)) throw new Error('PDF overflow fixture no longer exceeds target')
        const pdf=path.join(app.getPath('temp'),capturePrefix+'-'+densePart+'.pdf')
        fs.writeFileSync(pdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
        await evaluate(`window.__resolvePdf({fileName:'shared-rhythm.pdf'})`)
        if(auditPdfTargetOverflow) {
          await wait(`document.body.textContent.includes(${JSON.stringify('목표 1장을 초과합니다. 현재 조판 예상: '+renderedPages+'장.')})`,'Measured PDF overflow notice missing')
          for(const width of [960,1400]) {
            window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
            await evaluate(`(() => {
              const message=document.querySelector('.editor-status__message')
              if(!message || !message.getClientRects().length) throw new Error('PDF overflow notice hidden')
              const box=message.getBoundingClientRect()
              if(box.left<0 || box.right>innerWidth || box.top<0 || box.bottom>innerHeight || message.scrollWidth>message.clientWidth+1)
                throw new Error('PDF overflow notice clipped')
            })()`)
            fs.writeFileSync(path.join(app.getPath('temp'),capturePrefix+'-'+densePart+'-notice-'+width+'.png'),(await window.webContents.capturePage()).toPNG())
          }
          results.push({densePart,renderedPages,overflowNotice:true})
        }
        if(!isDeepStrictEqual(JSON.parse(await save()).score,saved.score)) throw new Error('PDF changed shared rhythm content')
      }
      console.log(JSON.stringify({status:auditPdfTargetOverflow?'pdf-target-overflow-passed':auditStaffDensity?'staff-density-passed':auditHairpinLocalBaselines?'local-hairpin-baselines-passed':auditSlurContinuationShape?'slur-continuation-shape-passed':auditHairpinInterior?'hairpin-interior-passed':auditMixedHairpinBaselines?'hairpin-mixed-baselines-passed':auditHairpinStack?'hairpin-stack-passed':auditPolyphonicHairpins?'polyphonic-hairpins-passed':auditPolyphonicAnnotations?'polyphonic-annotations-passed':auditPolyphonicSlurs?'polyphonic-slurs-passed':auditPolyphonicTriplets?'polyphonic-triplets-passed':'shared-rhythm-passed',results,nativePreserved:true}))
      clearTimeout(deadline);app.exit(0);return
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
      await openGeometry()
      await select('표기 조정 대상',segmentChanges[0].before[0].key)
      await wait(`document.querySelector('[aria-label="구간 배치 상태"]')?.textContent==='현재 배치에 적용'`, 'Active segment status missing')
      const invalidControls=await evaluate(`(() => [...document.querySelectorAll('.span-properties__geometry input,.span-properties__geometry select')].filter(element=>{
        element.scrollIntoView({block:'nearest',inline:'nearest'});const b=element.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2
        return b.width<=0 || b.left<0 || b.right>innerWidth || x<0 || y<0 || y>=innerHeight || !element.contains(document.elementFromPoint(x,y))
      }).map(element=>element.getAttribute('aria-label')))()`)
      if(invalidControls.length) throw new Error('Segment controls clipped or obstructed: '+JSON.stringify(invalidControls))
      await new Promise(resolve=>setTimeout(resolve,300))
      if(!await evaluate(`document.querySelector('.span-properties__geometry').open`)) throw new Error('Segment inspector unexpectedly collapsed')
      await checkWorkspace()
      const file=path.join(app.getPath('temp'),'chromatics-span-segments-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    await evaluate('window.__pdf=undefined')
    await menu('파일', '내보내기 작업 열기');await click('PDF 변환')
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
    await openSpans()
    await select('표기 객체 선택','slur:segment-slur')
    await openGeometry()
    await select('표기 조정 대상',segmentChanges[0].before[0].key)
    await wait(`document.querySelector('[aria-label="구간 배치 상태"]')?.textContent==='현재 배치에 없음' && document.querySelector('[aria-label="표기 세로 이동"]').disabled`, 'Inactive stored segment is still editable')
    await click('객체 전체 배치 따르기')
    const cleared=JSON.parse(await save())
    if(cleared.score.slurs[0].engraving.segments?.length || JSON.stringify(cleared.score.hairpins)!==JSON.stringify(inactive.score.hairpins)) throw new Error('Inactive segment cleanup changed other geometry')
    await menu('편집', '실행 취소')
    const undone=JSON.parse(await save())
    if(JSON.stringify(undone.score.slurs)!==JSON.stringify(inactive.score.slurs)) throw new Error('Inactive segment cleanup undo failed')
    undone.score.layout=structuredClone(savedSegments.score.layout)
    await openProject(undone)
    for(const kind of ['slur','hairpin']) if(JSON.stringify(await boxes(kind))!==JSON.stringify(finalSegments[kind])) throw new Error('Restoring musical boundaries lost segment geometry')
    const automatic = structuredClone(savedSegments)
    delete automatic.score.slurs[0].engraving
    await openProject(automatic)
    const automaticSlurs = []
    const checkAutomaticSlur = async (interactive = true) => {
      const clearance = await evaluate(`(() => {
        const measures=${JSON.stringify(staff.measures.map(measure=>measure.id))}
        const endpoints=${JSON.stringify([notes[0].id,notes.at(-1).id])}
        let checked=0
        const collisions=[]
        for (const slur of document.querySelectorAll('.notation-slur')) {
          const address=JSON.parse(slur.dataset.spanSegment)
          const measureIds=measures.slice(measures.indexOf(address[2]),measures.indexOf(address[3])+1)
          const curve=document.createElementNS('http://www.w3.org/2000/svg','path')
          curve.setAttribute('d',slur.dataset.spanHitPath)
          const length=curve.getTotalLength(), start=curve.getPointAtLength(0), end=curve.getPointAtLength(length)
          for (const stem of document.querySelectorAll('.notation-event .vf-stem path')) {
            const event=stem.closest('.notation-event'), box=stem.getBBox(), x=box.x+box.width/2
            if (!measureIds.includes(event.dataset.measureId) || endpoints.includes(event.dataset.eventId) || x<=start.x || x>=end.x) continue
            checked++
            let low=0,high=length
            for(let i=0;i<24;i++) { const mid=(low+high)/2; if(curve.getPointAtLength(mid).x<x) low=mid; else high=mid }
            const y=curve.getPointAtLength((low+high)/2).y
            const above=slur.dataset.annotationLane==='upper-slur'
            if (above ? y+1.6>box.y-4+0.05 : y-1.6<box.y+box.height+4-0.05) collisions.push(event.dataset.eventId)
          }
        }
        return {checked,collisions}
      })()`)
      if (!clearance.checked || clearance.collisions.length) throw new Error('Automatic interior stem clearance failed: '+JSON.stringify(clearance))
      const segments = await evaluate(`Array.from(document.querySelectorAll('.notation-slur')).map(item=>({
        y1:Number(item.dataset.slurY1), y2:Number(item.dataset.slurY2),
        direction:item.dataset.annotationLane==='upper-slur'?-1:1,
        filled:getComputedStyle(item).fill!=='none' && / Z$/.test(item.getAttribute('d')),
        hit:item.parentElement.querySelector('.notation-span-hit')?.getAttribute('d')===item.dataset.spanHitPath
      }))`)
      if (segments.length !== 4 || segments.some(segment=>!segment.filled || (interactive && !segment.hit))) throw new Error('Automatic continuation contour missing')
      const first=segments[0], last=segments.at(-1)
      if (first.direction*(first.y2-first.y1)<8 || last.direction*(last.y1-last.y2)<8) throw new Error('Automatic hanging end does not angle outward')
      if (segments.slice(1,-1).some(segment=>segment.y1!==segment.y2)) throw new Error('Interior continuation changed unexpectedly')
      return segments
    }
    for (const width of [960,1400]) {
      window.setSize(width,1100); await new Promise(resolve=>setTimeout(resolve,250))
      await checkWorkspace()
      automaticSlurs.push({width,segments:await checkAutomaticSlur()})
      const file=path.join(app.getPath('temp'),'chromatics-automatic-slur-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    if (JSON.parse(await save()).score.slurs[0].engraving !== undefined) throw new Error('Automatic layout wrote manual geometry')
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-slur")','Automatic slur PDF missing')
    await checkAutomaticSlur(false)
    const automaticPdf=path.join(app.getPath('temp'),'chromatics-automatic-slur.pdf')
    fs.writeFileSync(automaticPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'automatic-slur.pdf'})`)
    const stemless = structuredClone(automatic)
    const stemlessStaff = stemless.score.parts[0].staves[0]
    const quarterTicks = notes[1].position.tick - notes[0].position.tick
    stemlessStaff.measures = ['above','below'].map((side,index) => ({
      id:'head-measure-'+side, number:index+1, timing:{type:'regular'},
      timeSignature:{beats:6,beatType:4}, keySignature:{fifths:0,mode:'major'}, clef:{sign:'G',line:2},
      voices:[{id:'head-voice-'+side,events:['start','middle','end'].map((role,i)=>({
        id:'head-'+side+'-'+role,type:'note',position:{tick:[0,quarterTicks,quarterTicks*5][i]},
        duration:{value:role==='middle'?'whole':'quarter',dots:0},
        pitch:{step:side==='above'?(role==='middle'?'F':'C'):(role==='middle'?'E':'A'),octave:side==='above'?5:4}
      }))}]
    }))
    stemless.score.slurs = ['above','below'].map(side=>({id:'head-slur-'+side,startEventId:'head-'+side+'-start',endEventId:'head-'+side+'-end'}))
    for (const key of ['hairpins','dynamics','staffTexts','rehearsalMarks']) stemless.score[key]=[]
    stemless.score.layout={systemBreakBeforeMeasureIds:['head-measure-below']}
    await openProject(stemless)
    const checkStemlessHeads = () => evaluate(`(() => {
      let checked=0
      for (const side of ['above','below']) {
        const event=document.querySelector('.notation-event[data-event-id="head-'+side+'-middle"]')
        const head=event?.querySelector('.vf-notehead text'), slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='head-measure-'+side)
        if (!head || !slur || event.querySelector('.vf-stem path')) throw new Error('Missing stemless fixture: '+side)
        if (slur.dataset.annotationLane!==(side==='above'?'upper':'lower')+'-slur') throw new Error('Wrong stemless lane: '+side)
        // SVG text boxes include the full SMuFL line height; measure the actual glyph ink.
        const context=document.createElement('canvas').getContext('2d'), style=getComputedStyle(head)
        context.font=style.fontSize+' '+style.fontFamily
        const ink=context.measureText(head.textContent)
        const box={x:Number(head.getAttribute('x'))-ink.actualBoundingBoxLeft,y:Number(head.getAttribute('y'))-ink.actualBoundingBoxAscent,
          width:ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,height:ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent}
        if(box.width<=0 || box.height<=0) throw new Error('Missing glyph ink metrics')
        const curve=document.createElementNS('http://www.w3.org/2000/svg','path')
        curve.setAttribute('d',slur.dataset.spanHitPath)
        const length=curve.getTotalLength()
        for (const x of [box.x,box.x+box.width]) {
          let low=0,high=length
          for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<x) low=mid;else high=mid}
          const y=curve.getPointAtLength((low+high)/2).y
          if (side==='above'?y+1.6>box.y-4+0.05:y-1.6<box.y+box.height+4-0.05) throw new Error('Stemless head clearance: '+JSON.stringify({side,x,y,box:{x:box.x,y:box.y,width:box.width,height:box.height},curve:slur.dataset.spanHitPath}))
          checked++
        }
        const bounds=slur.getBBox(), viewport=slur.ownerSVGElement.viewBox.baseVal
        if(bounds.y<viewport.y || bounds.y+bounds.height>viewport.y+viewport.height) throw new Error('Stemless slur clipped: '+side)
      }
      if(checked!==4) throw new Error('Stemless edge checks missing')
      return checked
    })()`)
    for (const width of [960,1400]) {
      window.setSize(width,1100); await new Promise(resolve=>setTimeout(resolve,250))
      await checkWorkspace(); await checkStemlessHeads()
      const file=path.join(app.getPath('temp'),'chromatics-stemless-slur-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    const savedStemless=JSON.parse(await save())
    if(JSON.stringify(savedStemless.score.slurs)!==JSON.stringify(stemless.score.slurs)) throw new Error('Stemless layout wrote manual geometry')
    await openProject(savedStemless); await checkStemlessHeads()
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-slur")','Stemless slur PDF missing')
    await checkStemlessHeads()
    const stemlessPdf=path.join(app.getPath('temp'),'chromatics-stemless-slur.pdf')
    fs.writeFileSync(stemlessPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'stemless-slur.pdf'})`)
    const staccatoPdfs=[]
    const checkStaccato = manual => evaluate(`(() => {
      let checked=0
      for (const side of ['above','below']) {
        const dot=document.querySelector('circle.notation-articulation[data-event-id="head-'+side+'-middle"]')
        const slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='head-measure-'+side)
        if(!dot || !slur) throw new Error('Interior staccato fixture missing: '+side)
        const direction=side==='above'?-1:1
        if(slur.dataset.annotationLane!==(side==='above'?'upper':'lower')+'-slur') throw new Error('Staccato lane changed')
        if(${manual}) {
          const y1=Number(slur.dataset.slurY1),y2=Number(slur.dataset.slurY2)
          const expected=(side==='above'?Math.min(y1,y2):Math.max(y1,y2))+direction*30
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual staccato curve overridden')
          checked++;continue
        }
        const curve=document.createElementNS('http://www.w3.org/2000/svg','path')
        curve.setAttribute('d',slur.dataset.spanHitPath)
        const length=curve.getTotalLength(),cx=Number(dot.getAttribute('cx')),cy=Number(dot.getAttribute('cy')),r=Number(dot.getAttribute('r'))
        for(const x of [cx-r,cx+r]) {
          let low=0,high=length
          for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<x) low=mid;else high=mid}
          const y=curve.getPointAtLength((low+high)/2).y
          if(direction*(y-cy)<r+4+1.6-0.05) throw new Error('Interior staccato clearance: '+JSON.stringify({side,x,y,cy,r}))
          checked++
        }
      }
      if(checked!==(${manual}?2:4)) throw new Error('Staccato checks missing')
      return checked
    })()`)
    for(const mode of ['single','stack','manual']) {
      const project=structuredClone(savedStemless)
      for(const measure of project.score.parts[0].staves[0].measures) {
        measure.voices[0].events[1].articulations=mode==='single'?['staccato']:['accent','staccato']
      }
      if(mode==='manual') project.score.slurs.forEach((slur,index)=>{slur.engraving={placement:index===0?'above':'below',height:3,offsetY:1}})
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();await checkStaccato(mode==='manual')
        if(mode!=='manual') await checkStemlessHeads()
        const file=path.join(app.getPath('temp'),'chromatics-staccato-'+mode+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Staccato layout changed native score')
      await openProject(saved);await checkStaccato(mode==='manual')
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Staccato PDF missing')
      await checkStaccato(mode==='manual')
      const file=path.join(app.getPath('temp'),'chromatics-staccato-'+mode+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));staccatoPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'staccato.pdf'})`)
    }
    const tupletPdfs=[]
    const tupletKinds=['bracket','number','rests']
    const checkTuplets = manual => evaluate(`(() => {
      const groups=[...document.querySelectorAll('g.vf-tuplet')]
      if(groups.length!==3) throw new Error('Interior tuplet fixtures missing')
      return ${JSON.stringify(tupletKinds)}.map((kind,index)=>{
        const slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='tuplet-measure-'+kind)
        if(!slur || slur.dataset.annotationLane!=='upper-slur') throw new Error('Tuplet slur lane missing: '+kind)
        const text=groups[index].querySelector('text'),style=getComputedStyle(text)
        const context=document.createElement('canvas').getContext('2d')
        context.font=style.fontSize+' '+style.fontFamily
        const ink=context.measureText(text.textContent),x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'))
        if(ink.actualBoundingBoxAscent<=0 || ink.actualBoundingBoxRight<=0) throw new Error('Tuplet ink unavailable')
        const obstacles=[{left:x-ink.actualBoundingBoxLeft,right:x+ink.actualBoundingBoxRight,top:y-ink.actualBoundingBoxAscent}]
        const brackets=[...groups[index].querySelectorAll('rect')].filter(rect=>rect.getAttribute('opacity')!=='0')
        if((brackets.length>0)!==(kind!=='number')) throw new Error('Unexpected tuplet bracket: '+kind)
        for(const rect of brackets) {
          const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y'))
          obstacles.push({left:x,right:x+Number(rect.getAttribute('width')),top:y})
        }
        if(${manual}) {
          const expected=Math.min(Number(slur.dataset.slurY1),Number(slur.dataset.slurY2))-30
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual tuplet curve overridden')
        } else {
          const curve=document.createElementNS('http://www.w3.org/2000/svg','path')
          curve.setAttribute('d',slur.dataset.spanHitPath)
          const length=curve.getTotalLength()
          for(const box of obstacles) for(const edge of [box.left,box.right]) {
            let low=0,high=length
            for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<edge) low=mid;else high=mid}
            const curveY=curve.getPointAtLength((low+high)/2).y
            if(curveY+1.6>box.top-4+0.05) throw new Error('Interior tuplet clearance: '+JSON.stringify({kind,edge,curveY,box}))
          }
        }
        const b=slur.getBBox(),v=slur.ownerSVGElement.viewBox.baseVal
        if(b.y<v.y || b.y+b.height>v.y+v.height) throw new Error('Tuplet slur clipped')
        return {kind,obstacles:obstacles.length,manual:${manual}}
      })
    })()`)
    for(const manual of [false,true]) {
      const project=structuredClone(savedStemless)
      const staff=project.score.parts[0].staves[0]
      staff.measures=tupletKinds.map((kind,index)=>{
        const tripletTicks=quarterTicks*(kind==='number'?1:2)/3
        const middle=['D','E','F'].map((step,i)=>({
          id:'tuplet-'+kind+'-'+i,type:kind==='rests'?'rest':'note',position:{tick:quarterTicks+i*tripletTicks},
          duration:{value:kind==='number'?'eighth':'quarter',dots:0,tuplet:{actualNotes:3,normalNotes:2}},
          ...(kind==='rests'?{}:{pitch:{step,octave:5}})
        }))
        const events=[{id:'tuplet-'+kind+'-start',type:'note',pitch:{step:'C',octave:5},position:{tick:0},duration:{value:'quarter',dots:0}},
          ...middle,{id:'tuplet-'+kind+'-end',type:'note',pitch:{step:'C',octave:5},position:{tick:quarterTicks+tripletTicks*3},duration:{value:'quarter',dots:0}}]
        if(kind==='number') events.push({id:'tuplet-number-rest',type:'rest',position:{tick:quarterTicks*3},duration:{value:'quarter',dots:0}})
        return {id:'tuplet-measure-'+kind,number:index+1,timing:{type:'regular'},
          timeSignature:{beats:4,beatType:4},keySignature:{fifths:0,mode:'major'},clef:{sign:'G',line:2},
          voices:[{id:'tuplet-voice-'+kind,events,tuplets:[{id:'tuplet-'+kind,eventIds:middle.map(event=>event.id),actualNotes:3,normalNotes:2}]}]}
      })
      project.score.slurs=tupletKinds.map(kind=>({id:'tuplet-slur-'+kind,startEventId:'tuplet-'+kind+'-start',endEventId:'tuplet-'+kind+'-end',
        ...(manual?{engraving:{placement:'above',height:3,offsetY:1}}:{})}))
      project.score.layout={systemBreakBeforeMeasureIds:staff.measures.slice(1).map(measure=>measure.id)}
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();await checkTuplets(manual)
        const file=path.join(app.getPath('temp'),'chromatics-tuplet-'+(manual?'manual':'auto')+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Tuplet layout changed native score')
      await openProject(saved);await checkTuplets(manual)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Tuplet PDF missing')
      await checkTuplets(manual)
      const file=path.join(app.getPath('temp'),'chromatics-tuplet-'+(manual?'manual':'auto')+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));tupletPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'tuplet.pdf'})`)
    }
    const durationDotPdfs=[]
    const checkDurationDots = manual => evaluate(`(() => {
      return ['above','below'].map(side=>{
        const dots=[...document.querySelectorAll('.notation-event[data-event-id="head-'+side+'-middle"] text')]
          .filter(text=>text.textContent==='\uE1E7')
        const slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='head-measure-'+side)
        if(dots.length!==2 || !slur) throw new Error('Duration dot fixture missing: '+side)
        if(slur.dataset.annotationLane!==(side==='above'?'upper':'lower')+'-slur') throw new Error('Duration dot lane changed')
        if(${manual}) {
          const y1=Number(slur.dataset.slurY1),y2=Number(slur.dataset.slurY2)
          const expected=side==='above'?Math.min(y1,y2)-30:Math.max(y1,y2)+30
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual duration dot geometry overridden')
          return {side,manual:true}
        }
        const curve=document.createElementNS('http://www.w3.org/2000/svg','path')
        curve.setAttribute('d',slur.dataset.spanHitPath)
        const length=curve.getTotalLength(),context=document.createElement('canvas').getContext('2d')
        for(const dot of dots) {
          const style=getComputedStyle(dot);context.font=style.fontSize+' '+style.fontFamily
          const ink=context.measureText(dot.textContent),x=Number(dot.getAttribute('x')),y=Number(dot.getAttribute('y'))
          if(ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent<=0) throw new Error('Duration dot ink missing')
          const edgeY=y+(side==='above'?-ink.actualBoundingBoxAscent:ink.actualBoundingBoxDescent)
          for(const edgeX of [x-ink.actualBoundingBoxLeft,x+ink.actualBoundingBoxRight]) {
            let low=0,high=length
            for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<edgeX) low=mid;else high=mid}
            const curveY=curve.getPointAtLength((low+high)/2).y
            if(side==='above'?curveY+1.6>edgeY-4+0.05:curveY-1.6<edgeY+4-0.05)
              throw new Error('Duration dot clearance: '+JSON.stringify({side,edgeX,edgeY,curveY}))
          }
        }
        return {side,dots:dots.length,manual:false}
      })
    })()`)
    for(const manual of [false,true]) {
      const project=structuredClone(savedStemless)
      project.score.parts[0].staves[0].measures.forEach((measure,index)=>{
        const [start,middle,end]=measure.voices[0].events
        start.duration={value:'whole',dots:0}
        middle.position.tick=quarterTicks*4;middle.duration={value:'quarter',dots:2}
        middle.pitch.step=index===0?'G':'E'
        end.position.tick=quarterTicks*5.75;end.duration={value:'16th',dots:0}
      })
      if(manual) project.score.slurs.forEach((slur,index)=>{slur.engraving={placement:index===0?'above':'below',height:3,offsetY:1}})
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();await checkDurationDots(manual)
        const file=path.join(app.getPath('temp'),'chromatics-duration-dot-'+(manual?'manual':'auto')+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Duration dot layout changed native score')
      await openProject(saved);await checkDurationDots(manual)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Duration dot PDF missing')
      await checkDurationDots(manual)
      const file=path.join(app.getPath('temp'),'chromatics-duration-dot-'+(manual?'manual':'auto')+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));durationDotPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'duration-dot.pdf'})`)
    }
    const restInkPdfs=[]
    const restCases=[['quarter','above'],['quarter','below'],['64th','above'],['64th','below']]
    const checkRestInk = manual => evaluate(`(() => {
      return ${JSON.stringify(restCases)}.map(([duration,side])=>{
        const id=duration+'-'+side
        const event=document.querySelector('.notation-event[data-event-id="rest-ink-'+id+'-middle"]')
        const glyph=event?.querySelector('.vf-notehead text')
        const slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='rest-ink-measure-'+id)
        if(!glyph || !slur || event.querySelector('.vf-stem path')) throw new Error('Rest ink fixture missing: '+id)
        if(slur.dataset.annotationLane!==(side==='above'?'upper':'lower')+'-slur') throw new Error('Rest ink lane changed')
        if(${manual}) {
          const y1=Number(slur.dataset.slurY1),y2=Number(slur.dataset.slurY2)
          const expected=side==='above'?Math.min(y1,y2)-30:Math.max(y1,y2)+30
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual rest geometry overridden')
          return {id,manual:true}
        }
        const style=getComputedStyle(glyph),context=document.createElement('canvas').getContext('2d')
        context.font=style.fontSize+' '+style.fontFamily
        const ink=context.measureText(glyph.textContent),x=Number(glyph.getAttribute('x')),y=Number(glyph.getAttribute('y'))
        if(ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent<=0) throw new Error('Rest ink metrics missing')
        const edgeY=y+(side==='above'?-ink.actualBoundingBoxAscent:ink.actualBoundingBoxDescent)
        const curve=document.createElementNS('http://www.w3.org/2000/svg','path');curve.setAttribute('d',slur.dataset.spanHitPath)
        const length=curve.getTotalLength()
        for(const edgeX of [x-ink.actualBoundingBoxLeft,x+ink.actualBoundingBoxRight]) {
          let low=0,high=length
          for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<edgeX) low=mid;else high=mid}
          const curveY=curve.getPointAtLength((low+high)/2).y
          if(side==='above'?curveY+1.6>edgeY-4+0.05:curveY-1.6<edgeY+4-0.05)
            throw new Error('Rest ink clearance: '+JSON.stringify({id,edgeX,edgeY,curveY}))
        }
        return {id,manual:false}
      })
    })()`)
    for(const manual of [false,true]) {
      const project=structuredClone(savedStemless)
      const staff=project.score.parts[0].staves[0]
      staff.measures=restCases.map(([duration,side],index)=>{
        const id=duration+'-'+side,startBeats=duration==='quarter'?4:1,restBeats=duration==='quarter'?1:1/16
        const pitch={step:side==='above'?'C':'A',octave:side==='above'?5:4}
        return {id:'rest-ink-measure-'+id,number:index+1,timing:{type:'regular'},
          timeSignature:duration==='quarter'?{beats:6,beatType:4}:{beats:33,beatType:64},
          keySignature:{fifths:0,mode:'major'},clef:{sign:'G',line:2},voices:[{id:'rest-ink-voice-'+id,events:[
            {id:'rest-ink-'+id+'-start',type:'note',pitch,position:{tick:0},duration:{value:duration==='quarter'?'whole':'quarter',dots:0}},
            {id:'rest-ink-'+id+'-middle',type:'rest',position:{tick:quarterTicks*startBeats},duration:{value:duration,dots:0}},
            {id:'rest-ink-'+id+'-end',type:'note',pitch,position:{tick:quarterTicks*(startBeats+restBeats)},duration:{value:'quarter',dots:0}}
          ]}]}
      })
      project.score.slurs=restCases.map(([duration,side])=>({id:'rest-ink-slur-'+duration+'-'+side,
        startEventId:'rest-ink-'+duration+'-'+side+'-start',endEventId:'rest-ink-'+duration+'-'+side+'-end',
        ...(manual?{engraving:{placement:side,height:3,offsetY:1}}:{})}))
      project.score.layout={systemBreakBeforeMeasureIds:staff.measures.slice(1).map(measure=>measure.id)}
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();await checkRestInk(manual)
        const file=path.join(app.getPath('temp'),'chromatics-rest-ink-'+(manual?'manual':'auto')+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Rest ink layout changed native score')
      await openProject(saved);await checkRestInk(manual)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Rest ink PDF missing')
      await checkRestInk(manual)
      const file=path.join(app.getPath('temp'),'chromatics-rest-ink-'+(manual?'manual':'auto')+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));restInkPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'rest-ink.pdf'})`)
    }
    const beamPdfs=[]
    const beamCases=['single','multiple','partial'].flatMap(kind=>['above','below'].map(side=>({kind,side})))
    const checkBeams = manual => evaluate(`(() => {
      const groups=[...document.querySelectorAll('g.vf-beam')]
      if(groups.length!==6) throw new Error('Beam fixture groups missing')
      return ${JSON.stringify(beamCases)}.map(({kind,side},index)=>{
        const id=kind+'-'+side
        const slur=[...document.querySelectorAll('.notation-slur')].find(item=>JSON.parse(item.dataset.spanSegment)[2]==='beam-measure-'+id)
        if(!slur || slur.dataset.annotationLane!==(side==='above'?'upper':'lower')+'-slur') throw new Error('Beam slur lane missing: '+id)
        const polygons=[...groups[index].querySelectorAll(':scope > path')].filter(path=>/z\\s*$/i.test(path.getAttribute('d')))
        const expectedCount=kind==='single'?1:kind==='multiple'?2:3
        if(polygons.length!==expectedCount) throw new Error('Beam polygon count: '+id)
        if(${manual}) {
          const y1=Number(slur.dataset.slurY1),y2=Number(slur.dataset.slurY2)
          const expected=side==='above'?Math.min(y1,y2)-30:Math.max(y1,y2)+30
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual beam curve overridden')
          return {id,manual:true,polygons:polygons.length}
        }
        const curve=document.createElementNS('http://www.w3.org/2000/svg','path');curve.setAttribute('d',slur.dataset.spanHitPath)
        const length=curve.getTotalLength()
        let checked=0,minClearance=Infinity
        for(const polygon of polygons) {
          const coords=polygon.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g).map(Number)
          if(coords.length!==8) throw new Error('Unexpected beam polygon grammar')
          const vertices=[0,2,4,6].map(i=>({x:coords[i],y:coords[i+1]}))
          if(Math.abs(vertices[0].y-vertices[3].y)<0.01) throw new Error('Beam slope fixture became flat')
          for(const [index,start] of vertices.entries()) {
            const end=vertices[(index+1)%4]
            for(const fraction of [0,0.25,0.5,0.75,1]) {
              const x=start.x+(end.x-start.x)*fraction,y=start.y+(end.y-start.y)*fraction
              let low=0,high=length
              for(let i=0;i<24;i++) {const mid=(low+high)/2;if(curve.getPointAtLength(mid).x<x) low=mid;else high=mid}
              const curveY=curve.getPointAtLength((low+high)/2).y
              const clearance=(side==='above'?y-curveY:curveY-y)-1.6
              minClearance=Math.min(minClearance,clearance);checked++
              if(clearance<4-0.05) throw new Error('Beam clearance: '+JSON.stringify({id,x,y,curveY,clearance}))
            }
          }
        }
        return {id,manual:false,polygons:polygons.length,checked,minClearance}
      })
    })()`)
    const beamChecks=[]
    for(const manual of [false,true]) {
      const project=structuredClone(savedStemless)
      const staff=project.score.parts[0].staves[0]
      staff.measures=beamCases.map(({kind,side},index)=>{
        const id=kind+'-'+side,anchor={step:side==='above'?'C':'A',octave:side==='above'?5:4}
        const values=kind==='single'?['eighth','eighth']:kind==='multiple'?['16th','16th','16th','16th']:['16th','eighth','16th']
        const steps=side==='above'?['A','G','F','G']:['D','E','F','E']
        let beat=1
        const middle=values.map((value,i)=>{
          const note={id:'beam-'+id+'-'+i,type:'note',pitch:{step:steps[i],octave:side==='above'?4:5},
            position:{tick:quarterTicks*beat},duration:{value,dots:0}}
          beat+=value==='eighth'?0.5:0.25
          return note
        })
        return {id:'beam-measure-'+id,number:index+1,timing:{type:'regular'},timeSignature:{beats:4,beatType:4},
          keySignature:{fifths:0,mode:'major'},clef:{sign:'G',line:2},voices:[{id:'beam-voice-'+id,events:[
            {id:'beam-'+id+'-start',type:'note',pitch:anchor,position:{tick:0},duration:{value:'quarter',dots:0}},...middle,
            {id:'beam-'+id+'-end',type:'note',pitch:anchor,position:{tick:quarterTicks*2},duration:{value:'quarter',dots:0}},
            {id:'beam-'+id+'-tail',type:'rest',position:{tick:quarterTicks*3},duration:{value:'quarter',dots:0}}
          ]}]}
      })
      project.score.slurs=beamCases.map(({kind,side})=>({id:'beam-slur-'+kind+'-'+side,
        startEventId:'beam-'+kind+'-'+side+'-start',endEventId:'beam-'+kind+'-'+side+'-end',
        ...(manual?{engraving:{placement:side,height:3,offsetY:1}}:{})}))
      project.score.layout={systemBreakBeforeMeasureIds:staff.measures.slice(1).map(measure=>measure.id)}
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();beamChecks.push({width,manual,checks:await checkBeams(manual)})
        const file=path.join(app.getPath('temp'),'chromatics-beam-slur-'+(manual?'manual':'auto')+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Beam layout changed native score')
      await openProject(saved);await checkBeams(manual)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Beam slur PDF missing')
      beamChecks.push({pdf:true,manual,checks:await checkBeams(manual)})
      const file=path.join(app.getPath('temp'),'chromatics-beam-slur-'+(manual?'manual':'auto')+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));beamPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'beam-slur.pdf'})`)
    }
    const voltaXml=fs.readFileSync(path.resolve(__dirname,'../src/musicxml/fixtures/repeat-volta-slur-contract.musicxml'),'utf8')
    await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/volta-contract.musicxml',fileName:'volta-contract.musicxml',contents:${JSON.stringify(voltaXml)}}))`)
    await menu('파일','MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("volta-contract.musicxml을 가져왔습니다.")','Volta fixture import missing')
    const voltaProject=JSON.parse(await save())
    const voltaMeasures=voltaProject.score.parts[0].staves[0].measures
    voltaProject.score.layout={systemBreakBeforeMeasureIds:voltaMeasures.slice(1).map(measure=>measure.id)}
    const voltaMeasureIds=voltaMeasures.map(measure=>measure.id)
    const checkVolta = (manual='automatic') => evaluate(`(() => {
      const slurs=[...document.querySelectorAll('.notation-slur')]
      const measureIds=slurs.map(slur=>JSON.parse(slur.dataset.spanSegment)[2])
      if(JSON.stringify(measureIds)!==${JSON.stringify(JSON.stringify(voltaMeasureIds))}) throw new Error('Volta source-order slur segments changed')
      if(document.querySelectorAll('.notation-event').length!==4 || document.querySelectorAll('g.vf-stavetie').length!==1)
        throw new Error('Volta renderer unfolded playback events or dropped source tie')
      const voltas=[...document.querySelectorAll('.notation-volta-mark')]
      if(voltas.length!==2 || !voltas[0].textContent.includes('1') || !voltas[1].textContent.includes('2')) throw new Error('Volta numbering missing')
      if(slurs.some(slur=>!slur.getAttribute('d').endsWith(' Z'))) throw new Error('Volta slur contour missing')
      const clearances=voltas.map((volta,index)=>{
        const slur=slurs[index+1], top=slur.getBBox().y
        const bottom=Math.max(...[...volta.querySelectorAll('line')].flatMap(line=>[Number(line.getAttribute('y1')),Number(line.getAttribute('y2'))]))+0.5
        const label=volta.querySelector('text'), style=getComputedStyle(label), context=document.createElement('canvas').getContext('2d')
        context.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily
        const ink=context.measureText(label.textContent), labelBottom=Number(label.getAttribute('y'))+ink.actualBoundingBoxDescent
        const lineGap=top-bottom, labelGap=top-labelBottom
        if(lineGap<6-0.01 || labelGap<6-0.01) throw new Error('Volta/slur collision: '+JSON.stringify({index,lineGap,labelGap}))
        if(${JSON.stringify(manual)}==='whole' || ${JSON.stringify(manual)}==='segment' && index===1) {
          const expected=Math.min(Number(slur.dataset.slurY1),Number(slur.dataset.slurY2))-40
          if(Math.abs(Number(slur.dataset.slurControlY)-expected)>0.01) throw new Error('Manual volta slur geometry changed')
        }
        return {lineGap,labelGap}
      })
      return {sourceEvents:4,slurSegments:slurs.length,ties:1,voltas:voltas.length,clearances}
    })()`)
    const voltaChecks=[],voltaPdfs=[]
    const voltaPdf=path.join(app.getPath('temp'),'chromatics-volta-contract.pdf')
    for (const manual of ['automatic','whole','segment']) {
      const project=structuredClone(voltaProject), geometry={placement:'above',height:4,offsetY:-1}
      if(manual==='whole') project.score.slurs[0].engraving=geometry
      if(manual==='segment') project.score.slurs[0].engraving={segments:[{
        partId:project.score.parts[0].id,staffId:project.score.parts[0].staves[0].id,
        startMeasureId:voltaMeasureIds[2],endMeasureId:voltaMeasureIds[2],geometry
      }]}
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();voltaChecks.push({width,manual,...await checkVolta(manual)})
        const file=path.join(app.getPath('temp'),'chromatics-volta-contract-'+manual+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const savedVolta=JSON.parse(await save())
      if(!isDeepStrictEqual(savedVolta.score,project.score)) throw new Error('Volta layout changed native score')
      await openProject(savedVolta);await checkVolta(manual)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Volta PDF missing')
      voltaChecks.push({pdf:true,manual,...await checkVolta(manual)})
      const file=manual==='automatic'?voltaPdf:path.join(app.getPath('temp'),'chromatics-volta-contract-'+manual+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));voltaPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'volta-contract.pdf'})`)
    }
    const branchXml=fs.readFileSync(path.resolve(__dirname,'../src/musicxml/fixtures/repeat-volta-branch-ties.musicxml'),'utf8')
    await evaluate(`void (window.inC.musicXml.save=async(args)=>{window.__branchXml=args.contents;return {filePath:'/qa/branch-ties.musicxml',fileName:'branch-ties.musicxml'}})`)
    await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/branch-ties.musicxml',fileName:'branch-ties.musicxml',contents:${JSON.stringify(branchXml)}}))`)
    await menu('파일','MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("branch-ties.musicxml을 가져왔습니다.")','Branch ties import missing')
    const branchProject=JSON.parse(await save())
    const branchFlags=branchProject.score.parts[0].staves[0].measures.map(measure=>measure.voices[0].events[0].ties)
    if(!branchFlags[0]?.start || !branchFlags[1]?.stop || !branchFlags[2]?.stop) throw new Error('Branch ties lost during save')
    await menu('파일','MusicXML로 저장')
    await wait('document.querySelector(".musicxml-report")?.textContent.includes("consumer-compatibility")','Branch tie export warning missing')
    await evaluate(`(() => {
      const xml=new DOMParser().parseFromString(window.__branchXml,'application/xml'), note=xml.querySelectorAll('part > measure')[2].querySelector('note')
      if(xml.querySelectorAll('part > measure > attributes').length!==1) throw new Error('Unchanged measure attributes repeated in App export')
      const tied=[...note.querySelectorAll('notations > tied')].map(node=>node.getAttribute('type'))
      if(JSON.stringify(tied)!=='["start","stop"]' || note.querySelector('tie').getAttribute('type')!=='stop') throw new Error('Partial notation and sounding tie conflated')
      if(!document.querySelector('.musicxml-report').textContent.includes('마디 3:')) throw new Error('Affected measure missing from warning')
    })()`)
    const checkBranchTies=()=>evaluate(`(() => {
      const ties=[...document.querySelectorAll('g.vf-stavetie')], notes=[...document.querySelectorAll('.notation-event')]
      if(ties.length!==2 || notes.length!==3) throw new Error('Branch ties rendered incorrectly')
      const boxes=ties.map(tie=>tie.getBoundingClientRect()), firstEnding=notes[1].getBoundingClientRect()
      if(boxes[1].left<=firstEnding.right || boxes[1].width>=boxes[0].width) throw new Error('Second-ending tie bridges the exclusive first ending')
      return boxes.map(box=>({left:box.left,right:box.right,width:box.width}))
    })()`)
    const branchChecks=[]
    for(const width of [960,1400]) {
      window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
      await checkWorkspace();branchChecks.push({width,ties:await checkBranchTies()})
      const file=path.join(app.getPath('temp'),'chromatics-branch-ties-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    await openProject(branchProject);await checkBranchTies()
    if(!isDeepStrictEqual(JSON.parse(await save()).score,branchProject.score)) throw new Error('Branch ties changed after native reopen')
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector("g.vf-stavetie")','Branch ties PDF missing')
    branchChecks.push({pdf:true,ties:await checkBranchTies()})
    const branchPdf=path.join(app.getPath('temp'),'chromatics-branch-ties.pdf')
    fs.writeFileSync(branchPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'branch-ties.pdf'})`)
    const openVoltaXml=fs.readFileSync(path.resolve(__dirname,'../src/musicxml/fixtures/volta-open-end.musicxml'),'utf8')
    await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/open-volta.musicxml',fileName:'open-volta.musicxml',contents:${JSON.stringify(openVoltaXml)}}))`)
    await menu('파일','MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("open-volta.musicxml을 가져왔습니다.")','Open volta import missing')
    const checkOpenVolta=()=>evaluate(`(() => {
      const marks=[...document.querySelectorAll('.notation-volta-mark')]
      if(marks.length!==2) throw new Error('Volta continued beyond its open ending')
      const counts=marks.map(mark=>mark.querySelectorAll('line').length)
      if(JSON.stringify(counts)!=='[3,2]' || marks[1].dataset.voltaEnd!=='true') throw new Error('Open end rendered as closed: '+JSON.stringify(counts))
      return counts
    })()`)
    const openVoltaChecks=[]
    for(const width of [960,1400]) {
      window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
      await checkWorkspace();openVoltaChecks.push({width,lines:await checkOpenVolta()})
      const file=path.join(app.getPath('temp'),'chromatics-open-volta-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    const openVoltaProject=JSON.parse(await save())
    if(openVoltaProject.score.parts[0].staves[0].measures[2].volta.endStyle!=='open') throw new Error('Native lost open ending')
    await openProject(openVoltaProject);await checkOpenVolta()
    if(!isDeepStrictEqual(JSON.parse(await save()).score,openVoltaProject.score)) throw new Error('Open ending changed on reopen')
    await evaluate(`void (window.inC.musicXml.save=async(args)=>{window.__openVoltaXml=args.contents;return {fileName:'open-volta.musicxml',filePath:'/qa/open-volta.musicxml'}})`)
    await menu('파일','MusicXML로 저장')
    await wait('window.__openVoltaXml','Open volta export missing')
    await evaluate(`(() => {
      const xml=new DOMParser().parseFromString(window.__openVoltaXml,'application/xml')
      const types=[...xml.querySelectorAll('barline[location="right"] > ending')].map(node=>node.getAttribute('type'))
      if(JSON.stringify(types)!=='["stop","discontinue"]') throw new Error('Ending export lost stop/discontinue')
    })()`)
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-volta-mark")','Open volta PDF missing')
    openVoltaChecks.push({pdf:true,lines:await checkOpenVolta()})
    const openVoltaPdf=path.join(app.getPath('temp'),'chromatics-open-volta.pdf')
    fs.writeFileSync(openVoltaPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'open-volta.pdf'})`)
    console.log(JSON.stringify({status:'open-volta',openVoltaChecks,openVoltaPdf}))
    const openVoltaProperties=async measureId=>{
      await readyControl('.notation-event[data-measure-id="'+measureId+'"]')
      window.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'})
      window.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'})
      await menu('추가','마디 설정 열기')
      await readyControl('select[aria-label="볼타 끝 모양"]')
    }
    const endingMeasureId=openVoltaProject.score.parts[0].staves[0].measures[2].id
    await openProject(openVoltaProject)
    if(auditNativeVoltaKeyboard) {window.show();window.focus()}
    for(const width of [960,1400]) {
      window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
      await openVoltaProperties(endingMeasureId)
      await select('볼타 끝 모양','open')
      await readyControl('select[aria-label="볼타 끝 모양"]')
      if(auditNativeVoltaKeyboard) {
        window.webContents.sendInputEvent({type:'keyDown',keyCode:'Up'})
        window.webContents.sendInputEvent({type:'keyUp',keyCode:'Up'})
        await new Promise(resolve=>setTimeout(resolve,150))
        window.webContents.sendInputEvent({type:'keyDown',keyCode:'Up'})
        window.webContents.sendInputEvent({type:'keyUp',keyCode:'Up'})
        window.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'})
        window.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'})
        await wait('document.querySelector(\'select[aria-label="볼타 끝 모양"]\')?.value==="closed"','Keyboard volta style change missing')
      } else {
        await select('볼타 끝 모양','closed')
      }
      await evaluate(`(() => {
        const counts=[...document.querySelectorAll('.notation-volta-mark')].map(mark=>mark.querySelectorAll('line').length)
        if(JSON.stringify(counts)!=='[3,3]') throw new Error('Closed style did not redraw ending')
        if(document.activeElement!==document.querySelector('select[aria-label="볼타 끝 모양"]')) throw new Error('Volta style lost focus')
        if(!document.querySelector('#volta-end-target').textContent.includes('마디 3')) throw new Error('Volta target identity missing')
      })()`)
      await menu('편집','실행 취소');await checkOpenVolta()
      await menu('편집','다시 실행')
      await readyControl('select[aria-label="볼타 끝 모양"]');await checkWorkspace()
      const file=path.join(app.getPath('temp'),'chromatics-volta-properties-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    const editedVolta=JSON.parse(await save()),expectedVolta=structuredClone(openVoltaProject.score)
    expectedVolta.parts[0].staves[0].measures[2].volta.endStyle='closed'
    if(!isDeepStrictEqual(editedVolta.score,expectedVolta)) throw new Error('End-style control changed other score content')
    await openProject(editedVolta);await openVoltaProperties(endingMeasureId)
    if(await evaluate('document.querySelector(\'select[aria-label="볼타 끝 모양"]\').value')!=='closed') throw new Error('End-style control lost native value')
    await select('볼타 끝 모양','open');await checkOpenVolta()
    if(!isDeepStrictEqual(JSON.parse(await save()).score,openVoltaProject.score)) throw new Error('Restoring end style did not restore score')
    if(auditNativeVoltaKeyboard) window.hide()
    console.log(JSON.stringify({status:'volta-properties',widths:[960,1400],noteKeyboard:'Return',nativeSelectKeyboard:auditNativeVoltaKeyboard?'passed':'not run; separate opt-in gate',undoRedo:true,nativeReopen:true}))
    const longVoltaProject=structuredClone(openVoltaProject)
    longVoltaProject.score.title='Explicit long volta display'
    const prototype=longVoltaProject.score.parts[0].staves[0].measures[0]
    const longMeasures=Array.from({length:7},(_,index)=>({
      ...structuredClone(prototype),id:'long-display-m'+index,number:index+1,repeat:undefined,volta:undefined,
      voices:[{...structuredClone(prototype.voices[0]),id:'long-voice-'+index,
        events:[{...structuredClone(prototype.voices[0].events[0]),id:'long-event-'+index}]}]
    }))
    longMeasures[0].repeat={start:true}
    longMeasures[1].volta={number:1,start:true}
    longMeasures[5].volta={number:1,end:true}
    longMeasures[5].repeat={end:true}
    longMeasures[6].volta={number:2,start:true,end:true,endStyle:'open'}
    longVoltaProject.score.parts[0].staves[0].measures=longMeasures
    const otherPart=structuredClone(longVoltaProject.score.parts[0])
    otherPart.id='long-part-2';otherPart.name='Second part'
    otherPart.staves[0].id='long-staff-2'
    otherPart.staves[0].measures=longMeasures.map((measure,index)=>({
      ...structuredClone(measure),id:'other-long-m'+index,volta:undefined,repeat:undefined,
      voices:[{...structuredClone(measure.voices[0]),id:'other-long-voice-'+index,
        events:[{...structuredClone(measure.voices[0].events[0]),id:'other-long-event-'+index}]}]
    }))
    longVoltaProject.score.parts.push(otherPart)
    longVoltaProject.score.layout={systemBreakBeforeMeasureIds:[longMeasures[3].id,longMeasures[5].id]}
    await openProject(longVoltaProject)
    const checkLongDisplay=(count,closed)=>evaluate(`(() => {
      const marks=[...document.querySelectorAll('.notation-volta-mark[data-volta-number="1"]')]
      if(marks.length!==${count}) throw new Error('Explicit volta display count: '+marks.length)
      if(marks.at(-1).dataset.voltaEnd!==${JSON.stringify(String(closed))}) throw new Error('Explicit volta display endpoint missing')
      return marks.map(mark=>mark.querySelectorAll('line').length)
    })()`)
    const longDisplayChecks=[]
    const checkBoundaryInk=async()=>{
      const boundaryInk=await evaluate(`(() => {
        const context=document.createElement('canvas').getContext('2d')
        return [...document.querySelectorAll('.notation-measure[data-system-index]')].map(measure=>{
          const measureId=measure.dataset.measureId
          const head=document.querySelector('.notation-event[data-measure-id="'+measureId+'"] .vf-notehead text')
          if(!head) throw new Error('Boundary fixture missing: '+measureId)
          const style=getComputedStyle(head),matrix=head.getScreenCTM()
          context.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily
          const metrics=context.measureText(head.textContent)
          if(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight<=0) throw new Error('Boundary glyph ink unavailable')
          const x=(head.x.baseVal[0]?.value??0)+(head.dx.baseVal[0]?.value??0)
          const y=(head.y.baseVal[0]?.value??0)+(head.dy.baseVal[0]?.value??0)
          const left=new DOMPoint(x-metrics.actualBoundingBoxLeft,y).matrixTransform(matrix).x
          const right=new DOMPoint(x+metrics.actualBoundingBoxRight,y).matrixTransform(matrix).x
          const box=measure.getBoundingClientRect()
          return {measureId,left,right,measureLeft:box.left,measureRight:box.right,system:measure.dataset.systemIndex}
        })
      })()`)
      if(!boundaryInk.length) throw new Error('Boundary measures missing')
      console.log(JSON.stringify({status:'repeat-boundary-ink',boundaryInk}))
      if(boundaryInk.some(item=>item.left<item.measureLeft-0.01 || item.right>item.measureRight-4)) throw new Error('Whole-note ink crosses its measure boundary clearance')
      for(const first of boundaryInk.filter(item=>item.measureId.startsWith('long-display-m'))) {
        const second=boundaryInk.find(item=>item.measureId===first.measureId.replace('long-display-m','other-long-m'))
        if(!second || Math.abs(first.left-second.left)>0.01) throw new Error('Shared-repeat same-onset notes are not aligned: '+JSON.stringify({first,second}))
      }
      return boundaryInk
    }
    for(const width of [960,1400]) {
      window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
      await openVoltaProperties(longMeasures[3].id)
      await select('볼타 선 끝 마디','');await checkLongDisplay(1,false)
      await select('볼타 선 끝 마디',longMeasures[5].id)
      longDisplayChecks.push({width,full:await checkLongDisplay(5,true),boundaryInk:await checkBoundaryInk()})
      await menu('편집','실행 취소');await checkLongDisplay(1,false)
      await menu('편집','다시 실행');await checkLongDisplay(5,true)
      await select('볼타 선 끝 마디',longMeasures[3].id);await checkLongDisplay(3,true)
      await select('볼타 선 끝 마디',longMeasures[5].id);await checkWorkspace()
      const file=path.join(app.getPath('temp'),'chromatics-long-volta-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    const savedLong=JSON.parse(await save()),expectedLong=structuredClone(longVoltaProject.score)
    expectedLong.parts[0].staves[0].measures[1].volta.displayEndMeasureId=longMeasures[5].id
    if(!isDeepStrictEqual(savedLong.score,JSON.parse(JSON.stringify(expectedLong)))) throw new Error('Display endpoint changed repeat semantics or other content')
    await openProject(savedLong);await checkLongDisplay(5,true)
    await menu('파일','MusicXML로 저장')
    await wait('document.querySelector(".editor-status")?.textContent.includes("사용자 지정 표시 범위")','Explicit volta XML loss warning missing')
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-volta-mark")','Full-score long volta PDF missing')
    const fullSystems=await evaluate(`new Set([...document.querySelectorAll('.notation-measure[data-system-index]')].map(node=>node.dataset.systemIndex)).size`)
    if(fullSystems<2) throw new Error('Long volta PDF did not cover multiple systems')
    longDisplayChecks.push({fullScorePdf:true,systems:fullSystems,lines:await checkLongDisplay(5,true),boundaryInk:await checkBoundaryInk()})
    const longDisplayScorePdf=path.join(app.getPath('temp'),'chromatics-long-volta-score.pdf')
    fs.writeFileSync(longDisplayScorePdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'long-volta-score.pdf'})`)
    await menu('형식','악보 및 마디 설정 열기')
    if(await evaluate(`[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='파트와 보표 펼치기')`)) await click('파트와 보표 펼치기')
    await select('악보 보기','part');await select('파트보 선택',otherPart.id)
    longDisplayChecks.push({part:otherPart.id,lines:await checkLongDisplay(5,true)})
    for(const width of [960,1400]) {
      window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
      longDisplayChecks.push({part:otherPart.id,width,boundaryInk:await checkBoundaryInk()})
      const file=path.join(app.getPath('temp'),'chromatics-long-volta-part-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-volta-mark")','Explicit long volta PDF missing')
    longDisplayChecks.push({pdf:true,lines:await checkLongDisplay(5,true),boundaryInk:await checkBoundaryInk()})
    const longDisplayPdf=path.join(app.getPath('temp'),'chromatics-long-volta.pdf')
    fs.writeFileSync(longDisplayPdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'long-volta.pdf'})`)
    if(!isDeepStrictEqual(JSON.parse(await save()).score,savedLong.score)) throw new Error('Part display or PDF mutated native volta content')
    console.log(JSON.stringify({status:'explicit-volta-display',longDisplayChecks,longDisplayPdf,longDisplayScorePdf,nativeReopen:true}))
    const staffSlurPdfs=[], staffSlurChecks=[]
    const checkStaffSlurs = (manual,side,stemmed) => evaluate(`(() => {
      const slurs=[...document.querySelectorAll('.notation-slur')].sort((a,b)=>Number(a.dataset.spanStaffY)-Number(b.dataset.spanStaffY))
      const side=${JSON.stringify(side??null)}
      if(slurs.length!==(side?1:2)) throw new Error('Inward staff slur fixture missing')
      const a=slurs[0].getBBox()
      let gap
      if(side) {
        const other=side==='above'?'below':'above'
        const event=document.querySelector('.notation-event[data-event-id="head-'+other+'-middle"]')
        const head=event.querySelector('.vf-notehead text'),stem=event.querySelector('.vf-stem path')
        if(!head || Boolean(stem)!==${Boolean(stemmed)}) throw new Error('Neighbor fixture ink missing')
        const ctx=document.createElement('canvas').getContext('2d'),style=getComputedStyle(head)
        ctx.font=style.fontSize+' '+style.fontFamily
        const ink=ctx.measureText(head.textContent),y=Number(head.getAttribute('y')),stemBox=stem?.getBBox()
        if(ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent<=0) throw new Error('Missing neighbor glyph ink')
        const top=Math.min(y-ink.actualBoundingBoxAscent,stemBox?.y??Infinity)
        const bottom=Math.max(y+ink.actualBoundingBoxDescent,stemBox?stemBox.y+stemBox.height:-Infinity)
        gap=side==='below'?top-(a.y+a.height):a.y-bottom
      } else {
        const b=slurs[1].getBBox()
        gap=b.y-(a.y+a.height)
      }
      if(gap<11.99) throw new Error('Inward staff ink overlaps: '+JSON.stringify({side,gap}))
      for(const [index,slur] of slurs.entries()) {
        const box=slur.getBBox(), view=slur.ownerSVGElement.viewBox.baseVal
        if(box.y<view.y || box.y+box.height>view.y+view.height) throw new Error('Staff slur outside SVG')
        if(${manual}) {
          const [,y1,,cy,,y2]=slur.dataset.spanHitPath.match(/-?\\d+(?:\\.\\d+)?/g).map(Number)
          if(Math.abs(cy-(index===0?Math.max(y1,y2)+80:Math.min(y1,y2)-80))>0.01)
            throw new Error('Staff gap changed manual slur height')
        }
      }
      return {manual:${manual},side,stemmed:${Boolean(stemmed)},gap,staffOrigins:slurs.map(slur=>Number(slur.dataset.spanStaffY))}
    })()`)
    const staffCases=[{manual:false},{manual:true},...['above','below'].flatMap(side=>[false,true].map(stemmed=>({manual:false,side,stemmed})))]
    for(const {manual,side,stemmed} of staffCases) {
      const name=side?'neighbor-'+side+'-'+(stemmed?'stem':'head'):manual?'manual':'auto'
      const project=structuredClone(savedStemless), original=project.score.parts[0].staves[0]
      project.score.parts[0].staves=['below','above'].map(lane=>{
        const measure=structuredClone(original.measures.find(item=>item.id==='head-measure-'+lane))
        measure.number=1
        if(lane==='above') measure.clef={sign:'F',line:4}
        measure.voices[0].events.forEach((event,index)=>{event.pitch.octave=lane==='below'?(index===1?3:4):(index===1?5:4)})
        if(stemmed) {
          measure.timeSignature={beats:4,beatType:4}
          measure.voices[0].events[1].duration.value='half'
          measure.voices[0].events[2].position.tick=quarterTicks*3
        }
        return {...structuredClone(original),id:'inward-staff-'+lane,measures:[measure]}
      })
      project.score.layout={}
      if(side) project.score.slurs=project.score.slurs.filter(slur=>slur.id.endsWith(side))
      if(manual) project.score.slurs.forEach(slur=>{
        const side=slur.id.endsWith('above')?'above':'below'
        slur.engraving={placement:side,height:8,offsetY:side==='below'?6:-6}
      })
      await openProject(project)
      for(const width of [960,1400]) {
        window.setSize(width,1100);await new Promise(resolve=>setTimeout(resolve,250))
        await checkWorkspace();staffSlurChecks.push({width,...await checkStaffSlurs(manual,side,stemmed)})
        const file=path.join(app.getPath('temp'),'chromatics-staff-slur-'+name+'-'+width+'.png')
        fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
      }
      const saved=JSON.parse(await save())
      if(!isDeepStrictEqual(saved.score,project.score)) throw new Error('Staff slur spacing changed native score')
      await openProject(saved);await checkStaffSlurs(manual,side,stemmed)
      await evaluate('window.__pdf=undefined')
      await menu('파일','내보내기 작업 열기');await click('PDF 변환')
      await wait('window.__pdf && document.querySelector(".notation-slur")','Staff slur PDF missing')
      staffSlurChecks.push({pdf:true,...await checkStaffSlurs(manual,side,stemmed)})
      const file=path.join(app.getPath('temp'),'chromatics-staff-slur-'+name+'.pdf')
      fs.writeFileSync(file,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}));staffSlurPdfs.push(file)
      await evaluate(`window.__resolvePdf({fileName:'staff-slur.pdf'})`)
    }
    console.log(JSON.stringify({status:'staff-slur-spacing',staffSlurChecks,staffSlurPdfs}))
    const extreme = structuredClone(savedStemless)
    extreme.score.parts[0].staves[0].measures[0].voices[0].events[1].pitch.octave=8
    extreme.score.parts[0].staves[0].measures[1].voices[0].events[1].pitch.octave=0
    if (auditSystemSpacing) {
      extreme.score.parts[0].staves[0].measures.reverse()
      extreme.score.layout={systemBreakBeforeMeasureIds:['head-measure-above']}
    }
    await openProject(extreme)
    const checkAutomaticBounds = () => evaluate(`(() => {
      const slurs=[...document.querySelectorAll('.notation-slur')]
      if(slurs.length!==2) throw new Error('Extreme slur fixture missing')
      return slurs.map(slur=>{
        const b=slur.getBBox(), v=slur.ownerSVGElement.viewBox.baseVal
        if(b.x<v.x || b.y<v.y || b.x+b.width>v.x+v.width || b.y+b.height>v.y+v.height)
          throw new Error('Automatic slur outside viewport: '+JSON.stringify({top:b.y,bottom:b.y+b.height,viewportTop:v.y,viewportBottom:v.y+v.height}))
        const adjacent=[]
        if (${auditSystemSpacing}) for(const other of slurs.filter(item=>item!==slur)) {
          const staffY=Number(slur.dataset.spanStaffY), otherY=Number(other.dataset.spanStaffY), otherBox=other.getBBox()
          const staffGap=otherY>staffY?otherY+40-(b.y+b.height):b.y-(otherY+80)
          const curveY=(element,x)=>{
            const path=document.createElementNS('http://www.w3.org/2000/svg','path')
            path.setAttribute('d',element.dataset.spanHitPath)
            let low=0,high=path.getTotalLength()
            for(let i=0;i<24;i++){const mid=(low+high)/2;if(path.getPointAtLength(mid).x<x)low=mid;else high=mid}
            return path.getPointAtLength((low+high)/2).y
          }
          const left=Math.max(b.x,otherBox.x), right=Math.min(b.x+b.width,otherBox.x+otherBox.width)
          let curveGap=Infinity
          for(let i=0;i<=100 && right>left;i++) {
            const x=left+(right-left)*i/100, delta=curveY(other,x)-curveY(slur,x)
            curveGap=Math.min(curveGap,(otherY>staffY?delta:-delta)-3.2)
          }
          adjacent.push({staffY,otherY,staffGap,curveGap})
        }
        return {top:b.y,bottom:b.y+b.height,viewportTop:v.y,viewportBottom:v.y+v.height,adjacent}
      })
    })()`)
    const automaticBounds=[]
    for (const width of [960,1400]) {
      window.setSize(width,1100); await new Promise(resolve=>setTimeout(resolve,250))
      automaticBounds.push({width,bounds:await checkAutomaticBounds()})
      const file=path.join(app.getPath('temp'),'chromatics-extreme-slur-'+width+'.png')
      fs.writeFileSync(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file)
    }
    if(JSON.stringify(JSON.parse(await save()).score)!==JSON.stringify(extreme.score)) throw new Error('Automatic bounds changed score data')
    await evaluate('window.__pdf=undefined')
    await menu('파일','내보내기 작업 열기');await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-slur")','Extreme slur PDF missing')
    const extremePrintBounds=await checkAutomaticBounds()
    const extremePdf=path.join(app.getPath('temp'),'chromatics-extreme-slur.pdf')
    fs.writeFileSync(extremePdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
    await evaluate(`window.__resolvePdf({fileName:'extreme-slur.pdf'})`)
    if (auditSystemSpacing) {
      const samples=[...automaticBounds,{pdf:true,bounds:extremePrintBounds}]
      console.log(JSON.stringify({status:'system-spacing-diagnostic',samples,extremePdf,screenshots:screenshots.filter(file=>file.includes('extreme'))}))
      if(samples.some(sample=>sample.bounds.some(bound=>bound.adjacent.some(pair=>Math.min(pair.staffGap,pair.curveGap)<12))))
        throw new Error('Automatic slur infringes adjacent-system ink clearance')
    }
    console.log(JSON.stringify({status:'passed',output,pdf,segmentOutput,segmentPdf,automaticPdf,stemlessPdf,staccatoPdfs,tupletPdfs,durationDotPdfs,restInkPdfs,beamPdfs,beamChecks,voltaPdf,voltaPdfs,voltaChecks,branchPdf,branchChecks,extremePdf,automaticBounds,screenshots,changes,segmentChanges,automaticSlurs,printPartIds,fileIO:'intercepted App bridge; actual parser, renderer, native disk readback and Electron PDF'}))
    clearTimeout(deadline); app.exit(0)
  } catch(error) {console.error(error);clearTimeout(deadline);app.exit(1)}
}).catch(error=>{console.error(error);clearTimeout(deadline);app.exit(1)})
