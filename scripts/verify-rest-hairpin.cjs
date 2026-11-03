const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const out = path.resolve(process.env.DDIRORI_REST_HAIRPIN_OUT || 'out/ddirori/rest-hairpin')
fs.mkdirSync(out, { recursive: true })
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ddirori-rest-hairpin-')))
const deadline = setTimeout(() => { console.error('Rest hairpin verifier deadline'); app.exit(1) }, 90000)

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1000, show: true,
    webPreferences: { contextIsolation: true, sandbox: true } })
  window.webContents.on('console-message', event => {
    if (event.level === 'error') console.error(event.message)
  })
  const evaluate = source => window.webContents.executeJavaScript(source)
  const waitFor = async (condition, label) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`Boolean(${condition})`)) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(label + ': ' + await evaluate('document.querySelector(".editor-status")?.textContent'))
  }
  const findButton = label => `([...document.querySelectorAll('button')].find(item =>
    (item.getAttribute('aria-label') === ${JSON.stringify(label)} || item.textContent.trim() === ${JSON.stringify(label)}) && item.getClientRects().length))`
  const settle = () => evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))')
  const nativeReady = async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (window.isFocused() && window.webContents.isFocused() && await evaluate('document.hasFocus()')) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw Error('Native window/content/document focus unavailable')
  }
  const clickButton = async label => {
    await nativeReady()
    await waitFor(`${findButton(label)} && !${findButton(label)}.disabled`, 'Visible enabled command missing: ' + label)
    const point = await evaluate(`(() => {
    const label = ${JSON.stringify(label)}
    const button = [...document.querySelectorAll('button')].find(item =>
      (item.getAttribute('aria-label') === label || item.textContent.trim() === label) && item.getClientRects().length)
    if (!button || button.disabled) throw new Error('Visible enabled command missing: ' + label)
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const box = button.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight || !button.contains(document.elementFromPoint(x, y))) {
      throw new Error('Command clipped or occluded: ' + label)
    }
    return { x: Math.round(x), y: Math.round(y) }
  })()`)
    window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
    window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
    await settle()
  }
  const click = async label => {
    if (label === '파일') { await clickButton('파일'); await clickButton('파일 작업 열기'); return }
    if (label === '표기 객체') {
      await clickButton('추가'); await clickButton('표기 팔레트 열기')
      if (!await evaluate('([...document.querySelectorAll(\'.studio-notation-palette button\')].find(node => node.textContent.trim() === "범위 기호 설정 열기"))?.checkVisibility()')) {
        await clickButton('범위 기호')
      }
      await clickButton('범위 기호 설정 열기'); return
    }
    if (label === '내보내기') { await clickButton('파일'); await clickButton('내보내기 설정'); return }
    await clickButton(label)
  }
  const combo = label => `([...document.querySelectorAll('.studio-span-properties [role="combobox"]')].find(node => [...document.querySelectorAll('label')].some(item => item.htmlFor === node.id && item.textContent.trim() === ${JSON.stringify(label)})))`
  const choose = async (label, value) => {
    const target = combo(label)
    await waitFor(`${target} && ${target}.checkVisibility() && !${target}.disabled`, 'Public Select unavailable: ' + label)
    await evaluate(`${target}.focus(); ${target}.click()`)
    await settle()
    await evaluate(`(() => { const option = [...document.querySelectorAll('[role="listbox"] [role="option"]')].find(node => node.dataset.value === ${JSON.stringify(value)} && node.checkVisibility()); if (!option || option.getAttribute('aria-disabled') === 'true') throw Error('Public option unavailable'); option.click() })()`)
    await settle()
  }
  const openGeometry = async () => {
    const button = 'document.querySelector(\'.studio-span-properties__geometry button[aria-expanded]\')'
    await waitFor(`${button} && ${button}.checkVisibility()`, 'Geometry disclosure unavailable')
    if (await evaluate(`${button}.getAttribute('aria-expanded')`) !== 'true') await clickButton('배치 · 형상')
  }
  const selectedValue = async label => {
    await evaluate(`${combo(label)}.click()`); await settle()
    const value = await evaluate('document.querySelector(\'[role="listbox"] [role="option"][aria-selected="true"]\')?.dataset.value')
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
    await settle(); return value
  }
  try {
    console.log('stage: load owned renderer and import authored rest fixture')
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    window.focus(); window.webContents.focus()
    await waitFor('document.querySelector(".notation-event")', 'Initial notation missing')
    const input = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/rest-hairpin-input.musicxml'), 'utf8')
    const output = path.join(out, 'chromatics-rest-hairpin.musicxml')
    await evaluate(`void (window.inC = {
      musicXml: {
        open: async () => ({ fileName: 'rest-hairpin-input.musicxml', filePath: '/headless/input.musicxml', contents: ${JSON.stringify(input)} }),
        save: async request => { window.__hairpinXml = request.contents; return { fileName: 'chromatics-rest-hairpin.musicxml', filePath: ${JSON.stringify(output)} } }
      },
      recentMusicXml: { add: async () => [], list: async () => [] },
      autosave: { clear: async () => {}, write: async () => {}, read: async () => null }
    })`)
    await click('파일')
    await click('MusicXML 가져오기')
    await waitFor('document.querySelectorAll(\'.notation-event[data-voice-id="voice-2"]\').length === 4', 'Imported voice missing')
    await click('표기 객체')
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[3].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))`)
    await waitFor('document.querySelector(\'button[aria-label="크레셴도 헤어핀"]\')', 'Range command missing')
    await click('크레셴도 헤어핀')
    console.log('stage: rest-range hairpin undo/redo and XML reopen')
    await waitFor('document.querySelector(".notation-hairpin")', 'Rest hairpin not rendered')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', ctrlKey: true, bubbles: true }))`)
    await waitFor('!document.querySelector(".notation-hairpin")', 'Undo left the hairpin visible')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))`)
    await waitFor('document.querySelector(".notation-hairpin")', 'Redo lost the hairpin')
    await click('파일')
    await click('MusicXML로 저장')
    await waitFor('typeof window.__hairpinXml === "string"', 'XML save did not finish')
    fs.writeFileSync(output, await evaluate('window.__hairpinXml'))
    const saved = fs.readFileSync(output, 'utf8')
    await evaluate(`void (window.inC.musicXml.open = async () => ({ filePath: ${JSON.stringify(output)}, fileName: 'chromatics-rest-hairpin.musicxml', contents: ${JSON.stringify(saved)} }))`)
    await click('MusicXML 가져오기')
    await waitFor('document.querySelector(".editor-status")?.textContent.includes("chromatics-rest-hairpin.musicxml") && document.querySelector(".notation-hairpin")', 'Reopened XML lost renderer hairpin')
    await click('표기 객체')
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[3].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))`)
    const bounds = []
    console.log('stage: 960/1400 range command and engraving containment')
    for (const width of [960, 1400]) {
      window.setSize(width, 1000)
      await new Promise(resolve => setTimeout(resolve, 300))
      const result = await evaluate(`(() => {
        const group = document.querySelector('.notation-hairpin')
        const box = group.getBoundingClientRect()
        const svg = group.ownerSVGElement.getBoundingClientRect()
        const notes = [...document.querySelectorAll('.notation-event[data-voice-id="voice-2"] .vf-stem')]
        const stemBottom = Math.max(...notes.map(note => note.getBoundingClientRect().bottom))
        const palette = document.querySelector('.studio-range-tools')
        const controls = [...palette.querySelectorAll('button')]
        const paletteAccessible = controls.length === 7 && controls.every(button => {
          const rect = button.getBoundingClientRect()
          return rect.width >= 28 && rect.height >= 28 && rect.left >= 0 && rect.right <= innerWidth &&
            rect.top >= 0 && rect.bottom <= innerHeight && button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
        })
        return { width: box.width, height: box.height, lines: group.querySelectorAll('line').length,
          paletteAccessible,
          restRangeDisabledControls: controls.filter(button => button.disabled).length,
          dynamicsDisabled: [...document.querySelectorAll('.studio-notation-palette__dynamics button')].every(button => button.disabled),
          contextHeight: document.querySelector('.studio-status').getBoundingClientRect().height,
          stemClearance: box.top - stemBottom,
          inside: box.left >= svg.left && box.right <= svg.right && box.top >= svg.top && box.bottom <= svg.bottom,
          voiceEvents: document.querySelectorAll('.notation-event[data-voice-id="voice-2"]').length }
      })()`)
      if (!result.paletteAccessible || !result.dynamicsDisabled || result.restRangeDisabledControls !== 5 || result.contextHeight > 90 || !result.inside || !Number.isFinite(result.stemClearance) || result.stemClearance < 6 || result.lines !== 2 || result.width <= 0 || result.height <= 0 || result.voiceEvents !== 4) {
        throw new Error('Invalid rendered hairpin at ' + width + ': ' + JSON.stringify(result))
      }
      const screenshot = path.join(out, `chromatics-rest-hairpin-${width}.png`)
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      bounds.push({ viewport: width, ...result, screenshot })
    }
    const readNoteYs = `Array.from(document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')).slice(1, 3).map(note => note.getBBox().y)`
    const originalNoteYs = await evaluate(readNoteYs)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))`)
    await click('8va')
    await waitFor('document.querySelector(".notation-octave-shift")', 'Octave line not rendered')
    await evaluate('void (window.__hairpinXml = undefined)')
    await click('파일')
    await click('MusicXML로 저장')
    await waitFor('typeof window.__hairpinXml === "string"', 'Octave XML save missing')
    const octaveXml = await evaluate('window.__hairpinXml')
    const octaveOutput = path.join(out, 'chromatics-octave-hairpin.musicxml')
    fs.writeFileSync(octaveOutput, octaveXml)
    const pitchContract = await evaluate(`(() => {
      const xml = new DOMParser().parseFromString(window.__hairpinXml, 'application/xml')
      return { direction: xml.querySelector('octave-shift')?.getAttribute('type'),
        octaves: [...xml.querySelectorAll('note')].filter(note => note.querySelector('voice')?.textContent === '2' && note.querySelector('pitch')).map(note => Number(note.querySelector('octave').textContent)) }
    })()`)
    if (pitchContract.direction !== 'down' || JSON.stringify(pitchContract.octaves) !== '[5,5]') throw new Error('Wrong octave XML pitch: ' + JSON.stringify(pitchContract))
    await evaluate(`void (window.inC.musicXml.open = async () => ({ filePath: ${JSON.stringify(octaveOutput)}, fileName: 'chromatics-octave-hairpin.musicxml', contents: ${JSON.stringify(fs.readFileSync(octaveOutput, 'utf8'))} }))`)
    await click('MusicXML 가져오기')
    await waitFor('document.querySelector(".editor-status")?.textContent.includes("chromatics-octave-hairpin.musicxml") && document.querySelector(".notation-octave-shift")', 'Octave XML reopen missing')
    const reopenedNoteYs = await evaluate(readNoteYs)
    if (JSON.stringify(reopenedNoteYs) !== JSON.stringify(originalNoteYs)) throw new Error('Displayed octave changed on reopen')
    const octaveScreenshot = path.join(out, 'chromatics-octave-hairpin-1400.png')
    fs.writeFileSync(octaveScreenshot, (await window.webContents.capturePage()).toPNG())
    const spanScreenshots = []
    console.log('stage: native span hit and public property controls')
    for (const width of [960, 1400]) {
      window.setSize(width, 1000)
      await new Promise(resolve => setTimeout(resolve, 250))
      const point = await evaluate(`(() => {
        const target = document.querySelector('.notation-span-target[data-span-kind="hairpin"]')
        target.scrollIntoView({ block: 'center' })
        const hit = target.querySelector('.notation-span-hit')
        const local = hit.getPointAtLength(hit.getTotalLength() / 4)
        const point = new DOMPoint(local.x, local.y).matrixTransform(hit.getScreenCTM())
        if (!target.contains(document.elementFromPoint(point.x, point.y))) throw new Error('Span click target occluded')
        return { x: Math.round(point.x), y: Math.round(point.y) }
      })()`)
      await nativeReady()
      window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
      window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
      await settle(); await waitFor(`document.querySelector('.notation-span-target.is-selected') && ${combo('표기 끝점')}`, 'Actual span click did not select object')
      const layout = await evaluate(`(async () => {
        const panel = document.querySelector('.studio-span-properties')
        const controls = [...panel.querySelectorAll('button')].filter(control => control.checkVisibility())
        const measured = []
        for (const control of controls) {
          control.focus()
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          const rect = control.getBoundingClientRect(), footer = document.querySelector('.studio-status').getBoundingClientRect()
          measured.push({ role: control.getAttribute('role'), label: control.getAttribute('aria-label') || control.textContent.trim(),
            box: rect.toJSON(), enabled: !control.disabled, focused: document.activeElement === control,
            accessible: rect.width >= 28 && rect.height >= 28 && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= Math.min(innerHeight, footer.top) && control.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) })
        }
        return { controls: controls.length, overflow: panel.scrollWidth > panel.clientWidth + 1,
          measured, accessible: measured.every(item => item.accessible && item.enabled && item.focused),
          endpointComboboxes: measured.filter(item => item.role === 'combobox').length }
      })()`)
      // Three public Select triggers, two actions and two disclosures replace
      // the old five native controls. A bounded dock scrolls each into view.
      if (layout.overflow || !layout.accessible || layout.controls !== 7 || layout.endpointComboboxes !== 3) throw new Error('Span properties clipped: ' + JSON.stringify(layout))
      await new Promise(resolve => setTimeout(resolve, 250))
      const screenshot = path.join(out, `chromatics-span-properties-${width}.png`)
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      spanScreenshots.push({ width, screenshot, ...layout })
    }
    const editedEnd = await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[2].dataset.eventId`)
    console.log('stage: endpoint, manual geometry, reset, undo and native reopen')
    await choose('표기 끝점', editedEnd)
    if (await selectedValue('표기 끝점') !== editedEnd) throw Error('Endpoint edit missing')
    const readGeometry = `(() => { const box = document.querySelector('.notation-hairpin').getBBox(); return { x: box.x, y: box.y + box.height / 2, height: box.height } })()`
    const autoGeometry = await evaluate(readGeometry)
    await openGeometry()
    const editGeometry = async (label, value) => {
      await evaluate(`(async () => {
        const input = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]')
        if (!input || input.disabled || !input.checkVisibility()) throw Error('Geometry input unavailable')
        input.focus(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const box = input.getBoundingClientRect(), limit = Math.min(innerHeight, document.querySelector('.studio-status').getBoundingClientRect().top)
        if (document.activeElement !== input || box.top < 0 || box.bottom > limit || box.left < 0 || box.right > innerWidth || !input.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))) throw Error('Geometry input clipped')
      })()`)
      await evaluate(`(() => { const input = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]'); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))}); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
      await evaluate(`(() => { const input = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]'); input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); input.blur() })()`)
    }
    await editGeometry('표기 가로 이동', 1.5)
    await editGeometry('표기 세로 이동', 2)
    await editGeometry('표기 높이', 3)
    const manualGeometry = await evaluate(readGeometry)
    const manualInsideViewport = await evaluate(`(() => { const mark = document.querySelector('.notation-hairpin'); const box = mark.getBBox(); const view = mark.ownerSVGElement.viewBox.baseVal; return box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height })()`)
    if (!manualInsideViewport) throw new Error('Manual span clipped by SVG viewport')
    if (Math.abs(manualGeometry.x - autoGeometry.x - 15) > 0.1 || Math.abs(manualGeometry.y - autoGeometry.y - 20) > 0.1 || manualGeometry.height !== 30) throw new Error('Manual geometry not rendered: ' + JSON.stringify({ autoGeometry, manualGeometry, inputs: await evaluate(`Array.from(document.querySelectorAll('.studio-span-properties input')).map(input => ({ value: input.value, valid: input.validity.valid }))`), status: await evaluate('document.querySelector(".editor-status").textContent') }))
    await click('표기 자동 배치 복원')
    const resetGeometry = await evaluate(readGeometry)
    if (JSON.stringify(resetGeometry) !== JSON.stringify(autoGeometry)) throw new Error('Auto reset did not restore renderer')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }))`)
    await waitFor(`document.querySelector('.notation-hairpin').getBBox().height === 30`, 'Geometry undo missing')
    const nativeOutput = path.join(out, 'chromatics-span-properties.chromatics')
    await evaluate(`void (window.inC.project = {
      save: async request => { window.__spanNative = request.contents; return { fileName: 'chromatics-span-properties.chromatics', filePath: ${JSON.stringify(nativeOutput)} } }
    })`)
    await click('파일')
    await click('프로젝트 저장')
    await waitFor('typeof window.__spanNative === "string"', 'Native span save missing')
    fs.writeFileSync(nativeOutput, await evaluate('window.__spanNative'))
    const nativeContents = fs.readFileSync(nativeOutput, 'utf8')
    const nativeSpan = JSON.parse(nativeContents).score.hairpins[0]
    if (nativeSpan.endEventId !== editedEnd || nativeSpan.engraving?.offsetX !== 1.5 || nativeSpan.engraving?.offsetY !== 2 || nativeSpan.engraving?.height !== 3) throw new Error('Native endpoint/geometry differs')
    await evaluate(`void (window.inC.project.open = async () => ({ fileName: 'chromatics-span-properties.chromatics', filePath: ${JSON.stringify(nativeOutput)}, contents: ${JSON.stringify(nativeContents)} }))`)
    await click('프로젝트 열기')
    await waitFor('document.querySelector(".editor-status")?.textContent.includes("chromatics-span-properties.chromatics")', 'Native reopen missing')
    if (JSON.stringify(await evaluate(readGeometry)) !== JSON.stringify(manualGeometry)) throw new Error('Native reopened geometry differs')
    if (await evaluate('Boolean(document.querySelector(".notation-span-target.is-selected"))')) throw new Error('Stale span selection leaked into reopened document')
    await click('도구'); await clickButton('범위 표기 찾기')
    await choose('표기 객체 선택', 'hairpin:' + nativeSpan.id)
    if (await selectedValue('표기 끝점') !== editedEnd) throw Error('Native reopened endpoint differs')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))`)
    await waitFor('!document.querySelector(".notation-hairpin")', 'Span Delete did not update renderer')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }))`)
    await waitFor('document.querySelector(".notation-hairpin")', 'Span undo did not restore renderer')
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))`)
    await click('표기 객체')
    await click('슬러 추가 또는 해제, 단축키 S')
    console.log('stage: slur curvature/reset/undo and native output')
    await waitFor('document.querySelector(".notation-slur")', 'Slur missing')
    await evaluate(`document.querySelector('.notation-span-target[data-span-kind="slur"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
    await waitFor('document.querySelector(".notation-span-target.is-selected")?.dataset.spanKind === "slur"', 'Slur keyboard selection missing')
    const autoSlur = await evaluate('document.querySelector(".notation-slur").getAttribute("d")')
    await openGeometry()
    await editGeometry('표기 높이', 4)
    const manualSlur = await evaluate('document.querySelector(".notation-slur").getAttribute("d")')
    if (autoSlur === manualSlur) throw new Error('Slur curvature did not change')
    await click('표기 자동 배치 복원')
    if (await evaluate('document.querySelector(".notation-slur").getAttribute("d")') !== autoSlur) throw new Error('Slur auto reset differs')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }))`)
    await waitFor(`document.querySelector('.notation-slur').getAttribute('d') === ${JSON.stringify(manualSlur)}`, 'Slur geometry undo missing')
    await click('파일')
    await evaluate('void (window.__spanNative = undefined)')
    await click('프로젝트 저장')
    await waitFor('typeof window.__spanNative === "string"', 'Slur native save missing')
    fs.writeFileSync(nativeOutput, await evaluate('window.__spanNative'))
    const finalNative = JSON.parse(fs.readFileSync(nativeOutput, 'utf8'))
    if (finalNative.score.slurs[0].engraving?.height !== 4) throw new Error('Slur geometry not saved')
    const geometryScreenshot = path.join(out, 'chromatics-span-geometry-1400.png')
    await new Promise(resolve => setTimeout(resolve, 250))
    fs.writeFileSync(geometryScreenshot, (await window.webContents.capturePage()).toPNG())
    await evaluate(`void (window.inC.pdf = { save: request => new Promise(resolve => { window.__pdfRequest = request; window.__resolvePdf = resolve }) })`)
    await click('내보내기')
    console.log('stage: immutable PDF renderer and actual PDF output')
    await click('PDF 변환')
    await waitFor('window.__pdfRequest && document.querySelector(".studio-pdf-snapshot .notation-hairpin")', 'Print renderer missing')
    const printGeometry = await evaluate(readGeometry.replace("'.notation-hairpin'", "'.studio-pdf-snapshot .notation-hairpin'"))
    if (printGeometry.height !== 30 || await evaluate('Boolean(document.querySelector(".studio-pdf-snapshot .notation-span-target"))')) throw new Error('Print geometry/selection isolation failed')
    const pdfOutput = path.join(out, 'chromatics-span-geometry.pdf')
    fs.writeFileSync(pdfOutput, await window.webContents.printToPDF({ preferCSSPageSize: true, printBackground: false }))
    await evaluate(`window.__resolvePdf({ fileName: 'chromatics-span-geometry.pdf', filePath: ${JSON.stringify(pdfOutput)} })`)
    const result = { status: 'passed', output, bounds, octaveOutput, octaveScreenshot, pitchContract, originalNoteYs, reopenedNoteYs, spanScreenshots, nativeOutput, nativeSpan, autoGeometry, manualGeometry, autoSlur, manualSlur, geometryScreenshot, pdfOutput, printGeometry,
      input: 'Native pointer buttons/span hit paths; DOM range, Select options and geometry input events; not physical IME or touch',
      fileIO: 'intercepted; actual App parser/serializer/renderer, printToPDF and disk readback' }
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    clearTimeout(deadline); app.exit(0)
  } catch (error) { console.error(error); fs.writeFileSync(path.join(out, 'failure.png'), (await window.webContents.capturePage()).toPNG()); app.exit(1) }
}).catch(error => { console.error(error); app.exit(1) })
