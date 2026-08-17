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
        concerts: resolve(__dirname, 'concerts.html'),
        community: resolve(__dirname, 'community.html'),
        communityPost: resolve(__dirname, 'community-post.html'),
        communityWrite: resolve(__dirname, 'community-write.html'),
        promotionAdmin: resolve(__dirname, 'promotion-admin.html'),
        themeLab: resolve(__dirname, 'theme-lab.html'),
        chromatics: resolve(__dirname, 'chromatics.html'),
        login: resolve(__dirname, 'login.html'),
        utilityApps: resolve(__dirname, 'utility-apps.html'),
        metronome: resolve(__dirname, 'metronome.html'),
        inCClickPrivacy: resolve(__dirname, 'in-c-click-privacy.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        ...columnPages
      }
    }
  }
})
