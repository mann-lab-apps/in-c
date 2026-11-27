import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import metadata from './desktop-package.cjs'

const require = createRequire(import.meta.url)
const { createPackage } = require('@electron/asar')
const packageJson = require('../package.json')
const licenses = packageJson.build.extraResources.find(resource => resource.to === 'licenses')
const cli = fileURLToPath(new URL('./verify-packaged-content.cjs', import.meta.url))

async function verifyFixture(platform, change = {}) {
  const root = mkdtempSync(join(tmpdir(), 'studio-package-content-'))
  try {
    const names = metadata.desktopPackageInfo(packageJson, platform)
    const archiveSource = join(root, 'archive-source')
    const release = join(root, 'release')
    const app = platform === 'darwin' ? join(release, 'mac-universal', names.bundleName, 'Contents')
      : join(release, platform === 'win32' ? 'win-unpacked' : 'linux-unpacked')
    const executable = platform === 'darwin' ? join(app, 'MacOS', names.executableName) : join(app, names.executableName)
    const resources = join(app, platform === 'darwin' ? 'Resources' : 'resources')
    mkdirSync(dirname(executable), { recursive: true })
    mkdirSync(resources, { recursive: true })
    writeFileSync(executable, 'launcher fixture')

    const dependencies = Object.keys(packageJson.dependencies).filter(name => name !== change.missingRuntime)
    if (change.embeddedModule) dependencies.push(change.embeddedModule)
    for (const name of dependencies) {
      const directory = join(archiveSource, 'node_modules', name)
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ name }))
    }
    await createPackage(archiveSource, join(resources, 'app.asar'))

    for (const name of licenses.filter) {
      if (name === change.missingLicense) continue
      const destination = join(resources, 'licenses', name)
      mkdirSync(dirname(destination), { recursive: true })
      if (name === change.alteredLicense) writeFileSync(destination, 'different contents')
      else copyFileSync(fileURLToPath(new URL(`../${licenses.from}/${name}`, import.meta.url)), destination)
    }
    return spawnSync(process.execPath, [cli], {
      env: { ...process.env, PACKAGE_DIRECTORY: release, PACKAGE_PLATFORM: platform },
      encoding: 'utf8',
      timeout: 5000
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test.each(['darwin', 'win32', 'linux'])('verifies a complete ASAR and licenses in the %s app layout', async platform => {
  const result = await verifyFixture(platform)
  expect(result.status, result.stderr).toBe(0)
  expect(result.stdout).toContain('Packaged content verified with 5 licenses')
})

test.each([
  [{ missingRuntime: 'fflate' }, 'Missing packaged runtime dependency: fflate'],
  [{ embeddedModule: 'react' }, 'Build-only dependency in app.asar: react'],
  [{ embeddedModule: '@ddirori/ui' }, 'Build-only dependency in app.asar: @ddirori/ui'],
  [{ embeddedModule: 'fflate/node_modules/@supabase/auth-js' }, 'Build-only dependency in app.asar: @supabase/auth-js'],
  [{ missingLicense: 'vexflow/LICENSE' }, 'Missing packaged license: vexflow/LICENSE'],
  [{ alteredLicense: 'react/LICENSE' }, 'Packaged license differs from its source: react/LICENSE']
])('fails the CLI when packaged content differs from the runtime and license contract %#', async (change, message) => {
  const result = await verifyFixture('darwin', change)
  expect(result.status).toBe(1)
  expect(result.stderr).toContain(message)
})
