module.paths.unshift(
  require('node:path').resolve(__dirname, '../node_modules')
)

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const fileActionsOnly = process.argv.includes('--file-actions')
const workspaceTasksOnly = process.argv.includes('--workspace-tasks')
const propertiesDockOnly = process.argv.includes('--properties-dock')
const partIoOnly = process.argv.includes('--part-io')
const mixerOnly = process.argv.includes('--mixer')
const newScoreOnly = process.argv.includes('--new-score')
const grandStaffOnly = process.argv.includes('--grand-staff')
const signaturesOnly = process.argv.includes('--signatures')
const measureDeleteOnly = process.argv.includes('--measure-delete')
const keyboardOnly = process.argv.includes('--keyboard')
const metadataOnly = process.argv.includes('--metadata')
const engravingOnly = process.argv.includes('--engraving')

// Verification owns its workspace preferences; never reuse the user's profile.
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'studio-mvp-')))
const mvpArtifacts = path.resolve(process.env.DDIRORI_MVP_QA_OUT || path.join(app.getPath('userData'), 'artifacts'))
fs.mkdirSync(mvpArtifacts, { recursive: true })

async function loadFixture(window, fixture = 'single-voice-mvp') {
  if (process.env.CHROMATICS_QA_URL) {
    const url = new URL(process.env.CHROMATICS_QA_URL)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('CHROMATICS_QA_URL must point to a local development server.')
    }
    url.searchParams.set('fixture', fixture)
    await window.loadURL(url.toString())
  } else {
    await window.loadFile(
      path.resolve(__dirname, '../out/renderer/index.html'),
      {
        query: {
          fixture
        }
      }
    )
  }
  await new Promise((resolve) => setTimeout(resolve, 800))
}

async function verifyKeyboardRouting(window) {
  let keyboardFixtureStep = 0
  const loadKeyboardFixture = async () => {
    console.error('Keyboard fixture step', ++keyboardFixtureStep)
    await loadFixture(window)
    await openStudioCommand(window, '도구', '선택 속성 열기')
    await clickStudioButton(window, '악보로 이동', null)
  }
  await loadKeyboardFixture()
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
        .find((span) => span.textContent?.endsWith('회 수정'))
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
        .find((span) => span.textContent?.endsWith('회 수정'))
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
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

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
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

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
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

  await openStudioCommand(window, '형식', '악보 설정')
  const fieldGuard = await window.webContents.executeJavaScript('(' + (() => {
    const input = document.querySelector('.studio-tempo-event input[aria-label="위치별 빠르기 BPM"]')
    if (!input || !input.checkVisibility() || input.disabled) return {error:'Visible enabled tempo text input required for shortcut guard', found:Boolean(input), visible:input?.checkVisibility(), disabled:input?.disabled,
      selected:document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id')}
    input.focus()
    const before = input.value
    for (const key of [{code:'KeyC',key:'ㅊ'}, {key:'2'}, {code:'KeyR',key:'ㄱ',isComposing:true}]) {
      input.dispatchEvent(new KeyboardEvent('keydown', {bubbles:true,cancelable:true,...key}))
    }
    return {label:input.getAttribute('aria-label'), focused:document.activeElement===input, before, after:input.value}
  }).toString() + ')()')
  if (fieldGuard.error || !fieldGuard.focused || fieldGuard.before !== fieldGuard.after) throw Error('Text-input shortcut guard failed: ' + JSON.stringify(fieldGuard))

  const textInputShortcuts = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
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

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
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

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        event: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        event: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        eventCount: document.querySelectorAll('.notation-event').length,
        hasInputCursor: Boolean(
          document.querySelector('.notation-input-cursor')
        ),
        status: document.querySelector('.editor-status span')?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
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
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      statusMessage: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent
    })
  `)

  await loadKeyboardFixture()
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
        code: 'Digit6',
        key: '6'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutCursor = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      hasInputCursor: Boolean(
        document.querySelector('.notation-input-cursor')
      ),
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadKeyboardFixture()
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
        code: 'Digit6',
        key: '6'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutFailure = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      errorMessage: document.querySelector('.editor-status .is-error')
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  await loadKeyboardFixture()
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
        code: 'Digit5',
        key: '5'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const durationShortcutConsumesRest = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
        )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
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
        code: 'Digit5',
        key: '5'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const restDurationShrink = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        pressedDuration: document.querySelector(
          '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
        )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m4-f-natural-1"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))
  await executeMetadataStep(window, 'activate current public tuplet button', `
    const button = document.querySelector('.studio-note-toolbar button:has([data-music-glyph="tuplet"])')
    if (!button || !button.checkVisibility() || button.disabled) throw Error('Visible enabled tuplet button required')
    button.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButton = await window.webContents.executeJavaScript(`
    (() => {
      const button = document.querySelector('.studio-note-toolbar button:has([data-music-glyph="tuplet"])')

      return {
        ariaLabel: button?.getAttribute('aria-label'),
        eventCount: document.querySelectorAll('.notation-event').length,
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        shortcut: button?.getAttribute('aria-label')?.split('단축키 ')[1],
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)
  await executeMetadataStep(window, 'activate current public tuplet button', `
    const button = document.querySelector('.studio-note-toolbar button:has([data-music-glyph="tuplet"])')
    if (!button || !button.checkVisibility() || button.disabled) throw Error('Visible enabled tuplet button required')
    button.click()
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletButtonToggleOff = await window.webContents.executeJavaScript(`
    ({
      eventCount: document.querySelectorAll('.notation-event').length,
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)

  await loadKeyboardFixture()
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
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletShortcutStart = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent,
      position: document.querySelector('[aria-label="입력 위치"]')?.textContent
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
        .find((span) => span.textContent?.endsWith('회 수정'))
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        eventCount: document.querySelectorAll('.notation-event').length,
        hasProgress: Boolean(document.querySelector('.tuplet-progress')),
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length
      }
    })()
  `)

  await loadKeyboardFixture()
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
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpan = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
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
        code: 'Digit3',
        ctrlKey: true,
        key: '3'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  const tripletAvailableSpanToggleOff = await window.webContents.executeJavaScript(`
    ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      eventCount: document.querySelectorAll('.notation-event').length,
      hasProgress: Boolean(document.querySelector('.tuplet-progress')),
      status: [...document.querySelectorAll('.editor-status span')]
        .at(-1)?.textContent,
      tupletCount: document.querySelectorAll('.vf-tuplet').length
    })
  `)

  await loadKeyboardFixture()
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
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim(),
      progress: document.querySelector('.tuplet-progress')?.textContent,
      status: document.querySelector('.editor-status span')?.textContent
    })
  `)

  await loadKeyboardFixture()
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
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent,
        selectedEvent: document
          .querySelector('.notation-event.is-selected')
          ?.getAttribute('data-event-id'),
        status: [...document.querySelectorAll('.editor-status span')]
          .at(-1)?.textContent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        type: inspectorValues[0]
      }
    })()
  `)

  await loadKeyboardFixture()
  await window.webContents.executeJavaScript(`
    document.querySelector(
      '.notation-event[data-event-id="m1-c4"]'
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `)
  await new Promise((resolve) => setTimeout(resolve, 100))

  for (let count = 0; count < 2; count += 1) {
    await window.webContents.executeJavaScript(`
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
          shiftKey: true
        })
      )
    `)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const rangeSelection = await window.webContents.executeJavaScript(`
    (() => {
      const inspectorValues = [
        ...document.querySelectorAll('.studio-selected-properties__readouts dd')
      ].map((value) => value.textContent?.trim())

      return {
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedCount: document.querySelectorAll(
          '.notation-event.is-selected'
        ).length
      }
    })()
  `)

  if (
    selectMode.eventCount !== initialEventCount ||
    selectMode.hasInputCursor ||
    selectMode.editCount !== '1회 수정' ||
    selectMode.status !== '4분음표' ||
    endCursor.hasInputCursor ||
    endCursor.editCount !== '2회 수정' ||
    endCursor.status !== '4분음표' ||
    cursorNoteInput.hasInputCursor ||
    cursorNoteInput.editCount !== '3회 수정' ||
    cursorNoteInput.eventCount !== initialEventCount + 1 ||
    cursorNoteInput.status !== '4분음표' ||
    cursorRestInput.hasInputCursor ||
    cursorRestInput.editCount !== '1회 수정' ||
    cursorRestInput.eventCount !== initialEventCount + 1 ||
    cursorRestInput.status !== '4분음표' ||
    koreanCursorRestInput.hasInputCursor ||
    koreanCursorRestInput.editCount !== '1회 수정' ||
    koreanCursorRestInput.eventCount !== initialEventCount + 1 ||
    koreanCursorRestInput.status !== '4분음표' ||
    textInputShortcuts.editCount !== cursorRestInput.editCount ||
    textInputShortcuts.pressedDuration !== '온음표' ||
    restShortcutConvertsSelection.eventCount !== initialEventCount ||
    restShortcutConvertsSelection.editCount !== '1회 수정' ||
    restShortcutConvertsSelection.hasInputCursor ||
    restShortcutConvertsSelection.status !== '4분음표' ||
    koreanRestShortcutConvertsSelection.eventCount !== initialEventCount ||
    koreanRestShortcutConvertsSelection.editCount !== '1회 수정' ||
    koreanRestShortcutConvertsSelection.hasInputCursor ||
    koreanRestShortcutConvertsSelection.status !== '4분음표' ||
    restToNote.eventCount !== initialEventCount ||
    restToNote.hasInputCursor ||
    restToNote.editCount !== '1회 수정' ||
    restToNote.status !== '4분음표' ||
    restToNote.event !== 'm3-half-rest' ||
    fullRestToNote.hasInputCursor ||
    fullRestToNote.status !== '4분음표' ||
    fullRestToNote.event === 'm2-1' ||
    durationShortcutChange.editCount !== '1회 수정' ||
    durationShortcutChange.eventCount !== initialEventCount + 1 ||
    durationShortcutChange.pressedDuration !== '8분음표' ||
    durationShortcutChange.statusMessage !== '음가를 8분음표로 바꿨습니다.' ||
    durationShortcutCursor.editCount !== '2회 수정' ||
    durationShortcutCursor.hasInputCursor ||
    durationShortcutCursor.pressedDuration !== '2분음표' ||
    durationShortcutCursor.status !== '2분음표' ||
    durationShortcutFailure.editCount !== '0회 수정' ||
    durationShortcutFailure.eventCount !== initialEventCount ||
    durationShortcutFailure.pressedDuration !== '4분음표' ||
    durationShortcutFailure.errorMessage !==
      '음표 m1-d4 때문에 음가를 늘릴 수 없습니다.' ||
    durationShortcutConsumesRest.editCount !== '1회 수정' ||
    durationShortcutConsumesRest.eventCount !== initialEventCount ||
    durationShortcutConsumesRest.pressedDuration !== '4분음표' ||
    durationShortcutConsumesRest.selectedEvent !== 'm6-e5' ||
    durationShortcutConsumesRest.status !==
      '음가를 4분음표로 바꾸고 뒤의 쉼표를 사용했습니다.' ||
    restDurationShrink.editCount !== '1회 수정' ||
    restDurationShrink.eventCount !== initialEventCount + 1 ||
    restDurationShrink.pressedDuration !== '4분음표' ||
    restDurationShrink.selectedEvent !== 'm5-half-rest' ||
    restDurationShrink.status !== '쉼표 음가를 4분음표로 바꿨습니다.' ||
    restDeleteAfterShrink.editCount !== '2회 수정' ||
    ![initialEventCount, initialEventCount + 1].includes(
      restDeleteAfterShrink.eventCount
    ) ||
    restDeleteAfterShrink.selectedEvent !== 'm5-g4' ||
    restDeleteAfterShrink.status !== '쉼표를 지웠습니다.' ||
    noteDeleteAbsorbsPrevious.editCount !== '1회 수정' ||
    noteDeleteAbsorbsPrevious.eventCount !== initialEventCount ||
    noteDeleteAbsorbsPrevious.selectedEvent !== 'm4-a4' ||
    noteDeleteAbsorbsPrevious.status !== '음표를 지웠습니다.' ||
    !tripletButton.ariaLabel?.includes('단축키 ⌘/Ctrl+3') ||
    tripletButton.shortcut !== '⌘/Ctrl+3' ||
    tripletButton.editCount !== '1회 수정' ||
    tripletButton.eventCount !== initialEventCount + 1 ||
    tripletButton.hasProgress ||
    tripletButton.tupletCount !== 2 ||
    tripletButton.status !== '선택한 구간에 셋잇단음표를 적용했습니다.' ||
    tripletButtonToggleOff.editCount !== '2회 수정' ||
    tripletButtonToggleOff.eventCount !== initialEventCount ||
    tripletButtonToggleOff.hasProgress ||
    tripletButtonToggleOff.tupletCount !== 1 ||
    tripletButtonToggleOff.status !== '선택한 셋잇단음표를 해제했습니다.' ||
    tripletShortcutStart.editCount !== '1회 수정' ||
    !tripletShortcutStart.status?.startsWith('셋잇단음표 입력') ||
    tripletShortcutStart.progress !== '셋잇단음표 0/3' ||
    tripletShortcutStart.position !== '9마디 · 묶음 시작 1박 (4분음표 기준)' ||
    tripletShortcutPreview.previewEventCount < 3 ||
    tripletShortcutPreview.progress !== '셋잇단음표 2/3' ||
    tripletShortcutPreview.status !== '셋잇단음표 2/3개 입력됨. 1개 더 입력해 주세요.' ||
    tripletShortcutComplete.editCount !== '2회 수정' ||
    tripletShortcutComplete.eventCount !== initialEventCount + 4 ||
    tripletShortcutComplete.hasProgress ||
    tripletShortcutComplete.tupletCount !== 2 ||
    tripletShortcutComplete.status !== '셋잇단음표 입력을 완료했습니다.' ||
    tripletAvailableSpan.editCount !== '1회 수정' ||
    tripletAvailableSpan.eventCount !== initialEventCount + 1 ||
    tripletAvailableSpan.hasProgress ||
    tripletAvailableSpan.status !== '선택한 구간에 셋잇단음표를 적용했습니다.' ||
    tripletAvailableSpan.tupletCount !== 2 ||
    tripletAvailableSpanToggleOff.editCount !== '2회 수정' ||
    tripletAvailableSpanToggleOff.eventCount !== initialEventCount ||
    tripletAvailableSpanToggleOff.hasProgress ||
    tripletAvailableSpanToggleOff.status !==
      '선택한 셋잇단음표를 해제했습니다.' ||
    tripletAvailableSpanToggleOff.tupletCount !== 1 ||
    tripletDottedRestStart.editCount !== '0회 수정' ||
    tripletDottedRestStart.progress ||
    tripletDottedRestStart.status !== '4분음표' ||
    tripletBackspaceClear.editCount !== '0회 수정' ||
    tripletBackspaceClear.selectedEvent !== 'm7-triplet-c5' ||
    tripletBackspaceClear.status !==
      '잇단음표 구성음은 아직 따로 지울 수 없습니다.' ||
    tripletBackspaceClear.tupletCount !== 1 ||
    rangeSelection.eventCount !== initialEventCount ||
    rangeSelection.selectedCount !== 3
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
        rangeSelection,
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
    fieldGuard,
    tripletButton,
    tripletButtonToggleOff,
    tripletAvailableSpan,
    tripletAvailableSpanToggleOff,
    tripletDottedRestStart,
    tripletBackspaceClear,
    rangeSelection,
    tripletShortcutComplete,
    tripletShortcutPreview,
    tripletShortcutStart
  }
}

