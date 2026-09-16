const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chromatics-passive-attachments-'))
app.setPath('userData', path.join(directory, 'user-data'))

const deadline = setTimeout(() => {
  console.error('Passive attachment PDF QA timed out')
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
  const markerSummary = () => evaluate(`(() => {
    const markers = [...document.querySelectorAll('.notation-fermata,.notation-breath-mark,.notation-tremolo-mark,.notation-ornament,.notation-grace-notes')]
    return markers.map(item => {
      const box = item.getBBox()
      return {
        className: item.getAttribute('class'),
        eventId: item.getAttribute('data-event-id'),
        text: item.textContent,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      }
    })
  })()`)
  const assertMarkers = (markers, label) => {
    const expected = [
      'notation-fermata',
      'notation-breath-mark',
      'notation-tremolo-mark',
      'notation-ornament',
      'notation-grace-notes'
    ]
    for (const className of expected) {
      const match = markers.find(item => item.className.includes(className))
      if (!match) throw new Error(`${label} missing ${className}: ${JSON.stringify(markers)}`)
      if (match.eventId !== 'lower-staff-marked-note') {
        throw new Error(`${label} ${className} lost lower-staff event ownership: ${JSON.stringify(match)}`)
      }
      if (match.width <= 0 || match.height <= 0) {
        throw new Error(`${label} ${className} has empty geometry: ${JSON.stringify(match)}`)
      }
    }
    const collisions = []
    for (let leftIndex = 0; leftIndex < markers.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < markers.length; rightIndex += 1) {
        const left = markers[leftIndex]
        const right = markers[rightIndex]
        const horizontalOverlap = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
        const verticalOverlap = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
        if (horizontalOverlap > 1 && verticalOverlap > 1) {
          collisions.push({ left: left.className, right: right.className, horizontalOverlap, verticalOverlap })
        }
      }
    }
    if (collisions.length) throw new Error(`${label} passive markers overlap: ${JSON.stringify(collisions)}`)
  }

  try {
    const project = createPassiveAttachmentProject()
    await window.loadFile(path.resolve(__dirname, '../out/renderer/index.html'), { query: { fixture: 'single-voice-mvp' } })
    await wait('document.querySelector(".notation-event")', 'Initial renderer missing')
    await evaluate(`void (window.inC = {
      project: {
        open: async () => ({ filePath: '/qa/passive.chromatics', fileName: 'passive.chromatics', contents: ${JSON.stringify(JSON.stringify(project))} }),
        save: async request => { window.__saved = request.contents; return { filePath: '/qa/passive.chromatics', fileName: 'passive.chromatics' } }
      },
      pdf: { save: request => new Promise(resolve => { window.__pdf = request; window.__resolvePdf = resolve }) },
      autosave: { clear: async () => {}, write: async () => {}, read: async () => null },
      recentMusicXml: { add: async () => [], list: async () => [] },
      musicXml: { open: async () => { throw new Error('MusicXML open not used') }, save: async () => { throw new Error('MusicXML save not used') } },
      midi: { save: async () => { throw new Error('MIDI save not used') } }
    })`)
    await click('파일')
    await click('프로젝트 열기')
    await wait('document.querySelector(".editor-status")?.textContent.includes("passive.chromatics을 열었습니다.")', 'Native open missing')

    const screenMarkers = await markerSummary()
    assertMarkers(screenMarkers, 'screen')
    const screenshot = path.join(directory, 'passive-attachments-screen.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())

    await click('내보내기')
    await click('PDF 변환')
    await wait('window.__pdf && document.querySelector(".notation-fermata")', 'PDF print layout missing')
    const printMarkers = await markerSummary()
    assertMarkers(printMarkers, 'print')
    const printPartIds = await evaluate(`[...new Set([...document.querySelectorAll('.notation-event')].map(item => item.dataset.partId))]`)
    if (printPartIds.length !== 1 || printPartIds[0] !== 'piano') {
      throw new Error('PDF print layout lost score part ownership: ' + JSON.stringify(printPartIds))
    }
    const pdf = path.join(directory, 'passive-attachments.pdf')
    const pdfData = await window.webContents.printToPDF({ preferCSSPageSize: true, printBackground: false })
    fs.writeFileSync(pdf, pdfData)
    if (pdfData.subarray(0, 4).toString('utf8') !== '%PDF' || !pdfData.toString('latin1').includes('%%EOF')) {
      throw new Error('Electron printToPDF did not produce a complete PDF file')
    }
    await evaluate(`window.__resolvePdf({ filePath: ${JSON.stringify(pdf)}, fileName: 'passive-attachments.pdf' })`)
    await wait('document.querySelector(".editor-status")?.textContent.includes("passive-attachments.pdf로 PDF를 만들었습니다.")', 'PDF completion status missing')

    await click('파일')
    await click('프로젝트 저장')
    await wait('window.__saved', 'Native save missing')
    const saved = JSON.parse(await evaluate('window.__saved'))
    const lowerEvent = saved.score.parts[0].staves[1].measures[0].voices[0].events[0]
    if (lowerEvent.id !== 'lower-staff-marked-note' || !lowerEvent.fermata || lowerEvent.breathMark !== 'caesura' ||
      lowerEvent.tremolo?.marks !== 3 || lowerEvent.ornaments?.length !== 3 || lowerEvent.graceNotes?.length !== 1) {
      throw new Error('Native save lost lower-staff passive attachments: ' + JSON.stringify(lowerEvent))
    }

    console.log(JSON.stringify({
      status: 'passed',
      directory,
      screenshot,
      pdf,
      screenMarkers,
      printMarkers,
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

function createPassiveAttachmentProject() {
  return {
    format: 'chromatics-project',
    version: 4,
    score: {
      id: 'passive-attachments-score',
      title: 'Passive Attachment QA',
      composer: 'Chromatics QA',
      tempo: { bpm: 96, beatUnit: 'quarter' },
      parts: [
        {
          id: 'piano',
          name: 'Piano',
          abbreviation: 'Pno.',
          staves: [
            {
              id: 'treble',
              measures: [createMeasure('treble-measure-1', [createRest('treble-full-rest')], { sign: 'G', line: 2 })]
            },
            {
              id: 'bass',
              measures: [createMeasure('bass-measure-1', [createMarkedLowerNote()], { sign: 'F', line: 4 })]
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

function createMeasure(id, events, clef) {
  return {
    id,
    number: 1,
    timing: { type: 'regular' },
    timeSignature: { beats: 4, beatType: 4 },
    keySignature: { fifths: 0, mode: 'major' },
    clef,
    voices: [{ id: 'voice-1', events }]
  }
}

function createRest(id) {
  return {
    type: 'rest',
    id,
    position: { tick: 0 },
    duration: { value: 'whole', dots: 0 },
    fullMeasure: true
  }
}

function createMarkedLowerNote() {
  return {
    type: 'note',
    id: 'lower-staff-marked-note',
    position: { tick: 0 },
    pitch: { step: 'C', octave: 3 },
    duration: { value: 'whole', dots: 0 },
    fermata: true,
    breathMark: 'caesura',
    tremolo: { type: 'single', marks: 3 },
    ornaments: ['trill', 'mordent', 'turn'],
    graceNotes: [{ pitch: { step: 'B', octave: 2 }, slash: true }]
  }
}
