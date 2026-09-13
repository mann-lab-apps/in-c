import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(new URL('..', import.meta.url).pathname)

const checks = [
  {
    id: 'release-notes-primary-save',
    path: 'docs/releases/chromatics-v1-release-notes-draft.md',
    patterns: [/Expanded V1 Scope Override/, /Current implemented save: MusicXML\/MXL/, /Native lifecycle remains/]
  },
  {
    id: 'known-limitations-expanded-native',
    path: 'docs/quality/known-limitations.md',
    patterns: [/Expanded V1 Scope Override/, /Required target: portable native project/]
  },
  {
    id: 'desktop-v1-save-policy',
    path: 'docs/product/chromatics-desktop-v1.md',
    patterns: [/Expanded V1 Scope Override/, /Current implemented save: MusicXML\/MXL/, /Required target: portable native project/]
  },
  {
    id: 'musicxml-export-warning-contract',
    path: 'src/musicxml/serialize.ts',
    patterns: [/score\.layout\.systemBreakBeforeMeasureIds/, /score\.layout\.pageBreakBeforeMeasureIds/, /score\.layout\.pageSetup/]
  },
  {
    id: 'musicxml-export-warning-test',
    path: 'src/musicxml/musicxml.test.ts',
    patterns: [/export-unsupported-musicxml-report warns about layout data not preserved by MusicXML/, /score\.layout\.pageSetup/]
  },
  {
    id: 'work-queue-native-decision',
    path: 'docs/product/chromatics-commercial-v1-work-queue.md',
    patterns: [/CV1-X-NATIVE-SCHEMA/, /CV1-X-NATIVE-LIFECYCLE/, /CV1-X-PART-XML/]
  }
]

function fail(message) {
  throw new Error(message)
}

function main() {
  const results = checks.map((check) => {
    const absolutePath = resolve(rootDir, check.path)

    if (!existsSync(absolutePath)) {
      fail(`${check.id} missing file: ${check.path}`)
    }

    const contents = readFileSync(absolutePath, 'utf8')
    const missingPatterns = check.patterns.filter((pattern) => !pattern.test(contents))

    if (missingPatterns.length > 0) {
      fail(
        `${check.id} failed for ${check.path}; missing ${missingPatterns
          .map((pattern) => pattern.source)
          .join(', ')}`
      )
    }

    return {
      id: check.id,
      path: check.path,
      patterns: check.patterns.length
    }
  })

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: 'passed',
        policy: 'MusicXML/MXL and first native slice implemented; expanded native lifecycle is incomplete',
        results
      },
      null,
      2
    )
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
