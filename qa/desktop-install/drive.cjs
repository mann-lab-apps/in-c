const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { spawn, execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { fileURLToPath } = require('node:url')

const [mode, executableArg, workArg, expectedAsar] = process.argv.slice(2)
assert(['fresh', 'prepare', 'recover', 'distribution', 'portable-default'].includes(mode))
const executable = path.resolve(executableArg)
const work = path.resolve(workArg)
const results = path.join(work, 'results')
const files = path.join(work, 'files')
const version = '0.1.0-alpha.43'
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
  while (Date.now() < deadline) {
    const value = await test()
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
  flags.push('--disable-gpu', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + port)
  const child = spawn(executable, flags, { env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = fs.createWriteStream(path.join(results, label + '-process.log'))
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  const exited = new Promise(resolve => {
    child.once('error', error => resolve({ error: String(error) }))
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
  let socket, id = 0
  const pending = new Map()
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const token = ++id
    const timeout = setTimeout(() => {
      pending.delete(token)
      reject(Error('CDP timed out: ' + method))
    }, 15000)
    pending.set(token, message => {
      clearTimeout(timeout)
      if (message.error) reject(Error(JSON.stringify(message.error)))
      else resolve(message.result)
    })
    socket.send(JSON.stringify({ id: token, method, params }))
  })
  const evaluate = async (fn, value) => {
    const response = await call('Runtime.evaluate', {
      expression: '(' + fn.toString() + ')(' + (JSON.stringify(value) ?? '') + ')',
      awaitPromise: true, returnByValue: true, userGesture: true
    })
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
    }, 'packaged renderer', 30000)
    const mainPath = fileURLToPath(target.url)
    const asar = mainPath.slice(0, mainPath.indexOf('app.asar') + 'app.asar'.length)
    const appAsarSha256 = hash(asar)
    if (expectedAsar) assert.equal(appAsarSha256, expectedAsar)
    socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (message.method === 'Page.javascriptDialogOpening') {
        call('Page.handleJavaScriptDialog', { accept: true }).catch(error => log.write(String(error) + '\n'))
      }
      const handle = pending.get(message.id)
      if (handle) {
        pending.delete(message.id)
        handle(message)
      }
    })
    await call('Page.enable')
    await call('Network.enable')
    await call('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] })
    await wait(() => evaluate(() => Boolean(document.querySelector('.start-actions'))), 'Studio start screen')
    const click = value => wait(() => evaluate(label => {
      const element = [...document.querySelectorAll('button, [role=button], [role=menuitem]')].find(node =>
        node.checkVisibility() && !node.disabled && !node.closest('[inert]') &&
        (node.getAttribute('aria-label') === label || node.textContent.trim() === label))
      if (!element) return false
      element.click()
      return true
    }, value), value)
    const status = text => wait(async () => {
      const current = await state()
      return current.status.includes(text) && current
    }, text)
    const menu = async label => { await click('파일'); await click(label) }
    const chooser = async (clickAction, title, file) => {
      await clickAction()
      await dialog(title, file)
    }
    const open = async file => {
      if (!(await state()).startup) await menu('파일 작업 열기')
      await chooser(() => click('프로젝트 열기'), '띠로리 Studio 프로젝트 열기', file)
      return status(path.basename(file) + '을 열었습니다')
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
      }, 'edited score in the on-disk recovery file')
      assert.equal(snapshot.metadata.version, version)
      return { recovery, snapshot }
    }
    const exportMxl = async file => {
      await menu('내보내기 설정')
      await chooser(() => click('MusicXML 내보내기'), 'MusicXML 내보내기', file)
      return status(path.basename(file) + '로 MusicXML을 내보냈습니다')
    }
    const details = await action({ state, click, menu, open, save, status, screenshot, edit, exportMxl })
    report = { executable, packagePath: asar, appAsarSha256, profile, sharedDefault, platform: process.platform,
      arch: process.arch, deliveryMode: process.env.STUDIO_QA_DELIVERY_MODE ?? null, details }
  } catch (error) {
    failure = error
    const latest = socket?.readyState === WebSocket.OPEN ? await state().catch(() => null) : null
    fs.writeFileSync(path.join(results, label + '-failure.json'), JSON.stringify({ error: String(error), latest }, null, 2))
    if (process.platform === 'linux') {
      try {
        execFileSync('xwd', ['-root', '-silent', '-out', path.join(results, label + '-desktop.xwd')], { timeout: 2500 })
      } catch (captureError) { log.write(String(captureError) + '\n') }
    }
  } finally {
    const simulateInterruptedSession = mode === 'prepare' && process.platform === 'win32' && !failure
    if (simulateInterruptedSession) {
      // The auto-saved bytes have already been read and copied. Stop our old
      // process to simulate a session interrupted before the installer runs.
      assert.equal(child.exitCode, null)
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: 5000, windowsHide: true })
    } else if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: ++id, method: 'Browser.close' }))
    }
    const closed = await Promise.race([exited, pause(10000).then(() => undefined)])
    socket?.close()
    if (!closed) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }).unref()
      } else child.kill()
    }
    log.end()
    if (!failure) {
      if (simulateInterruptedSession) assert(closed && 'code' in closed, 'interrupted app process must exit')
      else assert.deepEqual(closed, { code: 0, signal: null }, 'packaged executable should exit normally')
      fs.writeFileSync(path.join(results, label + '.json'), JSON.stringify({ ...report, exit: closed,
        exitKind: simulateInterruptedSession ? 'interrupted-after-autosave' : 'normal' }, null, 2))
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
          return { original, recovery: hash(recovery), recent: hash(recent), editedPitch: pitch(snapshot.score) }
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
          const copy = copyFor('recovered-' + key)
          await qa.save(copy)
          const snapshot = read(path.join(files, 'before-' + key + '.json'))
          assert.equal(hash(source), old.original)
          assert(!fs.existsSync(recovery))
          const saved = checkCopy(copy, snapshot, key)
          await qa.open(copy)
          await qa.screenshot('reopened')
          return { original: hash(source), beforeRecovery: old.recovery, recentRecovered: true, reopened: true, ...saved }
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
    let mxl
    if (mode === 'distribution') {
      const output = path.join(files, 'distribution.mxl')
      await qa.exportMxl(output)
      mxl = hash(output)
    }
    assert.equal(hash(source), original)
    return { original, reopened: true, mxl, ...saved }
  }, process.platform === 'linux' && Boolean(process.env.XDG_CONFIG_HOME))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
