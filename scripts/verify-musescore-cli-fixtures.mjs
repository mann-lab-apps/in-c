import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = resolve(new URL('..', import.meta.url).pathname)
const defaultMuseScoreBin = '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
const museScoreBin = process.env.MUSESCORE_BIN ?? defaultMuseScoreBin
const requireMuseScore = process.env.REQUIRE_MUSESCORE_CLI === '1'
const outputRoot =
  process.env.MUSESCORE_CLI_QA_OUTPUT_DIR ??
  (await mkdtemp(join(tmpdir(), 'chromatics-musescore-cli-')))

const fixtures = [
  {
    id: 'musescore-4-7-5-cli-grand-staff-export',
    path: 'src/musicxml/fixtures/external-apps/musescore-4-7-5-cli-grand-staff-export.musicxml',
    outputName: 'musescore-4-7-5-cli-grand-staff-export.pdf',
    minBytes: 1024
  },
  {
    id: 'chromatics-release-qa',
    path: 'src/musicxml/fixtures/release-qa.musicxml',
    outputName: 'chromatics-release-qa.pdf',
    minBytes: 1024
  },
  {
    id: 'musescore-grand-staff-compatibility-seed',
    path: 'src/musicxml/fixtures/external-apps/musescore-grand-staff-basic.musicxml',
    outputName: 'musescore-grand-staff-basic.pdf',
    minBytes: 1024
  }
]
const selectedFixtureId = process.env.MUSESCORE_CLI_FIXTURE_ID
const selectedFixtures =
  process.env.MUSESCORE_CLI_VERIFY_ALL === '1'
    ? fixtures
    : fixtures.filter((fixture) =>
        selectedFixtureId
          ? fixture.id === selectedFixtureId
          : fixture.id === 'musescore-4-7-5-cli-grand-staff-export'
      )

if (selectedFixtures.length === 0) {
  fail(
    `No MuseScore CLI fixture matched ${
      selectedFixtureId ? `MUSESCORE_CLI_FIXTURE_ID=${selectedFixtureId}` : 'default fixture'
    }`
  )
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function fail(message) {
  throw new Error(message)
}

function readPdfHeader(path) {
  return readFileSync(path).subarray(0, 4).toString('utf8')
}

function readPdfTail(path) {
  return readFileSync(path).subarray(-512).toString('utf8')
}

function verifyPdf(path, minBytes) {
  const stats = statSync(path)

  if (stats.size < minBytes) {
    fail(`Expected ${basename(path)} to be at least ${minBytes} bytes, got ${stats.size}`)
  }

  if (!readPdfHeader(path).startsWith('%PDF')) {
    fail(`Expected ${basename(path)} to start with a PDF header`)
  }

  if (!readPdfTail(path).includes('%%EOF')) {
    fail(`Expected ${basename(path)} to contain a PDF EOF marker`)
  }
}

function runMuseScoreExport(fixture, outputPath) {
  const inputPath = resolve(rootDir, fixture.path)

  if (!existsSync(inputPath)) {
    fail(`Missing fixture ${fixture.id}: ${inputPath}`)
  }

  const attempts = []

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(
      museScoreBin,
      ['-F', '--musicxml-use-default-font', '-o', outputPath, inputPath],
      {
        encoding: 'utf8',
        timeout: 90_000
      }
    )

    const attemptResult = {
      attempt,
      status: result.status,
      signal: result.signal,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim()
    }
    attempts.push(attemptResult)

    if (!result.error && result.status === 0 && existsSync(outputPath)) {
      verifyPdf(outputPath, fixture.minBytes)

      return {
        fixtureId: fixture.id,
        input: fixture.path,
        output: outputPath,
        bytes: statSync(outputPath).size,
        attempts
      }
    }

    if (attempt < 3) {
      sleep(500)
    }
  }

  fail(
    `${fixture.id} MuseScore CLI export failed after ${attempts.length} attempts:\n${JSON.stringify(
      attempts,
      null,
      2
    )}`
  )
}

function main() {
  if (!existsSync(museScoreBin)) {
    const message = `MuseScore CLI not found at ${museScoreBin}`

    if (requireMuseScore) {
      fail(message)
    }

    console.log(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          status: 'not-run',
          reason: message,
          nextAction:
            'Install MuseScore Studio 4 or set MUSESCORE_BIN to run real reference-app import/render smoke.'
        },
        null,
        2
      )
    )
    return
  }

  mkdirSync(outputRoot, { recursive: true })

  const version = spawnSync(museScoreBin, ['--version'], {
    encoding: 'utf8',
    timeout: 30_000
  })

  const results = selectedFixtures.map((fixture) =>
    runMuseScoreExport(fixture, join(outputRoot, fixture.outputName))
  )

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: 'passed',
        museScoreBin,
        museScoreVersion: version.stdout.trim() || version.stderr.trim() || null,
        outputRoot,
        skippedFixtures: fixtures
          .filter((fixture) => !selectedFixtures.includes(fixture))
          .map((fixture) => fixture.id),
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
