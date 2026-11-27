import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createWriteStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

const [app, fixture, output, testReadFailure] = process.argv.slice(2)
await mkdir(output)
const profile = path.join(output, 'studio-profile-' + process.pid)
await mkdir(profile)
const env = { ...process.env, DDIRORI_PIANO_QA_DATA: profile }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RENDERER_URL
let probeRequests = 0
const probeServer = createServer((_request,response) => {
  probeRequests++
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.end('online')
})
await new Promise(resolve => probeServer.listen(0, '127.0.0.1', resolve))
const probeUrl = 'http://127.0.0.1:' + probeServer.address().port + '/qa-png-network'
const log = createWriteStream(path.join(output, 'electron.log'))
const launchFlags = ['--piano-audit', '--inspect=127.0.0.1:0', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0']
if (process.platform === 'linux') launchFlags.push('--no-sandbox')
const child = spawn(app, launchFlags, {env, stdio:['ignore','pipe','pipe'], windowsHide:true})
let spawnError
child.once('error', error => { spawnError = error })
const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({code, signal})))
const deadline = setTimeout(() => child.kill('SIGKILL'), 480_000)
let startup = ''
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
  startup += data
  log.write(data)
})

class DebugConnection {
  constructor(url) {
    assert.match(url, /^ws:\/\/127\.0\.0\.1:\d+\//)
    this.socket = new WebSocket(url)
    this.id = 0
    this.pending = new Map()
    this.events = []
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, {once:true})
      this.socket.addEventListener('error', reject, {once:true})
    })
    this.socket.addEventListener('message', ({data}) => {
      const message = JSON.parse(data)
      if (!message.id) {
        this.events.push(message)
        return
      }
      const done = this.pending.get(message.id)
      done?.(message)
    })
  }
  async call(method, params = {}) {
    await this.ready
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const limit = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 100_000)
      this.pending.set(id, message => {
        clearTimeout(limit)
        this.pending.delete(id)
        if (message.error) reject(new Error(JSON.stringify(message.error)))
        else resolve(message.result)
      })
      this.socket.send(JSON.stringify({id, method, params}))
    })
  }
  async evaluate(fn, arg) {
    const response = await this.call('Runtime.evaluate', {
      expression: `(${fn})(${JSON.stringify(arg) ?? ''})`,
      awaitPromise: true, returnByValue: true, userGesture: true,
    })
    if (response.exceptionDetails) throw Error(response.result.description ?? JSON.stringify(response.exceptionDetails))
    return response.result.value
  }
  close() { this.socket.close() }
}

async function until(fn, label) {
  const end = Date.now() + 40_000
  while (Date.now() < end) {
    if (spawnError) throw spawnError
    const value = await fn()
    if (value) return value
    await pause(100)
  }
  throw Error(`Timeout: ${label}`)
}

