import { contextBridge, ipcRenderer } from 'electron'
import type { NativeProject } from '../project/schema'
import type { NativeBackupEntry } from '../project/backups'

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

interface RecentMusicXmlFile {
  filePath: string
  fileName: string
  openedAt: string
  format?: 'native'
}

const api = {
  appName: 'in-C',
  project: {
    listBackups: () => ipcRenderer.invoke('project:list-backups') as Promise<NativeBackupEntry[]>,
    readBackup: (id: string) => ipcRenderer.invoke('project:read-backup', id) as Promise<{ contents: string }>,
    open: () => ipcRenderer.invoke('project:open') as Promise<{ filePath: string; fileName: string; contents: string } | null>,
    save: (input: { filePath?: string; suggestedName: string; contents: string }) =>
      ipcRenderer.invoke('project:save', input) as Promise<{ filePath: string; fileName: string } | null>
  },
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  musicXml: {
    exportCopy: (input: { filePath?: string; suggestedName: string; contents: string }) =>
      ipcRenderer.invoke(exportMusicXmlChannel, input) as Promise<{
        filePath: string
        fileName: string
      } | null>,
    open: () =>
      ipcRenderer.invoke(openMusicXmlChannel) as Promise<{
        filePath: string
        fileName: string
        contents: string
      } | null>,
    save: (input: {
      filePath?: string
      suggestedName: string
      contents: string
    }) =>
      ipcRenderer.invoke(saveMusicXmlChannel, input) as Promise<{
        filePath: string
        fileName: string
      } | null>
  },
  pdf: {
    save: (input: { filePath?: string; suggestedName: string }) =>
      ipcRenderer.invoke(savePdfChannel, input) as Promise<{
        filePath?: string
        fileName: string
      } | null>
  },
  midi: {
    save: (input: {
      filePath?: string
      suggestedName: string
      contents: number[]
    }) =>
      ipcRenderer.invoke(saveMidiChannel, input) as Promise<{
        filePath?: string
        fileName: string
      } | null>
  },
  autosave: {
    read: () =>
      ipcRenderer.invoke(readAutosaveChannel) as Promise<{
        score: unknown
        project?: NativeProject
        metadata: {
          title: string
          updatedAt: string
          version: string
        }
      } | null>,
    write: (input: { score: unknown; title: string; project?: NativeProject }) =>
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
    add: (input: { filePath: string; fileName: string; format?: 'native' }) =>
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
  },
  promotions: {
    getConcertPosters: () =>
      ipcRenderer.invoke(getConcertPostersChannel) as Promise<unknown>
  }
}

contextBridge.exposeInMainWorld('inC', api)

export type InCApi = typeof api
