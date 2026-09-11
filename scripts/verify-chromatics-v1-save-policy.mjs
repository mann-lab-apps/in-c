import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(new URL('..', import.meta.url).pathname)

const checks = [
  {
    id: 'release-notes-primary-save',
    path: 'docs/releases/chromatics-v1-release-notes-draft.md',
    patterns: [/Primary save\*\*: MusicXML/, /전용 프로젝트 포맷은 V1에 포함하지 않고 post-V1/]
  },
  {
    id: 'known-limitations-native-post-v1',
    path: 'docs/quality/known-limitations.md',
    patterns: [/## Native Project Format Is Post-V1/, /Chromatics V1은 별도 전용 프로젝트 파일 포맷을 제공하지 않고 MusicXML을 primary save로 사용한다/]
  },
  {
    id: 'desktop-v1-save-policy',
    path: 'docs/product/chromatics-desktop-v1.md',
    patterns: [/Native project format is explicitly post-V1/, /V1 uses MusicXML as the primary\s+save format/]
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
    patterns: [/CV1-NATIVE-FORMAT-DECISION/, /MusicXML-first 저장/]
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
        policy: 'MusicXML primary save; native project format post-V1',
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
