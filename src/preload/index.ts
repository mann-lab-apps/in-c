import { contextBridge, ipcRenderer } from 'electron'

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

interface RecentMusicXmlFile {
  filePath: string
  fileName: string
  openedAt: string
}

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
        filePath: string
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
  },
  autosave: {
    read: () =>
      ipcRenderer.invoke(readAutosaveChannel) as Promise<{
        score: unknown
        metadata: {
          title: string
          updatedAt: string
          version: string
        }
      } | null>,
    write: (input: { score: unknown; title: string }) =>
      ipcRenderer.invoke(writeAutosaveChannel, input) as Promise<{
        title: string
        updatedAt: string
        version: string
      }>,
    clear: () => ipcRenderer.invoke(clearAutosaveChannel) as Promise<void>
  },
  recentMusicXml: {
    list: () =>
      ipcRenderer.invoke(listRecentMusicXmlChannel) as Promise<
        RecentMusicXmlFile[]
      >,
    add: (input: { filePath: string; fileName: string }) =>
      ipcRenderer.invoke(
        addRecentMusicXmlChannel,
        input
      ) as Promise<RecentMusicXmlFile[]>,
    open: (input: { filePath: string }) =>
      ipcRenderer.invoke(openRecentMusicXmlChannel, input) as Promise<{
        filePath: string
        fileName: string
        contents: string
      }>,
    remove: (input: { filePath: string }) =>
      ipcRenderer.invoke(
        removeRecentMusicXmlChannel,
        input
      ) as Promise<RecentMusicXmlFile[]>
  }
}

contextBridge.exposeInMainWorld('inC', api)

export type InCApi = typeof api