async function verifyOutOfStaffNotes(window) {
  const cases = [
    {
      buttonLabel: '한 옥타브 올리기',
      clicks: 3,
      eventId: 'm2-7',
      name: 'high'
    },
    {
      buttonLabel: '한 옥타브 내리기',
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
    await openStudioCommand(window, '도구', '선택 속성 열기')
    const readPitch = () => window.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('.studio-selected-properties')
      if (!root?.checkVisibility()) throw Error('Visible selected properties required for octave command')
      const row = [...root.querySelectorAll('.studio-selected-properties__readouts > div')].find(node => node.querySelector('dt')?.textContent === '음높이')
      return { pitch:row?.querySelector('dd')?.textContent,
        history:[...document.querySelectorAll('.editor-status span')].find(node => node.textContent.endsWith('회 수정'))?.textContent,
        selected:document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id'),
        events:document.querySelectorAll('.notation-event').length }
    })()`)
    const beforePitch = await readPitch()

    for (let click = 0; click < testCase.clicks; click += 1) {
      await clickStudioButton(window, testCase.buttonLabel, '.studio-chord-properties')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const afterPitch = await readPitch()
    const pitch = beforePitch.pitch?.match(/^([A-G][#b]*)(-?\d+)$/)
    const expectedPitch = pitch && pitch[1] + (Number(pitch[2]) + (testCase.name === 'high' ? 1 : -1) * testCase.clicks)
    if (!pitch || beforePitch.history !== '0회 수정' || afterPitch.pitch !== expectedPitch ||
        afterPitch.history !== testCase.clicks + '회 수정' || afterPitch.selected !== testCase.eventId || afterPitch.events !== beforePitch.events)
      throw Error('Actual octave commands must change only the selected pitch: ' + JSON.stringify({beforePitch,afterPitch,expectedPitch}))

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
        mvpArtifacts,
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
      beforePitch,
      afterPitch,
      ...result
    })
  }

  return results
}

async function verifyReleaseScenarioBounds(window) {
  await loadFixture(window, 'release-test')

  const desktop = await readReleaseScenarioBounds(window, 1400)
  const minimum = await readReleaseScenarioBounds(window, 1100)
  const compact = await readReleaseScenarioBounds(window, 960)
  const result = {
    compact,
    desktop,
    minimum
  }

  for (const metrics of [desktop, minimum, compact]) {
    if (
      !metrics.hasFermata ||
      !metrics.hasTempo ||
      metrics.clippedElements.length > 0 ||
      metrics.dynamicMeasureStartOverlap.length > 0 ||
      metrics.systemRightOverflow.length > 0 ||
      metrics.horizontalViewportOverflow.length > 0
    ) {
      throw new Error(
        `Release scenario bounds verification failed: ${JSON.stringify(result)}`
      )
    }
  }

  return result
}

async function readReleaseScenarioBounds(window, width) {
  window.setSize(width, 1000)
  await new Promise((resolve) => setTimeout(resolve, 600))

  return window.webContents.executeJavaScript(`
    (() => {
      const svg = document.querySelector('.notation-preview svg')
      const svgBox = svg?.getBoundingClientRect()
      const clippedSelectors = [
        '.notation-measure',
        '.notation-fermata',
        '.notation-articulation',
        '.notation-dynamic-mark',
        '.notation-tempo-marking',
        '.notation-input-cursor',
        '.notation-slur'
      ]
      const horizontalSelectors = [
        '.notation-event',
        ...clippedSelectors
      ]
      const tolerance = 0.75
      const clippedCandidates = clippedSelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((element, index) => ({
          element,
          id:
            element.getAttribute('data-event-id') ??
            element.getAttribute('data-measure-id') ??
            element.textContent?.trim() ??
            selector,
          index,
          selector
        }))
      )
      const horizontalCandidates = horizontalSelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((element, index) => ({
          element,
          id:
            element.getAttribute('data-event-id') ??
            element.getAttribute('data-measure-id') ??
            element.textContent?.trim() ??
            selector,
          index,
          selector
        }))
      )
      const clippedElements = !svgBox
        ? [{ selector: 'svg', id: 'missing', index: 0 }]
        : clippedCandidates
            .map(({ element, id, index, selector }) => {
              const box = element.getBoundingClientRect()
              const clipped =
                box.left < svgBox.left - tolerance ||
                box.top < svgBox.top - tolerance ||
                box.right > svgBox.right + tolerance ||
                box.bottom > svgBox.bottom + tolerance

              return clipped
                ? {
                    selector,
                    id,
                    index,
                    box: {
                      bottom: box.bottom,
                      left: box.left,
                      right: box.right,
                      top: box.top
                    },
                    svgBox: {
                      bottom: svgBox.bottom,
                      left: svgBox.left,
                      right: svgBox.right,
                      top: svgBox.top
                    }
                  }
                : undefined
            })
            .filter(Boolean)
      const measures = [...document.querySelectorAll('.notation-measure')]
      const svgWidth = Number(svg?.getAttribute('width'))
      const systemRightOverflow = [
        ...new Set(measures.map((measure) => measure.getAttribute('data-system-index')))
      ]
        .map((systemIndex) => {
          const systemMeasures = measures.filter(
            (measure) => measure.getAttribute('data-system-index') === systemIndex
          )
          const last = systemMeasures.at(-1)
          const rightEdge =
            Number(last?.getAttribute('x')) + Number(last?.getAttribute('width'))
          return {
            rightEdge,
            systemIndex
          }
        })
        .filter(({ rightEdge }) => rightEdge > svgWidth - 7.5)
      const horizontalViewportOverflow = horizontalCandidates
        .map(({ element, id, index, selector }) => {
          const box = element.getBoundingClientRect()
          const overflow =
            box.left < -tolerance ||
            box.right > window.innerWidth + tolerance

          return overflow
            ? {
                selector,
                id,
                index,
                box: {
                  bottom: box.bottom,
                  left: box.left,
                  right: box.right,
                  top: box.top
                }
              }
            : undefined
        })
        .filter(Boolean)
      const dynamicMeasureStartOverlap = [
        ...document.querySelectorAll('.notation-dynamic-mark')
      ]
        .map((dynamic) => {
          const measureId = dynamic.getAttribute('data-measure-id')
          const measure = measureId
            ? document.querySelector(
                \`.notation-measure[data-measure-id="\${measureId}"]\`
              )
            : undefined
          const x = Number(dynamic.getAttribute('x'))
          const measureX = Number(measure?.getAttribute('x'))
          const overlapsStartArea =
            Number.isFinite(x) &&
            Number.isFinite(measureX) &&
            x < measureX + 72

          return overlapsStartArea
            ? {
                measureId,
                measureX,
                x
              }
            : undefined
        })
        .filter(Boolean)

      return {
        clippedElements,
        dynamicMeasureStartOverlap,
        hasFermata: Boolean(document.querySelector('.notation-fermata')),
        hasTempo: Boolean(document.querySelector('.notation-tempo-marking')),
        svgHeight: Number(svg?.getAttribute('height')),
        svgWidth,
        systemRightOverflow,
        horizontalViewportOverflow,
        width: window.innerWidth
      }
    })()
  `)
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
        code: 'KeyT',
        key: 'ㅅ'
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
        code: 'KeyT',
        key: 'ㅅ'
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
    added.status !== '타이를 추가했습니다.' ||
    removed.tieCount !== before.tieCount ||
    removed.status !== '타이를 해제했습니다.'
  ) {
    throw new Error(`Tie editing verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

async function readTieMetrics(window) {
  return window.webContents.executeJavaScript(`
    (() => ({
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      status: [...document.querySelectorAll('.editor-status span')]
        .map((span) => span.textContent?.trim())
        .find((text) => text === '타이를 추가했습니다.' || text === '타이를 해제했습니다.'),
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
  const beforeSelection = await window.webContents.executeJavaScript(`JSON.stringify([...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId))`)

  const titleEntry = await editMetadataField(window, 'title', '새 악보 제목', 'Enter')
  const composerEntry = await editMetadataField(window, 'composer', '김작곡', 'Enter')

  const edited = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await openStudioCommand(window, '편집', '실행 취소')
  await new Promise((resolve) => setTimeout(resolve, 150))

  const undoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  await openStudioCommand(window, '편집', '다시 실행')
  await new Promise((resolve) => setTimeout(resolve, 150))

  const redoneComposer = await window.webContents.executeJavaScript(`
    ({
      composer: document.querySelector(
        'button[aria-label="작곡가 수정"]'
      )?.textContent?.trim(),
      editCount: [...document.querySelectorAll('.editor-status span')]
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  const cancelledEntry = await editMetadataField(window, 'title', '취소할 제목', 'Escape')

  const cancelled = await window.webContents.executeJavaScript(`
    ({
      title: document.querySelector(
        'button[aria-label="악보 제목 수정"]'
      )?.textContent?.trim()
    })
  `)

  const draftEntry = await openMetadataField(window, 'composer')
  await window.webContents.executeJavaScript(`
    window.setInputValue(
      document.querySelector('input[aria-label="작곡가"]'),
      '입력 중'
    )
    document
      .querySelector('input[aria-label="작곡가"]')
      .dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyA',
        key: 'ㅁ'
      })
    )
    document
      .querySelector('input[aria-label="작곡가"]')
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
        .find((span) => span.textContent?.endsWith('회 수정'))
        ?.textContent,
      inputOpen: Boolean(
        document.querySelector('input[aria-label="작곡가"]')
      ),
      pressedDuration: document.querySelector(
        '.studio-note-toolbar [aria-label="음가"] button[aria-pressed="true"]'
      )?.getAttribute('aria-label')?.split(',')[0]?.trim()
    })
  `)

  const result = {
    cancelled,
    edited,
    redoneComposer,
    textInputProtection,
    undoneComposer,
    entries: [titleEntry, composerEntry, cancelledEntry, draftEntry]
  }

  if (
    edited.title !== '새 악보 제목' ||
    edited.composer !== '김작곡' ||
    edited.editCount !== '2회 수정' ||
    undoneComposer.title !== '새 악보 제목' ||
    undoneComposer.composer !== 'in-C' ||
    undoneComposer.editCount !== '1회 수정' ||
    redoneComposer.title !== '새 악보 제목' ||
    redoneComposer.composer !== '김작곡' ||
    redoneComposer.editCount !== '2회 수정' ||
    cancelled.title !== '새 악보 제목' ||
    !textInputProtection.inputOpen ||
    textInputProtection.editCount !== '2회 수정' ||
    textInputProtection.pressedDuration !== '4분음표'
  ) {
    throw new Error(
      `Metadata editing verification failed: ${JSON.stringify(result)}`
    )
  }

  await window.webContents.executeJavaScript(`document.querySelector('input[aria-label="작곡가"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`)
  await new Promise(resolve => setTimeout(resolve, 150))
  const cancelledDraft = await window.webContents.executeJavaScript(`(() => ({
    composer: document.querySelector('button[aria-label="작곡가 수정"]')?.textContent.trim(),
    focus: document.activeElement?.getAttribute('aria-label'),
    edits: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent.endsWith('회 수정'))?.textContent.trim(),
    selection: JSON.stringify([...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId)),
    events: document.querySelectorAll('.notation-event').length
  }))()`)
  if (cancelledDraft.composer !== '김작곡' || cancelledDraft.edits !== '2회 수정' || cancelledDraft.focus !== '악보 정보' ||
      cancelledDraft.selection !== beforeSelection || cancelledDraft.events !== 33)
    throw Error('Metadata draft cancellation/selection contract failed: ' + JSON.stringify(cancelledDraft))
  await clickStudioButton(window, '악보로 이동', null)
  await new Promise(resolve => setTimeout(resolve, 300))
  const screenshot = path.join(mvpArtifacts, 'metadata-' + window.getContentSize()[0] + '.png')
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
  return {...result, cancelledDraft, screenshot}
}

async function verifyFileActions(window) {
  await loadFixture(window)

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const state = () => ({
        selected: [...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId),
        count: document.querySelectorAll('.notation-event').length,
        history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent
      })
      const before = state()
      const click = async (label, scope) => {
        const root = scope ? document.querySelector(scope) : document
        const button = [...root.querySelectorAll('button')].find(node => node.checkVisibility() && (node.getAttribute('aria-label') || node.textContent.trim()) === label)
        if (!button || button.disabled) throw Error('Unavailable live file action: ' + label)
        button.focus(); button.click(); await settle()
      }
      const readButtons = selector => [...document.querySelectorAll(selector)].filter(node => node.checkVisibility()).map(button => ({
        ariaLabel: button.getAttribute('aria-label'), label: button.textContent.trim(),
        common: button.classList.contains('dd-button'), disabled: button.disabled
      }))
      await click('파일', '.studio-application-menu')
      await click('파일 작업 열기', '.studio-application-menu')
      const fileAriaLabel = document.querySelector('.studio-file-tools [aria-label="파일 작업"]')?.getAttribute('aria-label')
      const fileButtons = readButtons('.studio-file-tools [aria-label="파일 작업"] button')
      const selectionFilter = [...document.querySelectorAll('.studio-file-tools button[role="combobox"]')].find(node => node.labels?.[0]?.textContent.trim() === '선택 필터')
      if (!selectionFilter?.checkVisibility() || selectionFilter.disabled) throw Error('Visible public selection filter required')
      selectionFilter.focus(); selectionFilter.click(); await settle()
      const list = document.getElementById(selectionFilter.getAttribute('aria-controls'))
      if (!list?.checkVisibility() || list.getAttribute('role') !== 'listbox') throw Error('Visible public selection options required')
      const filter = {
        accessibleName: selectionFilter.labels?.[0]?.textContent.trim(),
        value: list.querySelector('[role="option"][aria-selected="true"]')?.getAttribute('data-value'),
        options: [...list.querySelectorAll('[role="option"]')].map(option => option.textContent.trim())
      }
      selectionFilter.click(); await settle()
      if (selectionFilter.getAttribute('aria-expanded') !== 'false') throw Error('Selection filter must close without changing its value')
      await click('파일', '.studio-application-menu')
      await click('내보내기 설정', '.studio-application-menu')
      const exportButtons = readButtons('.studio-export-tools [aria-label="파일 형식"] button')
      return {
        fileAriaLabel,
        exportAriaLabel: document.querySelector('.studio-export-tools')?.getAttribute('aria-label'),
        fileButtons,
        exportButtons,
        fileLabels: fileButtons.map((button) => button.label),
        exportLabels: exportButtons.map((button) => button.label),
        selectionFilter: filter,
        before, after: state()
      }
    })()
  `)
  const fileButtonLabels = result.fileButtons.map((button) => button.label)
  const fileButtonAriaLabels = result.fileButtons.map((button) => button.ariaLabel)
  const exportButtonLabels = result.exportButtons.map((button) => button.label)
  const exportButtonAriaLabels = result.exportButtons.map((button) => button.ariaLabel)

  if (
    result.fileAriaLabel !== '파일 작업' ||
    result.exportAriaLabel !== '내보내기 작업' ||
    fileButtonLabels.includes('Export') ||
    fileButtonLabels.includes('저장하기') ||
    fileButtonLabels.includes('PDF 변환') ||
    fileButtonLabels.includes('MIDI') ||
    !fileButtonLabels.includes('새 악보') ||
    !fileButtonLabels.includes('MusicXML 가져오기') ||
    !fileButtonLabels.includes('저장') ||
    !fileButtonAriaLabels.includes('새 악보 만들기') ||
    !fileButtonAriaLabels.includes('MusicXML 가져오기') ||
    !fileButtonAriaLabels.includes('MusicXML로 저장') ||
    !result.selectionFilter ||
    result.selectionFilter.accessibleName !== '선택 필터' ||
    result.selectionFilter.value !== 'notes-and-rests' ||
    result.selectionFilter.options.join('|') !== '전체|음표만|쉼표만' ||
    !exportButtonLabels.includes('PDF 변환') ||
    !exportButtonLabels.includes('MIDI') ||
    !exportButtonAriaLabels.includes('PDF 변환') ||
    !exportButtonAriaLabels.includes('MIDI 내보내기') ||
    !result.fileButtons.every(button => button.common) ||
    !result.exportButtons.every(button => button.common) ||
    JSON.stringify(result.before) !== JSON.stringify(result.after)
  ) {
    throw new Error(`파일 작업 verification failed: ${JSON.stringify(result)}`)
  }

  return result
}

const studioWorkspaceTasks = [
  { label: '파일', menu: '파일', command: '파일 작업 열기', surface: '.studio-file-tools' },
  { label: '악보', menu: '형식', command: '악보 설정', surface: '.studio-score-settings' },
  { label: '음표', menu: '도구', command: '선택 속성 열기', surface: '.studio-selected-properties' },
  { label: '표기 객체', menu: '추가', command: '표기 팔레트 열기', surface: '.studio-notation-palette' },
  { label: '가사', menu: '추가', command: '가사 및 코드', surface: '.studio-lyric-tools' },
  { label: '내보내기', menu: '파일', command: '내보내기 설정', surface: '.studio-export-tools' },
  { label: '재생', menu: '도구', command: '재생 도구', surface: '.studio-part-mixer' }
]

// This function is serialized into the actual renderer. It uses no Node closure.
async function probeStudioWorkspaceTask(task) {
  const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const visible = node => Boolean(node && node.checkVisibility() && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
  const snapshot = () => ({
    selected: [...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId),
    events: document.querySelectorAll('.notation-event').length,
    history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent
  })
  const click = async (label, scope) => {
    const node = [...(scope ? document.querySelector(scope) : document).querySelectorAll('button')]
      .find(node => visible(node) && (node.getAttribute('aria-label') || node.textContent.trim()) === label)
    if (!node || node.disabled) throw Error('Unavailable workspace command: ' + label)
    node.focus(); node.click(); await wait()
  }
  const before = snapshot()
  await click(task.menu, '.studio-application-menu')
  await click(task.command, '.studio-application-menu')
  const surface = document.querySelector(task.surface)
  if (!visible(surface)) throw Error('Live workspace surface required: ' + task.label)
  const labels = [...document.querySelectorAll('[aria-label]')].filter(visible).map(node => node.getAttribute('aria-label'))
  const buttons = [...surface.querySelectorAll('button')].filter(visible).map(node => ({
    text: node.textContent.trim(), label: node.getAttribute('aria-label'),
    common: node.matches('.dd-button,.dd-select') || Boolean(node.closest('.dd-accordion,.dd-segments,.dd-tab-list'))
  }))
  const controls = [...document.querySelectorAll('.ddirori button,.ddirori input,.ddirori select,.ddirori textarea,.ddirori output,.ddirori label')]
    .filter(node => visible(node) && !node.closest('.score-canvas,.studio-pdf-snapshot,.performance-lab'))
  const textOverflow = controls.filter(node => node.textContent.trim() && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
    .map(node => ({tag: node.tagName, label: node.getAttribute('aria-label'), text: node.textContent.trim(), client: node.clientWidth, scroll: node.scrollWidth}))
  const containers = [...document.querySelectorAll('.studio-application-menu,.studio-command-bars,.studio-workspace-tools,.studio-status,' + task.surface)].filter(visible)
  const containerOverflow = containers.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className)
  const page = document.querySelector('.score-page')
  const entryPage = page.getBoundingClientRect()
  const entryPageVisible = entryPage.bottom > 0 && entryPage.top < innerHeight
  const entryFocus = { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.trim().slice(0, 80), insideSurface: surface.contains(document.activeElement) }
  const transportVisible = visible(document.querySelector('.studio-playback'))
  const harmonyEntryVisible = visible(document.querySelector('.studio-harmony-entry'))
  const families = [...document.querySelectorAll('.studio-notation-palette .dd-accordion >button')].filter(visible).map(node => node.textContent.trim())
  const documentOverflow = document.documentElement.scrollWidth > innerWidth + 1
  // Opening a long form may scroll the page away. Verify the explicit return
  // through the same visible action available to users, not a forced DOM scroll.
  await click('악보로 이동')
  const selected = document.querySelector('.notation-event.is-selected')
  const text = selected?.querySelector('.vf-notehead text')
  if (!text) throw Error('Selected fixture note ink required after workspace return')
  const style = getComputedStyle(text), ctx = document.createElement('canvas').getContext('2d')
  ctx.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ')
  const ink = ctx.measureText(text.textContent), start = text.getStartPositionOfChar(0), matrix = text.getScreenCTM()
  const top = new DOMPoint(start.x - ink.actualBoundingBoxLeft, start.y - ink.actualBoundingBoxAscent).matrixTransform(matrix)
  const bottom = new DOMPoint(start.x + ink.actualBoundingBoxRight, start.y + ink.actualBoundingBoxDescent).matrixTransform(matrix)
  const footer = document.querySelector('.studio-status').getBoundingClientRect(), limit = Math.min(innerHeight, footer.top)
  const returnedPage = page.getBoundingClientRect()
  return {
    label: task.label, surface: task.surface, available: visible(surface), labels, buttons, families,
    transportVisible, harmonyEntryVisible, documentOverflow, containerOverflow, textOverflow,
    before, after: snapshot(), entryPageVisible, entryFocus,
    returnToScore: {
      pageVisible: returnedPage.bottom > 0 && returnedPage.top < innerHeight,
      selectedFocused: document.activeElement === selected, ink: {top: top.y, bottom: bottom.y},
      limit, inkVisible: top.y >= 0 && bottom.y <= limit
    }
  }
}

function assertStudioWorkspaceTask(task) {
  if (!task.available || !task.transportVisible || task.documentOverflow || task.containerOverflow.length ||
      task.textOverflow.length || !task.buttons.every(button => button.common) ||
      JSON.stringify(task.before) !== JSON.stringify(task.after) ||
      !task.returnToScore.pageVisible || !task.returnToScore.selectedFocused || !task.returnToScore.inkVisible)
    throw Error('Workspace task invariant failed: ' + JSON.stringify(task))
}

async function verifyStudioWorkspaceTasks(window, viewport) {
  window.setContentSize(viewport.width, viewport.height)
  await loadFixture(window, 'release-test')
  const tasks = []
  for (const task of studioWorkspaceTasks) {
    const result = await window.webContents.executeJavaScript('(' + probeStudioWorkspaceTask.toString() + ')(' + JSON.stringify(task) + ')')
    tasks.push(result)
    assertStudioWorkspaceTask(result)
  }
  const byLabel = new Map(tasks.map(task => [task.label, task]))
  const labels = label => byLabel.get(label).labels
  const buttons = label => byLabel.get(label).buttons.map(button => button.text)
  if (buttons('파일').includes('PDF 변환') || buttons('파일').includes('MIDI') ||
      byLabel.get('음표').harmonyEntryVisible || byLabel.get('표기 객체').harmonyEntryVisible ||
      !byLabel.get('가사').harmonyEntryVisible || !labels('가사').includes('코드 심벌 속성') ||
      !byLabel.get('표기 객체').families.includes('음자리표·조표·박자표') ||
      !buttons('내보내기').includes('PDF 변환') || !buttons('내보내기').includes('MIDI') ||
      !labels('재생').includes('재생 컨트롤'))
    throw Error('Workspace role mapping failed: ' + JSON.stringify(tasks))
  return { ...viewport, tasks }
}

async function verifyCompactToolbarModes(window) {
  return verifyStudioWorkspaceTasks(window, {name: 'compact-tall', width: 960, height: 1000})
}

async function verifyCommercialHeadlessViewports(window) {
  const results = []
  for (const viewport of [
    { name: 'compact-short', width: 960, height: 720 },
    { name: 'compact-tall', width: 960, height: 1000 },
    { name: 'desktop-short', width: 1400, height: 760 }
  ]) results.push(await verifyStudioWorkspaceTasks(window, viewport))
  return results
}

async function verifyPropertiesDockEditing(window) {
  const captures = []
  for (const width of [1400, 960]) {
    window.setContentSize(width, 900)
    await loadFixture(window, 'release-test')
    const result = await window.webContents.executeJavaScript('(' + (async () => {
      window.__mvpPropertiesTrace = []
      const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const visible = node => Boolean(node && node.checkVisibility() && node.getBoundingClientRect().width > 0)
      const click = async (name, scope) => {
        const root = scope ? document.querySelector(scope) : document
        const node = [...root.querySelectorAll('button')].find(node => visible(node) && (node.getAttribute('aria-label') || node.textContent.trim()) === name)
        if (!node || node.disabled) throw Error('Unavailable live properties action: ' + name + JSON.stringify(window.__mvpPropertiesTrace))
        node.focus(); node.click(); await wait()
      }
      const menu = async (name, command) => {
        await click(name, '.studio-application-menu')
        await click(command, '.studio-application-menu')
      }
      const note = document.querySelector('.notation-event[data-event-id="m1-d4"]')
      if (!visible(note)) throw Error('Actual fixture note required')
      note.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait()
      await menu('도구', '선택 속성 열기')
      const field = label => {
        const input = document.querySelector('.studio-selected-properties input[aria-label="' + label + '"]')
        if (!visible(input) || input.disabled || !input.closest('.dd-input-row')) throw Error('Visible public property required: ' + label)
        return input
      }
      const read = () => ({
        chord: field('선택 요약 코드').value,
        staffText: field('선택 요약 보표 글자').value,
        history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent,
        selected: [...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId),
        events: document.querySelectorAll('.notation-event').length
      })
      const before = read(), commits = []
      for (const [label, value, enter] of [['선택 요약 코드', 'Dm7', false], ['선택 요약 보표 글자', 'cantabile', true]]) {
        const input = field(label)
        input.scrollIntoView({ block: 'nearest' }); input.focus()
        window.__mvpPropertiesTrace.push({ phase: 'focus', label, active: document.activeElement === input, value: input.value })
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true })); await wait()
        if (enter) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
        else input.blur()
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        await wait(); commits.push(read());window.__mvpPropertiesTrace.push({phase:'commit',...read()})
      }
      const changed = read(), history = []
      for (const command of ['실행 취소', '실행 취소', '다시 실행', '다시 실행']) {
        await menu('편집', command); history.push(read())
      }
      const dock = document.querySelector('.docked-properties')
      if (!visible(dock)) throw Error('Properties dock must be visible before measuring it')
      const box = dock.getBoundingClientRect(), widthsBefore = localStorage.getItem('chromatics.dock-widths.v1')
      const preview = document.querySelector('.notation-preview')
      const tempo = preview.querySelector('.notation-tempo-marking').getBoundingClientRect()
      const rehearsal = preview.querySelector('.notation-rehearsal-mark').getBoundingClientRect()
      const rehearsalFrame = preview.querySelector('.notation-rehearsal-mark rect').getBoundingClientRect()
      const harmony = preview.querySelector('.notation-harmony-mark').getBoundingClientRect()
      const beforeWidth = document.querySelector('.score-canvas').getBoundingClientRect().width
      // Shared sidebar: close the currently active properties pane, then the
      // fallback palette. Switching to an inactive pane is not a close action.
      await click('속성 표시'); await click('팔레트 표시')
      const expandedWidth = document.querySelector('.score-canvas').getBoundingClientRect().width
      const panelsHidden = ['.docked-palette', '.docked-properties'].every(selector => !visible(document.querySelector(selector)))
      await click('팔레트 표시'); await click('속성 표시')
      const restored = read(), restoredWidth = document.querySelector('.score-canvas').getBoundingClientRect().width
      const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      const inputOverflow = [...dock.querySelectorAll('input,[role="combobox"]')].filter(visible).some(input => {
        const b = input.getBoundingClientRect()
        return b.left < box.left - 1 || b.right > box.right + 1
      })
      field('선택 요약 보표 글자').focus(); await wait()
      return {
        before, commits, changed, history, restored, panelsHidden,
        canvasExpands: expandedWidth > beforeWidth, canvasWidthRestored: Math.abs(restoredWidth - beforeWidth) < 1,
        widthsPreserved: widthsBefore === localStorage.getItem('chromatics.dock-widths.v1'),
        renderedText: preview.textContent, dockWidth: box.width,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        scoreOverflow: preview.scrollWidth > preview.clientWidth + 1,
        tempoRehearsalOverlap: overlap(tempo, rehearsal),
        rehearsalHarmonyOverlap: overlap(rehearsalFrame, harmony), inputOverflow
      }
    }).toString() + ')()')
    fs.writeFileSync(path.join(mvpArtifacts, 'properties-' + width + '.json'), JSON.stringify(result, null, 2))
    const {before, commits, changed, history, restored} = result
    const sameSelection = row => JSON.stringify(row.selected) === JSON.stringify(before.selected) && row.events === before.events
    const originalValues = row => row.chord === before.chord && row.staffText === before.staffText
    const changedValues = row => row.chord === 'Dm7' && row.staffText === 'cantabile'
    if (before.history !== '0회 수정' || commits[0].history !== '1회 수정' || commits[1].history !== '2회 수정' ||
        !changedValues(changed) || !changedValues(restored) ||
        history.map(row => row.history).join('|') !== '1회 수정|0회 수정|1회 수정|2회 수정' ||
        history[0].chord !== 'Dm7' || history[0].staffText !== before.staffText ||
        !originalValues(history[1]) || !changedValues(history[3]) ||
        ![...commits, changed, ...history, restored].every(sameSelection) ||
        !result.renderedText.includes('cantabile') || !result.panelsHidden || !result.canvasExpands ||
        !result.canvasWidthRestored || !result.widthsPreserved || result.dockWidth < 200 || result.dockWidth > 360 ||
        result.overflow || result.inputOverflow || result.scoreOverflow ||
        result.tempoRehearsalOverlap || result.rehearsalHarmonyOverlap)
      throw Error('Properties dock workflow failed: ' + JSON.stringify(result))
    const screenshot = path.join(mvpArtifacts, 'properties-' + width + '.png')
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
    captures.push({width, screenshot, ...result, renderedText: undefined})
  }
  return captures
}

async function clickStudioButton(window, label, scope = '.studio-application-menu') {
  return window.webContents.executeJavaScript('(' + (async ({label, scope}) => {
    const root = scope ? document.querySelector(scope) : document
    const node = [...root.querySelectorAll('button')].find(node =>
      node.checkVisibility() && (node.getAttribute('aria-label') || node.textContent.trim()) === label)
    if (!node || node.disabled) throw Error('Unavailable live command: ' + label)
    node.focus(); node.click()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }).toString() + ')(' + JSON.stringify({label, scope}) + ')')
}

async function openStudioCommand(window, menu, command) {
  await clickStudioButton(window, menu)
  await clickStudioButton(window, command)
}

async function chooseStudioValue(window, label, value, scope = 'main') {
  return window.webContents.executeJavaScript('(' + (async ({label, value, scope}) => {
    const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const root = document.querySelector(scope)
    const control = [...root.querySelectorAll('button[role="combobox"]')].find(node =>
      node.checkVisibility() && (node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim()) === label)
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') throw Error('Unavailable public Select: ' + label)
    control.focus(); control.click(); await wait()
    const list = document.getElementById(control.getAttribute('aria-controls'))
    if (!list?.checkVisibility()) throw Error('Visible public listbox required: ' + label)
    const option = [...list.querySelectorAll('[role="option"]')].find(node => node.dataset.value === value)
    if (!option || option.disabled || option.getAttribute('aria-disabled') === 'true') throw Error('Unavailable option: ' + label + ':' + value)
    const chosen = option.textContent.trim(); option.click(); await wait()
    if (control.isConnected && control.getAttribute('aria-expanded') !== 'false') throw Error('Select must close after commitment: ' + label)
    if (control.isConnected && control.textContent.trim() !== chosen) throw Error('Controlled Select label must reflect committed option: ' + label)
    return {label, value, chosen}
  }).toString() + ')(' + JSON.stringify({label, value, scope}) + ')')
}

async function readStudioValue(window, label, scope) {
  return window.webContents.executeJavaScript('(' + (async ({label, scope}) => {
    const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const control = [...document.querySelector(scope).querySelectorAll('button[role="combobox"]')].find(node =>
      (node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim()) === label)
    if (!control || !control.checkVisibility() || control.disabled) throw Error('Visible readable public Select required: ' + label)
    control.focus(); control.click(); await wait()
    const list = document.getElementById(control.getAttribute('aria-controls'))
    if (!list?.checkVisibility()) throw Error('Visible selected-value list required: ' + label)
    const selected = list.querySelector('[role="option"][aria-selected="true"]')
    if (!selected || selected.textContent.trim() !== control.textContent.trim()) throw Error('Selected option must match controlled display: ' + label)
    const result = {value: selected.dataset.value, text: selected.textContent.trim()}
    control.click(); await wait()
    return result
  }).toString() + ')(' + JSON.stringify({label, scope}) + ')')
}

async function fillStudioInput(window, label, value, scope) {
  return window.webContents.executeJavaScript('(' + (async ({label, value, scope}) => {
    const input = [...document.querySelector(scope).querySelectorAll('input')].find(node =>
      (node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim()) === label)
    if (!input || !input.checkVisibility() || input.disabled) throw Error('Visible enabled public Input required: ' + label)
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', {bubbles: true}))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    // Headless Electron does not consistently emit the browser focusout event.
    // This is a renderer adapter check, not native keyboard/blur approval.
    input.dispatchEvent(new FocusEvent('focusout', {bubbles: true}))
    input.blur()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    if (input.value !== value) throw Error('Public Input did not retain value: ' + label)
  }).toString() + ')(' + JSON.stringify({label, value, scope}) + ')')
}

async function verifyPartViewHeadlessExportState(window) {
  window.setContentSize(1400, 900)
  await loadFixture(window)
  await openStudioCommand(window, '파일', '새 악보 만들기')
  await chooseStudioValue(window, '악보 구성', 'string-quartet', '.studio-new-score-form')
  await clickStudioButton(window, '만들기', '.studio-new-score-form')
  await openStudioCommand(window, '형식', '악보 설정')
  await chooseStudioValue(window, '악보 보기', 'part', '.studio-score-view')
  await chooseStudioValue(window, '파트보 선택', 'viola', '.studio-score-view')
  await openStudioCommand(window, '파일', '내보내기 설정')
  await chooseStudioValue(window, 'PDF 설정 프리셋', 'compact-parts', '.studio-page-setup')
  const result = await window.webContents.executeJavaScript('(' + (() => {
    const page = document.querySelector('.score-page'), partTitle = document.querySelector('[aria-label="파트보 제목"]')
    const exports = document.querySelector('.studio-export-tools')
    return {
      exportVisible: exports?.checkVisibility(),
      exportButtons: [...exports.querySelectorAll('button')].filter(node => node.checkVisibility()).map(node => ({
        ariaLabel: node.getAttribute('aria-label'), title: node.getAttribute('title'),
        text: node.textContent.trim(), common: node.classList.contains('dd-button')
      })),
      page: {
        margin: page.getAttribute('data-pdf-page-margin-mm'), orientation: page.getAttribute('data-pdf-page-orientation'),
        partId: page.getAttribute('data-part-id'), size: page.getAttribute('data-pdf-page-size'),
        staffSize: page.getAttribute('data-pdf-staff-size-percent'), systemSpacing: page.getAttribute('data-pdf-system-spacing-percent'),
        viewMode: page.getAttribute('data-view-mode')
      },
      partIds: [...new Set([...document.querySelectorAll('.notation-event')].map(node => node.dataset.partId).filter(Boolean))],
      partTitle: {partId: partTitle?.dataset.partId, text: partTitle?.textContent.trim()},
      staffLabels: [...document.querySelectorAll('.notation-staff-label')].map(node => ({partId: node.dataset.partId, staffId: node.dataset.staffId, text: node.textContent.trim()})),
      history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent,
      status: document.querySelector('.editor-status').textContent
    }
  }).toString() + ')()')
  fs.writeFileSync(path.join(mvpArtifacts, 'part-view.json'), JSON.stringify(result, null, 2))
  const exportAriaLabels = result.exportButtons.map(button => button.ariaLabel)
  if (!result.exportVisible || !result.exportButtons.every(button => button.common) ||
      result.page.viewMode !== 'part' || result.page.partId !== 'viola' || result.page.margin !== '6' ||
      result.page.staffSize !== '90' || result.page.systemSpacing !== '90' || result.partTitle.text !== 'Viola' ||
      result.partTitle.partId !== 'viola' || result.partIds.join('|') !== 'viola' ||
      !result.staffLabels.every(label => label.partId === 'viola') ||
      !exportAriaLabels.includes('PDF 변환') || !exportAriaLabels.includes('MIDI 내보내기'))
    throw Error('Part view export state verification failed: ' + JSON.stringify(result))
  await clickStudioButton(window, '악보로 이동', null)
  fs.writeFileSync(path.join(mvpArtifacts, 'part-view.png'), (await window.webContents.capturePage()).toPNG())
  return result
}

async function verifyPartXmlExportRoundTrip(window) {
  // Only file I/O is supplied by the harness; App projection, serializer, parser
  // and renderer remain real. No score object is injected.
  const exported = await window.webContents.executeJavaScript('(' + (async () => {
    const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const history = () => [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent
    const beforeHistory = history()
    let request
    window.inC = {musicXml: {exportCopy: async input => {
      request = input
      return {fileName: input.suggestedName, filePath: '/headless/viola.musicxml'}
    }}}
    const button = document.querySelector('.studio-export-tools button[aria-label="MusicXML 내보내기"]')
    if (!button?.checkVisibility() || button.disabled) throw Error('Visible part XML export action required')
    button.focus(); button.click()
    const started = performance.now()
    while (!request) {
      if (performance.now() - started > 4000) throw Error('Part XML request missing')
      await wait()
    }
    await wait()
    const xml = new DOMParser().parseFromString(request.contents, 'application/xml')
    return {
      ...request, beforeHistory, afterHistory: history(),
      partNames: [...xml.querySelectorAll('score-part > part-name')].map(node => node.textContent),
      partCount: xml.querySelectorAll('score-partwise > part').length, noteCount: xml.querySelectorAll('note').length,
      parseError: Boolean(xml.querySelector('parsererror'))
    }
  }).toString() + ')()')
  if (exported.parseError || exported.partCount !== 1 || exported.partNames.join('|') !== 'Viola' ||
      exported.noteCount !== 8 || !exported.suggestedName.endsWith('-viola.musicxml') || exported.filePath ||
      exported.beforeHistory !== exported.afterHistory)
    throw Error('Selected part XML export failed: ' + JSON.stringify(exported))
  const artifact = path.join(mvpArtifacts, 'selected-viola.musicxml')
  fs.writeFileSync(artifact, exported.contents)
  const contents = fs.readFileSync(artifact, 'utf8')
  await window.webContents.executeJavaScript('(' + (({artifact, contents}) => {
    window.inC.musicXml.open = async () => ({filePath: artifact, fileName: 'selected-viola.musicxml', contents})
    window.inC.recentMusicXml = {add: async () => []}
    window.inC.autosave = {clear: async () => {}, write: async () => {}}
  }).toString() + ')(' + JSON.stringify({artifact, contents}) + ')')
  await openStudioCommand(window, '파일', 'MusicXML 가져오기')
  await openStudioCommand(window, '형식', '악보 설정')
  await chooseStudioValue(window, '악보 보기', 'part', '.studio-score-view')
  const reopened = await window.webContents.executeJavaScript('(' + (async () => {
    const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const control = [...document.querySelectorAll('.studio-score-view [role="combobox"]')].find(node => node.labels?.[0]?.textContent.trim() === '파트보 선택')
    if (!control?.checkVisibility() || control.disabled) throw Error('Visible reopened part selector required')
    control.focus(); control.click(); await wait()
    const list = document.getElementById(control.getAttribute('aria-controls'))
    if (!list?.checkVisibility()) throw Error('Visible reopened part choices required')
    const parts = [...list.querySelectorAll('[role="option"]')].map(node => node.textContent.trim())
    control.click(); await wait()
    return {parts, events: document.querySelectorAll('.notation-event').length}
  }).toString() + ')()')
  if (reopened.parts.join('|') !== 'Viola' || reopened.events !== 8)
    throw Error('Part XML renderer reopen failed: ' + JSON.stringify(reopened))
  fs.writeFileSync(path.join(mvpArtifacts, 'part-xml-round-trip.json'), JSON.stringify({...exported, contents: undefined, reopened}, null, 2))
  return {artifact, partNames: exported.partNames, noteCount: exported.noteCount, beforeHistory: exported.beforeHistory, afterHistory: exported.afterHistory, reopened}
}

async function verifyPlaybackMixerHeadlessState(window) {
  window.setContentSize(1280, 900)
  await loadFixture(window)
  await openStudioCommand(window, '도구', '재생 도구')
  const result = await window.webContents.executeJavaScript('(' + (async () => {
    const wait = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const mixer = document.querySelector('.studio-part-mixer')
    if (!mixer?.checkVisibility()) throw Error('Visible mixer required')
    const volume = [...mixer.querySelectorAll('input[type="range"]')].find(node => node.labels?.[0]?.textContent.trim().startsWith('Melody 볼륨'))
    if (!volume?.checkVisibility() || volume.disabled || !volume.closest('.dd-field')) throw Error('Visible public volume slider required')
    const documentState = () => ({
      selected: [...document.querySelectorAll('.notation-event.is-selected')].map(node => node.dataset.eventId),
      events: document.querySelectorAll('.notation-event').length,
      history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent
    })
    const before = documentState()
    volume.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(volume, '75')
    volume.dispatchEvent(new Event('input', { bubbles: true }))
    volume.dispatchEvent(new Event('change', { bubbles: true }))
    await wait()
    const afterVolume = documentState()
    const play = document.querySelector('.studio-playback button[aria-label="재생"]')
    if (!play?.checkVisibility() || play.disabled) throw Error('Visible transport play action required')
    play.click(); await new Promise(resolve => setTimeout(resolve, 600))
    const activity = document.querySelector('[aria-label="Melody 재생 상태"]'), row = activity?.closest('.studio-part-mixer__row')
    const value = {
      activity: activity?.textContent.trim(), active: row?.getAttribute('data-playback-active'),
      mixerStorage: JSON.parse(localStorage.getItem('chromatics.part-mixer.v1') ?? '{}'),
      volumeText: volume.labels?.[0]?.querySelector('.dd-numeric')?.textContent.trim(),
      accessibleValue: volume.getAttribute('aria-valuetext'),
      min: volume.min, max: volume.max, step: volume.step, mixerVisible: mixer.checkVisibility(),
      transportVisible: document.querySelector('.studio-playback').checkVisibility()
    }
    const stop = document.querySelector('.studio-playback button[aria-label="정지"]')
    if (!stop.disabled) stop.click()
    await wait()
    const afterStop = documentState()
    const toggle = document.querySelector('.studio-playback button[aria-label="믹서 표시"]')
    toggle.click(); await wait()
    const hidden = !mixer.checkVisibility()
    toggle.click(); await wait()
    return {
      ...value, before, afterVolume, afterStop, after: documentState(), hiddenAndReopened: hidden && mixer.checkVisibility(),
      reopenedVolume: volume.getAttribute('aria-valuetext'),
      reopenedStoredVolume: JSON.parse(localStorage.getItem('chromatics.part-mixer.v1') ?? '{}')['part-1']?.volume
    }
  }).toString() + ')()')
  fs.writeFileSync(path.join(mvpArtifacts, 'mixer.json'), JSON.stringify(result, null, 2))
  if (!result.mixerVisible || !result.transportVisible || result.volumeText !== '75%' || result.accessibleValue !== '75%' ||
      result.mixerStorage['part-1']?.volume !== 0.75 || result.min !== '0' || result.max !== '150' || result.step !== '5' ||
      !['재생 중', '대기'].includes(result.activity) || !['true', 'false'].includes(result.active) ||
      !result.hiddenAndReopened || result.reopenedVolume !== '75%' || result.reopenedStoredVolume !== 0.75 ||
      JSON.stringify(result.before) !== JSON.stringify(result.afterVolume) ||
      JSON.stringify(result.afterStop) !== JSON.stringify(result.after) ||
      result.before.events !== result.after.events || result.before.history !== result.after.history)
    throw Error('Playback mixer state verification failed: ' + JSON.stringify(result))
  // Playback follows score selection and may scroll the independent panel away.
  // Capture the real menu return, not an offscreen checkVisibility() claim.
  await openStudioCommand(window, '도구', '재생 도구')
  const viewport = await window.webContents.executeJavaScript('(' + (() => {
    const panel = document.querySelector('.studio-part-mixer'), b = panel.getBoundingClientRect()
    const footer = document.querySelector('.studio-status').getBoundingClientRect()
    return {panel: b.toJSON(), activeInside: panel.contains(document.activeElement), viewport: [innerWidth, innerHeight], limit: Math.min(innerHeight, footer.top)}
  }).toString() + ')()')
  fs.writeFileSync(path.join(mvpArtifacts, 'mixer-viewport.json'), JSON.stringify(viewport, null, 2))
  fs.writeFileSync(path.join(mvpArtifacts, 'mixer.png'), (await window.webContents.capturePage()).toPNG())
  return {...result, viewport}
}

async function verifyNewScoreWizard(window) {
  await loadFixture(window)

  await openStudioCommand(window, '파일', '새 악보 만들기')
  const choices = []
  for (const [label, value] of [['제목', '새 출발'], ['작곡가', '김작곡'], ['마디 수', '3'], ['빠르기', '96']]) {
    await window.webContents.executeJavaScript('(' + (async ({label, value}) => {
      const input = [...document.querySelectorAll('.studio-new-score-form input')].find(node =>
        node.labels?.[0]?.textContent.trim() === label)
      if (!input || !input.checkVisibility() || input.disabled) throw Error('Visible enabled wizard Input required: ' + label)
      input.focus()
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new Event('input', {bubbles: true}))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      input.blur()
      if (input.value !== value) throw Error('Wizard input did not retain draft: ' + label)
    }).toString() + ')(' + JSON.stringify({label, value}) + ')')
  }
  for (const [label, value] of [['조표', 'd-major'], ['박자표', '3-4']]) {
    choices.push(await chooseStudioValue(window, label, value, '.studio-new-score-form'))
  }
  const wizardImage = path.join(mvpArtifacts, 'new-score-wizard-' + window.getContentSize()[0] + '.png')
  fs.writeFileSync(wizardImage, (await window.webContents.capturePage()).toPNG())
  await clickStudioButton(window, '만들기', '.studio-new-score-form')
  await new Promise(resolve => setTimeout(resolve, 150))
  await openStudioCommand(window, '형식', '악보 설정')

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      const selectedMeasure = selectedEvent
        ? selectedEvent.match(/^measure-(\\d+)/)?.[1]
        : document
            .querySelector('.notation-measure.is-selected')
            ?.getAttribute('data-measure-id')
            ?.match(/^measure-(\\d+)/)?.[1]
      const selectedRest = document.querySelector(
        '.notation-event[data-event-id="measure-1-full-measure-rest"]'
      )
      const selectedMeasureElement = document.querySelector(
        '.notation-measure[data-measure-id="measure-1"]'
      )
      const svg = document.querySelector('.notation-preview svg')
      const svgBox = svg?.getBoundingClientRect()
      const restBox = selectedRest?.getBoundingClientRect()
      const svgWidth = Number(svg?.getAttribute('width'))
      const renderedSvgWidth = svgBox?.width ?? 0
      const svgScale =
        Number.isFinite(svgWidth) && svgWidth > 0
          ? renderedSvgWidth / svgWidth
          : 1
      const noteStartX = Number(
        selectedMeasureElement?.getAttribute('data-full-measure-rest-start-x')
      )
      const noteEndX = Number(
        selectedMeasureElement?.getAttribute('data-full-measure-rest-end-x')
      )
      const fullRestCenterDelta =
        restBox &&
        svgBox &&
        Number.isFinite(noteStartX) &&
        Number.isFinite(noteEndX)
          ? Math.abs(
              restBox.x -
                svgBox.x +
                restBox.width / 2 -
                ((noteStartX + noteEndX) / 2) * svgScale
            )
          : undefined

      return {
        title: document
          .querySelector('button[aria-label="악보 제목 수정"]')
          ?.textContent?.trim(),
        composer: document
          .querySelector('button[aria-label="작곡가 수정"]')
          ?.textContent?.trim(),
        measureCount: document.querySelectorAll('.notation-measure').length,
        eventCount: document.querySelectorAll('.notation-event').length,
        selectedEvent,
        selectedMeasure,
        history: statusValues.find(value => value?.endsWith('회 수정')),
        tempo: Number(document.querySelector('.studio-tempo-tools input[type="range"]')?.value),
        tempoValueText: document.querySelector('.studio-tempo-tools input[type="range"]')?.getAttribute('aria-valuetext'),
        tempoVisible: document.querySelector('.studio-tempo-tools input[type="range"]')?.checkVisibility(),
        tempoPreview: document.querySelector('.studio-tempo-tools output')?.textContent?.trim(),
        fullRestCenterDelta,
        status: statusValues.at(-1),
        dialogOpen: Boolean(
          document.querySelector('form[aria-label="새 악보 만들기"]')
        )
      }
    })()
  `)

  if (
    result.title !== '새 출발' ||
    result.composer !== '김작곡' ||
    result.measureCount !== 3 ||
    result.eventCount !== 3 ||
    result.selectedEvent !== 'measure-1-full-measure-rest' ||
    result.selectedMeasure !== '1' ||
    result.history !== '0회 수정' ||
    result.tempo !== 96 ||
    result.tempoValueText !== '96 BPM' ||
    !result.tempoVisible ||
    result.tempoPreview !== '♩ = 96' ||
    typeof result.fullRestCenterDelta !== 'number' ||
    result.fullRestCenterDelta > 12 ||
    result.status !== '새 악보를 만들었습니다.' ||
    result.dialogOpen
  ) {
    throw new Error(
      `New score wizard verification failed: ${JSON.stringify(result)}`
    )
  }

  await clickStudioButton(window, '악보로 이동', null)
  // A hidden BrowserWindow can return layout coordinates before compositor
  // capture catches up with the document scroll. Keep that QA boundary explicit.
  await new Promise(resolve => setTimeout(resolve, 300))
  const returnedToScore = await window.webContents.executeJavaScript(`(() => {
    const selected = document.querySelector('.notation-event.is-selected')
    const rect = selected?.getBoundingClientRect()
    const footer = document.querySelector('.studio-status').getBoundingClientRect()
    return { focused: document.activeElement === selected, event: selected?.dataset.eventId,
      top: rect?.top, bottom: rect?.bottom, footerTop: footer.top, visible: selected?.checkVisibility() }
  })()`)
  if (!returnedToScore.visible || !returnedToScore.focused || returnedToScore.event !== result.selectedEvent ||
      returnedToScore.top < 0 || returnedToScore.bottom > returnedToScore.footerTop)
    throw Error('New score return target must be visible and focused: ' + JSON.stringify(returnedToScore))
  const screenshot = path.join(mvpArtifacts, 'new-score-created-' + window.getContentSize()[0] + '.png')
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
  return { ...result, choices, screenshot, wizardImage, returnedToScore }
}

