import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = path.resolve('src/renderer/public/piano')
const spec = JSON.parse(fs.readFileSync('assets/piano/salamander-source.json', 'utf8'))
const file = path.join(root, 'manifest.json')
if (!fs.existsSync(file)) throw Error('피아노 음원이 없습니다. npm run piano:prepare를 먼저 실행하세요.')
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
if (manifest.id !== spec.id || manifest.sourceCommit !== spec.sourceCommit ||
    manifest.attribution !== spec.attribution || manifest.license !== spec.license ||
    manifest.samples.length !== 120) throw Error('피아노 manifest가 고정된 원본과 다릅니다.')
for (const sample of manifest.samples) {
  const expected = spec.samples.find(s => s.file === sample.file)
  if (!expected || expected.gitBlobSha1 !== sample.gitBlobSha1 ||
      expected.rootPitch !== sample.rootPitch || expected.velocity !== sample.velocity) {
    throw Error(`피아노 sample 원본 불일치: ${sample.file}`)
  }
  const bytes = fs.readFileSync(path.join(root, sample.file))
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== sample.sha256) {
    throw Error(`피아노 sample 손상: ${sample.file}`)
  }
}
for (const name of ['LICENSE.txt', 'CREDITS.txt']) if (!fs.existsSync(path.join(root, name))) throw Error(`Missing ${name}`)
if (manifest.compressedBytes > 100 * 1024 ** 2) throw Error('피아노 자산 크기 예산 초과')
console.log(`PASS piano assets: ${manifest.samples.length} samples, ${(manifest.compressedBytes / 1024 ** 2).toFixed(2)}MiB, ${manifest.license}`)
