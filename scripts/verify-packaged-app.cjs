const { existsSync, readdirSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { spawn } = require('node:child_process')

const releaseDirectory = resolve(__dirname, '../release')
const executable = findPackagedExecutable(releaseDirectory)

if (!executable) {
  throw new Error(
    `Packaged executable not found in ${releaseDirectory}. Run npm run package:dir first.`
  )
}

const args = [
  '--smoke-test',
  ...(process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : [])
]
const child = spawn(executable, args, {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: ''
  },
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

child.on('exit', (code) => {
  clearTimeout(timeout)

  if (code !== 0) {
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
      join(directory, 'mac-universal', 'in-C.app'),
      join(directory, 'mac-arm64', 'in-C.app'),
      join(directory, 'mac', 'in-C.app')
    ]
    const appDirectory =
      candidates.find((candidate) => existsSync(candidate)) ??
      findEntry(directory, (name) => name.endsWith('.app'))

    return appDirectory ? join(appDirectory, 'Contents', 'MacOS', 'in-C') : undefined
  }

  if (process.platform === 'win32') {
    return findEntry(
      directory,
      (name, fullPath) =>
        name === 'in-C.exe' && fullPath.includes('win-unpacked')
    )
  }

  return findEntry(
    directory,
    (name, fullPath) =>
      name === 'in-c' && fullPath.includes('linux-unpacked')
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
