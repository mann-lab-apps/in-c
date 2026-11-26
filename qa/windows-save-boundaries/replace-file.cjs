const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const [fixtureDirectory, source, target] = process.argv.slice(2)
const directory = fs.realpathSync(fixtureDirectory)
for (const file of [source, target]) {
  assert.equal(fs.realpathSync(path.dirname(file)), directory)
  assert(fs.lstatSync(file).isFile())
}
assert.notEqual(source, target)
fs.renameSync(source, target)
console.log(JSON.stringify({ pid: process.pid, operation: 'rename', source: path.basename(source), target: path.basename(target) }))
