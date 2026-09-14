const { app, BrowserWindow } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chromatics-range-span-'))
app.setPath('userData', path.join(directory, 'user-data'))
const deadline = setTimeout(() => { console.error('Range span QA timed out'); app.exit(1) }, 90000)
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1100, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } })
  const evaluate = code => window.webContents.executeJavaScript(code)
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
      musicXml:{open:async()=>({filePath:'/qa/source.musicxml',fileName:'source.musicxml',contents:${JSON.stringify(xml)}})},
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
    for (const width of [960, 1400]) for (const policy of ['object', 'automatic', 'inherit']) {
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
    for (const width of [960, 1400]) {
      const independent = results.find(item => item.width === width && item.policy === 'object')
      const inherited = results.find(item => item.width === width && item.policy === 'inherit')
      assert.ok(Math.abs(independent.bounds.relativeY - inherited.bounds.relativeY - 20) < 0.1, 'Copied independent segment offset not rendered')
    }
    const objectResults = []
    for (const width of [960, 1400]) for (const kind of ['slur', 'hairpin']) {
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
    console.log(JSON.stringify({status:'passed',directory,results,objectResults,evidence:'DOM commands, actual renderer/native disk readback; intercepted file dialogs, not manual QA'},null,2))
    clearTimeout(deadline); window.destroy(); app.quit()
  } catch (error) { console.error(error); clearTimeout(deadline); app.exit(1) }
}).catch(error => { console.error(error); clearTimeout(deadline); app.exit(1) })
