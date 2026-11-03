const { existsSync, statSync } = require('node:fs')
const { resolve } = require('node:path')
const packageJson = require('../package.json')

const releaseDirectory = resolve(process.env.PACKAGE_DIRECTORY || resolve(__dirname, '../release'))
const platform = process.env.PACKAGE_PLATFORM || process.platform
const { desktopPackageInfo } = require('./desktop-package.cjs')
const expected = desktopPackageInfo(packageJson, platform).artifacts

for (const fileName of expected) {
  const filePath = resolve(releaseDirectory, fileName)

  if (!existsSync(filePath) || statSync(filePath).size === 0) {
    throw new Error(`Expected release artifact not found: ${filePath}`)
  }

  console.log(`${fileName} (${statSync(filePath).size} bytes)`)
}
