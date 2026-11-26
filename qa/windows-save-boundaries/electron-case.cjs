const assert = require('node:assert/strict')
const fs = require('node:fs')
const filePromises = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { spawn, spawnSync } = require('node:child_process')
const { app, BrowserWindow, dialog, ipcMain, nativeTheme } = require('electron')

const [bundle, out, format, scenario] = process.argv.slice(-4)
assert(path.isAbsolute(bundle) && path.isAbsolute(out))
assert.equal(format, 'mxl')
assert(['replace', 'new-destination', 'locked-original', 'locked-copy'].includes(scenario))
const { strFromU8, strToU8, unzipSync, zipSync } = require(process.env.STUDIO_QA_FFLATE)
const extension = 'mxl'
const width = Number(process.env.STUDIO_QA_WIDTH)
assert([960, 1400].includes(width))
assert(!scenario.startsWith('locked-') || process.platform === 'win32')
fs.mkdirSync(out)

const profile = path.join(out, 'profile')
const recovery = path.join(profile, 'autosave', 'recovery.json')
const target = path.join(out, 'original.' + extension)
const copy = path.join(out, 'save-copy.' + extension)
const fixture = name => path.join(__dirname, 'fixtures', name)
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const pitch = score => score.parts[0].staves[0].measures[0].voices[0].events[0].pitch
const musicXml = fs.readFileSync(fixture('repeat-independent.musicxml'), 'utf8')
const initialTitle = 'Windows file safety original'
const logs = []

function scoreXml(file) {
  const archive = unzipSync(fs.readFileSync(file))
  const container = strFromU8(archive['META-INF/container.xml'])
  const entry = /\bfull-path="([^"]+)"/.exec(container)?.[1]
  assert(entry && archive[entry], 'Missing root score in fixture archive')
  return strFromU8(archive[entry])
}

function writeScore(file, title, earlierFile) {
  const source = earlierFile ? scoreXml(earlierFile) : musicXml
  const updated = source.replace(/<work-title>[^<]*<\/work-title>/, '<work-title>' + title + '</work-title>')
  assert.notEqual(updated, source)
  fs.writeFileSync(file, zipSync({
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>'),
    'score.musicxml': strToU8(updated)
  }, { mtime: new Date('2026-11-25T00:00:00Z') }))
}

writeScore(target, initialTitle)
fs.mkdirSync(path.dirname(recovery), { recursive: true })
fs.copyFileSync(fixture('v3-recovery.json'), recovery)
const initialRecovery = read(recovery)

app.setPath('userData', profile)
if (process.platform === 'darwin') app.setActivationPolicy('accessory')
app.disableHardwareAcceleration()
nativeTheme.themeSource = width === 960 ? 'dark' : 'light'
BrowserWindow.prototype.show = () => {}
BrowserWindow.prototype.showInactive = () => {}
BrowserWindow.prototype.focus = () => {}
app.focus = () => {}
process.argv.push('--piano-audit')
process.env.DDIRORI_PIANO_QA_DATA = profile
delete process.env.ELECTRON_RENDERER_URL

// Allow the real backup to finish before the independent fixture process performs its rename.
let onBackup
let onTempClose
const copyFile = filePromises.copyFile.bind(filePromises)
filePromises.copyFile = async (from, to, ...options) => {
  await copyFile(from, to, ...options)
  if (onBackup && path.relative(profile, path.dirname(to)) === 'musicxml-backups') {
    const callback = onBackup
    onBackup = undefined
    callback(to)
  }
}

const openFile = filePromises.open.bind(filePromises)
filePromises.open = async (file, ...options) => {
  const fileHandle = await openFile(file, ...options)
  if (onTempClose && path.dirname(file) === out && /^\.studio-musicxml-.*\.tmp$/.test(path.basename(file))) {
    const close = fileHandle.close.bind(fileHandle)
    fileHandle.close = async () => {
      await close()
      const callback = onTempClose
      onTempClose = undefined
      callback(file)
    }
  }
  return fileHandle
}

const saves = []
const handle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, callback) => handle(channel, async (...args) => {
  if (channel !== 'musicxml:save' && channel !== 'musicxml:export') return callback(...args)
  try {
    const result = await callback(...args)
    saves.push({ file: result?.filePath ?? null })
    return result
  } catch (error) {
    saves.push({ code: error.code ?? null, error: error.message })
    throw error
  }
})

