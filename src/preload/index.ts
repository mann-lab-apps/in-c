import { contextBridge } from 'electron'

const api = {
  appName: 'in-C',
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

contextBridge.exposeInMainWorld('inC', api)

export type InCApi = typeof api
