// Render an actual app request/profile through the product sampler, using one gain for A/B.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const crypto = require('node:crypto'), { pathToFileURL } = require('node:url')
const input = path.resolve(process.env.PIANO_MODEL_QA_DIR || 'out/piano-performance-chord-20261031')
const output = path.resolve(process.env.PIANO_MODEL_AB_OUTPUT || 'out/piano-actual-model-ab-20261031')
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const requestFile = path.join(input, 'score-request.json')
const profileFile = path.join(input, 'prediction/expression.json')
const commandFile = process.env.PIANO_MODEL_COMMAND_INPUT && path.resolve(process.env.PIANO_MODEL_COMMAND_INPUT)
const comparison = commandFile ? JSON.parse(fs.readFileSync(commandFile)) : undefined
const request = comparison ? undefined : JSON.parse(fs.readFileSync(requestFile))
const profile = comparison ? undefined : JSON.parse(fs.readFileSync(profileFile))
const source = comparison || profile
assert.equal(source.trainingKind, 'audio-transcribed', 'actual audio-transcribed model required')
if (comparison) {
  assert.equal(comparison.version, 'voicing-only-score-reference-v1')
  assert.equal(comparison.timingPolicy, 'score-reference-no-learned-timing')
  assert.ok(Number.isFinite(comparison.cutoffSeconds) && comparison.cutoffSeconds > 0 && comparison.cutoffSeconds <= 48)
  assert.deepEqual(comparison.cases.map(c => c.label), ['basic', 'model'])
  const maps = comparison.cases.map(({ commands }) => {
    assert.ok(commands.length > 0 && commands.length <= 100000)
    const seen = new Set(), notes = new Map()
    for (const c of commands) {
      assert.ok(['on', 'off'].includes(c.type) && typeof c.id === 'string' && c.id.length > 0)
      assert.ok(Number.isFinite(c.time) && c.time >= 0 && c.time <= comparison.cutoffSeconds)
      assert.ok(Number.isInteger(c.pitch) && c.pitch >= 21 && c.pitch <= 108)
      assert.ok(Number.isFinite(c.velocity) && c.velocity >= 1 && c.velocity <= 127 && c.offset === 0)
      assert.ok(!seen.has(`${c.id}:${c.type}`), 'unique on/off for each note')
      seen.add(`${c.id}:${c.type}`)
      const row = notes.get(c.id) || {}
      row[c.type] = c
      notes.set(c.id, row)
    }
    for (const row of notes.values()) assert.ok(row.on && row.off && row.on.time < row.off.time)
    return notes
  })
  assert.equal(maps[0].size, maps[1].size)
  for (const [id, original] of maps[0]) {
    const model = maps[1].get(id)
    assert.ok(model)
    for (const kind of ['on', 'off']) for (const field of ['time', 'pitch', 'offset']) {
      assert.equal(model[kind][field], original[kind][field], 'voicing comparison preserves pitch and timing')
    }
  }
}
fs.mkdirSync(output) // Never replace an existing comparison.
app.disableHardwareAcceleration()
app.setPath('userData', path.join(output, 'user-data'))
let win
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 60000)
  try {
    const { build } = await import('esbuild')
    const bundle = await build({ bundle: true, write: false, format: 'esm', platform: 'browser',
      stdin: { resolveDir: process.cwd(), contents: `
        export { PianoSampler } from './src/renderer/src/playback/piano-sampler'
        export { createPianoCommands } from './src/renderer/src/playback/piano-transport'
        export { applyExpressionProfile, parseExpressionProfile } from './src/renderer/src/playback/expression-profile'
      ` } })
    fs.writeFileSync(path.join(output, 'render.mjs'), bundle.outputFiles[0].text)
    fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><title>Actual model piano A/B</title>')
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } })
    await win.loadFile(path.join(output, 'index.html'))
    const result = await win.webContents.executeJavaScript(`(${async ({ moduleUrl, manifestUrl, request, profile, comparison }) => {
      const { PianoSampler, createPianoCommands, applyExpressionProfile, parseExpressionProfile } = await import(moduleUrl)
      let bpm, cutoffBeat, cutoffSeconds, cases
      if (comparison) {
        ;({ bpm, cutoffBeat, cutoffSeconds, cases } = comparison)
      } else {
        parseExpressionProfile(profile, request)
        const [scoreBpm, timeline] = JSON.parse(request.scoreKey)
        if (scoreBpm !== request.bpm || !timeline.events.length) throw Error('Invalid app timeline identity')
        bpm = scoreBpm; cutoffBeat = 8; cutoffSeconds = cutoffBeat * 60 / bpm
        if (timeline.tempoEvents.length) throw Error('This fixed excerpt renderer requires a constant tempo')
        cases = [['basic', timeline], ['model', applyExpressionProfile(timeline, request, profile)]]
          .map(([label, value]) => ({ label, commands: createPianoCommands(value, 0, bpm, {}) }))
      }
      const context = new AudioContext({ sampleRate: 48000 })
      const sampler = new PianoSampler(context, manifestUrl)
      await sampler.initialize()
      const renders = []
      for (const { label, commands } of cases) {
        const ids = new Set(commands.filter(c => c.type === 'on' && c.time < cutoffSeconds).map(c => c.id))
        const selected = commands.filter(c => ids.has(c.id))
          .map(c => ({ ...c, time: Math.min(c.time, cutoffSeconds) }))
        const offline = new OfflineAudioContext(2, Math.ceil((cutoffSeconds + 2) * 48000), 48000)
        const engine = sampler.fork(offline)
        for (const c of selected) {
          if (c.type === 'on') engine.noteOn(c.id, c.pitch, c.velocity, c.time, c.offset)
          else engine.noteOff(c.id, c.time)
        }
        const buffer = await offline.startRendering()
        let peak = 0, squares = 0
        for (let channel = 0; channel < 2; channel++) for (const v of buffer.getChannelData(channel)) {
          if (!Number.isFinite(v)) throw Error('Non-finite rendered sample')
          peak = Math.max(peak, Math.abs(v)); squares += v * v
        }
        if (engine.activeVoices || peak === 0) throw Error('Stuck voices or silent render')
        renders.push({ label, buffer, commands: selected, noteCount: ids.size,
          peak, rms: Math.sqrt(squares / buffer.length / 2) })
        engine.dispose()
      }
      const gain = Math.min(.96 / Math.max(...renders.map(r => r.peak)),
        .0794 / (renders.reduce((sum, r) => sum + r.rms, 0) / 2))
      const files = renders.map(r => {
        const b = r.buffer, bytes = new Uint8Array(44 + b.length * 4), view = new DataView(bytes.buffer)
        const write = (offset, text) => [...text].forEach((ch, i) => bytes[offset + i] = ch.charCodeAt(0))
        write(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); write(8, 'WAVEfmt ')
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true)
        view.setUint32(24, 48000, true); view.setUint32(28, 192000, true)
        view.setUint16(32, 4, true); view.setUint16(34, 16, true); write(36, 'data')
        view.setUint32(40, bytes.length - 44, true)
        for (let i = 0; i < b.length; i++) for (let c = 0; c < 2; c++) {
          const value = b.getChannelData(c)[i] * gain
          if (Math.abs(value) > 1) throw Error('Output clipping')
          view.setInt16(44 + (i * 2 + c) * 2, Math.round(value * 32767), true)
        }
        let binary = ''
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
        return { label: r.label, peak: r.peak, rms: r.rms, gain, noteCount: r.noteCount,
          commands: r.commands, durationSeconds: b.duration, wav: btoa(binary) }
      })
      sampler.dispose(); await context.close()
      return { bpm, cutoffBeat, cutoffSeconds, files }
    }})(${JSON.stringify({ moduleUrl: pathToFileURL(path.join(output, 'render.mjs')).href,
      manifestUrl: pathToFileURL(path.resolve('out/renderer/piano/manifest.json')).href,
      request, profile, comparison })})`)
    const files = result.files.map(({ wav, ...record }) => {
      const target = path.join(output, `${record.label}.wav`)
      fs.writeFileSync(target, Buffer.from(wav, 'base64'))
      return { ...record, sha256: digest(target) }
    })
    assert.equal(files[0].gain, files[1].gain)
    assert.equal(files[0].noteCount, files[1].noteCount)
    const report = { ...result, files, sourceRequestSha256: comparison ? null : digest(requestFile),
      sourceProfileSha256: comparison ? null : digest(profileFile),
      sourceCommandsSha256: comparison ? digest(commandFile) : null, modelId: source.modelId,
      trainingKind: source.trainingKind, provenance: source.provenance,
      samplerSourceSha256: digest('src/renderer/src/playback/piano-sampler.ts'),
      sharedSamplerAndGain: true, humanListening: 'not-reviewed', productPromotion: 'not-approved',
      comparisonKind: comparison ? 'voicing-only-score-reference' : 'actual-app-profile',
      workId: comparison?.workId, split: comparison?.split,
      notes: comparison ? comparison.notes : '실제 녹음 전사 라벨로 학습한 모델의 첫8박. 같은 sampler/출력 gain이며 RMS 동일화나 blind preference 검사는 아니다. BWV846 train 작품의 청음 자료로 일반화 근거가 아니다.' }
    fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify(report, null, 2))
    console.log(`PASS actual model A/B: ${files[0].noteCount} notes, ${files[0].durationSeconds.toFixed(2)}s, same sampler/gain`)
  } finally { clearTimeout(timeout); win?.destroy(); app.quit() }
}).catch(error => { console.error(error); app.exit(1) })
