// Actual Electron renderer and Web Audio scheduling; file selection is injected for QA.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')

const output = path.resolve(process.env.PIANO_QA_OUTPUT || 'out/piano-performance-qa')
const experiment = path.resolve('experiments/piano-performance')
const checkpoint = path.resolve(process.env.PIANO_CHECKPOINT ||
  'experiments/piano-performance/runs/integration-20261026/model')
const expectedKind = process.env.PIANO_TRAINING_KIND || 'synthetic'
const voicingMode = process.env.PIANO_PROFILE_VERSION === '2'
const expectedLabel = expectedKind === 'audio-transcribed' ? '실제 녹음 · 전사 추정값' : '합성 데이터'
const scoreSource = process.env.PIANO_SCORE_XML && path.resolve(process.env.PIANO_SCORE_XML)
if (scoreSource) ipcMain.handle('musicxml:open', () => ({
  filePath: scoreSource, fileName: path.basename(scoreSource),
  contents: fs.readFileSync(scoreSource, 'utf8')
}))
fs.mkdirSync(output, { recursive: true })
for (const name of ['failure.txt', 'failure.png', 'renderer.log', 'results.json']) {
  fs.rmSync(path.join(output, name), { force: true })
}
app.disableHardwareAcceleration()
app.setPath('userData', path.join(output, 'user-data'))
for (const channel of ['recent-musicxml:list', 'recent-musicxml:add', 'project:list-backups']) {
  ipcMain.handle(channel, () => [])
}
for (const channel of ['autosave:read', 'autosave:write', 'autosave:clear']) {
  ipcMain.handle(channel, () => null)
}
let win
const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`)
const settle = () => run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const wait = async (fn, label, timeout = 15000) => {
  const deadline = Date.now() + timeout
  while (!await fn()) {
    assert.ok(Date.now() < deadline, `Timed out: ${label}`)
    await settle()
  }
}
const click = async label => {
  await run(label => {
    const element = [...document.querySelectorAll('button')]
      .find(node => (node.getAttribute('aria-label') || node.textContent.trim()) === label && node.checkVisibility())
    if (!element || element.disabled) throw new Error(`Unavailable: ${label}`)
    element.click()
  }, label)
  await settle()
}
app.whenReady().then(async () => {
  const deadline = setTimeout(() => { console.error('QA deadline'); app.exit(1) }, 200000)
  try {
    win = new BrowserWindow({ width: 1400, height: 950, show: true,
      webPreferences: { preload: path.resolve('out/preload/index.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false } })
    win.webContents.on('console-message', event => {
      if (['warning', 'error'].includes(event.level)) {
        fs.appendFileSync(path.join(output, 'renderer.log'), event.message + '\n')
      }
    })
    win.webContents.on('will-prevent-unload', event => event.preventDefault())
    await win.loadFile(path.resolve('out/renderer/index.html'), {
      query: { fixture: 'single-voice-mvp', performanceLab: '1' }
    })
    await wait(() => run(() => Boolean(document.querySelector('[aria-label="연주 모델 실험"]'))), 'panel')
    if (scoreSource) {
      await click('파일')
      await click('MusicXML 가져오기')
      await wait(() => run(name => document.body.innerText.includes(`${name}을 가져왔습니다.`),
        path.basename(scoreSource)), 'real score import')
    }
    const requestPath = path.join(output, 'score-request.json')
    let downloaded = false
    win.webContents.session.once('will-download', (_event, item) => {
      item.setSavePath(requestPath)
      item.once('done', (_event, state) => { downloaded = state === 'completed' })
    })
    await click(voicingMode ? '음별 강약 입력 내보내기' : '악보 입력 내보내기')
    await wait(async () => downloaded, 'request export')
    const inference = execFileSync('uv', ['run', '--extra', 'transcription', 'python', '-m',
      voicingMode ? 'piano_performance.voicing_infer' : 'piano_performance.infer',
      '--checkpoint', checkpoint, '--request', requestPath, '--output', path.join(output, 'prediction')],
    { cwd: experiment, encoding: 'utf8' })
    const profile = JSON.parse(fs.readFileSync(path.join(output, 'prediction/expression.json'), 'utf8'))
    const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'))
    assert.equal(profile.trainingKind, expectedKind)
    assert.equal(profile.version, voicingMode ? 2 : 1)
    assert.equal(profile.notes.length, request.notes.length)
    if (scoreSource) {
      execFileSync('uv', ['run', '--extra', 'transcription', 'python', '-m', 'piano_performance.audit',
        '--score', scoreSource, '--request', requestPath], { cwd: experiment, encoding: 'utf8' })
    }
    const upload = async value => {
      await run(value => {
        const input = document.querySelector('[aria-label="연주 예측 파일"]')
        const transfer = new DataTransfer()
        transfer.items.add(new File([JSON.stringify(value)], 'expression.json', { type: 'application/json' }))
        input.files = transfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, value)
      await settle()
    }
    await upload(profile)
    await wait(() => run(label => document.querySelector('[aria-label="연주 모델 실험"]').textContent.includes(label), expectedLabel), 'profile loaded')
    const sampleManifest = JSON.parse(fs.readFileSync('src/renderer/public/piano/manifest.json', 'utf8'))
    await run(samples => {
      window.__pianoSchedule = []
      const metadata = new WeakMap()
      const decode = AudioContext.prototype.decodeAudioData
      AudioContext.prototype.decodeAudioData = async function (encoded) {
        const digest = await crypto.subtle.digest('SHA-256', encoded.slice(0))
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
        const buffer = await decode.call(this, encoded)
        metadata.set(buffer, samples.find(s => s.sha256 === hash))
        return buffer
      }
      const create = AudioContext.prototype.createBufferSource
      AudioContext.prototype.createBufferSource = function () {
        const node = create.call(this), start = node.start.bind(node)
        const connect = node.connect.bind(node)
        let record, envelope = []
        node.connect = function (target) {
          if (target instanceof GainNode) envelope = target.__pianoEnvelope
          return connect(target)
        }
        node.start = function (time, offset) {
          const sample = metadata.get(node.buffer)
          if (!sample) throw Error('Unknown piano sample buffer')
          const pitch = Math.round(sample.rootPitch + 12 * Math.log2(node.playbackRate.value))
          record = { time, pitch, sample: sample.file, type: 'piano-sample', envelope, ended: false }
          window.__pianoSchedule.push(record)
          return start(time, offset)
        }
        node.addEventListener('ended', () => { if (record) record.ended = true })
        return node
      }
      const gain = AudioContext.prototype.createGain
      AudioContext.prototype.createGain = function () {
        const node = gain.call(this)
        node.__pianoEnvelope = []
        for (const method of ['exponentialRampToValueAtTime', 'linearRampToValueAtTime']) {
          const original = node.gain[method].bind(node.gain)
          node.gain[method] = function (value, time) {
            node.__pianoEnvelope.push({ method, value, time })
            return original(value, time)
          }
        }
        return node
      }
    }, sampleManifest.samples)
    const combined = sources => {
      const notes = new Map()
      for (const source of sources) {
        const key = `${source.time.toFixed(7)}:${source.pitch}`
        const note = notes.get(key) || { time: source.time, pitch: source.pitch, type: source.type, amplitude: 0 }
        note.amplitude += source.envelope.find(e => e.value > 0)?.value ?? 0
        notes.set(key, note)
      }
      return [...notes.values()].sort((a, b) => a.time - b.time || a.pitch - b.pitch)
    }
    await click('재생')
    await wait(async () => combined(await run(() => window.__pianoSchedule)).length >= request.notes.length,
      'complete basic scheduling', 120000)
    await click('정지')
    await wait(() => run(() => window.__pianoSchedule.every(n => n.ended)), 'basic sources cancelled')
    const basic = await run(() => window.__pianoSchedule)
    await run(() => { window.__pianoSchedule = [] })
    await click('모델')
    await run(() => {
      const rewind = document.querySelector('button[aria-label="처음으로"]')
      if (rewind && !rewind.disabled) rewind.click()
    })
    await settle()
    await click('재생')
    await wait(async () => combined(await run(() => window.__pianoSchedule)).length >= request.notes.length,
      'complete model scheduling', 120000)
    const modelFirstPass = await run(() => window.__pianoSchedule)
    await click('일시정지')
    await click('재생')
    await wait(() => run(count => window.__pianoSchedule.length > count, modelFirstPass.length), 'resume rescheduled notes')
    await click('정지')
    await wait(() => run(() => window.__pianoSchedule.every(n => n.ended)), 'model sources cancelled')
    const model = await run(() => window.__pianoSchedule)
    const predictions = new Map(profile.notes.map(n => [n.noteId, n]))
    const expectedBasic = request.notes.map(n => ({
      time: n.onsetBeats * 60 / request.bpm, pitch: n.midiPitch,
      duration: n.durationBeats * 60 / request.bpm
    })).sort((a, b) => a.time - b.time || a.pitch - b.pitch)
    const voicingTimeline = voicingMode ? JSON.parse(JSON.parse(request.scoreKey)[1])[1] : undefined
    const expectedModel = request.notes.map(n => {
      const predicted = predictions.get(n.noteId)
      if (!voicingMode) return {
        time: Math.max(0, n.onsetBeats * 60 / request.bpm + predicted.timingOffsetSeconds),
        pitch: n.midiPitch, velocity: 0.35 + 0.65 * predicted.velocity / 127
      }
      const eventIndex = Number(n.noteId.split(':')[0]), event = voicingTimeline.events[eventIndex]
      const size = (event.frequencies || [event.frequency]).length
      const raw = Math.min(.24, event.velocityStart * predicted.velocityGain) / Math.sqrt(size)
      const midiVelocity = Math.max(1, Math.min(127, raw / .24 * 127))
      return { time: n.onsetBeats * 60 / request.bpm, pitch: n.midiPitch,
        velocity: .35 + .65 * midiVelocity / 127 }
    }).sort((a, b) => a.time - b.time || a.pitch - b.pitch)
    const ordered = combined
    const checkSchedule = (actual, expected, label) => {
      const notes = ordered(actual)
      assert.equal(notes.length, expected.length, `${label} note count`)
      const origin = notes[0].time - expected[0].time
      for (let i = 0; i < notes.length; i++) {
        assert.equal(notes[i].pitch, expected[i].pitch, `${label} pitch ${i}`)
        assert.equal(notes[i].type, 'piano-sample', `${label} same sampled piano`)
        assert.ok(Math.abs(notes[i].time - origin - expected[i].time) < 0.0001,
          `${label} onset ${i} matches exported input/prediction`)
        if (expected[i].velocity !== undefined) {
          assert.ok(Math.abs(notes[i].amplitude - expected[i].velocity) < 0.00001,
            `${label} velocity ${i}`)
        }
      }
    }
    checkSchedule(basic, expectedBasic, 'basic')
    checkSchedule(modelFirstPass, expectedModel, 'model')
    if (voicingMode) {
      assert.ok(profile.notes.some(n => Math.abs(n.velocityGain - 1) > 1e-4), 'non-neutral learned voicing')
      assert.deepEqual(expectedModel.map(n => n.time), expectedBasic.map(n => n.time), 'score timing preserved')
      const levels = new Set(voicingTimeline.events.filter(e => e.frequency).map(e => e.velocityStart.toFixed(5)))
      assert.ok(levels.size >= 2, 'QA score has different authored dynamics')
    }
    assert.ok(basic.every(n => n.ended), 'stop cancels scheduled basic tones')
    assert.ok(model.length > modelFirstPass.length, 'resume schedules remaining notes')
    assert.ok(model.every(n => n.ended), 'pause/stop cancel model tones')
    const basicGaps = ordered(basic).map(n => n.time - Math.min(...basic.map(n => n.time)))
    const modelGaps = ordered(modelFirstPass).map(n => n.time - Math.min(...modelFirstPass.map(n => n.time)))
    for (const width of [1400, 960]) {
      win.setSize(width, 950)
      await run(() => document.querySelector('[aria-label="연주 모델 실험"]').scrollIntoView({ block: 'center' }))
      await settle()
      const fits = await run(() => {
        const panel = document.querySelector('[aria-label="연주 모델 실험"]')
        const box = panel.getBoundingClientRect()
        return box.top >= -1 && box.bottom <= innerHeight + 1 &&
          [...panel.children].filter(n => n.checkVisibility()).every(n => {
          const r = n.getBoundingClientRect()
          return r.left >= box.left - 1 && r.right <= box.right + 1
        })
      })
      assert.ok(fits, `Panel contents fit at ${width}`)
      fs.writeFileSync(path.join(output, `comparison-${width}.png`), (await win.webContents.capturePage()).toPNG())
    }
    await upload({ ...profile, scoreKey: 'different-score' })
    await wait(() => run(() => Boolean(document.querySelector('.performance-lab [role="alert"]'))), 'stale profile error')
    assert.ok(await run(() => document.querySelector('.performance-lab [role="radio"]:last-child').disabled))
    await upload(profile)
    await wait(() => run(label => document.querySelector('[aria-label="연주 모델 실험"]').textContent.includes(label), expectedLabel), 'profile reloaded')
    await click('모델')
    await click('악보로 이동')
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Up', modifiers: ['alt'] })
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Up', modifiers: ['alt'] })
    await wait(() => run(() => document.querySelector('[aria-label="연주 모델 실험"]').textContent.includes('예측 미등록')), 'profile invalidated by score edit')
    assert.ok(await run(() => document.querySelector('.performance-lab [role="radio"]:last-child').disabled))
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({
      trainingKind: profile.trainingKind, noteCount: profile.notes.length,
      profileVersion: profile.version, relativeVoicingOnly: voicingMode,
      authoredTimingPreserved: voicingMode, authoredDynamicsChecked: voicingMode,
      scoreSource: scoreSource || 'single-voice-mvp fixture',
      inference, basicGaps, modelGaps, defaultAndModelScheduled: true,
      scheduledNotesCompared: request.notes.length, allOnsetsAndVelocitiesMatch: true,
      sameTimbre: sampleManifest.id,
      pauseResumeStop: true, staleProfileRejected: true, editInvalidatesProfile: true,
      sourceScoreOnsetsPitchesDurationsMatch: Boolean(scoreSource), widths: [1400, 960],
      scope: 'Actual renderer/Web Audio scheduling; injected file selection; no listening quality claim.'
    }, null, 2))
    console.log(voicingMode ? 'PASS v2 relative voicing -> authored dynamics/timing -> Electron comparison' :
      'PASS exported score -> reloaded model -> JSON/MIDI -> Electron comparison scheduling')
  } catch (error) {
    if (win) {
      fs.writeFileSync(path.join(output, 'audio-probe-failure.json'), JSON.stringify(
        await run(() => ({ sourceCount: window.__pianoSchedule?.length,
          sources: window.__pianoSchedule?.slice(-8),
          selected: [...document.querySelectorAll('.notation-event.is-selected')].map(n => ({ ...n.dataset })) })), null, 2))
      fs.writeFileSync(path.join(output, 'failure.txt'), String(error) + '\n' +
        await run(() => document.body.innerText))
      fs.writeFileSync(path.join(output, 'failure.png'), (await win.webContents.capturePage()).toPNG())
    }
    throw error
  } finally {
    clearTimeout(deadline)
    if (win) win.destroy()
    app.quit()
  }
}).catch(error => { console.error(error); app.exit(1) })
