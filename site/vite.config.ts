import { readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'

const getHtmlPages = (root: string, prefix: string) =>
  Object.fromEntries(
    readdirSync(root, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.html') &&
          !entry.name.startsWith('_')
      )
      .map((entry) => [
        `${prefix}/${basename(entry.name, '.html')}`,
        resolve(root, entry.name)
      ])
  )

const columnPages = getHtmlPages(resolve(__dirname, 'columns'), 'columns')

export default defineConfig({
  plugins: [
    {
      name: 'copy-download-manifest',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'download-manifest.json',
          source: readFileSync(resolve(__dirname, 'download-manifest.json'), 'utf8')
        })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        legacyInC: resolve(__dirname, 'in-c/index.html'),
        columns: resolve(__dirname, 'columns.html'),
        compositions: resolve(__dirname, 'compositions.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        ...columnPages
      }
    }
  }
})