let win
let stage = 'launch'
let cancelOpen = false
let openDialogs = 0
let saveDialogs = 0
let chosenOpen = target
let chosenSave = copy
dialog.showOpenDialog = async () => {
  openDialogs++
  return cancelOpen ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: [chosenOpen] }
}
dialog.showSaveDialog = async () => {
  saveDialogs++
  return { canceled: false, filePath: chosenSave }
}

const evaluate = (fn, arg) => win.webContents.executeJavaScript('(' + fn.toString() + ')(' + (JSON.stringify(arg) ?? '') + ')')
const state = () => evaluate(() => ({
  title: document.querySelector('.studio-document h1')?.textContent ?? '',
  status: document.querySelector('.editor-status')?.textContent ?? '',
  unsaved: document.querySelector('.studio-document__state')?.textContent ?? '',
  selected: [...document.querySelectorAll('.notation-event.is-selected')].map(note => note.dataset.eventId),
  viewport: [innerWidth, innerHeight],
  theme: document.querySelector('.studio-document')?.getAttribute('data-theme')
}))
const documentState = ({ title, unsaved, selected }) => ({ title, unsaved, selected })

async function wait(test, subject) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const result = await test()
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 40))
  }
  throw new Error(stage + ' / ' + subject + ' / ' + JSON.stringify(await state()))
}

async function click(label, selector = 'button, [role=button]') {
  await wait(() => evaluate(({ label, selector }) => {
    const control = [...document.querySelectorAll(selector)].find(node => node.checkVisibility() && !node.disabled &&
      (node.textContent.trim() === label || node.getAttribute('aria-label') === label))
    if (!control) return false
    control.scrollIntoView({ block: 'nearest' })
    control.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }, { label, selector }), label)
}

async function menu(group, label) {
  await click(group, '.studio-application-menu button')
  await click(label, '[role=menuitem]')
}

