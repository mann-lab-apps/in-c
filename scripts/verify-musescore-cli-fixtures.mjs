import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildMuseScoreConversionArgs, invokeMuseScoreConversion } from './musescore-invocation.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const defaultMuseScoreBin = '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
const museScoreBin = process.env.MUSESCORE_BIN ?? defaultMuseScoreBin
const requireMuseScore = process.env.REQUIRE_MUSESCORE_CLI === '1'
const outputRoot = resolve(process.env.MUSESCORE_CLI_QA_OUTPUT_DIR ??
  (await mkdtemp(join(tmpdir(), 'chromatics-musescore-cli-'))))

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

  if (existsSync(outputPath)) {
    fail(`Choose a fresh output directory; existing artifact was preserved: ${outputPath}`)
  }
  const args = buildMuseScoreConversionArgs(inputPath, outputPath)
  const result = invokeMuseScoreConversion({ binary: museScoreBin, inputPath, outputPath })
  const attempts = [{ attempt: 1, status: result.status, signal: result.signal,
    stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim(),
    ...(result.error ? { error: result.error.message } : {}) }]
  let validationError
  if (!result.error && result.status === 0) {
    try {
      if (!existsSync(outputPath)) fail('The converter returned without a new output file.')
      verifyPdf(outputPath, fixture.minBytes)
    } catch (error) { validationError = error instanceof Error ? error.message : String(error) }
  }
  const passed = !result.error && result.status === 0 && !validationError
  const receipt = join(outputRoot, `${fixture.id}-${Date.now()}-${process.pid}-attempt.json`)
  writeFileSync(receipt, JSON.stringify({ fixtureId: fixture.id, input: inputPath,
    output: outputPath, binary: museScoreBin, args, attempts, passed,
    ...(validationError ? { validationError } : {}) }, null, 2) + '\n', { flag: 'wx' })
  if (passed) return { fixtureId: fixture.id, input: fixture.path, output: outputPath,
    bytes: statSync(outputPath).size, attempts, receipt }
  fail(`${fixture.id} MuseScore CLI export failed after one bounded attempt. Artifacts retained: ${receipt}\n${JSON.stringify(attempts, null, 2)}${validationError ? `\n${validationError}` : ''}`)

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
  const versionReceipt = join(outputRoot, `musescore-${Date.now()}-${process.pid}-version.json`)
  writeFileSync(versionReceipt, JSON.stringify({ binary: museScoreBin, args: ['--version'],
    status: version.status, signal: version.signal, stdout: version.stdout, stderr: version.stderr,
    ...(version.error ? { error: version.error.message } : {}) }, null, 2) + '\n', { flag: 'wx' })
  if (version.error || version.status !== 0) {
    fail(`MuseScore version probe did not complete normally; conversion was not started. Artifacts retained: ${versionReceipt}`)
  }

  const results = selectedFixtures.map((fixture) =>
    runMuseScoreExport(fixture, join(outputRoot, fixture.outputName))
  )

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        status: 'passed',
        museScoreBin,
        museScoreVersion: (version.stdout ?? '').trim() || (version.stderr ?? '').trim() || null,
        versionReceipt,
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