let main, page, phase = 'package startup'
try {
  const nodeSocket = await until(() => startup.match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1], 'main inspector')
  const devtools = await until(() => startup.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/)?.[1], 'renderer debugging port')
  const target = await until(async () => (await (await fetch(`http://127.0.0.1:${devtools}/json/list`)).json())
    .find(session => session.type === 'page' && session.url.includes('app.asar')), 'packaged renderer')
  main = new DebugConnection(nodeSocket)
  page = new DebugConnection(target.webSocketDebuggerUrl)

  const runtime = await main.evaluate(() => {
    const {app} = process.mainModule.require('electron')
    const {readFileSync} = process.mainModule.require('original-fs')
    const {createHash} = process.mainModule.require('node:crypto')
    const paths = process.mainModule.require('node:path')
    const appDir = process.env.APPDIR ?? null
    return {platform:process.platform,arch:process.arch,electron:process.versions.electron,
      version:app.getVersion(),resourcesPath:process.resourcesPath,
      asarSha256:createHash('sha256').update(readFileSync(paths.join(process.resourcesPath,'app.asar'))).digest('hex'),
      appImage:process.env.APPIMAGE ?? null,appDir,
      mountRecord:appDir && process.platform === 'linux'
        ? readFileSync('/proc/self/mountinfo','utf8').split('\n').find(line => line.includes(' ' + appDir + ' ')) ?? null
        : null}
  })
  if (process.env.STUDIO_QA_REQUIRE_FUSE === '1') {
    assert.equal(runtime.appImage, app)
    assert.ok(runtime.mountRecord?.includes(' - fuse.'))
  }
  assert.equal(runtime.version, '0.1.0-alpha.45')
  assert.equal(runtime.arch, 'x64')
  assert.equal(runtime.platform, process.platform)
  assert.equal(runtime.asarSha256, process.env.STUDIO_QA_ASAR_SHA256)
  phase = 'fixture dialog selection'
  await main.evaluate(({fixture, output}) => {
    const { dialog } = process.mainModule.require('electron')
    globalThis.__pngQa = { next: 300, reads: [], writes: [] }
    dialog.showOpenDialog = async options => {
      if (options.title !== 'MusicXML 가져오기') throw Error('Unexpected open dialog ' + options.title)
      globalThis.__pngQa.reads.push(fixture)
      return {canceled:false, filePaths:[fixture]}
    }
    dialog.showSaveDialog = async options => {
      if (options.title !== 'PNG 페이지 저장') throw Error('Unexpected save dialog ' + options.title)
      const filePath = output + '/score-' + globalThis.__pngQa.next + '.png'
      globalThis.__pngQa.writes.push({filePath, defaultPath: options.defaultPath})
      return {canceled:false, filePath}
    }
  }, {fixture, output})

  phase = 'offline reload'
  await page.call('Page.enable')
  await page.call('Network.enable')
  await page.call('Network.setCacheDisabled',{cacheDisabled:true})
  await page.call('Network.emulateNetworkConditionsByRule', {
    offline: true,
    matchedNetworkConditions: [{urlPattern:'',latency:0,downloadThroughput:-1,uploadThroughput:-1}]
  })
  await page.call('Page.addScriptToEvaluateOnNewDocument',{source:'globalThis.__pngQaReload = true'})
  await page.call('Page.reload',{ignoreCache:true})
  await until(() => page.evaluate(() => globalThis.__pngQaReload &&
    Boolean(document.querySelector('.start-actions [aria-label="MusicXML 가져오기"]'))), 'offline start page')
  const networkProbe = await page.evaluate(async url => {
    try { await fetch(url); return false }
    catch (error) { return String(error).includes('Failed to fetch') }
  }, probeUrl)
  assert.equal(networkProbe, true)
  phase = 'MusicXML import and PNG tools'
  await page.evaluate(() => document.querySelector('.start-actions [aria-label="MusicXML 가져오기"]').click())
  const score = await until(() => page.evaluate(() => {
    const title = document.querySelector('.studio-document')?.textContent
    const score = document.querySelector('.score-viewport__notation') ?? document.querySelector('.score-page')
    return title?.includes('봄날의 노래') && score?.querySelector('svg') && {title, scoreMarkup:score.innerText?.slice(0,800)}
  }), 'Hangul score title and notation')
  const menu = role => page.evaluate(name => {
    const item = [...document.querySelectorAll('[role="menuitem"], button')].find(el =>
      (el.getAttribute('aria-label') || el.textContent.trim()) === name && el.getClientRects().length > 0)
    if (!item) throw Error('Unavailable menu command ' + name)
    item.click()
  }, role)
  await menu('파일')
  await menu('PNG 출력 설정')
  await until(() => page.evaluate(() => {
    const button = document.querySelector('button[aria-label="PNG 내보내기"]')
    return button && !button.disabled
  }), 'PNG export button')

  phase = 'PNG output capture'
  await page.evaluate(() => {
    globalThis.__pngQaSvg = []
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = async function (...args) {
      const prefix = 'data:image/svg+xml;charset=utf-8,'
      if (this.src.startsWith(prefix)) {
        const svg = decodeURIComponent(this.src.slice(prefix.length))
        const fonts = []
        const data = /font-family:'([^']+)';font-style:normal;font-weight:([^;]+);font-display:block;src:url\('data:font\/woff2[^,]*,([a-zA-Z0-9+/=]+)'\)/g
        for (const [,family,weight,base64] of svg.matchAll(data)) {
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const digest = await crypto.subtle.digest('SHA-256', bytes)
          fonts.push({family,weight,bytes:bytes.length,sha256:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')})
        }
        globalThis.__pngQaSvg.push({fonts, hasTitle:svg.includes('봄날의 노래'),
          hasHangulLyric: svg.includes('>봄<'), hasNotation:svg.includes('vf-note') || svg.includes('vf-stave')})
      }
      return decode.apply(this, args)
    }
    globalThis.__pngQaReadCount = 0
    const fetchAsset = window.fetch
    window.fetch = function (url, ...args) {
      if (String(url).includes('PretendardVariable') && String(url).endsWith('.woff2')) {
        globalThis.__pngQaReadCount++
        if (globalThis.__pngQaRejectFont) return Promise.resolve(new Response('', {status:404}))
      }
      return fetchAsset.call(this, url, ...args)
    }
  })
  if (testReadFailure === 'yes') {
    phase = 'missing font and retry'
    await page.evaluate(() => {
      globalThis.__pngQaRejectFont = true
      const button = document.querySelector('button[aria-label="PNG 내보내기"]')
      button.focus()
      button.click()
    })
    await until(() => page.evaluate(() =>
      document.querySelector('.studio-status__result')?.textContent.includes('PNG 출력을 완료하지 못했습니다.') &&
      !document.querySelector('button[aria-label="PNG 내보내기"]').disabled), 'font-read failure feedback')
    assert.deepEqual(await main.evaluate(() => globalThis.__pngQa.writes), [])
    assert.equal(await page.evaluate(() => globalThis.__pngQaSvg.length), 0)
    await page.evaluate(() => { globalThis.__pngQaRejectFont = false })
  }
  for (const dpi of [300, 150]) {
    phase = `PNG ${dpi} DPI`
    if (dpi === 150) {
      await page.evaluate(() => {
        const dpi = [...document.querySelectorAll('[role="combobox"]')].find(button => button.textContent.trim() === '300 dpi')
        if (!dpi) throw Error('Missing PNG resolution control')
        dpi.click()
      })
      await page.evaluate(() => {
        const option = [...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === '150 dpi')
        if (!option) throw Error('Missing DPI option')
        option.click()
      })
    }
    await main.evaluate(next => { globalThis.__pngQa.next = next }, dpi)
    await page.evaluate(() => document.querySelector('button[aria-label="PNG 내보내기"]').click())
    await until(() => page.evaluate(dpi => document.querySelector('.studio-status__result')?.textContent.includes(`score-${dpi}.png`), dpi), `PNG ${dpi} completion`)
  }
  const results = {
    offlineNetworkProbeFailed: networkProbe,
    targetUrl: target.url,
    score,
    runtime,
    dialogs: await main.evaluate(() => globalThis.__pngQa),
    images: await page.evaluate(() => globalThis.__pngQaSvg),
    fontAssetReads: await page.evaluate(() => globalThis.__pngQaReadCount),
    simulatedFontFailure: testReadFailure === 'yes',
  }
  assert.equal(results.dialogs.writes.length, 2)
  assert.equal(results.dialogs.reads.length, 1)
  assert.equal(results.images.length, 2)
  for (const image of results.images) {
    assert.equal(image.hasTitle, true)
    assert.equal(image.hasHangulLyric, true)
    assert.equal(image.hasNotation, true)
    assert.equal(image.fonts.length, 4)
  }
  const matchingProbe = page.events.find(event => event.method === 'Network.requestWillBeSent' && event.params.request.url.includes('qa-png-network'))
  const failure = matchingProbe && page.events.find(event => event.method === 'Network.loadingFailed' && event.params.requestId === matchingProbe.params.requestId)
  assert.equal(probeRequests, 0)
  assert.equal(failure?.params.errorText, 'net::ERR_INTERNET_DISCONNECTED')
  results.offlineProbeNetError = failure.params.errorText
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n')
} catch (error) {
  await writeFile(path.join(output, 'failure.json'), JSON.stringify({phase, message:String(error)}, null, 2) + '\n')
  throw error
} finally {
  probeServer.close()
  page?.close()
  if (main?.socket.readyState === WebSocket.OPEN) {
    await main.evaluate(() => {
      setTimeout(() => process.mainModule.require('electron').app.quit(), 100)
      return true
    }).catch(() => {})
  }
  main?.close()
  const exit = await Promise.race([closed, pause(12_000, null, {ref:false})])
  if (!exit) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {timeout:5000, windowsHide:true})
    } else child.kill('SIGTERM')
    child.stdout.destroy()
    child.stderr.destroy()
  }
  clearTimeout(deadline)
  log.end()
  await rm(profile, {recursive:true, force:true, maxRetries:5, retryDelay:250})
  await writeFile(path.join(output,'exit.json'), JSON.stringify(exit) + '\n')
  assert.deepEqual(exit, {code:0, signal:null}, 'packaged app did not close cleanly')
}
