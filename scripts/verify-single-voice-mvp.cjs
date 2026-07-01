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
        code: 'KeyR',
        key: 'ㄱ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const koreanCursorRestInput = await window.webContents.executeJavaScript(`
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
  await window.webContents.executeJavaScript(`
    document.querySelector('input[aria-label="Tempo"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyR',
        key: 'ㄱ',
        isComposing: true
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
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyR',
        key: 'ㄱ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const koreanRestShortcutConvertsSelection = await window.webContents.executeJavaScript(`
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

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m6-e5"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutConsumesRest = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.duration-strip button[aria-pressed="true"]'
        )?.textContent?.trim(),
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m5-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restDurationShrink = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.duration-strip button[aria-pressed="true"]'
        )?.textContent?.trim(),
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restDeleteAfterShrink = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
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

  const noteDeleteAbsorbsPrevious = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-1"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    document.querySelector('.tuplet-button')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButton = await window.webContents.executeJavaScript(`
    (() => {
      const button = document.querySelector('.tuplet-button')

      return {
        ariaLabel: button?.getAttribute('aria-label'),
        eventCount: document.querySelectorAll('.notation-event').length,
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        shortcut: button?.querySelector('.shortcut-badge')?.textContent,
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)
  await window.webContents.executeJavaScript(`
    document.querySelector('.tuplet-button')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButtonToggleOff = await window.webContents.executeJavaScript(`
    ({
      eventCount: document.querySelectorAll('.notation-event').length,
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
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
        code: 'KeyT',
        key: 'ㅅ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletShortcutStart = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent,
      tick: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.includes('ticks'))
        ?.textContent
    })
  `)

  for (const key of [
    { code: 'KeyC', key: 'c' },
    { key: 'r' }
  ]) {
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          ${key.code ? `code: ${JSON.stringify(key.code)},` : ''}
          key: ${JSON.stringify(key.key)}
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  const tripletShortcutPreview = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      previewEventCount: document.querySelectorAll(
        '.notation-event.is-preview'
      ).length,
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent
    })
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyE',
        key: 'e'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletShortcutComplete = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-g4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyT',
        key: 'ㅅ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpan = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyT',
        key: 'ㅅ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpanToggleOff = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m7-dotted-half-rest"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 't'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletDottedRestStart = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim(),
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadFixture(window)
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m7-triplet-c5"]'
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

  const tripletBackspaceClear = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith(' edits'))
          ?.textContent,
        selectedEvent: inspectorValues[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        type: inspectorValues[0]
      }
    })()
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
    !koreanCursorRestInput.hasInputCursor ||
    koreanCursorRestInput.editCount !== '1 edits' ||
    koreanCursorRestInput.eventCount !== initialEventCount + 2 ||
    !koreanCursorRestInput.status?.startsWith('Input cursor') ||
    koreanCursorRestInput.type !== 'rest' ||
    textInputShortcuts.editCount !== cursorRestInput.editCount ||
    textInputShortcuts.pressedDuration !== 'Quarter' ||
    restShortcutConvertsSelection.eventCount !== initialEventCount ||
    restShortcutConvertsSelection.editCount !== '1 edits' ||
    restShortcutConvertsSelection.hasInputCursor ||
    !restShortcutConvertsSelection.status?.startsWith('Select') ||
    restShortcutConvertsSelection.type !== 'rest' ||
    koreanRestShortcutConvertsSelection.eventCount !== initialEventCount ||
    koreanRestShortcutConvertsSelection.editCount !== '1 edits' ||
    koreanRestShortcutConvertsSelection.hasInputCursor ||
    !koreanRestShortcutConvertsSelection.status?.startsWith('Select') ||
    koreanRestShortcutConvertsSelection.type !== 'rest' ||
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
      'Duration is blocked by note m1-d4.' ||
    durationShortcutConsumesRest.editCount !== '1 edits' ||
    durationShortcutConsumesRest.eventCount !== initialEventCount ||
    durationShortcutConsumesRest.pressedDuration !== 'Quarter' ||
    durationShortcutConsumesRest.selectedEvent !== 'm6-e5' ||
    durationShortcutConsumesRest.status !==
      'Duration changed to Quarter using following rests.' ||
    durationShortcutConsumesRest.type !== 'note' ||
    restDurationShrink.editCount !== '1 edits' ||
    restDurationShrink.eventCount !== initialEventCount + 1 ||
    restDurationShrink.pressedDuration !== 'Quarter' ||
    restDurationShrink.selectedEvent !== 'm5-half-rest' ||
    restDurationShrink.status !== 'Rest duration changed to Quarter.' ||
    restDurationShrink.type !== 'rest' ||
    restDeleteAfterShrink.editCount !== '2 edits' ||
    restDeleteAfterShrink.eventCount !== initialEventCount ||
    restDeleteAfterShrink.selectedEvent !== 'm5-g4' ||
    restDeleteAfterShrink.status !== 'Rest deleted' ||
    restDeleteAfterShrink.type !== 'note' ||
    noteDeleteAbsorbsPrevious.editCount !== '1 edits' ||
    noteDeleteAbsorbsPrevious.eventCount !== initialEventCount ||
    noteDeleteAbsorbsPrevious.selectedEvent !== 'm4-a4' ||
    noteDeleteAbsorbsPrevious.status !== 'Note deleted' ||
    noteDeleteAbsorbsPrevious.type !== 'note' ||
    !tripletButton.ariaLabel?.includes('shortcut T') ||
    tripletButton.shortcut !== 'T' ||
    tripletButton.editCount !== '1 edits' ||
    tripletButton.eventCount !== initialEventCount + 1 ||
    tripletButton.hasProgress ||
    tripletButton.tupletCount !== 2 ||
    tripletButton.status !== 'Triplet applied to the selected span.' ||
    tripletButtonToggleOff.editCount !== '2 edits' ||
    tripletButtonToggleOff.eventCount !== initialEventCount ||
    tripletButtonToggleOff.hasProgress ||
    tripletButtonToggleOff.tupletCount !== 1 ||
    tripletButtonToggleOff.status !== 'Triplet removed from the selected group.' ||
    tripletShortcutStart.editCount !== '0 edits' ||
    !tripletShortcutStart.status?.startsWith('Triplet input') ||
    tripletShortcutStart.progress !== 'Triplet 0/3' ||
    !tripletShortcutStart.tick?.startsWith('M8 · ') ||
    tripletShortcutPreview.previewEventCount < 3 ||
    tripletShortcutPreview.progress !== 'Triplet 2/3' ||
    tripletShortcutPreview.status !== 'Triplet 2/3 staged. Add 1 more.' ||
    tripletShortcutComplete.editCount !== '2 edits' ||
    tripletShortcutComplete.eventCount !== initialEventCount + 4 ||
    tripletShortcutComplete.hasProgress ||
    tripletShortcutComplete.tupletCount !== 2 ||
    tripletShortcutComplete.status !== 'Triplet completed.' ||
    tripletAvailableSpan.editCount !== '1 edits' ||
    tripletAvailableSpan.eventCount !== initialEventCount + 1 ||
    tripletAvailableSpan.hasProgress ||
    tripletAvailableSpan.status !== 'Triplet applied to the selected span.' ||
    tripletAvailableSpan.tupletCount !== 2 ||
    tripletAvailableSpanToggleOff.editCount !== '2 edits' ||
    tripletAvailableSpanToggleOff.eventCount !== initialEventCount ||
    tripletAvailableSpanToggleOff.hasProgress ||
    tripletAvailableSpanToggleOff.status !==
      'Triplet removed from the selected group.' ||
    tripletAvailableSpanToggleOff.tupletCount !== 1 ||
    tripletDottedRestStart.editCount !== '0 edits' ||
    tripletDottedRestStart.progress ||
    tripletDottedRestStart.status !== 'Select · A–G edits selected note or rest' ||
    tripletBackspaceClear.editCount !== '0 edits' ||
    tripletBackspaceClear.selectedEvent !== 'm7-triplet-c5' ||
    tripletBackspaceClear.status !==
      'Tuplet members cannot be deleted independently yet.' ||
    tripletBackspaceClear.tupletCount !== 1 ||
    tripletBackspaceClear.type !== 'note'
  ) {
    throw new Error(
      `Keyboard routing verification failed: ${JSON.stringify({
        durationShortcutChange,
        durationShortcutConsumesRest,
        durationShortcutCursor,
        durationShortcutFailure,
        initialEventCount,
        koreanCursorRestInput,
        koreanRestShortcutConvertsSelection,
        noteDeleteAbsorbsPrevious,
        restDeleteAfterShrink,
        restDurationShrink,
        selectMode,
        cursorNoteInput,
        cursorRestInput,
        endCursor,
        fullRestToNote,
        restShortcutConvertsSelection,
        restToNote,
        textInputShortcuts,
        tripletButton,
        tripletButtonToggleOff,
        tripletAvailableSpan,
        tripletAvailableSpanToggleOff,
        tripletDottedRestStart,
        tripletBackspaceClear,
        tripletShortcutComplete,
        tripletShortcutPreview,
        tripletShortcutStart
      })}`
    )
  }

  return {
    selectMode,
    cursorNoteInput,
    cursorRestInput,
    endCursor,
    durationShortcutChange,
    durationShortcutConsumesRest,
    durationShortcutCursor,
    durationShortcutFailure,
    fullRestToNote,
    koreanCursorRestInput,
    koreanRestShortcutConvertsSelection,
    noteDeleteAbsorbsPrevious,
    restDeleteAfterShrink,
    restDurationShrink,
    restShortcutConvertsSelection,
    restToNote,
    textInputShortcuts,
    tripletButton,
    tripletButtonToggleOff,
    tripletAvailableSpan,
    tripletAvailableSpanToggleOff,
    tripletDottedRestStart,
    tripletBackspaceClear,
    tripletShortcutComplete,
    tripletShortcutPreview,
    tripletShortcutStart
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

async function verifyBeamRendering(window) {
  await loadFixture(window)

  const before = await readBeamMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m2-7"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const after = await readBeamMetrics(window)
  const maxSlope = Math.max(
    ...before.beamFaces.map((beam) => Math.abs(beam.slope)),
    ...after.beamFaces.map((beam) => Math.abs(beam.slope))
  )
  const result = {
    after,
    before,
    maxSlope
  }

  if (
    before.beamFaces.length < 4 ||
    after.beamFaces.length !== before.beamFaces.length ||
    maxSlope > 0.13 ||
    JSON.stringify(after.signatures) !== JSON.stringify(before.signatures)
  ) {
    throw new Error(`Beam rendering verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function verifyTieEditing(window) {
  await loadFixture(window)

  const before = await readTieMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-1"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyL',
        key: 'ㅣ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const added = await readTieMetrics(window)

  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-2"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyL',
        key: 'ㅣ'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 200))

  const removed = await readTieMetrics(window)
  const result = {
    added,
    before,
    removed
  }

  if (
    added.tieCount !== before.tieCount + 1 ||
    added.status !== 'Tie added.' ||
    removed.tieCount !== before.tieCount ||
    removed.status !== 'Tie removed.'
  ) {
    throw new Error(`Tie editing verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function readTieMetrics(window) {
  return window.webContents.executeJavaScript(`
    (() => ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      status: [...document.querySelectorAll('.editor-status span')]
        .map((span) => span.textContent?.trim())
        .find((text) => text === 'Tie added.' || text === 'Tie removed.'),
      tieCount: document.querySelectorAll('.vf-stavetie').length
    }))()
  `)
}

async function readBeamMetrics(window) {
  return window.webContents.executeJavaScript(`
    (() => {
      const beamFaces = [...document.querySelectorAll('.vf-beam path')]
        .map((path) => {
          const box = path.getBBox()

          if (box.width < 8 || box.height > 24) {
            return undefined
          }

          const d = path.getAttribute('d') ?? ''
          const values = [...d.matchAll(/-?\\d+(?:\\.\\d+)?/g)]
            .map((match) => Number(match[0]))

          if (values.length < 4) {
            return undefined
          }

          const points = []

          for (let index = 0; index < values.length - 1; index += 2) {
            points.push({
              x: values[index],
              y: values[index + 1]
            })
          }

          const minX = Math.min(...points.map((point) => point.x))
          const maxX = Math.max(...points.map((point) => point.x))
          const leftY = average(
            points
              .filter((point) => point.x === minX)
              .map((point) => point.y)
          )
          const rightY = average(
            points
              .filter((point) => point.x === maxX)
              .map((point) => point.y)
          )
          const width = maxX - minX
          const slope = width === 0 ? 0 : (rightY - leftY) / width

          return {
            box: {
              height: box.height,
              width: box.width,
              x: box.x,
              y: box.y
            },
            d,
            slope
          }
        })
        .filter(Boolean)

      return {
        beamFaces,
        signatures: beamFaces.map((beam) => beam.d)
      }

      function average(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length
      }
    })()
  `)
}

async function verifyMetadataEditing(window) {
  await loadFixture(window)

  await editMetadataField(window, 'title', '새 악보 제목', 'Enter')
  await editMetadataField(window, 'composer', '김작곡', 'Enter')

  const edited = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="Edit score composer"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      sidebarTitle: document.querySelector('.sidebar h1')?.textContent?.trim(),
      title: document.querySelector(
        'button[aria-label="Edit score title"]'
      )?.textContent?.trim()
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('button[aria-label="Undo"]')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const undoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="Edit score composer"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="Edit score title"]'
      )?.textContent?.trim()
    })
  `)

  await window.webContents.executeJavaScript(`
    document.querySelector('button[aria-label="Redo"]')?.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const redoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="Edit score composer"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="Edit score title"]'
      )?.textContent?.trim()
    })
  `)

  await editMetadataField(window, 'title', '취소할 제목', 'Escape')

  const cancelled = await window.webContents.executeJavaScript(`
    ({
      title: document.querySelector(
        'button[aria-label="Edit score title"]'
      )?.textContent?.trim()
    })
  `)

  await openMetadataField(window, 'composer')
  await window.webContents.executeJavaScript(`
    window.setInputValue(
      document.querySelector('input[aria-label="Score composer"]'),
      '입력 중'
    )
    document
      .querySelector('input[aria-label="Score composer"]')
      .dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyA',
        key: 'ㅁ'
      })
    )
    document
      .querySelector('input[aria-label="Score composer"]')
      .dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '2'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const textInputProtection = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith(' edits'))
        ?.textContent,
      inputOpen: Boolean(
        document.querySelector('input[aria-label="Score composer"]')
      ),
      pressedDuration: document.querySelector(
        '.duration-strip button[aria-pressed="true"]'
      )?.textContent?.trim()
    })
  `)

  const result = {
    cancelled,
    edited,
    redoneComposer,
    textInputProtection,
    undoneComposer
  }

  if (
    edited.title !== '새 악보 제목' ||
    edited.sidebarTitle !== '새 악보 제목' ||
    edited.composer !== '김작곡' ||
    edited.editCount !== '2 edits' ||
    undoneComposer.title !== '새 악보 제목' ||
    undoneComposer.composer !== 'in-C' ||
    undoneComposer.editCount !== '1 edits' ||
    redoneComposer.title !== '새 악보 제목' ||
    redoneComposer.composer !== '김작곡' ||
    redoneComposer.editCount !== '2 edits' ||
    cancelled.title !== '새 악보 제목' ||
    !textInputProtection.inputOpen ||
    textInputProtection.editCount !== '2 edits' ||
    textInputProtection.pressedDuration !== 'Quarter'
  ) {
    throw new Error(
      `Metadata editing verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyFileActions(window) {
  await loadFixture(window)

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const labels = [
        ...document.querySelectorAll('.file-actions button span')
      ].map((label) => label.textContent?.trim())

      return {
        ariaLabel: document
          .querySelector('.file-actions')
          ?.getAttribute('aria-label'),
        labels
      }
    })()
  `)

  if (
    result.ariaLabel !== 'File actions' ||
    result.labels.includes('Export') ||
    !result.labels.includes('저장하기') ||
    !result.labels.includes('PDF 변환')
  ) {
    throw new Error(`File actions verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function verifyNewScoreWizard(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'open new score wizard',
    `
    document.querySelector('button[aria-label="새 악보 만들기"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'fill new score wizard',
    `
    const setInputValue = (input, value) => {
      if (!input) {
        throw new Error('New score input not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const setSelectValue = (select, value) => {
      if (!select) {
        throw new Error('New score select not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value'
      ).set
      setter.call(select, value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const labels = [...document.querySelectorAll('.new-score-form label')]
    const field = (name) =>
      labels.find((label) => label.textContent?.includes(name))
        ?.querySelector('input, select')

    setInputValue(field('제목'), '새 출발')
    setInputValue(field('작곡가'), '김작곡')
    setSelectValue(field('파트'), 'violin')
    setSelectValue(field('조표'), 'd-major')
    setSelectValue(field('박자표'), '3-4')
    setInputValue(field('마디 수'), '3')
    setInputValue(field('템포'), '96')
    document
      .querySelector('form[aria-label="새 악보 만들기"]')
      ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 300))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        title: document
          .querySelector('button[aria-label="Edit score title"]')
          ?.textContent?.trim(),
        sidebarTitle: document.querySelector('.sidebar h1')?.textContent?.trim(),
        composer: document
          .querySelector('button[aria-label="Edit score composer"]')
          ?.textContent?.trim(),
        measureCount: document.querySelectorAll('.notation-measure').length,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedType: inspectorValues[0],
        selectedEvent: inspectorValues[1],
        selectedMeasure: inspectorValues[2],
        tempo: document.querySelector('.tempo-control output')?.textContent?.trim(),
        status: statusValues.at(-1),
        dialogOpen: Boolean(
          document.querySelector('form[aria-label="새 악보 만들기"]')
        )
      }
    })()
  `)

  if (
    result.title !== '새 출발' ||
    result.sidebarTitle !== '새 출발' ||
    result.composer !== '김작곡' ||
    result.measureCount !== 3 ||
    result.eventCount !== 3 ||
    result.selectedType !== 'rest' ||
    result.selectedEvent !== 'measure-1-full-measure-rest' ||
    result.selectedMeasure !== '1' ||
    result.tempo !== '96 BPM' ||
    result.status !== '새 악보를 만들었습니다.' ||
    result.dialogOpen
  ) {
    throw new Error(
      `New score wizard verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyKeySignatureControl(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'change key signature from selected measure',
    `
    document
      .querySelector('.notation-measure[data-measure-id="measure-2"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const select = document.querySelector('select[aria-label="Key signature"]')

    if (!select) {
      throw new Error('Key signature select not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value'
    ).set
    setter.call(select, 'c-major')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith(' edits')),
        selectedMeasure: [...document.querySelectorAll('.inspector dd')]
          .map((value) => value.textContent?.trim())[2],
        status: statusValues.at(-1),
        value: document.querySelector('select[aria-label="Key signature"]')
          ?.value
      }
    })()
  `)

  if (
    result.editCount !== '1 edits' ||
    result.selectedMeasure !== '2' ||
    result.status !== 'Key signature changed from the selected measure.' ||
    result.value !== 'c-major'
  ) {
    throw new Error(
      `Key signature control verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyTimeSignatureControl(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'select measure for time signature change',
    `
    document
      .querySelector('.notation-measure[data-measure-id="measure-3"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  await executeMetadataStep(
    window,
    'change time signature for selected measure',
    `
    const select = document.querySelector('select[aria-label="Time signature"]')

    if (!select) {
      throw new Error('Time signature select not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value'
    ).set
    setter.call(select, '2-4')
    select.dispatchEvent(new Event('change', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith(' edits')),
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedMeasure: [...document.querySelectorAll('.inspector dd')]
          .map((value) => value.textContent?.trim())[2],
        status: statusValues.at(-1),
        value: document.querySelector('select[aria-label="Time signature"]')
          ?.value
      }
    })()
  `)

  if (
    result.editCount !== '1 edits' ||
    result.eventCount !== 32 ||
    result.selectedMeasure !== '3' ||
    result.status !== 'Time signature changed for the selected measure.' ||
    result.value !== '2-4'
  ) {
    throw new Error(
      `Time signature control verification failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

async function verifyMeasureDeletion(window) {
  await loadFixture(window)

  await executeMetadataStep(
    window,
    'delete selected measure with keyboard',
    `
    document
      .querySelector('.notation-measure[data-measure-id="measure-3"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'press backspace on selected measure',
    `
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Backspace'
      })
    )
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))

  const deleted = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.inspector dd')
      ].map((value) => value.textContent?.trim())
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith(' edits')),
        eventCount: document.querySelectorAll('.notation-event').length,
        measureCount: document.querySelectorAll('.notation-measure').length,
        selectedEvent: inspectorValues[1],
        selectedMeasure: inspectorValues[2],
        selectedType: inspectorValues[0],
        status: statusValues.at(-1)
      }
    })()
  `)

  await loadFixture(window)
  await executeMetadataStep(
    window,
    'create one-measure score',
    `
    document.querySelector('button[aria-label="새 악보 만들기"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await executeMetadataStep(
    window,
    'submit one-measure score',
    `
    const labels = [...document.querySelectorAll('.new-score-form label')]
    const field = (name) =>
      labels.find((label) => label.textContent?.includes(name))
        ?.querySelector('input, select')
    const input = field('마디 수')

    if (!input) {
      throw new Error('Measure count input not found.')
    }

    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set
    setter.call(input, '1')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document
      .querySelector('form[aria-label="새 악보 만들기"]')
      ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 250))
  await executeMetadataStep(
    window,
    'try deleting final measure',
    `
    document.querySelector('button[aria-label="Delete measure"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  const finalMeasure = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith(' edits')),
        measureCount: document.querySelectorAll('.notation-measure').length,
        status: statusValues.at(-1)
      }
    })()
  `)

  if (
    deleted.editCount !== '1 edits' ||
    deleted.eventCount !== 30 ||
    deleted.measureCount !== 7 ||
    deleted.selectedEvent !== '—' ||
    deleted.selectedMeasure !== '3' ||
    deleted.selectedType !== 'measure' ||
    deleted.status !== 'Measure deleted.' ||
    finalMeasure.editCount !== '0 edits' ||
    finalMeasure.measureCount !== 1 ||
    finalMeasure.status !== 'Cannot delete the last measure.'
  ) {
    throw new Error(
      `Measure deletion verification failed: ${JSON.stringify({
        deleted,
        finalMeasure
      })}`
    )
  }

  return {
    deleted,
    finalMeasure
  }
}

async function editMetadataField(window, field, value, key) {
  await openMetadataField(window, field)
  const label = field === 'title' ? 'Score title' : 'Score composer'

  await executeMetadataStep(
    window,
    `edit ${field}`,
    `
    const input = document.querySelector('input[aria-label="${label}"]')
    window.setInputValue(input, ${JSON.stringify(value)})
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ${JSON.stringify(key)}
      })
    )
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
}

