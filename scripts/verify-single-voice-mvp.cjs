module.paths.unshift(
  require('node:path').resolve(__dirname, '../node_modules')
)

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

async function loadFixture(window) {
  await window.loadFile(
    path.resolve(__dirname, '../out/renderer/index.html'),
    {
      query: {
        fixture: 'single-voice-mvp'
      }
    }
  )
  await new Promise((resolve) => setTimeout(resolve, 800))
}

async function verifyKeyboardRouting(window) {
  const initialEventCount = await window.webContents.executeJavaScript(`
    document.querySelectorAll('.notation-event').length
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyA',
        key: 'ㅁ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const selectMode = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('button[aria-label="Note"]')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyB',
        key: 'ㅠ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const noteMode = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="Tempo"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'ㅊ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))

  const textInputEditCount = await window.webContents.executeJavaScript(`
    [...document.querySelectorAll('.editor-status span')]
      .find((span) => span.textContent?.endsWith(' edits'))
      ?.textContent
  `)

  if (
    selectMode.eventCount !== initialEventCount ||
    selectMode.hasInputCursor ||
    selectMode.editCount !== '1 edits' ||
    !selectMode.status?.startsWith('Select') ||
    !noteMode.hasInputCursor ||
    noteMode.editCount !== '2 edits' ||
    !noteMode.status?.startsWith('Note input') ||
    textInputEditCount !== noteMode.editCount
  ) {
    throw new Error(
      `Keyboard routing verification failed: ${JSON.stringify({
        initialEventCount,
        selectMode,
        noteMode,
        textInputEditCount
      })}`
    )
  }

  return {
    selectMode,
    noteMode,
    textInputEditCount
  }
}

async function inspect(window, width, output) {
  window.setSize(width, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  const image = await window.webContents.capturePage()
  fs.writeFileSync(output, image.toPNG())

  return window.webContents.executeJavaScript(`
    (() => {
      const svg = document.querySelector('.notation-preview svg')
      const measures = [...document.querySelectorAll('.notation-measure')]
      const events = [...document.querySelectorAll('.notation-event')]
      const eventMappingIsValid = events.every((event) => {
        const eventBox = event.getBBox()
        const eventCenter = eventBox.x + eventBox.width / 2
        return measures.some((measure) => {
          const start = Number(measure.getAttribute('x'))
          const end = start + Number(measure.getAttribute('width'))
          return eventCenter >= start && eventCenter <= end
        })
      })
      const systems = new Set(
        measures.map((measure) => measure.getAttribute('data-system-index'))
      )
      const systemRightEdges = [...systems].map((systemIndex) => {
        const systemMeasures = measures.filter(
          (measure) =>
            measure.getAttribute('data-system-index') === systemIndex
        )
        const last = systemMeasures.at(-1)
        return Number(last.getAttribute('x')) +
          Number(last.getAttribute('width'))
      })
      const svgWidth = Number(svg?.getAttribute('width'))
      const systemsFillWidth = systemRightEdges.every(
        (rightEdge) => Math.abs(rightEdge - (svgWidth - 16)) < 0.01
      )
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())
      return {
        width: window.innerWidth,
        measureCount: measures.length,
        eventCount: events.length,
        systemCount: systems.size,
        svgWidth,
        systemRightEdges,
        systemsFillWidth,
        eventMappingIsValid,
        selectedInspectorEvent: inspectorValues[1],
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        tieCount: document.querySelectorAll('.vf-stavetie').length,
        toolbarOverflow:
          document.querySelector('.toolbar').scrollWidth >
          document.querySelector('.toolbar').clientWidth
      }
    })()
  `)
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 1000,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  })

  await loadFixture(window)
  const keyboard = await verifyKeyboardRouting(window)
  await loadFixture(window)

  const desktop = await inspect(
    window,
    1400,
    path.join(app.getPath('temp'), 'in-c-mvp-desktop.png')
  )
  const minimum = await inspect(
    window,
    1100,
    path.join(app.getPath('temp'), 'in-c-mvp-minimum.png')
  )
  const results = [desktop, minimum]

  for (const result of results) {
    if (
      result.measureCount !== 8 ||
      result.eventCount !== 33 ||
      !result.eventMappingIsValid ||
      !result.systemsFillWidth ||
      result.selectedInspectorEvent !== 'm4-g4' ||
      result.tupletCount !== 1 ||
      result.tieCount < 1 ||
      result.toolbarOverflow
    ) {
      throw new Error(`MVP renderer verification failed: ${JSON.stringify(result)}`)
    }
  }

  console.log(JSON.stringify({ keyboard, desktop, minimum }, null, 2))
  window.close()
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
