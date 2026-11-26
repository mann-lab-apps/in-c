const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const [fixtureDirectory, source, target, operation] = process.argv.slice(2)
const directory = fs.realpathSync(fixtureDirectory)
for (const file of [source, target]) {
  assert.equal(fs.realpathSync(path.dirname(file)), directory)
}
assert.notEqual(source, target)
assert(fs.lstatSync(source).isFile())
if (operation === 'create') {
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL)
} else {
  assert.equal(operation, 'replace')
  assert(fs.lstatSync(target).isFile())
  fs.renameSync(source, target)
}
console.log(JSON.stringify({ pid: process.pid, operation, source: path.basename(source), target: path.basename(target) }))
