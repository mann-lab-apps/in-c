const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream, mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs')
const { join, resolve } = require('node:path')

const [, , executableArg, evidenceArg] = process.argv
const executable = resolve(executableArg)
const evidence = resolve(evidenceArg)
const launcher = resolve(__dirname, '../../scripts/verify-packaged-app.cjs')
const profiles = join(evidence, '..', 'delivered-smoke-profiles')

async function main() {
  mkdirSync(profiles)
  const started = Date.now()
  const result = spawnSync(process.execPath, [launcher, '--executable', executable], {
    env: {
      ...process.env,
      TMPDIR: profiles, TMP: profiles, TEMP: profiles,
      PACKAGE_DIRECTORY: join(profiles, 'missing-build-layout')
    },
    encoding: 'utf8',
    timeout: 45_000
  })
  const elapsedMs = Date.now() - started
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  writeFileSync(join(evidence, 'delivered-smoke.log'), stdout + stderr)
  process.stdout.write(stdout)
  process.stderr.write(stderr)

  const lines = stdout.split(/\r?\n/)
  const stagePrefix = 'PACKAGED_APP_SMOKE_STAGE '
  const successPrefix = 'PACKAGED_APP_SMOKE_OK '
  const certificate = lines.find(line => line.startsWith(successPrefix))
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(executable)) hash.update(chunk)
  const report = {
    executable,
    executableSha256: hash.digest('hex'),
    launcherSha256: createHash('sha256').update(readFileSync(launcher)).digest('hex'),
    platform: process.platform,
    arch: process.arch,
    elapsedMs,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message,
    lastStage: lines.filter(line => line.startsWith(stagePrefix)).at(-1)?.slice(stagePrefix.length),
    remainingProfileEntries: readdirSync(profiles),
    certificate: certificate ? JSON.parse(certificate.slice(successPrefix.length)) : null
  }
  writeFileSync(join(evidence, 'delivered-smoke.json'), JSON.stringify(report, null, 2) + '\n')
  assert.ifError(result.error)
  assert.equal(report.exitCode, 0)
  assert.deepEqual(report.remainingProfileEntries, [])
  assert.equal(report.lastStage, 'backup-viewports')
  for (const check of ['hasNativeProjectRoundTrip', 'hasNativeRecoveryRoundTrip', 'hasNativeBackupUiRecovery',
    'hasMxlRoundTrip', 'hasPartViewPdfFileWrite']) {
    assert.equal(report.certificate?.[check], true, check)
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