async function verifyGrandStaffPreview(window) {
  // score-setup.create-grand-staff-score
  // layout.multi-staff-notation-object-anchoring
  await loadFixture(window)

  await openStudioCommand(window, '파일', '새 악보 만들기')
  await fillStudioInput(window, '제목', 'Grand Staff Smoke', '.studio-new-score-form')
  await fillStudioInput(window, '마디 수', '3', '.studio-new-score-form')
  await chooseStudioValue(window, '악보 구성', 'piano-grand-staff', '.studio-new-score-form')
  await clickStudioButton(window, '만들기', '.studio-new-score-form')
  await new Promise(resolve => setTimeout(resolve, 300))

  const result = await window.webContents.executeJavaScript(`
    (() => {
      const staffLabels = [
        ...document.querySelectorAll('.notation-staff-label')
      ].map((label) => ({
        text: label.textContent?.trim(),
        partId: label.getAttribute('data-part-id'),
        staffId: label.getAttribute('data-staff-id'),
        y: Number(label.getAttribute('y'))
      }))
      const passiveEvents = [
        ...document.querySelectorAll('.notation-event--passive-staff')
      ].map((event) => ({
        eventId: event.getAttribute('data-event-id'),
        partId: event.getAttribute('data-part-id'),
        staffId: event.getAttribute('data-staff-id')
      }))
      const svg = document.querySelector('.notation-preview svg')

      return {
        title: document
          .querySelector('button[aria-label="악보 제목 수정"]')
          ?.textContent?.trim(),
        measureCount: document.querySelectorAll('.notation-measure').length,
        eventCount: document.querySelectorAll('.notation-event').length,
        passiveEventCount: passiveEvents.length,
        lowerStaffEventCount: passiveEvents.filter(
          (event) => event.partId === 'part-1' && event.staffId === 'staff-2'
        ).length,
        staffLabels,
        svgHeight: Number(svg?.getAttribute('height')),
        status: [...document.querySelectorAll('.editor-status span')]
          .map((value) => value.textContent?.trim())
          .at(-1)
      }
    })()
  `)

  const labelTexts = result.staffLabels.map((label) => label.text)
  const staffKeys = result.staffLabels.map(
    (label) => `${label.partId}:${label.staffId}`
  )

  if (
    result.title !== 'Grand Staff Smoke' ||
    result.measureCount !== 3 ||
    result.eventCount !== 6 ||
    result.passiveEventCount !== 3 ||
    result.lowerStaffEventCount !== 3 ||
    !labelTexts.includes('Piano') ||
    !labelTexts.includes('Staff 2') ||
    !staffKeys.includes('part-1:staff-1') ||
    !staffKeys.includes('part-1:staff-2') ||
    result.svgHeight < 250 ||
    result.status !== '새 악보를 만들었습니다.'
  ) {
    throw new Error(
      `Grand staff preview verification failed: ${JSON.stringify(result)}`
    )
  }

  await executeMetadataStep(
    window,
    'select grand staff lower staff event',
    `
    const lowerStaffEvent = document.querySelector(
      '.notation-event--passive-staff[data-part-id="part-1"][data-staff-id="staff-2"]'
    )

    if (!lowerStaffEvent) {
      throw new Error('Lower staff event not found.')
    }

    lowerStaffEvent.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  `
  )
  await new Promise((resolve) => setTimeout(resolve, 200))

  const selectedLowerStaff = await window.webContents.executeJavaScript(`
    (() => {
      const selected = document.querySelector('.notation-event.is-selected')

      return {
        eventId: selected?.getAttribute('data-event-id'),
        partId: selected?.getAttribute('data-part-id'),
        staffId: selected?.getAttribute('data-staff-id')
      }
    })()
  `)

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyN',
        key: 'n'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 150))

  await window.webContents.executeJavaScript(`
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'KeyC',
        key: 'c'
      })
    )
  `)
  await new Promise((resolve) => setTimeout(resolve, 300))

  const lowerStaffInput = await window.webContents.executeJavaScript(`
    (() => {
      const selected = document.querySelector('.notation-event.is-selected')
      const lowerStaffEvents = [
        ...document.querySelectorAll(
          '.notation-event[data-part-id="part-1"][data-staff-id="staff-2"]'
        )
      ]
      const selectedEventId = selected?.getAttribute('data-event-id')

      return {
        editCount: [...document.querySelectorAll('.editor-status span')]
          .find((span) => span.textContent?.endsWith('회 수정'))
          ?.textContent?.trim(),
        eventCount: document.querySelectorAll('.notation-event').length,
        lowerStaffEventCount: lowerStaffEvents.length,
        selectedEventId,
        selectedPartId: selected?.getAttribute('data-part-id'),
        selectedStaffId: selected?.getAttribute('data-staff-id'),
        selectedIsLowerStaff: lowerStaffEvents.some(
          (event) => event.getAttribute('data-event-id') === selectedEventId
        ),
        status: [...document.querySelectorAll('.editor-status span')]
          .map((value) => value.textContent?.trim())
          .at(-1)
      }
    })()
  `)

  if (
    selectedLowerStaff.partId !== 'part-1' ||
    selectedLowerStaff.staffId !== 'staff-2' ||
    lowerStaffInput.editCount !== '1회 수정' ||
    lowerStaffInput.eventCount < 6 ||
    lowerStaffInput.lowerStaffEventCount < 3 ||
    lowerStaffInput.selectedPartId !== 'part-1' ||
    lowerStaffInput.selectedStaffId !== 'staff-2' ||
    !lowerStaffInput.selectedIsLowerStaff
  ) {
    throw new Error(
      `Grand staff lower staff input verification failed: ${JSON.stringify({
        selectedLowerStaff,
        lowerStaffInput
      })}`
    )
  }

  await openStudioCommand(window, '도구', '선택 속성 열기')
  await fillStudioInput(window, '선택 요약 보표 글자', 'lower dolce', '.studio-selected-properties')
  await chooseStudioValue(window, '입력 마디 셈여림', 'mf', '.studio-selected-properties')
  await new Promise(resolve => setTimeout(resolve, 200))

  const readAnnotations = () => window.webContents.executeJavaScript(`
    (() => {
      const lowerMeasureId = 'part-1-staff-2-measure-1'
      const lowerStaffLabelY = Number(
        document
          .querySelector('.notation-staff-label[data-staff-id="staff-2"]')
          ?.getAttribute('y')
      )
      const read = (selector) => {
        const element = document.querySelector(selector)

        return element
          ? {
              measureId: element.getAttribute('data-measure-id'),
              text: element.textContent?.trim(),
              y: Number(element.getAttribute('y'))
            }
          : undefined
      }

      return {
        history: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent?.endsWith('회 수정'))?.textContent.trim(),
        selected: document.querySelector('.notation-event.is-selected')?.getAttribute('data-event-id'),
        eventCount: document.querySelectorAll('.notation-event').length,
        upperAnnotations: document.querySelectorAll('.notation-staff-text:not([data-measure-id="' + lowerMeasureId + '"]), .notation-dynamic-mark:not([data-measure-id="' + lowerMeasureId + '"])').length,
        dynamic: read(
          '.notation-dynamic-mark[data-measure-id="' + lowerMeasureId + '"]'
        ),
        lowerStaffLabelY,
        staffText: read(
          '.notation-staff-text[data-measure-id="' + lowerMeasureId + '"]'
        )
      }
    })()
  `)
  const lowerStaffAnnotations = await readAnnotations()

  if (
    lowerStaffAnnotations.history !== '3회 수정' ||
    lowerStaffAnnotations.upperAnnotations !== 0 ||
    lowerStaffAnnotations.staffText?.text !== 'lower dolce' ||
    lowerStaffAnnotations.dynamic?.text !== 'mf' ||
    !lowerStaffAnnotations.staffText ||
    !lowerStaffAnnotations.dynamic ||
    lowerStaffAnnotations.staffText.y <= 100 ||
    lowerStaffAnnotations.dynamic.y <= lowerStaffAnnotations.lowerStaffLabelY
  ) {
    throw new Error(
      `Grand staff annotation anchoring verification failed: ${JSON.stringify(lowerStaffAnnotations)}`
    )
  }

  const annotationHistory = []
  for (const command of ['실행 취소', '실행 취소', '다시 실행', '다시 실행']) {
    await openStudioCommand(window, '편집', command)
    annotationHistory.push(await readAnnotations())
  }
  if (annotationHistory.map(row => row.history).join('|') !== '2회 수정|1회 수정|2회 수정|3회 수정' ||
      annotationHistory[0].dynamic || annotationHistory[0].staffText?.text !== 'lower dolce' ||
      annotationHistory[1].staffText || annotationHistory[1].dynamic ||
      annotationHistory[2].dynamic || annotationHistory[2].staffText?.text !== 'lower dolce' ||
      annotationHistory[3].dynamic?.text !== 'mf' || annotationHistory[3].staffText?.text !== 'lower dolce' ||
      !annotationHistory.every(row => row.selected === lowerStaffInput.selectedEventId && row.eventCount === 7 && row.upperAnnotations === 0))
    throw Error('Grand staff annotation undo/redo contract failed: ' + JSON.stringify(annotationHistory))
  await clickStudioButton(window, '악보로 이동', null)
  await new Promise(resolve => setTimeout(resolve, 300))
  const screenshot = path.join(mvpArtifacts, 'grand-staff-' + window.getContentSize()[0] + '.png')
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())

  return {
    ...result,
    selectedLowerStaff,
    lowerStaffInput,
    lowerStaffAnnotations,
    annotationHistory,
    screenshot
  }
}

