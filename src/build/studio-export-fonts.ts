import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'

// Embed the notation fonts from the installed VexFlow package.
export function studioExportFontsPlugin(): Plugin {
  const id = 'virtual:studio-export-fonts'
  return { name: 'studio-export-fonts',
    resolveId(value) { if (value === id) return '\0' + id },
    load(value) {
      if (value !== '\0' + id) return
      const require = createRequire(import.meta.url), entry = require.resolve('vexflow')
      const directory = resolve(dirname(entry), '../esm/src/fonts')
      const faces = [['Bravura','bravura','normal'],['Academico','academico','normal'],['Academico','academicobold','bold']].map(([family,name,weight]) => {
        const source = readFileSync(resolve(directory, name + '.js'), 'utf8')
        const uri = source.match(/export const \w+ = '(data:font\/woff2[^']+)';/)?.[1]
        if (!uri) throw new Error('Unsupported installed VexFlow export font: ' + name)
        return { family, weight, uri }
      })
      const css = faces.map(f => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url('${f.uri}') format('woff2');}`).join('\n')
      return `export default ${JSON.stringify(css)}`
    }
  }
}
