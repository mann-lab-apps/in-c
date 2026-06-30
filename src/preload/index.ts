import { contextBridge, ipcRenderer } from 'electron'

const openMusicXmlChannel = 'musicxml:open'
const saveMusicXmlChannel = 'musicxml:save'
const savePdfChannel = 'pdf:save'

const api = {
  appName: 'in-C',
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  musicXml: {
    open: () =>
      ipcRenderer.invoke(openMusicXmlChannel) as Promise<{
        fileName: string
        contents: string
      } | null>,
    save: (input: { suggestedName: string; contents: string }) =>
      ipcRenderer.invoke(saveMusicXmlChannel, input) as Promise<{
        fileName: string
      } | null>
  },
  pdf: {
    save: (input: { suggestedName: string }) =>
      ipcRenderer.invoke(savePdfChannel, input) as Promise<{
        fileName: string
      } | null>
  }
}

contextBridge.exposeInMainWorld('inC', api)

export type InCApi = typeof api