async function verifyKeySignatureControl(window) {
  return verifySignatureControl(window, {label: '조표', measure: 'measure-2', value: 'c-major',
    status: '선택한 마디부터 조표를 바꿨습니다.'})
}

async function verifyTimeSignatureControl(window) {
  return verifySignatureControl(window, {label: '박자표', measure: 'measure-3', value: '2-4',
    status: '선택한 마디의 박자표를 바꿨습니다.', events: 32})
}

async function verifySignatureControl(window, expected) {
  await loadFixture(window)
  await window.webContents.executeJavaScript('(' + ((measure) => {
    const target = document.querySelector('.notation-measure[data-measure-id="' + measure + '"]')
    if (!target) throw Error('Measure target required: ' + measure)
    target.dispatchEvent(new MouseEvent('click', {bubbles: true}))
  }).toString() + ')(' + JSON.stringify(expected.measure) + ')')
  await openStudioCommand(window, '형식', '악보 설정')
  const read = async () => {
    const state = await window.webContents.executeJavaScript('(' + (() => {
      const status = [...document.querySelectorAll('.editor-status span')].map(node => node.textContent.trim())
      return { editCount: status.find(value => value.endsWith('회 수정')), status: status.at(-1),
        selectedMeasure: document.querySelector('.notation-measure.is-selected')?.getAttribute('data-measure-id'),
        events: document.querySelectorAll('.notation-event').length,
        measures: document.querySelectorAll('.notation-measure').length }
    }).toString() + ')()')
    return {...state, ...await readStudioValue(window, expected.label, '.studio-measure-tools')}
  }
  const before = await read()
  const choice = await chooseStudioValue(window, expected.label, expected.value, '.studio-measure-tools')
  const changed = await read()
  if (before.editCount !== '0회 수정' || changed.editCount !== '1회 수정' ||
      changed.selectedMeasure !== expected.measure || changed.status !== expected.status || changed.value !== expected.value ||
      (expected.events !== undefined && changed.events !== expected.events))
    throw Error('Signature command contract failed: ' + JSON.stringify({expected, before, changed}))
  const history = []
  for (const command of ['실행 취소', '다시 실행']) {
    await openStudioCommand(window, '편집', command)
    history.push(await read())
  }
  if (history[0].editCount !== '0회 수정' || history[0].value !== before.value || history[0].events !== before.events ||
      history[1].editCount !== '1회 수정' || history[1].value !== changed.value || history[1].events !== changed.events ||
      !history.every(row => row.selectedMeasure === expected.measure && row.measures === before.measures))
    throw Error('Signature undo/redo contract failed: ' + JSON.stringify(history))
  await clickStudioButton(window, '악보로 이동', null)
  await new Promise(resolve => setTimeout(resolve, 300))
  const screenshot = path.join(mvpArtifacts, 'signature-' + expected.value + '-' + window.getContentSize()[0] + '.png')
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG())
  return {before, changed, history, choice, screenshot}
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
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      const selectedMeasure = document
        .querySelector('.notation-measure.is-selected')
        ?.getAttribute('data-measure-id')
        ?.match(/^measure-(\\d+)/)?.[1]

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        eventCount: document.querySelectorAll('.notation-event').length,
        measureCount: document.querySelectorAll('.notation-measure').length,
        selectedEvent: selectedEvent ?? '—',
        selectedMeasure,
        selectedType: selectedMeasure ? '마디' : '이벤트',
        status: statusValues.at(-1)
      }
    })()
  `)

  const deletionHistory = []
  for (const command of ['실행 취소', '다시 실행']) {
    await openStudioCommand(window, '편집', command)
    deletionHistory.push(await window.webContents.executeJavaScript(`(() => ({
      edits: [...document.querySelectorAll('.editor-status span')].find(node => node.textContent.endsWith('회 수정'))?.textContent.trim(),
      events: document.querySelectorAll('.notation-event').length,
      measures: document.querySelectorAll('.notation-measure').length,
      selected: document.querySelector('.notation-measure.is-selected')?.getAttribute('data-measure-id')
    }))()`))
  }
  if (deletionHistory[0].edits !== '0회 수정' || deletionHistory[0].events !== 33 || deletionHistory[0].measures !== 8 ||
      deletionHistory[0].selected !== 'measure-3' || deletionHistory[1].edits !== '1회 수정' ||
      deletionHistory[1].events !== 30 || deletionHistory[1].measures !== 7 || deletionHistory[1].selected !== 'measure-4')
    throw Error('Measure deletion undo/redo contract failed: ' + JSON.stringify(deletionHistory))

  await loadFixture(window)
  await openStudioCommand(window, '파일', '새 악보 만들기')
  await fillStudioInput(window, '마디 수', '1', '.studio-new-score-form')
  await clickStudioButton(window, '만들기', '.studio-new-score-form')
  await openStudioCommand(window, '형식', '악보 설정')
  await clickStudioButton(window, '마디 삭제', '.studio-measure-tools')

  const finalMeasure = await window.webContents.executeJavaScript(`
    (() => {
      const statusValues = [
        ...document.querySelectorAll('.editor-status span')
      ].map((value) => value.textContent?.trim())

      return {
        editCount: statusValues.find((value) => value?.endsWith('회 수정')),
        measureCount: document.querySelectorAll('.notation-measure').length,
        status: statusValues.at(-1)
      }
    })()
  `)

  if (
    deleted.editCount !== '1회 수정' ||
    deleted.eventCount !== 30 ||
    deleted.measureCount !== 7 ||
    deleted.selectedEvent !== '—' ||
    deleted.selectedMeasure !== '4' ||
    deleted.selectedType !== '마디' ||
    deleted.status !== '마디를 삭제했습니다.' ||
    finalMeasure.editCount !== '0회 수정' ||
    finalMeasure.measureCount !== 1 ||
    finalMeasure.status !== '마지막 남은 마디는 삭제할 수 없습니다.'
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
    finalMeasure,
    deletionHistory
  }
}

async function editMetadataField(window, field, value, key) {
  const entry = await openMetadataField(window, field)
  const label = field === 'title' ? '악보 제목' : '작곡가'

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
  const returnFocus = await window.webContents.executeJavaScript('document.activeElement?.getAttribute("aria-label")')
  if (returnFocus !== '악보 정보') throw Error('Metadata edit must return focus to common entry: ' + returnFocus)
  return {...entry, returnFocus, key}
}

async function openMetadataField(window, field) {
  const label = field === 'title' ? '악보 제목 편집' : '작곡가 편집'
  await openStudioCommand(window, '형식', '악보 정보 편집')
  const entry = await window.webContents.executeJavaScript('(' + (label => {
    const button = document.querySelector('button[aria-label="' + label + '"]')
    const rect = button?.getBoundingClientRect()
    return {label, common: button?.classList.contains('dd-button'), visible:button?.checkVisibility(),
      enabled:button && !button.disabled, width:rect?.width, height:rect?.height}
  }).toString() + ')(' + JSON.stringify(label) + ')')
  if (!entry.common || !entry.visible || !entry.enabled || entry.width < 48 || entry.height < 48)
    throw Error('Metadata editing requires a common 48px action: ' + JSON.stringify(entry))
  await clickStudioButton(window, label, null)
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
  return entry
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
        (rightEdge) => Math.abs(rightEdge - (svgWidth - 8)) < 0.01
      )
      const selectedEvent = document
        .querySelector('.notation-event.is-selected')
        ?.getAttribute('data-event-id')
      return {
        width: window.innerWidth,
        measureCount: measures.length,
        eventCount: events.length,
        systemCount: systems.size,
        svgWidth,
        systemRightEdges,
        systemsFillWidth,
        eventMappingIsValid,
        selectedInspectorEvent: selectedEvent,
        tupletCount: document.querySelectorAll('.vf-tuplet').length,
        tieCount: document.querySelectorAll('.vf-stavetie').length,
        toolbarOverflow: [...document.querySelectorAll('.studio-application-menu,.studio-command-bars,.studio-note-toolbar,.studio-workspace-tools,.studio-status')]
          .filter(node => node.checkVisibility()).some(node => node.scrollWidth > node.clientWidth)
      }
    })()
  `)
}

