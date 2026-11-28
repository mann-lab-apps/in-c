const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { spawn, execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { fileURLToPath } = require('node:url')
const { gzipSync } = require('node:zlib')

const [mode, executableArg, workArg, expectedAsar] = process.argv.slice(2)
assert(['fresh', 'prepare', 'recover', 'distribution', 'portable-default', 'previous-read', 'startup', 'layout'].includes(mode))
const executable = path.resolve(executableArg)
const work = path.resolve(workArg)
const results = path.join(work, 'results')
const files = path.join(work, 'files')
const version = process.env.STUDIO_QA_APP_VERSION
assert.match(version, /^0\.1\.0-alpha\.\d+$/)
const fixture = {
  v2: path.join(__dirname, 'alpha43-common-v2.chromatics'),
  v3: path.join(__dirname, '../windows-save-boundaries/fixtures/repeat-independent-v3.chromatics')
}
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const pitch = score => score.parts[0].staves[0].measures[0].voices[0].events[0].pitch
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
fs.mkdirSync(results, { recursive: true })
fs.mkdirSync(files, { recursive: true })

async function wait(test, label, timeout = 18000) {
  const deadline = Date.now() + timeout
  let remaining
  while ((remaining = deadline - Date.now()) > 0) {
    const value = await test(remaining)
    if (value) return value
    await pause(100)
  }
  throw Error('Timed out: ' + label)
}

async function dialog(title, file) {
  assert.equal(path.dirname(file), files)
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-File', path.join(__dirname, 'choose-file.ps1'),
      '-Title', title, '-File', file, '-FixtureDirectory', files], { timeout: 18000, stdio: 'inherit' })
  } else {
    const quotedTitle = '^' + title.replace(/[.*+?^$(){}|\[\]\\]/g, '\\$&') + '$'
    const windowId = execFileSync('timeout', ['12s', 'xdotool', 'search', '--sync', '--onlyvisible',
      '--limit', '1', '--name', quotedTitle], { encoding: 'utf8' }).trim()
    const keys = (...args) => execFileSync('xdotool', args, { timeout: 3000 })
    keys('windowfocus', '--sync', windowId)
    await pause(250)
    keys('key', '--clearmodifiers', 'ctrl+l')
    await pause(400)
    keys('key', '--clearmodifiers', 'ctrl+a')
    keys('type', '--clearmodifiers', '--delay', '12', '--', file)
    await pause(550)
    const isStillOpen = () => {
      try {
        keys('search', '--onlyvisible', '--name', quotedTitle)
        return true
      } catch (error) {
        if (error.status !== 1) throw error
        return false
      }
    }
    const geometry = execFileSync('xdotool', ['getwindowgeometry', '--shell', windowId], { encoding: 'utf8' })
    const width = Number(/^WIDTH=(\d+)$/m.exec(geometry)?.[1])
    const height = Number(/^HEIGHT=(\d+)$/m.exec(geometry)?.[1])
    assert(width > 200 && height > 150)
    keys('mousemove', '--window', windowId, String(width - 38), String(height - 24))
    keys('click', '1')
    await wait(() => !isStillOpen(), 'native GTK dialog accepted ' + title, 7000)
  }
}

