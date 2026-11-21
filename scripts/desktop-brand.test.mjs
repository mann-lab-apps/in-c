import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
it('brands visible packages without changing compatibility identity', () => {
  expect(pkg.productName).toBe('띠로리 Studio')
  expect(pkg.build.productName).toBe(pkg.productName)
  expect(pkg.build.appId).toBe('com.mannlab.inc')
  expect(pkg.name).toBe('in-c')
  expect(pkg.desktopName).toBe('in-c.desktop')
  expect(pkg.version).toMatch(/^\d+\.\d+\.\d+-alpha\.\d+$/)
  expect(lock.version).toBe(pkg.version)
  expect(lock.packages[''].version).toBe(pkg.version)
  expect(pkg.build.win.executableName).toBe('in-C')
  expect(pkg.build.linux.executableName).toBe('in-c')
  expect(pkg.build.mac.executableName).toBeUndefined()
  expect(pkg.build.artifactName).toBe('Ddirori-Studio-${version}-${os}-${arch}.${ext}')
})

import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const {desktopPackageInfo}=require('./desktop-package.cjs')
describe('platform package metadata',()=>{
  it.each(['darwin','win32','linux'])('%s uses builder identity and ASCII download names',platform=>{
    const actual=desktopPackageInfo(pkg,platform)
    const {AppInfo}=require('app-builder-lib/out/appInfo.js')
    const section={darwin:'mac',win32:'win',linux:'linux'}[platform]
    const builder=new AppInfo({metadata:pkg,config:pkg.build},undefined,pkg.build[section])
    expect(actual.displayName).toBe(builder.productName)
    expect(actual.executableName).toBe(builder.productFilename+(platform==='win32'?'.exe':''))
    const prefix = `Ddirori-Studio-${pkg.version}-`
    expect(actual.artifacts.length).toBeGreaterThan(0)
    for (const name of actual.artifacts) {
      expect(name.startsWith(prefix)).toBe(true)
      expect(name.slice(prefix.length)).toMatch(/^[\x20-\x7E]+$/)
    }
    if(platform==='darwin')expect(actual.bundleName).toBe('띠로리 Studio.app')
  })
})
it('keeps the mac helper lookup name byte-identical to the builder NFD filename',()=>{
 const {AppInfo}=require('app-builder-lib/out/appInfo.js')
 const builder=new AppInfo({metadata:pkg,config:pkg.build},undefined,pkg.build.mac,true)
 expect(pkg.build.mac.extendInfo.CFBundleName).toBe(builder.productFilename)
 expect(pkg.build.mac.extendInfo.CFBundleName.normalize('NFC')).toBe(pkg.productName)
})
