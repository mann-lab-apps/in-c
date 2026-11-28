const assert = require('node:assert/strict')
const { writeFileSync } = require('node:fs')
const { buildSync } = require(process.cwd() + '/node_modules/esbuild')

const [output, bundle] = process.argv.slice(2)
buildSync({ stdin: {
  contents: "export { createStudioEditingFixture } from './src/testing/studio-editing-fixture'; export { createNativeProject, encodeNativeProject } from './src/project/schema'",
  resolveDir: process.cwd()
}, bundle: true, platform: 'node', format: 'cjs', loader: { '.musicxml': 'text', '.xml': 'text' }, outfile: bundle })
const { createStudioEditingFixture, createNativeProject, encodeNativeProject } = require(bundle)
const { score } = createStudioEditingFixture()
score.title = 'Layout gate QA'
const first = score.parts[0].staves[0].measures[0]
const voice = first.voices[0]
score.hairpins = [{ id: 'layout-qa-crescendo', startEventId: voice.events[0].id, type: 'crescendo',
  endTime: { measureId: first.id, voiceId: voice.id, tick: 20160 } }]
const project = createNativeProject(score)
assert.equal(project.version, 3)
writeFileSync(output, encodeNativeProject(project))
