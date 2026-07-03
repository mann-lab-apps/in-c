import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

const openMusicXmlChannel = 'musicxml:open'
const saveMusicXmlChannel = 'musicxml:save'
const savePdfChannel = 'pdf:save'
const isSmokeTest = process.argv.includes('--smoke-test')

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
          hasNotation: Boolean(document.querySelector('.notation-preview svg')),
          hasToolbar: Boolean(document.querySelector('.toolbar'))
        })
      `)

      if (
        result.appName !== 'in-C' ||
        !result.hasMusicXmlBridge ||
        !result.hasPdfBridge ||
        !result.hasNotation ||
        !result.hasToolbar
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
