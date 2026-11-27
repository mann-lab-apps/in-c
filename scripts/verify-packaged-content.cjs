const { readFileSync, statSync } = require('node:fs')
const { dirname, resolve } = require('node:path')
const { listPackage } = require('@electron/asar')
const packageJson = require('../package.json')
const lock = require('../package-lock.json')
const { desktopPackageInfo } = require('./desktop-package.cjs')
const { findPackagedExecutable } = require('./verify-packaged-app.cjs')

function devOnlyPackages() {
  const development = new Set()
  const runtime = new Set()
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path.startsWith('node_modules/')) continue
    const name = path.split('node_modules/').at(-1)
    const metadata = entry.link ? lock.packages[entry.resolved] : entry
    // A package can be present in both dependency graphs at different paths.
    if (metadata?.dev) development.add(name)
    else runtime.add(name)
  }
  return new Set([...development].filter(name => !runtime.has(name)))
}

const platform = process.env.PACKAGE_PLATFORM || process.platform
const releaseDirectory = resolve(process.env.PACKAGE_DIRECTORY || resolve(__dirname, '../release'))
const executable = findPackagedExecutable(releaseDirectory, desktopPackageInfo(packageJson, platform), platform)
if (!executable) throw new Error(`Packaged executable not found in ${releaseDirectory}`)
const resources = resolve(dirname(executable), platform === 'darwin' ? '../Resources' : 'resources')
const entries = new Set(listPackage(resolve(resources, 'app.asar')).map(path => path.replaceAll('\\', '/').replace(/^\//, '')))

for (const name of Object.keys(packageJson.dependencies)) {
  if (!entries.has(`node_modules/${name}/package.json`)) throw new Error(`Missing packaged runtime dependency: ${name}`)
}

const devOnly = devOnlyPackages()
const moduleLocation = /(?:^|\/)node_modules\/(@[^/]+\/[^/]+|[^@/][^/]*)/g
for (const path of entries) {
  if (!path.startsWith('node_modules/')) continue
  for (const [, name] of path.matchAll(moduleLocation)) {
    if (devOnly.has(name)) throw new Error(`Build-only dependency in app.asar: ${name}`)
  }
}

const licenses = packageJson.build.extraResources.find(resource => resource.to === 'licenses')
if (!licenses?.filter?.length) throw new Error('Packaged licenses are missing from the build configuration')
for (const name of licenses.filter) {
  const packaged = resolve(resources, licenses.to, name)
  if (!statSync(packaged, { throwIfNoEntry: false })?.isFile()) throw new Error(`Missing packaged license: ${name}`)
  const source = resolve(__dirname, '..', licenses.from, name)
  if (!readFileSync(packaged).equals(readFileSync(source))) throw new Error(`Packaged license differs from its source: ${name}`)
}

console.log(`Packaged content verified with ${licenses.filter.length} licenses: ${resources}`)
