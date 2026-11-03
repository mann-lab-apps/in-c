// Resolve names from the same metadata used by electron-builder. Do not use
// display branding as an application ID, storage path or project format.
function desktopPackageInfo(pkg, platform) {
  const options = pkg.build[{ darwin: 'mac', win32: 'win', linux: 'linux' }[platform]]
  if (!options) throw new Error(`Unsupported package platform: ${platform}`)
  const displayName = pkg.build.productName || pkg.productName || pkg.name
  const executable = options.executableName || pkg.build.executableName || displayName
  const expand = (template, os, arch, ext) => template.replace(/\$\{(productName|name|version|os|arch|ext)\}/g,
    (_, key) => ({ productName: displayName, name: pkg.name, version: pkg.version, os, arch, ext })[key])
  const standard = options.artifactName || pkg.build.artifactName
  const artifacts = platform === 'darwin' ? ['dmg','zip'].map(ext=>expand(standard,'mac','universal',ext))
    : platform === 'win32' ? [expand(pkg.build.nsis.artifactName,'windows','x64','exe'),expand(pkg.build.portable.artifactName,'windows','x64','exe')]
    : [expand(standard,'linux','x86_64','AppImage')]
  return { displayName, bundleName: `${executable}.app`, executableName: executable + (platform==='win32'?'.exe':''), artifacts }
}
module.exports = { desktopPackageInfo }
