import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

type AutomationMap = {
  features: Array<{
    feature: string
    strategy: string
    scenarios: Array<{
      id: string
      tag: string
      tests: string[]
    }>
  }>
}

const root = process.cwd()

describe('acceptance traceability', () => {
  it('connects mapped Gherkin scenario tags to existing Vitest cases', () => {
    const mapPath = join(root, 'docs/product/acceptance/automation-map.json')
    const map = JSON.parse(readFileSync(mapPath, 'utf8')) as AutomationMap

    for (const feature of map.features) {
      const featurePath = join(root, feature.feature)
      expect(existsSync(featurePath), feature.feature).toBe(true)
      const featureText = readFileSync(featurePath, 'utf8')

      expect(feature.strategy).toBe('vitest-scenario-id')

      for (const scenario of feature.scenarios) {
        expect(featureText, scenario.tag).toContain(scenario.tag)

        for (const testPath of scenario.tests) {
          const absoluteTestPath = join(root, testPath)
          expect(existsSync(absoluteTestPath), testPath).toBe(true)
          expect(readFileSync(absoluteTestPath, 'utf8'), scenario.id).toContain(
            scenario.id
          )
        }
      }
    }
  })
})
