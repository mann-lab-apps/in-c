const { readFileSync } = require('node:fs')

const packageJson = JSON.parse(
  readFileSync(require.resolve('../package.json'), 'utf8')
)
const tag = process.env.RELEASE_TAG || process.argv[2]
const expectedTag = `v${packageJson.version}`

if (!tag) {
  throw new Error('Set RELEASE_TAG or pass the release tag as an argument.')
}

if (tag !== expectedTag) {
  throw new Error(
    `Release tag ${tag} does not match package version ${expectedTag}.`
  )
}

console.log(`${tag} matches package version ${packageJson.version}.`)