async function connect(label, profile, action, sharedDefault = false) {
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  const environment = { ...process.env }
  delete environment.ELECTRON_RUN_AS_NODE
  delete environment.ELECTRON_RENDERER_URL
  const flags = sharedDefault ? [] : ['--piano-audit']
  if (!sharedDefault) environment.DDIRORI_PIANO_QA_DATA = profile
  if (process.platform === 'linux') {
    environment.GTK_USE_PORTAL = '0'
    flags.push('--no-sandbox')
  }
  const startupOnly = mode === 'startup'
  const layoutQa = mode === 'layout'
  const measureStartup = startupOnly || layoutQa
  const profileReload = startupOnly && process.env.STUDIO_QA_PROFILE_RELOAD === '1'
  const forceRosetta = measureStartup && process.env.STUDIO_QA_FORCE_ROSETTA === '1'
  const slowLayout = layoutQa && forceRosetta
  const observeLayout = slowLayout ? 150000 : undefined
  if (forceRosetta) assert.equal(process.platform, 'darwin')
  if (!measureStartup) flags.push('--disable-gpu')
  flags.push('--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + port)
  const startedAt = Date.now()
  const launch = forceRosetta ? '/usr/bin/arch' : executable
  const args = forceRosetta ? ['-x86_64', executable, ...flags] : flags
  const child = spawn(launch, args, { env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = fs.createWriteStream(path.join(results, label + '-process.log'))
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  const exited = new Promise(resolve => {
    child.once('error', error => resolve({ error: String(error) }))
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
  let socket, id = 0
  const pending = new Map()
  const startup = { stage: 'renderer target', browserListeningMs: null }
  let startupStderr = ''
  let reloadTrace
  const parsedScripts = new Map()
  if (measureStartup) {
    child.stderr.on('data', chunk => {
      if (startup.browserListeningMs !== null) return
      startupStderr = (startupStderr + chunk).slice(-500)
      if (startupStderr.includes('DevTools listening on')) startup.browserListeningMs = Date.now() - startedAt
    })
  }
  const call = (method, params = {}, timeoutMs = slowLayout ? 150000 : 15000) => new Promise((resolve, reject) => {
    const token = ++id
    const timeout = setTimeout(() => {
      pending.delete(token)
      reject(Error('CDP timed out: ' + method))
    }, timeoutMs)
    pending.set(token, message => {
      clearTimeout(timeout)
      if (message.error) reject(Error(JSON.stringify(message.error)))
      else resolve(message.result)
    })
    socket.send(JSON.stringify({ id: token, method, params }))
  })
  const evaluate = async (fn, value, timeoutMs) => {
    const response = await call('Runtime.evaluate', {
      expression: '(' + fn.toString() + ')(' + (JSON.stringify(value) ?? '') + ')',
      awaitPromise: true, returnByValue: true, userGesture: true
    }, timeoutMs)
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails))
    return response.result.value
  }
  const state = () => evaluate(() => ({
    startup: Boolean(document.querySelector('.start-screen')),
    title: document.querySelector('.studio-document h1')?.textContent ?? '',
    unsaved: document.querySelector('.studio-document__state')?.textContent ?? '',
    status: document.querySelector('.editor-status')?.textContent ?? '',
    startupFeedback: document.querySelector('.studio-start__feedback')?.textContent ?? '',
    recent: document.querySelector('.recent-files__list')?.textContent ?? '',
    selected: [...document.querySelectorAll('.notation-event.is-selected')].map(event => event.dataset.eventId)
  }))
  let report
  let failure
  try {
    const location = 'http://127.0.0.1:' + port
    const target = await wait(async () => {
      try {
        const targets = await (await fetch(location + '/json/list', { signal: AbortSignal.timeout(1500) })).json()
        return targets.find(item => item.type === 'page' && item.url.includes('app.asar'))
      } catch {
        return undefined
      }
    }, 'packaged renderer', slowLayout ? 180000 : measureStartup ? 120000 : 30000)
    const rendererTargetMs = Date.now() - startedAt
    Object.assign(startup, { stage: 'DevTools setup', rendererTargetMs })
    const mainPath = fileURLToPath(target.url)
    const asar = mainPath.slice(0, mainPath.indexOf('app.asar') + 'app.asar'.length)
    const appAsarSha256 = hash(asar)
    if (expectedAsar) assert.equal(appAsarSha256, expectedAsar)
    const mountType = process.env.STUDIO_QA_DELIVERY_MODE === 'appimage-fuse'
      ? execFileSync('findmnt', ['-n', '-o', 'FSTYPE', '--target', asar], { encoding: 'utf8' }).trim()
      : null
    if (mountType !== null) assert.match(mountType, /^fuse(?:\.|$)/)
    socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (reloadTrace && message.method === 'Tracing.dataCollected') {
        for (const event of message.params.value) reloadTrace.events.push(event)
      } else if (reloadTrace && message.method === 'Tracing.tracingComplete') {
        reloadTrace.complete.resolve(message.params)
      }
      if (profileReload && message.method === 'Debugger.scriptParsed') {
        const { scriptId, url } = message.params
        if (url.includes('/app.asar/out/renderer/assets/') && url.endsWith('.js')) {
          parsedScripts.set(url, scriptId)
        }
      }
      if (message.method === 'Page.javascriptDialogOpening') {
        call('Page.handleJavaScriptDialog', { accept: true }).catch(error => log.write(String(error) + '\n'))
      }
      const handle = pending.get(message.id)
      if (handle) {
        pending.delete(message.id)
        handle(message)
      }
    })
    startup.debuggerAttachedMs = Date.now() - startedAt
    const setOffline = async () => {
      await call('Network.enable')
      await call('Network.emulateNetworkConditionsByRule', {
        offline: true,
        matchedNetworkConditions: [{ urlPattern: '', latency: 0, downloadThroughput: -1, uploadThroughput: -1 }]
      })
    }
    await call('Page.enable')
    if (!startupOnly) await setOffline()
    startup.stage = 'initial start screen'
    startup.firstUiProbeStartedMs = Date.now() - startedAt
    await wait(async remaining => {
      const visible = await evaluate(requireVisible => {
        const actions = document.querySelector('.start-actions')
        return requireVisible ? Boolean(actions?.checkVisibility()) : Boolean(actions)
      }, measureStartup, measureStartup ? remaining : undefined)
      if (startup.firstUiProbeReturnedMs === undefined) {
        startup.firstUiProbeReturnedMs = Date.now() - startedAt
        startup.visibleAtFirstProbe = visible
      }
      return visible
    }, 'Studio start screen', observeLayout ?? (measureStartup ? 60000 : undefined))
    const startScreenMs = Date.now() - startedAt
    Object.assign(startup, { stage: 'offline reload', startScreenMs })

    let offlineStartScreen
    if (startupOnly) {
      const timingSnapshot = () => {
        const nav = performance.getEntriesByType('navigation')[0]
        const paints = Object.fromEntries(performance.getEntriesByType('paint').map(paint => [paint.name, paint.startTime]))
        if (paints['first-contentful-paint'] === undefined) return null
        const resources = performance.getEntriesByType('resource')
          .filter(resource => resource.name.startsWith('file:'))
          .map(resource => ({
            name: resource.name.split('/').at(-1),
            initiator: resource.initiatorType,
            responseEndMs: resource.responseEnd,
            durationMs: resource.duration
          }))
          .sort((a, b) => b.durationMs - a.durationMs)
          .slice(0, 8)
        const probe = globalThis.__studioQaStartup
        return {
          timeOrigin: performance.timeOrigin,
          domInteractive: nav?.domInteractive ?? null,
          domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
          paints, resources,
          actionInsertedMs: probe?.actionInsertedMs ?? null,
          actionVisibleMs: probe?.actionVisibleMs ?? null,
          longTasks: probe?.longTasks ?? []
        }
      }
      startup.documentTiming = await wait(remaining => evaluate(timingSnapshot, undefined, remaining),
        'initial first contentful paint timing', 45000)
      startup.documentTiming.navigationStartMs = Math.round(startup.documentTiming.timeOrigin - startedAt)
      await setOffline()
      const installObserver = () => {
        const probe = { actionInsertedMs: null, actionVisibleMs: null, longTasks: [] }
        globalThis.__studioQaStartup = probe
        const tasks = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            probe.longTasks.push({ startMs: entry.startTime, durationMs: entry.duration })
          }
        })
        tasks.observe({ type: 'longtask', buffered: true })
        const observer = new MutationObserver(() => {
          const actions = document.querySelector('.start-actions')
          if (!actions) return
          observer.disconnect()
          probe.actionInsertedMs = performance.now()
          const visible = () => {
            if (actions.checkVisibility()) probe.actionVisibleMs = performance.now()
            else requestAnimationFrame(visible)
          }
          requestAnimationFrame(visible)
        })
        observer.observe(document, { childList: true, subtree: true })
      }
      await call('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installObserver.toString() + ')()' })
      reloadTrace = { events: [], complete: Promise.withResolvers() }
      await call('Tracing.start', {
        transferMode: 'ReportEvents',
        traceConfig: {
          recordMode: 'record-until-full',
          includedCategories: ['devtools.timeline', 'v8', 'v8.execute', 'loading', 'blink.user_timing', 'toplevel']
        }
      })
      if (profileReload) {
        await call('Profiler.enable')
        await call('Profiler.setSamplingInterval', { interval: 5000 })
        await call('Profiler.start')
      }
      await call('Page.reload', { ignoreCache: true })
      startup.stage = 'offline image decode and visibility'
      offlineStartScreen = await wait(async remaining => {
        try {
          return await evaluate(async () => {
            if (globalThis.__studioQaStartup?.actionVisibleMs == null) return null
            const image = document.querySelector('.start-screen img.dd-bach')
            if (!image?.complete) return null
            await image.decode()
            if (!image.checkVisibility() || !image.naturalWidth || !image.naturalHeight) return null
            return { alt: image.alt, width: image.naturalWidth, height: image.naturalHeight }
          }, undefined, remaining)
        } catch (error) {
          if (/Execution context was destroyed|Cannot find context/.test(error.message)) return null
          throw error
        }
      }, 'decoded Bach illustration on the offline Studio start screen', 60000)
      startup.reloadTiming = await wait(remaining => evaluate(timingSnapshot, undefined, remaining),
        'offline first contentful paint timing', 45000)
      const cpu = profileReload ? (await call('Profiler.stop')).profile : undefined
      await call('Tracing.end')
      let timeout
      try {
        const completed = await Promise.race([reloadTrace.complete.promise, new Promise((_resolve, reject) => {
          timeout = setTimeout(() => reject(Error('Timed out collecting the reload trace')), 25000)
        })])
        assert(!completed.dataLossOccurred, 'reload trace buffer overflow')
        assert(reloadTrace.events.length > 0)
      } finally {
        clearTimeout(timeout)
      }
      const trace = gzipSync(JSON.stringify({ traceEvents: reloadTrace.events }))
      fs.writeFileSync(path.join(results, label + '-reload-trace.json.gz'), trace)
      if (cpu) {
        assert(cpu.samples.length > 0 && cpu.samples.length === cpu.timeDeltas.length)
        fs.writeFileSync(path.join(results, label + '-reload-cpu.json.gz'), gzipSync(JSON.stringify(cpu)))
        await call('Debugger.enable')
        const sources = []
        const profiledUrls = new Set(cpu.nodes.map(({ callFrame }) => callFrame.url))
        for (const [url, scriptId] of parsedScripts) {
          if (!profiledUrls.has(url)) continue
          const { scriptSource } = await call('Debugger.getScriptSource', { scriptId })
          sources.push({ scriptId, file: url.split('/').at(-1),
            bytes: Buffer.byteLength(scriptSource), sha256: createHash('sha256').update(scriptSource).digest('hex') })
        }
        assert(sources.length > 0, 'CPU profile must include at least one packaged renderer script')
        fs.writeFileSync(path.join(results, label + '-bundle-sources.json'), JSON.stringify(sources, null, 2) + '\n')
        await call('Debugger.disable')
      }
    }
    const click = value => wait(() => evaluate(label => {
      const element = [...document.querySelectorAll('button, [role=button], [role=menuitem], [role=option]')].find(node =>
        node.checkVisibility() && !node.disabled && !node.closest('[inert]') &&
        (node.getAttribute('aria-label') === label || node.textContent.trim() === label))
      if (!element) return false
      element.click()
      return true
    }, value), value, observeLayout)
    const status = text => wait(async () => {
      const current = await state()
      return current.status.includes(text) && current
    }, text, observeLayout)
    const menu = async label => { await click('파일'); await click(label) }
    const chooser = async (clickAction, title, file) => {
      await clickAction()
      if (!layoutQa) await dialog(title, file)
    }
    const open = async file => {
      if (!(await state()).startup) await menu('파일 작업 열기')
      await chooser(() => click('프로젝트 열기'), '띠로리 Studio 프로젝트 열기', file)
      return status(path.basename(file) + '을 열었습니다')
    }
    const importMxl = async file => {
      await menu('파일 작업 열기')
      await chooser(() => click('MusicXML 가져오기'), 'MusicXML 가져오기', file)
      return status(path.basename(file) + '을 가져왔습니다')
    }
    const save = async file => {
      await chooser(() => menu('프로젝트 다른 이름으로 저장'), '띠로리 Studio 프로젝트 저장', file)
      return status(path.basename(file) + '에 저장했습니다')
    }
    const screenshot = async name => {
      const frame = await call('Page.captureScreenshot')
      fs.writeFileSync(path.join(results, label + '-' + name + '.png'), Buffer.from(frame.data, 'base64'))
    }
    const edit = async originalPitch => {
      await evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowUp', code: 'ArrowUp', bubbles: true
      })))
      const current = await status('1회 수정')
      assert(current.unsaved.includes('저장하지 않은 변경') && current.selected.length)
      const recovery = path.join(profile, 'autosave', 'recovery.json')
      const snapshot = await wait(() => {
        if (!fs.existsSync(recovery)) return false
        const entry = read(recovery)
        return JSON.stringify(pitch(entry.score)) !== JSON.stringify(originalPitch) && entry
      }, 'edited score in the on-disk recovery file', observeLayout)
      assert.equal(snapshot.metadata.version, version)
      return { recovery, snapshot }
    }
    const exportMxl = async file => {
      await menu('내보내기 설정')
      await chooser(() => click('MusicXML 내보내기'), 'MusicXML 내보내기', file)
      return status(path.basename(file) + '로 MusicXML을 내보냈습니다')
    }
    startup.stage = 'start-screen screenshot'
    const details = await action({ state, click, menu, open, save, status, screenshot, edit, exportMxl, importMxl,
      evaluate, startScreenMs, browserListeningMs: startup.browserListeningMs, observeLayout,
      setStage: stage => { startup.stage = stage } })
    report = { executable, packagePath: asar, appAsarSha256, expectedAppVersion: version, profile, sharedDefault, platform: process.platform,
      arch: process.arch, mountType, deliveryMode: process.env.STUDIO_QA_DELIVERY_MODE ?? null, details }
    if (layoutQa && process.env.STUDIO_QA_OPEN_PHASES === '1') {
      fs.writeFileSync(path.join(results, label + '-observed.json'), JSON.stringify(report, null, 2))
    }
    if (startupOnly) Object.assign(report, { forceRosetta, rendererTargetMs, startScreenMs, offlineStartScreen, startupTiming: startup })
  } catch (error) {
    failure = error
    const latest = socket?.readyState === WebSocket.OPEN ? await state().catch(() => null) : null
    fs.writeFileSync(path.join(results, label + '-failure.json'), JSON.stringify({
      error: String(error), latest, ...(measureStartup && { startup, elapsedMs: Date.now() - startedAt })
    }, null, 2))
    if (process.platform === 'linux') {
      try {
        execFileSync('xwd', ['-root', '-silent', '-out', path.join(results, label + '-desktop.xwd')], { timeout: 2500 })
      } catch (captureError) { log.write(String(captureError) + '\n') }
    }
  } finally {
    const simulateInterruptedSession = !failure && ((mode === 'prepare' && process.platform === 'win32') ||
      (layoutQa && label === 'first-open' && process.env.STUDIO_QA_LAYOUT_ROUNDTRIP === '1'))
    if (simulateInterruptedSession) {
      // The auto-saved bytes have already been read and copied. Stop our old
      // process to simulate a session interrupted before the installer runs.
      assert.equal(child.exitCode, null)
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: 5000, windowsHide: true })
      } else {
        child.kill('SIGKILL')
      }
    } else if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: ++id, method: 'Browser.close' }))
    }
    const waitExit = () => Promise.race([exited, new Promise(resolve => setTimeout(resolve, 10000).unref())])
    let closed = await waitExit()
    const forcedTimingCleanup = !closed && report && slowLayout && process.env.STUDIO_QA_OPEN_PHASES === '1' &&
      process.env.STUDIO_QA_LAYOUT_ROUNDTRIP !== '1'
    if (forcedTimingCleanup) {
      child.kill('SIGKILL')
      closed = await waitExit()
    }
    socket?.close()
    if (!closed) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }).unref()
      } else child.kill()
    }
    log.end()
    if (!failure) {
      if (simulateInterruptedSession || forcedTimingCleanup) assert(closed && 'code' in closed, 'owned app process must exit')
      else assert.deepEqual(closed, { code: 0, signal: null }, 'packaged executable should exit normally')
      fs.writeFileSync(path.join(results, label + '.json'), JSON.stringify({ ...report, exit: closed,
        exitKind: simulateInterruptedSession ? 'interrupted-after-autosave'
          : forcedTimingCleanup ? 'forced-after-timing' : 'normal' }, null, 2))
    }
  }
  if (failure) throw failure
  return report.details
}

