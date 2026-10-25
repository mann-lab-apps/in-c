const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const from = file => path.join(root, file)
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const write = (file, data) => fs.writeFileSync(path.join(__dirname, file), data)
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n')
const copy = (file, target) => {
  const to = path.join(__dirname, target)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from(file), to)
}
const receipts = JSON.parse(fs.readFileSync(path.join(__dirname, 'checks.json')))
assert.equal(receipts.receipts.length, 11)
for (const check of receipts.receipts) assert.equal(check.exitCode, 0, check.name)
for (const [file, hash] of Object.entries(receipts.before)) assert.equal(sha(from(file)), hash, file)
const prior = 'docs/brand/ddirori-design-system/product-design-r3/returns/studio-product-design-r3'
const manifest = sha(from('docs/brand/ddirori-design-system/product-design-r3/revision.json'))
assert.equal(manifest, 'a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36')
const protectedFiles = JSON.parse(fs.readFileSync(from(`${prior}/protected-r2.json`)))
for (const file of protectedFiles) assert.equal(sha(from(file.path)), file.sha256, file.path)
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
json('source.json', { implementation: 'uncommitted', head, designManifestSha256: manifest,
  startingR3: JSON.parse(fs.readFileSync(from(`${prior}/source.json`))),
  files: Object.entries(receipts.before).map(([file, hash]) => ({ path: file, sha256: hash })), protectedR2: protectedFiles })
let diff = execFileSync('git', ['diff', '--', ...Object.keys(receipts.before)], { cwd: root, encoding: 'utf8' })
for (const file of Object.keys(receipts.before)) {
  try { execFileSync('git', ['ls-files', '--error-unmatch', file], { cwd: root, stdio: 'pipe' }) }
  catch {
    try { diff += execFileSync('git', ['diff', '--no-index', '--', '/dev/null', file], { cwd: root, encoding: 'utf8' }) }
    catch (error) { if (error.status !== 1) throw error; diff += error.stdout }
  }
}
write('cumulative-owned-files.diff', diff)
const r2 = 'out/ddirori/studio-r3-stabilization-final-r2'
for (const file of fs.readdirSync(from(r2))) copy(`${r2}/${file}`, `artifacts/r2/${file}`)
const renderer = []
for (const width of [960, 1400]) {
  const dir = `out/ddirori/studio-r3-stabilization-final-${width}`
  const result = JSON.parse(fs.readFileSync(from(`${dir}/results.json`)))
  assert.equal(result.keyboardRetry, true)
  assert.equal(result.taskViewport, width)
  assert.equal(result.readySaveHeight, result.pendingSaveHeight)
  assert.equal(result.projectSaveRequests, 3)
  assert.equal(result.scoreReceiptVerified, false)
  for (const file of fs.readdirSync(from(dir))) copy(`${dir}/${file}`, `artifacts/renderer-${width}/${file}`)
  execFileSync('pdftoppm', ['-png', '-singlefile', '-scale-to', '1200', from(`${dir}/practice.pdf`), path.join(__dirname, `artifacts/renderer-${width}/practice`)], { stdio: 'pipe' })
  const raster = path.join(__dirname, `artifacts/renderer-${width}/practice.png`)
  assert.equal(sha(raster), sha(from(`${prior}/artifacts/renderer/practice.png`)), 'PDF ink changed')
  assert.equal(fs.readFileSync(from(`${dir}/first.musicxml`), 'utf8'), fs.readFileSync(from(`${prior}/artifacts/renderer/first.musicxml`), 'utf8'))
  const normalize = score => {
    const copy = structuredClone(score)
    copy.id = 'independent-session'
    for (const part of copy.parts) for (const staff of part.staves) for (const measure of staff.measures) for (const voice of measure.voices) voice.events.forEach((event, index) => {
      if (event.type === 'rest' && /^event-[0-9a-f-]{36}$/.test(event.id)) event.id = `generated-rest-${measure.id}-${voice.id}-${index}`
    })
    return copy
  }
  assert.deepEqual(normalize(JSON.parse(fs.readFileSync(from(`${dir}/first.chromatics`))).score), normalize(JSON.parse(fs.readFileSync(from(`${prior}/artifacts/renderer/first.chromatics`))).score))
  renderer.push({ width, result, pdf: execFileSync('pdfinfo', [from(`${dir}/practice.pdf`)], { encoding: 'utf8' }),
    comparison: { pdfRasterByteIdentical: true, musicXmlByteIdentical: true, scoreSemanticEqual: true,
      scoreComparisonExclusions: ['fresh score session ID', 'fresh generated rest-event UUIDs'], sourceFilesUnmodified: true } })
}
for (const [folder, label] of [
  ['studio-r3-keyboard-red', 'focus-red'],
  ['studio-r3-busy-height-red-after-focus-settle', 'frame-focus-timeout'],
  ['studio-r3-busy-height-red-observer', 'busy-height-red']
]) {
  const dir = `out/ddirori/${folder}`
  for (const file of fs.readdirSync(from(dir)).filter(file => file.startsWith('failure'))) copy(`${dir}/${file}`, `artifacts/diagnostics/${label}/${file}`)
}
for (const width of [960, 1400]) {
  const file = path.join(os.tmpdir(), `in-c-notation-snapshot-${width}.png`)
  const to = path.join(__dirname, `artifacts/fixed-canvas/${width}.png`)
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(file, to)
}
const allLog = fs.readFileSync(path.join(__dirname, 'logs/all-final.log'), 'utf8')
assert.match(allLog, /688 passed/)
assert.match(allLog, /# pass 4/)
json('return.json', { service: 'studio', designRevision: 'product-design-r3', designManifestSha256: manifest,
  head, implementation: 'uncommitted', status: 'local-stabilization-verified-with-external-gaps',
  backlog: ['root runner separation', 'R3 keyboard save retry focus', 'compact busy row', 'responsive/PDF boundary review'],
  checks: receipts.receipts, renderer,
  sharedApiChanges: [], iosMetadataChanges: [], goalToolStatus: 'paused-no-resume-tool',
  remoteCI: 'not-run: no push or release authorized', receiverVerified: false,
  remaining: ['responsive baseline mismatch retained and reviewed', 'mobile file transfer and Score picker/internal copy/page/annotation',
    'physical Korean IME', 'actual OS dialogs/menu', 'screen reader', 'physical touch hardware', 'representative user scores'] })
const hashes = []
const walk = folder => {
  for (const item of fs.readdirSync(path.join(__dirname, folder), { withFileTypes: true })) {
    const file = path.join(folder, item.name)
    if (item.isDirectory()) walk(file)
    else hashes.push(`${sha(path.join(__dirname, file))}  ${file}`)
  }
}
walk('logs'); walk('artifacts')
write('artifact-sha256.txt', hashes.sort().join('\n') + '\n')
console.log(JSON.stringify({ head, ownedSources: Object.keys(receipts.before).length, protectedR2: protectedFiles.length, artifacts: hashes.length, manifest }, null, 2))
