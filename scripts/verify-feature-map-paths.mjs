import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const defaultRepoRoot = resolve(import.meta.dirname, '..')

export function verifyFeatureMapPaths(featureMap, repoRoot = defaultRepoRoot) {
  const featureItems = featureMap.flatMap((group) =>
    group.sections.flatMap((section) => section.items)
  )

  for (const item of featureItems) {
    for (const field of ['docs', 'acceptance']) {
      for (const path of item[field] ?? []) {
        if (!existsSync(resolve(repoRoot, path))) {
          throw new Error(`${item.name} ${field} 경로가 없습니다: ${path}`)
        }
      }
    }
  }
}