async function openMetadataField(window, field) {
  const label = field === 'title' ? 'Edit score title' : 'Edit score composer'

  await executeMetadataStep(
    window,
    `open ${field}`,
    `
    document.querySelector('button[aria-label="${label}"]')?.click()
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  await executeMetadataStep(
    window,
    `prepare ${field} input setter`,
    `
    window.setInputValue = (input, value) => {
      if (!input) {
        throw new Error('Metadata input not found.')
      }

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  `
  )
}

async function executeMetadataStep(window, label, body) {
  const result = await window.webContents.executeJavaScript(`
    (() => {
      try {
        ${body}
        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          label: ${JSON.stringify(label)},
          message: error?.message,
          stack: error?.stack
        }
      }
    })()
  `)

  if (!result.ok) {
    throw new Error(
      `Metadata renderer step failed (${result.label}): ${result.message}\n${result.stack}`
    )
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
  const fileActions = await verifyFileActions(window)
  const newScore = await verifyNewScoreWizard(window)
  const keySignature = await verifyKeySignatureControl(window)
  const timeSignature = await verifyTimeSignatureControl(window)
  const measureDeletion = await verifyMeasureDeletion(window)
  const metadata = await verifyMetadataEditing(window)
  const beams = await verifyBeamRendering(window)
  const ties = await verifyTieEditing(window)
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
      {
        keyboard,
        beams,
        ties,
        fileActions,
        newScore,
        keySignature,
        timeSignature,
        measureDeletion,
        metadata,
        outOfStaffNotes,
        desktop,
        minimum
      },
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
