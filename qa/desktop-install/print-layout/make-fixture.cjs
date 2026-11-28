const assert = require('node:assert/strict')
const { writeFileSync } = require('node:fs')
const { buildSync } = require(process.cwd() + '/node_modules/esbuild')

const [output, bundle, size = 'original'] = process.argv.slice(2)
assert(['original', 'larger'].includes(size))
buildSync({ stdin: {
  contents: [
    "export { createStudioEditingFixture } from './src/testing/studio-editing-fixture'",
    "export { createNativeProject, encodeNativeProject } from './src/project/schema'",
    "export { createNewScore } from './src/renderer/src/editor/new-score'",
    "export { createNote, durationToTicks } from './src/score-core'"
  ].join('\n'),
  resolveDir: process.cwd()
}, bundle: true, platform: 'node', format: 'cjs', loader: { '.musicxml': 'text', '.xml': 'text' }, outfile: bundle })
const { createStudioEditingFixture, createNativeProject, encodeNativeProject, createNewScore,
  createNote, durationToTicks } = require(bundle)
const score = size === 'original' ? createStudioEditingFixture().score : createNewScore({
  title: 'Layout gate QA 12 bars', templateId: 'piano-grand-staff', measureCount: 12,
  keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }
})
if (size === 'original') {
  score.title = 'Layout gate QA'
} else {
  score.id = 'qa-first-open-12-bars'
  const duration = { value: 'quarter', dots: 0 }
  for (const [index, staff] of score.parts[0].staves.entries()) {
    for (const measure of staff.measures) {
      measure.voices[0].events = ['C', 'D', 'E', 'G'].map((step, beat) => createNote({
        id: `qa-${index}-${measure.number}-${beat}`, pitch: { step, octave: index === 0 ? 5 : 3 },
        position: { tick: beat * durationToTicks(duration) }, duration
      }))
    }
  }
}
const first = score.parts[0].staves[0].measures[0]
const voice = first.voices[0]
score.hairpins = [{ id: 'layout-qa-crescendo', startEventId: voice.events[0].id, type: 'crescendo',
  endTime: { measureId: first.id, voiceId: voice.id, tick: 20160 } }]
const project = createNativeProject(score)
assert.equal(project.version, 3)
writeFileSync(output, encodeNativeProject(project))
