import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, expect, it } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createMidiExpressionFixture, type MidiExpressionKind } from '../../../testing/midi-expression-fixture'
import { serializeMidi, serializeMidiWithReport } from './serialize-midi'

function unadorned(score: ReturnType<typeof createMidiExpressionFixture>) {
  const copy = structuredClone(score)
  for (const part of copy.parts) for (const staff of part.staves) for (const measure of staff.measures)
    for (const voice of measure.voices) for (const event of voice.events) if (event.type === 'note') {
      delete event.ornaments; delete event.tremolo; delete event.graceNotes
    }
  return copy
}
const kinds: MidiExpressionKind[] = ['trill', 'tremolo-1', 'tremolo-2', 'tremolo-3', 'both', 'mixed']
beforeAll(() => {
  const root = process.env.STUDIO_MIDI_EXPRESSION_QA_DIR
  if (!root) return
  for (const kind of [...kinds, 'plain'] as MidiExpressionKind[]) {
    const score = createMidiExpressionFixture(kind), dir = join(root, kind)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir, 'source.musicxml'), serializeMusicXml(score))
    writeFileSync(join(dir, 'expected.mid'), serializeMidi(unadorned(score)))
    writeFileSync(join(dir, 'warnings.json'), JSON.stringify(serializeMidiWithReport(score).warnings, null, 2))
  }
})
it.each(kinds)('reports %s written expression omissions without changing the existing MIDI or source', kind => {
  const score = createMidiExpressionFixture(kind), before = structuredClone(score), project = createNativeProject(score), native = encodeNativeProject(project)
  const report = serializeMidiWithReport(score), expressions = report.warnings.filter(w => w.code !== 'unsupported-midi-grace')
  expect(expressions).toHaveLength(kind === 'both' ? 2 : 1)
  expect(expressions.every(w => w.code === 'unsupported-midi-expression' && w.measureNumber === 10)).toBe(true)
  const base = 'part[1].staff[1].measure[1].voice[1].event[1].'
  expect(expressions.map(w => w.path)).toEqual(kind === 'both' ? [base + 'ornaments', base + 'tremolo'] : [base + (kind.startsWith('tremolo-') ? 'tremolo' : 'ornaments')])
  if (kind === 'mixed') expect(report.warnings.map(w => w.code)).toEqual(['unsupported-midi-grace', 'unsupported-midi-expression'])
  expect(report.bytes).toEqual(serializeMidi(unadorned(score)))
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(report.bytes)
  expect(score).toEqual(before); expect(encodeNativeProject(project)).toBe(native)
})
it('does not invent a warning for an unadorned source', () => expect(serializeMidiWithReport(createMidiExpressionFixture('plain')).warnings).toEqual([]))
it.each(['tab', 'percussion'] as const)('preserves %s whole-measure omission without redundant expression warnings', sign => {
  const score = createMidiExpressionFixture('both'); score.parts[0].staves[0].measures[0].clef = { sign, line: 5 }
  expect(serializeMidiWithReport(score).warnings.map(w => w.code)).toEqual(['unsupported-midi-clef'])
})
it('retains source ownership and distinct fields in a later part/measure', () => {
  const score = createMidiExpressionFixture('plain'), measure = score.parts[1].staves[0].measures[1], note = measure.voices[0].events[1]
  if (note.type !== 'note') throw new Error('owned note')
  note.ornaments = ['trill']; note.tremolo = { type: 'single', marks: 3 }
  const report = serializeMidiWithReport(score)
  expect(report.warnings.map(w => w.path)).toEqual(['part[2].staff[1].measure[2].voice[1].event[2].ornaments', 'part[2].staff[1].measure[2].voice[1].event[2].tremolo'])
  expect(report.warnings.every(w => w.measureId === measure.id && w.measureNumber === 2)).toBe(true)
})
