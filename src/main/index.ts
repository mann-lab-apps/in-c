import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

const openMusicXmlChannel = 'musicxml:open'
const saveMusicXmlChannel = 'musicxml:save'
const savePdfChannel = 'pdf:save'
const readAutosaveChannel = 'autosave:read'
const writeAutosaveChannel = 'autosave:write'
const clearAutosaveChannel = 'autosave:clear'
const listRecentMusicXmlChannel = 'recent-musicxml:list'
const addRecentMusicXmlChannel = 'recent-musicxml:add'
const openRecentMusicXmlChannel = 'recent-musicxml:open'
const removeRecentMusicXmlChannel = 'recent-musicxml:remove'
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
      suggestedName: string
      contents: string
    }
  ) => {
    const result = await dialog.showSaveDialog({
      title: 'MusicXML 내보내기',
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

    await writeFile(result.filePath, input.contents, 'utf8')
    return {
      fileName: basename(result.filePath)
    }
  }
)

ipcMain.handle(
  savePdfChannel,
  async (
    event,
    input: {
      suggestedName: string
    }
  ) => {
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

    const senderWindow = BrowserWindow.fromWebContents(event.sender)

    if (!senderWindow) {
      throw new Error('PDF를 생성할 창을 찾을 수 없습니다.')
    }

    const pdfData = await senderWindow.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: true
    })

    await writeFile(result.filePath, pdfData)

    return {
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

    try {
      const result = await mainWindow.webContents.executeJavaScript(`
        ({
          appName: window.inC?.appName,
          hasMusicXmlBridge:
            typeof window.inC?.musicXml?.open === 'function' &&
            typeof window.inC?.musicXml?.save === 'function',
          hasPdfBridge: typeof window.inC?.pdf?.save === 'function',
          hasAutosaveBridge:
            typeof window.inC?.autosave?.read === 'function' &&
            typeof window.inC?.autosave?.write === 'function' &&
            typeof window.inC?.autosave?.clear === 'function',
          hasRecentBridge:
            typeof window.inC?.recentMusicXml?.list === 'function' &&
            typeof window.inC?.recentMusicXml?.add === 'function' &&
            typeof window.inC?.recentMusicXml?.open === 'function' &&
            typeof window.inC?.recentMusicXml?.remove === 'function',
          hasStartScreen: Boolean(document.querySelector('.start-screen')),
          hasStartActions: document.querySelectorAll('.start-action').length >= 4
        })
      `)

      if (
        result.appName !== 'in-C' ||
        !result.hasMusicXmlBridge ||
        !result.hasPdfBridge ||
        !result.hasAutosaveBridge ||
        !result.hasRecentBridge ||
        !result.hasStartScreen ||
        !result.hasStartActions
      ) {
        throw new Error(`Packaged renderer check failed: ${JSON.stringify(result)}`)
      }

      console.log(`PACKAGED_APP_SMOKE_OK ${JSON.stringify(result)}`)
      app.exit(0)
    } catch (error) {
      console.error(error)
      app.exit(1)
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
