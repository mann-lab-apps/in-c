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
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const endCursor = await window.webContents.executeJavaScript(`
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
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyB',
        key: 'ㅠ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const cursorNoteInput = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'r'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const cursorRestInput = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
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
  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="Tempo"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))

  const textInputShortcuts = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim()
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'r'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restShortcutConvertsSelection = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m3-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'ㅊ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restToNote = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        event: inspectorValues[1],
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  for (const eventId of ['m1-c4', 'm1-d4', 'm1-e4', 'm1-f-sharp-4']) {
    await window.webContents.executeJavaScript(`
      document.querySelector(
        '.notation-event[data-event-id="${eventId}"]'
      )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    `)
    await new Promise((resolve) => setTimeout(resolve, 100))
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'Backspace'
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowLeft'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyD',
        key: 'ㅇ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const fullRestToNote = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        event: inspectorValues[1],
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m3-d5"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '4'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutChange = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim(),
      statusMessage: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m8-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutCursor = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim(),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m1-c4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutFailure = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      errorMessage: document.querySelector('.editor-status .is-error')
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim()
    })
  `)

  if (
    selectMode.eventCount !== initialEventCount ||
    selectMode.hasInputCursor ||
    selectMode.editCount !== '1 edits' ||
    !selectMode.status?.startsWith('Select') ||
    !endCursor.hasInputCursor ||
    endCursor.editCount !== '1 edits' ||
    !endCursor.status?.startsWith('Input cursor') ||
    !cursorNoteInput.hasInputCursor ||
    cursorNoteInput.editCount !== '2 edits' ||
    cursorNoteInput.eventCount !== initialEventCount + 2 ||
    !cursorNoteInput.status?.startsWith('Input cursor') ||
    cursorNoteInput.type !== 'note' ||
    !cursorRestInput.hasInputCursor ||
    cursorRestInput.editCount !== '1 edits' ||
    cursorRestInput.eventCount !== initialEventCount + 2 ||
    !cursorRestInput.status?.startsWith('Input cursor') ||
    cursorRestInput.type !== 'rest' ||
    textInputShortcuts.editCount !== cursorRestInput.editCount ||
    textInputShortcuts.pressedDuration !== 'Quarter' ||
    restShortcutConvertsSelection.eventCount !== initialEventCount ||
    restShortcutConvertsSelection.editCount !== '1 edits' ||
    restShortcutConvertsSelection.hasInputCursor ||
    !restShortcutConvertsSelection.status?.startsWith('Select') ||
    restShortcutConvertsSelection.type !== 'rest' ||
    restToNote.eventCount !== initialEventCount ||
    restToNote.hasInputCursor ||
    restToNote.editCount !== '1 edits' ||
    restToNote.status !== 'Select · A–G edits selected note or rest' ||
    restToNote.type !== 'note' ||
    restToNote.event !== 'm3-half-rest' ||
    fullRestToNote.hasInputCursor ||
    fullRestToNote.status !== 'Select · A–G edits selected note or rest' ||
    fullRestToNote.type !== 'note' ||
    fullRestToNote.event === 'm2-1' ||
    durationShortcutChange.editCount !== '1 edits' ||
    durationShortcutChange.eventCount !== initialEventCount + 1 ||
    durationShortcutChange.pressedDuration !== 'Eighth' ||
    durationShortcutChange.statusMessage !== 'Duration changed to Eighth.' ||
    durationShortcutCursor.editCount !== '0 edits' ||
    !durationShortcutCursor.hasInputCursor ||
    durationShortcutCursor.pressedDuration !== 'Half' ||
    !durationShortcutCursor.status?.startsWith('Input cursor') ||
    durationShortcutFailure.editCount !== '0 edits' ||
    durationShortcutFailure.eventCount !== initialEventCount ||
    durationShortcutFailure.pressedDuration !== 'Quarter' ||
    durationShortcutFailure.errorMessage !==
      'Duration needs empty rest space, but the next note would be overwritten.'
  ) {
    throw new Error(
      `Keyboard routing verification failed: ${JSON.stringify({
        durationShortcutChange,
        durationShortcutCursor,
        durationShortcutFailure,
        initialEventCount,
        selectMode,
        cursorNoteInput,
        cursorRestInput,
        endCursor,
        fullRestToNote,
        restShortcutConvertsSelection,
        restToNote,
        textInputShortcuts
      })}`
    )
  }

  return {
    selectMode,
    cursorNoteInput,
    cursorRestInput,
    endCursor,
    durationShortcutChange,
    durationShortcutCursor,
    durationShortcutFailure,
    fullRestToNote,
    restShortcutConvertsSelection,
    restToNote,
    textInputShortcuts
  }
}

async function verifyOutOfStaffNotes(window) {
  const cases = [
    {
      buttonLabel: 'Move pitch up an octave',
      clicks: 3,
      eventId: 'm2-7',
      name: 'high'
    },
    {
      buttonLabel: 'Move pitch down an octave',
      clicks: 4,
      eventId: 'm2-7',
      name: 'low'
    }
  ]
  const results = []

  for (const testCase of cases) {
    await loadFixture(window)
    await window.webContents.executeJavaScript(`
      document.querySelector(
        '.notation-event[data-event-id="${testCase.eventId}"]'
      )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    `)

    for (let click = 0; click < testCase.clicks; click += 1) {
      await window.webContents.executeJavaScript(`
        document.querySelector(
          'button[aria-label="${testCase.buttonLabel}"]'
        )?.click()
      `)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const result = await window.webContents.executeJavaScript(`
      (() => {
        const svg = document.querySelector('.notation-preview svg')
        const event = document.querySelector(
          '.notation-event[data-event-id="${testCase.eventId}"]'
        )
        const eventBox = event?.getBBox()
        const svgWidth = Number(svg?.getAttribute('width'))
        const svgHeight = Number(svg?.getAttribute('height'))

        return {
          eventBox: eventBox
            ? {
                x: eventBox.x,
                y: eventBox.y,
                width: eventBox.width,
                height: eventBox.height
              }
            : undefined,
          svgHeight,
          svgWidth
        }
      })()
    `)
    const image = await window.webContents.capturePage()
    fs.writeFileSync(
      path.join(
        app.getPath('temp'),
        `in-c-mvp-out-of-staff-${testCase.name}.png`
      ),
      image.toPNG()
    )
    const box = result.eventBox
    const isInside =
      box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= result.svgWidth &&
      box.y + box.height <= result.svgHeight

    if (!isInside) {
      throw new Error(
        `Out-of-staff ${testCase.name} note verification failed: ${JSON.stringify(result)}`
      )
    }

    results.push({
      name: testCase.name,
      ...result
    })
  }

  return results
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
  const outOfStaffNotes = await verifyOutOfStaffNotes(window)
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

  console.log(
    JSON.stringify(
      { keyboard, outOfStaffNotes, desktop, minimum },
      null,
      2
    )
  )
  window.close()
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
