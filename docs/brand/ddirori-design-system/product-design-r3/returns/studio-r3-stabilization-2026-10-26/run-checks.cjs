const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync, execFileSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
const sources = ['vitest.config.ts', 'package.json', 'tsconfig.json', 'README.md',
  '.github/workflows/ci.yml', '.github/workflows/release.yml',
  'src/renderer/src/App.tsx', 'src/renderer/src/App.test.tsx',
  'src/renderer/src/studio-r3.css', 'scripts/verify-studio-first-use.cjs']
const before = Object.fromEntries(sources.map(file => [file, hash(file)]))
const checks = [
  ['focused-final', 'npm', ['test', '--', 'src/renderer/src/App.test.tsx', 'src/renderer/src/SpanProperties.test.tsx', 'src/renderer/src/editor/keyboard-input.test.ts', '-t', 'studio.r3|studio.r2|geometry|composition|keyboard', '--reporter=dot']],
  ['typecheck-final', 'npm', ['run', 'typecheck']],
  ['all-final', 'npm', ['run', 'test:all']],
  ['build-verified', 'npm', ['run', 'build']],
  ['renderer-960-final', 'node_modules/.bin/electron', ['scripts/verify-studio-first-use.cjs', '--keyboard-retry'], { DDIRORI_STUDIO_FIRST_USE_OUT: 'out/ddirori/studio-r3-stabilization-final-960' }],
  ['renderer-1400-final', 'node_modules/.bin/electron', ['scripts/verify-studio-first-use.cjs', '--keyboard-retry'], { DDIRORI_STUDIO_FIRST_USE_OUT: 'out/ddirori/studio-r3-stabilization-final-1400', DDIRORI_STUDIO_FIRST_USE_WIDTH: '1400' }],
  ['r2-final', 'node_modules/.bin/electron', ['scripts/verify-ddirori-studio.cjs', '--r2'], { DDIRORI_STUDIO_QA_OUT: 'out/ddirori/studio-r3-stabilization-final-r2' }],
  ['fixed-canvas-final', 'node_modules/.bin/electron', ['scripts/verify-notation-snapshots.cjs', '--fixed-canvas']],
  ['roadmap', 'npm', ['run', 'verify:chromatics-musescore-parity-roadmap']],
  ['work-queue', 'npm', ['run', 'verify:chromatics-v1-work-queue']],
  ['diff-check', 'git', ['diff', '--check']]
]
const receipts = []
for (const [name, command, args, overrides] of checks) {
  const log = `logs/${name}.log`
  const fd = fs.openSync(path.join(__dirname, log), 'wx')
  const env = { ...process.env, ...overrides }
  delete env.ELECTRON_RUN_AS_NODE
  const startedAt = new Date().toISOString()
  const result = spawnSync(command, args, { cwd: root, env, stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  receipts.push({ name, command, args, overrides, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.message, log })
  fs.writeFileSync(path.join(__dirname, 'checks.json'), JSON.stringify({ before, receipts }, null, 2) + '\n')
  console.log(`${name}: exit ${result.status}`)
  if (result.status !== 0) process.exit(result.status || 1)
}
for (const file of sources) {
  if (hash(file) !== before[file]) throw new Error(`Source changed during final checks: ${file}`)
}
console.log('Final source hashes unchanged throughout sequential checks')
