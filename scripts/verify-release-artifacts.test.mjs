import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import metadata from './desktop-package.cjs'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')
const platforms = ['darwin', 'win32', 'linux']
const artifactNames = platform => metadata.desktopPackageInfo(pkg, platform).artifacts
const allNames = platforms.flatMap(artifactNames)
const linuxArtifact = artifactNames('linux')[0]
const cli = fileURLToPath(new URL('./verify-release-artifacts.cjs', import.meta.url))

function withArtifacts(names, check) {
  const directory = mkdtempSync(join(tmpdir(), 'studio-release-artifacts-'))
  try {
    for (const name of names) writeFileSync(join(directory, name), name)
    return check(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function verify(directory, platform, ...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    env: { ...process.env, PACKAGE_DIRECTORY: directory, PACKAGE_PLATFORM: platform },
    encoding: 'utf8',
    timeout: 5000
  })
}

test.each(platforms)('checks only the %s artifacts in an ordinary package directory', platform => {
  withArtifacts(artifactNames(platform), directory => {
    mkdirSync(join(directory, 'unpacked-fixture'))
    const result = verify(directory, platform)
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout.trim().split('\n')).toHaveLength(artifactNames(platform).length)
  })
})

test('accepts the exact five files after downloading all platform artifacts', () => {
  withArtifacts(allNames, directory => {
    const result = verify(directory, 'linux', '--all-platforms')
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout.trim().split('\n')).toHaveLength(5)
  })
})

test('rejects a download containing only the macOS and Windows artifacts', () => {
  withArtifacts(allNames.filter(name => name !== linuxArtifact), directory => {
    const result = verify(directory, 'linux', '--all-platforms')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Expected release artifact not found:')
    expect(result.stderr).toContain(linuxArtifact)
  })
})

test.each(['empty', 'directory'])('rejects a required artifact represented by %s', kind => {
  withArtifacts(allNames, directory => {
    const artifact = join(directory, linuxArtifact)
    rmSync(artifact)
    if (kind === 'empty') writeFileSync(artifact, '')
    else mkdirSync(artifact)
    const result = verify(directory, 'linux', '--all-platforms')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Expected a nonempty regular release artifact:')
    expect(result.stderr).toContain(linuxArtifact)
  })
})

test.skipIf(process.platform === 'win32')('rejects a symlink in place of an expected artifact', () => {
  withArtifacts(allNames, directory => {
    const artifact = join(directory, linuxArtifact)
    rmSync(artifact)
    symlinkSync(join(directory, allNames[0]), artifact)
    const result = verify(directory, 'linux', '--all-platforms')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Expected a nonempty regular release artifact:')
    expect(result.stderr).toContain(linuxArtifact)
  })
})

test('rejects an unexpected download even when all five expected files are present', () => {
  withArtifacts([...allNames, 'additional-release.zip'], directory => {
    const result = verify(directory, 'linux', '--all-platforms')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unexpected release artifacts: additional-release.zip')
  })
})

function withPlatformDownloads(check) {
  return withArtifacts([], directory => {
    const downloads = join(directory, 'downloads')
    const release = join(directory, 'release')
    const groups = [
      ['in-c-macOS', 'darwin'],
      ['in-c-Windows', 'win32'],
      ['in-c-Linux', 'linux']
    ]
    for (const [group, platform] of groups) {
      mkdirSync(join(downloads, group), { recursive: true })
      for (const name of artifactNames(platform)) {
        writeFileSync(join(downloads, group, name), `${group}/${name}`)
      }
    }
    const stage = () => verify(release, 'linux', '--stage-platform-artifacts', downloads)
    return check({ downloads, release, groups, stage })
  })
}

test('stages five files from the corresponding platform downloads', () => {
  withPlatformDownloads(({ release, groups, stage }) => {
    const result = stage()
    expect(result.status, result.stderr).toBe(0)
    expect(readdirSync(release).sort()).toEqual([...allNames].sort())
    for (const [group, platform] of groups) {
      for (const name of artifactNames(platform)) {
        expect(readFileSync(join(release, name), 'utf8')).toBe(`${group}/${name}`)
      }
    }
  })
})

test('rejects a download with a duplicate filename in the wrong platform folder', () => {
  withPlatformDownloads(({ downloads, release, stage }) => {
    const macName = artifactNames('darwin')[0]
    writeFileSync(join(downloads, 'in-c-Linux', macName), 'would replace the macOS asset')
    const result = stage()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`Unexpected release artifacts: ${macName}`)
    expect(existsSync(release)).toBe(false)
  })
})

test('rejects a missing platform download', () => {
  withPlatformDownloads(({ downloads, release, stage }) => {
    rmSync(join(downloads, 'in-c-Linux'), { recursive: true })
    const result = stage()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Expected a platform artifact directory:')
    expect(result.stderr).toContain('in-c-Linux')
    expect(existsSync(release)).toBe(false)
  })
})

test('rejects an unexpected platform download', () => {
  withPlatformDownloads(({ downloads, release, stage }) => {
    mkdirSync(join(downloads, 'in-c-unknown'))
    const result = stage()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unexpected platform artifact downloads: in-c-unknown')
    expect(existsSync(release)).toBe(false)
  })
})

test('preserves an existing publication directory', () => {
  withPlatformDownloads(({ release, stage }) => {
    mkdirSync(release)
    const sentinel = join(release, linuxArtifact)
    writeFileSync(sentinel, 'previous contents')
    const result = stage()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('EEXIST')
    expect(readFileSync(sentinel, 'utf8')).toBe('previous contents')
  })
})
