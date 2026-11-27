const { existsSync, readdirSync, mkdtempSync, rmSync, statSync } = require('node:fs')
const { basename, dirname, join, resolve } = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const { createInterface } = require('node:readline')
const { parseArgs } = require('node:util')

const { tmpdir } = require('node:os')
const { desktopPackageInfo } = require('./desktop-package.cjs')
const stagePrefix = 'PACKAGED_APP_SMOKE_STAGE '
const successPrefix = 'PACKAGED_APP_SMOKE_OK '

async function runPackagedSmoke(command, args, timeoutMs, onLine = console.log) {
  const ownedProfile = mkdtempSync(join(tmpdir(), 'studio-package-smoke-'))
  const environment = { ...process.env, DDIRORI_PIANO_QA_DATA: ownedProfile }
  delete environment.ELECTRON_RUN_AS_NODE
  delete environment.ELECTRON_RENDERER_URL

  let timeout
  let outputDrain
  let launchError
  let timedOut = false
  let lastStage
  let smokeCompleted = false
  try {
    const child = spawn(command, args, { env: environment, stdio: ['inherit', 'pipe', 'inherit'] })
    const result = new Promise(resolveExit => {
      child.once('error', error => { launchError = error })
      child.once('exit', () => {
        clearTimeout(timeout)
        // Let queued output arrive without waiting indefinitely on inherited descriptors.
        outputDrain = setTimeout(() => child.stdout.destroy(), 1000)
      })
      child.once('close', (code, signal) => resolveExit({ code, signal }))
    })
    const stdout = createInterface({ input: child.stdout, crlfDelay: Infinity })
    stdout.on('line', line => {
      if (line.startsWith(stagePrefix)) lastStage = line.slice(stagePrefix.length)
      if (line.startsWith(successPrefix)) smokeCompleted = true
      onLine(line)
    })
    timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
      // An Electron helper can still hold the inherited output pipe after the app stops.
      child.stdout.destroy()
    }, timeoutMs)
    const status = await result
    return { ...status, timedOut, launchError, lastStage, smokeCompleted }
  } finally {
    clearTimeout(timeout)
    clearTimeout(outputDrain)
    rmSync(ownedProfile, { recursive: true, force: true })
  }
}

async function main() {
  const { values: { rosetta, executable: requestedExecutable } } = parseArgs({
    options: { rosetta: { type: 'boolean' }, executable: { type: 'string' } }
  })
  if (rosetta) {
    const translation = process.platform === 'darwin' && spawnSync(
      '/usr/bin/arch', ['-x86_64', '/usr/sbin/sysctl', '-in', 'sysctl.proc_translated'],
      { encoding: 'utf8', timeout: 10_000 }
    )
    if (!translation || translation.status !== 0 || translation.stdout.trim() !== '1') {
      throw new Error('Rosetta package smoke requires an Apple Silicon Mac with Rosetta available.')
    }
  }

  let executable
  if (requestedExecutable !== undefined) {
    executable = resolve(requestedExecutable)
    if (!statSync(executable, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Packaged executable is not a file at ${executable}`)
    }
  } else {
    const names = desktopPackageInfo(require('../package.json'), process.platform)
    const releaseDirectory = resolve(process.env.PACKAGE_DIRECTORY || resolve(__dirname, '../release'))
    executable = findPackagedExecutable(releaseDirectory, names)
    if (!executable) {
      throw new Error(`Packaged executable not found in ${releaseDirectory}. Run npm run package:dir first.`)
    }
  }

  const args = [
    '--smoke-test',
    '--piano-audit',
    ...(process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : [])
  ]
  const command = rosetta ? '/usr/bin/arch' : executable
  const commandArgs = rosetta ? ['-x86_64', executable, ...args] : args
  const timeoutMs = rosetta ? 300_000 : 20_000
  const result = await runPackagedSmoke(command, commandArgs, timeoutMs)
  const lastStage = result.lastStage ?? '(none)'

  if (result.launchError) throw result.launchError
  if (result.timedOut) throw new Error(`Packaged app smoke test timed out after ${timeoutMs} ms. Last stage: ${lastStage}`)
  if (result.code !== 0) {
    console.error(`Packaged app exited: code=${result.code}, signal=${result.signal}. Last stage: ${lastStage}`)
    process.exitCode = result.code ?? 1
    return
  }
  if (!result.smokeCompleted) throw new Error(`Packaged app exited without completing smoke. Last stage: ${lastStage}`)
  console.log(`Packaged app smoke test passed: ${executable}`)
}

function findPackagedExecutable(directory, names, platform = process.platform, arch = process.arch) {
  if (!existsSync(directory)) {
    return undefined
  }

  if (platform === 'darwin') {
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

  if (platform === 'win32') {
    return findEntry(
      directory,
      (name, fullPath) =>
        name === names.executableName && fullPath.includes('win-unpacked')
    )
  }

  const findInLinuxLayout = layout => findEntry(
    directory,
    (name, fullPath) => name === names.executableName && basename(dirname(fullPath)) === layout
  )
  return findInLinuxLayout(`linux-${arch}-unpacked`) ?? findInLinuxLayout('linux-unpacked')
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

module.exports = { findPackagedExecutable, runPackagedSmoke }

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