const statusWith = label => wait(async () => {
  const current = await state()
  return current.status.includes(label) && current
}, label)
const openLabel = 'MusicXML 가져오기'
const file = path.basename(target)
const openedNotice = file + '을 가져왔습니다'
const savedNotice = file + '을 MusicXML로 내보냈습니다'
const conflictNotice = '파일이 앱 밖에서 변경되어 덮어쓰지 않았습니다'
const save = () => menu('파일', 'MusicXML로 저장')
const saveCopy = async () => {
  await menu('파일', '내보내기 설정')
  await click('MusicXML 내보내기')
}
const open = () => click(openLabel)
const change = key => evaluate(key => window.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true })), key)
const cleanup = () => assert(!fs.readdirSync(out).some(name => /\.(?:tmp|bak)$/.test(name)))
const autosaved = title => wait(() => {
  if (!fs.existsSync(recovery)) return undefined
  const entry = read(recovery)
  return entry.score.title === title && entry
}, 'current edit on disk in recovery')
async function capture(name) {
  await evaluate(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
  fs.writeFileSync(path.join(out, name + '.png'), (await win.webContents.capturePage()).toPNG())
}

async function openAndEdit() {
  stage = 'open the generated recovery and edit an original file'
  await click('복구본 열기')
  await statusWith('프로젝트 복구본을 열었습니다')
  await evaluate(() => { window.confirm = () => true })
  await wait(() => read(recovery).metadata.updatedAt !== initialRecovery.metadata.updatedAt, 'restored snapshot')
  await menu('파일', '파일 작업 열기')
  await open()
  const opened = await statusWith(openedNotice)
  assert(opened.title.includes(initialTitle))
  await change('ArrowUp')
  const edited = await statusWith('1회 수정')
  assert(edited.selected.length && edited.unsaved.includes('저장하지 않은 변경'))
  return { edited, pending: await autosaved(initialTitle), originalHash: sha(target), recoveryHash: sha(recovery) }
}

function externalWrite(source, destination, operation) {
  const child = spawnSync(process.env.STUDIO_QA_NODE, [path.join(__dirname, 'replace-file.cjs'), out, source, destination, operation], {
    encoding: 'utf8', timeout: 10000, windowsHide: true
  })
  assert.ifError(child.error)
  assert.equal(child.status, 0, child.stderr)
  const evidence = JSON.parse(child.stdout)
  assert.notEqual(evidence.pid, process.pid)
  return evidence
}

function assertProtected(current, initial, hash) {
  assert.deepEqual(documentState(current), documentState(initial.edited))
  assert.equal(sha(target), hash)
  assert.equal(sha(recovery), initial.recoveryHash)
  assert.deepEqual(read(recovery), initial.pending)
  cleanup()
}

async function checkReplacement(initial) {
  stage = 'replace from a separate process after the backup'
  const firstTitle = 'Changed by separate process during save'
  const replacement = path.join(out, 'incoming.' + extension)
  writeScore(replacement, firstTitle)
  const firstExternalHash = sha(replacement)
  fs.copyFileSync(replacement, path.join(out, 'external-before-conflict.' + extension))
  let renameEvidence
  let backupHash
  onBackup = file => {
    backupHash = sha(file)
    assert.equal(sha(target), initial.originalHash)
    renameEvidence = externalWrite(replacement, target, 'replace')
    assert.equal(sha(target), firstExternalHash)
  }
  await save()
  const conflict = await statusWith(conflictNotice)
  assert(renameEvidence && backupHash)
  assert.match(saves.at(-1).error, /changed on disk/)
  assertProtected(conflict, initial, firstExternalHash)
  logs.push({ stage, editorPid: process.pid, replacement: renameEvidence, backupHash, initial: initial.originalHash,
    expectedOriginal: firstExternalHash, actualOriginal: sha(target), recovery: sha(recovery), selection: conflict.selected,
    unsaved: conflict.unsaved, tempFilesCleaned: true, status: conflict.status })
  fs.copyFileSync(recovery, path.join(out, 'recovery-after-conflict.json'))
  await capture('conflict-preserved')

  stage = 'cancel the discard confirmation then cancel file selection'
  await evaluate(() => {
    window.reopenPrompts = 0
    window.confirm = () => { window.reopenPrompts++; return false }
  })
  const beforeDialogs = openDialogs
  await open()
  await wait(() => evaluate(() => window.reopenPrompts === 1), 'discard confirmation canceled')
  assert.equal(openDialogs, beforeDialogs)
  assertProtected(await state(), initial, firstExternalHash)
  await evaluate(() => { window.confirm = () => true })
  cancelOpen = true
  await open()
  await wait(async () => openDialogs === beforeDialogs + 1 && await evaluate(label =>
    [...document.querySelectorAll('button')].some(node => node.getAttribute('aria-label') === label && !node.disabled), openLabel),
  'canceled chooser returned control')
  assertProtected(await state(), initial, firstExternalHash)
  cancelOpen = false
  logs.push({ stage, confirmationCanceled: true, selectionCanceled: true, original: sha(target), recovery: sha(recovery) })

  stage = 'reopen the external edit, change one note, and save in place'
  await open()
  const adopted = await statusWith(openedNotice)
  assert(adopted.title.includes(firstTitle) && adopted.unsaved.includes('변경 없음'))
  await change('ArrowDown')
  await statusWith('1회 수정')
  const revised = await autosaved(firstTitle)
  assert.notDeepEqual(pitch(revised.score), pitch(initial.pending.score))
  await save()
  const saved = await statusWith(savedNotice)
  assert(saved.unsaved.includes('변경 없음') && !fs.existsSync(recovery))
  assert.equal(fs.realpathSync(saves.at(-1).file), fs.realpathSync(target))
  const firstSaveHash = sha(target)
  assert.notEqual(firstSaveHash, firstExternalHash)
  assert.equal(saveDialogs, 0)
  assert(scoreXml(target).includes('<work-title>' + firstTitle + '</work-title>'))
  cleanup()
  fs.copyFileSync(target, path.join(out, 'reopened-and-saved.' + extension))
  logs.push({ stage, adoptedTitle: firstTitle, saved: firstSaveHash, savedPitch: pitch(revised.score), directlySaved: true })
  await capture('same-path-saved')

  stage = 'detect a second external edit after a successful save'
  await change('ArrowUp')
  const editedAgain = await wait(async () => {
    const current = await state()
    return current.unsaved.includes('저장하지 않은 변경') && current
  }, 'second local edit')
  await wait(() => {
    if (!fs.existsSync(recovery)) return undefined
    const entry = read(recovery)
    return entry.score.title === firstTitle && JSON.stringify(pitch(entry.score)) !== JSON.stringify(pitch(revised.score))
  }, 'second local edit on disk')
  const secondRecoveryHash = sha(recovery)
  const nextExternal = path.join(out, 'new-incoming.' + extension)
  writeScore(nextExternal, 'Second edit by separate process', target)
  const secondExternalHash = sha(nextExternal)
  const secondRename = externalWrite(nextExternal, target, 'replace')
  const attempts = saves.length
  await save()
  await wait(() => saves.length > attempts, 'second conflict reached IPC')
  assert.match(saves.at(-1).error, /changed on disk/)
  const secondConflict = await statusWith(conflictNotice)
  assert.deepEqual(documentState(secondConflict), documentState(editedAgain))
  assert.equal(sha(target), secondExternalHash)
  assert.equal(sha(recovery), secondRecoveryHash)
  cleanup()
  logs.push({ stage, replacement: secondRename, expectedOriginal: secondExternalHash, actualOriginal: sha(target),
    recovery: sha(recovery), secondConflictPreserved: true, tempFilesCleaned: true })
  fs.copyFileSync(recovery, path.join(out, 'recovery-after-second-conflict.json'))
  await capture('second-conflict-preserved')
}

async function reopenCopy() {
  chosenOpen = copy
  await menu('파일', '파일 작업 열기')
  await open()
  const reopened = await statusWith(path.basename(copy) + '을 가져왔습니다')
  assert(reopened.title.includes(initialTitle) && reopened.unsaved.includes('변경 없음'))
}

async function checkNewDestination(initial) {
  stage = 'create the selected destination after the MXL temporary file closes'
  const destination = path.join(out, 'occupied.mxl')
  const incoming = path.join(out, 'incoming.mxl')
  writeScore(incoming, 'Created by another process after choosing destination')
  const expectedHash = sha(incoming)
  let creation
  onTempClose = file => {
    assert(fs.statSync(file).size > 0 && !fs.existsSync(destination))
    creation = externalWrite(incoming, destination, 'create')
  }
  chosenSave = destination
  await saveCopy()
  const conflict = await statusWith('MusicXML 사본 내보내기를 마무리하지 못했습니다')
  assert(creation && creation.operation === 'create')
  assert.match(saves.at(-1).error, /changed on disk/)
  assert.equal(sha(destination), expectedHash)
  assertProtected(conflict, initial, initial.originalHash)
  fs.copyFileSync(recovery, path.join(out, 'recovery-after-conflict.json'))
  logs.push({ stage, editorPid: process.pid, creation, expectedDestination: expectedHash, destination: sha(destination),
    original: sha(target), recovery: sha(recovery), selection: conflict.selected, unsaved: conflict.unsaved,
    tempFilesCleaned: true, status: conflict.status })
  await capture('destination-conflict-preserved')

  stage = 'export to a fresh destination and reopen the copy'
  chosenSave = copy
  await saveCopy()
  const exported = await statusWith(path.basename(copy) + '로 MusicXML을 내보냈습니다')
  assert.equal(fs.realpathSync(saves.at(-1).file), fs.realpathSync(copy))
  assert.equal(saveDialogs, 2)
  assertProtected(exported, initial, initial.originalHash)
  assert.equal(sha(destination), expectedHash)
  const saved = sha(copy)
  await reopenCopy()
  assert.equal(sha(copy), saved)
  assert.equal(sha(destination), expectedHash)
  assert.equal(sha(target), initial.originalHash)
  logs.push({ stage, reopened: true, saved, savedPitch: pitch(initial.pending.score), title: initialTitle,
    destination: sha(destination), original: sha(target) })
  await capture('new-destination-copy-reopened')
}

async function checkLock(initial) {
  stage = 'lock the original from a second Windows process'
  const ready = path.join(out, 'lock.ready')
  const release = path.join(out, 'lock.release')
  const lockLog = fs.openSync(path.join(out, 'lock-process.log'), 'w')
  const lock = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'lock-target.ps1'),
    '-Target', target, '-Ready', ready, '-Release', release], { windowsHide: true, stdio: ['ignore', lockLog, lockLog] })
  fs.closeSync(lockLog)
  const exit = new Promise(resolve => {
    lock.once('error', error => resolve({ error: String(error) }))
    lock.once('exit', (code, signal) => resolve({ code, signal }))
  })
  let released = false
  async function unlock() {
    if (!released) {
      released = true
      fs.writeFileSync(release, '')
    }
    const deadline = Date.now() + 10000
    while (lock.exitCode === null && lock.signalCode === null && lock.pid && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 40))
    }
    if (lock.pid && lock.exitCode === null && lock.signalCode === null) lock.kill()
    assert.deepEqual(await exit, { code: 0, signal: null })
  }
  try {
    await wait(() => fs.existsSync(ready) && fs.statSync(ready).size > 0, 'the lock is held')
    const pid = Number(fs.readFileSync(ready, 'utf8'))
    assert.equal(pid, lock.pid)
    assert.notEqual(pid, process.pid)
    await save()
    const denied = await statusWith('MusicXML 저장을 마무리하지 못했습니다')
    const failure = saves.at(-1)
    assert.match(failure.code || failure.error, /\b(?:EACCES|EPERM|EBUSY)\b/)
    assert.equal(lock.exitCode, null)
    assertProtected(denied, initial, initial.originalHash)
    logs.push({ stage, editorPid: process.pid, lockPid: pid, error: failure, status: denied.status,
      original: sha(target), recovery: sha(recovery), selection: denied.selected, unsaved: denied.unsaved, tempFilesCleaned: true })
    fs.copyFileSync(target, path.join(out, 'original-at-failure.mxl'))
    fs.copyFileSync(recovery, path.join(out, 'recovery-after-locked-save.json'))
    await capture('locked-save-denied')
    if (scenario === 'locked-original') {
      stage = 'release lock and retry the original save'
      await unlock()
      await save()
      const saved = await statusWith(savedNotice)
      assert(saved.unsaved.includes('변경 없음') && !fs.existsSync(recovery))
    } else {
      stage = 'save to a separate path while the original remains locked'
      await saveCopy()
      const exported = await statusWith(path.basename(copy) + '로 MusicXML을 내보냈습니다')
      assert.equal(lock.exitCode, null)
      assertProtected(exported, initial, initial.originalHash)
    }
    const destination = scenario === 'locked-copy' ? copy : target
    assert.equal(fs.realpathSync(saves.at(-1).file), fs.realpathSync(destination))
    assert.equal(saveDialogs, scenario === 'locked-copy' ? 1 : 0)
    assert.notEqual(sha(destination), initial.originalHash)
    assert(scoreXml(destination).includes('<work-title>' + initialTitle + '</work-title>'))
    cleanup()
    logs.push({ stage, retry: 'passed', destination: path.basename(destination), saved: sha(destination),
      savedPitch: pitch(initial.pending.score), title: initialTitle, original: sha(target),
      recoveryAfterRetry: fs.existsSync(recovery) ? sha(recovery) : null })
    await capture('lock-retry-saved')
  } finally {
    await unlock()
  }
}

const timeout = setTimeout(() => {
  console.error('deadline', scenario, stage)
  app.exit(124)
}, 120000)
app.on('browser-window-created', (_event, created) => {
  win = created
  created.setContentSize(width, 750)
  created.webContents.setAudioMuted(true)
  created.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, reply) => reply({ cancel: true }))
  created.webContents.once('did-finish-load', async () => {
    try {
      const initial = await openAndEdit()
      if (scenario === 'replace') await checkReplacement(initial)
      else if (scenario === 'new-destination') await checkNewDestination(initial)
      else await checkLock(initial)
      const screen = await state()
      assert.deepEqual(screen.viewport, [width, 750])
      assert.equal(screen.theme, nativeTheme.themeSource)
      fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ scenario, format, width, platform: process.platform,
        arch: process.arch, electron: process.versions.electron, logs }, null, 2))
      clearTimeout(timeout)
      app.exit(0)
    } catch (error) {
      console.error(error)
      fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ scenario, format, width, stage,
        error: String(error), logs, saves, state: await state().catch(() => null) }, null, 2))
      try { await capture('failure') } finally { app.exit(1) }
    }
  })
})

require(bundle)
