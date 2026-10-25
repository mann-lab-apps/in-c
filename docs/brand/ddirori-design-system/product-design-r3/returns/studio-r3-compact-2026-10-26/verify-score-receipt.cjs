const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const device = JSON.parse(fs.readFileSync(path.join(__dirname, 'score-device.json')))
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'score-source.json')))
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'score-before-restart.json')))
assert.match(device.name, /^DDIRORI-Studio-R3-Score-/)
const container = execFileSync('xcrun', ['simctl', 'get_app_container', device.id, device.appBundleId, 'data'], { encoding: 'utf8' }).trim()
assert.equal(container, before.container)
const prefs = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path.join(container, 'Library/Preferences', device.appBundleId + '.plist')], { encoding: 'utf8' }))
const scores = JSON.parse(prefs['flutter.clef_scores'])
assert.equal(scores.length, 1)
const score = scores[0]
assert.equal(score.id, before.scores[0].id)
assert.equal(score.filePath, before.scores[0].filePath)
assert.equal(score.lastPage, 2)
assert.deepEqual(score.annotationLayer, before.scores[0].annotationLayer)
assert.equal(score.annotationLayer.strokes.length, 1)
assert.equal(score.annotationLayer.strokes[0].pageNumber, 2)
assert.ok(score.annotationLayer.strokes[0].points.length >= 2)
assert.ok(score.filePath.startsWith(path.join(container, 'Documents/scores/')))
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
assert.equal(hash(score.filePath), source.sha256)
assert.equal(hash(path.join(root, source.source)), source.sha256)
assert.equal(hash(path.join(root, source.servedFile)), source.sha256)
const pdfInfo = execFileSync('pdfinfo', [score.filePath], { encoding: 'utf8' })
assert.match(pdfInfo, /Pages:\s+2/)
for (const file of device.sourceFiles) assert.equal(hash(path.join(root, file.path)), file.sha256)
const receipt = { checkedAt: new Date().toISOString(), device: device.id, appBundleId: device.appBundleId,
  route: 'Studio actual export → localhost Safari download → native document picker → Score managed copy → page 2 → pointer annotation → route close → cold app restart → actual row reopen',
  sourceSha256: source.sha256, managedPdf: score.filePath, managedSha256: hash(score.filePath), pdfInfo,
  lastPage: score.lastPage, annotationCount: score.annotationLayer.strokes.length,
  annotationPage: score.annotationLayer.strokes[0].pageNumber, annotationPoints: score.annotationLayer.strokes[0].points.length,
  annotationPreserved: true, scores,
  limitations: ['Simulator only; localhost is a QA transport, not product automatic sync', 'No physical device, cross-device transfer, Apple Pencil, screen reader or physical IME certification'] }
fs.writeFileSync(path.join(__dirname, 'score-receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ result: 'PASS', lastPage: receipt.lastPage, annotationCount: receipt.annotationCount, annotationPoints: receipt.annotationPoints, managedSha256: receipt.managedSha256 }))
