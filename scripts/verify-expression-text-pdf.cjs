const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const TICKS_PER_QUARTER = 13440
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chromatics-expression-text-'))
app.setPath('userData', path.join(directory, 'user-data'))

const deadline = setTimeout(() => {
  console.error('Expression text PDF QA timed out')
  app.exit(1)
}, 90000)

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 1100,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  })
  const evaluate = code => window.webContents.executeJavaScript(code).catch(error => {
    throw new Error(`${error.message}\nRenderer command: ${code}`, { cause: error })
  })
  const settle = () => new Promise(resolve => setTimeout(resolve, 100))
  const wait = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`Boolean(${expression})`)) return
      await settle()
    }
    throw new Error(`${label}: ${await evaluate('document.querySelector(".editor-status")?.textContent')}`)
  }
  const click = async label => {
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.getClientRects().length &&
        (item.getAttribute('aria-label') === ${JSON.stringify(label)} || item.textContent.trim() === ${JSON.stringify(label)}))
      if (!button || button.disabled) throw new Error('Missing enabled button: ' + ${JSON.stringify(label)})
      button.scrollIntoView({block:'nearest',inline:'nearest'})
      button.click()
    })()`)
    await settle()
  }
  const expressionSummary = () => evaluate(`(() => {
    const text = document.querySelector('.notation-expression-text[data-measure-id="bass-measure-2"]')
    const measure = document.querySelector('.notation-measure[data-measure-id="bass-measure-2"][data-staff-id="bass"]')
    const upperMeasure = document.querySelector('.notation-measure[data-measure-id="treble-measure-2"]')
    if (!text || !measure || !upperMeasure) throw new Error('Missing expression text or measure target')
    const textBox = text.getBBox()
    const measureBox = measure.getBBox()
    const upperBox = upperMeasure.getBBox()
    return {
      text: text.textContent,
      tick: Number(text.getAttribute('data-tick')),
      x: Number(text.getAttribute('x')),
      y: Number(text.getAttribute('y')),
      width: textBox.width,
      height: textBox.height,
      measure: { x: Number(measure.getAttribute('x')), y: Number(measure.getAttribute('y')), width: Number(measure.getAttribute('width')), height: Number(measure.getAttribute('height')), boxY: measureBox.y },
      upperMeasure: { x: Number(upperMeasure.getAttribute('x')), width: Number(upperMeasure.getAttribute('width')), boxY: upperBox.y }
    }
  })()`)
  const assertExpression = (summary, label) => {
    if (summary.text !== 'cantabile') throw new Error(`${label} expression text changed: ${JSON.stringify(summary)}`)
    if (summary.tick !== TICKS_PER_QUARTER * 1.5) throw new Error(`${label} expression tick changed: ${JSON.stringify(summary)}`)
    if (summary.width <= 0 || summary.height <= 0) throw new Error(`${label} expression has empty geometry: ${JSON.stringify(summary)}`)
    const expectedX = summary.measure.x + 18 + (summary.tick / (TICKS_PER_QUARTER * 4)) * Math.max(1, summary.measure.width - 36)
    if (Math.abs(summary.x - expectedX) > 1) {
      throw new Error(`${label} expression x is not the expected tick position: ${JSON.stringify({ summary, expectedX })}`)
    }
    if (summary.y <= summary.measure.y + summary.measure.height) {
      throw new Error(`${label} expression is not below the lower-staff measure: ${JSON.stringify(summary)}`)
    }
    if (Math.abs(summary.measure.x - summary.upperMeasure.x) > 1 || Math.abs(summary.measure.width - summary.upperMeasure.width) > 1) {
      throw new Error(`${label} lower measure is not aligned with upper measure: ${JSON.stringify(summary)}`)
    }
  }

  try {
    const project = createExpressionProject()
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    await wait('document.querySelector(".notation-event")', 'Initial renderer missing')
    await evaluate(`void (window.inC = {
      project: {
        open: async () => ({ filePath: '/qa/expression.chromatics', fileName: 'expression.chromatics', contents: ${JSON.stringify(JSON.stringify(project))} }),
        save: async request => { window.__saved = request.contents; return { filePath: '/qa/expression.chromatics', fileName: 'expression.chromatics' } }
      },
      pdf: { save: request => new Promise(resolve => { window.__pdf = request; window.__resolvePdf = resolve }) },
      autosave: { clear: async () => {}, write: async () => {}, read: async () => null },
      recentMusicXml: { add: async () => [], list: async () => [] },
      musicXml: { open: async () => { throw new Error('MusicXML open not used') }, save: async () => { throw new Error('MusicXML save not used') } },
      midi: { save: async () => { throw new Error('MIDI save not used') } }
    })`)
    await click('파일')
    await click('프로젝트 열기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("expression.chromatics을 열었습니다.") && document.querySelector(".notation-expression-text")', 'Native open or expression render missing')

    const screen = await expressionSummary()
    assertExpression(screen, 'screen')
    const screenshot = path.join(directory, 'expression-text-screen.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())

    await click('내보내기')
    await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-expression-text")', 'PDF print layout missing expression')
    const print = await expressionSummary()
    assertExpression(print, 'print')
    const pdf = path.join(directory, 'expression-text.pdf')
    const pdfData = await window.webContents.printToPDF({ preferCSSPageSize: true, printBackground: false })
    fs.writeFileSync(pdf, pdfData)
    if (pdfData.subarray(0, 4).toString('utf8') !== '%PDF' || !pdfData.toString('latin1').includes('%%EOF')) {
      throw new Error('Electron printToPDF did not produce a complete PDF file')
    }
    await evaluate(`window.__resolvePdf({ filePath: ${JSON.stringify(pdf)}, fileName: 'expression-text.pdf' })`)
    await wait('document.querySelector(".editor-status")?.textContent.includes("expression-text.pdf로 PDF를 만들었습니다.")', 'PDF completion status missing')

    await click('파일')
    await click('프로젝트 저장')
    await wait('window.__saved', 'Native save missing')
    const saved = JSON.parse(await evaluate('window.__saved'))
    const expression = saved.score.expressionTexts?.[0]
    if (!expression || expression.measureId !== 'bass-measure-2' || expression.tick !== TICKS_PER_QUARTER * 1.5 || expression.text !== 'cantabile') {
      throw new Error('Native save lost lower-staff expression timing: ' + JSON.stringify(expression))
    }

    console.log(JSON.stringify({
      status: 'passed',
      directory,
      screenshot,
      pdf,
      screen,
      print,
      fileIO: 'intercepted App bridge; actual renderer DOM, Electron printToPDF and native JSON readback'
    }))
    clearTimeout(deadline)
    app.exit(0)
  } catch (error) {
    console.error(error)
    clearTimeout(deadline)
    app.exit(1)
  }
}).catch(error => {
  console.error(error)
  clearTimeout(deadline)
  app.exit(1)
})

function createExpressionProject() {
  return {
    format: 'chromatics-project',
    version: 4,
    score: {
      id: 'expression-text-score',
      title: 'Expression Text QA',
      composer: 'Chromatics QA',
      tempo: { bpm: 96, beatUnit: 'quarter' },
      expressionTexts: [
        {
          id: 'lower-expression',
          measureId: 'bass-measure-2',
          tick: TICKS_PER_QUARTER * 1.5,
          text: 'cantabile'
        }
      ],
      parts: [
        {
          id: 'piano',
          name: 'Piano',
          abbreviation: 'Pno.',
          staves: [
            {
              id: 'treble',
              measures: [
                createMeasure('treble-measure-1', 1, [createRest('treble-m1-rest', 0, 'whole', true)], { sign: 'G', line: 2 }),
                createMeasure('treble-measure-2', 2, [createRest('treble-m2-rest', 0, 'whole', true)], { sign: 'G', line: 2 })
              ]
            },
            {
              id: 'bass',
              measures: [
                createMeasure('bass-measure-1', 1, [createRest('bass-m1-rest', 0, 'whole', true)], { sign: 'F', line: 4 }),
                createMeasure('bass-measure-2', 2, [
                  createRest('bass-m2-q-rest', 0, 'quarter'),
                  createNote('bass-m2-note', TICKS_PER_QUARTER, 'quarter'),
                  createRest('bass-m2-half-rest', TICKS_PER_QUARTER * 2, 'half')
                ], { sign: 'F', line: 4 })
              ]
            }
          ]
        }
      ]
    },
    partLayouts: [],
    view: { mode: 'score' },
    settings: { inputMode: 'duration-first' }
  }
}

function createMeasure(id, number, events, clef) {
  return {
    id,
    number,
    timing: { type: 'regular' },
    timeSignature: { beats: 4, beatType: 4 },
    keySignature: { fifths: 0, mode: 'major' },
    clef,
    voices: [{ id: 'voice-1', events }]
  }
}

function createRest(id, tick, value, fullMeasure = false) {
  return {
    type: 'rest',
    id,
    position: { tick },
    duration: { value, dots: 0 },
    ...(fullMeasure ? { fullMeasure: true } : {})
  }
}

function createNote(id, tick, value) {
  return {
    type: 'note',
    id,
    position: { tick },
    pitch: { step: 'C', octave: 3 },
    duration: { value, dots: 0 }
  }
}
