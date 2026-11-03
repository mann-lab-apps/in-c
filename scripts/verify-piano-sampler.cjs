// Real browser decoding/offline rendering of the same sampler used by the app.
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const output = path.resolve('out/piano-instrument-qa')
fs.mkdirSync(output, { recursive: true })
app.disableHardwareAcceleration()
app.setPath('userData', path.join(output, 'user-data'))
let win
app.whenReady().then(async () => {
  const deadline = setTimeout(() => app.exit(1), 60000)
  try {
    const { transformWithEsbuild } = await import('vite')
    const source = fs.readFileSync('src/renderer/src/playback/piano-sampler.ts', 'utf8')
    const js = (await transformWithEsbuild(source, 'piano-sampler.ts', { target: 'es2022' })).code
    fs.writeFileSync(path.join(output, 'piano-sampler.mjs'), js)
    const { build } = await import('esbuild')
    const cases = await build({ bundle: true, write: false, format: 'esm', platform: 'browser',
      stdin: { resolveDir: process.cwd(), contents: `
        import { createSingleVoiceMvpScore } from './src/testing/single-voice-mvp-fixture'
        import { createPlaybackTimeline } from './src/renderer/src/playback/timeline'
        import { expressPianoScore } from './src/renderer/src/playback/piano-expression'
        import { createPianoCommands } from './src/renderer/src/playback/piano-transport'
        import { serializeMusicXml } from './src/musicxml/serialize'
        const score = createSingleVoiceMvpScore()
        const part = score.parts[0], staff = part.staves[0]
        staff.measures = staff.measures.slice(0, 4)
        score.tempo = { bpm: 100 }
        score.dynamics = [{ id:'qa-p', measureId:staff.measures[0].id, value:'p' },
          { id:'qa-f', measureId:staff.measures[1].id, value:'f' }]
        staff.measures[0].voices[0].events[0].articulations = ['staccato']
        score.pedalEvents = [{ id:'qa-down', partId:part.id, staffId:staff.id,
          measureId:staff.measures[0].id, tick:0, value:127 },
          { id:'qa-up', partId:part.id, staffId:staff.id,
          measureId:staff.measures[1].id, tick:0, value:0 }]
        export const scoreXml = serializeMusicXml(score)
        export const expressionCases = Object.fromEntries([false,true].map(natural =>
          [natural ? 'expression-natural' : 'expression-basic',
            createPianoCommands(expressPianoScore(score,createPlaybackTimeline(score),natural),0,100,{})]))
      ` } })
    fs.writeFileSync(path.join(output, 'expression-cases.mjs'), cases.outputFiles[0].text)
    fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><title>Piano render QA</title>')
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } })
    win.webContents.on('console-message', e => { if (e.level === 'error') console.error(e.message) })
    await win.loadFile(path.join(output, 'index.html'))
    const result = await win.webContents.executeJavaScript(`(${async ({ code, manifest, casesCode }) => {
      const { PianoSampler } = await import(code)
      const { expressionCases, scoreXml } = await import(casesCode)
      const context = new AudioContext({ sampleRate: 48000 })
      const sampler = new PianoSampler(context, manifest)
      const before = performance.now()
      await sampler.initialize()
      const loadMs = performance.now() - before
      const cached = performance.now()
      await sampler.initialize()
      const cacheMs = performance.now() - cached
      const renders = []
      const phrase = [
        [21, 45, .2, 1], [48, 45, 1.4, 1], [60, 32, 2.6, .5], [60, 80, 3.3, .5],
        [60, 120, 4, .5], [72, 90, 4.7, .6], [108, 90, 5.4, .6],
        ...[60, 64, 67, 72].map(p => [p, 80, 6.2, 1.3]),
        ...[0, 1, 2, 3, 4].map(i => [60, 65 + i * 9, 8 + i * .23, .15])
      ]
      let expressionGain
      const pack = (buffer, label, fixedGain) => {
        let peak = 0, sum = 0, invalid = 0
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
        for (const samples of channels) for (const v of samples) {
          if (!Number.isFinite(v)) invalid++
          peak = Math.max(peak, Math.abs(v)); sum += v * v
        }
        const rms = Math.sqrt(sum / buffer.length / channels.length)
        // Whole-file gain only. Note-to-note dynamics remain intact.
        const gain = fixedGain ?? Math.min(.0794 / Math.max(rms, 1e-6), .96 / Math.max(peak, 1e-6))
        const bytes = new Uint8Array(buffer.length * channels.length * 2 + 44)
        const view = new DataView(bytes.buffer)
        const text = (offset, value) => [...value].forEach((c, i) => bytes[offset + i] = c.charCodeAt(0))
        text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVEfmt ')
        view.setUint32(16, 16, true); view.setUint16(20, 1, true)
        view.setUint16(22, channels.length, true); view.setUint32(24, buffer.sampleRate, true)
        view.setUint32(28, buffer.sampleRate * channels.length * 2, true)
        view.setUint16(32, channels.length * 2, true); view.setUint16(34, 16, true)
        text(36, 'data'); view.setUint32(40, bytes.length - 44, true)
        for (let i = 0; i < buffer.length; i++) for (let c = 0; c < channels.length; c++) {
          const v = Math.max(-1, Math.min(1, channels[c][i] * gain))
          view.setInt16(44 + (i * channels.length + c) * 2, Math.round(v * 32767), true)
        }
        let binary = ''
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
        return { label, peak, rms, gain, invalid, wav: btoa(binary) }
      }
      for (const label of ['triangle', 'piano', 'piano-pedal', 'polyphony-64', 'polyphony-64-fff', ...Object.keys(expressionCases)]) {
        const offline = new OfflineAudioContext(2, 12 * 48000, 48000)
        const engine = sampler.fork(offline)
        const events = label.startsWith('polyphony-64')
          ? Array.from({ length: 64 }, (_, i) => [24 + i, label.endsWith('fff') ? 127 : 100, .2, 1.5]) : phrase
        if (label === 'piano-pedal') engine.setSustain(true, 0)
        for (const [index, [pitch, velocity, start, duration]] of (expressionCases[label] ? [] : events).entries()) {
          if (label === 'triangle') {
            const osc = offline.createOscillator(), gain = offline.createGain()
            osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((pitch - 69) / 12)
            gain.gain.setValueAtTime(0, start)
            gain.gain.linearRampToValueAtTime(velocity / 127 * .16, start + .015)
            gain.gain.setValueAtTime(velocity / 127 * .16, start + duration - .04)
            gain.gain.linearRampToValueAtTime(0, start + duration)
            osc.connect(gain); gain.connect(offline.destination)
            osc.start(start); osc.stop(start + duration)
          } else {
            engine.noteOn(String(index), pitch, velocity, start)
            engine.noteOff(String(index), start + duration)
          }
        }
        for (const command of expressionCases[label] ?? []) {
          if (command.type === 'on') engine.noteOn(command.id, command.pitch, command.velocity, command.time, command.offset)
          else engine.noteOff(command.id, command.time)
        }
        if (label === 'piano-pedal') engine.setSustain(false, 10)
        const voicesBeforeRender = engine.activeVoices
        const audio = await offline.startRendering()
        const packed = pack(audio, label, label === 'expression-natural' ? expressionGain : undefined)
        if (label === 'expression-basic') expressionGain = packed.gain
        renders.push({ ...packed, voicesBeforeRender, voicesAfterRender: engine.activeVoices })
        engine.dispose()
      }
      const metadata = { preset: sampler.manifest.id, loadMs, cacheMs,
        engineVersion: sampler.engineVersion,
        decodedBytes: sampler.decodedBytes, sampleRate: context.sampleRate,
        attribution: sampler.manifest.attribution, license: sampler.manifest.license,
        label: '음색 비교·64음 합성 검증. 사람의 청음 판정은 미실시.' }
      sampler.dispose(); await context.close()
      return { metadata, renders, expressionCases, scoreXml }
    }})(${JSON.stringify({ code: pathToFileURL(path.join(output, 'piano-sampler.mjs')).href,
      casesCode: pathToFileURL(path.join(output, 'expression-cases.mjs')).href,
      manifest: pathToFileURL(path.resolve('src/renderer/public/piano/manifest.json')).href })})`)
    fs.writeFileSync(path.join(output, 'expression-score.musicxml'), result.scoreXml)
    delete result.scoreXml
    fs.writeFileSync(path.join(output, 'expression-commands.json'), JSON.stringify(result.expressionCases, null, 2))
    delete result.expressionCases
    for (const render of result.renders) {
      fs.writeFileSync(path.join(output, `${render.label}.wav`), Buffer.from(render.wav, 'base64'))
      delete render.wav
      assert.equal(render.invalid, 0)
      assert.ok(render.rms > .00001, `${render.label} must not be silent`)
      assert.equal(render.voicesAfterRender, 0, `${render.label} must release every voice`)
    }
    fs.writeFileSync(path.join(output, 'sampler-results.json'), JSON.stringify(result, null, 2))
    assert.ok(result.metadata.loadMs <= 5000, 'cold load budget')
    assert.ok(result.metadata.decodedBytes <= 512 * 1024 ** 2, 'decoded cache budget')
    assert.ok(result.renders.every(r => r.peak < 1), 'no clipping before WAV conversion')
    console.log(JSON.stringify(result, null, 2))
  } finally {
    clearTimeout(deadline); win?.destroy(); app.quit()
  }
}).catch(error => { console.error(error); app.exit(1) })
