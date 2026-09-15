const { app, BrowserWindow } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chromatics-range-span-'))
const globalOnly = process.argv.includes('--global-only')
const baseWidths = process.argv.includes('--scoped-only') || globalOnly ? [] : [960, 1400]
app.setPath('userData', path.join(directory, 'user-data'))
const deadline = setTimeout(() => { console.error('Range span QA timed out'); app.exit(1) }, 120000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1100, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const evaluate = code => window.webContents.executeJavaScript(code).catch(error => {
    throw new Error(`${error.message}\nRenderer command: ${code}`, { cause: error })
  })
  window.webContents.on('console-message', event => {
    if (event.level === 'error') console.error('Renderer:', event.message)
  })
  const settle = () => new Promise(resolve => setTimeout(resolve, 100))
  const wait = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await settle()
    }
    throw new Error('Timed out: ' + expression + '\n' + await evaluate('document.querySelector(".editor-status")?.textContent'))
  }
  const click = async label => {
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.getClientRects().length &&
        (item.getAttribute('aria-label') === ${JSON.stringify(label)} || item.textContent.trim() === ${JSON.stringify(label)}))
      if (!button || button.disabled) throw new Error('Missing enabled button: ' + ${JSON.stringify(label)})
      button.scrollIntoView({block:'nearest',inline:'nearest'}); button.click()
    })()`)
    await settle()
  }
  const select = async (label, value) => {
    await evaluate(`(() => {
      const item = [...document.querySelectorAll('select')].find(item => item.getAttribute('aria-label') === ${JSON.stringify(label)})
      if (!item || item.disabled) throw new Error('Missing select')
      item.value=${JSON.stringify(value)}; item.dispatchEvent(new Event('change',{bubbles:true}))
    })()`)
    await settle()
  }
  const key = async (code, shiftKey = false) => {
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:${JSON.stringify(code)},ctrlKey:true,shiftKey:${shiftKey},bubbles:true}))`)
    await settle()
  }
  const note = async (id, shiftKey = false) => {
    await evaluate(`(() => {
      const item = [...document.querySelectorAll('.notation-event')].find(item => item.dataset.eventId === ${JSON.stringify(id)})
      if (!item) throw new Error('Missing note')
      item.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:${shiftKey}}))
    })()`)
    await settle()
  }
  const save = async name => {
    await evaluate('window.__saved = undefined')
    await key('KeyS')
    await wait('window.__saved')
    const file = path.join(directory, name + '.chromatics')
    fs.writeFileSync(file, await evaluate('window.__saved'))
    return { file, project: JSON.parse(fs.readFileSync(file, 'utf8')) }
  }
  const open = async (file, contents) => {
    await evaluate(`window.__source={filePath:${JSON.stringify(file)},fileName:${JSON.stringify(path.basename(file))},contents:${JSON.stringify(contents)}}`)
    await click('파일'); await click('프로젝트 열기')
    await wait(`document.querySelector('.editor-status')?.textContent.includes(${JSON.stringify(path.basename(file) + '을 열었습니다.')})`)
  }
  try {
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    await wait('document.querySelector(".notation-event")')
    const xml = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/release-qa.musicxml'), 'utf8')
    await evaluate(`void (window.inC={
      musicXml:{open:async()=>({filePath:'/qa/source.musicxml',fileName:'source.musicxml',contents:${JSON.stringify(xml)}}),
        save:async request=>{window.__savedXml=request.contents;return {filePath:'/qa/copied.musicxml',fileName:'copied.musicxml'}}},
      project:{open:async()=>window.__source,save:async request=>{window.__saved=request.contents;return {filePath:'/qa/copied.chromatics',fileName:'copied.chromatics'}}},
      autosave:{read:async()=>null,write:async()=>{},clear:async()=>{}},recentMusicXml:{list:async()=>[],add:async()=>[]}
    })`)
    await click('파일'); await click('MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("source.musicxml을 가져왔습니다.")')
    await click('프로젝트 저장'); await wait('window.__saved')
    const base = JSON.parse(await evaluate('window.__saved'))
    const part = base.score.parts[0], staff = part.staves[0], measure = staff.measures[0]
    const [first, second, third, fourth] = measure.voices[0].events
    const segment = { partId: part.id, staffId: staff.id, startMeasureId: measure.id, endMeasureId: measure.id, geometry: { offsetY: 2 } }
    const engraving = { offsetY: -1, segments: [segment, { ...segment, endMeasureId: staff.measures[1].id }] }
    const partSegment = { ...segment, geometry: { offsetY: 4 } }
    base.score.slurs = [{ id: 'source-slur', startEventId: first.id, endEventId: second.id, engraving }]
    base.score.hairpins = [{ id: 'partial-hairpin', type: 'crescendo', startEventId: second.id, endEventId: third.id }]
    base.score.octaveShifts = [{ id: 'source-octave', type: '8va', startEventId: first.id, endEventId: second.id }]
    base.view = { mode: 'part', partId: part.id }
    const results = []
    for (const width of baseWidths) for (const policy of ['object', 'automatic', 'inherit']) {
      window.setSize(width, 1100)
      const project = structuredClone(base)
      project.partLayouts = [{ partId: part.id, layout: {}, ...(policy === 'inherit' ? {} : {
        spanEngravings: [{ kind: 'slur', spanId: 'source-slur', engraving: policy === 'automatic' ? null : { ...engraving, offsetY: 3, segments: [partSegment, engraving.segments[1]] } }]
      }) }]
      const prefix = `${width}-${policy}`, input = path.join(directory, prefix + '-source.chromatics')
      fs.writeFileSync(input, JSON.stringify(project))
      await open(input, fs.readFileSync(input, 'utf8'))
      await note(first.id); await note(second.id, true); await key('KeyC')
      const copiedStatus = await evaluate('document.querySelector(".editor-status").textContent')
      assert.match(copiedStatus, /부분 포함 표기 1개 제외/)
      assert.equal(copiedStatus.includes('범위 밖 구간 배치 1개 제외'), policy !== 'automatic')
      await click('악보'); await select('악보 보기', 'score')
      await note(third.id); await note(fourth.id, true); await key('KeyV')
      const pastedStatus = await evaluate('document.querySelector(".editor-status").textContent')
      assert.match(pastedStatus, /붙여넣었습니다.*부분 포함 표기 1개 제외/)
      const screenshot = path.join(directory, prefix + '.png')
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      const saved = await save(prefix)
      assert.deepEqual(saved.project.score.slurs[0], project.score.slurs[0])
      assert.deepEqual(saved.project.partLayouts, project.partLayouts)
      const pasted = saved.project.score.slurs[1]
      assert.equal(saved.project.score.octaveShifts.length, 2)
      assert.equal(saved.project.score.octaveShifts[1].startEventId, pasted.startEventId)
      assert.equal(await evaluate('document.querySelectorAll(".notation-octave-shift").length'), 2)
      assert.deepEqual(pasted.engraving, policy === 'automatic' ? undefined : { offsetY: policy === 'object' ? 3 : -1, segments: [policy === 'object' ? partSegment : segment] })
      await key('KeyZ'); assert.deepEqual((await save(prefix + '-undo')).project.score, project.score)
      await key('KeyZ', true); assert.deepEqual((await save(prefix + '-redo')).project.score, saved.project.score)
      await open(saved.file, fs.readFileSync(saved.file, 'utf8'))
      assert.deepEqual((await save(prefix + '-reopened')).project.score, saved.project.score)
      await click('표기 객체'); await select('표기 객체 선택', 'slur:' + pasted.id)
      await evaluate(`document.querySelector('.span-properties__geometry').open=true`)
      assert.equal(await evaluate(`document.querySelector('input[aria-label="표기 세로 이동"]').value`), policy === 'automatic' ? '' : policy === 'object' ? '3' : '-1')
      const bounds = await evaluate(`(() => {
        const span=[...document.querySelectorAll('[data-span-id]')].find(item=>item.dataset.spanId===${JSON.stringify(pasted.id)})
        if (!span) throw new Error('Copied span not rendered')
        const shape=span.querySelector('.notation-slur'), box=shape.getBBox(), view=span.ownerSVGElement.viewBox.baseVal, status=document.querySelector('.editor-status')
        return {relativeY:box.y-Number(shape.getAttribute('data-span-staff-y')),width:box.width,height:box.height,clipped:box.x<view.x-1||box.y<view.y-1||box.x+box.width>view.x+view.width+1||box.y+box.height>view.y+view.height+1,
          statusOverflow:status.scrollWidth>status.clientWidth+1}
      })()`)
      assert.ok(bounds.width > 0 && bounds.height > 0 && !bounds.clipped && !bounds.statusOverflow)
      results.push({width,policy,screenshot,native:saved.file,bounds})
    }
    for (const width of baseWidths) {
      const independent = results.find(item => item.width === width && item.policy === 'object')
      const inherited = results.find(item => item.width === width && item.policy === 'inherit')
      assert.ok(Math.abs(independent.bounds.relativeY - inherited.bounds.relativeY - 20) < 0.1, 'Copied independent segment offset not rendered')
    }
    const objectResults = []
    for (const width of baseWidths) for (const kind of ['slur', 'hairpin']) {
      window.setSize(width, 1100)
      const project = structuredClone(base)
      project.view = { mode: 'score' }
      project.partLayouts = []
      project.score.octaveShifts = []
      const span = { id: 'independent-source', startEventId: first.id, endEventId: second.id, engraving: { offsetY: 2 } }
      project.score.slurs = kind === 'slur' ? [span] : []
      project.score.hairpins = kind === 'hairpin' ? [{ ...span, type: 'crescendo' }] : []
      const prefix = `${width}-independent-${kind}`, input = path.join(directory, prefix + '-source.chromatics')
      fs.writeFileSync(input, JSON.stringify(project))
      await open(input, fs.readFileSync(input, 'utf8'))
      await click('표기 객체'); await select('표기 객체 선택', kind + ':' + span.id)
      await key('KeyC')
      assert.match(await evaluate('document.querySelector(".editor-status").textContent'), /표기 객체를 복사했습니다/)
      await note(third.id); await key('KeyV')
      assert.match(await evaluate('document.querySelector(".editor-status").textContent'), /표기 객체를 붙여넣었습니다/)
      const saved = await save(prefix), collection = kind === 'slur' ? 'slurs' : 'hairpins'
      assert.deepEqual(saved.project.score.parts, project.score.parts)
      assert.equal(saved.project.score[collection].length, 2)
      const pasted = saved.project.score[collection][1]
      assert.equal(pasted.startEventId, third.id); assert.equal(pasted.endEventId, fourth.id)
      assert.deepEqual(pasted.engraving, { offsetY: 2 })
      await wait(`document.querySelector('[data-span-id="${pasted.id}"]')`)
      const screenshot = path.join(directory, prefix + '.png')
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      await key('KeyZ'); assert.deepEqual((await save(prefix + '-undo')).project.score, project.score)
      await key('KeyZ', true); assert.deepEqual((await save(prefix + '-redo')).project.score, saved.project.score)
      await open(saved.file, fs.readFileSync(saved.file, 'utf8'))
      assert.deepEqual((await save(prefix + '-reopened')).project.score, saved.project.score)
      objectResults.push({ width, kind, screenshot, native: saved.file })
    }
    const explicitResults = []
    for (const width of baseWidths) for (const kind of ['slur', 'hairpin']) for (const crossVoiceSource of [false, true]) {
      window.setSize(width, 1100)
      const project = structuredClone(base), targetMeasure = project.score.parts[0].staves[0].measures[0]
      project.view = { mode: 'score' }; project.partLayouts = []
      project.score.octaveShifts = []
      const source = { id: 'explicit-source', startEventId: first.id, endEventId: second.id }
      project.score.slurs = kind === 'slur' ? [source] : []
      project.score.hairpins = kind === 'hairpin' ? [{ ...source, type: 'crescendo' }] : []
      const target = structuredClone(targetMeasure.voices[0])
      target.id = 'explicit-voice'
      for (const event of target.events) {
        event.id = 'explicit-' + event.id
        if (event.type === 'note') event.pitches = [event.pitch, { ...event.pitch, octave: event.pitch.octave + 1 }]
      }
      targetMeasure.voices.push(target)
      const collection = kind === 'slur' ? 'slurs' : 'hairpins'
      if (crossVoiceSource) project.score[collection][0].endEventId = target.events[1].id
      const prefix = `${width}-${crossVoiceSource ? 'cross-voice-source' : 'explicit'}-${kind}`, input = path.join(directory, prefix + '-source.chromatics')
      fs.writeFileSync(input, JSON.stringify(project))
      await open(input, fs.readFileSync(input, 'utf8'))
      await click('표기 객체'); await select('표기 객체 선택', kind + ':' + source.id); await key('KeyC')
      await note(second.id)
      if (crossVoiceSource) {
        assert.equal(await evaluate(`document.querySelector('button[aria-label="표기 대상에 붙여넣기"]').disabled`), true)
        await key('KeyV')
        assert.deepEqual((await save(prefix + '-blocked')).project.score, project.score)
      }
      await select('붙여넣기 끝점', target.events[0].id)
      assert.equal(await evaluate(`document.querySelector('button[aria-label="표기 대상에 붙여넣기"]').disabled`), true)
      await select('붙여넣기 끝점', target.events[3].id)
      const targetScreenshot = path.join(directory, prefix + '-targets.png')
      fs.writeFileSync(targetScreenshot, (await window.webContents.capturePage()).toPNG())
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('.span-paste-targets__address')).some(item=>item.scrollWidth>item.clientWidth+1)`), false)
      await click('표기 대상에 붙여넣기')
      const saved = await save(prefix)
      const pasted = saved.project.score[collection][1]
      assert.deepEqual(saved.project.score.parts, project.score.parts)
      assert.equal(pasted.startEventId, second.id); assert.equal(pasted.endEventId, target.events[3].id)
      await wait(`document.querySelector('[data-span-id="${pasted.id}"]')`)
      const screenshot = path.join(directory, prefix + '.png')
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      const bounds = await evaluate(`(() => {
        const panel=document.querySelector('[aria-label="표기 붙여넣기 대상"]'), controls=[...panel.querySelectorAll('select,button')];
        const boxes=controls.map(item=>{const r=item.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}});
        const span=document.querySelector('[data-span-id="${pasted.id}"]'), box=span.getBBox();
        return {boxes,spanWidth:box.width,spanHeight:box.height,viewport:innerWidth};
      })()`)
      assert.ok(bounds.spanWidth > 0 && bounds.spanHeight > 0)
      assert.ok(bounds.boxes.every(box => box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= bounds.viewport + 1))
      await key('KeyZ'); assert.deepEqual((await save(prefix + '-undo')).project.score, project.score)
      await key('KeyZ', true); assert.deepEqual((await save(prefix + '-redo')).project.score, saved.project.score)
      await open(saved.file, fs.readFileSync(saved.file, 'utf8'))
      assert.deepEqual((await save(prefix + '-reopened')).project.score, saved.project.score)
      explicitResults.push({ width, kind, crossVoiceSource, screenshot, targetScreenshot, native: saved.file, bounds })
    }
    const textResults = []
    for (const width of baseWidths) for (const [type, label] of [
      ['staffTexts', '보표 글자'], ['systemTexts', '시스템 텍스트'], ['rehearsalMarks', '연습표'], ['expressionTexts', '표현 텍스트']
    ]) {
      window.setSize(width, 1100)
      const project = structuredClone(base), measures = project.score.parts[0].staves[0].measures
      project.view = { mode: 'score' }; project.partLayouts = []
      project.score[type] = [
        { id: 'qa-source-text', measureId: measures[0].id, text: 'QA copy text' },
        { id: 'qa-target-text', measureId: measures[1].id, text: 'replace me' }
      ].map(mark => type === 'expressionTexts' ? { ...mark, tick: 0 } : mark)
      const prefix = `${width}-text-${type}`, input = path.join(directory, prefix + '-source.chromatics')
      fs.writeFileSync(input, JSON.stringify(project))
      await open(input, fs.readFileSync(input, 'utf8'))
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${measures[0].id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await click('파일'); await select('표기 필터', type); await key('KeyC')
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${measures[1].id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await settle(); await key('KeyV')
      const saved = await save(prefix)
      assert.deepEqual(saved.project.score, { ...project.score, [type]: saved.project.score[type] })
      assert.equal(saved.project.score[type].length, 2)
      assert.equal(saved.project.score[type][1].text, 'QA copy text')
      assert.equal(saved.project.score[type][1].measureId, measures[1].id)
      assert.notEqual(saved.project.score[type][1].id, 'qa-source-text')
      const visibleTexts = await evaluate(`Array.from(document.querySelectorAll('svg text')).filter(item=>item.getClientRects().length && item.textContent==='QA copy text').length`)
      assert.ok(visibleTexts >= 2, 'Both source and target text must render')
      const screenshot = path.join(directory, prefix + '.png')
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      await evaluate('window.__savedXml=undefined')
      await click('파일'); await click('MusicXML로 저장'); await wait('window.__savedXml')
      const musicxml = path.join(directory, prefix + '.musicxml')
      fs.writeFileSync(musicxml, await evaluate('window.__savedXml'))
      assert.ok(fs.readFileSync(musicxml, 'utf8').includes('QA copy text'))
      await key('KeyZ'); assert.deepEqual((await save(prefix + '-undo')).project.score, project.score)
      await key('KeyZ', true); assert.deepEqual((await save(prefix + '-redo')).project.score, saved.project.score)
      await click('파일'); await click(`선택 마디 ${label} 지우기`)
      assert.equal((await save(prefix + '-delete')).project.score[type].length, 1)
      await open(saved.file, fs.readFileSync(saved.file, 'utf8'))
      assert.deepEqual((await save(prefix + '-reopened')).project.score, saved.project.score)
      textResults.push({ width, type, screenshot, native: saved.file, musicxml, visibleTexts })
    }
    const scopedRehearsalResults = []
    const richXml = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/expanded-v1-part-export.musicxml'), 'utf8')
    await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:'/qa/scoped.musicxml',fileName:'scoped.musicxml',contents:${JSON.stringify(richXml)}}))`)
    await click('파일'); await click('MusicXML 가져오기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("scoped.musicxml을 가져왔습니다.")')
    await click('프로젝트 저장')
    const rich = (await save('scoped-base')).project
    for (const width of globalOnly ? [] : [960, 1400]) {
      window.setSize(width, 1100)
      const project = structuredClone(rich)
      project.view = { mode: 'score' }; project.partLayouts = []
      const source = project.score.parts[0].staves[0].measures[0]
      const targetPart = project.score.parts[1], target = targetPart.staves[1].measures[0]
      project.score.rehearsalMarks = ['Scope A', 'Scope B'].map((text, index) => ({ id: `scoped-${index}`, measureId: source.id, text }))
      const prefix = `${width}-scoped-rehearsal`, input = path.join(directory, prefix + '-source.chromatics')
      fs.writeFileSync(input, JSON.stringify(project)); await open(input, fs.readFileSync(input, 'utf8'))
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${source.id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await click('파일'); await select('표기 필터', 'rehearsalMarks'); await key('KeyC')
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${target.id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await settle(); await key('KeyV')
      const saved = await save(prefix)
      assert.deepEqual(saved.project.score.parts, project.score.parts)
      assert.equal(saved.project.score.rehearsalMarks.length, 4)
      assert.deepEqual(saved.project.score.rehearsalMarks.filter(mark => mark.measureId === target.id).map(mark => mark.text), ['Scope A', 'Scope B'])
      const boxes = await evaluate(`Array.from(document.querySelectorAll('.notation-rehearsal-mark')).filter(item=>item.textContent.startsWith('Scope ')).map(item=>{
        const b=item.querySelector('rect').getBBox(),text=item.querySelector('text'),style=getComputedStyle(text);
        const context=document.createElement('canvas').getContext('2d');context.font=style.font;context.textAlign='center';
        const metrics=context.measureText(text.textContent),x=text.x.baseVal[0].value,y=text.y.baseVal[0].value;
        return {x:b.x,y:b.y,width:b.width,height:b.height,text:item.textContent,
          glyph:{left:x-metrics.actualBoundingBoxLeft,right:x+metrics.actualBoundingBoxRight,top:y-metrics.actualBoundingBoxAscent,bottom:y+metrics.actualBoundingBoxDescent}};
      })`)
      assert.equal(boxes.length, 4)
      assert.ok(boxes.every(box=>box.glyph.left>=box.x && box.glyph.right<=box.x+box.width && box.glyph.top>=box.y && box.glyph.bottom<=box.y+box.height), 'Actual rehearsal glyphs must fit their boxes: '+JSON.stringify(boxes))
      const sorted = [...boxes].sort((a,b)=>a.y-b.y)
      const screenshot = path.join(directory, prefix + '.png')
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      for (let index=1;index<sorted.length;index++) assert.ok(sorted[index].y >= sorted[index-1].y + sorted[index-1].height, 'Scoped rehearsal boxes must not overlap: '+JSON.stringify({boxes,screenshot}))
      await key('KeyZ'); assert.deepEqual((await save(prefix+'-undo')).project.score, project.score)
      await key('KeyZ',true); assert.deepEqual((await save(prefix+'-redo')).project.score, saved.project.score)
      await open(saved.file, fs.readFileSync(saved.file,'utf8'))
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${target.id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await click('표기 객체')
      const selectedMarkId = saved.project.score.rehearsalMarks.filter(mark=>mark.measureId===target.id)[1].id
      await select('연습표 객체 선택',selectedMarkId)
      const editRehearsal = async value => {
        await evaluate(`(() => { const input=document.querySelector('input[aria-label="연습표"]');input.focus();input.value=${JSON.stringify(value)};input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));input.blur() })()`)
        await settle()
      }
      await editRehearsal('Scope C')
      const edited = await save(prefix+'-object-edit')
      assert.deepEqual(edited.project.score.rehearsalMarks.filter(mark=>mark.measureId===target.id).map(mark=>mark.text),['Scope A','Scope C'])
      assert.deepEqual(edited.project.score.rehearsalMarks.filter(mark=>mark.measureId===source.id),project.score.rehearsalMarks)
      const objectScreenshot = path.join(directory,prefix+'-object-selection.png')
      fs.writeFileSync(objectScreenshot,(await window.webContents.capturePage()).toPNG())
      const chooserBounds = await evaluate(`(() => { const r=document.querySelector('[aria-label="연습표 객체 선택"]').getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,viewport:innerWidth} })()`)
      assert.ok(chooserBounds.width>0 && chooserBounds.height>0 && chooserBounds.left>=0 && chooserBounds.right<=chooserBounds.viewport+1)
      await key('KeyZ'); assert.deepEqual((await save(prefix+'-object-edit-undo')).project.score,saved.project.score)
      await select('연습표 객체 선택',''); await editRehearsal('Scope D')
      assert.equal((await save(prefix+'-object-add')).project.score.rehearsalMarks.length,5)
      await key('KeyZ'); assert.deepEqual((await save(prefix+'-object-add-undo')).project.score,saved.project.score)
      await select('연습표 객체 선택',selectedMarkId); await editRehearsal('')
      const removed = (await save(prefix+'-object-delete')).project.score
      assert.equal(removed.rehearsalMarks.length,3)
      assert.ok(!removed.rehearsalMarks.some(mark=>mark.id===selectedMarkId))
      await key('KeyZ'); assert.deepEqual((await save(prefix+'-object-delete-undo')).project.score,saved.project.score)
      await click('악보'); await select('악보 보기','part'); await select('파트보 선택',targetPart.id)
      assert.equal(await evaluate(`document.querySelectorAll('.notation-rehearsal-mark').length`), 2)
      await select('파트보 선택',project.score.parts[0].id)
      assert.equal(await evaluate(`document.querySelectorAll('.notation-rehearsal-mark').length`), 2)
      await evaluate('window.__savedXml=undefined'); await click('파일'); await click('MusicXML로 저장'); await wait('window.__savedXml')
      const musicxml = path.join(directory,prefix+'.musicxml'), exported = await evaluate('window.__savedXml')
      fs.writeFileSync(musicxml,exported)
      await evaluate(`void (window.inC.musicXml.open=async()=>({filePath:${JSON.stringify(musicxml)},fileName:${JSON.stringify(path.basename(musicxml))},contents:${JSON.stringify(exported)}}))`)
      await click('MusicXML 가져오기'); await wait(`document.querySelector('.editor-status')?.textContent.includes(${JSON.stringify(path.basename(musicxml)+'을 가져왔습니다.')})`)
      await click('프로젝트 저장')
      const reopened = (await save(prefix+'-xml-reopened')).project.score
      assert.equal(reopened.rehearsalMarks.length,4)
      assert.equal(reopened.rehearsalMarks.filter(mark=>mark.measureId===reopened.parts[1].staves[1].measures[0].id).length,2)
      scopedRehearsalResults.push({width,screenshot,objectScreenshot,chooserBounds,native:saved.file,editedNative:edited.file,musicxml,boxes})
    }
    const globalResults = []
    for (const width of [960,1400]) for (const partId of [undefined,rich.score.parts[1].id,rich.score.parts[0].id]) {
      window.setSize(width,1100)
      const project=structuredClone(rich), lower=project.score.parts[1].staves[1].measures[0].id
      project.view=partId ? {mode:'part',partId} : {mode:'score'};project.partLayouts=[]
      project.score.rehearsalMarks=[{id:'global-qa',measureId:'measure-1',text:'Global QA'},{id:'local-qa',measureId:lower,text:'Local QA'}]
      project.score.systemTexts=[{id:'global-system-qa',measureId:'measure-1',text:'Tutti QA'}]
      project.score.tempoEvents=[{id:'global-tempo-qa',measureId:'measure-1',tick:0,bpm:112}]
      const prefix=`${width}-global-${partId ?? 'score'}`,input=path.join(directory,prefix+'.chromatics')
      fs.writeFileSync(input,JSON.stringify(project));await open(input,fs.readFileSync(input,'utf8'))
      const top=(partId ? project.score.parts.find(part=>part.id===partId) : project.score.parts[0]).staves[0].measures[0].id
      const check = async () => {
        const state=await evaluate(`({
          rehearsals:[...document.querySelectorAll('.notation-rehearsal-mark')].map(item=>item.textContent),
          lyrics:[...document.querySelectorAll('.notation-lyric')].map(item=>item.textContent),
          articulations:document.querySelectorAll('.notation-articulation').length,
          systems:[...document.querySelectorAll('.notation-system-text')].map(item=>({text:item.textContent,measureId:item.dataset.measureId})),
          tempos:[...document.querySelectorAll('.notation-tempo-marking--positioned')].map(item=>({text:item.textContent,measureId:item.dataset.measureId}))
        })`)
        assert.deepEqual(state.rehearsals,partId===project.score.parts[0].id ? ['Global QA'] : ['Global QA','Local QA'])
        assert.deepEqual(state.systems,[{text:'Tutti QA',measureId:top}])
        assert.deepEqual(state.lyrics,partId===project.score.parts[0].id ? [] : ['Sing'])
        assert.equal(state.articulations,partId===project.score.parts[0].id ? 0 : 1)
        assert.equal(state.tempos.length,1);assert.equal(state.tempos[0].measureId,top);assert.ok(state.tempos[0].text.includes('112'))
        return state
      }
      const state=await check(),screenshot=path.join(directory,prefix+'.png')
      fs.writeFileSync(screenshot,(await window.webContents.capturePage()).toPNG())
      assert.deepEqual((await save(prefix+'-unchanged')).project.score,project.score)
      await evaluate(`document.querySelector('.notation-measure[data-measure-id="${top}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
      await click('표기 객체');await select('연습표 객체 선택','global-qa')
      assert.match(await evaluate(`document.querySelector('[aria-label="연습표 객체 선택"]').selectedOptions[0].textContent`),/전체/)
      await evaluate(`(() => {const input=document.querySelector('input[aria-label="연습표"]');input.focus();input.value='Global B';input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));input.blur()})()`)
      await settle()
      const globalEdited=(await save(prefix+'-global-edit')).project.score
      assert.deepEqual(globalEdited.rehearsalMarks,[{...project.score.rehearsalMarks[0],text:'Global B'},project.score.rehearsalMarks[1]])
      assert.deepEqual(globalEdited.parts,project.score.parts)
      assert.ok((await evaluate(`[...document.querySelectorAll('.notation-rehearsal-mark')].map(item=>item.textContent)`)).includes('Global B'))
      await key('KeyZ');assert.deepEqual((await save(prefix+'-global-undo')).project.score,project.score)
      await check()
      if(partId!==project.score.parts[0].id) {
        await evaluate(`document.querySelector('.notation-lyric').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
        await wait('document.querySelector(".notation-lyric-editor input")')
        await evaluate(`(() => {const input=document.querySelector('.notation-lyric-editor input');input.value='Sung';input.dispatchEvent(new Event('blur'))})()`)
        await settle();await click('파일')
        const edited=(await save(prefix+'-lyric-edit')).project.score
        assert.equal(edited.parts[1].staves[0].measures[0].voices[0].events[0].lyrics[0].text,'Sung')
        await key('KeyZ');assert.deepEqual((await save(prefix+'-lyric-undo')).project.score,project.score)
        await check()
      }
      let pdf
      if(width===1400) {
        await evaluate(`void (window.inC.pdf={save:request=>new Promise(resolve=>{window.__pdf=request;window.__resolvePdf=resolve})})`)
        await evaluate('window.__pdf=undefined');await click('내보내기');await click('PDF 변환');await wait('window.__pdf')
        await check()
        pdf=path.join(directory,prefix+'.pdf')
        fs.writeFileSync(pdf,await window.webContents.printToPDF({preferCSSPageSize:true,printBackground:false}))
        await evaluate(`window.__resolvePdf({filePath:${JSON.stringify(pdf)},fileName:${JSON.stringify(path.basename(pdf))}})`)
        await settle()
      }
      globalResults.push({width,partId:partId ?? 'score',screenshot,pdf,state})
    }
    console.log(JSON.stringify({status:'passed',directory,results,objectResults,explicitResults,textResults,scopedRehearsalResults,globalResults,evidence:'DOM commands, actual renderer/native disk readback; intercepted file dialogs, not manual QA'},null,2))
    clearTimeout(deadline); window.destroy(); app.quit()
  } catch (error) { console.error(error); clearTimeout(deadline); app.exit(1) }
}).catch(error => { console.error(error); clearTimeout(deadline); app.exit(1) })
