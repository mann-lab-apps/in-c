const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const { execFileSync, spawnSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const from = file => path.join(root, file)
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const json = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n')
const copy = (file, target) => {
  const dest = path.join(__dirname, target)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(from(file), dest)
}
const copyDir = (dir, target) => {
  for (const item of fs.readdirSync(from(dir), { withFileTypes: true })) {
    if (item.isDirectory()) copyDir(`${dir}/${item.name}`, `${target}/${item.name}`)
    else copy(`${dir}/${item.name}`, `${target}/${item.name}`)
  }
}
const checks = JSON.parse(fs.readFileSync(path.join(__dirname, 'checks-reviewed.json')))
assert.equal(checks.receipts.length, 10)
for (const check of checks.receipts) assert.equal(check.exitCode, 0, check.name)
for (const [file, hash] of Object.entries(checks.before)) assert.equal(sha(from(file)), hash, file)
const manifest = sha(from('docs/brand/ddirori-design-system/product-design-r3/revision.json'))
assert.equal(manifest, 'a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36')
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
assert.equal(head, 'bcdcc40fca6656594b6bd0d5c0f7543180a41745')
const oldProtected = JSON.parse(fs.readFileSync(from('docs/brand/ddirori-design-system/product-design-r3/returns/studio-product-design-r3/protected-r2.json')))
const protectedFiles = oldProtected.filter(file => file.path !== 'scripts/verify-ddirori-studio.cjs')
for (const file of protectedFiles) assert.equal(sha(from(file.path)), file.sha256, file.path)
for (const file of JSON.parse(fs.readFileSync(path.join(__dirname, 'starting-source.json'))).filter(file => /studio-r1.css|verify-notation-snapshots.cjs/.test(file.path))) {
  assert.equal(sha(from(file.path)), file.sha256, file.path)
  protectedFiles.push(file)
}
json('source.json', { implementation: 'uncommitted', head, designManifestSha256: manifest,
  files: Object.entries(checks.before).map(([file, hash]) => ({ path: file, sha256: hash })),
  documentationFiles: ['docs/product/chromatics-musescore-parity-roadmap.md',
    'docs/product/chromatics-commercial-v1-work-queue.md', 'docs/quality/evidence-log.md'].map(file => ({ path: file, sha256: sha(from(file)) })),
  protectedFiles, sharedApiChanges: [], iosSourceChanges: [], iosMetadataChanges: [] })
const baseline = from('out/ddirori/studio-r3-compact-baseline')
let diff = ''
for (const file of Object.keys(checks.before)) {
  const before = file === 'scripts/verify-studio-compact-workspace.cjs' ? '/dev/null' : path.join(baseline, file === 'src/renderer/src/App.test.tsx' ? file + '.snapshot' : file)
  const result = spawnSync('git', ['diff', '--no-index', '--', before, from(file)], { encoding: 'utf8' })
  assert.ok(result.status === 0 || result.status === 1, result.stderr)
  diff += result.stdout
}
fs.writeFileSync(path.join(__dirname, 'slice-only.diff'), diff)
for (const [folder, label] of [
  ['studio-r3-compact-final-reviewed', 'compact'], ['studio-r3-compact-r2-reviewed', 'r2'],
  ['studio-r3-compact-first-use-reviewed', 'first-use'], ['studio-r3-score-source-64', 'score-source'],
  ['studio-r3-score-transfer', 'score-transfer'], ['studio-r3-compact-before', 'diagnostics/viewport-red'],
  ['studio-r3-compact-ring-red', 'diagnostics/ring-red'], ['studio-r3-compact-print-red', 'diagnostics/print-red']
]) copyDir(`out/ddirori/${folder}`, `artifacts/${label}`)
for (const width of [960, 1400]) {
  const target = path.join(__dirname, `artifacts/fixed-canvas/${width}.png`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(path.join(os.tmpdir(), `in-c-notation-snapshot-${width}.png`), target)
}
const firstUse = 'out/ddirori/studio-r3-compact-first-use-reviewed'
execFileSync('pdftoppm', ['-png', '-singlefile', '-scale-to', '1200', from(`${firstUse}/practice.pdf`), path.join(__dirname, 'artifacts/first-use/practice')])
const previous = 'docs/brand/ddirori-design-system/product-design-r3/returns/studio-product-design-r3/artifacts/renderer'
assert.equal(sha(path.join(__dirname, 'artifacts/first-use/practice.png')), sha(from(`${previous}/practice.png`)))
assert.equal(sha(from(`${firstUse}/first.musicxml`)), sha(from(`${previous}/first.musicxml`)))
const normalize = score => {
  const copy = structuredClone(score)
  copy.id = 'independent-session'
  for (const part of copy.parts) for (const staff of part.staves) for (const measure of staff.measures) for (const voice of measure.voices) voice.events.forEach((event, i) => {
    if (event.type === 'rest' && /^event-[0-9a-f-]{36}$/.test(event.id)) event.id = `generated-rest-${measure.id}-${voice.id}-${i}`
  })
  return copy
}
assert.deepEqual(normalize(JSON.parse(fs.readFileSync(from(`${firstUse}/first.chromatics`))).score), normalize(JSON.parse(fs.readFileSync(from(`${previous}/first.chromatics`))).score))
execFileSync('pdftoppm', ['-png', '-scale-to', '1200', from('out/ddirori/studio-r3-score-transfer/Studio-R3-Practice.pdf'), path.join(__dirname, 'artifacts/score-transfer/source-page')])
const allLog = fs.readFileSync(path.join(__dirname, 'logs/all-final-reviewed.log'), 'utf8')
assert.match(allLog, /689 passed/)
assert.match(allLog, /# pass 4/)
const metrics = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/compact/metrics.json')))
const score = JSON.parse(fs.readFileSync(path.join(__dirname, 'score-receipt.json')))
assert.equal(score.annotationPreserved, true)
json('return.json', { service: 'studio', revision: 'product-design-r3', manifestSha256: manifest, head,
  implementation: 'uncommitted', status: 'local-compact-and-simulator-receipt-verified-with-review-gaps',
  checks: checks.receipts, metrics,
  outputComparison: { defaultPdfRasterIdentical: true, defaultMusicXmlIdentical: true, nativeScoreSemanticEqual: true,
    normalizedComparisonOnly: ['independent score-session ID', 'generated rest-event UUIDs'], savedFilesUnmodified: true },
  scoreReceipt: { simulatorOnly: true, actualNativePicker: true, coldReopen: true, pages: 2, annotationCount: score.annotationCount,
    sourceSha256: score.sourceSha256, managedSha256: score.managedSha256, noModelInjection: true },
  responsiveBaseline: 'known FAIL retained separately; 960 actual880x466 vs644x620, 1400 actual680x620 vs804x466; no baseline update',
  sharedApiChanges: [], iosSourceChanges: [], iosMetadataChanges: [], commitsOrRemoteActions: [],
  remaining: ['historical responsive baseline product/design review', 'physical-device file transfer', 'physical IME', 'actual desktop OS menus/dialogs', 'screen reader', 'touch and Apple Pencil hardware', 'representative user-score/human usability review'] })
const hashes = []
const walk = dir => {
  for (const item of fs.readdirSync(path.join(__dirname, dir), { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) walk(file)
    else hashes.push(`${sha(path.join(__dirname, file))}  ${file}`)
  }
}
walk('logs'); walk('artifacts')
for (const name of fs.readdirSync(__dirname).filter(name => /\.(json|cjs|md|diff|jsonl)$/.test(name))) hashes.push(`${sha(path.join(__dirname, name))}  ${name}`)
fs.writeFileSync(path.join(__dirname, 'artifact-sha256.txt'), hashes.sort().join('\n') + '\n')
console.log(JSON.stringify({ result: 'PASS', head, sources: Object.keys(checks.before).length, protectedFiles: protectedFiles.length, artifacts: hashes.length, manifest }))