const sourceFor = key => path.join(files, 'source-' + key + '.chromatics')
const copyFor = label => path.join(files, label + '.chromatics')
const profileFor = key => key === 'v3' && process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'in-C') : path.join(work, 'profile-' + key)

function checkCopy(copy, snapshot, key) {
  const project = read(copy)
  assert.equal(project.version, key === 'v3' ? 3 : 2)
  assert.deepEqual(pitch(project.score), pitch(snapshot.score))
  if (key === 'v3') assert.equal(project.score.hairpins[0].endTime.tick, 20160)
  return { savedSha256: hash(copy), savedVersion: project.version, savedPitch: pitch(project.score),
    endTick: project.score.hairpins?.[0]?.endTime?.tick ?? null }
}

async function main() {
  if (mode === 'layout') {
    const profile = path.join(work, 'profile-layout')
    const source = path.join(files, 'input.chromatics')
    const original = hash(source)
    const trial = process.env.STUDIO_QA_LAYOUT_VARIANT
    const measureOpenPhases = process.env.STUDIO_QA_OPEN_PHASES === '1'
    assert(['base', 'candidate'].includes(trial))
    assert.equal(process.env.STUDIO_QA_PRINT_DIR, files)
    const layoutReady = await connect('first-open', profile, async qa => {
      qa.setStage('first contentful paint')
      const startup = await wait(async () => qa.evaluate(() => {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]
        return fcp && { fcpMs: fcp.startTime, planCalls: performance.getEntriesByName('qa-print-layout').length,
          startupPlanMs: performance.getEntriesByName('qa-print-layout-duration').map(entry => entry.duration) }
      }), 'startup first contentful paint', qa.observeLayout ?? 30000)
      assert(trial === 'base' ? startup.planCalls > 0 : startup.planCalls === 0)
      qa.setStage('first visible score')
      const openBudget = qa.observeLayout ?? 25000
      const ready = await qa.evaluate(async ({ budget, measureOpenPhases }) => {
        const plansBefore = performance.getEntriesByName('qa-print-layout').length
        const start = performance.now()
        const button = [...document.querySelectorAll('button')].find(node =>
          node.textContent.trim() === '프로젝트 열기' && node.checkVisibility() && !node.disabled)
        if (!button) throw new Error('Open project button unavailable')
        button.click()
        return new Promise((resolve, reject) => {
          const frame = () => {
            const page = document.querySelector('.score-page[data-pdf-page-size]')
            const note = page?.querySelector('.notation-event')
            if (note?.checkVisibility()) {
              const visibleAt = performance.now()
              const phase = measureOpenPhases ? Object.fromEntries(
                ['ipc-request', 'ipc-return', 'decoded', 'state-queued', 'commit'].map(name =>
                  [name, performance.getEntriesByName('qa-open-' + name).at(-1)?.startTime ?? null])) : undefined
              if (phase && Object.values(phase).some(value => value === null)) {
                reject(new Error('Missing file open timing mark: ' + JSON.stringify(phase)))
                return
              }
              const attributes = page.getAttributeNames().filter(name => name.startsWith('data-pdf-'))
              resolve({ openMs: visibleAt - start,
                planCalls: performance.getEntriesByName('qa-print-layout').length - plansBefore,
                layout: Object.fromEntries(attributes.sort().map(name => [name, page.getAttribute(name)])),
                ...(phase && {
                  lyricWidthMs: performance.getEntriesByName('qa-text-widths')
                    .filter(entry => entry.startTime >= start).map(entry => entry.duration),
                  lyricWidthBeforeOpenMs: performance.getEntriesByName('qa-text-widths')
                    .filter(entry => entry.startTime < start).map(entry => entry.duration),
                  openPhaseMs: {
                  requestPreparation: phase['ipc-request'] - start,
                  ipcWait: phase['ipc-return'] - phase['ipc-request'],
                  rendererDecode: phase.decoded - phase['ipc-return'],
                  statePreparation: phase['state-queued'] - phase.decoded,
                  editorCommit: phase.commit - phase['state-queued'],
                  firstNoteAfterCommit: visibleAt - phase.commit,
                  planCallsMs: performance.getEntriesByName('qa-print-layout-duration')
                    .filter(entry => entry.startTime >= start).map(entry => entry.duration)
                  }
                }) })
            } else if (performance.now() - start > budget) reject(new Error('First visible score timed out'))
            else requestAnimationFrame(frame)
          }
          requestAnimationFrame(frame)
        })
      }, { budget: openBudget, measureOpenPhases }, openBudget + 15000)
      await qa.status('input.chromatics을 열었습니다')
      assert(ready.planCalls > 0)
      assert.equal(hash(source), original)
      const result = { ...ready, fcpMs: startup.fcpMs, startPlanCalls: startup.planCalls,
        screenWallMs: qa.startScreenMs, devtoolsWallMs: qa.browserListeningMs,
        ...(measureOpenPhases && { startupPlanMs: startup.startupPlanMs }) }
      if (process.env.STUDIO_QA_LAYOUT_ROUNDTRIP !== '1') return result
      qa.setStage('edit and autosave')
      const { recovery, snapshot } = await qa.edit(pitch(read(source).score))
      fs.copyFileSync(recovery, path.join(results, 'autosave.json'))
      return { ...result, autosaveSha256: hash(recovery), editedPitch: pitch(snapshot.score) }
    })
    if (process.env.STUDIO_QA_LAYOUT_ROUNDTRIP !== '1') return
    const autosave = path.join(profile, 'autosave/recovery.json')
    assert.equal(hash(autosave), layoutReady.autosaveSha256)
    await connect('recovered', profile, async qa => {
      qa.setStage('recover and save native')
      await qa.click('복구본 열기')
      await qa.status('프로젝트 복구본을 열었습니다')
      const recovered = path.join(files, 'recovered.chromatics')
      await qa.save(recovered)
      const snapshot = read(path.join(results, 'autosave.json'))
      const saved = checkCopy(recovered, snapshot, 'v3')
      assert.deepEqual(read(recovered).score, snapshot.score)
      assert(!fs.existsSync(autosave))
      assert.equal(hash(source), original)
      qa.setStage('save PDF')
      await qa.menu('내보내기 설정')
      await qa.click('PDF 변환')
      await qa.status('score.pdf')
      qa.setStage('save PNG')
      await qa.menu('PNG 출력 설정')
      await wait(() => qa.evaluate(() => {
        const control = document.activeElement
        if (!control?.matches('.studio-export-tools [role="combobox"]')) return false
        control.click()
        return true
      }), 'focused PNG page scope', qa.observeLayout)
      await qa.click('페이지 선택')
      await qa.click('PNG 내보내기')
      await qa.status('score.png')
      for (const name of ['recovered.chromatics', 'score.pdf', 'score.png']) {
        fs.copyFileSync(path.join(files, name), path.join(results, name))
      }
      return { ...saved, original, pdfSha256: hash(path.join(files, 'score.pdf')), pngSha256: hash(path.join(files, 'score.png')) }
    })
    process.env.STUDIO_QA_INPUT = 'recovered.chromatics'
    await connect('reopened', profile, async qa => {
      qa.setStage('reopen saved native')
      await qa.open(path.join(files, 'recovered.chromatics'))
      assert.equal(hash(source), original)
      return { reopened: true }
    })
    return
  }
  if (mode === 'startup') {
    await connect('startup', path.join(work, 'profile-startup'), async qa => {
      const current = await qa.state()
      assert(current.startup && !current.recent.trim())
      await qa.screenshot('start-screen')
      return { startScreen: current.startup, emptyRecents: true, userDataIsolated: true }
    })
    return
  }
  if (mode === 'previous-read') {
    for (const key of ['v2', 'v3']) {
      const source = copyFor('recovered-' + key)
      const original = hash(source)
      const expected = read(source)
      const profile = path.join(work, 'profile-previous-' + key)
      await connect('previous-read-' + key, profile, async qa => {
        await qa.open(source)
        const copy = copyFor('alpha44-roundtrip-' + key)
        await qa.save(copy)
        const saved = checkCopy(copy, expected, key)
        const actual = read(copy)
        assert.deepEqual(actual.score.hairpins, expected.score.hairpins)
        assert.equal(hash(source), original)
        await qa.open(copy)
        await qa.screenshot('roundtrip')
        return { original, reopened: true, ...saved }
      })
    }
    return
  }
  if (mode === 'portable-default') {
    assert.equal(process.platform, 'win32')
    const profile = profileFor('v3')
    const recovered = copyFor('recovered-v3')
    const saved = hash(recovered)
    await connect('portable-default', profile, async qa => {
      await wait(async () => (await qa.state()).recent.includes(path.basename(recovered)),
        'installed recent file in portable default profile')
      assert(!fs.existsSync(path.join(profile, 'autosave', 'recovery.json')))
      await qa.screenshot('recent')
      await qa.open(recovered)
      assert.equal(hash(recovered), saved)
      return { recentFromInstalled: true, reopened: true, installedFile: path.basename(recovered), sha256: saved }
    }, true)
    return
  }
  if (mode === 'prepare' || mode === 'recover') {
    for (const key of ['v2', 'v3']) {
      const profile = profileFor(key)
      const sharedDefault = process.platform === 'win32' && key === 'v3'
      const source = sourceFor(key)
      if (mode === 'prepare') {
        fs.copyFileSync(fixture[key], source, fs.constants.COPYFILE_EXCL)
        await connect('published-' + key, profile, async qa => {
          assert(!(await qa.state()).recent.trim(), 'published run must start with an empty recent list')
          await qa.open(source)
          const original = hash(source)
          const { recovery, snapshot } = await qa.edit(pitch(read(source).score))
          const recent = path.join(profile, 'recent-musicxml.json')
          assert(read(recent).some(item => item.filePath === source && item.format === 'native'))
          assert.equal(hash(source), original)
          await qa.screenshot('unsaved')
          fs.copyFileSync(recovery, path.join(files, 'before-' + key + '.json'))
          return { original, recovery: hash(recovery), recent: hash(recent),
            autosaveVersion: snapshot.metadata.version, editedPitch: pitch(snapshot.score) }
        }, sharedDefault)
      } else {
        const old = read(path.join(results, 'published-' + key + '.json')).details
        const recovery = path.join(profile, 'autosave', 'recovery.json')
        assert.equal(hash(recovery), old.recovery)
        assert.equal(hash(path.join(profile, 'recent-musicxml.json')), old.recent)
        await connect('installed-recovered-' + key, profile, async qa => {
          await wait(async () => (await qa.state()).recent.includes(path.basename(source)), 'previous recent file')
          assert.equal(hash(recovery), old.recovery)
          await qa.screenshot('startup-recovery')
          await qa.click('복구본 열기')
          await qa.status('프로젝트 복구본을 열었습니다')
          const rewritten = await wait(() => {
            if (!fs.existsSync(recovery)) return false
            const entry = read(recovery)
            return entry.metadata.version === version && entry
          }, 'rewritten recovery has the candidate application version')
          assert.deepEqual(pitch(rewritten.score), old.editedPitch)
          fs.copyFileSync(recovery, path.join(files, 'after-' + key + '.json'))
          const afterRecoveryHash = hash(recovery)
          assert.notEqual(afterRecoveryHash, old.recovery)
          const copy = copyFor('recovered-' + key)
          await qa.save(copy)
          const snapshot = read(path.join(files, 'before-' + key + '.json'))
          assert.equal(hash(source), old.original)
          assert(!fs.existsSync(recovery))
          const saved = checkCopy(copy, snapshot, key)
          await qa.open(copy)
          await qa.screenshot('reopened')
          return { original: hash(source), beforeRecovery: old.recovery, afterRecovery: afterRecoveryHash,
            autosaveVersion: rewritten.metadata.version, recentRecovered: true, reopened: true, ...saved }
        }, sharedDefault)
      }
    }
    return
  }

  const profile = process.platform === 'linux' && process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, 'in-C') : path.join(work, 'profile-' + mode)
  const source = sourceFor('v3')
  fs.copyFileSync(fixture.v3, source, fs.constants.COPYFILE_EXCL)
  await connect(mode, profile, async qa => {
    assert(!(await qa.state()).recent.trim())
    assert(!fs.existsSync(path.join(profile, 'autosave', 'recovery.json')))
    await qa.open(source)
    const original = hash(source)
    const { snapshot } = await qa.edit(pitch(read(source).score))
    const copy = copyFor(mode)
    await qa.save(copy)
    const saved = checkCopy(copy, snapshot, 'v3')
    await qa.open(copy)
    await qa.screenshot('reopened')
    let mxl, importedMxl
    if (mode === 'distribution') {
      const output = path.join(files, 'distribution.mxl')
      await qa.exportMxl(output)
      mxl = hash(output)
      if (process.platform === 'linux') {
        await qa.importMxl(output)
        const restored = copyFor('mxl-imported')
        await qa.save(restored)
        importedMxl = checkCopy(restored, snapshot, 'v3')
        assert.equal(hash(output), mxl)
        await qa.screenshot('mxl-imported')
      }
    }
    assert.equal(hash(source), original)
    return { original, reopened: true, mxl, importedMxl, autosaveVersion: snapshot.metadata.version, ...saved }
  }, process.platform === 'linux' && Boolean(process.env.XDG_CONFIG_HOME))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
