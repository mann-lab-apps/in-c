const { existsSync, statSync } = require('node:fs')
const { resolve } = require('node:path')
const packageJson = require('../package.json')

const releaseDirectory = resolve(__dirname, '../release')
const platform = process.env.PACKAGE_PLATFORM || process.platform
const version = packageJson.version
const expected = {
  darwin: [
    `in-C-${version}-mac-universal.dmg`,
    `in-C-${version}-mac-universal.zip`
  ],
  linux: [`in-C-${version}-linux-x86_64.AppImage`],
  win32: [
    `in-C-${version}-windows-x64-setup.exe`,
    `in-C-${version}-windows-x64-portable.exe`
  ]
}[platform]

if (!expected) {
  throw new Error(`Unsupported PACKAGE_PLATFORM: ${platform}`)
}

for (const fileName of expected) {
  const filePath = resolve(releaseDirectory, fileName)

  if (!existsSync(filePath) || statSync(filePath).size === 0) {
    throw new Error(`Expected release artifact not found: ${filePath}`)
  }

  console.log(`${fileName} (${statSync(filePath).size} bytes)`)
}
