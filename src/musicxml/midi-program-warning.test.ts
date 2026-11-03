import { it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMidiProgramFixture, type MidiProgramCase } from '../testing/midi-program-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const definitions = [
 { kind: 'initial', part: 1, paths: ['part-list.score-part[1].midi-instrument[1].midi-program'], values: ['71'] },
 { kind: 'matching', part: 1, paths: ['part-list.score-part[1].midi-instrument[1].midi-program'], values: ['1'] },
 { kind: 'secondary', part: 2, paths: ['part-list.score-part[2].midi-instrument[1].midi-program'], values: ['128'] },
 { kind: 'reordered', part: 1, paths: ['part-list.score-part[2].midi-instrument[1].midi-program'], values: ['71'] },
 { kind: 'direct', part: 1, paths: ['part[1].measure[2].sound[1].midi-instrument[1].midi-program'], values: ['73'] },
 { kind: 'direction', part: 2, paths: ['part[2].measure[2].direction[1].sound.midi-instrument[1].midi-program'], values: ['73'] },
 { kind: 'both', part: 1, paths: ['part-list.score-part[1].midi-instrument[1].midi-program', 'part[1].measure[2].sound[1].midi-instrument[1].midi-program'], values: ['71', '73'] },
 { kind: 'definition-only', part: 1, paths: [], values: [] },
 { kind: 'control', part: 1, paths: [], values: [] }
] satisfies { kind: MidiProgramCase; part: number; paths: string[]; values: string[] }[]

it.each(definitions)('reports unpreserved explicit MIDI program metadata for $kind', entry => {
 const { xml, baselineXml } = createMidiProgramFixture(entry.kind)
 const { score, report } = parseMusicXmlWithReport(xml), baseline = parseMusicXml(baselineXml)
 const midi = serializeMidi(score), output = process.env.DDIRORI_PROGRAM_IMPORT_QA_DIR
 if (output) {
  const dir = join(output, entry.kind)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'source.musicxml'), xml)
  writeFileSync(join(dir, 'baseline.musicxml'), baselineXml)
  writeFileSync(join(dir, 'expected.chromatics'), encodeNativeProject(createNativeProject(baseline)))
  writeFileSync(join(dir, 'expected.mid'), serializeMidi(baseline))
  writeFileSync(join(dir, 'expected.musicxml'), serializeMusicXml(baseline))
  writeFileSync(join(dir, 'warnings.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(dir, 'case.json'), JSON.stringify(entry, null, 2))
 }
 expect(score).toEqual(baseline)
 expect(midi).toEqual(serializeMidi(baseline))
 expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline))
 expect(report.warnings.map(warning => warning.path)).toEqual(entry.paths)
 for (const [index, warning] of report.warnings.entries()) {
  expect(warning.code).toBe('unsupported-direction')
  expect(warning.partNumber).toBe(entry.part)
  expect(warning.message).toContain(`Explicit MIDI instrument program (${entry.values[index]})`)
  if (warning.path.startsWith('part-list.')) expect(warning.measureNumber).toBeUndefined()
  else expect(warning.measureNumber).toBe(2)
 }
})
