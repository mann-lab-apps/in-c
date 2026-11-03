import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn, execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const seconds = Number(process.argv.find(a => a.startsWith('--seconds='))?.split('=')[1] ?? 605)
const executable = path.resolve(process.env.PIANO_PACKAGED_APP || 'out/piano-package/mac-arm64/in-C.app/Contents/MacOS/in-C')
const output = path.resolve(process.env.PIANO_PACKAGE_QA_OUTPUT || 'out/piano-package-qa')
const userData = path.join(output, `user-data-${seconds}`)
fs.mkdirSync(userData, { recursive: true })
const server = net.createServer()
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const env = { ...process.env, DDIRORI_PIANO_QA_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(executable, ['--piano-audit', `--remote-debugging-port=${port}`], { env, stdio: ['ignore', 'pipe', 'pipe'] })
let logs = ''
child.stdout.on('data', data => logs += data)
child.stderr.on('data', data => logs += data)
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws, id = 0
const pending = new Map()
const deadline = setTimeout(() => child.kill('SIGKILL'), (seconds + 90) * 1000)
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const token = ++id
  pending.set(token, { resolve, reject })
  ws.send(JSON.stringify({ id: token, method, params }))
})
const evaluate = async (fn, arg) => {
  const response = await call('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg) ?? ''})`,
    awaitPromise: true, returnByValue: true, userGesture: true })
  if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails))
  return response.result.value
}
const wait = async (fn, label, timeout = 20000) => {
  const until = Date.now() + timeout
  while (!await fn()) { assert.ok(Date.now() < until, label); await pause(100) }
}
function familyRssKiB() {
  const rows = execFileSync('ps', ['-axo', 'pid,ppid,rss'], { encoding: 'utf8' }).trim().split('\n').slice(1)
    .map(line => line.trim().split(/\s+/).map(Number))
  const pids = new Set([child.pid])
  for (let i = 0; i < 8; i++) for (const [pid, parent] of rows) if (pids.has(parent)) pids.add(pid)
  return rows.filter(([pid]) => pids.has(pid)).reduce((sum, row) => sum + row[2], 0)
}
try {
  let target
  await wait(async () => {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page'); return Boolean(target) }
    catch { return false }
  }, 'packaged app debugging target')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject) })
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (!message.id) return
    const request = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) request.reject(Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  await call('Network.enable')
  await call('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] })
  const isolateInput = process.env.PIANO_QA_ISOLATE_INPUT === '1'
  if (isolateInput) await call('Input.setIgnoreInputEvents', { ignore: true })
  assert.ok(target.url.includes('app.asar'), 'must be real packaged renderer')
  await call('Page.navigate', { url: target.url.split('?')[0] + '?fixture=piano-stress' })
  await wait(() => evaluate(() => Boolean(document.querySelector('[aria-label="피아노 음색"]'))), 'packaged piano UI')
  assert.ok(await evaluate(() => !document.querySelector('[aria-label="연주 모델 실험"]')))
  await evaluate(() => {
    window.__pianoAudit = { created: 0, active: 0, maximum: 0, longTasks: 0,
      maxTaskMs: 0, nearLateStarts: 0, duplicateEnded: 0, endedWithoutStart: 0,
      inputEvents: [] }
    for (const type of ['click', 'change', 'keydown', 'drop']) document.addEventListener(type, event => {
      const element = event.target instanceof Element ? event.target : undefined
      window.__pianoAudit.inputEvents.push({ type, trusted: event.isTrusted, at: performance.now(),
        targetTag: element?.tagName, targetAria: element?.closest('[aria-label]')?.getAttribute('aria-label'),
        position: document.querySelector('[aria-label="재생 위치"]')?.textContent })
      if (window.__pianoAudit.inputEvents.length > 32) window.__pianoAudit.inputEvents.shift()
    }, true)
    const create = AudioContext.prototype.createBufferSource
    AudioContext.prototype.createBufferSource = function () {
      const node = create.call(this), start = node.start.bind(node)
      let started = false, ended = false
      node.start = function (...args) {
        started = true
        if (args[0] - node.context.currentTime < .001) window.__pianoAudit.nearLateStarts++
        window.__pianoAudit.created++
        window.__pianoAudit.active++
        window.__pianoAudit.maximum = Math.max(window.__pianoAudit.maximum, window.__pianoAudit.active)
        return start(...args)
      }
      node.addEventListener('ended', () => {
        if (!started) window.__pianoAudit.endedWithoutStart++
        else if (ended) window.__pianoAudit.duplicateEnded++
        else { ended = true; window.__pianoAudit.active-- }
      })
      return node
    }
    new PerformanceObserver(list => {
      window.__pianoAudit.longTasks += list.getEntries().length
      for (const entry of list.getEntries()) window.__pianoAudit.maxTaskMs = Math.max(window.__pianoAudit.maxTaskMs, entry.duration)
    })
      .observe({ entryTypes: ['longtask'] })
  })
  const expressionStarted = Date.now()
  await evaluate(() => {
    const label = [...document.querySelector('[aria-label="피아노 음색"]').querySelectorAll('label')]
      .find(l => l.textContent.includes('자연스러운 연주'))
    label.querySelector('input').click()
  })
  await wait(() => evaluate(() => {
    const panel = document.querySelector('[aria-label="피아노 음색"]')
    return !panel.textContent.includes('연주 표현 준비 중') && !panel.querySelector('[role="alert"]')
  }), 'packaged worker completed offline')
  const expressionMs = Date.now() - expressionStarted
  const click = name => evaluate(name => {
    const button = document.querySelector(`button[aria-label="${name}"]`)
    if (!button || button.disabled) throw Error(`Unavailable ${name}`)
    button.click()
  }, name)
  const loadStarted = Date.now()
  await click('재생')
  await wait(() => evaluate(() => window.__pianoAudit.created > 0), 'packaged sample playback')
  const coldStartMs = Date.now() - loadStarted
  const started = Date.now(), measurements = []
  while (Date.now() - started < seconds * 1000) {
    await pause(Math.min(15000, seconds * 1000 - (Date.now() - started)))
    const stats = await evaluate(() => ({ ...window.__pianoAudit,
      position: document.querySelector('[aria-label="재생 위치"]')?.textContent,
      fixtureDynamicCount: document.querySelectorAll('[data-dynamic-id]').length,
      error: document.querySelector('[aria-label="피아노 음색"] [role="alert"]')?.textContent }))
    measurements.push({ elapsedSeconds: (Date.now() - started) / 1000, rssKiB: familyRssKiB(), ...stats })
    fs.writeFileSync(path.join(output, `progress-${seconds}s.json`), JSON.stringify({
      executable, seconds, coldStartMs, expressionMs, measurements }, null, 2))
    assert.equal(stats.fixtureDynamicCount, 0, 'original stress fixture must remain unedited')
    assert.ok(!stats.error, stats.error)
    assert.ok(stats.active >= 0, 'source lifecycle measurement must remain valid')
    assert.ok(stats.maximum <= 256, 'bounded physical sample voices')
    console.log(JSON.stringify(measurements.at(-1)))
  }
  if (seconds >= 605) {
    assert.equal(measurements.at(-1).active, 0, 'natural ending releases every voice')
    assert.ok(measurements.at(-1).created >= 1000, 'long score was really played')
  }
  await evaluate(() => {
    const stop = document.querySelector('button[aria-label="정지"]')
    if (stop && !stop.disabled) stop.click()
  })
  const screenshot = await call('Page.captureScreenshot')
  fs.writeFileSync(path.join(output, `packaged-${seconds}s.png`), Buffer.from(screenshot.data, 'base64'))
  const result = { executable, actualPackagedApp: true, offlineNetworkBlocked: true,
    externalInputIgnored: isolateInput,
    appAsarSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(executable), '../Resources/app.asar'))).digest('hex'),
    noteCount: 1000, seconds, coldStartMs, expressionMs, expressionMethod: 'score-rules-v1', measurements,
    noNearLateStarts: measurements.at(-1).nearLateStarts === 0,
    listening: 'not-reviewed' }
  fs.writeFileSync(path.join(output, `results-${seconds}s.json`), JSON.stringify(result, null, 2))
  assert.ok(coldStartMs < 5000)
  assert.ok(expressionMs < 1000)
  assert.equal(result.noNearLateStarts, true, 'audio scheduling headroom gate')
  console.log(`PASS packaged offline piano ${seconds}s`)
} finally {
  clearTimeout(deadline)
  fs.writeFileSync(path.join(output, `process-${seconds}s.log`), logs)
  ws?.close()
  child.kill('SIGTERM')
}
