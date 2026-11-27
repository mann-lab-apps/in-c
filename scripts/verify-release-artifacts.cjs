const { constants, copyFileSync, lstatSync, mkdirSync, readdirSync } = require('node:fs')
const { resolve } = require('node:path')
const { parseArgs } = require('node:util')
const packageJson = require('../package.json')
const { desktopPackageInfo } = require('./desktop-package.cjs')

const platformByDownload = new Map([
  ['in-c-macOS', 'darwin'],
  ['in-c-Windows', 'win32'],
  ['in-c-Linux', 'linux']
])
const { values: { 'all-platforms': allPlatforms, 'stage-platform-artifacts': downloadedArtifacts } } = parseArgs({
  options: {
    'all-platforms': { type: 'boolean' },
    'stage-platform-artifacts': { type: 'string' }
  }
})
const releaseDirectory = resolve(process.env.PACKAGE_DIRECTORY || resolve(__dirname, '../release'))
const artifactNames = platform => desktopPackageInfo(packageJson, platform).artifacts

function verifyArtifactFiles(directory, expectedNames, exact) {
  const expected = new Set(expectedNames)
  for (const fileName of expected) {
    const filePath = resolve(directory, fileName)
    const artifact = lstatSync(filePath, { throwIfNoEntry: false })
    if (!artifact) throw new Error(`Expected release artifact not found: ${filePath}`)
    if (!artifact.isFile() || artifact.size === 0) {
      throw new Error(`Expected a nonempty regular release artifact: ${filePath}`)
    }

    console.log(`${fileName} (${artifact.size} bytes)`)
  }

  if (exact) {
    const unexpected = readdirSync(directory).filter(name => !expected.has(name))
    if (unexpected.length > 0) {
      throw new Error(`Unexpected release artifacts: ${unexpected.join(', ')} in ${directory}`)
    }
  }
}

function stagePlatformArtifacts(downloadDirectory) {
  const unexpected = readdirSync(downloadDirectory).filter(name => !platformByDownload.has(name))
  if (unexpected.length > 0) {
    throw new Error(`Unexpected platform artifact downloads: ${unexpected.join(', ')}`)
  }

  const inputs = new Map()
  for (const [downloadName, platform] of platformByDownload) {
    const platformDirectory = resolve(downloadDirectory, downloadName)
    if (!lstatSync(platformDirectory, { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`Expected a platform artifact directory: ${platformDirectory}`)
    }
    const names = artifactNames(platform)
    verifyArtifactFiles(platformDirectory, names, true)
    for (const name of names) {
      if (inputs.has(name)) throw new Error(`Duplicate release artifact name: ${name}`)
      inputs.set(name, resolve(platformDirectory, name))
    }
  }

  mkdirSync(releaseDirectory)
  for (const [name, source] of inputs) {
    copyFileSync(source, resolve(releaseDirectory, name), constants.COPYFILE_EXCL)
  }
}

if (downloadedArtifacts !== undefined) {
  stagePlatformArtifacts(resolve(downloadedArtifacts))
} else {
  const platforms = allPlatforms ? [...platformByDownload.values()] : [process.env.PACKAGE_PLATFORM || process.platform]
  verifyArtifactFiles(releaseDirectory, platforms.flatMap(artifactNames), allPlatforms)
}
