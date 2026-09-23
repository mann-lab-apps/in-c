import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { MusicXmlFileSession } from './musicxml-files'
import { NativeProjectFileSession } from './project-files'
import { decodeNativeProject, encodeNativeProject } from '../project/schema'
import { AutosaveFileStore, type AutosaveSnapshot } from './autosave-files'
import { RecentFileStore } from './recent-files'
import { NativeProjectBackupStore } from './project-backups'

const openMusicXmlChannel = 'musicxml:open'
const saveMusicXmlChannel = 'musicxml:save'
const exportMusicXmlChannel = 'musicxml:export'
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
if (isSmokeTest) {
  app.setPath('userData', process.env.IN_C_SMOKE_USER_DATA ?? mkdtempSync(join(app.getPath('temp'), 'chromatics-package-profile-')))
}
const musicXmlFiles = new MusicXmlFileSession(backupExistingMusicXmlFile)
const nativeBackups = new NativeProjectBackupStore(() => join(app.getPath('userData'), 'native-project-backups'))
const nativeFiles = new NativeProjectFileSession(filePath => nativeBackups.create(filePath))

ipcMain.handle('project:list-backups', () => nativeBackups.list())
ipcMain.handle('project:read-backup', async (_event, id: string) => ({ contents: await nativeBackups.read(id) }))

ipcMain.handle('project:open', async () => {
  const result = isSmokeTest
    ? { canceled: false, filePaths: [join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.chromatics`)] }
    : await dialog.showOpenDialog({ title: 'Chromatics 프로젝트 열기', properties: ['openFile'], filters: [{ name: 'Chromatics Project', extensions: ['chromatics'] }] })
  const filePath = result.filePaths[0]
  if (result.canceled || !filePath) return null
  return { filePath, fileName: basename(filePath), contents: encodeNativeProject(await nativeFiles.open(filePath)) }
})

ipcMain.handle('project:save', async (_event, input: { filePath?: string; suggestedName: string; contents: string }) => {
  const project = decodeNativeProject(input.contents)
  let filePath = input.filePath
  if (!filePath) {
    const result = isSmokeTest
      ? { canceled: false, filePath: join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.chromatics`) }
      : await dialog.showSaveDialog({ title: 'Chromatics 프로젝트 저장', defaultPath: input.suggestedName, filters: [{ name: 'Chromatics Project', extensions: ['chromatics'] }] })
    if (result.canceled || !result.filePath) return null
    filePath = result.filePath
    nativeFiles.authorizeSave(filePath)
  }
  await nativeFiles.save(filePath, project)
  return { filePath, fileName: basename(filePath) }
})

const autosaveFiles = new AutosaveFileStore(autosavePath)
const recentFiles = new RecentFileStore(recentMusicXmlPath)

interface RecentMusicXmlFile {
  filePath: string
  fileName: string
  openedAt: string
  format?: 'native'
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
        extensions: ['musicxml', 'xml', 'mxl']
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
    contents: await musicXmlFiles.open(filePath)
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
      if (isSmokeTest) {
        assertSmokeDirectSavePath(input.filePath, input.filePath.endsWith('.mxl') ? 'mxl' : 'musicxml')
        musicXmlFiles.authorizeSave(input.filePath)
      }
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
        },
        {
          name: 'Compressed MusicXML',
          extensions: ['mxl']
        }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    musicXmlFiles.authorizeSave(result.filePath)
    await writeMusicXmlFile(result.filePath, input.contents)
    return {
      filePath: result.filePath,
      fileName: basename(result.filePath)
    }
  }
)

ipcMain.handle(exportMusicXmlChannel, async (
  _event,
  input: { filePath?: string; suggestedName: string; contents: string }
) => {
  if (input.filePath) assertSmokeDirectSavePath(input.filePath, 'xml')
  const result = input.filePath
    ? { canceled: false, filePath: input.filePath }
    : isSmokeTest
    ? { canceled: false, filePath: join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}-part.musicxml`) }
    : await dialog.showSaveDialog({
        title: 'MusicXML 내보내기',
        defaultPath: input.suggestedName,
        filters: [
          { name: 'MusicXML', extensions: ['musicxml'] },
          { name: 'Compressed MusicXML', extensions: ['mxl'] }
        ]
      })
  if (result.canceled || !result.filePath) return null
  await musicXmlFiles.exportCopy(result.filePath, input.contents)
  return { filePath: result.filePath, fileName: basename(result.filePath) }
})

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

    let outputPath = input.filePath ?? (isSmokeTest ? join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.pdf`) : undefined)

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
  return autosaveFiles.read()
})

