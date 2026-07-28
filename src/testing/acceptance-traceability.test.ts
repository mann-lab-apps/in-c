import { existsSync, readFileSync, readdirSync } from 'node:fs'
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
const acceptanceDirectory = join(root, 'docs/product/acceptance')

const findDuplicates = (values: string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index)

describe('acceptance traceability', () => {
  it('lists every feature and keeps automation map identifiers unique', () => {
    const readme = readFileSync(join(acceptanceDirectory, 'README.md'), 'utf8')
    const map = JSON.parse(
      readFileSync(join(acceptanceDirectory, 'automation-map.json'), 'utf8')
    ) as AutomationMap
    const featureNames = readdirSync(acceptanceDirectory)
      .filter((fileName) => fileName.endsWith('.feature'))
      .sort()

    for (const featureName of featureNames) {
      expect(readme, featureName).toContain(`\`${featureName}\``)
    }

    const mappedFeatures = map.features.map((feature) => feature.feature)
    const scenarios = map.features.flatMap((feature) => feature.scenarios)

    expect(findDuplicates(mappedFeatures), 'feature 경로 중복').toEqual([])
    expect(
      findDuplicates(scenarios.map((scenario) => scenario.id)),
      '시나리오 ID 중복'
    ).toEqual([])
    expect(
      findDuplicates(scenarios.map((scenario) => scenario.tag)),
      '시나리오 태그 중복'
    ).toEqual([])
  })

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
