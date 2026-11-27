import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, test, vi } from 'vitest'
import verifier from './verify-packaged-app.cjs'

const { findPackagedExecutable, runPackagedSmoke } = verifier
const reportProfile = 'console.log(process.env.DDIRORI_PIANO_QA_DATA)'
const launcher = fileURLToPath(new URL('./verify-packaged-app.cjs', import.meta.url))

afterEach(() => vi.unstubAllEnvs())

async function runFixture(script, timeout = 10_000) {
  const lines = []
  const result = await runPackagedSmoke(process.execPath, ['-e', script], timeout, line => lines.push(line))
  expect(lines[0]).toContain('studio-package-smoke-')
  expect(existsSync(lines[0])).toBe(false)
  return { result, lines }
}

test('streams smoke progress and removes the owned profile after success', async () => {
  vi.stubEnv('ELECTRON_RUN_AS_NODE', '1')
  vi.stubEnv('ELECTRON_RENDERER_URL', 'http://127.0.0.1:1')
  const { lines, result } = await runFixture(`
    ${reportProfile}
    if (process.env.ELECTRON_RUN_AS_NODE || process.env.ELECTRON_RENDERER_URL) process.exit(9)
    console.log('PACKAGED_APP_SMOKE_STAGE native-project')
    console.log('PACKAGED_APP_SMOKE_OK {}')
  `)
  expect(lines.slice(1)).toEqual(['PACKAGED_APP_SMOKE_STAGE native-project', 'PACKAGED_APP_SMOKE_OK {}'])
  expect(result).toMatchObject({ code: 0, timedOut: false, lastStage: 'native-project', smokeCompleted: true })
})

test('keeps the actual failure exit code and its last completed stage', async () => {
  const { result } = await runFixture(`
    ${reportProfile}
    console.log('PACKAGED_APP_SMOKE_STAGE renderer-loaded')
    process.exitCode = 7
  `)
  expect(result).toMatchObject({ code: 7, timedOut: false, lastStage: 'renderer-loaded', smokeCompleted: false })
})

test('terminates a stuck smoke process and removes the profile before returning', async () => {
  const { result } = await runFixture(`
    ${reportProfile}
    console.log('PACKAGED_APP_SMOKE_STAGE renderer-loaded')
    setInterval(() => {}, 1000)
  `, 1500)
  expect(result).toMatchObject({ code: null, signal: 'SIGKILL', timedOut: true, lastStage: 'renderer-loaded' })
})

test('drains the smoke result when a helper retains the output descriptor after app exit', async () => {
  const { result } = await runFixture(`
    ${reportProfile}
    const helper = require('node:child_process').spawn(
      process.execPath, ['-e', 'setTimeout(() => {}, 3000)'], { stdio: 'inherit', detached: true }
    )
    helper.unref()
    console.log('PACKAGED_APP_SMOKE_OK {}')
  `, 2000)
  expect(result).toMatchObject({ code: 0, timedOut: false, smokeCompleted: true })
})

test('removes the profile even when the packaged executable cannot start', async () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'studio-smoke-runner-test-'))
  vi.stubEnv('TMPDIR', sandbox)
  vi.stubEnv('TEMP', sandbox)
  vi.stubEnv('TMP', sandbox)
  try {
    const result = await runPackagedSmoke(join(sandbox, 'missing-executable'), [], 1500)
    expect(result.launchError?.code).toBe('ENOENT')
    expect(readdirSync(sandbox)).toEqual([])
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === 'win32')('launches a relative executable with spaces outside the build layout', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'studio-smoke-delivered-test-'))
  try {
    const executable = 'Delivered Studio'
    writeFileSync(join(sandbox, executable), `#!/usr/bin/env node
if (!process.argv.includes('--smoke-test') || !process.argv.includes('--piano-audit')) process.exit(9)
console.log('PACKAGED_APP_SMOKE_OK {}')
`, { mode: 0o755 })
    const result = spawnSync(process.execPath, [launcher, '--executable', executable], {
      cwd: sandbox,
      env: { ...process.env, PACKAGE_DIRECTORY: join(sandbox, 'missing-build-directory'), TMPDIR: sandbox },
      encoding: 'utf8',
      timeout: 5000
    })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain(`Packaged app smoke test passed: ${join(realpathSync(sandbox), executable)}`)
    expect(readdirSync(sandbox)).toEqual([executable])
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test('rejects a non-file explicit path before creating a profile', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'studio-smoke-explicit-test-'))
  try {
    for (const invalid of [sandbox, join(sandbox, 'missing-file')]) {
      const result = spawnSync(process.execPath, [launcher, '--executable', invalid], {
        env: { ...process.env, TMPDIR: sandbox, TMP: sandbox, TEMP: sandbox },
        encoding: 'utf8',
        timeout: 5000
      })
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Packaged executable is not a file')
    }
    expect(readdirSync(sandbox)).toEqual([])
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test.each([
  ['arm64', ['linux-arm64-unpacked'], 'linux-arm64-unpacked'],
  ['arm64', ['linux-unpacked', 'linux-arm64-unpacked'], 'linux-arm64-unpacked'],
  ['x64', ['linux-arm64-unpacked', 'linux-unpacked'], 'linux-unpacked'],
  ['x64', ['linux-arm64-unpacked', 'linux-unpacked-old'], undefined]
])('selects the %s Linux executable from %j', (arch, layouts, expected) => {
  const release = mkdtempSync(join(tmpdir(), 'studio-smoke-layout-'))
  const names = { executableName: 'in-c' }
  try {
    for (const layout of layouts) {
      mkdirSync(join(release, layout))
      writeFileSync(join(release, layout, names.executableName), '', { mode: 0o755 })
    }
    expect(findPackagedExecutable(release, names, 'linux', arch))
      .toBe(expected ? join(release, expected, names.executableName) : undefined)
  } finally {
    rmSync(release, { recursive: true, force: true })
  }
})
