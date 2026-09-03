import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

const openMusicXmlChannel = 'musicxml:open'
const saveMusicXmlChannel = 'musicxml:save'
const savePdfChannel = 'pdf:save'
const saveMidiChannel = 'midi:save'
const readAutosaveChannel = 'autosave:read'
const writeAutosaveChannel = 'autosave:write'
const clearAutosaveChannel = 'autosave:clear'
const listRecentMusicXmlChannel = 'recent-musicxml:list'
const addRecentMusicXmlChannel = 'recent-musicxml:add'
const openRecentMusicXmlChannel = 'recent-musicxml:open'
const removeRecentMusicXmlChannel = 'recent-musicxml:remove'
const getConcertPostersChannel = 'promotions:get-concert-posters'
const productionConcertPostersApiUrl =
  'https://in-c.mannlab.app/api/concert-posters.json'
const isSmokeTest = process.argv.includes('--smoke-test')

interface AutosaveSnapshot {
  score: unknown
  metadata: {
    title: string
    updatedAt: string
    version: string
  }
}

interface RecentMusicXmlFile {
  filePath: string
  fileName: string
  openedAt: string
}

function assertSmokeDirectSavePath(filePath: string, extension: string): void {
  if (!isSmokeTest) {
    throw new Error('Direct file path save is only available in smoke tests.')
  }

  const expectedPath = join(
    app.getPath('temp'),
    `in-c-packaged-smoke-${process.pid}.${extension}`
  )

  if (filePath !== expectedPath) {
    throw new Error('Smoke test direct save path is outside the allowed target.')
  }
}

function validateSmokePdf(pdfData: Buffer): void {
  const pdfText = pdfData.toString('latin1')
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g) ?? []

  if (pdfData.subarray(0, 4).toString('utf8') !== '%PDF') {
    throw new Error('Packaged PDF smoke file does not have a PDF header.')
  }

  if (!pdfText.includes('%%EOF')) {
    throw new Error('Packaged PDF smoke file does not have an EOF marker.')
  }

  if (pageMatches.length < 1) {
    throw new Error('Packaged PDF smoke file does not contain a page object.')
  }

  if (!pdfText.includes('/MediaBox')) {
    throw new Error('Packaged PDF smoke file does not contain a page MediaBox.')
  }
}

function validateSmokeMidi(midiData: Buffer): void {
  if (midiData.subarray(0, 4).toString('utf8') !== 'MThd') {
    throw new Error('Packaged MIDI smoke file does not have a MIDI header.')
  }

  if (midiData.readUInt32BE(4) !== 6) {
    throw new Error('Packaged MIDI smoke file has an invalid header length.')
  }

  if (midiData.readUInt16BE(8) !== 1) {
    throw new Error('Packaged MIDI smoke file is not Standard MIDI File type 1.')
  }

  const trackCount = midiData.readUInt16BE(10)

  if (trackCount < 2) {
    throw new Error('Packaged MIDI smoke file does not contain tempo and note tracks.')
  }

  if (midiData.readUInt16BE(12) !== 480) {
    throw new Error('Packaged MIDI smoke file has an unexpected tick division.')
  }

  let offset = 14

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (midiData.subarray(offset, offset + 4).toString('utf8') !== 'MTrk') {
      throw new Error(`Packaged MIDI smoke track ${trackIndex + 1} is missing.`)
    }

    const trackLength = midiData.readUInt32BE(offset + 4)
    const trackStart = offset + 8
    const trackEnd = trackStart + trackLength
    const track = midiData.subarray(trackStart, trackEnd)

    if (track.subarray(-4).toString('hex') !== '00ff2f00') {
      throw new Error(
        `Packaged MIDI smoke track ${trackIndex + 1} is missing end-of-track.`
      )
    }

    offset = trackEnd
  }

  if (offset !== midiData.length) {
    throw new Error('Packaged MIDI smoke file has trailing or truncated data.')
  }
}

ipcMain.handle(openMusicXmlChannel, async () => {
  const result = await dialog.showOpenDialog({
    title: 'MusicXML 가져오기',
    properties: ['openFile'],
    filters: [
      {
        name: 'MusicXML',
        extensions: ['musicxml', 'xml']
      }
    ]
  })

  const filePath = result.filePaths[0]

  if (result.canceled || !filePath) {
    return null
  }

  return {
    filePath,
    fileName: basename(filePath),
    contents: await readFile(filePath, 'utf8')
  }
})

