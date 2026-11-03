const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const out = path.resolve(process.env.PIANO_STUDIO_QA_OUTPUT || 'out/studio-piano-qa')
const checkDevice = process.env.PIANO_DEVICE_QA === '1'
const previewFirst = process.env.PIANO_PREVIEW_FIRST_QA === '1'
fs.mkdirSync(out, { recursive: true })
app.disableHardwareAcceleration()
app.setPath('userData', path.join(out, 'user-data'))
for (const name of ['recent-musicxml:list', 'recent-musicxml:add', 'project:list-backups']) ipcMain.handle(name, () => [])
for (const name of ['autosave:read', 'autosave:write', 'autosave:clear']) ipcMain.handle(name, () => null)
let win
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const wait = async (fn, label) => {
  const until = Date.now() + 12000
  while (!await fn()) {
    assert.ok(Date.now() < until, label)
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
const click = label => run(label => {
  const node = [...document.querySelectorAll('button')].find(n => n.getAttribute('aria-label') === label && n.checkVisibility())
  if (!node || node.disabled) throw Error(`Unavailable: ${label}`)
  node.click()
}, label)
app.whenReady().then(async () => {
  const deadline = setTimeout(() => app.exit(1), 40000)
  try {
    win = new BrowserWindow({ width: 1200, height: 950, show: true,
      webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false } })
    win.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] },
      (_details, callback) => callback({ cancel: true }))
    await win.loadFile(path.resolve('out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    assert.ok(await run(() => Boolean(document.querySelector('[aria-label="피아노 음색"]'))))
    assert.ok(await run(() => !document.querySelector('[aria-label="연주 모델 실험"]')))
    await run(() => {
      window.__pianoNodes = []
      window.__pianoContexts = []
      window.__pianoDecoded = []
      const decode = AudioContext.prototype.decodeAudioData
      AudioContext.prototype.decodeAudioData = async function (encoded) {
        const buffer = await decode.call(this, encoded)
        window.__pianoDecoded.push({ bytes: buffer.length * buffer.numberOfChannels * 4,
          sampleRate: buffer.sampleRate })
        return buffer
      }
      const resume = AudioContext.prototype.resume
      AudioContext.prototype.resume = function (...args) {
        if (!window.__pianoContexts.includes(this)) window.__pianoContexts.push(this)
        return resume.apply(this, args)
      }
      const create = AudioContext.prototype.createBufferSource
      AudioContext.prototype.createBufferSource = function () {
        const node = create.call(this), start = node.start.bind(node), stop = node.stop.bind(node)
        const entry = { started: false, stopped: false }
        window.__pianoNodes.push(entry)
        node.start = function (...args) { entry.started = true; entry.at = args[0]; return start(...args) }
        node.stop = function (...args) { entry.stopped = true; return stop(...args) }
        return node
      }
    })
    let coldPreview
    if (previewFirst) {
      const start = Date.now()
      await click('피아노 음색 들어보기')
      await wait(() => run(() => window.__pianoNodes.some(n => n.started)), 'cold preview sample')
      coldPreview = await run(milliseconds => ({ milliseconds,
        samplesDecoded: window.__pianoDecoded.length,
        decodedBytes: window.__pianoDecoded.reduce((n, row) => n + row.bytes, 0) }), Date.now() - start)
      assert.equal(coldPreview.samplesDecoded, 4, 'cold preview prepares all layers of one root')
      await click('정지')
    }
    const before = Date.now()
    await click('재생')
    await wait(() => run(() => document.querySelector('[aria-label="피아노 음색"]').textContent.includes('그랜드 피아노')), 'sample ready')
    const coldStartMs = Date.now() - before
    const firstLoadDecoded = await run(() => ({ count: window.__pianoDecoded.length,
      bytes: window.__pianoDecoded.reduce((n, row) => n + row.bytes, 0),
      sampleRates: [...new Set(window.__pianoDecoded.map(row => row.sampleRate))] }))
    await wait(() => run(() => window.__pianoNodes.some(n => n.started)), 'sample nodes started')
    const firstWindowNodes = await run(() => window.__pianoNodes.length)
    assert.ok(firstWindowNodes < 26, 'Must not schedule the complete score at once')
    await click('일시정지')
    const afterPause = await run(() => ({ n: window.__pianoNodes.length,
      allStopped: window.__pianoNodes.every(n => n.stopped) }))
    assert.ok(afterPause.allStopped, 'pause cancels sources')
    const resumeStarted = Date.now()
    await click('재생')
    await wait(() => run(n => window.__pianoNodes.length > n, afterPause.n), 'resume creates sample voices')
    const warmStartMs = Date.now() - resumeStarted
    assert.ok(warmStartMs <= 150, 'cached playback start budget')
    await click('정지')
    assert.ok(await run(() => window.__pianoNodes.every(n => n.stopped)))
    let deviceResults
    if (checkDevice) {
      const beforeDevice = await run(() => window.__pianoNodes.length)
      await click('재생')
      await wait(() => run(n => window.__pianoNodes.length > n, beforeDevice), 'device playback')
      await run(() => new Promise(resolve => setTimeout(resolve, 500)))
      await run(() => window.__pianoContexts[0].suspend())
      await wait(() => run(() => document.querySelector('[aria-label="일시정지"]').disabled
        && !document.querySelector('[aria-label="재생"]').disabled), 'device suspension pauses UI')
      const pausedDevice = await run(() => ({ position: document.querySelector('[aria-label="재생 위치"]').textContent,
        nodes: window.__pianoNodes.length, allStopped: window.__pianoNodes.every(n => n.stopped) }))
      assert.ok(pausedDevice.allStopped, 'device suspension cancels scheduled voices')
      assert.ok(parseFloat(pausedDevice.position) > 0, 'interruption preserves nonzero beat')
      await run(async () => { await window.__pianoContexts[0].resume(); await new Promise(r => setTimeout(r, 180)) })
      assert.equal(await run(() => window.__pianoNodes.length), pausedDevice.nodes, 'no automatic restart')
      assert.equal(await run(() => document.querySelector('[aria-label="재생 위치"]').textContent), pausedDevice.position)
      await click('재생')
      await wait(() => run(n => window.__pianoNodes.length > n, pausedDevice.nodes), 'explicit device resume')
      assert.equal(await run(() => window.__pianoContexts.length), 1, 'suspended context is reused')
      await click('정지')
      const beforeClose = await run(() => window.__pianoNodes.length)
      await click('재생')
      await wait(() => run(n => window.__pianoNodes.length > n, beforeClose), 'terminal context playback')
      await run(() => window.__pianoContexts[0].close())
      await wait(() => run(() => document.querySelector('[aria-label="피아노 음색"] [role="alert"]')
        ?.textContent.includes('종료')), 'closed context exposes retry')
      const closedNodes = await run(() => window.__pianoNodes.length)
      await click('재생')
      await wait(() => run(n => window.__pianoContexts.length === 2
        && window.__pianoContexts[1].state === 'running' && window.__pianoNodes.length > n, closedNodes),
      'new context decodes and plays')
      assert.ok(await run(() => !document.querySelector('[aria-label="피아노 음색"] [role="alert"]')))
      await click('정지')
      deviceResults = { programmaticSuspendResume: true, automaticRestart: false,
        retainedPosition: pausedDevice.position, terminalContextReplacement: true,
        newContextPlayback: true, physicalDeviceChange: 'not-tested' }
    }
    const beforePreview = await run(() => ({ nodes: window.__pianoNodes.length,
      score: document.querySelector('.studio-document').textContent }))
    const previewStarted = Date.now()
    await click('피아노 음색 들어보기')
    await wait(() => run(n => window.__pianoNodes.length > n, beforePreview.nodes), 'preview sample voices')
    const previewSchedulingMs = Date.now() - previewStarted
    assert.ok(previewSchedulingMs <= 100, 'cached preview reservation budget')
    await click('정지')
    assert.ok(await run(() => window.__pianoNodes.every(n => n.stopped)), 'preview stop cancels its sources')
    assert.equal(await run(() => document.querySelector('.studio-document').textContent), beforePreview.score,
      'preview must not edit the score')
    const expressionStart = Date.now()
    await run(() => {
      const panel = document.querySelector('[aria-label="피아노 음색"]')
      const label = [...panel.querySelectorAll('label')].find(n => n.textContent.includes('자연스러운 연주'))
      label.querySelector('input').click()
    })
    await wait(() => run(() => {
      const panel = document.querySelector('[aria-label="피아노 음색"]')
      return !panel.textContent.includes('연주 표현 준비 중') && !panel.querySelector('[role="alert"]')
    }), 'local expression worker ready')
    const expressionReadyMs = Date.now() - expressionStart
    const beforeNatural = await run(() => window.__pianoNodes.length)
    await click('재생')
    await wait(() => run(n => window.__pianoNodes.length > n, beforeNatural), 'natural expression playback')
    await run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await run(() => { window.__pianoSvg = document.querySelector('.notation-preview svg') })
    await run(() => new Promise(resolve => setTimeout(resolve, 1300)))
    assert.ok(await run(() => window.__pianoSvg === document.querySelector('.notation-preview svg')),
      'playhead/selection updates must not replace the whole notation SVG')
    assert.ok(await run(() => Boolean(document.querySelector('.notation-playhead'))), 'live playhead remains visible')
    await click('정지')
    for (const width of [1200, 960]) {
      win.setSize(width, 950)
      await run(() => new Promise(resolve => requestAnimationFrame(resolve)))
      fs.writeFileSync(path.join(out, `piano-${width}.png`), (await win.webContents.capturePage()).toPNG())
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({
      normalUi: true, developerFlagRequired: false, sampleNodesStarted: true,
      coldStartMs, warmStartMs, firstWindowNodes, pauseResumeStop: true, previewSchedulingMs, previewStop: true,
      coldPreview, firstLoadDecoded, offlineHttpBlocked: true,
      localExpressionWorker: true, expressionReadyMs, expressionMethod: 'score-rules-v1',
      stableNotationSvgDuringPlayback: true,
      device: deviceResults,
      offlineLocalAssets: true, listeningQuality: 'not-reviewed'
    }, null, 2))
    console.log('PASS normal UI -> local piano samples -> bounded scheduling -> pause/resume/stop')
  } catch (error) {
    if (win) fs.writeFileSync(path.join(out, 'failure.txt'), String(error) + '\n' + await run(() => document.body.innerText))
    throw error
  } finally { clearTimeout(deadline); win?.destroy(); app.quit() }
}).catch(e => { console.error(e); app.exit(1) })
