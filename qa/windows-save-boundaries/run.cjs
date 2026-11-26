const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')

const [asar, electron, proof, candidate] = process.argv.slice(2).map(value => path.resolve(value))
assert(candidate, 'Pass the candidate directory for the frozen fixture dependency')
assert(fs.statSync(asar).isFile() && fs.statSync(electron).isFile())
assert(!fs.existsSync(proof), 'Use a fresh proof directory')
const bundle = path.join(asar, 'out', 'main', 'index.js')
const artifacts = path.join(proof, 'artifacts')
const cases = path.join(proof, 'cases')
fs.mkdirSync(artifacts, { recursive: true })
fs.mkdirSync(cases)
const tests = []
for (const width of [960, 1400]) {
  for (const scenario of ['replace', 'new-destination', 'replace-envelope']) tests.push({ width, format: 'mxl', scenario })
  if (process.platform === 'win32') {
    for (const scenario of ['locked-original', 'locked-copy']) tests.push({ width, format: 'mxl', scenario })
  }
}
const environment = { ...process.env, STUDIO_QA_NODE: process.execPath,
  STUDIO_QA_FFLATE: require.resolve('fflate', { paths: [candidate] }) }
delete environment.ELECTRON_RUN_AS_NODE
const results = []
for (const test of tests) {
  const folder = [test.scenario, test.format, test.width].join('-')
  const target = path.join(cases, folder)
  const archive = path.join(artifacts, folder)
  fs.mkdirSync(archive)
  const args = [...(process.platform === 'linux' ? ['--no-sandbox'] : []),
    path.join(__dirname, 'electron-case.cjs'), bundle, target, test.format, test.scenario]
  const child = spawnSync(electron, args, {
    encoding: 'utf8',
    env: { ...environment, STUDIO_QA_WIDTH: String(test.width) },
    timeout: 135000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  })
  fs.writeFileSync(path.join(archive, 'process.log'), [child.stdout, child.stderr, child.error?.message].filter(Boolean).join('\n'))
  if (fs.existsSync(target)) {
    for (const item of fs.readdirSync(target, { withFileTypes: true })) {
      if (item.isFile() && /\.(?:json|png|mxl|log)$/.test(item.name)) {
        fs.copyFileSync(path.join(target, item.name), path.join(archive, item.name))
      }
    }
  }
  const pass = child.status === 0 && fs.existsSync(path.join(archive, 'result.json'))
  results.push({ ...test, folder, pass, exitCode: child.status, signal: child.signal, childError: child.error?.message ?? null })
  console.log((pass ? 'PASS ' : 'FAIL ') + folder)
}
fs.writeFileSync(path.join(artifacts, 'summary.json'), JSON.stringify({
  candidateSha: process.env.STUDIO_QA_CANDIDATE ?? null,
  platform: process.platform,
  arch: process.arch,
  filesystem: process.env.STUDIO_QA_FILESYSTEM ?? null,
  packageAsarSha256: createHash('sha256').update(fs.readFileSync(asar)).digest('hex'),
  results
}, null, 2))
if (results.some(test => !test.pass)) process.exitCode = 1
