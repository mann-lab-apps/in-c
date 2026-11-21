import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { createGraceMidiFixture } from '../../../testing/grace-midi-fixture'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'

function withoutGraces(score: ReturnType<typeof createGraceMidiFixture>) {
  const copy = structuredClone(score)
  for (const part of copy.parts) for (const staff of part.staves)
    for (const measure of staff.measures) for (const voice of measure.voices)
      for (const event of voice.events) if (event.type === 'note') delete event.graceNotes
  return copy
}
beforeAll(() => {
  const root = process.env.STUDIO_GRACE_MIDI_QA_DIR
  if (!root) return
  for (const count of [1, 2] as const) {
    const score = createGraceMidiFixture(count), dir = join(root, String(count))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir, 'source.musicxml'), serializeMusicXml(score))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(withoutGraces(score)))
    writeFileSync(join(dir, 'warnings.json'), JSON.stringify(serializeMidiWithReport(score).warnings, null, 2))
  }
})
it.each([1, 2] as const)('reports %i omitted grace notes without changing main-note MIDI, native or XML', count => {
  const score = createGraceMidiFixture(count), before = structuredClone(score)
  const project = createNativeProject(score), native = encodeNativeProject(project)
  const report = serializeMidiWithReport(score)
  expect(report.warnings).toEqual([expect.objectContaining({
    code: 'unsupported-midi-grace', measureId: score.parts[0].staves[0].measures[0].id,
    measureNumber: 10, path: 'part[1].staff[1].measure[1].voice[1].event[1].graceNotes',
    message: expect.stringContaining('Grace notes (' + count + ')')
  })])
  expect(report.bytes).toEqual(serializeMidi(withoutGraces(score)))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(report.bytes)
  const reopened = decodeNativeProject(native).score
  const event = reopened.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(event.type === 'note' && event.graceNotes).toHaveLength(count)
  expect(encodeNativeProject(project)).toBe(native)
  expect(score).toEqual(before)
})
it('keeps original ownership of a grace in the second part and third measure', () => {
  const score = createGraceMidiFixture(0)
  const measure = score.parts[1].staves[0].measures[2], event = measure.voices[0].events[1]
  if (event.type !== 'note') throw new Error('owned note')
  event.graceNotes = [{ pitch: { step: 'G', octave: 4 } }]
  expect(serializeMidiWithReport(score).warnings).toEqual([expect.objectContaining({
    code: 'unsupported-midi-grace', measureId: measure.id, measureNumber: 3,
    path: 'part[2].staff[1].measure[3].voice[1].event[2].graceNotes'
  })])
})
it('reports attached groups once per source event rather than once per grace', () => {
  const score = createGraceMidiFixture(2), event = score.parts[0].staves[0].measures[0].voices[0].events[1]
  if (event.type !== 'note') throw new Error('owned note')
  event.graceNotes = [{ pitch: { step: 'G', octave: 4 } }]
  const report = serializeMidiWithReport(score)
  expect(report.warnings).toHaveLength(2)
  expect(report.warnings.map(w => w.path)).toEqual([
    'part[1].staff[1].measure[1].voice[1].event[1].graceNotes',
    'part[1].staff[1].measure[1].voice[1].event[2].graceNotes'
  ])
  expect(report.bytes).toEqual(serializeMidi(withoutGraces(score)))
})
it.each(['absent', 'empty'] as const)('does not warn for %s grace groups', mode => {
  const score = createGraceMidiFixture(0), event = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (event.type !== 'note') throw new Error('owned note')
  if (mode === 'empty') event.graceNotes = []
  expect(serializeMidiWithReport(score).warnings).toEqual([])
})
it.each(['percussion', 'tab'] as const)('keeps the whole-measure %s diagnostic without redundant grace-only claims', sign => {
  const score = createGraceMidiFixture(2)
  score.parts[0].staves[0].measures[0].clef = { sign, line: 5 }
  const report = serializeMidiWithReport(score)
  expect(report.warnings.map(w => w.code)).toEqual(['unsupported-midi-clef'])
  expect(report.bytes).toEqual(serializeMidi(withoutGraces(score)))
})
