import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { studioExportFontsPlugin } from './src/build/studio-export-fonts'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react(), studioExportFontsPlugin()]
  }
})