ipcMain.handle(
  writeAutosaveChannel,
  async (
    _event,
    input: {
      score: unknown
      title: string
      project?: AutosaveSnapshot['project']
    }
  ) => {
    const snapshot: AutosaveSnapshot = {
      score: input.score,
      ...(input.project ? { project: input.project } : {}),
      metadata: {
        title: input.title,
        updatedAt: new Date().toISOString(),
        version: app.getVersion()
      }
    }

    return autosaveFiles.write(snapshot)
  }
)

ipcMain.handle(clearAutosaveChannel, async () => {
  await autosaveFiles.clear()
})

ipcMain.handle(listRecentMusicXmlChannel, async () => readRecentMusicXmlFiles())

ipcMain.handle(
  addRecentMusicXmlChannel,
  async (
    _event,
    input: {
      filePath: string
      fileName: string
      format?: 'native'
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
        contents: recent?.format === 'native'
          ? encodeNativeProject(await nativeFiles.open(input.filePath))
          : await musicXmlFiles.open(input.filePath)
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
      // Hidden smoke windows still need animation frames for the PDF print layout.
      backgroundThrottling: !isSmokeTest,
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
    const smokeMxlPath = join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.mxl`)
    const smokeExportPath = join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.xml`)
    const smokePartExportPath = join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}-part.musicxml`)
    const smokeNativePath = join(app.getPath('temp'), `in-c-packaged-smoke-${process.pid}.chromatics`)
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

    let smokeExitCode = 0
    try {
      const result = await mainWindow.webContents.executeJavaScript(`
        (async () => {
          const smokeMusicXmlPath = ${JSON.stringify(smokeMusicXmlPath)}
          const smokeMxlPath = ${JSON.stringify(smokeMxlPath)}
          const smokeExportPath = ${JSON.stringify(smokeExportPath)}
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
          const chooseScoreStructure = (value) => {
            const option = document.querySelector(
              \`.new-score-template-option[data-template-id="\${value}"]\`
            )
            if (!option) {
              throw new Error('Packaged smoke score structure option not found: ' + value)
            }
            option.click()
          }
          const waitForCondition = async (predicate, message, timeoutMs = 1000) => {
            const deadline = performance.now() + timeoutMs
            while (performance.now() < deadline) {
              if (predicate()) {
                return
              }
              await new Promise((resolve) => setTimeout(resolve, 50))
            }
            throw new Error(message + ': ' + document.querySelector('.editor-status')?.textContent +
              '; visibility=' + document.visibilityState +
              '; printing=' + !!document.querySelector('.app-shell--pdf-export'))
          }
          const labels = [...document.querySelectorAll('.new-score-form label')]
          const field = (name) =>
            labels.find((label) => label.textContent?.includes(name))
              ?.querySelector('input, select')

          setInputValue(field('제목'), 'Packaged Smoke Score')
          setInputValue(field('작곡가'), 'Codex QA')
          chooseScoreStructure('string-quartet')
          await waitForCondition(
            () =>
              document
                .querySelector('.new-score-template-option[data-template-id="string-quartet"]')
                ?.getAttribute('aria-checked') === 'true',
            'Packaged smoke score structure selection did not commit.'
          )
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
          const exportedXml = await window.inC.musicXml.exportCopy({
            filePath: smokeExportPath, suggestedName: 'export.xml',
            contents: smokeMusicXmlContents.replace('Packaged Smoke', 'Packaged Export')
          })
          const recentAfterExport = await window.inC.recentMusicXml.list()
          const reopenedExport = await window.inC.recentMusicXml.open({ filePath: smokeExportPath })
          let exportOverwriteRejected = false
          try {
            await window.inC.musicXml.exportCopy({
              filePath: smokeExportPath, suggestedName: 'export.xml', contents: 'must not overwrite opened document'
            })
          } catch {
            exportOverwriteRejected = true
          }
          await window.inC.recentMusicXml.remove({ filePath: smokeExportPath })
          await window.inC.musicXml.save({
            filePath: smokeMxlPath, suggestedName: 'packaged-smoke.mxl', contents: smokeMusicXmlContents
          })
          const openedMxl = await window.inC.recentMusicXml.open({ filePath: smokeMxlPath })
          await window.inC.musicXml.save({
            filePath: smokeMxlPath, suggestedName: 'packaged-smoke.mxl',
            contents: smokeMusicXmlContents.replace('Packaged Smoke', 'Packaged Resave')
          })
          const resavedMxl = await window.inC.recentMusicXml.open({ filePath: smokeMxlPath })
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
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '파일')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="파트보 제목 수정"]')?.click()
          await waitForCondition(() => document.querySelector('[aria-label="파트보 제목 입력"]'), 'Part title editor did not open')
          const partTitleInput = document.querySelector('[aria-label="파트보 제목 입력"]')
          setInputValue(partTitleInput, 'Cello Rehearsal')
          await new Promise(resolve => setTimeout(resolve, 50))
          partTitleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
          await waitForCondition(() => document.querySelector('[aria-label="파트보 제목"]')?.textContent?.trim() === 'Cello Rehearsal', 'Part title edit did not commit')
          document.querySelector('[aria-label="프로젝트 저장"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics에 저장했습니다.'), 'Native UI save did not complete')
          const nativeRecent = (await window.inC.recentMusicXml.list()).find(file => file.format === 'native')
          if (!nativeRecent) throw new Error('Native recent entry was not persisted')
          const nativeDisk = await window.inC.recentMusicXml.open({ filePath: nativeRecent.filePath })
          let nativeData = JSON.parse(nativeDisk.contents)
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '악보')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('.notation-event[data-part-id="cello"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="마디 추가"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('새 마디를 추가했습니다.'), 'Score-wide measure insertion did not complete')
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '파일')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="프로젝트 저장"]')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          await waitForCondition(() => !document.querySelector('[aria-label="프로젝트 저장"]')?.disabled, 'Inserted score save did not finish')
          const insertedData = JSON.parse((await window.inC.recentMusicXml.open({ filePath: nativeRecent.filePath })).contents)
          const hasScoreWideMeasureEdit = insertedData.score.parts.length === 4 && insertedData.score.parts.every(part => part.staves.every(staff => staff.measures.length === 5))
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', ctrlKey: true, bubbles: true }))
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="프로젝트 저장"]')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          await waitForCondition(() => !document.querySelector('[aria-label="프로젝트 저장"]')?.disabled, 'Measure undo save did not finish')
          nativeData = JSON.parse((await window.inC.recentMusicXml.open({ filePath: nativeRecent.filePath })).contents)
          if (!nativeData.score.parts.every(part => part.staves.every(staff => staff.measures.length === 4))) throw new Error('Score-wide measure undo did not restore all parts')
          const celloLayout = nativeData.partLayouts.find(part => part.partId === 'cello')
          const celloSecondMeasure = nativeData.score.parts.find(part => part.id === 'cello').staves[0].measures[1].id
          const hasNativePartTitleEdit = celloLayout.title === 'Cello Rehearsal' &&
            nativeData.score.parts.find(part => part.id === 'cello').name === 'Cello' &&
            nativeData.score.title === 'Packaged Smoke Score'
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '악보')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('.notation-event[data-measure-id="' + celloSecondMeasure + '"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await waitForCondition(() => {
            const button = document.querySelector('[aria-label="페이지 나누기 추가"]')
            return button && !button.disabled
          }, 'Part page break command was not enabled')
          document.querySelector('[aria-label="페이지 나누기 추가"]')?.click()
          await waitForCondition(() => document.querySelector('[aria-label="페이지 나누기 해제"]'), 'Part page break was not inserted')
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '파일')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="프로젝트 저장"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics에 저장했습니다.'), 'Part page break save did not complete')
          nativeData = JSON.parse((await window.inC.recentMusicXml.open({ filePath: nativeRecent.filePath })).contents)
          if (!nativeData.partLayouts.find(part => part.partId === 'cello')?.layout.pageBreakBeforeMeasureIds?.includes(celloSecondMeasure) || nativeData.score.layout?.pageBreakBeforeMeasureIds?.length) throw new Error('Part page break leaked into full score or was not saved')
          document.querySelector('[aria-label="프로젝트 열기"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics을 열었습니다.'), 'Native UI reopen did not complete')
          const hasNativeProjectRoundTrip = nativeData.format === 'chromatics-project' &&
            nativeData.score.parts.length === 4 && nativeData.score.title === 'Packaged Smoke Score' &&
            nativeData.view.mode === 'part' && nativeData.view.partId === 'cello' &&
            nativeData.partLayouts.find(part => part.partId === 'cello')?.layout.pageSetup.staffSizePercent === 90 &&
            document.querySelector('[aria-label="파트보 제목"]')?.textContent?.trim() === 'Cello Rehearsal'
          document.querySelector('[aria-label="프로젝트 저장"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics에 저장했습니다.'), 'Native second save did not complete')
          const backupEntry = (await window.inC.project.listBackups()).find(entry => entry.fileName.endsWith('in-c-packaged-smoke-${process.pid}.chromatics'))
          if (!backupEntry || backupEntry.error) throw new Error('Native backup was not discoverable')
          document.querySelector('[aria-label="프로젝트 백업"]')?.click()
          await waitForCondition(() => [...document.querySelectorAll('[data-backup-id]')].some(row => row.getAttribute('data-backup-id') === backupEntry.id), 'Backup UI did not list saved revision')
          const backupRow = [...document.querySelectorAll('[data-backup-id]')].find(row => row.getAttribute('data-backup-id') === backupEntry.id)
          backupRow.querySelector('button')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('백업을 복구했습니다.'), 'Native backup UI recovery did not complete')
          const hasNativeBackupUiRecovery = !document.querySelector('[role="dialog"][aria-label="프로젝트 백업"]') &&
            document.querySelector('[aria-label="파트보 제목"]')?.textContent?.trim() === 'Cello Rehearsal'
          const partSystems = [...document.querySelectorAll('[data-measure-id][data-system-index]')]
          const hasNativePartLayout = document.querySelector('[aria-label="파트보 제목"]')?.textContent?.trim() === 'Cello Rehearsal' &&
            partSystems.some(element => element.getAttribute('data-measure-id') === celloSecondMeasure && Number(element.getAttribute('data-system-index')) > 0)
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '내보내기')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          document.querySelector('[aria-label="PDF 변환"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('로 PDF를 만들었습니다.'), 'Native part PDF export did not complete', 10000)
          document.querySelector('[aria-label="MusicXML 내보내기"]')?.click()
          await waitForCondition(() => document.querySelector('.editor-status')?.textContent?.includes('-part.musicxml로 MusicXML을 내보냈습니다.'), 'Part XML UI export did not complete')
          const partXmlFile = await window.inC.recentMusicXml.open({ filePath: ${JSON.stringify(smokePartExportPath)} })
          const partXml = new DOMParser().parseFromString(partXmlFile.contents, 'application/xml')
          const hasPartXmlLayout = !partXml.querySelector('parsererror') &&
            partXml.querySelector('work > work-title')?.textContent === 'Cello Rehearsal' &&
            partXml.querySelectorAll('score-partwise > part').length === 1 &&
            partXml.querySelector('score-partwise > part')?.getAttribute('id') === 'cello' &&
            partXml.querySelector('part > measure[number="2"] > print')?.getAttribute('new-page') === 'yes'
          await window.inC.recentMusicXml.remove({ filePath: ${JSON.stringify(smokePartExportPath)} })
          ;[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '파일')?.click()
          await new Promise(resolve => setTimeout(resolve, 50))
          await window.inC.autosave.write({ score: nativeData.score, project: nativeData, title: nativeData.score.title })
          const nativeRecovery = await window.inC.autosave.read()
          const hasNativeRecoveryRoundTrip = nativeRecovery?.project?.view?.partId === 'cello' &&
            nativeRecovery.project.score.parts.length === 4 &&
            nativeRecovery.project.partLayouts.find(part => part.partId === 'cello')?.layout.pageSetup.staffSizePercent === 90
          await window.inC.recentMusicXml.remove({ filePath: nativeRecent.filePath })
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
            hasMxlRoundTrip: openedMxl?.contents === smokeMusicXmlContents &&
              resavedMxl?.contents === smokeMusicXmlContents.replace('Packaged Smoke', 'Packaged Resave'),
            hasExportCopyRoundTrip: exportedXml?.filePath === smokeExportPath &&
              reopenedExport?.contents === smokeMusicXmlContents.replace('Packaged Smoke', 'Packaged Export') &&
              !recentAfterExport.some(file => file.filePath === smokeExportPath) && exportOverwriteRejected,
            hasNativeProjectRoundTrip,
            hasNativeRecoveryRoundTrip,
            hasNativeBackupUiRecovery,
            hasNativePartLayout,
            hasNativePartTitleEdit,
            hasPartXmlLayout,
            hasScoreWideMeasureEdit,
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
        !result.hasMxlRoundTrip ||
        !result.hasExportCopyRoundTrip ||
        !result.hasNativeProjectRoundTrip ||
        !result.hasNativeRecoveryRoundTrip ||
        !result.hasNativeBackupUiRecovery ||
        !result.hasNativePartLayout ||
        !result.hasNativePartTitleEdit ||
        !result.hasPartXmlLayout ||
        !result.hasScoreWideMeasureEdit ||
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
      if (await readFile(smokeExportPath, 'utf8') !== smokeMusicXmlContents.replace('Packaged Smoke', 'Packaged Export')) {
        throw new Error('Packaged export copy was not preserved after rejected overwrite.')
      }

      const savedPdf = await readFile(smokePdfPath)
      const savedNative = decodeNativeProject(await readFile(smokeNativePath, 'utf8'))
      if (savedNative.score.parts.length !== 4 || savedNative.view.mode !== 'part') throw new Error('Packaged native file lost score or view state.')
      const savedMxl = await readFile(smokeMxlPath)
      if (savedMxl.readUInt32LE(0) !== 0x04034b50) throw new Error('Packaged MXL archive is not ZIP.')
      const savedMidi = await readFile(smokeMidiPath)

      validateSmokePdf(savedPdf)
      const nativePartPageCount = savedPdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
      if (nativePartPageCount < 2) throw new Error('Native part page break did not reach the PDF file.')
      await writeFile(join(app.getPath('temp'), 'in-c-native-part-layout.pdf'), savedPdf)

      validateSmokeMidi(savedMidi)

      await mainWindow.webContents.executeJavaScript(`(async () => {
        document.querySelector('[aria-label="프로젝트 저장"]').click()
        for (let attempt = 0; attempt < 100; attempt += 1) {
          if (document.querySelector('.editor-status')?.textContent?.includes('.chromatics에 저장했습니다.')) return
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        throw new Error('Pre-migration save did not finish')
      })()`)
      const legacyContents = JSON.stringify({
        score: { title: 'Stale duplicate' }, project: { ...savedNative, version: 1 },
        metadata: { title: 'Legacy recovery', updatedAt: '2026-09-13T00:00:00Z', version: 'legacy-test' }
      })
      await mkdir(autosaveDirectory(), { recursive: true })
      await writeFile(autosavePath(), legacyContents)
      const migrated = await autosaveFiles.read()
      if (!migrated?.project || encodeNativeProject(migrated.project) !== encodeNativeProject(savedNative) || await readFile(autosavePath(), 'utf8') !== legacyContents) {
        throw new Error('Legacy disk recovery lost state or rewrote the source during read')
      }
      await mainWindow.webContents.executeJavaScript(`(async () => {
        const wait = async (predicate, message) => {
          for (let attempt = 0; attempt < 100; attempt += 1) {
            if (predicate()) return
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          throw new Error(message + ': ' + document.querySelector('.editor-status')?.textContent)
        }
        document.querySelector('[aria-label="자동저장 복구"]').click()
        await wait(() => document.querySelector('.recovery-dialog'), 'Legacy recovery dialog missing')
      })()`)
      for (const width of [960, 1400]) {
        mainWindow.setSize(width, 900)
        await new Promise(resolve => setTimeout(resolve, 300))
        const fits = await mainWindow.webContents.executeJavaScript(`(() => {
          const dialog = document.querySelector('.recovery-dialog')
          if (!dialog) return false
          const box = dialog.getBoundingClientRect()
          return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight &&
            dialog.scrollWidth <= dialog.clientWidth + 1 && [...dialog.querySelectorAll('button')].every(button => {
              const rect = button.getBoundingClientRect()
              return rect.width >= 28 && rect.height >= 28 && button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
            })
        })()`)
        if (!fits) throw new Error('Legacy recovery dialog inaccessible at ' + width)
        await writeFile(join(app.getPath('temp'), 'in-c-legacy-recovery-' + width + '.png'), (await mainWindow.webContents.capturePage()).toPNG())
      }
      await mainWindow.webContents.executeJavaScript(`(async () => {
        const wait = async (predicate, message) => {
          for (let attempt = 0; attempt < 100; attempt += 1) {
            if (predicate()) return
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          throw new Error(message + ': ' + document.querySelector('.editor-status')?.textContent)
        }
        document.querySelector('.recovery-dialog .primary-action').click()
        await wait(() => document.querySelector('.editor-status')?.textContent?.includes('프로젝트 복구본을 열었습니다.'), 'Legacy recovery did not apply')
        if (document.querySelector('[aria-label="파트보 제목"]')?.textContent?.trim() !== 'Cello Rehearsal') throw new Error('Legacy part title was lost')
        const context = document.querySelector('[aria-label="현재 작업 컨텍스트"]')?.textContent ?? ''
        if (!context.includes('Cello') || context.includes('Violin I')) throw new Error('Legacy recovery selected a hidden part')
        document.querySelector('[aria-label="프로젝트 저장"]').click()
        await wait(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics에 저장했습니다.'), 'Migrated UI save missing')
        document.querySelector('[aria-label="프로젝트 열기"]').click()
        await wait(() => document.querySelector('.editor-status')?.textContent?.includes('.chromatics을 열었습니다.'), 'Migrated UI reopen missing')
      })()`)
      const migratedSaved = decodeNativeProject(await readFile(smokeNativePath, 'utf8'))
      if (encodeNativeProject(migratedSaved) !== encodeNativeProject(savedNative)) throw new Error('Legacy recovery UI save/reopen changed portable state')
      await copyFile(smokeNativePath, join(app.getPath('temp'), 'in-c-migrated-recovery.chromatics'))
      await mainWindow.webContents.executeJavaScript(`[...document.querySelectorAll('.toolbar-tabs button')].find(button => button.textContent?.trim() === '파일')?.click()`)
      await new Promise(resolve => setTimeout(resolve, 100))
      await mainWindow.webContents.executeJavaScript(`document.querySelector('[aria-label="프로젝트 백업"]')?.click()`)
      for (const width of [960, 1400]) {
        mainWindow.setSize(width, 900)
        await new Promise(resolve => setTimeout(resolve, 400))
        const fits = await mainWindow.webContents.executeJavaScript(`(() => {
          const dialog = document.querySelector('[role="dialog"][aria-label="프로젝트 백업"]')
          if (!dialog || !dialog.querySelector('[data-backup-id]')) return false
          const box = dialog.getBoundingClientRect()
          return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight &&
            dialog.scrollWidth <= dialog.clientWidth + 1
        })()`)
        if (!fits) throw new Error(`Native backup dialog does not fit at ${width}px`)
        await writeFile(join(app.getPath('temp'), `in-c-native-backups-${width}.png`), (await mainWindow.webContents.capturePage()).toPNG())
      }
      await copyFile(smokePartExportPath, join(app.getPath('temp'), 'in-c-native-part-layout.musicxml'))
      console.log(`PACKAGED_APP_SMOKE_OK ${JSON.stringify({ ...result, hasLegacyNativeRecovery: true })}`)
    } catch (error) {
      console.error(error)
      smokeExitCode = 1
    } finally {
      try {
        await rm(smokeMusicXmlPath, { force: true })
        await rm(smokeMxlPath, { force: true })
        await rm(smokeExportPath, { force: true })
        await rm(smokePartExportPath, { force: true })
        await rm(smokeNativePath, { force: true })
        await rm(smokePdfPath, { force: true })
        await rm(smokeMidiPath, { force: true })
        for (const backup of await nativeBackups.list()) {
          if (backup.fileName.endsWith(`in-c-packaged-smoke-${process.pid}.chromatics`)) {
            await rm(join(app.getPath('userData'), 'native-project-backups', backup.id), { force: true })
          }
        }
      } catch (error) {
        console.error('Smoke artifact cleanup failed', error)
        smokeExitCode = 1
      } finally { app.exit(smokeExitCode) }
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
  await musicXmlFiles.save(filePath, contents)
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
  return recentFiles.list()
}

async function addRecentMusicXmlFile(input: {
  filePath: string
  fileName: string
  format?: 'native'
}): Promise<RecentMusicXmlFile[]> {
  return recentFiles.add(input)
}

async function removeRecentMusicXmlFile(
  filePath: string
): Promise<RecentMusicXmlFile[]> {
  return recentFiles.remove(filePath)
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
