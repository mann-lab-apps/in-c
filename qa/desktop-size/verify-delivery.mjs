import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32 } from 'node:zlib'

const [sourceArg, baselineArg, proofArg, installedExe] = process.argv.slice(2)
const source = resolve(sourceArg)
const baseline = resolve(baselineArg)
const proof = resolve(proofArg)
const qa = dirname(fileURLToPath(import.meta.url))
const windows = process.platform === 'win32'
assert.ok(windows || process.platform === 'linux')
assert.equal(process.env.RUNNER_ARCH, 'X64')
assert.equal(process.arch, 'x64')
mkdirSync(proof, { recursive: true })

function checksum(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function onlyArtifact(directory, suffix) {
  const matches = readdirSync(directory).filter(name => name.endsWith(suffix))
  assert.equal(matches.length, 1, directory + ' ' + suffix)
  return join(directory, matches[0])
}

function verifyArchitecture(file) {
  const bytes = readFileSync(file)
  if (windows) {
    assert.equal(bytes.toString('ascii', 0, 2), 'MZ')
    const offset = bytes.readUInt32LE(0x3c)
    assert.equal(bytes.toString('ascii', offset, offset + 4), 'PE\0\0')
    assert.equal(bytes.readUInt16LE(offset + 4), 0x8664)
  } else {
    assert.equal(bytes.subarray(0, 4).toString('hex'), '7f454c46')
    assert.equal(bytes[4], 2)
    assert.equal(bytes.readUInt16LE(18), 0x3e)
  }
}

function run(logName, script, args, env) {
  const logPath = join(proof, logName + '.log')
  const output = openSync(logPath, 'w')
  const started = Date.now()
  let result
  try {
    const command = windows ? process.execPath : 'dbus-run-session'
    const gui = windows ? [] : ['--', 'xvfb-run', '-a', '-s', '-screen 0 1440x1000x24', process.execPath]
    result = spawnSync(command, [...gui, script, ...args], {
      env, stdio: ['ignore', output, output], timeout: 180_000, windowsHide: true
    })
  } finally {
    closeSync(output)
  }
  writeFileSync(join(proof, logName + '-exit.json'), JSON.stringify({
    code: result.status, signal: result.signal, error: result.error?.message, elapsedMs: Date.now() - started
  }) + '\n')
  assert.ifError(result.error)
  assert.equal(result.status, 0, logPath)
  return readFileSync(logPath, 'utf8')
}

function save(name, value) {
  writeFileSync(join(proof, name + '.json'), JSON.stringify(value, null, 2) + '\n')
}

function pngInfo(file, dpi) {
  const bytes = readFileSync(file)
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  let pixels, density, ended = false
  for (let offset = 8; offset < bytes.length;) {
    const size = bytes.readUInt32BE(offset)
    const end = offset + 8 + size
    assert.ok(end + 4 <= bytes.length)
    const chunk = bytes.subarray(offset + 4, end)
    assert.equal(crc32(chunk), bytes.readUInt32BE(end))
    const kind = chunk.subarray(0, 4).toString('ascii')
    if (kind === 'IHDR') pixels = [chunk.readUInt32BE(4), chunk.readUInt32BE(8)]
    if (kind === 'pHYs') density = [chunk.readUInt32BE(4), chunk.readUInt32BE(8), chunk[12]]
    offset = end + 4
    if (kind === 'IEND') {
      assert.equal(offset, bytes.length)
      ended = true
    }
  }
  assert.ok(ended)
  const perMeter = Math.round(dpi / 0.0254)
  assert.deepEqual(density, [perMeter, perMeter, 1])
  assert.deepEqual(pixels, dpi === 150 ? [1240, 1754] : [2480, 3508])
  return {pixels, pixelsPerMeter: density.slice(0, 2), sha256: checksum(file)}
}

const platformDir = windows ? 'win-unpacked' : 'linux-unpacked'
const executable = windows ? 'in-C.exe' : 'in-c'
const candidateUnpacked = join(source, 'release', platformDir, executable)
const baselineExe = join(baseline, 'release', platformDir, executable)
const candidateAsar = checksum(join(dirname(candidateUnpacked), 'resources', 'app.asar'))
const baselineAsar = checksum(join(dirname(baselineExe), 'resources', 'app.asar'))
const artifact = onlyArtifact(join(source, 'release'), windows ? '-setup.exe' : '.AppImage')
const delivered = realpathSync(windows ? installedExe : artifact)
verifyArchitecture(candidateUnpacked)
verifyArchitecture(baselineExe)
verifyArchitecture(delivered)
if (windows) {
  assert.equal(checksum(delivered), checksum(candidateUnpacked))
  assert.equal(checksum(join(dirname(delivered), 'resources', 'app.asar')), candidateAsar)
}
save('assets', {
  platform: process.platform, arch: process.arch, asset: basename(artifact), sha256: checksum(artifact),
  bytes: statSync(artifact).size, baselineAsar, candidateAsar,
  candidateUnpackedSha256: checksum(candidateUnpacked), deliveredSha256: checksum(delivered)
})

const temp = join(proof, '..', 'studio-size-smoke')
mkdirSync(temp)
const environment = {...process.env, CI:'1', TMPDIR:temp, TEMP:temp, TMP:temp,
  XDG_CONFIG_HOME:join(temp,'config'), PACKAGE_DIRECTORY:join(source,'release')}
delete environment.APPIMAGE_EXTRACT_AND_RUN
delete environment.APPIMAGE
delete environment.APPDIR
const launcher = join(source, 'scripts', 'verify-packaged-app.cjs')
for (const [label, options] of [['default-smoke', []], ['delivered-smoke', ['--executable', delivered]]]) {
  const output = run(label, launcher, options, environment)
  const marker = output.match(/^PACKAGED_APP_SMOKE_OK (\{.*\})\r?$/m)
  assert.ok(marker, label)
  const smoke = JSON.parse(marker[1])
  for (const field of ['hasNativeProjectRoundTrip','hasNativeBackupUiRecovery','hasMxlRoundTrip','hasPartViewPdfFileWrite','hasMidiFileWrite']) {
    assert.equal(smoke[field], true, field)
  }
  assert.equal(readdirSync(temp).some(name => name.startsWith('studio-package-smoke-')), false)
  save(label, smoke)
}

const driver = join(qa, 'evaluate-png.mjs')
const fixture = join(qa, 'hangul.musicxml')
for (const [variant, app, asar, verifyFailure] of [
  ['baseline', baselineExe, baselineAsar, 'no'],
  ['candidate', delivered, candidateAsar, 'yes']
]) {
  run('png-' + variant, driver, [app, fixture, join(proof, variant), verifyFailure], {
    ...environment, STUDIO_QA_ASAR_SHA256:asar,
    STUDIO_QA_REQUIRE_FUSE:!windows && variant === 'candidate' ? '1' : '0'
  })
}
const before = JSON.parse(readFileSync(join(proof,'baseline','results.json'),'utf8'))
const after = JSON.parse(readFileSync(join(proof,'candidate','results.json'),'utf8'))
assert.deepEqual(before.images, after.images)
assert.equal(before.fontAssetReads, 0)
assert.equal(after.fontAssetReads, 3)
assert.equal(after.simulatedFontFailure, true)
assert.equal(before.offlineProbeNetError, 'net::ERR_INTERNET_DISCONNECTED')
assert.equal(after.offlineProbeNetError, before.offlineProbeNetError)
const images = {}
for (const dpi of [150, 300]) {
  const name = 'score-' + dpi + '.png'
  const left = pngInfo(join(proof,'baseline',name), dpi)
  const right = pngInfo(join(proof,'candidate',name), dpi)
  assert.deepEqual(left, right)
  images[dpi] = right
}
save('comparison', {images, embeddedFonts: after.images[0].fonts, bothOffline:true, simulatedFontFailureRetried:true})
