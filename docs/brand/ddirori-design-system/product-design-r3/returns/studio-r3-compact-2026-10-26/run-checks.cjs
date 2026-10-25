const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync, spawnSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const suffix = process.argv[2] ? `-${process.argv[2]}` : ''
const files = ['src/renderer/src/App.tsx', 'src/renderer/src/App.test.tsx', 'src/renderer/src/studio-r3.css',
  'scripts/verify-ddirori-studio.cjs', 'scripts/verify-studio-compact-workspace.cjs', 'scripts/verify-studio-first-use.cjs']
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
const before = Object.fromEntries(files.map(file => [file, hash(file)]))
const checks = [
  ['typecheck-final', 'npm', ['run', 'typecheck']],
  ['build-final', 'npm', ['run', 'build']],
  ['compact-final', 'node_modules/.bin/electron', ['scripts/verify-studio-compact-workspace.cjs'], { DDIRORI_COMPACT_QA_OUT: 'out/ddirori/studio-r3-compact-final' }],
  ['r2-final', 'node_modules/.bin/electron', ['scripts/verify-ddirori-studio.cjs', '--r2'], { DDIRORI_STUDIO_QA_OUT: 'out/ddirori/studio-r3-compact-r2' }],
  ['first-use-final', 'node_modules/.bin/electron', ['scripts/verify-studio-first-use.cjs', '--keyboard-retry'], { DDIRORI_STUDIO_FIRST_USE_OUT: 'out/ddirori/studio-r3-compact-first-use' }],
  ['fixed-canvas-final', 'node_modules/.bin/electron', ['scripts/verify-notation-snapshots.cjs', '--fixed-canvas']],
  ['all-final', 'npm', ['run', 'test:all']],
  ['roadmap-final', 'npm', ['run', 'verify:chromatics-musescore-parity-roadmap']],
  ['work-queue-final', 'npm', ['run', 'verify:chromatics-v1-work-queue']],
  ['diff-check-final', 'git', ['diff', '--check']]
]
const receipts = []
for (const [name, command, args, overrides] of checks) {
  const log = `logs/${name}${suffix}.log`
  const fd = fs.openSync(path.join(__dirname, log), 'wx')
  const effectiveOverrides = Object.fromEntries(Object.entries(overrides || {}).map(([key, value]) => [key, value + suffix]))
  const env = { ...process.env, ...effectiveOverrides }
  delete env.ELECTRON_RUN_AS_NODE
  const startedAt = new Date().toISOString()
  const r = spawnSync(command, args, { cwd: root, env, stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  receipts.push({ name, command, args, overrides: effectiveOverrides, startedAt, finishedAt: new Date().toISOString(), exitCode: r.status, signal: r.signal, log, error: r.error?.message })
  fs.writeFileSync(path.join(__dirname, `checks${suffix}.json`), JSON.stringify({ before, receipts }, null, 2) + '\n')
  console.log(`${name}: exit ${r.status}`)
  if (r.status !== 0) process.exit(r.status || 1)
}
for (const file of files) if (hash(file) !== before[file]) throw new Error(`Source changed during checks: ${file}`)
console.log('All sequential checks passed with stable implementation hashes')