ipcMain.handle(
  saveMusicXmlChannel,
  async (
    _event,
    input: {
      filePath?: string
      suggestedName: string
      contents: string
    }
  ) => {
    if (input.filePath) {
      assertSmokeDirectSavePath(input.filePath, 'musicxml')
      await writeMusicXmlFile(input.filePath, input.contents)
      return {
        filePath: input.filePath,
        fileName: basename(input.filePath)
      }
    }

    const result = await dialog.showSaveDialog({
      title: 'MusicXML로 저장',
      defaultPath: input.suggestedName,
      filters: [
        {
          name: 'MusicXML',
          extensions: ['musicxml']
        }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    await writeMusicXmlFile(result.filePath, input.contents)
    return {
      filePath: result.filePath,
      fileName: basename(result.filePath)
    }
  }
)

ipcMain.handle(
  savePdfChannel,
  async (
    event,
    input: {
      filePath?: string
      suggestedName: string
    }
  ) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)

    if (!senderWindow) {
      throw new Error('PDF를 생성할 창을 찾을 수 없습니다.')
    }

    if (input.filePath) {
      assertSmokeDirectSavePath(input.filePath, 'pdf')
    }

    let outputPath = input.filePath

    if (!outputPath) {
      const result = await dialog.showSaveDialog({
        title: 'PDF 변환',
        defaultPath: input.suggestedName,
        filters: [
          {
            name: 'PDF',
            extensions: ['pdf']
          }
        ]
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      outputPath = result.filePath
    }

    const pdfData = await senderWindow.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: false
    })

    await writeFile(outputPath, pdfData)

    return {
      filePath: outputPath,
      fileName: basename(outputPath)
    }
  }
)

ipcMain.handle(
  saveMidiChannel,
  async (
    _event,
    input: {
      filePath?: string
      suggestedName: string
      contents: number[]
    }
  ) => {
    if (input.filePath) {
      assertSmokeDirectSavePath(input.filePath, 'mid')
      await writeFile(input.filePath, Buffer.from(input.contents))
      return {
        filePath: input.filePath,
        fileName: basename(input.filePath)
      }
    }

    const result = await dialog.showSaveDialog({
      title: 'MIDI 내보내기',
      defaultPath: input.suggestedName,
      filters: [
        {
          name: 'MIDI',
          extensions: ['mid', 'midi']
        }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    await writeFile(result.filePath, Buffer.from(input.contents))

    return {
      filePath: result.filePath,
      fileName: basename(result.filePath)
    }
  }
)

ipcMain.handle(readAutosaveChannel, async () => {
  try {
    return JSON.parse(await readFile(autosavePath(), 'utf8')) as AutosaveSnapshot
  } catch (error) {
    if (isMissingFileError(error)) {
      return null
    }

    throw error
  }
})

ipcMain.handle(
  writeAutosaveChannel,
  async (
    _event,
    input: {
      score: unknown
      title: string
    }
  ) => {
    const snapshot: AutosaveSnapshot = {
      score: input.score,
      metadata: {
        title: input.title,
        updatedAt: new Date().toISOString(),
        version: app.getVersion()
      }
    }

    await mkdir(autosaveDirectory(), { recursive: true })
    await writeFile(autosavePath(), JSON.stringify(snapshot, null, 2), 'utf8')

    return snapshot.metadata
  }
)

ipcMain.handle(clearAutosaveChannel, async () => {
  await rm(autosavePath(), { force: true })
})

ipcMain.handle(listRecentMusicXmlChannel, async () => readRecentMusicXmlFiles())

ipcMain.handle(
  addRecentMusicXmlChannel,
  async (
    _event,
    input: {
      filePath: string
      fileName: string
    }
  ) => addRecentMusicXmlFile(input)
)

ipcMain.handle(
  openRecentMusicXmlChannel,
  async (
    _event,
    input: {
      filePath: string
    }
  ) => {
    const recentFiles = await readRecentMusicXmlFiles()
    const recent = recentFiles.find((file) => file.filePath === input.filePath)
    const fileName = recent?.fileName ?? basename(input.filePath)

    try {
      return {
        filePath: input.filePath,
        fileName,
        contents: await readFile(input.filePath, 'utf8')
      }
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new Error(`최근 파일을 찾을 수 없습니다: ${fileName}`)
      }

      throw error
    }
  }
)

ipcMain.handle(
  removeRecentMusicXmlChannel,
  async (
    _event,
    input: {
      filePath: string
    }
  ) => removeRecentMusicXmlFile(input.filePath)
)

ipcMain.handle(getConcertPostersChannel, async () => {
  const apiUrls = getConcertPostersApiUrls()

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(apiUrl, { cache: 'no-store' })

      if (!response.ok) {
        continue
      }

      const payload = (await response.json()) as unknown

      if (payload !== null && typeof payload === 'object') {
        return {
          ...payload,
          sourceUrl: response.url || apiUrl
        }
      }
    } catch {
      // Try the next configured endpoint.
    }
  }

  return {
    posters: [],
    sourceUrl: apiUrls[0] ?? productionConcertPostersApiUrl
  }
})

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'in-C',
    show: false,
    backgroundColor: '#f6f3ec',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (!isSmokeTest) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    })
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    if (!isSmokeTest) {
      return
    }

    const smokeMusicXmlPath = join(
      app.getPath('temp'),
      `in-c-packaged-smoke-${process.pid}.musicxml`
    )
    const smokePdfPath = join(
      app.getPath('temp'),
      `in-c-packaged-smoke-${process.pid}.pdf`
    )
    const smokeMidiPath = join(
      app.getPath('temp'),
      `in-c-packaged-smoke-${process.pid}.mid`
    )
    const smokeMusicXmlContents = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Packaged Smoke</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Smoke</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`
    const smokeMidiContents = [
      0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
      0x00, 0x01, 0x00, 0x02, 0x01, 0xe0, 0x4d, 0x54,
      0x72, 0x6b, 0x00, 0x00, 0x00, 0x0b, 0x00, 0xff,
      0x51, 0x03, 0x07, 0xa1, 0x20, 0x00, 0xff, 0x2f,
      0x00, 0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00,
      0x19, 0x00, 0xff, 0x03, 0x05, 0x53, 0x6d, 0x6f,
      0x6b, 0x65, 0x00, 0xc0, 0x00, 0x00, 0x90, 0x3c,
      0x64, 0x83, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff,
      0x2f, 0x00
    ]

    try {
      const result = await mainWindow.webContents.executeJavaScript(`
        (async () => {
          const smokeMusicXmlPath = ${JSON.stringify(smokeMusicXmlPath)}
          const smokePdfPath = ${JSON.stringify(smokePdfPath)}
          const smokeMidiPath = ${JSON.stringify(smokeMidiPath)}
          const smokeMusicXmlContents = ${JSON.stringify(smokeMusicXmlContents)}
          const smokeMidiContents = ${JSON.stringify(smokeMidiContents)}
          const appName = window.inC?.appName
          const hasMusicXmlBridge =
            typeof window.inC?.musicXml?.open === 'function' &&
            typeof window.inC?.musicXml?.save === 'function'
          const hasPdfBridge = typeof window.inC?.pdf?.save === 'function'
          const hasMidiBridge = typeof window.inC?.midi?.save === 'function'
          const hasAutosaveBridge =
            typeof window.inC?.autosave?.read === 'function' &&
            typeof window.inC?.autosave?.write === 'function' &&
            typeof window.inC?.autosave?.clear === 'function'
          const hasRecentBridge =
            typeof window.inC?.recentMusicXml?.list === 'function' &&
            typeof window.inC?.recentMusicXml?.add === 'function' &&
            typeof window.inC?.recentMusicXml?.open === 'function' &&
            typeof window.inC?.recentMusicXml?.remove === 'function'
          const hasPromotionsBridge =
            typeof window.inC?.promotions?.getConcertPosters === 'function'
          const hasStartScreen = Boolean(document.querySelector('.start-screen'))
          const hasStartActions = document.querySelectorAll('.start-action').length >= 3

          document.querySelector('.start-action')?.click()
          await new Promise((resolve) => setTimeout(resolve, 150))

          const setInputValue = (input, value) => {
            if (!input) {
              throw new Error('Packaged smoke new score input not found.')
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
              throw new Error('Packaged smoke new score select not found.')
            }

            const setter = Object.getOwnPropertyDescriptor(
              HTMLSelectElement.prototype,
              'value'
            ).set
            setter.call(select, value)
            select.dispatchEvent(new Event('change', { bubbles: true }))
          }
          const waitForCondition = async (predicate, message) => {
            for (let attempt = 0; attempt < 20; attempt += 1) {
              if (predicate()) {
                return
              }
              await new Promise((resolve) => setTimeout(resolve, 50))
            }
            throw new Error(message)
          }
          const labels = [...document.querySelectorAll('.new-score-form label')]
          const field = (name) =>
            labels.find((label) => label.textContent?.includes(name))
              ?.querySelector('input, select')

          setInputValue(field('제목'), 'Packaged Smoke Score')
          setInputValue(field('작곡가'), 'Codex QA')
          setSelectValue(field('악보 구성'), 'string-quartet')
          setSelectValue(field('조표'), 'c-major')
          setSelectValue(field('박자표'), '4-4')
          setInputValue(field('마디 수'), '4')
          setInputValue(field('빠르기'), '96')
          document
            .querySelector('form[aria-label="새 악보 만들기"]')
            ?.dispatchEvent(
              new SubmitEvent('submit', { bubbles: true, cancelable: true })
            )
          await new Promise((resolve) => setTimeout(resolve, 300))

          const hasScoreWorkspace = !document.querySelector('.start-screen')
          const hasScoreTitle = document.body.textContent?.includes(
            'Packaged Smoke Score'
          )
          const hasNotationSvg = Boolean(
            document.querySelector('.notation-preview svg')
          )

          const savedMusicXml = await window.inC.musicXml.save({
            filePath: smokeMusicXmlPath,
            suggestedName: 'packaged-smoke.musicxml',
            contents: smokeMusicXmlContents
          })
          const recentFiles = await window.inC.recentMusicXml.add({
            filePath: smokeMusicXmlPath,
            fileName: 'packaged-smoke.musicxml'
          })
          const openedMusicXml = await window.inC.recentMusicXml.open({
            filePath: smokeMusicXmlPath
          })
          const savedPdf = await window.inC.pdf.save({
            filePath: smokePdfPath,
            suggestedName: 'packaged-smoke.pdf'
          })
          ;[...document.querySelectorAll('.toolbar-tabs button')]
            .find((button) => button.textContent?.trim() === '악보')
            ?.click()
          await new Promise((resolve) => setTimeout(resolve, 100))
          setSelectValue(
            document.querySelector('select[aria-label="악보 보기"]'),
            'part'
          )
          await waitForCondition(
            () =>
              document.querySelector('select[aria-label="파트보 선택"]')
                ?.disabled === false,
            'Packaged smoke part view select did not become enabled.'
          )
          setSelectValue(
            document.querySelector('select[aria-label="파트보 선택"]'),
            'cello'
          )
          setSelectValue(
            document.querySelector('select[aria-label="PDF 설정 프리셋"]'),
            'compact-parts'
          )
          await waitForCondition(
            () =>
              document
                .querySelector('[aria-label="파트보 제목"]')
                ?.textContent?.trim() === 'Cello' &&
              document.body.textContent?.includes('파트보: Cello'),
            'Packaged smoke Cello part view did not render.'
          )
          const partViewPdfTarget = {
            labels: [...document.querySelectorAll('.notation-staff-label')]
              .map((label) => ({
                partId: label.getAttribute('data-part-id'),
                staffId: label.getAttribute('data-staff-id'),
                text: label.textContent?.trim()
              })),
            pagePartId: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-part-id'),
            pageViewMode: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-view-mode'),
            pdfPageMarginMm: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-pdf-page-margin-mm'),
            pdfPageOrientation: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-pdf-page-orientation'),
            pdfPageSize: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-pdf-page-size'),
            pdfStaffSizePercent: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-pdf-staff-size-percent'),
            pdfSystemSpacingPercent: document
              .querySelector('[aria-label="악보 페이지"]')
              ?.getAttribute('data-pdf-system-spacing-percent'),
            partTitle: document
              .querySelector('[aria-label="파트보 제목"]')
              ?.textContent?.trim(),
            partTitlePartId: document
              .querySelector('[aria-label="파트보 제목"]')
              ?.getAttribute('data-part-id'),
            status: document.body.textContent?.includes('파트보: Cello'),
            visiblePartIds: [
              ...new Set(
                [...document.querySelectorAll('.notation-event')]
                  .map((event) => event.getAttribute('data-part-id'))
                  .filter(Boolean)
              )
            ]
          }
          const savedPartPdf = await window.inC.pdf.save({
            filePath: smokePdfPath,
            suggestedName: 'packaged-smoke-cello.pdf'
          })
          const savedMidi = await window.inC.midi.save({
            filePath: smokeMidiPath,
            suggestedName: 'packaged-smoke.mid',
            contents: smokeMidiContents
          })
          await window.inC.autosave.write({
            score: { title: 'Packaged Smoke' },
            title: 'Packaged Smoke'
          })
          const autosaveSnapshot = await window.inC.autosave.read()
          await window.inC.autosave.clear()
          await window.inC.recentMusicXml.remove({ filePath: smokeMusicXmlPath })

          return {
            appName,
            hasMusicXmlBridge,
            hasPdfBridge,
            hasMidiBridge,
            hasAutosaveBridge,
            hasRecentBridge,
            hasPromotionsBridge,
            hasStartScreen,
            hasStartActions,
            partViewPdfTarget,
            hasScoreWorkspace,
            hasScoreTitle,
            hasNotationSvg,
            hasMusicXmlFileWrite:
              savedMusicXml?.filePath === smokeMusicXmlPath &&
              savedMusicXml?.fileName === 'in-c-packaged-smoke-${process.pid}.musicxml',
            hasRecentOpenRoundTrip:
              recentFiles.some((file) => file.filePath === smokeMusicXmlPath) &&
              openedMusicXml?.contents === smokeMusicXmlContents,
            hasPdfFileWrite:
              savedPdf?.filePath === smokePdfPath &&
              savedPdf?.fileName === 'in-c-packaged-smoke-${process.pid}.pdf',
            hasPartViewPdfTarget:
              partViewPdfTarget.partTitle === 'Cello' &&
              partViewPdfTarget.partTitlePartId === 'cello' &&
              partViewPdfTarget.pageViewMode === 'part' &&
              partViewPdfTarget.pagePartId === 'cello' &&
              partViewPdfTarget.pdfPageSize === 'a4' &&
              partViewPdfTarget.pdfPageOrientation === 'portrait' &&
              partViewPdfTarget.pdfPageMarginMm === '6' &&
              partViewPdfTarget.pdfStaffSizePercent === '90' &&
              partViewPdfTarget.pdfSystemSpacingPercent === '90' &&
              partViewPdfTarget.status === true &&
              partViewPdfTarget.visiblePartIds.length === 1 &&
              partViewPdfTarget.visiblePartIds[0] === 'cello',
            hasPartViewPdfFileWrite:
              savedPartPdf?.filePath === smokePdfPath &&
              savedPartPdf?.fileName === 'in-c-packaged-smoke-${process.pid}.pdf',
            hasMidiFileWrite:
              savedMidi?.filePath === smokeMidiPath &&
              savedMidi?.fileName === 'in-c-packaged-smoke-${process.pid}.mid',
            hasAutosaveRoundTrip:
              autosaveSnapshot?.metadata?.title === 'Packaged Smoke'
          }
        })()
      `)

      if (
        result.appName !== 'in-C' ||
        !result.hasMusicXmlBridge ||
        !result.hasPdfBridge ||
        !result.hasMidiBridge ||
        !result.hasAutosaveBridge ||
        !result.hasRecentBridge ||
        !result.hasPromotionsBridge ||
        !result.hasStartScreen ||
        !result.hasStartActions ||
        !result.hasScoreWorkspace ||
        !result.hasScoreTitle ||
        !result.hasNotationSvg ||
        !result.hasMusicXmlFileWrite ||
        !result.hasRecentOpenRoundTrip ||
        !result.hasPdfFileWrite ||
        !result.hasPartViewPdfTarget ||
        !result.hasPartViewPdfFileWrite ||
        !result.hasMidiFileWrite ||
        !result.hasAutosaveRoundTrip
      ) {
        throw new Error(`Packaged renderer check failed: ${JSON.stringify(result)}`)
      }

      const savedContents = await readFile(smokeMusicXmlPath, 'utf8')

      if (savedContents !== smokeMusicXmlContents) {
        throw new Error('Packaged MusicXML smoke file contents did not round-trip.')
      }

      const savedPdf = await readFile(smokePdfPath)
      const savedMidi = await readFile(smokeMidiPath)

      validateSmokePdf(savedPdf)

      validateSmokeMidi(savedMidi)

      console.log(`PACKAGED_APP_SMOKE_OK ${JSON.stringify(result)}`)
      app.exit(0)
    } catch (error) {
      console.error(error)
      app.exit(1)
    } finally {
      await rm(smokeMusicXmlPath, { force: true })
      await rm(smokePdfPath, { force: true })
      await rm(smokeMidiPath, { force: true })
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    return
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function autosaveDirectory(): string {
  return join(app.getPath('userData'), 'autosave')
}

function autosavePath(): string {
  return join(autosaveDirectory(), 'recovery.json')
}

function recentMusicXmlPath(): string {
  return join(app.getPath('userData'), 'recent-musicxml.json')
}

function musicXmlBackupDirectory(): string {
  return join(app.getPath('userData'), 'musicxml-backups')
}

async function writeMusicXmlFile(
  filePath: string,
  contents: string
): Promise<void> {
  await backupExistingMusicXmlFile(filePath)
  await writeFile(filePath, contents, 'utf8')
}

async function backupExistingMusicXmlFile(
  filePath: string
): Promise<string | undefined> {
  try {
    await mkdir(musicXmlBackupDirectory(), { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(
      musicXmlBackupDirectory(),
      `${timestamp}-${sanitizeBackupFileName(basename(filePath))}`
    )

    await copyFile(filePath, backupPath)
    return backupPath
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined
    }

    throw error
  }
}

function sanitizeBackupFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
}

function getConcertPostersApiUrls(): string[] {
  const configuredUrl = process.env.IN_C_CONCERT_POSTERS_API_URL
  const primaryUrl =
    configuredUrl ??
    (app.isPackaged
      ? productionConcertPostersApiUrl
      : 'http://127.0.0.1:4175/api/concert-posters.json')
  const urls = [primaryUrl]

  if (primaryUrl !== productionConcertPostersApiUrl) {
    urls.push(productionConcertPostersApiUrl)
  }

  return urls
}

async function readRecentMusicXmlFiles(): Promise<RecentMusicXmlFile[]> {
  try {
    const parsed = JSON.parse(
      await readFile(recentMusicXmlPath(), 'utf8')
    ) as unknown

    return Array.isArray(parsed)
      ? parsed.filter(isRecentMusicXmlFile).slice(0, 5)
      : []
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }
}

async function addRecentMusicXmlFile(input: {
  filePath: string
  fileName: string
}): Promise<RecentMusicXmlFile[]> {
  const recentFiles = await readRecentMusicXmlFiles()
  const nextFiles = [
    {
      filePath: input.filePath,
      fileName: input.fileName,
      openedAt: new Date().toISOString()
    },
    ...recentFiles.filter((file) => file.filePath !== input.filePath)
  ].slice(0, 5)

  await writeRecentMusicXmlFiles(nextFiles)
  return nextFiles
}

async function removeRecentMusicXmlFile(
  filePath: string
): Promise<RecentMusicXmlFile[]> {
  const nextFiles = (await readRecentMusicXmlFiles()).filter(
    (file) => file.filePath !== filePath
  )

  await writeRecentMusicXmlFiles(nextFiles)
  return nextFiles
}

async function writeRecentMusicXmlFiles(
  recentFiles: RecentMusicXmlFile[]
): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(
    recentMusicXmlPath(),
    JSON.stringify(recentFiles, null, 2),
    'utf8'
  )
}

function isRecentMusicXmlFile(value: unknown): value is RecentMusicXmlFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const recent = value as Partial<RecentMusicXmlFile>

  return (
    typeof recent.filePath === 'string' &&
    typeof recent.fileName === 'string' &&
    typeof recent.openedAt === 'string'
  )
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