function assertMvpInspection(result) {
  if (result.measureCount !== 8 || result.eventCount !== 33 || !result.eventMappingIsValid || !result.systemsFillWidth ||
      result.selectedInspectorEvent !== 'm4-g4' || result.tupletCount !== 1 || result.tieCount < 1 || result.toolbarOverflow)
    throw Error('MVP renderer verification failed: ' + JSON.stringify(result))
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

  if (fileActionsOnly || workspaceTasksOnly || propertiesDockOnly || partIoOnly || mixerOnly || newScoreOnly || grandStaffOnly || signaturesOnly || measureDeleteOnly || keyboardOnly || metadataOnly || engravingOnly) {
    const deadline = setTimeout(() => { console.error('Scoped MVP verification deadline'); app.exit(1) }, workspaceTasksOnly || propertiesDockOnly || partIoOnly || keyboardOnly || engravingOnly ? 60000 : 30000)
    try {
      let result
      if (engravingOnly) {
        result = {}
        for (const [label, verify] of [['beams',verifyBeamRendering],['ties',verifyTieEditing],['outOfStaffNotes',verifyOutOfStaffNotes],['releaseScenarioBounds',verifyReleaseScenarioBounds]]) {
          console.error('Engraving step:', label)
          result[label] = await verify(window)
          fs.writeFileSync(path.join(mvpArtifacts, 'engraving-steps.json'), JSON.stringify(result, null, 2))
        }
        await loadFixture(window)
        result.desktop = await inspect(window, 1400, path.join(mvpArtifacts, 'mvp-desktop.png'))
        result.minimum = await inspect(window, 1100, path.join(mvpArtifacts, 'mvp-minimum.png'))
        result.compact = await inspect(window, 960, path.join(mvpArtifacts, 'mvp-compact.png'))
        for (const inspection of [result.desktop, result.minimum, result.compact]) assertMvpInspection(inspection)
      }
      else if (keyboardOnly) { await loadFixture(window); result = {keyboard: await verifyKeyboardRouting(window)} }
      else if (newScoreOnly || grandStaffOnly || signaturesOnly || measureDeleteOnly || metadataOnly) {
        const cases = []
        for (const width of [1400, 960]) {
          window.setContentSize(width, 900)
          if (metadataOnly) cases.push({width, ...await verifyMetadataEditing(window)})
          else if (measureDeleteOnly) cases.push({width, ...await verifyMeasureDeletion(window)})
          else if (signaturesOnly) cases.push({width, keySignature: await verifyKeySignatureControl(window), timeSignature: await verifyTimeSignatureControl(window)})
          else cases.push({width, ...await (grandStaffOnly ? verifyGrandStaffPreview(window) : verifyNewScoreWizard(window))})
        }
        result = metadataOnly ? {metadata: cases} : measureDeleteOnly ? {measureDeletion: cases} : signaturesOnly ? {signatures: cases} : grandStaffOnly ? {grandStaff: cases} : {newScore: cases}
      } else result = mixerOnly ? { playbackMixerHeadlessState: await verifyPlaybackMixerHeadlessState(window) } : partIoOnly ? { partViewHeadlessExportState: await verifyPartViewHeadlessExportState(window), partXmlExportRoundTrip: await verifyPartXmlExportRoundTrip(window) } : propertiesDockOnly ? { propertiesDockEditing: await verifyPropertiesDockEditing(window) } : workspaceTasksOnly ? { compactToolbarModes: await verifyCompactToolbarModes(window), commercialHeadlessViewports: await verifyCommercialHeadlessViewports(window) } : { fileActions: await verifyFileActions(window) }
      console.log(JSON.stringify({ ...result, scope: 'Owned headless renderer/menu/public controls;not OS dialogs or native keyboard' }, null, 2))
    } finally {
      clearTimeout(deadline)
      window.destroy()
      app.quit()
    }
    return
  }

  const overallDeadline = setTimeout(() => { console.error('Full MVP verification deadline'); app.exit(1) }, 120000)
  overallDeadline.unref()
  await loadFixture(window)
  const keyboard = await verifyKeyboardRouting(window)
  const fileActions = await verifyFileActions(window)
  const compactToolbarModes = await verifyCompactToolbarModes(window)
  const commercialHeadlessViewports =
    await verifyCommercialHeadlessViewports(window)
  const propertiesDockEditing = await verifyPropertiesDockEditing(window)
  const partViewHeadlessExportState =
    await verifyPartViewHeadlessExportState(window)
  const partXmlExportRoundTrip = await verifyPartXmlExportRoundTrip(window)
  const playbackMixerHeadlessState =
    await verifyPlaybackMixerHeadlessState(window)
  const newScore = await verifyNewScoreWizard(window)
  const grandStaffPreview = await verifyGrandStaffPreview(window)
  const keySignature = await verifyKeySignatureControl(window)
  const timeSignature = await verifyTimeSignatureControl(window)
  const measureDeletion = await verifyMeasureDeletion(window)
  const metadata = await verifyMetadataEditing(window)
  const beams = await verifyBeamRendering(window)
  const ties = await verifyTieEditing(window)
  const outOfStaffNotes = await verifyOutOfStaffNotes(window)
  const releaseScenarioBounds = await verifyReleaseScenarioBounds(window)
  await loadFixture(window)

  const desktop = await inspect(
    window,
    1400,
    path.join(mvpArtifacts, 'in-c-mvp-desktop.png')
  )
  const minimum = await inspect(
    window,
    1100,
    path.join(mvpArtifacts, 'in-c-mvp-minimum.png')
  )
  const results = [desktop, minimum]

  for (const result of results) {
    assertMvpInspection(result)
  }

  console.log(
    JSON.stringify(
      {
        keyboard,
        beams,
        ties,
        fileActions,
        compactToolbarModes,
        commercialHeadlessViewports,
        propertiesDockEditing,
        partViewHeadlessExportState,
        partXmlExportRoundTrip,
        playbackMixerHeadlessState,
        newScore,
        grandStaffPreview,
        keySignature,
        timeSignature,
        measureDeletion,
        metadata,
        outOfStaffNotes,
        releaseScenarioBounds,
        desktop,
        minimum
      },
      null,
      2
    )
  )
  clearTimeout(overallDeadline)
  window.close()
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
