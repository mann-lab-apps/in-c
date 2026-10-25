const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync, spawnSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const receiptPath = path.join(__dirname, 'score-device.json')
if (fs.existsSync(receiptPath)) throw new Error('Dedicated device already recorded; inspect it instead of creating another')
const xcrun = args => execFileSync('xcrun', args, { encoding: 'utf8' }).trim()
const runtime = JSON.parse(xcrun(['simctl', 'list', 'runtimes', '--json'])).runtimes.find(r => r.isAvailable && r.version === '26.5')
if (!runtime) throw new Error('Expected iOS runtime is unavailable')
const name = `DDIRORI-Studio-R3-Score-20261026-${process.pid}`
const type = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro'
const artifact = path.join(root, 'apps/in_c_sheet/build/ios/iphonesimulator/Runner.app')
const info = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(artifact, 'Info.plist')], { encoding: 'utf8' }))
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const id = xcrun(['simctl', 'create', name, type, runtime.identifier])
const receipt = { name, id, type, runtime: runtime.identifier, runtimeVersion: runtime.version, state: 'created',
  appBundleId: info.CFBundleIdentifier, appVersion: info.CFBundleShortVersionString, appBuild: info.CFBundleVersion,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Dedicated newly created device and current simulator build; shared Play QA device is not modified' }
const save = () => fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n')
save()
receipt.binarySha256 = sha(path.join(artifact, 'Runner'))
receipt.kernelSha256 = sha(path.join(artifact, 'Frameworks/App.framework/flutter_assets/kernel_blob.bin'))
receipt.sourceFiles = ['apps/in_c_sheet/lib/main.dart', 'apps/in_c_sheet/lib/sheet_library_controller.dart', 'apps/in_c_sheet/lib/sheet_library_store.dart'].map(file => ({ path: file, sha256: sha(path.join(root, file)) }))
save()
console.log(JSON.stringify(receipt, null, 2))
for (const [state, args] of [
  ['boot-requested', ['simctl', 'boot', id]],
  ['booted', ['simctl', 'bootstatus', id, '-b']],
  ['installed', ['simctl', 'install', id, artifact]]
]) {
  const result = spawnSync('xcrun', args, { encoding: 'utf8', timeout: 120000 })
  console.log(result.stdout, result.stderr)
  if (result.status !== 0) throw new Error(`Dedicated device ${state} failed: ${result.status} ${result.error?.message || ''}`)
  receipt.state = state
  save()
}
