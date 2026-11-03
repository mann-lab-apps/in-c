const { existsSync, readdirSync, mkdtempSync, rmSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { spawn } = require('node:child_process')

const { tmpdir } = require('node:os')
const { desktopPackageInfo } = require('./desktop-package.cjs')
const names = desktopPackageInfo(require('../package.json'), process.platform)
const releaseDirectory = resolve(process.env.PACKAGE_DIRECTORY || resolve(__dirname, '../release'))
const executable = findPackagedExecutable(releaseDirectory)

if (!executable) {
  throw new Error(
    `Packaged executable not found in ${releaseDirectory}. Run npm run package:dir first.`
  )
}

const args = [
  '--smoke-test',
  '--piano-audit',
  ...(process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : [])
]
const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
const ownedProfile = mkdtempSync(join(tmpdir(), 'studio-package-smoke-'))
environment.DDIRORI_PIANO_QA_DATA = ownedProfile

const child = spawn(executable, args, {
  env: environment,
  stdio: 'inherit'
})
const timeout = setTimeout(() => {
  child.kill('SIGKILL')
  throw new Error('Packaged app smoke test timed out.')
}, 20_000)

child.on('error', (error) => {
  clearTimeout(timeout)
  throw error
})

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  rmSync(ownedProfile, { recursive: true, force: true })

  if (code !== 0) {
    console.error(`Packaged app exited: code=${code}, signal=${signal}`)
    process.exitCode = code ?? 1
    return
  }

  console.log(`Packaged app smoke test passed: ${executable}`)
})

function findPackagedExecutable(directory) {
  if (!existsSync(directory)) {
    return undefined
  }

  if (process.platform === 'darwin') {
    const candidates = [
      join(directory, 'mac-universal', names.bundleName),
      join(directory, 'mac-arm64', names.bundleName),
      join(directory, 'mac', names.bundleName)
    ]
    const appDirectory =
      candidates.find((candidate) => existsSync(candidate)) ??
      findEntry(directory, (name) => name.endsWith('.app'))

    return appDirectory ? join(appDirectory, 'Contents', 'MacOS', names.executableName) : undefined
  }

  if (process.platform === 'win32') {
    return findEntry(
      directory,
      (name, fullPath) =>
        name === names.executableName && fullPath.includes('win-unpacked')
    )
  }

  return findEntry(
    directory,
    (name, fullPath) =>
      name === names.executableName && fullPath.includes('linux-unpacked')
  )
}

function findEntry(directory, predicate) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)

    if (predicate(entry.name, fullPath)) {
      return fullPath
    }

    if (entry.isDirectory()) {
      const nested = findEntry(fullPath, predicate)

      if (nested) {
        return nested
      }
    }
  }

  return undefined
}
