import { resolve } from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'
import { studioExportFontsPlugin } from './src/build/studio-export-fonts'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [studioExportFontsPlugin()],
        test: {
          name: 'studio',
          include: configDefaults.include.flatMap(pattern =>
            ['src', 'scripts'].map(directory => `${directory}/${pattern}`)
          )
        }
      },
      {
        extends: './packages/ddirori_web/vitest.config.ts',
        root: resolve('packages/ddirori_web'),
        test: { name: 'ddirori-ui' }
      }
    ]
  }
})
