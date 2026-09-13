const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1400, height: 1000, show: false,
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
  const click = async label => {
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
  }
  try {
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    await waitFor('document.querySelector(".notation-event")', 'Initial notation missing')
    const input = fs.readFileSync(path.resolve(__dirname, '../src/musicxml/fixtures/rest-hairpin-input.musicxml'), 'utf8')
    const output = path.join(app.getPath('temp'), 'chromatics-rest-hairpin.musicxml')
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
    for (const width of [960, 1400]) {
      window.setSize(width, 1000)
      await new Promise(resolve => setTimeout(resolve, 300))
      const result = await evaluate(`(() => {
        const group = document.querySelector('.notation-hairpin')
        const box = group.getBoundingClientRect()
        const svg = group.ownerSVGElement.getBoundingClientRect()
        const notes = [...document.querySelectorAll('.notation-event[data-voice-id="voice-2"] .vf-stem')]
        const stemBottom = Math.max(...notes.map(note => note.getBoundingClientRect().bottom))
        const palette = document.querySelector('.range-notation-palette')
        const controls = [...palette.querySelectorAll('button')]
        const paletteAccessible = controls.length === 7 && controls.every(button => {
          const rect = button.getBoundingClientRect()
          return rect.width >= 28 && rect.height >= 28 && rect.left >= 0 && rect.right <= innerWidth &&
            rect.top >= 0 && rect.bottom <= innerHeight && button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
        })
        return { width: box.width, height: box.height, lines: group.querySelectorAll('line').length,
          paletteAccessible,
          restRangeDisabledControls: controls.filter(button => button.disabled).length,
          dynamicsDisabled: [...document.querySelectorAll('.docked-palette__symbol-grid button')].every(button => button.disabled),
          contextHeight: document.querySelector('.editor-context-strip').getBoundingClientRect().height,
          stemClearance: box.top - stemBottom,
          inside: box.left >= svg.left && box.right <= svg.right && box.top >= svg.top && box.bottom <= svg.bottom,
          voiceEvents: document.querySelectorAll('.notation-event[data-voice-id="voice-2"]').length }
      })()`)
      if (!result.paletteAccessible || !result.dynamicsDisabled || result.restRangeDisabledControls !== 5 || result.contextHeight > 90 || !result.inside || !Number.isFinite(result.stemClearance) || result.stemClearance < 6 || result.lines !== 2 || result.width <= 0 || result.height <= 0 || result.voiceEvents !== 4) {
        throw new Error('Invalid rendered hairpin at ' + width + ': ' + JSON.stringify(result))
      }
      const screenshot = path.join(app.getPath('temp'), `chromatics-rest-hairpin-${width}.png`)
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
    const octaveOutput = path.join(app.getPath('temp'), 'chromatics-octave-hairpin.musicxml')
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
    const octaveScreenshot = path.join(app.getPath('temp'), 'chromatics-octave-hairpin-1400.png')
    fs.writeFileSync(octaveScreenshot, (await window.webContents.capturePage()).toPNG())
    const spanScreenshots = []
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
      window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
      window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
      await waitFor('document.querySelector(".notation-span-target.is-selected") && document.querySelector(\'select[aria-label="표기 끝점"]\')', 'Actual span click did not select object')
      const layout = await evaluate(`(() => {
        const panel = document.querySelector('.span-properties')
        panel.scrollIntoView({ block: 'nearest' })
        const controls = [...panel.querySelectorAll('select, button')].filter(control => !control.closest('details:not([open])') && control.getClientRects().length)
        return { controls: controls.length, overflow: panel.scrollWidth > panel.clientWidth + 1,
          accessible: controls.every(control => { const rect = control.getBoundingClientRect(); return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && control.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) }) }
      })()`)
      if (layout.overflow || !layout.accessible || layout.controls !== 5) throw new Error('Span properties clipped: ' + JSON.stringify(layout))
      await new Promise(resolve => setTimeout(resolve, 250))
      const screenshot = path.join(app.getPath('temp'), `chromatics-span-properties-${width}.png`)
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
      spanScreenshots.push({ width, screenshot, ...layout })
    }
    const editedEnd = await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[2].dataset.eventId`)
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="표기 끝점"]')
      select.value = ${JSON.stringify(editedEnd)}
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await waitFor(`document.querySelector('select[aria-label="표기 끝점"]').value === ${JSON.stringify(editedEnd)}`, 'Endpoint edit missing')
    const readGeometry = `(() => { const box = document.querySelector('.notation-hairpin').getBBox(); return { x: box.x, y: box.y + box.height / 2, height: box.height } })()`
    const autoGeometry = await evaluate(readGeometry)
    await evaluate(`document.querySelector('.span-properties__geometry').open = true`)
    const editGeometry = async (label, value) => {
      await evaluate(`(() => { const input = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]'); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))}); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
      await evaluate(`(() => { const input = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]'); input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); input.blur() })()`)
    }
    await editGeometry('표기 가로 이동', 1.5)
    await editGeometry('표기 세로 이동', 2)
    await editGeometry('표기 높이', 3)
    const manualGeometry = await evaluate(readGeometry)
    const manualInsideViewport = await evaluate(`(() => { const mark = document.querySelector('.notation-hairpin'); const box = mark.getBBox(); const view = mark.ownerSVGElement.viewBox.baseVal; return box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height })()`)
    if (!manualInsideViewport) throw new Error('Manual span clipped by SVG viewport')
    if (Math.abs(manualGeometry.x - autoGeometry.x - 15) > 0.1 || Math.abs(manualGeometry.y - autoGeometry.y - 20) > 0.1 || manualGeometry.height !== 30) throw new Error('Manual geometry not rendered: ' + JSON.stringify({ autoGeometry, manualGeometry, inputs: await evaluate(`Array.from(document.querySelectorAll('.span-properties input')).map(input => ({ value: input.value, valid: input.validity.valid }))`), status: await evaluate('document.querySelector(".editor-status").textContent') }))
    await click('표기 자동 배치 복원')
    const resetGeometry = await evaluate(readGeometry)
    if (JSON.stringify(resetGeometry) !== JSON.stringify(autoGeometry)) throw new Error('Auto reset did not restore renderer')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }))`)
    await waitFor(`document.querySelector('.notation-hairpin').getBBox().height === 30`, 'Geometry undo missing')
    const nativeOutput = path.join(app.getPath('temp'), 'chromatics-span-properties.chromatics')
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
    await click('표기 객체')
    await evaluate(`(() => { const select = document.querySelector('select[aria-label="표기 객체 선택"]'); select.value = ${JSON.stringify('hairpin:' + nativeSpan.id)}; select.dispatchEvent(new Event('change', { bubbles: true })) })()`)
    await waitFor(`document.querySelector('select[aria-label="표기 끝점"]')?.value === ${JSON.stringify(editedEnd)}`, 'Native reopened endpoint differs')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))`)
    await waitFor('!document.querySelector(".notation-hairpin")', 'Span Delete did not update renderer')
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, bubbles: true }))`)
    await waitFor('document.querySelector(".notation-hairpin")', 'Span undo did not restore renderer')
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
    await evaluate(`document.querySelectorAll('.notation-event[data-voice-id="voice-2"]')[2].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))`)
    await click('슬러 추가 또는 해제, 단축키 S')
    await waitFor('document.querySelector(".notation-slur")', 'Slur missing')
    await evaluate(`document.querySelector('.notation-span-target[data-span-kind="slur"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
    await waitFor('document.querySelector(".notation-span-target.is-selected")?.dataset.spanKind === "slur"', 'Slur keyboard selection missing')
    const autoSlur = await evaluate('document.querySelector(".notation-slur").getAttribute("d")')
    await evaluate(`document.querySelector('.span-properties__geometry').open = true`)
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
    const geometryScreenshot = path.join(app.getPath('temp'), 'chromatics-span-geometry-1400.png')
    await new Promise(resolve => setTimeout(resolve, 250))
    fs.writeFileSync(geometryScreenshot, (await window.webContents.capturePage()).toPNG())
    await evaluate(`void (window.inC.pdf = { save: request => new Promise(resolve => { window.__pdfRequest = request; window.__resolvePdf = resolve }) })`)
    await click('내보내기')
    await click('PDF 변환')
    await waitFor('window.__pdfRequest && document.querySelector(".notation-hairpin")', 'Print renderer missing')
    const printGeometry = await evaluate(readGeometry)
    if (printGeometry.height !== 30 || await evaluate('Boolean(document.querySelector(".notation-span-target"))')) throw new Error('Print geometry/selection isolation failed')
    const pdfOutput = path.join(app.getPath('temp'), 'chromatics-span-geometry.pdf')
    fs.writeFileSync(pdfOutput, await window.webContents.printToPDF({ preferCSSPageSize: true, printBackground: false }))
    await evaluate(`window.__resolvePdf({ fileName: 'chromatics-span-geometry.pdf', filePath: ${JSON.stringify(pdfOutput)} })`)
    console.log(JSON.stringify({ status: 'passed', output, bounds, octaveOutput, octaveScreenshot, pitchContract, originalNoteYs, reopenedNoteYs, spanScreenshots, nativeOutput, nativeSpan, autoGeometry, manualGeometry, autoSlur, manualSlur, geometryScreenshot, pdfOutput, printGeometry, fileIO: 'intercepted; actual App parser/serializer/renderer, printToPDF and disk readback' }))
    app.exit(0)
  } catch (error) { console.error(error); app.exit(1) }
}).catch(error => { console.error(error); app.exit(1) })
