const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')

const repository = 'https://github.com/mann-lab-apps/in-c'
const releases = {
  "0.1.0-alpha.45": {
    "commit": "d05cae65fef5ded3b33902b8a13fc3f4fb05e343",
    "checksums": "d1361500b36d1c91f5c688ab80f0ba81a57b89183d8c1c67db50120d537e4727",
    "files": {
      "windows-x64-setup.exe": "4d733f83593b3d37b1e7c1798c362efb6cb880643f50a92a49d6419f2acf8e7e"
    }
  },
  "0.1.0-alpha.46": {
    "commit": "2a14068892434d0c76d619c16f831a6dfaed1c1a",
    "checksums": "f82e964d6ab9ed07407513b39bc01c795b02b2a0e74505de659dbd9e5758eb6b",
    "files": {
      "windows-x64-setup.exe": "48d61ceba2ec2819d8be4b554aa1ebffe370deeec501d1853b468159ded6b3a3",
      "windows-x64-portable.exe": "40ca240a200c6c94c39526dfa605e26ad7ddc1ee597e59301a3280d0cc3c4563",
      "linux-x86_64.AppImage": "2759b3148a7b65ad3c5d977660a453cb8ff4be5aa2315d45ac01631d7a090a7f"
    }
  }
}

function downloaded(url, file) {
  if (fs.existsSync(file)) return
  const partial = file + '.partial'
  const result = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl',
    ['--proto', '=https', '--proto-redir', '=https', '-fSLsS', '--retry', '2',
      '--connect-timeout', '20', '--max-time', '360', '-o', partial, url], { stdio: 'inherit' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, 'Download failed: ' + url)
  fs.renameSync(partial, file)
}

async function hash(file) {
  const sha = createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) sha.update(chunk)
  return sha.digest('hex')
}

async function main() {
  const [platform, directory, evidence] = process.argv.slice(2)
  assert(['windows', 'linux'].includes(platform) && directory && evidence)
  fs.mkdirSync(directory, { recursive: true })
  fs.mkdirSync(evidence, { recursive: true })
  const assets = []
  for (const [version, release] of Object.entries(releases)) {
    const files = Object.entries(release.files).filter(([name]) => name.startsWith(platform))
    if (!files.length) continue
    const tag = 'v' + version
    const ref = 'refs/tags/' + tag
    const remote = spawnSync('git', ['ls-remote', repository + '.git', ref, ref + '^{}'], { encoding: 'utf8' })
    assert.ifError(remote.error)
    assert.equal(remote.status, 0, remote.stderr)
    const refs = Object.fromEntries(remote.stdout.trim().split('\n').filter(Boolean).map(row => row.trim().split('\t').reverse()))
    assert.equal(refs[ref + '^{}'] ?? refs[ref], release.commit, tag)
    const prefix = repository + '/releases/download/' + tag + '/'
    const checksumPath = path.join(evidence, version + '-SHA256SUMS.txt')
    downloaded(prefix + 'SHA256SUMS.txt', checksumPath)
    const checksumFileSha256 = await hash(checksumPath)
    if (release.checksums) assert.equal(checksumFileSha256, release.checksums)
    const sums = Object.fromEntries(fs.readFileSync(checksumPath, 'utf8').trim().split(/\r?\n/).map(line => {
      const [, sha, name] = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line)
      return [name, sha]
    }))
    for (const [suffix, expected] of files) {
      const name = 'Ddirori-Studio-' + version + '-' + suffix
      const file = path.join(directory, name)
      const url = prefix + name
      assert.equal(sums[name], expected, 'Published checksums changed for ' + name)
      downloaded(url, file)
      const sha256 = await hash(file)
      assert.equal(sha256, sums[name], name)
      assets.push({ version, tag, commit: release.commit, name, url, sha256,
        bytes: fs.statSync(file).size, checksumFileSha256 })
      console.log('PASS published SHA-256', name, sha256)
    }
  }
  fs.writeFileSync(path.join(evidence, 'published-assets.json'), JSON.stringify({ platform, assets }, null, 2) + '\n')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
